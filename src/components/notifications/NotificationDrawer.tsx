import React, { useState, useEffect } from 'react';
import { Notification, NotificationDelivery, UserProfile } from '../../types/database';
import { notificationService } from '../../services/notificationService';
import { Bell, Check, Mail, Clock, ExternalLink, X, Info } from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSelectTicketProtocol?: (ticketId: string) => void;
  onRefreshUnread: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectTicketProtocol,
  onRefreshUnread,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedNotifForDelivery, setSelectedNotifForDelivery] = useState<Notification | null>(null);
  const [deliveries, setDeliveries] = useState<NotificationDelivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const list = await notificationService.getUserNotifications(currentUser.id);
      setNotifications(list);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notif: Notification) => {
    await notificationService.markAsRead(notif.id);
    setNotifications(notifications.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)));
    onRefreshUnread();
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead(currentUser.id);
    setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
    onRefreshUnread();
  };

  const handleViewDelivery = async (notif: Notification) => {
    setSelectedNotifForDelivery(notif);
    const logs = await notificationService.getDeliveryLogs(notif.id);
    setDeliveries(logs);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(11, 13, 44, 0.5)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 420,
          background: '#ffffff',
          height: '100%',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-main)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={20} color="var(--mtp-navy-primary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--mtp-navy-primary)' }}>
              Notificações
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.75rem' }}
              onClick={handleMarkAllRead}
            >
              Marcar todas como lidas
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ padding: 4 }}
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 12px', color: 'var(--text-muted)' }}>
              <Bell size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <div style={{ fontWeight: 600 }}>Nenhuma notificação</div>
              <p style={{ fontSize: '0.8rem', marginTop: 4 }}>
                Você receberá avisos proativos sobre novas solicitações e atualizações aqui.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: notif.is_read ? '1px solid var(--border-light)' : '1px solid var(--mtp-blue-primary)',
                    background: notif.is_read ? '#ffffff' : 'var(--mtp-blue-light)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--mtp-navy-primary)' }}>
                      {notif.title}
                    </div>
                    {!notif.is_read && (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: 'var(--mtp-blue-primary)',
                          display: 'inline-block',
                          flexShrink: 0,
                          marginTop: 4,
                        }}
                      />
                    )}
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.4 }}>
                    {notif.message}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <span>{new Date(notif.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                        onClick={() => handleViewDelivery(notif)}
                        title="Ver status de entrega In-App e E-mail"
                      >
                        <Mail size={12} /> Status Envio
                      </button>

                      {!notif.is_read && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                          onClick={() => handleMarkAsRead(notif)}
                        >
                          <Check size={12} /> Lida
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delivery status inspection modal */}
        {selectedNotifForDelivery && (
          <div
            style={{
              padding: '16px',
              borderTop: '1px solid var(--border-light)',
              background: '#f8fafc',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--mtp-navy-primary)' }}>
                Rastreio de Canais de Envio (Spec 10.4)
              </span>
              <button
                className="btn btn-ghost btn-sm"
                style={{ padding: 2 }}
                onClick={() => setSelectedNotifForDelivery(null)}
              >
                <X size={14} />
              </button>
            </div>

            {deliveries.map((del) => (
              <div
                key={del.id}
                style={{
                  fontSize: '0.75rem',
                  padding: '6px 8px',
                  background: '#ffffff',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-light)',
                  marginBottom: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span>Canal: {del.channel === 'in_app' ? 'Notificação em Tela' : 'E-mail Corporativo'}</span>
                  <span
                    className={`badge ${
                      del.status === 'enviado' ? 'badge-resolved' : del.status === 'pendente' ? 'badge-waiting' : 'badge-canceled'
                    }`}
                    style={{ fontSize: '0.65rem' }}
                  >
                    {del.status}
                  </span>
                </div>
                {del.error_message && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: 4 }}>
                    {del.error_message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
