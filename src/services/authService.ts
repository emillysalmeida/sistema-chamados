import { supabase } from '../lib/supabase';
import { UserProfile, DepartmentMember, Team, TeamMember } from '../types/database';

export const INITIAL_SUPER_ADMIN_EMAIL = 'emilly.almeida@mtp.com.br';

export const authService = {
  // Sync auth.users session with users_profile
  async syncUserProfile(authUserId: string, email: string, name?: string): Promise<UserProfile> {
    const cleanEmail = email.trim().toLowerCase();

    // Check if profile exists by email or id
    const { data: existing } = await supabase
      .from('users_profile')
      .select('*')
      .or(`id.eq.${authUserId},email.eq.${cleanEmail}`)
      .maybeSingle();

    const isInitialSuperAdmin = cleanEmail === INITIAL_SUPER_ADMIN_EMAIL;
    const resolvedName = name?.trim() || existing?.name || cleanEmail.split('@')[0];
    const resolvedRole = existing?.role || (isInitialSuperAdmin ? 'super_admin' : 'solicitante');

    if (existing) {
      // Update with auth ID and fresh name if needed
      const { data: updated, error: updErr } = await supabase
        .from('users_profile')
        .update({
          id: authUserId,
          name: resolvedName,
          role: resolvedRole,
          updated_at: new Date().toISOString(),
        })
        .eq('email', cleanEmail)
        .select()
        .single();

      if (!updErr && updated) return updated;
      return existing;
    }

    // Insert new profile (new users default to 'solicitante' who can open tickets)
    const { data: created, error } = await supabase
      .from('users_profile')
      .insert({
        id: authUserId,
        name: resolvedName,
        email: cleanEmail,
        role: resolvedRole,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao sincronizar perfil do usuário:', error);
      throw new Error(`Erro ao registrar perfil: ${error.message}`);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_id: created.id,
      actor_name: created.name,
      action: isInitialSuperAdmin ? 'BOOTSTRAP_SUPER_ADMIN' : 'NOVO_USUARIO_REGISTRADO',
      entity_type: 'users_profile',
      entity_id: created.id,
      details: { email: cleanEmail, role: created.role },
    });

    return created;
  },

  // Supabase Auth: Sign Up
  async signUp(email: string, password: string, name: string): Promise<{ user: UserProfile; session: any }> {
    const cleanEmail = email.trim().toLowerCase();
    
    // Corporate domain check
    if (!cleanEmail.endsWith('@mtp.com.br')) {
      throw new Error('O cadastro é restrito a e-mails corporativos @mtp.com.br (Spec 4.1)');
    }

    if (password.length < 6) {
      throw new Error('A senha deve possuir pelo menos 6 caracteres.');
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { name: name.trim() },
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error('Não foi possível criar o usuário.');

    // Ensure users_profile exists
    const profile = await this.syncUserProfile(data.user.id, cleanEmail, name);

    return { user: profile, session: data.session };
  },

  // Supabase Auth: Sign In with password
  async signIn(email: string, password: string): Promise<{ user: UserProfile; session: any }> {
    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('Credenciais inválidas.');

    const profile = await this.syncUserProfile(
      data.user.id,
      cleanEmail,
      data.user.user_metadata?.name
    );

    return { user: profile, session: data.session };
  },

  // Supabase Auth: Send password reset email
  async resetPassword(email: string): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
  },

  // Supabase Auth: Sign Out
  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },

  // Get current active session
  async getCurrentSession(): Promise<{ user: UserProfile | null; session: any }> {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) {
      return { user: null, session: null };
    }

    const { data: profile } = await supabase
      .from('users_profile')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profile) {
      return { user: profile, session };
    }

    // Sync if not found
    const synced = await this.syncUserProfile(
      session.user.id,
      session.user.email!,
      session.user.user_metadata?.name
    );
    return { user: synced, session };
  },

  // Get all registered users (for admin team assignments)
  async getAllUsers(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('users_profile')
      .select('*')
      .order('name');
    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }
    return data || [];
  },

  // Transfer or grant role to another verified user (Sec. 3.3)
  async updateRole(
    targetUserId: string,
    newRole: 'solicitante' | 'atendente' | 'super_admin',
    actor: UserProfile,
    justification: string
  ): Promise<boolean> {
    // Safety check: Cannot leave system without super_admin
    if (newRole !== 'super_admin') {
      const { count } = await supabase
        .from('users_profile')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'super_admin');

      // Only block if the target user IS currently super_admin and would be the last one
      const { data: target } = await supabase
        .from('users_profile')
        .select('role')
        .eq('id', targetUserId)
        .single();

      if (target?.role === 'super_admin' && (count || 0) <= 1) {
        throw new Error('Operação bloqueada: o sistema não pode ficar sem nenhum Administrador Supremo ativo.');
      }
    }

    const { error } = await supabase
      .from('users_profile')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', targetUserId);

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'ALTERAR_PAPEL_USUARIO',
      entity_type: 'users_profile',
      entity_id: targetUserId,
      details: { newRole, justification },
    });

    return true;
  },

  // Get user's department memberships
  async getUserDepartments(userId: string): Promise<DepartmentMember[]> {
    const { data, error } = await supabase
      .from('department_members')
      .select('*, department:departments(*)')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user departments:', error);
      return [];
    }
    return (data as DepartmentMember[]) || [];
  },

  // Check if user is attendant for specific department
  async isAttendantForDepartment(userId: string, departmentId: string): Promise<boolean> {
    const { data } = await supabase
      .from('department_members')
      .select('id')
      .eq('user_id', userId)
      .eq('department_id', departmentId)
      .maybeSingle();
    return !!data;
  },
};

