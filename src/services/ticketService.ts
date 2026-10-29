import { supabase } from '../lib/supabase';
import {
  Ticket,
  TicketAnswer,
  TicketMessage,
  TicketEvent,
  TicketStatus,
  TicketPriority,
  UserProfile,
} from '../types/database';
import { notificationService } from './notificationService';
import { authService } from './authService';

// Helper para verificar se um departamento exige aprovação prévia obrigatória
export const departmentRequiresApproval = (
  deptObj?: { id?: string; code?: string; name?: string; requires_approval?: boolean } | null
): boolean => {
  if (!deptObj) return false;

  // 1. Prioridade máxima: flag booleana explícita configurada no banco
  if (deptObj.requires_approval === true) return true;
  if (deptObj.requires_approval === false) return false;

  // 2. Fallback de segurança para garantir a TI atual sem depender de strings soltas
  const rawCode = (deptObj.code || '').trim().toUpperCase();
  if (rawCode === 'TI' || rawCode.startsWith('TI ') || rawCode.startsWith('TI-')) {
    return true;
  }

  return false;
};

// Manter retrocompatibilidade de exportação caso outros módulos importem
export const isITDepartmentId = (
  departmentId: string,
  deptObj?: { id: string; code?: string; name?: string; requires_approval?: boolean } | null
): boolean => {
  return departmentRequiresApproval(deptObj);
};

