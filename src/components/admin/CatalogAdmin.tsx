/**
 * CatalogAdmin — Administração integrada do Catálogo de Serviços MTP
 *
 * Fluxo: Departamento → Serviços/Categorias → Formulário
 * Refinamento 03 — substitui as 3 telas separadas por uma experiência unificada.
 * O construtor de formulários (FormBuilder) é preservado integralmente.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Department,
  ServiceCategory,
  ServiceType,
  FormDefinition,
  FormVersion,
  FormField,
  UserProfile,
  DepartmentMember,
} from '../../types/database';
import { catalogService } from '../../services/catalogService';
import { formService } from '../../services/formService';
import { authService } from '../../services/authService';
import { FormBuilder } from '../forms/FormBuilder';
import { Modal } from '../layout/Modal';
import { EmptyState } from '../layout/EmptyState';
import {
  FolderKanban,
  Plus,
  ChevronRight,
  ArrowLeft,
  Settings,
  FileText,
  Edit3,
  Archive,
  Copy,
  Users,
  UserX,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Tag,
} from 'lucide-react';

type CatalogView = 'departments' | 'services' | 'form_builder';

interface CatalogAdminProps {
  currentUser: UserProfile;
}

export const CatalogAdmin: React.FC<CatalogAdminProps> = ({ currentUser }) => {
  // ── Navigation state ───────────────────────────────────────────────────────
  const [view, setView] = useState<CatalogView>('departments');
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);

  // ── Departments ────────────────────────────────────────────────────────────
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);

  // Dept create modal
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDescription, setDeptDescription] = useState('');

  // Dept members modal
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [members, setMembers] = useState<DepartmentMember[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState('');

  // ── Services & Categories ──────────────────────────────────────────────────
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  // Category modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Service modal
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceEditTarget, setServiceEditTarget] = useState<ServiceType | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [serviceCategoryId, setServiceCategoryId] = useState('');
  const [serviceFormId, setServiceFormId] = useState('');
  const [servicePublished, setServicePublished] = useState(true);
  const [availableForms, setAvailableForms] = useState<FormDefinition[]>([]);

  // ── Form Builder (integrated) ──────────────────────────────────────────────
  const [formToEdit, setFormToEdit] = useState<FormDefinition | undefined>();
  const [versionToEdit, setVersionToEdit] = useState<FormVersion | undefined>();
  // Context: which service triggered the form builder
  const [formContextService, setFormContextService] = useState<ServiceType | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // Data loaders
  // ═══════════════════════════════════════════════════════════════════════════

  const loadDepartments = useCallback(async () => {
    setLoadingDepts(true);
    try {
      const list = await catalogService.getDepartments(false);
      setDepartments(list);
    } finally {
      setLoadingDepts(false);
    }
  }, []);

  const loadServicesData = useCallback(async (deptId: string) => {
    setLoadingServices(true);
    try {
      const [cats, servs, forms] = await Promise.all([
        catalogService.getCategories(deptId),
        catalogService.getServiceTypes(deptId, false),
        formService.getForms(),
      ]);
      setCategories(cats);
      setServices(servs);
      setAvailableForms(forms);
    } finally {
      setLoadingServices(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Navigation helpers
  // ═══════════════════════════════════════════════════════════════════════════

  const openDept = async (dept: Department) => {
    setSelectedDept(dept);
    setView('services');
    await loadServicesData(dept.id);
  };

  const goBack = () => {
    if (view === 'form_builder') {
      setView('services');
      setFormContextService(null);
    } else if (view === 'services') {
      setView('departments');
      setSelectedDept(null);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Department CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !deptCode.trim()) return;
    try {
      await catalogService.createDepartment(
        { name: deptName, code: deptCode, description: deptDescription },
        currentUser
      );
      setShowDeptModal(false);
      setDeptName('');
      setDeptCode('');
      setDeptDescription('');
      await loadDepartments();
    } catch (err: any) {
      alert(`Erro ao criar departamento: ${err.message}`);
    }
  };

  const handleArchiveDept = async (deptId: string) => {
    if (!confirm('Deseja realmente arquivar este departamento? Chamados históricos serão preservados (Spec 11.1).')) return;
    try {
      await catalogService.archiveDepartment(deptId, currentUser);
      await loadDepartments();
    } catch (err: any) {
      alert(`Erro ao arquivar: ${err.message}`);
    }
  };

  const handleOpenMembers = async (dept: Department) => {
    setSelectedDept(dept);
    const [m, u] = await Promise.all([
      catalogService.getDepartmentMembers(dept.id),
      authService.getAllUsers(),
    ]);
    setMembers(m);
    setAllUsers(u);
    setShowMembersModal(true);
  };

  const handleAddMember = async () => {
    if (!selectedDept || !selectedUserIdToAdd) return;
    try {
      await catalogService.addDepartmentMember(selectedDept.id, selectedUserIdToAdd, currentUser);
      setSelectedUserIdToAdd('');
      setMembers(await catalogService.getDepartmentMembers(selectedDept.id));
      await loadDepartments();
    } catch (err: any) {
      alert(`Erro ao vincular: ${err.message}`);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedDept) return;
    try {
      const res = await catalogService.removeDepartmentMember(selectedDept.id, userId, currentUser);
      if (res.assignedTicketsCount > 0) {
        alert(`Atendente desvinculado. ${res.assignedTicketsCount} chamado(s) devolvidos à fila coletiva (Spec 9.4).`);
      }
      setMembers(await catalogService.getDepartmentMembers(selectedDept.id));
      await loadDepartments();
    } catch (err: any) {
      alert(`Erro ao desvincular: ${err.message}`);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Category CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept || !catName.trim()) return;
    try {
      await catalogService.createCategory({
        department_id: selectedDept.id,
        name: catName,
        description: catDesc,
      });
      setShowCategoryModal(false);
      setCatName('');
      setCatDesc('');
      await loadServicesData(selectedDept.id);
    } catch (err: any) {
      alert(`Erro ao criar categoria: ${err.message}`);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Service CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  const openServiceModal = (svc?: ServiceType) => {
    if (svc) {
      setServiceEditTarget(svc);
      setServiceName(svc.name);
      setServiceDesc(svc.description || '');
      setServiceCategoryId(svc.category_id || '');
      setServiceFormId(svc.form_id || '');
      setServicePublished(svc.is_published);
    } else {
      setServiceEditTarget(null);
      setServiceName('');
      setServiceDesc('');
      setServiceCategoryId('');
      setServiceFormId('');
      setServicePublished(true);
    }
    setShowServiceModal(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept || !serviceName.trim() || !serviceFormId) return;
    try {
      if (serviceEditTarget) {
        await catalogService.updateServiceType(
          serviceEditTarget.id,
          {
            name: serviceName,
            description: serviceDesc,
            category_id: serviceCategoryId || undefined,
            form_id: serviceFormId,
            is_published: servicePublished,
          },
          currentUser
        );
      } else {
        await catalogService.createServiceType(
          {
            department_id: selectedDept.id,
            category_id: serviceCategoryId || undefined,
            name: serviceName,
            description: serviceDesc,
            form_id: serviceFormId,
            is_published: servicePublished,
          },
          currentUser
        );
      }
      setShowServiceModal(false);
      await loadServicesData(selectedDept.id);
    } catch (err: any) {
      alert(`Erro ao salvar serviço: ${err.message}`);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Form Builder integration
  // ═══════════════════════════════════════════════════════════════════════════

  const openFormBuilder = async (svc: ServiceType) => {
    setFormContextService(svc);
    if (svc.form_id) {
      const data = await formService.getFormWithVersion(svc.form_id);
      if (data) {
        setFormToEdit(data.form);
        setVersionToEdit(data.version);
      }
    } else {
      setFormToEdit(undefined);
      setVersionToEdit(undefined);
    }
    setView('form_builder');
  };

  const openFormBuilderBlank = () => {
    setFormContextService(null);
    setFormToEdit(undefined);
    setVersionToEdit(undefined);
    setView('form_builder');
  };

  const handleSaveForm = async (
    formMeta: { title: string; description?: string; instructions?: string; publishImmediately: boolean },
    fields: FormField[]
  ) => {
    let savedFormId: string | undefined;
    if (formToEdit) {
      await formService.publishNewVersion(formToEdit.id, fields, currentUser);
      savedFormId = formToEdit.id;
    } else {
      const result = await formService.createForm(formMeta, fields, currentUser);
      savedFormId = result?.form?.id;
    }

    // If opened from a service context with no form yet, auto-link the new form
    if (savedFormId && formContextService && !formContextService.form_id) {
      try {
        await catalogService.updateServiceType(
          formContextService.id,
          { form_id: savedFormId },
          currentUser
        );
      } catch {
        // non-blocking: user can link manually via modal
      }
    }

    setView('services');
    setFormContextService(null);
    if (selectedDept) await loadServicesData(selectedDept.id);
  };

  const handleDuplicateForm = async (form: FormDefinition) => {
    const newTitle = prompt('Título para a cópia:', `${form.title} (Cópia)`);
    if (!newTitle) return;
    try {
      await formService.duplicateForm(form.id, newTitle, currentUser);
      if (selectedDept) await loadServicesData(selectedDept.id);
      alert('Formulário duplicado com sucesso.');
    } catch (err: any) {
      alert(`Erro ao duplicar: ${err.message}`);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Render: FormBuilder (full page, integrated)
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === 'form_builder') {
    return (
      <div>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} onClick={() => setView('departments')}>
            Catálogo de Serviços
          </button>
          <ChevronRight size={14} />
          {selectedDept && (
            <>
              <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} onClick={() => setView('services')}>
                {selectedDept.name}
              </button>
              <ChevronRight size={14} />
            </>
          )}
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
            {formContextService ? `Formulário: ${formContextService.name}` : 'Novo Formulário'}
          </span>
        </div>

        <FormBuilder
          initialForm={formToEdit}
          initialVersion={versionToEdit}
          onSave={handleSaveForm}
          onCancel={goBack}
          currentUser={currentUser}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Render: Services view (dept selected)
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === 'services' && selectedDept) {
    const servicesByCategory: Record<string, ServiceType[]> = {};
    const uncategorized: ServiceType[] = [];

    services.forEach((svc) => {
      if (svc.category_id) {
        if (!servicesByCategory[svc.category_id]) servicesByCategory[svc.category_id] = [];
        servicesByCategory[svc.category_id].push(svc);
      } else {
        uncategorized.push(svc);
      }
    });

    return (
      <div>
        {/* Breadcrumb + Back */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} onClick={goBack}>
            <ArrowLeft size={14} /> Catálogo de Serviços
          </button>
          <ChevronRight size={14} />
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
            {selectedDept.name} ({selectedDept.code})
          </span>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--mtp-navy-primary)', marginBottom: 4 }}>
              {selectedDept.name}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {selectedDept.description || 'Gerencie serviços, categorias e formulários desta caixa de atendimento.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => handleOpenMembers(selectedDept)}>
              <Users size={15} /> Equipe ({selectedDept.member_count || 0})
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowCategoryModal(true)}>
              <Tag size={15} /> Nova Categoria
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => openServiceModal()}
              disabled={availableForms.length === 0}
              title={availableForms.length === 0 ? 'Crie um formulário primeiro' : 'Novo serviço'}
            >
              <Plus size={15} /> Novo Serviço
            </button>
            <button className="btn btn-primary btn-sm" onClick={openFormBuilderBlank}>
              <FileText size={15} /> Novo Formulário
            </button>
          </div>
        </div>

        {availableForms.length === 0 && (
          <div
            style={{
              padding: '12px 16px',
              background: '#fef9c3',
              border: '1px solid #fde68a',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              color: '#92400e',
              marginBottom: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={16} />
            Nenhum formulário disponível. Crie um formulário primeiro para depois vincular a um serviço.
          </div>
        )}

        {loadingServices ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Carregando serviços...</p>
        ) : services.length === 0 ? (
          <EmptyState
            icon={Settings}
            title="Nenhum serviço cadastrado"
            description="Crie o primeiro tipo de solicitação para este departamento. Ele ficará visível no catálogo para os colaboradores."
            actionText={availableForms.length > 0 ? 'Criar Serviço' : 'Criar Formulário Primeiro'}
            onAction={availableForms.length > 0 ? () => openServiceModal() : openFormBuilderBlank}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Categorized services */}
            {categories.map((cat) => {
              const catServices = servicesByCategory[cat.id] || [];
              return (
                <div key={cat.id}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 10,
                      paddingBottom: 6,
                      borderBottom: '2px solid var(--border-light)',
                    }}
                  >
                    <Tag size={15} color="var(--mtp-blue-primary)" />
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--mtp-navy-primary)' }}>
                      {cat.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {cat.description && `— ${cat.description}`}
                    </span>
                    <span
                      className="badge"
                      style={{ background: 'var(--mtp-blue-light)', color: 'var(--mtp-navy-primary)', marginLeft: 'auto' }}
                    >
                      {catServices.length} serviço(s)
                    </span>
                  </div>
                  {catServices.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: 8 }}>
                      Nenhum serviço nesta categoria ainda.
                    </p>
                  ) : (
                    <ServiceGrid
                      services={catServices}
                      onEdit={openServiceModal}
                      onOpenForm={openFormBuilder}
                      onDuplicateForm={handleDuplicateForm}
                    />
                  )}
                </div>
              );
            })}

            {/* Uncategorized */}
            {uncategorized.length > 0 && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 10,
                    paddingBottom: 6,
                    borderBottom: '2px solid var(--border-light)',
                  }}
                >
                  <BookOpen size={15} color="var(--text-muted)" />
                  <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
                    Sem Categoria
                  </span>
                  <span
                    className="badge"
                    style={{ background: 'var(--border-light)', color: 'var(--text-muted)', marginLeft: 'auto' }}
                  >
                    {uncategorized.length} serviço(s)
                  </span>
                </div>
                <ServiceGrid
                  services={uncategorized}
                  onEdit={openServiceModal}
                  onOpenForm={openFormBuilder}
                  onDuplicateForm={handleDuplicateForm}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Category modal ── */}
        {showCategoryModal && (
          <Modal
            isOpen={showCategoryModal}
            onClose={() => setShowCategoryModal(false)}
            title="Nova Categoria"
            subtitle="Agrupe serviços dentro do departamento por assunto ou área"
          >
            <form onSubmit={handleCreateCategory}>
              <div style={{ marginBottom: 14 }}>
                <label className="label label-required">Nome da Categoria</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: Acessos e Permissões"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  required
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="label">Descrição (opcional)</label>
                <textarea
                  className="textarea"
                  placeholder="Descrição breve..."
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCategoryModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Criar Categoria
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* ── Service modal ── */}
        {showServiceModal && (
          <Modal
            isOpen={showServiceModal}
            onClose={() => setShowServiceModal(false)}
            title={serviceEditTarget ? 'Editar Serviço' : 'Novo Tipo de Serviço'}
            subtitle="Configure como esta solicitação aparece para os colaboradores"
          >
            <form onSubmit={handleSaveService}>
              <div style={{ marginBottom: 14 }}>
                <label className="label label-required">Nome do Serviço</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: Solicitação de Equipamento"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="label">Categoria (opcional)</label>
                <select
                  className="select"
                  value={serviceCategoryId}
                  onChange={(e) => setServiceCategoryId(e.target.value)}
                >
                  <option value="">Sem categoria (direto na caixa)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="label label-required">Formulário Associado</label>
                <select
                  className="select"
                  value={serviceFormId}
                  onChange={(e) => setServiceFormId(e.target.value)}
                  required
                >
                  <option value="">Selecione um formulário...</option>
                  {availableForms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.title} (v{f.current_version}) — {f.status}
                    </option>
                  ))}
                </select>
                {availableForms.length === 0 && (
                  <p className="help-text" style={{ color: '#dc2626' }}>
                    Nenhum formulário disponível. Feche este modal e crie um formulário primeiro.
                  </p>
                )}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="label">Descrição para o Solicitante</label>
                <textarea
                  className="textarea"
                  placeholder="Ex: Use este serviço para solicitar notebook, mouse ou teclado..."
                  value={serviceDesc}
                  onChange={(e) => setServiceDesc(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={servicePublished}
                    onChange={(e) => setServicePublished(e.target.checked)}
                  />
                  Publicar no catálogo imediatamente
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowServiceModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={!serviceFormId}>
                  {serviceEditTarget ? 'Salvar Alterações' : 'Publicar Serviço'}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* ── Members modal ── */}
        {showMembersModal && selectedDept && (
          <Modal
            isOpen={showMembersModal}
            onClose={() => setShowMembersModal(false)}
            title={`Equipe: ${selectedDept.name}`}
            subtitle="Atendentes vinculados podem acessar a fila desta caixa (Spec 4.2)"
          >
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <select
                className="select"
                style={{ flex: 1 }}
                value={selectedUserIdToAdd}
                onChange={(e) => setSelectedUserIdToAdd(e.target.value)}
              >
                <option value="">Selecione um colaborador @mtp.com.br...</option>
                {allUsers
                  .filter((u) => !members.some((m) => m.user_id === u.id))
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
              </select>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleAddMember}
                disabled={!selectedUserIdToAdd}
              >
                <Plus size={16} /> Vincular
              </button>
            </div>

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12 }}>
                Atendentes Autorizados ({members.length})
              </h4>
              {members.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Nenhum atendente vinculado ainda.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {members.map((mem) => (
                    <div
                      key={mem.id}
                      style={{
                        padding: '10px 14px',
                        background: 'var(--bg-main)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{mem.user?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{mem.user?.email}</div>
                      </div>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#dc2626' }}
                        onClick={() => handleRemoveMember(mem.user_id)}
                        title="Desvincular"
                      >
                        <UserX size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Modal>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Render: Departments list (root view)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--mtp-navy-primary)' }}>
            Catálogo de Serviços
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Selecione um departamento para gerenciar serviços, categorias e formulários integrados
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowDeptModal(true)}>
          <Plus size={16} /> Novo Departamento
        </button>
      </div>

      {loadingDepts ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Carregando departamentos...</p>
      ) : departments.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Nenhum departamento cadastrado"
          description="A Central de Serviços inicia vazia (Spec 3.1). Crie o primeiro departamento para começar a configurar o catálogo."
          actionText="Criar Primeiro Departamento"
          onAction={() => setShowDeptModal(true)}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'box-shadow 0.15s',
              }}
            >
              <div onClick={() => openDept(dept)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span
                    className="badge"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      background: 'var(--mtp-blue-light)',
                      color: 'var(--mtp-navy-primary)',
                      fontWeight: 800,
                    }}
                  >
                    {dept.code}
                  </span>
                  <span className={`badge ${dept.is_active ? 'badge-resolved' : 'badge-closed'}`}>
                    {dept.is_active ? 'Ativo' : 'Arquivado'}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--mtp-navy-primary)', marginBottom: 4 }}>
                  {dept.name}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
                  {dept.description || 'Clique para gerenciar serviços e formulários.'}
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 12, marginTop: 4 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginBottom: 12,
                  }}
                >
                  <span>{dept.member_count || 0} atendente(s)</span>
                  <span>{dept.ticket_count || 0} chamado(s)</span>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => openDept(dept)}
                  >
                    <Settings size={14} /> Gerenciar Serviços
                    <ChevronRight size={14} />
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleOpenMembers(dept)}
                    title="Gerenciar equipe"
                  >
                    <Users size={15} />
                  </button>
                  {dept.is_active && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#dc2626' }}
                      onClick={() => handleArchiveDept(dept.id)}
                      title="Arquivar departamento"
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

      {/* Create Dept Modal */}
      {showDeptModal && (
        <Modal
          isOpen={showDeptModal}
          onClose={() => setShowDeptModal(false)}
          title="Novo Departamento / Caixa"
          subtitle="Cadastre uma nova área de atendimento para receber chamados"
        >
          <form onSubmit={handleCreateDept}>
            <div style={{ marginBottom: 14 }}>
              <label className="label label-required">Nome do Departamento</label>
              <input
                type="text"
                className="input"
                placeholder="Ex: Tecnologia da Informação"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="label label-required">Chave / Prefixo de Protocolo</label>
              <input
                type="text"
                className="input"
                placeholder="Ex: TI (gera TI-000001, TI-000002...)"
                value={deptCode}
                onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                maxLength={8}
                required
              />
              <p className="help-text">Prefixo único para identificar chamados desta caixa (Spec 8.2).</p>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="label">Descrição da Área</label>
              <textarea
                className="textarea"
                placeholder="Descreva a finalidade desta caixa..."
                value={deptDescription}
                onChange={(e) => setDeptDescription(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowDeptModal(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                Criar Departamento
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Members modal (from dept list) */}
      {showMembersModal && selectedDept && (
        <Modal
          isOpen={showMembersModal}
          onClose={() => setShowMembersModal(false)}
          title={`Equipe: ${selectedDept.name}`}
          subtitle="Atendentes vinculados podem acessar a fila desta caixa (Spec 4.2)"
        >
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <select
              className="select"
              style={{ flex: 1 }}
              value={selectedUserIdToAdd}
              onChange={(e) => setSelectedUserIdToAdd(e.target.value)}
            >
              <option value="">Selecione um colaborador @mtp.com.br...</option>
              {allUsers
                .filter((u) => !members.some((m) => m.user_id === u.id))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
            </select>
            <button className="btn btn-primary btn-sm" onClick={handleAddMember} disabled={!selectedUserIdToAdd}>
              <Plus size={16} /> Vincular
            </button>
          </div>
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12 }}>
              Atendentes Autorizados ({members.length})
            </h4>
            {members.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Nenhum atendente vinculado ainda.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {members.map((mem) => (
                  <div
                    key={mem.id}
                    style={{
                      padding: '10px 14px',
                      background: 'var(--bg-main)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{mem.user?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{mem.user?.email}</div>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#dc2626' }}
                      onClick={() => handleRemoveMember(mem.user_id)}
                      title="Desvincular"
                    >
                      <UserX size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-component: ServiceGrid
// ═══════════════════════════════════════════════════════════════════════════════
const ServiceGrid: React.FC<{
  services: ServiceType[];
  onEdit: (svc: ServiceType) => void;
  onOpenForm: (svc: ServiceType) => void;
  onDuplicateForm: (form: FormDefinition) => void;
}> = ({ services, onEdit, onOpenForm }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
    {services.map((svc) => (
      <div
        key={svc.id}
        style={{
          padding: 14,
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-md)',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span className={`badge ${svc.is_published ? 'badge-resolved' : 'badge-waiting'}`} style={{ fontSize: '0.65rem' }}>
              {svc.is_published ? 'Publicado' : 'Rascunho'}
            </span>
            {svc.form && (
              <span className="badge" style={{ fontSize: '0.6rem', background: 'var(--mtp-blue-light)', color: 'var(--mtp-navy-primary)' }}>
                v{svc.form.current_version}
              </span>
            )}
          </div>

          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--mtp-navy-primary)', marginBottom: 4 }}>
            {svc.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
            {svc.description || 'Sem descrição.'}
          </div>

          <div
            style={{
              fontSize: '0.7rem',
              color: svc.form ? 'var(--text-muted)' : '#dc2626',
              borderTop: '1px solid var(--border-light)',
              paddingTop: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <FileText size={11} />
            {svc.form ? svc.form.title : <strong>Sem formulário vinculado</strong>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <button
            className="btn btn-secondary btn-sm"
            style={{ flex: 1, fontSize: '0.75rem' }}
            onClick={() => onEdit(svc)}
          >
            <Edit3 size={12} /> Editar
          </button>
          <button
            className="btn btn-primary btn-sm"
            style={{ flex: 1, fontSize: '0.75rem' }}
            onClick={() => onOpenForm(svc)}
            title={svc.form ? 'Editar formulário deste serviço' : 'Criar formulário para este serviço'}
          >
            <FileText size={12} /> {svc.form ? 'Formulário' : 'Criar Form'}
          </button>
        </div>
      </div>
    ))}
  </div>
);
