import React, { useState, useEffect } from 'react';
import { FormDefinition, FormVersion, UserProfile, FormField } from '../../types/database';
import { formService } from '../../services/formService';
import { FormBuilder } from '../forms/FormBuilder';
import { EmptyState } from '../layout/EmptyState';
import { FileText, Plus, Copy, Archive, Edit3, Eye, CheckCircle2 } from 'lucide-react';

interface FormsManagerViewProps {
  currentUser: UserProfile;
}

export const FormsManagerView: React.FC<FormsManagerViewProps> = ({ currentUser }) => {
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  // Builder mode state
  const [isBuilding, setIsBuilding] = useState(false);
  const [selectedFormToEdit, setSelectedFormToEdit] = useState<FormDefinition | undefined>();
  const [selectedVersionToEdit, setSelectedVersionToEdit] = useState<FormVersion | undefined>();

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      setLoading(true);
      const list = await formService.getForms();
      setForms(list);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCreate = () => {
    setSelectedFormToEdit(undefined);
    setSelectedVersionToEdit(undefined);
    setIsBuilding(true);
  };

  const handleStartEdit = async (form: FormDefinition) => {
    const data = await formService.getFormWithVersion(form.id);
    if (data) {
      setSelectedFormToEdit(data.form);
      setSelectedVersionToEdit(data.version);
      setIsBuilding(true);
    }
  };

  const handleDuplicate = async (form: FormDefinition) => {
    const newTitle = prompt('Título para a cópia do formulário:', `${form.title} (Cópia)`);
    if (!newTitle) return;
    try {
      await formService.duplicateForm(form.id, newTitle, currentUser);
      await loadForms();
      alert('Formulário duplicado com sucesso (Spec 7.1).');
    } catch (err: any) {
      alert(`Erro ao duplicar: ${err.message}`);
    }
  };

  const handleArchive = async (formId: string) => {
    if (!confirm('Deseja arquivar este formulário? Chamados antigos preservarão suas respostas e campos originais (Spec 7.5).')) return;
    try {
      await formService.archiveForm(formId, currentUser);
      await loadForms();
    } catch (err: any) {
      alert(`Erro ao arquivar: ${err.message}`);
    }
  };

  const handleSaveForm = async (
    formMeta: { title: string; description?: string; instructions?: string; publishImmediately: boolean },
    fields: FormField[]
  ) => {
    if (selectedFormToEdit) {
      // Versioning rule (Spec 7.5): Alterar um formulário publicado cria uma nova versão
      await formService.publishNewVersion(selectedFormToEdit.id, fields, currentUser);
    } else {
      await formService.createForm(formMeta, fields, currentUser);
    }
    setIsBuilding(false);
    await loadForms();
  };

  if (isBuilding) {
    return (
      <FormBuilder
        initialForm={selectedFormToEdit}
        initialVersion={selectedVersionToEdit}
        onSave={handleSaveForm}
        onCancel={() => setIsBuilding(false)}
        currentUser={currentUser}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--mtp-navy-primary)' }}>
            Construtor de Formulários Administráveis
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Monte, versiona e publique formulários para cada serviço sem escrever código (Spec 7)
          </p>
        </div>

        <button className="btn btn-primary btn-sm" onClick={handleStartCreate}>
          <Plus size={16} /> Novo Formulário
        </button>
      </div>

      {forms.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum formulário cadastrado"
          description="A central começa sem formulários fictícios (Spec 7.6). Crie o primeiro formulário com campos personalizados (texto, listas, anexos, datas, aceite de termos) para associar a um serviço."
          actionText="Criar Primeiro Formulário"
          onAction={handleStartCreate}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {forms.map((form) => (
            <div key={form.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span
                    className="badge"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      background: 'var(--mtp-blue-light)',
                      color: 'var(--mtp-navy-primary)',
                      fontWeight: 700,
                    }}
                  >
                    Versão atual: v{form.current_version}
                  </span>
                  <span
                    className={`badge ${
                      form.status === 'published' ? 'badge-resolved' : form.status === 'draft' ? 'badge-waiting' : 'badge-closed'
                    }`}
                  >
                    {form.status === 'published' ? 'Publicado' : form.status === 'draft' ? 'Rascunho' : 'Arquivado'}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--mtp-navy-primary)', marginBottom: 6 }}>
                  {form.title}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                  {form.description || 'Sem descrição.'}
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 12, marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => handleStartEdit(form)}
                  >
                    <Edit3 size={14} /> Editar / Nova Versão
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDuplicate(form)}
                    title="Duplicar formulário (Spec 7.1)"
                  >
                    <Copy size={15} />
                  </button>
                  {form.status !== 'archived' && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#dc2626' }}
                      onClick={() => handleArchive(form.id)}
                      title="Arquivar formulário"
                    >
                      <Archive size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
