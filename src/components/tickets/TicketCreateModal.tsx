import React, { useState, useEffect } from 'react';
import {
  Department,
  ServiceCategory,
  ServiceType,
  FormDefinition,
  FormVersion,
  UserProfile,
  TicketPriority,
  Ticket,
} from '../../types/database';
import { catalogService } from '../../services/catalogService';
import { formService } from '../../services/formService';
import { ticketService } from '../../services/ticketService';
import { storageService } from '../../services/storageService';
import { Modal } from '../layout/Modal';
import { FormRenderer } from '../forms/FormRenderer';
import { ArrowLeft, CheckCircle2, Send, AlertTriangle, Layers, FileText } from 'lucide-react';

interface TicketCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onTicketCreated: (ticket: Ticket) => void;
}

export const TicketCreateModal: React.FC<TicketCreateModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onTicketCreated,
}) => {
  const [step, setStep] = useState<'select_service' | 'fill_form' | 'success'>('select_service');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);

  // Form state
  const [formVersion, setFormVersion] = useState<FormVersion | null>(null);
  const [formMeta, setFormMeta] = useState<FormDefinition | null>(null);
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('media');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDepartments();
      setStep('select_service');
      setSelectedDeptId('');
      setSelectedService(null);
      setFormVersion(null);
      setSubject('');
      setAnswers({});
      setErrors({});
      setCreatedTicket(null);
    }
  }, [isOpen]);

  const loadDepartments = async () => {
    const list = await catalogService.getDepartments(true);
    setDepartments(list);
    if (list.length > 0) {
      setSelectedDeptId(list[0].id);
      loadServicesForDept(list[0].id);
    }
  };

  const loadServicesForDept = async (deptId: string) => {
    const cats = await catalogService.getCategories(deptId);
    setCategories(cats);
    const services = await catalogService.getServiceTypes(deptId, true);
    setServiceTypes(services);
  };

  const handleSelectDepartment = (deptId: string) => {
    setSelectedDeptId(deptId);
    setSelectedService(null);
    loadServicesForDept(deptId);
  };

  const handleSelectService = async (service: ServiceType) => {
    setSelectedService(service);
    const formData = await formService.getFormWithVersion(service.form_id);
    if (formData) {
      setFormMeta(formData.form);
      setFormVersion(formData.version);
      setStep('fill_form');
    } else {
      alert('O formulário deste serviço não está disponível ou publicado.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !formVersion) return;

    if (!subject.trim()) {
      setErrors({ subject: 'O resumo/assunto é obrigatório' });
      return;
    }

    // Validate required fields in dynamic form
    const newErrors: Record<string, string> = {};
    for (const field of formVersion.fields_schema) {
      if (field.required && field.type !== 'info') {
        const val = answers[field.id];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          newErrors[field.id] = `O campo "${field.label}" é obrigatório.`;
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSubmitting(true);

      // Processar upload de anexos de campos do tipo 'file'. O upload DEVE ser confirmado antes de registrar.
      const structuredAnswers = await Promise.all(
        formVersion.fields_schema.map(async (f) => {
          const val = answers[f.id] ?? null;
          if (f.type === 'file' && val && val._file instanceof File) {
            // Executa upload real; se falhar, lançará erro interrompendo o envio e alertando o usuário
            const uploaded = await storageService.uploadAttachment(
              val._file,
              `temp_${Date.now()}`,
              currentUser
            );
            return {
              field_id: f.id,
              field_label: f.label,
              field_type: f.type,
              answer_value: uploaded,
            };
          }

          // Se for anexo sem _file (já processado ou nulo)
          const cleanVal = val && val._file ? { name: val.name, size: val.size, type: val.type } : val;
          return {
            field_id: f.id,
            field_label: f.label,
            field_type: f.type,
            answer_value: cleanVal,
          };
        })
      );

      const ticket = await ticketService.createTicket(
        {
          department_id: selectedService.department_id,
          service_type_id: selectedService.id,
          form_version_id: formVersion.id,
          subject,
          priority,
          answers: structuredAnswers,
        },
        currentUser
      );

      setCreatedTicket(ticket);
      setStep('success');
      onTicketCreated(ticket);
    } catch (err: any) {
      alert(`Erro ao criar chamado: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        step === 'select_service'
          ? 'Explorar Catálogo de Serviços'
          : step === 'fill_form'
          ? `Abertura de Chamado: ${selectedService?.name}`
          : 'Chamado Registrado'
      }
      subtitle={
        step === 'select_service'
          ? 'Selecione a área e o tipo de solicitação desejada'
          : step === 'fill_form'
          ? 'Preencha os campos abaixo com as informações da solicitação'
          : 'Seu chamado foi registrado e já está na fila de atendimento'
      }
      maxWidth="720px"
    >
      {/* Step 1: Select Service */}
      {step === 'select_service' && (
        <div>
          {departments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 12px' }}>
              <Layers size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
              <h4 style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Nenhum departamento publicado</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                A Central de Serviços inicia vazia (Spec 3.1). Um Administrador Supremo deve criar departamentos e serviços no painel.
              </p>
            </div>
          ) : (
            <div>
              {/* Department Selector */}
              <div style={{ marginBottom: 18 }}>
                <label className="label">Departamento / Caixa</label>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
                  {departments.map((dept) => (
                    <button
                      key={dept.id}
                      type="button"
                      className={`btn ${selectedDeptId === dept.id ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                      onClick={() => handleSelectDepartment(dept.id)}
                    >
                      {dept.name} ({dept.code})
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Types List */}
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--mtp-navy-primary)', marginBottom: 12 }}>
                  Serviços Disponíveis
                </h4>

                {serviceTypes.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Nenhum tipo de solicitação publicado para este departamento ainda.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {serviceTypes.map((service) => (
                      <div
                        key={service.id}
                        className="card card-interactive"
                        style={{ padding: '16px' }}
                        onClick={() => handleSelectService(service)}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 'var(--radius-md)',
                              background: 'var(--mtp-blue-light)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--mtp-navy-primary)',
                              flexShrink: 0,
                            }}
                          >
                            <FileText size={18} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--mtp-navy-primary)' }}>
                              {service.name}
                            </div>
                            {service.description && (
                              <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                                {service.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Fill Form */}
      {step === 'fill_form' && (
        <form onSubmit={handleSubmit}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setStep('select_service')}
            style={{ marginBottom: 14, paddingLeft: 0 }}
          >
            <ArrowLeft size={16} /> Voltar para o Catálogo
          </button>

          {/* Core Fields */}
          <div style={{ marginBottom: 16 }}>
            <label className="label label-required">Assunto / Resumo da Solicitação</label>
            <input
              type="text"
              className="input"
              placeholder="Ex: Liberação de acesso ao painel de relatórios"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setErrors({ ...errors, subject: '' });
              }}
              required
            />
            {errors.subject && (
              <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: 4 }}>{errors.subject}</p>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label className="label">Prioridade Sugerida</label>
            <select
              className="select"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
            >
              <option value="baixa">Baixa</option>
              <option value="media">Média (Padrão)</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>

          {/* Dynamic Versioned Form Fields */}
          {formVersion && (
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 18, marginBottom: 24 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--mtp-navy-primary)', marginBottom: 14 }}>
                Detalhes do Formulário ({formMeta?.title})
              </div>
              <FormRenderer
                fields={formVersion.fields_schema}
                values={answers}
                onChange={(fId, val) => {
                  setAnswers({ ...answers, [fId]: val });
                  setErrors({ ...errors, [fId]: '' });
                }}
                errors={errors}
                disabled={submitting}
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setStep('select_service')}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Send size={16} />
              {submitting ? 'Registrando chamado...' : 'Enviar Solicitação'}
            </button>
          </div>
        </form>
      )}

      {/* Step 3: Success Confirmation */}
      {step === 'success' && createdTicket && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <CheckCircle2 size={36} />
          </div>

          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--mtp-navy-primary)' }}>
            Solicitação Enviada com Sucesso!
          </h3>

          <div
            style={{
              background: 'var(--bg-main)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-light)',
              padding: '16px 24px',
              maxWidth: 380,
              margin: '20px auto',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Protocolo de Acompanhamento:</div>
            <div
              style={{
                fontSize: '1.6rem',
                fontWeight: 800,
                color: 'var(--mtp-navy-primary)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.05em',
                marginTop: 4,
              }}
            >
              {createdTicket.protocol}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 6 }}>
              Área responsável: <strong>{createdTicket.department?.name || 'Departamento'}</strong>
            </div>
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: 420, margin: '0 auto 24px' }}>
            A equipe de atendimento foi notificada e já pode analisar seu chamado. Você pode acompanhar o andamento em <strong>Minhas Solicitações</strong>.
          </p>

          <button className="btn btn-primary" onClick={onClose}>
            Concluir e Fechar
          </button>
        </div>
      )}
    </Modal>
  );
};
