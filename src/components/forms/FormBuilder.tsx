/**
 * FormBuilder — Reformulação do Construtor de Formulários estilo Microsoft Forms
 * Refinamento 04 — Central de Serviços MTP
 *
 * Características:
 * - Layout vertical limpo, unificado e centrado no formulário;
 * - Edição interativa de perguntas com foco e controles contextuais;
 * - Tipos suportados: Texto curto, Texto longo, Escolha única, Múltipla escolha,
 *   Lista suspensa, Data, Número, Anexo de arquivo;
 * - Opção de termos/declaração removida da criação de novas perguntas;
 * - Configuração detalhada para anexos (formatos aceitos, orientações, opcional por padrão);
 * - Pré-visualização funcional 100% compatível utilizando FormRenderer;
 * - Preservação total de dados e formulários legados.
 */

import React, { useState } from 'react';
import {
  FormField,
  FormFieldType,
  FormDefinition,
  FormVersion,
  UserProfile,
} from '../../types/database';
import { FormRenderer } from './FormRenderer';
import {
  Eye,
  Edit3,
  CheckCircle2,
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  FileText,
  AlignLeft,
  ListFilter,
  CheckSquare,
  Calendar,
  Hash,
  Paperclip,
  FolderKanban,
  Settings,
  HelpCircle,
  X,
  AlertCircle,
  Info,
} from 'lucide-react';

export interface FormBuilderProps {
  initialForm?: FormDefinition;
  initialVersion?: FormVersion;
  onSave: (
    formMeta: { title: string; description?: string; instructions?: string; publishImmediately: boolean },
    fields: FormField[]
  ) => Promise<void>;
  onCancel: () => void;
  currentUser: UserProfile;
  departmentName?: string;
  serviceName?: string;
}

interface QuestionTypeOption {
  type: FormFieldType;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
}

const QUESTION_TYPES: QuestionTypeOption[] = [
  {
    type: 'radio',
    label: 'Escolha Única',
    description: 'Opções exclusivas (botões de rádio)',
    icon: CheckCircle,
  },
  {
    type: 'text',
    label: 'Texto Curto',
    description: 'Resposta em uma única linha',
    icon: FileText,
  },
  {
    type: 'textarea',
    label: 'Texto Longo',
    description: 'Parágrafo ou descrição detalhada',
    icon: AlignLeft,
  },
  {
    type: 'multiselect',
    label: 'Múltipla Escolha',
    description: 'Permite selecionar várias caixas',
    icon: CheckSquare,
  },
  {
    type: 'select',
    label: 'Lista Suspensa',
    description: 'Menu suspenso com uma opção selecionável',
    icon: ListFilter,
  },
  {
    type: 'date',
    label: 'Data',
    description: 'Seleção de data no calendário',
    icon: Calendar,
  },
  {
    type: 'number',
    label: 'Número',
    description: 'Valor numérico inteiro ou decimal',
    icon: Hash,
  },
  {
    type: 'file',
    label: 'Anexo de Arquivo',
    description: 'Upload de documento ou comprovante',
    icon: Paperclip,
  },
];

