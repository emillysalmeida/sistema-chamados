import React, { useState } from 'react';
import { FormField, FormFieldType, FormDefinition, FormVersion, UserProfile } from '../../types/database';
import { FormRenderer } from './FormRenderer';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  CheckCircle2,
  Copy,
  FileText,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface FormBuilderProps {
  initialForm?: FormDefinition;
  initialVersion?: FormVersion;
  onSave: (
    formMeta: { title: string; description?: string; instructions?: string; publishImmediately: boolean },
    fields: FormField[]
  ) => Promise<void>;
  onCancel: () => void;
  currentUser: UserProfile;
}

export const FormBuilder: React.FC<FormBuilderProps> = ({
  initialForm,
  initialVersion,
  onSave,
  onCancel,
  currentUser,
}) => {
  const [title, setTitle] = useState(initialForm?.title || '');
  const [description, setDescription] = useState(initialForm?.description || '');
  const [instructions, setInstructions] = useState(initialForm?.instructions || '');
  const [fields, setFields] = useState<FormField[]>(initialVersion?.fields_schema || []);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  // Field editing modal state
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  const addField = (type: FormFieldType) => {
    const newField: FormField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: type === 'info' ? 'Texto Informativo' : type === 'terms' ? 'Declaração e Termos' : `Novo Campo (${type})`,
      type,
      required: type !== 'info',
      placeholder: '',
      helpText: '',
      order: fields.length,
      options: ['select', 'multiselect', 'radio'].includes(type) ? ['Opção 1', 'Opção 2'] : undefined,
      infoContent: type === 'terms' ? 'Declaro que li e concordo com os termos.' : type === 'info' ? 'Instruções para o solicitante.' : undefined,
    };
    setFields([...fields, newField]);
    setEditingFieldId(newField.id);
  };

  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
    if (editingFieldId === id) setEditingFieldId(null);
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;
    const reordered = [...fields];
    const temp = reordered[index];
    reordered[index] = reordered[newIndex];
    reordered[newIndex] = temp;
    // update order numbers
    setFields(reordered.map((f, i) => ({ ...f, order: i })));
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const handleSave = async (publishImmediately: boolean) => {
    if (!title.trim()) {
      alert('Por favor informe o título do formulário.');
      return;
    }
    if (fields.length === 0) {
      alert('Adicione pelo menos um campo ao formulário.');
      return;
    }

    try {
      setSaving(true);
      await onSave({ title, description, instructions, publishImmediately }, fields);
    } catch (err: any) {
      alert(`Erro ao salvar formulário: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: '#ffffff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
      {/* Builder Header */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-main)',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--mtp-navy-primary)' }}>
            {initialForm ? `Editando: ${initialForm.title}` : 'Novo Construtor de Formulário'}
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {initialForm ? `Versão atual: v${initialForm.current_version} • Formato com versionamento automático (Spec 7.5)` : 'Crie campos dinâmicos sem alterar código'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            <Eye size={16} />
            {isPreviewMode ? 'Voltar à Edição' : 'Pré-visualizar como Solicitante'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            Salvar Rascunho
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            <CheckCircle2 size={16} />
            Publicar Formulário
          </button>
        </div>
      </div>

      {isPreviewMode ? (
        /* Preview Mode */
        <div style={{ padding: '32px', maxWidth: 640, margin: '0 auto' }}>
          <div style={{ marginBottom: 24, borderBottom: '1px solid var(--border-light)', paddingBottom: 16 }}>
            <span className="badge badge-open" style={{ marginBottom: 8 }}>Modo Pré-visualização</span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--mtp-navy-primary)' }}>{title || 'Título do Formulário'}</h1>
            {description && <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{description}</p>}
            {instructions && (
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginTop: 12, fontSize: '0.85rem' }}>
                {instructions}
              </div>
            )}
          </div>

          <FormRenderer
            fields={fields}
            values={previewValues}
            onChange={(fieldId, val) => setPreviewValues({ ...previewValues, [fieldId]: val })}
          />

          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setIsPreviewMode(false)}>
              Fechar Pré-visualização
            </button>
          </div>
        </div>
      ) : (
        /* Edit Mode */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', minHeight: 600 }}>
          {/* Main Area: Fields list */}
          <div style={{ padding: '24px', borderRight: '1px solid var(--border-light)' }}>
            {/* Form Meta */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
              <div>
                <label className="label label-required">Título do Formulário</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: Solicitação de Acesso ao Sistema"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Descrição breve</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: Utilizado para solicitar permissões em aplicações internas."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Instruções para o solicitante</label>
                <textarea
                  className="textarea"
                  style={{ minHeight: 60 }}
                  placeholder="Ex: Preencha todos os dados. Anexe a aprovação do gestor se houver."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
              </div>
            </div>

            {/* Fields List */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--mtp-navy-primary)' }}>
                Campos do Formulário ({fields.length})
              </h3>
            </div>

            {fields.length === 0 ? (
              <div
                style={{
                  border: '2px dashed var(--border-light)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 36,
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                <FileText size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                <div style={{ fontWeight: 600 }}>Nenhum campo adicionado</div>
                <p style={{ fontSize: '0.85rem' }}>
                  Escolha um tipo de campo na coluna lateral à direita para adicionar a este formulário.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {fields.map((field, idx) => (
                  <div
                    key={field.id}
                    style={{
                      border: editingFieldId === field.id ? '2px solid var(--mtp-blue-primary)' : '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 16px',
                      background: editingFieldId === field.id ? 'var(--mtp-blue-light)' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => setEditingFieldId(field.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: 'var(--bg-main)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {field.label} {field.required && <span style={{ color: '#dc2626' }}>*</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Tipo: <strong>{field.type}</strong> {field.helpText && `• ${field.helpText}`}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={idx === 0}
                        onClick={() => moveField(idx, 'up')}
                        title="Mover para cima"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={idx === fields.length - 1}
                        onClick={() => moveField(idx, 'down')}
                        title="Mover para baixo"
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#dc2626' }}
                        onClick={() => removeField(field.id)}
                        title="Excluir campo"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Toolbox & Properties */}
          <div style={{ padding: '24px', background: '#fafbfc' }}>
            {/* If a field is selected, show its properties */}
            {editingFieldId ? (
              (() => {
                const f = fields.find((item) => item.id === editingFieldId);
                if (!f) return null;

                return (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--mtp-navy-primary)' }}>
                        Propriedades do Campo
                      </h4>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setEditingFieldId(null)}
                        style={{ fontSize: '0.75rem' }}
                      >
                        Concluído
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label className="label">Rótulo (Pergunta)</label>
                        <input
                          type="text"
                          className="input"
                          value={f.label}
                          onChange={(e) => updateField(f.id, { label: e.target.value })}
                        />
                      </div>

                      {['text', 'textarea', 'number', 'email'].includes(f.type) && (
                        <div>
                          <label className="label">Placeholder / Texto de apoio</label>
                          <input
                            type="text"
                            className="input"
                            value={f.placeholder || ''}
                            onChange={(e) => updateField(f.id, { placeholder: e.target.value })}
                          />
                        </div>
                      )}

                      {['info', 'terms'].includes(f.type) && (
                        <div>
                          <label className="label">Texto explicativo / Termos</label>
                          <textarea
                            className="textarea"
                            value={f.infoContent || ''}
                            onChange={(e) => updateField(f.id, { infoContent: e.target.value })}
                          />
                        </div>
                      )}

                      {['select', 'multiselect', 'radio'].includes(f.type) && (
                        <div>
                          <label className="label">Opções (uma por linha)</label>
                          <textarea
                            className="textarea"
                            rows={4}
                            value={(f.options || []).join('\n')}
                            onChange={(e) =>
                              updateField(f.id, {
                                options: e.target.value.split('\n').filter((opt) => opt.trim().length > 0),
                              })
                            }
                          />
                        </div>
                      )}

                      <div>
                        <label className="label">Mensagem de Ajuda (Opcional)</label>
                        <input
                          type="text"
                          className="input"
                          value={f.helpText || ''}
                          onChange={(e) => updateField(f.id, { helpText: e.target.value })}
                        />
                      </div>

                      {f.type !== 'info' && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer', marginTop: 4 }}>
                          <input
                            type="checkbox"
                            checked={f.required}
                            onChange={(e) => updateField(f.id, { required: e.target.checked })}
                            style={{ accentColor: 'var(--mtp-navy-primary)' }}
                          />
                          Campo obrigatório
                        </label>
                      )}
                    </div>
                  </div>
                );
              })()
            ) : (
              /* Add new field toolbox */
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--mtp-navy-primary)', marginBottom: 6 }}>
                  Adicionar Campo
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                  Tipos suportados da especificação (Spec 7.2)
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { type: 'text' as FormFieldType, label: 'Texto Curto' },
                    { type: 'textarea' as FormFieldType, label: 'Texto Longo / Descrição' },
                    { type: 'number' as FormFieldType, label: 'Número' },
                    { type: 'email' as FormFieldType, label: 'E-mail com Validação' },
                    { type: 'date' as FormFieldType, label: 'Data' },
                    { type: 'select' as FormFieldType, label: 'Seleção Única (Lista)' },
                    { type: 'multiselect' as FormFieldType, label: 'Múltipla Seleção' },
                    { type: 'radio' as FormFieldType, label: 'Opções (Radio)' },
                    { type: 'checkbox' as FormFieldType, label: 'Caixa de Seleção' },
                    { type: 'boolean' as FormFieldType, label: 'Sim / Não' },
                    { type: 'file' as FormFieldType, label: 'Anexo de Arquivo' },
                    { type: 'info' as FormFieldType, label: 'Texto Informativo' },
                    { type: 'terms' as FormFieldType, label: 'Aceite de Termos' },
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ justifyContent: 'flex-start', textAlign: 'left', background: '#ffffff' }}
                      onClick={() => addField(item.type)}
                    >
                      <Plus size={14} color="var(--mtp-blue-primary)" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
