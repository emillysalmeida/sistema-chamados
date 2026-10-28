import { supabase } from '../lib/supabase';
import { UserProfile, DepartmentMember } from '../types/database';

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

  // Transfer or grant super_admin to another verified user (Sec. 3.3)
  async updateRole(
    targetUserId: string,
    newRole: 'solicitante' | 'super_admin',
    actor: UserProfile,
    justification: string
  ): Promise<boolean> {
    // Safety check: Cannot leave system without super_admin
    if (newRole === 'solicitante') {
      const { count } = await supabase
        .from('users_profile')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'super_admin');
      if ((count || 0) <= 1) {
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