export const FormBuilder: React.FC<FormBuilderProps> = ({
  initialForm,
  initialVersion,
  onSave,
  onCancel,
  currentUser,
  departmentName,
  serviceName,
}) => {
  const [title, setTitle] = useState(initialForm?.title || '');
  const [description, setDescription] = useState(initialForm?.description || '');
  const [instructions, setInstructions] = useState(initialForm?.instructions || '');
  const [fields, setFields] = useState<FormField[]>(() => {
    if (initialVersion?.fields_schema && initialVersion.fields_schema.length > 0) {
      return [...initialVersion.fields_schema].sort((a, b) => a.order - b.order);
    }
    return [];
  });

  const [activeFieldId, setActiveFieldId] = useState<string | null>(
    fields.length > 0 ? fields[0].id : null
  );
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // ───────────────────────────────────────────────────────────────────────────
  // Field Operations
  // ───────────────────────────────────────────────────────────────────────────

  const handleAddField = (type: FormFieldType) => {
    setShowTypeMenu(false);
    setValidationError(null);

    const defaultLabelMap: Partial<Record<FormFieldType, string>> = {
      radio: 'Pergunta de escolha única',
      multiselect: 'Pergunta de múltipla escolha',
      text: 'Pergunta de texto curto',
      textarea: 'Descrição detalhada',
      select: 'Selecione uma opção',
      date: 'Data da solicitação',
      number: 'Quantidade ou valor',
      file: 'Comprovante ou anexo',
    };

    const newField: FormField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      label: defaultLabelMap[type] || 'Nova Pergunta',
      type,
      // Anexos de arquivo NÃO são obrigatórios por padrão (requisito explícito)
      required: type === 'file' ? false : type !== 'info',
      placeholder: '',
      helpText: type === 'file' ? 'Caso possua aprovação ou documento prévio, anexe aqui.' : '',
      order: fields.length,
      options: ['select', 'multiselect', 'radio'].includes(type)
        ? ['Opção 1', 'Opção 2']
        : undefined,
      validation: type === 'file'
        ? { fileTypes: ['.pdf', '.png', '.jpg', '.jpeg', '.docx'] }
        : undefined,
    };

    const updated = [...fields, newField];
    setFields(updated);
    setActiveFieldId(newField.id);
  };

  const handleDuplicateField = (fieldToDuplicate: FormField, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const index = fields.findIndex((f) => f.id === fieldToDuplicate.id);
    const newField: FormField = {
      ...fieldToDuplicate,
      id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      label: `${fieldToDuplicate.label} (Cópia)`,
      order: index + 1,
      options: fieldToDuplicate.options ? [...fieldToDuplicate.options] : undefined,
      validation: fieldToDuplicate.validation ? { ...fieldToDuplicate.validation } : undefined,
    };

    const updated = [...fields];
    updated.splice(index + 1, 0, newField);
    const reordered = updated.map((f, i) => ({ ...f, order: i }));
    setFields(reordered);
    setActiveFieldId(newField.id);
  };

  const handleRemoveField = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const confirmed = window.confirm('Deseja excluir esta pergunta?');
    if (!confirmed) return;

    const remaining = fields.filter((f) => f.id !== id).map((f, idx) => ({ ...f, order: idx }));
    setFields(remaining);

    if (activeFieldId === id) {
      setActiveFieldId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleMoveField = (index: number, direction: 'up' | 'down', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;

    const updated = [...fields];
    const item = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = item;

    const reordered = updated.map((f, i) => ({ ...f, order: i }));
    setFields(reordered);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  // Option management for selection fields
  const handleAddOption = (fieldId: string) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    const currentOptions = field.options || [];
    const nextNumber = currentOptions.length + 1;
    updateField(fieldId, {
      options: [...currentOptions, `Opção ${nextNumber}`],
    });
  };

  const handleUpdateOption = (fieldId: string, optIndex: number, newValue: string) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field || !field.options) return;
    const next = [...field.options];
    next[optIndex] = newValue;
    updateField(fieldId, { options: next });
  };

  const handleRemoveOption = (fieldId: string, optIndex: number) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field || !field.options) return;
    if (field.options.length <= 1) {
      alert('A pergunta deve conter pelo menos uma opção.');
      return;
    }
    const next = field.options.filter((_, idx) => idx !== optIndex);
    updateField(fieldId, { options: next });
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Validation and Save
  // ───────────────────────────────────────────────────────────────────────────

  const validateForm = (): boolean => {
    setValidationError(null);
    if (!title.trim()) {
      setValidationError('O título do formulário é obrigatório.');
      return false;
    }
    if (fields.length === 0) {
      setValidationError('Adicione pelo menos uma pergunta ao formulário antes de salvar.');
      return false;
    }
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      if (!f.label.trim()) {
        setValidationError(`A pergunta ${i + 1} está sem título. Preencha o enunciado.`);
        setActiveFieldId(f.id);
        return false;
      }
      if (['select', 'multiselect', 'radio'].includes(f.type)) {
        if (!f.options || f.options.length === 0 || f.options.every((opt) => !opt.trim())) {
          setValidationError(`A pergunta ${i + 1} ("${f.label}") deve ter pelo menos uma opção válida.`);
          setActiveFieldId(f.id);
          return false;
        }
      }
    }
    return true;
  };

  const handleSave = async (publishImmediately: boolean) => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      await onSave(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          instructions: instructions.trim() || undefined,
          publishImmediately,
        },
        fields
      );
    } catch (err: any) {
      alert(`Erro ao salvar formulário: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // RENDER: Preview Mode
  // ───────────────────────────────────────────────────────────────────────────
  if (isPreviewMode) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 60 }}>
        {/* Preview Top Banner */}
        <div
          style={{
            background: 'var(--mtp-navy-primary)',
            color: '#ffffff',
            padding: '14px 20px',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Eye size={20} color="var(--mtp-blue-light)" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                Modo de Pré-visualização
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>
                Esta é a visualização exata que o colaborador terá. Respostas preenchidas aqui não registrarão chamados reais.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setIsPreviewMode(false)}
            style={{ background: '#ffffff', color: 'var(--mtp-navy-primary)', fontWeight: 600 }}
          >
            <Edit3 size={15} /> Voltar à Edição
          </button>
        </div>

        {/* Rendered Form Preview Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-light)',
            padding: '36px 40px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Header */}
          <div style={{ borderBottom: '2px solid var(--mtp-blue-light)', paddingBottom: 20, marginBottom: 28 }}>
            {(departmentName || serviceName) && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {departmentName && (
                  <span className="badge badge-open" style={{ fontSize: '0.72rem' }}>
                    <FolderKanban size={12} style={{ marginRight: 4 }} />
                    {departmentName}
                  </span>
                )}
                {serviceName && (
                  <span className="badge" style={{ background: 'var(--mtp-blue-light)', color: 'var(--mtp-navy-primary)', fontSize: '0.72rem' }}>
                    <Settings size={12} style={{ marginRight: 4 }} />
                    {serviceName}
                  </span>
                )}
              </div>
            )}
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--mtp-navy-primary)', marginBottom: 8 }}>
              {title || 'Título do Formulário'}
            </h1>
            {description && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: 8 }}>
                {description}
              </p>
            )}
            {instructions && (
              <div
                style={{
                  background: 'var(--bg-main)',
                  borderLeft: '4px solid var(--mtp-blue-primary)',
                  padding: '10px 14px',
                  borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  marginTop: 12,
                }}
              >
                <strong>Orientações: </strong>
                {instructions}
              </div>
            )}
          </div>

          {/* Body */}
          {fields.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              Nenhum campo configurado neste formulário ainda.
            </div>
          ) : (
            <FormRenderer
              fields={fields}
              values={previewValues}
              onChange={(fieldId, val) => setPreviewValues((prev) => ({ ...prev, [fieldId]: val }))}
            />
          )}

          {/* Simulated Submit button */}
          <div style={{ marginTop: 36, paddingTop: 20, borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setPreviewValues({})}
            >
              Limpar Respostas de Teste
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => alert('Simulação concluída! No formulário publicado, esta ação abre o chamado oficial.')}
            >
              Enviar Solicitação (Simulado)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // RENDER: Editor Mode (Microsoft Forms style)
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 840, margin: '0 auto', paddingBottom: 60 }}>
      {/* ── TOP CONTROLS & BREADCRUMB BAR ── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
          padding: '16px 22px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onCancel}
            title="Voltar"
            style={{ padding: '6px 10px' }}
          >
            <ArrowLeft size={16} /> Voltar
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--mtp-navy-primary)' }}>
                Construtor de Formulários
              </span>
              <span
                className={`badge ${initialForm?.status === 'published' ? 'badge-resolved' : 'badge-waiting'}`}
                style={{ fontSize: '0.65rem' }}
              >
                {initialForm?.status === 'published' ? 'Publicado' : 'Rascunho'}
              </span>
              {initialForm?.current_version && (
                <span
                  className="badge"
                  style={{
                    fontSize: '0.65rem',
                    background: 'var(--mtp-blue-light)',
                    color: 'var(--mtp-navy-primary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  v{initialForm.current_version}
                </span>
              )}
            </div>

            {(departmentName || serviceName) && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {departmentName && <span>Departamento: <strong>{departmentName}</strong></span>}
                {departmentName && serviceName && <span> • </span>}
                {serviceName && <span>Serviço: <strong>{serviceName}</strong></span>}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setIsPreviewMode(true)}
            title="Ver como o colaborador preencherá o formulário"
          >
            <Eye size={15} /> Pré-visualizar
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            <Save size={15} /> Salvar Rascunho
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            <CheckCircle2 size={16} /> Publicar Formulário
          </button>
        </div>
      </div>

      {/* ── VALIDATION ALERT ── */}
      {validationError && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            marginBottom: 16,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{validationError}</span>
        </div>
      )}

      {/* ── FORM HEADER CARD ── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
          borderTop: '5px solid var(--mtp-navy-primary)',
          padding: '28px 32px',
          marginBottom: 20,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <label className="label label-required" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Título do Formulário
          </label>
          <input
            type="text"
            className="input"
            style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: 'var(--mtp-navy-primary)',
              padding: '8px 12px',
              border: '1px solid var(--border-light)',
            }}
            placeholder="Ex: Solicitação de Acesso aos Sistemas"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="label" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Descrição breve (opcional)
          </label>
          <input
            type="text"
            className="input"
            style={{ fontSize: '0.9rem' }}
            placeholder="Ex: Utilize este formulário para solicitar permissões de rede, VPN ou pastas compartilhadas."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="label" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Instruções ou orientações ao solicitante (opcional)
          </label>
          <textarea
            className="textarea"
            style={{ minHeight: 65, fontSize: '0.85rem' }}
            placeholder="Ex: O prazo padrão para atendimento é de 24 horas úteis. Anexe a aprovação do gestor se houver."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>
      </div>

      {/* ── QUESTIONS LIST (VERTICAL CARDS) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {fields.map((field, index) => {
          const isActive = activeFieldId === field.id;
          const currentTypeMeta = QUESTION_TYPES.find((t) => t.type === field.type);
          const TypeIcon = currentTypeMeta?.icon || FileText;

          return (
            <div
              key={field.id}
              onClick={() => setActiveFieldId(field.id)}
              style={{
                background: '#ffffff',
                borderRadius: 'var(--radius-lg)',
                border: isActive
                  ? '2px solid var(--mtp-blue-primary)'
                  : '1px solid var(--border-light)',
                borderLeft: isActive ? '6px solid var(--mtp-navy-primary)' : '1px solid var(--border-light)',
                padding: '20px 24px',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                cursor: isActive ? 'default' : 'pointer',
              }}
            >
              {/* ── ACTIVE CARD CONTROLS HEADER ── */}
              {isActive ? (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 16,
                      paddingBottom: 12,
                      borderBottom: '1px solid var(--border-light)',
                    }}
                  >
                    {/* Left: Question index + Type selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 800,
                          fontSize: '1rem',
                          color: 'var(--mtp-navy-primary)',
                          background: 'var(--bg-main)',
                          padding: '3px 9px',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        {index + 1}
                      </span>

                      {/* Question type selector */}
                      <select
                        className="select"
                        style={{
                          fontSize: '0.8rem',
                          padding: '5px 10px',
                          height: 'auto',
                          fontWeight: 600,
                          color: 'var(--mtp-navy-primary)',
                        }}
                        value={field.type}
                        onChange={(e) => {
                          const newType = e.target.value as FormFieldType;
                          const updates: Partial<FormField> = { type: newType };
                          if (['select', 'multiselect', 'radio'].includes(newType) && !field.options) {
                            updates.options = ['Opção 1', 'Opção 2'];
                          }
                          if (newType === 'file') {
                            updates.required = false; // Anexos não obrigatórios por padrão
                            updates.validation = { fileTypes: ['.pdf', '.png', '.jpg', '.jpeg', '.docx'] };
                          }
                          updateField(field.id, updates);
                        }}
                      >
                        {QUESTION_TYPES.map((qt) => (
                          <option key={qt.type} value={qt.type}>
                            {qt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Right: Reorder, Duplicate & Delete buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={index === 0}
                        onClick={(e) => handleMoveField(index, 'up', e)}
                        title="Mover para cima"
                        style={{ padding: 6 }}
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={index === fields.length - 1}
                        onClick={(e) => handleMoveField(index, 'down', e)}
                        title="Mover para baixo"
                        style={{ padding: 6 }}
                      >
                        <ChevronDown size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => handleDuplicateField(field, e)}
                        title="Duplicar pergunta"
                        style={{ padding: 6 }}
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#dc2626', padding: 6 }}
                        onClick={(e) => handleRemoveField(field.id, e)}
                        title="Excluir pergunta"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* ── QUESTION TITLE INPUT ── */}
                  <div style={{ marginBottom: 14 }}>
                    <label className="label label-required" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Enunciado da Pergunta
                    </label>
                    <input
                      type="text"
                      className="input"
                      style={{ fontSize: '0.98rem', fontWeight: 600 }}
                      placeholder="Ex: Qual o tipo de acesso desejado?"
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                    />
                  </div>

                  {/* ── SUBTITLE / HELP TEXT ── */}
                  <div style={{ marginBottom: 16 }}>
                    <label className="label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Orientação ou subtítulo para o solicitante (opcional)
                    </label>
                    <input
                      type="text"
                      className="input"
                      style={{ fontSize: '0.85rem' }}
                      placeholder="Ex: Especifique se necessita de perfil de leitura ou gravação."
                      value={field.helpText || ''}
                      onChange={(e) => updateField(field.id, { helpText: e.target.value })}
                    />
                  </div>

                  {/* ── TYPE-SPECIFIC EDITOR ── */}
                  {/* Options editor (radio, multiselect, select) */}
                  {['radio', 'multiselect', 'select'].includes(field.type) && (
                    <div style={{ background: '#f8fafc', padding: 14, borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--mtp-navy-primary)', marginBottom: 10 }}>
                        Alternativas de Resposta:
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(field.options || []).map((opt, optIdx) => (
                          <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: 'var(--text-muted)' }}>
                              {field.type === 'multiselect' ? (
                                <CheckSquare size={16} />
                              ) : (
                                <div
                                  style={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: '50%',
                                    border: '2px solid var(--text-muted)',
                                  }}
                                />
                              )}
                            </span>
                            <input
                              type="text"
                              className="input"
                              style={{ flex: 1, height: 34, fontSize: '0.85rem' }}
                              value={opt}
                              placeholder={`Opção ${optIdx + 1}`}
                              onChange={(e) => handleUpdateOption(field.id, optIdx, e.target.value)}
                            />
                            {(field.options?.length || 0) > 1 && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                style={{ color: 'var(--text-muted)', padding: 4 }}
                                onClick={() => handleRemoveOption(field.id, optIdx)}
                                title="Remover opção"
                              >
                                <X size={15} />
                              </button>
                            )}
                          </div>
                        ))}

                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{
                            alignSelf: 'flex-start',
                            color: 'var(--mtp-blue-primary)',
                            fontWeight: 600,
                            marginTop: 4,
                            paddingLeft: 0,
                          }}
                          onClick={() => handleAddOption(field.id)}
                        >
                          <Plus size={14} /> Adicionar Opção
                        </button>
                      </div>
                    </div>
                  )}

                  {/* File Upload config */}
                  {field.type === 'file' && (
                    <div style={{ background: '#f8fafc', padding: 14, borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Paperclip size={16} color="var(--mtp-blue-primary)" />
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--mtp-navy-primary)' }}>
                          Configuração do Anexo de Arquivo
                        </span>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
                        Por padrão, o envio de anexos é <strong>opcional</strong> para os solicitantes.
                      </div>

                      <div>
                        <label className="label" style={{ fontSize: '0.75rem' }}>
                          Formatos de arquivo aceitos (separados por vírgula)
                        </label>
                        <input
                          type="text"
                          className="input"
                          style={{ fontSize: '0.85rem' }}
                          placeholder=".pdf, .png, .jpg, .jpeg, .docx, .xlsx"
                          value={(field.validation?.fileTypes || []).join(', ')}
                          onChange={(e) => {
                            const types = e.target.value
                              .split(',')
                              .map((t) => t.trim())
                              .filter((t) => t.length > 0);
                            updateField(field.id, {
                              validation: {
                                ...field.validation,
                                fileTypes: types,
                              },
                            });
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Text placeholder config */}
                  {['text', 'textarea', 'number'].includes(field.type) && (
                    <div style={{ marginBottom: 14 }}>
                      <label className="label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Texto de exemplo / placeholder (opcional)
                      </label>
                      <input
                        type="text"
                        className="input"
                        style={{ fontSize: '0.85rem' }}
                        placeholder="Ex: Digite aqui..."
                        value={field.placeholder || ''}
                        onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                      />
                    </div>
                  )}

                  {/* ── CARD FOOTER / TOGGLES ── */}
                  <div
                    style={{
                      borderTop: '1px solid var(--border-light)',
                      paddingTop: 12,
                      marginTop: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'var(--mtp-navy-primary)',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(field.id, { required: e.target.checked })}
                        style={{ accentColor: 'var(--mtp-navy-primary)', width: 16, height: 16 }}
                      />
                      Resposta Obrigatória
                    </label>

                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveFieldId(null);
                      }}
                    >
                      Concluir Edição da Pergunta
                    </button>
                  </div>
                </div>
              ) : (
                /* ── INACTIVE CARD (CLEAN FORMS PREVIEW) ── */
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          color: 'var(--text-secondary)',
                          background: 'var(--bg-main)',
                          padding: '2px 7px',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        {index + 1}
                      </span>

                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--mtp-navy-primary)' }}>
                          {field.label || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Pergunta sem título</span>}
                          {field.required && <span style={{ color: '#dc2626', marginLeft: 4 }}>*</span>}
                        </div>
                        {field.helpText && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {field.helpText}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        className="badge"
                        style={{
                          fontSize: '0.68rem',
                          background: 'var(--bg-main)',
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <TypeIcon size={12} />
                        {currentTypeMeta?.label || field.type}
                      </span>
                    </div>
                  </div>

                  {/* Clean preview of field options if any */}
                  {['radio', 'multiselect', 'select'].includes(field.type) && field.options && (
                    <div style={{ marginTop: 10, paddingLeft: 32, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {field.options.slice(0, 3).map((opt, i) => (
                        <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: 'var(--border-dark)', fontSize: '0.65rem' }}>●</span> {opt}
                        </div>
                      ))}
                      {field.options.length > 3 && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          + {field.options.length - 3} outra(s) opção(ões)...
                        </div>
                      )}
                    </div>
                  )}

                  {field.type === 'file' && (
                    <div style={{ marginTop: 8, paddingLeft: 32, fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Paperclip size={12} />
                      Anexo ({field.required ? 'obrigatório' : 'opcional'})
                      {field.validation?.fileTypes && ` — ${field.validation.fileTypes.join(', ')}`}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── ADD QUESTION CONTROLLER (MICROSOFT FORMS STYLE) ── */}
      <div style={{ marginTop: 20 }}>
        {!showTypeMenu ? (
          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowTypeMenu(true)}
              style={{
                padding: '10px 24px',
                background: '#ffffff',
                border: '2px dashed var(--border-light)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--mtp-navy-primary)',
                fontWeight: 700,
                fontSize: '0.9rem',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <Plus size={18} color="var(--mtp-blue-primary)" /> Adicionar Pergunta
            </button>
          </div>
        ) : (
          <div
            style={{
              background: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              border: '2px solid var(--mtp-blue-primary)',
              padding: '20px',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--mtp-navy-primary)' }}>
                Selecione o tipo de resposta desejada:
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowTypeMenu(false)}
                style={{ padding: 4 }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 10,
              }}
            >
              {QUESTION_TYPES.map((qt) => {
                const Icon = qt.icon;
                return (
                  <button
                    key={qt.type}
                    type="button"
                    onClick={() => handleAddField(qt.type)}
                    style={{
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 4,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--mtp-blue-primary)';
                      e.currentTarget.style.background = 'var(--mtp-blue-light)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-light)';
                      e.currentTarget.style.background = 'var(--bg-main)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--mtp-navy-primary)', fontWeight: 700, fontSize: '0.85rem' }}>
                      <Icon size={16} color="var(--mtp-blue-primary)" />
                      {qt.label}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                      {qt.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── FOOTER SAVE BAR ── */}
      <div
        style={{
          marginTop: 36,
          paddingTop: 18,
          borderTop: '1px solid var(--border-light)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {fields.length} {fields.length === 1 ? 'pergunta configurada' : 'perguntas configuradas'}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            <Save size={15} /> Salvar Rascunho
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            <CheckCircle2 size={16} /> Publicar Formulário
          </button>
        </div>
      </div>
    </div>
  );
};
