import { supabase } from '../lib/supabase';
import { Notification, NotificationDelivery } from '../types/database';

export const notificationService = {
  // Get notifications for a user
  async getUserNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
    return data || [];
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
  },

  // Mark all user notifications as read
  async markAllAsRead(userId: string): Promise<void> {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
  },

  // Dispatch an event notification
  async dispatchNotification(payload: {
    recipientUserIds: string[];
    ticketId: string;
    protocol: string;
    title: string;
    message: string;
    type: 'novo_chamado' | 'atribuicao' | 'resposta' | 'status' | 'conclusao';
  }): Promise<void> {
    const uniqueRecipients = Array.from(new Set(payload.recipientUserIds));

    for (const userId of uniqueRecipients) {
      // 1. In-app notification
      const { data: notif, error: notifErr } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          ticket_id: payload.ticketId,
          title: payload.title,
          message: payload.message,
          type: payload.type,
          is_read: false,
          link: `/ticket/${payload.ticketId}`,
        })
        .select()
        .single();

      if (notifErr || !notif) continue;

      // 2. Delivery record (In-App delivered immediately)
      await supabase.from('notification_deliveries').insert({
        notification_id: notif.id,
        channel: 'in_app',
        status: 'enviado',
        sent_at: new Date().toISOString(),
      });

      // 3. Email Delivery record
      // Spec 10.4: Registrar estado do aviso. Quando o serviço externo ainda não estiver configurado,
      // sinalizar claramente como pendente ou simulação em ambiente de testes; NÃO afirmar que o e-mail foi entregue se não foi.
      await supabase.from('notification_deliveries').insert({
        notification_id: notif.id,
        channel: 'email',
        status: 'pendente',
        error_message: 'Serviço transacional SMTP institucional pendente de configuração corporativa (Spec 10.4)',
      });
    }
  },

  // Get delivery logs for audit / diagnostics
  async getDeliveryLogs(notificationId: string): Promise<NotificationDelivery[]> {
    const { data } = await supabase
      .from('notification_deliveries')
      .select('*')
      .eq('notification_id', notificationId);
    return data || [];
  },
};
