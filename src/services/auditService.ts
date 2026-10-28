import { supabase } from '../lib/supabase';
import { AuditLog } from '../types/database';

export const auditService = {
  async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
    return data || [];
  },

  async getDashboardStats() {
    // Tickets stats
    const { data: tickets } = await supabase
      .from('tickets')
      .select('id, status, priority, department_id, assigned_to, created_at, resolved_at');

    const all = tickets || [];
    const openCount = all.filter((t) => t.status === 'aberto').length;
    const inProgressCount = all.filter((t) => t.status === 'em_andamento').length;
    const waitingCount = all.filter((t) => t.status === 'aguardando_solicitante').length;
    const resolvedCount = all.filter((t) => t.status === 'resolvido').length;
    const closedCount = all.filter((t) => t.status === 'fechado').length;
    const unassignedCount = all.filter((t) => !t.assigned_to && ['aberto', 'em_andamento'].includes(t.status)).length;

    // Departments count
    const { count: deptCount } = await supabase
      .from('departments')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Attendants count
    const { count: memberCount } = await supabase
      .from('department_members')
      .select('*', { count: 'exact', head: true });

    return {
      total: all.length,
      open: openCount,
      inProgress: inProgressCount,
      waiting: waitingCount,
      resolved: resolvedCount,
      closed: closedCount,
      unassigned: unassignedCount,
      activeDepartments: deptCount || 0,
      totalAttendantLinks: memberCount || 0,
    };
  },
};
