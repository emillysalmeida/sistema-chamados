export type UserRole = 'solicitante' | 'atendente' | 'super_admin';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  icon: string;
  is_active: boolean;
  is_published: boolean;
  display_order: number;
  requires_approval?: boolean;
  created_at?: string;
  updated_at?: string;
  member_count?: number;
  ticket_count?: number;
}

export interface DepartmentMember {
  id: string;
  department_id: string;
  user_id: string;
  can_respond: boolean;
  created_at?: string;
  user?: UserProfile;
  department?: Department;
}

export interface ServiceCategory {
  id: string;
  department_id: string;
  name: string;
  description?: string;
  order_index: number;
  is_active: boolean;
  created_at?: string;
  services_count?: number;
}

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'boolean'
  | 'file'
  | 'info'
  | 'terms';

export interface FormFieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  fileTypes?: string[];
  maxFileSizeMb?: number;
}

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[]; // for select, multiselect, radio
  validation?: FormFieldValidation;
  order: number;
  infoContent?: string; // for informative text or terms text
}

export type FormStatus = 'draft' | 'published' | 'archived';

export interface FormDefinition {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  status: FormStatus;
  current_version: number;
  created_at?: string;
  updated_at?: string;
}

export interface FormVersion {
  id: string;
  form_id: string;
  version_number: number;
  fields_schema: FormField[];
  published_at?: string;
  published_by?: string;
}

export interface ServiceType {
  id: string;
  department_id: string;
  category_id?: string;
  name: string;
  description?: string;
  instructions?: string;
  icon: string;
  order_index: number;
  is_active: boolean;
  is_published: boolean;
  form_id: string;
  created_at?: string;
  updated_at?: string;
  form?: FormDefinition;
  category?: ServiceCategory;
}

export type TicketPriority = 'baixa' | 'media' | 'alta' | 'urgente';

export type TicketStatus =
  | 'aguardando_aprovacao'
  | 'aberto'
  | 'em_andamento'
  | 'aguardando_solicitante'
  | 'resolvido'
  | 'fechado'
  | 'cancelado';

export interface Ticket {
  id: string;
  protocol: string;
  department_id: string;
  service_type_id: string;
  form_version_id: string;
  requester_id: string;
  requester_name: string;
  requester_email: string;
  subject: string;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
  approved_at?: string;
  approved_by?: string;
  // Joins
  department?: Department;
  service_type?: ServiceType;
  assignee?: UserProfile;
  approver?: UserProfile;
}

export interface TicketAnswer {
  id: string;
  ticket_id: string;
  field_id: string;
  field_label: string;
  field_type: string;
  answer_value: any;
  created_at?: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  author_id: string;
  author_name: string;
  author_email: string;
  is_internal: boolean;
  content: string;
  created_at: string;
  attachments?: TicketAttachment[];
}

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  message_id?: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  is_internal: boolean;
  created_at?: string;
}

export interface TicketEvent {
  id: string;
  ticket_id: string;
  actor_id?: string;
  actor_name: string;
  action_type: string;
  old_value?: string;
  new_value?: string;
  description: string;
  is_internal: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  ticket_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

export interface NotificationDelivery {
  id: string;
  notification_id: string;
  channel: 'in_app' | 'email';
  status: 'pendente' | 'enviado' | 'falhou';
  error_message?: string;
  sent_at?: string;
}

export interface AuditLog {
  id: string;
  actor_id?: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface UserPreference {
  id: string;
  user_id: string;
  email_notifications: boolean;
  in_app_notifications: boolean;
  created_at?: string;
  updated_at?: string;
}

// ── Equipes de Atendimento ────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  description?: string;
  team_email?: string;
  department_id: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  // Joins
  department?: Department;
  member_count?: number;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  created_at?: string;
  // Joins
  user?: UserProfile;
  team?: Team;
}
