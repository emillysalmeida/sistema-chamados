import { supabase } from '../lib/supabase';
import { Department, DepartmentMember, ServiceCategory, ServiceType, UserProfile } from '../types/database';

export const catalogService = {
  // --- DEPARTAMENTOS ---

  async getDepartments(onlyPublished = false): Promise<Department[]> {
    let query = supabase.from('departments').select('*').order('display_order');
    if (onlyPublished) {
      query = query.eq('is_published', true).eq('is_active', true);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching departments:', error);
      return [];
    }

    // Attach counts
    const departments: Department[] = [];
    for (const d of data || []) {
      const { count: memberCount } = await supabase
        .from('department_members')
        .select('*', { count: 'exact', head: true })
        .eq('department_id', d.id);

      const { count: ticketCount } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('department_id', d.id);

      departments.push({
        ...d,
        member_count: memberCount || 0,
        ticket_count: ticketCount || 0,
      });
    }

    return departments;
  },

  async createDepartment(
    payload: { name: string; code: string; description?: string; icon?: string },
    actor: UserProfile
  ): Promise<Department> {
    const code = payload.code.trim().toUpperCase();
    const { data, error } = await supabase
      .from('departments')
      .insert({
        name: payload.name.trim(),
        code,
        description: payload.description?.trim(),
        icon: payload.icon || 'FolderKanban',
        is_active: true,
        is_published: true,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'CRIAR_DEPARTAMENTO',
      entity_type: 'departments',
      entity_id: data.id,
      details: { name: data.name, code: data.code },
    });

    return data;
  },

  async updateDepartment(
    id: string,
    updates: Partial<Department>,
    actor: UserProfile
  ): Promise<Department> {
    const { data, error } = await supabase
      .from('departments')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'ATUALIZAR_DEPARTAMENTO',
      entity_type: 'departments',
      entity_id: id,
      details: updates,
    });

    return data;
  },

  async archiveDepartment(id: string, actor: UserProfile): Promise<void> {
    // Spec 11.1: Impedir exclusão definitiva se houver chamados históricos; usar arquivamento.
    const { error } = await supabase
      .from('departments')
      .update({ is_active: false, is_published: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'ARQUIVAR_DEPARTAMENTO',
      entity_type: 'departments',
      entity_id: id,
    });
  },

  // --- MEMBROS / ATENDENTES DA CAIXA ---

  async getDepartmentMembers(departmentId: string): Promise<DepartmentMember[]> {
    const { data, error } = await supabase
      .from('department_members')
      .select('*, user:users_profile(*)')
      .eq('department_id', departmentId);

    if (error) {
      console.error('Error fetching department members:', error);
      return [];
    }
    return (data as DepartmentMember[]) || [];
  },

  async addDepartmentMember(departmentId: string, userId: string, actor: UserProfile): Promise<void> {
    const { error } = await supabase
      .from('department_members')
      .insert({
        department_id: departmentId,
        user_id: userId,
        can_respond: true,
      });

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'VINCULAR_ATENDENTE',
      entity_type: 'department_members',
      entity_id: `${departmentId}:${userId}`,
    });
  },

  async removeDepartmentMember(
    departmentId: string,
    userId: string,
    actor: UserProfile
  ): Promise<{ assignedTicketsCount: number }> {
    // Spec 9.4: Identificar chamados ainda atribuídos ao atendente removido
    const { count } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('department_id', departmentId)
      .eq('assigned_to', userId)
      .in('status', ['aberto', 'em_andamento', 'aguardando_solicitante']);

    const assignedCount = count || 0;

    // Se houver chamados pendentes, devolver para a fila coletiva (assigned_to = null)
    if (assignedCount > 0) {
      await supabase
        .from('tickets')
        .update({ assigned_to: null, updated_at: new Date().toISOString() })
        .eq('department_id', departmentId)
        .eq('assigned_to', userId)
        .in('status', ['aberto', 'em_andamento', 'aguardando_solicitante']);
    }

    const { error } = await supabase
      .from('department_members')
      .delete()
      .eq('department_id', departmentId)
      .eq('user_id', userId);

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'DESVINCULAR_ATENDENTE',
      entity_type: 'department_members',
      entity_id: `${departmentId}:${userId}`,
      details: { unassignedTickets: assignedCount },
    });

    return { assignedTicketsCount: assignedCount };
  },

  // --- CATEGORIAS ---

  async getCategories(departmentId: string): Promise<ServiceCategory[]> {
    const { data, error } = await supabase
      .from('service_categories')
      .select('*')
      .eq('department_id', departmentId)
      .eq('is_active', true)
      .order('order_index');

    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
    return data || [];
  },

  async createCategory(payload: { department_id: string; name: string; description?: string }): Promise<ServiceCategory> {
    const { data, error } = await supabase
      .from('service_categories')
      .insert({
        department_id: payload.department_id,
        name: payload.name.trim(),
        description: payload.description?.trim(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCategory(id: string, updates: Partial<ServiceCategory>): Promise<void> {
    const { error } = await supabase
      .from('service_categories')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  },

  // --- TIPOS DE SOLICITAÇÃO (SERVIÇOS) ---

  async getServiceTypes(departmentId?: string, onlyPublished = false): Promise<ServiceType[]> {
    let query = supabase
      .from('service_types')
      .select('*, form:form_definitions(*), category:service_categories(*)')
      .order('order_index');

    if (departmentId) {
      query = query.eq('department_id', departmentId);
    }
    if (onlyPublished) {
      query = query.eq('is_published', true).eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching service types:', error);
      return [];
    }
    return (data as ServiceType[]) || [];
  },

  async createServiceType(
    payload: {
      department_id: string;
      category_id?: string;
      name: string;
      description?: string;
      instructions?: string;
      icon?: string;
      form_id: string;
      is_published?: boolean;
    },
    actor: UserProfile
  ): Promise<ServiceType> {
    const { data, error } = await supabase
      .from('service_types')
      .insert({
        department_id: payload.department_id,
        category_id: payload.category_id || null,
        name: payload.name.trim(),
        description: payload.description?.trim(),
        instructions: payload.instructions?.trim(),
        icon: payload.icon || 'FileText',
        form_id: payload.form_id,
        is_published: payload.is_published ?? true,
        is_active: true,
      })
      .select('*, form:form_definitions(*)')
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'CRIAR_TIPO_SOLICITACAO',
      entity_type: 'service_types',
      entity_id: data.id,
      details: { name: data.name, department_id: data.department_id },
    });

    return data as ServiceType;
  },

  async updateServiceType(id: string, updates: Partial<ServiceType>, actor: UserProfile): Promise<void> {
    const { error } = await supabase
      .from('service_types')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'ATUALIZAR_TIPO_SOLICITACAO',
      entity_type: 'service_types',
      entity_id: id,
      details: updates,
    });
  },
};