// ── Serviço de Equipes ────────────────────────────────────────

export const teamService = {
  async getTeams(): Promise<Team[]> {
    const { data, error } = await supabase
      .from('teams')
      .select('*, department:departments(id, name, code)')
      .order('name');
    if (error) {
      console.error('Error fetching teams:', error);
      return [];
    }
    // attach member counts
    const teams: Team[] = [];
    for (const t of data || []) {
      const { count } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', t.id);
      teams.push({ ...t, member_count: count || 0 });
    }
    return teams;
  },

  async createTeam(
    payload: { name: string; description?: string; team_email?: string; department_id: string },
    actor: UserProfile
  ): Promise<Team> {
    const { data, error } = await supabase
      .from('teams')
      .insert({
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        team_email: payload.team_email?.trim() || null,
        department_id: payload.department_id,
        is_active: true,
      })
      .select('*, department:departments(id, name, code)')
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'CRIAR_EQUIPE',
      entity_type: 'teams',
      entity_id: data.id,
      details: { name: data.name, department_id: data.department_id },
    });

    return data as Team;
  },

  async updateTeam(
    id: string,
    updates: { name?: string; description?: string; team_email?: string; is_active?: boolean },
    actor: UserProfile
  ): Promise<void> {
    const { error } = await supabase
      .from('teams')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;

    await supabase.from('audit_logs').insert({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'ATUALIZAR_EQUIPE',
      entity_type: 'teams',
      entity_id: id,
      details: updates,
    });
  },

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const { data, error } = await supabase
      .from('team_members')
      .select('*, user:users_profile(id, name, email, role)')
      .eq('team_id', teamId);
    if (error) {
      console.error('Error fetching team members:', error);
      return [];
    }
    return (data as TeamMember[]) || [];
  },

  async addTeamMember(
    teamId: string,
    userId: string,
    team: Team,
    actor: UserProfile
  ): Promise<void> {
    // Insert into team_members
    const { error } = await supabase
      .from('team_members')
      .insert({ team_id: teamId, user_id: userId });
    if (error) throw error;

    // Also ensure user is in department_members for the team's department
    const { data: existing } = await supabase
      .from('department_members')
      .select('id')
      .eq('department_id', team.department_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!existing) {
      await supabase
        .from('department_members')
        .insert({ department_id: team.department_id, user_id: userId, can_respond: true });
    }

    await supabase.from('audit_logs').insert({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'ADICIONAR_MEMBRO_EQUIPE',
      entity_type: 'team_members',
      entity_id: `${teamId}:${userId}`,
      details: { team_id: teamId, department_id: team.department_id },
    });
  },

  async removeTeamMember(
    teamId: string,
    userId: string,
    team: Team,
    actor: UserProfile
  ): Promise<{ unassignedTickets: number }> {
    // Remove from team_members
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);
    if (error) throw error;

    // Check if user is still member of another team in same department
    const { count: otherTeams } = await supabase
      .from('team_members')
      .select('team_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in(
        'team_id',
        (
          await supabase
            .from('teams')
            .select('id')
            .eq('department_id', team.department_id)
            .eq('is_active', true)
        ).data?.map((t) => t.id) || []
      );

    let unassigned = 0;
    // If no other team in this dept, remove from department_members too
    if ((otherTeams || 0) === 0) {
      const { count: assigned } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('department_id', team.department_id)
        .eq('assigned_to', userId)
        .in('status', ['aberto', 'em_andamento', 'aguardando_solicitante']);

      unassigned = assigned || 0;
      if (unassigned > 0) {
        await supabase
          .from('tickets')
          .update({ assigned_to: null, updated_at: new Date().toISOString() })
          .eq('department_id', team.department_id)
          .eq('assigned_to', userId)
          .in('status', ['aberto', 'em_andamento', 'aguardando_solicitante']);
      }

      await supabase
        .from('department_members')
        .delete()
        .eq('department_id', team.department_id)
        .eq('user_id', userId);
    }

    await supabase.from('audit_logs').insert({
      actor_id: actor.id,
      actor_name: actor.name,
      action: 'REMOVER_MEMBRO_EQUIPE',
      entity_type: 'team_members',
      entity_id: `${teamId}:${userId}`,
      details: { team_id: teamId, unassignedTickets: unassigned },
    });

    return { unassignedTickets: unassigned };
  },

  async getUserTeams(userId: string): Promise<TeamMember[]> {
    const { data, error } = await supabase
      .from('team_members')
      .select('*, team:teams(*, department:departments(id, name, code))')
      .eq('user_id', userId);
    if (error) return [];
    return (data as TeamMember[]) || [];
  },
};