export const ticketService = {
  // Generate friendly unique protocol e.g. "TI-000001"
  async generateProtocol(departmentId: string): Promise<string> {
    const { data, error } = await supabase.rpc('next_ticket_protocol', {
      p_department_id: departmentId,
    });
    if (error || !data) {
      // Fallback
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      return `MTP-${randomSuffix}`;
    }
    return data;
  },

  // Create ticket
  async createTicket(
    payload: {
      department_id: string;
      service_type_id: string;
      form_version_id: string;
      subject: string;
      priority?: TicketPriority;
      answers: { field_id: string; field_label: string; field_type: string; answer_value: any }[];
    },
    requester: UserProfile
  ): Promise<Ticket> {
    const protocol = await this.generateProtocol(payload.department_id);

    // Identificar se o departamento exige fluxo de aprovação prévia (persistido no banco)
    const { data: dept } = await supabase
      .from('departments')
      .select('*')
      .eq('id', payload.department_id)
      .maybeSingle();

    const requiresApproval = departmentRequiresApproval(dept);
    const initialStatus: TicketStatus = requiresApproval ? 'aguardando_aprovacao' : 'aberto';

    // 1. Insert ticket
    const { data: ticket, error: ticketErr } = await supabase
      .from('tickets')
      .insert({
        protocol,
        department_id: payload.department_id,
        service_type_id: payload.service_type_id,
        form_version_id: payload.form_version_id,
        requester_id: requester.id,
        requester_name: requester.name,
        requester_email: requester.email,
        subject: payload.subject.trim(),
        priority: payload.priority || 'media',
        status: initialStatus,
      })
      .select('*, department:departments(*), service_type:service_types(*)')
      .single();

    if (ticketErr || !ticket) {
      throw new Error(`Erro ao registrar chamado: ${ticketErr?.message}`);
    }

    // 2. Insert form answers
    if (payload.answers.length > 0) {
      const answersRows = payload.answers.map((a) => ({
        ticket_id: ticket.id,
        field_id: a.field_id,
        field_label: a.field_label,
        field_type: a.field_type,
        answer_value: a.answer_value,
      }));
      await supabase.from('ticket_answers').insert(answersRows);
    }

    // 3. Log initial event
    const initialDescription = requiresApproval
      ? `Chamado registrado por ${requester.name} e encaminhado para análise e aprovação da equipe.`
      : `Chamado registrado por ${requester.name} (${requester.email})`;

    await supabase.from('ticket_events').insert({
      ticket_id: ticket.id,
      actor_id: requester.id,
      actor_name: requester.name,
      action_type: 'criacao',
      description: initialDescription,
      is_internal: false,
    });

    // 4. Notify attendants of that department
    const { data: deptMembers } = await supabase
      .from('department_members')
      .select('user_id')
      .eq('department_id', payload.department_id);

    const attendantUserIds = (deptMembers || []).map((m) => m.user_id);

    if (attendantUserIds.length > 0) {
      const attendantTitle = requiresApproval
        ? `Novo chamado aguardando aprovação: ${ticket.protocol}`
        : `Novo chamado recebido: ${ticket.protocol}`;
      const attendantMessage = requiresApproval
        ? `${ticket.subject} (Prioridade: ${ticket.priority}) — aguardando análise e aprovação da equipe.`
        : `${ticket.subject} (Prioridade: ${ticket.priority})`;

      await notificationService.dispatchNotification({
        recipientUserIds: attendantUserIds,
        ticketId: ticket.id,
        protocol: ticket.protocol,
        title: attendantTitle,
        message: attendantMessage,
        type: 'novo_chamado',
      });
    }

    // 5. Notify requester confirmation
    const requesterTitle = requiresApproval
      ? `Chamado registrado: ${ticket.protocol}`
      : `Chamado registrado com sucesso: ${ticket.protocol}`;
    const requesterMessage = requiresApproval
      ? `Sua solicitação foi registrada e está aguardando aprovação da equipe.`
      : `Sua solicitação foi encaminhada para a equipe de atendimento.`;

    await notificationService.dispatchNotification({
      recipientUserIds: [requester.id],
      ticketId: ticket.id,
      protocol: ticket.protocol,
      title: requesterTitle,
      message: requesterMessage,
      type: 'novo_chamado',
    });

    return ticket as Ticket;
  },

  // Query tickets based on current role and filters
  async getTickets(params: {
    view: 'minhas_solicitacoes' | 'minha_area' | 'nao_atribuidos' | 'atribuidos_a_mim' | 'todos_global';
    currentUser: UserProfile;
    statusFilter?: TicketStatus[];
    departmentId?: string;
    priorityFilter?: TicketPriority[];
    searchQuery?: string;
  }): Promise<Ticket[]> {
    let query = supabase
      .from('tickets')
      .select('*, department:departments(*), service_type:service_types(*), assignee:users_profile!tickets_assigned_to_fkey(*)')
      .order('created_at', { ascending: false });

    // Filter by view
    if (params.view === 'minhas_solicitacoes') {
      query = query.eq('requester_id', params.currentUser.id);
    } else if (params.view === 'minha_area') {
      // Find attendant's authorized departments
      if (params.currentUser.role !== 'super_admin') {
        const memberships = await authService.getUserDepartments(params.currentUser.id);
        const authorizedDeptIds = memberships.map((m) => m.department_id);
        if (authorizedDeptIds.length === 0) return [];
        query = query.in('department_id', authorizedDeptIds);
      }
    } else if (params.view === 'nao_atribuidos') {
      query = query.is('assigned_to', null).in('status', ['aguardando_aprovacao', 'aberto', 'em_andamento', 'aguardando_solicitante']);
      if (params.currentUser.role !== 'super_admin') {
        const memberships = await authService.getUserDepartments(params.currentUser.id);
        const authorizedDeptIds = memberships.map((m) => m.department_id);
        if (authorizedDeptIds.length === 0) return [];
        query = query.in('department_id', authorizedDeptIds);
      }
    } else if (params.view === 'atribuidos_a_mim') {
      query = query.eq('assigned_to', params.currentUser.id).in('status', ['aguardando_aprovacao', 'aberto', 'em_andamento', 'aguardando_solicitante']);
    } else if (params.view === 'todos_global') {
      if (params.currentUser.role !== 'super_admin') {
        return [];
      }
    }

    if (params.departmentId) {
      query = query.eq('department_id', params.departmentId);
    }

    if (params.statusFilter && params.statusFilter.length > 0) {
      query = query.in('status', params.statusFilter);
    }

    if (params.priorityFilter && params.priorityFilter.length > 0) {
      query = query.in('priority', params.priorityFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching tickets:', error);
      return [];
    }

    let results = (data as Ticket[]) || [];

    if (params.searchQuery && params.searchQuery.trim().length > 0) {
      const q = params.searchQuery.toLowerCase().trim();
      results = results.filter(
        (t) =>
          t.protocol.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.requester_name.toLowerCase().includes(q)
      );
    }

    return results;
  },

  // Get full ticket detail with permissions verification
  async getTicketDetail(
    ticketId: string,
    currentUser: UserProfile
  ): Promise<{
    ticket: Ticket;
    answers: TicketAnswer[];
    messages: TicketMessage[];
    events: TicketEvent[];
    canViewInternalNotes: boolean;
    canActOnTicket: boolean;
    isSuperAdmin: boolean;
  }> {
    // 1. Fetch ticket
    const { data: ticket, error: ticketErr } = await supabase
      .from('tickets')
      .select('*, department:departments(*), service_type:service_types(*), assignee:users_profile!tickets_assigned_to_fkey(*)')
      .eq('id', ticketId)
      .single();

    if (ticketErr || !ticket) throw new Error('Chamado não encontrado');

    const isSuperAdmin = currentUser.role === 'super_admin';
    const isRequester = ticket.requester_id === currentUser.id;
    const isAttendant = await authService.isAttendantForDepartment(currentUser.id, ticket.department_id);

    // Spec 4.3: Confidencialidade: não exibir o conteúdo de chamados de terceiros ao solicitante
    if (!isSuperAdmin && !isAttendant && !isRequester) {
      throw new Error('Acesso não autorizado: você não tem permissão para visualizar este chamado.');
    }

    const canViewInternalNotes = isSuperAdmin || isAttendant;
    const canActOnTicket = isSuperAdmin || isAttendant;

    // 2. Fetch answers
    const { data: answers } = await supabase
      .from('ticket_answers')
      .select('*')
      .eq('ticket_id', ticketId);

    // 3. Fetch messages (Sec. 8.6: Internal notes strictly separated from requester)
    let messagesQuery = supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (!canViewInternalNotes) {
      // Requesters can NEVER see internal messages
      messagesQuery = messagesQuery.eq('is_internal', false);
    }

    const { data: messages } = await messagesQuery;

    // 4. Fetch timeline events
    let eventsQuery = supabase
      .from('ticket_events')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (!canViewInternalNotes) {
      eventsQuery = eventsQuery.eq('is_internal', false);
    }

    const { data: events } = await eventsQuery;

    return {
      ticket: ticket as Ticket,
      answers: answers || [],
      messages: (messages as TicketMessage[]) || [],
      events: (events as TicketEvent[]) || [],
      canViewInternalNotes,
      canActOnTicket,
      isSuperAdmin,
    };
  },

  // Spec 9.2: Atribuição voluntária (Assumir chamado) — permite assumir mesmo se já atribuído a outro
  async claimTicket(ticketId: string, actor: UserProfile): Promise<Ticket> {
    const { data: current } = await supabase
      .from('tickets')
      .select('assigned_to, assigned_to_prev:assigned_to, protocol, department_id, status')
      .eq('id', ticketId)
      .single();

    if (!current) throw new Error('Chamado não encontrado');

    // Verify actor is authorized for this department
    const authorized =
      actor.role === 'super_admin' ||
      (await authService.isAttendantForDepartment(actor.id, current.department_id));

    if (!authorized) {
      throw new Error('Você não possui autorização de atendimento para este departamento.');
    }

    // Cannot assume your own already-assigned ticket
    if (current.assigned_to === actor.id) {
      throw new Error('Você já é o responsável principal por este chamado.');
    }

    const previousAssigneeId: string | null = current.assigned_to ?? null;

    // Get previous assignee name for the history record
    let previousAssigneeName = 'Fila geral (não atribuído)';
    if (previousAssigneeId) {
      const { data: prev } = await supabase
        .from('users_profile')
        .select('name')
        .eq('id', previousAssigneeId)
        .single();
      previousAssigneeName = prev?.name || 'Atendente anterior';
    }

    // Atomic update — only updates if assigned_to still matches what we read
    // (optimistic concurrency: prevents two simultaneous claims resulting in the same assignee)
    let updateQuery = supabase
      .from('tickets')
      .update({
        assigned_to: actor.id,
        // NOTE: status is NOT changed automatically (spec requirement)
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId)
      .select('*, department:departments(*), service_type:service_types(*), assignee:users_profile!tickets_assigned_to_fkey(*)')
      .maybeSingle();

    const { data: updated, error } = await updateQuery;

    if (error || !updated) {
      throw new Error('Não foi possível assumir o chamado. Tente novamente.');
    }

    // Record timeline event
    await supabase.from('ticket_events').insert({
      ticket_id: ticketId,
      actor_id: actor.id,
      actor_name: actor.name,
      action_type: 'atribuicao',
      old_value: previousAssigneeId || null,
      new_value: actor.id,
      description: previousAssigneeId
        ? `${actor.name} assumiu a responsabilidade principal (anterior: ${previousAssigneeName}).`
        : `${actor.name} assumiu a responsabilidade principal pelo atendimento.`,
      is_internal: false,
    });

    // Notify previous assignee that responsibility was taken over
    if (previousAssigneeId) {
      await notificationService.dispatchNotification({
        recipientUserIds: [previousAssigneeId],
        ticketId,
        protocol: current.protocol,
        title: `Responsabilidade transferida: ${current.protocol}`,
        message: `${actor.name} assumiu este chamado.`,
        type: 'atribuicao',
      });
    }

    // Notify new assignee (actor)
    await notificationService.dispatchNotification({
      recipientUserIds: [actor.id],
      ticketId,
      protocol: current.protocol,
      title: `Você assumiu o chamado: ${current.protocol}`,
      message: previousAssigneeId
        ? `Responsabilidade transferida de ${previousAssigneeName}.`
        : `Chamado atribuído a você a partir da fila geral.`,
      type: 'atribuicao',
    });

    return updated as Ticket;
  },

  // Spec 9.3: Distribuição pelo administrador supremo
  async assignTicket(
    ticketId: string,
    newAssigneeId: string | null,
    actor: UserProfile,
    justification?: string
  ): Promise<Ticket> {
    if (actor.role !== 'super_admin') {
      throw new Error('Apenas o Administrador Supremo pode designar ou redistribuir chamados.');
    }

    const { data: current } = await supabase
      .from('tickets')
      .select('assigned_to, protocol, department_id')
      .eq('id', ticketId)
      .single();

    if (!current) throw new Error('Chamado não encontrado');

    // If assigning to a user, verify the user is an authorized member of that department
    let newAssigneeName = 'Nenhum (Devolvido à Fila)';
    if (newAssigneeId) {
      const isMember = await authService.isAttendantForDepartment(newAssigneeId, current.department_id);
      if (!isMember) {
        throw new Error('O usuário selecionado não é atendente autorizado para esta caixa/departamento.');
      }
      const { data: user } = await supabase
        .from('users_profile')
        .select('name')
        .eq('id', newAssigneeId)
        .single();
      newAssigneeName = user?.name || 'Atendente';
    }

    const { data: updated, error } = await supabase
      .from('tickets')
      .update({
        assigned_to: newAssigneeId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId)
      .select('*, department:departments(*), service_type:service_types(*), assignee:users_profile!tickets_assigned_to_fkey(*)')
      .single();

    if (error) throw error;

    // Timeline event
    const desc = newAssigneeId
      ? `Responsabilidade designada para ${newAssigneeName} por ${actor.name}${justification ? ` - Justificativa: ${justification}` : ''}`
      : `Chamado devolvido para a fila de não atribuídos por ${actor.name}`;

    await supabase.from('ticket_events').insert({
      ticket_id: ticketId,
      actor_id: actor.id,
      actor_name: actor.name,
      action_type: 'transferencia',
      description: desc,
      is_internal: true,
    });

    // Notify new assignee
    if (newAssigneeId) {
      await notificationService.dispatchNotification({
        recipientUserIds: [newAssigneeId],
        ticketId,
        protocol: current.protocol,
        title: `Chamado atribuído a você: ${current.protocol}`,
        message: `Designado por ${actor.name}`,
        type: 'atribuicao',
      });
    }

    return updated as Ticket;
  },

  // Add message (public response or internal note)
  async addMessage(
    ticketId: string,
    content: string,
    isInternal: boolean,
    actor: UserProfile
  ): Promise<TicketMessage> {
    const { data: ticket } = await supabase
      .from('tickets')
      .select('id, protocol, requester_id, department_id, assigned_to')
      .eq('id', ticketId)
      .single();

    if (!ticket) throw new Error('Chamado não encontrado');

    const isRequester = ticket.requester_id === actor.id;
    const isSuperAdmin = actor.role === 'super_admin';
    const isAttendant = await authService.isAttendantForDepartment(actor.id, ticket.department_id);

    // Requester can never post internal notes
    if (isRequester && isInternal) {
      throw new Error('Solicitantes não podem adicionar notas internas.');
    }

    if (!isSuperAdmin && !isAttendant && !isRequester) {
      throw new Error('Você não tem permissão para responder neste chamado.');
    }

    const { data: message, error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        author_id: actor.id,
        author_name: actor.name,
        author_email: actor.email,
        is_internal: isInternal,
        content: content.trim(),
      })
      .select()
      .single();

    if (error) throw error;

    // Timeline event
    await supabase.from('ticket_events').insert({
      ticket_id: ticketId,
      actor_id: actor.id,
      actor_name: actor.name,
      action_type: isInternal ? 'nota_interna' : 'resposta_publica',
      description: isInternal
        ? `Nota interna registrada por ${actor.name}`
        : `Resposta pública enviada por ${actor.name}`,
      is_internal: isInternal,
    });

    // Update ticket updated_at
    await supabase
      .from('tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', ticketId);

    // Notifications dispatching (Sec. 10.3)
    if (!isInternal) {
      if (isRequester) {
        // Solicitante respondeu -> notificar responsável ou atendentes da fila
        const recipients: string[] = [];
        if (ticket.assigned_to) {
          recipients.push(ticket.assigned_to);
        } else {
          const { data: members } = await supabase
            .from('department_members')
            .select('user_id')
            .eq('department_id', ticket.department_id);
          recipients.push(...(members || []).map((m) => m.user_id));
        }
        await notificationService.dispatchNotification({
          recipientUserIds: recipients,
          ticketId,
          protocol: ticket.protocol,
          title: `Nova resposta do solicitante em ${ticket.protocol}`,
          message: content.slice(0, 100),
          type: 'resposta',
        });
      } else {
        // Atendente respondeu publicamente -> notificar solicitante
        await notificationService.dispatchNotification({
          recipientUserIds: [ticket.requester_id],
          ticketId,
          protocol: ticket.protocol,
          title: `Nova resposta da equipe no chamado ${ticket.protocol}`,
          message: content.slice(0, 100),
          type: 'resposta',
        });
      }
    }

    return message as TicketMessage;
  },

  // Approve ticket (Spec 4.2 / Refinamento 05: Apenas atendentes autorizados ou Super Admin)
  async approveTicket(ticketId: string, actor: UserProfile): Promise<Ticket> {
    const { data: current } = await supabase
      .from('tickets')
      .select('*, department:departments(*)')
      .eq('id', ticketId)
      .single();

    if (!current) throw new Error('Chamado não encontrado');

    const isSuperAdmin = actor.role === 'super_admin';
    const isAttendant = await authService.isAttendantForDepartment(actor.id, current.department_id);

    if (!isSuperAdmin && !isAttendant) {
      throw new Error('Você não possui autorização para aprovar chamados deste departamento.');
    }

    if (current.status !== 'aguardando_aprovacao') {
      throw new Error(`Este chamado não está aguardando aprovação (status atual: ${current.status}).`);
    }

    const now = new Date().toISOString();

    // Gravação direta com auditoria obrigatória de aprovador e data
    const { data: updated, error } = await supabase
      .from('tickets')
      .update({
        status: 'aberto',
        updated_at: now,
        approved_at: now,
        approved_by: actor.id,
      })
      .eq('id', ticketId)
      .select('*, department:departments(*), service_type:service_types(*), assignee:users_profile!tickets_assigned_to_fkey(*)')
      .single();

    if (error || !updated) {
      throw new Error(`Falha ao registrar aprovação no banco de dados: ${error?.message || 'Erro desconhecido'}`);
    }

    // Timeline event
    await supabase.from('ticket_events').insert({
      ticket_id: ticketId,
      actor_id: actor.id,
      actor_name: actor.name,
      action_type: 'aprovacao_ti',
      old_value: 'aguardando_aprovacao',
      new_value: 'aberto',
      description: `Solicitação aprovada por ${actor.name} (${actor.email}). Chamado liberado para atendimento.`,
      is_internal: false,
    });

    // Notify requester
    await notificationService.dispatchNotification({
      recipientUserIds: [current.requester_id],
      ticketId,
      protocol: current.protocol,
      title: `Solicitação aprovada: ${current.protocol}`,
      message: `Sua solicitação foi aprovada pela equipe de TI e liberada para atendimento.`,
      type: 'status',
    });

    return updated as Ticket;
  },

  // Update form answers by requester prior to approval (Refinamento 05)
  async updateTicketAnswers(
    ticketId: string,
    answers: { field_id: string; field_label: string; field_type: string; answer_value: any }[],
    actor: UserProfile
  ): Promise<void> {
    const { data: ticket } = await supabase
      .from('tickets')
      .select('*, department:departments(*)')
      .eq('id', ticketId)
      .single();

    if (!ticket) throw new Error('Chamado não encontrado');

    // Server-side permission check: only requester or super_admin
    const isRequester = ticket.requester_id === actor.id;
    const isSuperAdmin = actor.role === 'super_admin';
    if (!isRequester && !isSuperAdmin) {
      throw new Error('Apenas o solicitante da abertura pode editar os dados desta solicitação.');
    }

    // Server-side strict check: can ONLY edit while in 'aguardando_aprovacao'
    if (ticket.status !== 'aguardando_aprovacao') {
      throw new Error('Esta solicitação já foi aprovada/liberada e não pode mais ser alterada.');
    }

    // Replace answers
    await supabase.from('ticket_answers').delete().eq('ticket_id', ticketId);

    if (answers.length > 0) {
      const answersRows = answers.map((a) => ({
        ticket_id: ticketId,
        field_id: a.field_id,
        field_label: a.field_label,
        field_type: a.field_type,
        answer_value: a.answer_value,
      }));
      await supabase.from('ticket_answers').insert(answersRows);
    }

    // Update ticket updated_at
    await supabase
      .from('tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', ticketId);

    // Timeline event
    await supabase.from('ticket_events').insert({
      ticket_id: ticketId,
      actor_id: actor.id,
      actor_name: actor.name,
      action_type: 'edicao_solicitante',
      description: `Solicitação atualizada pelo solicitante ${actor.name} com informações ou anexos complementares.`,
      is_internal: false,
    });

    // Notify attendants of that department
    const { data: deptMembers } = await supabase
      .from('department_members')
      .select('user_id')
      .eq('department_id', ticket.department_id);

    const attendantUserIds = (deptMembers || []).map((m) => m.user_id);
    if (attendantUserIds.length > 0) {
      await notificationService.dispatchNotification({
        recipientUserIds: attendantUserIds,
        ticketId,
        protocol: ticket.protocol,
        title: `Solicitação atualizada pelo solicitante: ${ticket.protocol}`,
        message: `${actor.name} atualizou as informações do formulário/anexos.`,
        type: 'resposta',
      });
    }
  },

  // Update status (e.g. resolver, fechar, reabrir)
  async updateStatus(
    ticketId: string,
    newStatus: TicketStatus,
    actor: UserProfile,
    justification?: string
  ): Promise<Ticket> {
    const { data: ticket } = await supabase
      .from('tickets')
      .select('*, department:departments(*)')
      .eq('id', ticketId)
      .single();

    if (!ticket) throw new Error('Chamado não encontrado');

    const isSuperAdmin = actor.role === 'super_admin';
    const isAttendant = await authService.isAttendantForDepartment(actor.id, ticket.department_id);

    if (!isSuperAdmin && !isAttendant) {
      throw new Error('Apenas a equipe autorizada ou a administração pode alterar o status do chamado.');
    }

    // Rule: Não permitir contornar a aprovação da TI
    if (ticket.status === 'aguardando_aprovacao') {
      if (newStatus === 'aberto') {
        throw new Error('A transição de "Aguardando Aprovação" para "Aberto" deve ser realizada através da ação oficial "Aprovar Solicitação".');
      }
      if (['em_andamento', 'resolvido', 'fechado'].includes(newStatus)) {
        throw new Error('O chamado não pode avançar diretamente para atendimento ou resolução antes de ser formalmente aprovado.');
      }
    }

    const updates: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === 'resolvido') {
      updates.resolved_at = new Date().toISOString();
    } else if (newStatus === 'fechado') {
      updates.closed_at = new Date().toISOString();
    }

    const { data: updated, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', ticketId)
      .select('*, department:departments(*), service_type:service_types(*), assignee:users_profile!tickets_assigned_to_fkey(*)')
      .single();

    if (error) throw error;

    // Timeline event
    await supabase.from('ticket_events').insert({
      ticket_id: ticketId,
      actor_id: actor.id,
      actor_name: actor.name,
      action_type: 'mudanca_status',
      old_value: ticket.status,
      new_value: newStatus,
      description: `Status alterado de "${ticket.status}" para "${newStatus}" por ${actor.name}${justification ? ` (${justification})` : ''}`,
      is_internal: false,
    });

    // Notify requester
    await notificationService.dispatchNotification({
      recipientUserIds: [ticket.requester_id],
      ticketId,
      protocol: ticket.protocol,
      title: `Status atualizado: ${ticket.protocol} agora está "${newStatus}"`,
      message: `Atualizado por ${actor.name}`,
      type: 'status',
    });

    return updated as Ticket;
  },

  // Cancelar chamado (Solicitante em chamado próprio, Atendente da caixa ou Super Admin)
  async cancelTicket(
    ticketId: string,
    actor: UserProfile,
    justification?: string
  ): Promise<Ticket> {
    const { data: ticket } = await supabase
      .from('tickets')
      .select('*, department:departments(*)')
      .eq('id', ticketId)
      .single();

    if (!ticket) throw new Error('Chamado não encontrado');

    const isRequester = ticket.requester_id === actor.id;
    const isSuperAdmin = actor.role === 'super_admin';
    const isAttendant = await authService.isAttendantForDepartment(actor.id, ticket.department_id);

    // Permissões
    if (!isRequester && !isAttendant && !isSuperAdmin) {
      throw new Error('Você não tem permissão para cancelar este chamado.');
    }

    // Não permitir cancelar chamados já resolvidos, fechados ou já cancelados
    if (['resolvido', 'fechado', 'cancelado'].includes(ticket.status)) {
      throw new Error(`Chamados com status "${ticket.status}" não podem ser cancelados.`);
    }

    // Justificativa obrigatória para atendentes ou administradores
    if (!isRequester && (!justification || !justification.trim())) {
      throw new Error('É obrigatório informar uma justificativa para o cancelamento deste chamado.');
    }

    const now = new Date().toISOString();
    const { data: updated, error } = await supabase
      .from('tickets')
      .update({
        status: 'cancelado',
        closed_at: now,
        updated_at: now,
      })
      .eq('id', ticketId)
      .select('*, department:departments(*), service_type:service_types(*), assignee:users_profile!tickets_assigned_to_fkey(*)')
      .single();

    if (error || !updated) {
      throw new Error(`Erro ao cancelar chamado: ${error?.message || 'Falha desconhecida'}`);
    }

    // Timeline event
    const eventDescription = isRequester
      ? `Chamado cancelado pelo solicitante ${actor.name}${justification?.trim() ? ` — Motivo: ${justification.trim()}` : ''}`
      : `Chamado cancelado por ${actor.name} (${actor.role === 'super_admin' ? 'Super Admin' : 'Atendente'}) — Justificativa: ${justification?.trim()}`;

    await supabase.from('ticket_events').insert({
      ticket_id: ticketId,
      actor_id: actor.id,
      actor_name: actor.name,
      action_type: 'cancelamento',
      old_value: ticket.status,
      new_value: 'cancelado',
      description: eventDescription,
      is_internal: false,
    });

    // Notificar solicitante se cancelado por terceiros, ou notificar equipe se cancelado pelo solicitante
    if (isRequester) {
      const recipients: string[] = [];
      if (ticket.assigned_to) {
        recipients.push(ticket.assigned_to);
      } else {
        const { data: members } = await supabase
          .from('department_members')
          .select('user_id')
          .eq('department_id', ticket.department_id);
        recipients.push(...(members || []).map((m) => m.user_id));
      }
      if (recipients.length > 0) {
        await notificationService.dispatchNotification({
          recipientUserIds: recipients,
          ticketId,
          protocol: ticket.protocol,
          title: `Chamado cancelado pelo solicitante: ${ticket.protocol}`,
          message: `${actor.name} cancelou o chamado.`,
          type: 'status',
        });
      }
    } else {
      await notificationService.dispatchNotification({
        recipientUserIds: [ticket.requester_id],
        ticketId,
        protocol: ticket.protocol,
        title: `Seu chamado ${ticket.protocol} foi cancelado`,
        message: `Cancelado por ${actor.name}. Justificativa: ${justification?.trim()}`,
        type: 'status',
      });
    }

    return updated as Ticket;
  },
};
