import React, { useState, useEffect } from 'react';
import { Department, ServiceCategory, ServiceType, FormDefinition, UserProfile } from '../../types/database';
import { catalogService } from '../../services/catalogService';
import { formService } from '../../services/formService';
import { Modal } from '../layout/Modal';
import { EmptyState } from '../layout/EmptyState';
import { Plus, Settings, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface CategoryManagerProps {
  currentUser: UserProfile;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ currentUser }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [forms, setForms] = useState<FormDefinition[]>([]);

  // Category modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Service modal
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [serviceCategoryId, setServiceCategoryId] = useState('');
  const [serviceFormId, setServiceFormId] = useState('');

  useEffect(() => {
    loadInitial();
  }, []);

  const loadInitial = async () => {
    const depts = await catalogService.getDepartments(false);
    setDepartments(depts);
    const formList = await formService.getForms();
    setForms(formList);

    if (depts.length > 0) {
      setSelectedDeptId(depts[0].id);
      loadDeptData(depts[0].id);
    }
  };

  const loadDeptData = async (deptId: string) => {
    const cats = await catalogService.getCategories(deptId);
    setCategories(cats);
    const servs = await catalogService.getServiceTypes(deptId, false);
    setServices(servs);
  };

  const handleSelectDept = (deptId: string) => {
    setSelectedDeptId(deptId);
    loadDeptData(deptId);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeptId || !catName.trim()) return;

    try {
      await catalogService.createCategory({
        department_id: selectedDeptId,
        name: catName,
        description: catDesc,
      });
      setShowCategoryModal(false);
      setCatName('');
      setCatDesc('');
      await loadDeptData(selectedDeptId);
    } catch (err: any) {
      alert(`Erro ao criar categoria: ${err.message}`);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeptId || !serviceName.trim() || !serviceFormId) return;

    try {
      await catalogService.createServiceType(
        {
          department_id: selectedDeptId,
          category_id: serviceCategoryId || undefined,
          name: serviceName,
          description: serviceDesc,
          form_id: serviceFormId,
          is_published: true,
        },
        currentUser
      );
      setShowServiceModal(false);
      setServiceName('');
      setServiceDesc('');
      setServiceCategoryId('');
      setServiceFormId('');
      await loadDeptData(selectedDeptId);
    } catch (err: any) {
      alert(`Erro ao criar serviço: ${err.message}`);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--mtp-navy-primary)' }}>
            Categorias & Tipos de Solicitação
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Estruture a árvore de serviços e vincule aos formulários publicados
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowCategoryModal(true)}
            disabled={departments.length === 0}
          >
            <Plus size={16} /> Nova Categoria
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowServiceModal(true)}
            disabled={departments.length === 0 || forms.length === 0}
          >
            <Plus size={16} /> Novo Tipo de Serviço
          </button>
        </div>
      </div>

      {departments.length === 0 ? (
        <EmptyState
          icon={Settings}
          title="Nenhum departamento disponível"
          description="Cadastre primeiro um departamento para poder organizar categorias e tipos de solicitação."
        />
      ) : (
        <div>
          {/* Department Selector Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
            {departments.map((dept) => (
              <button
                key={dept.id}
                className={`btn ${selectedDeptId === dept.id ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => handleSelectDept(dept.id)}
              >
                {dept.name} ({dept.code})
              </button>
            ))}
          </div>

          {/* Services List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--mtp-navy-primary)', marginBottom: 14 }}>
                Tipos de Solicitação Publicados ({services.length})
              </h3>

              {services.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Nenhum tipo de solicitação cadastrado neste departamento. Clique em &quot;Novo Tipo de Serviço&quot; para publicar.
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                  {services.map((serv) => (
                    <div
                      key={serv.id}
                      style={{
                        padding: '14px',
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-md)',
                        background: '#ffffff',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span className="badge badge-open" style={{ fontSize: '0.65rem' }}>
                          {serv.category?.name || 'Geral'}
                        </span>
                        <span className="badge badge-resolved" style={{ fontSize: '0.65rem' }}>
                          Publicado
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--mtp-navy-primary)' }}>
                        {serv.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                        {serv.description || 'Sem descrição.'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 8, borderTop: '1px solid var(--border-light)', paddingTop: 6 }}>
                        Formulário: <strong>{serv.form?.title || 'Formulário padrão'}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Category Modal */}
      {showCategoryModal && (
        <Modal
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          title="Nova Categoria / Grupo"
          subtitle="Agrupe serviços sob uma categoria dentro do departamento"
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
              <label className="label">Descrição</label>
              <textarea
                className="textarea"
                placeholder="Descrição opcional..."
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

      {/* Create Service Modal */}
      {showServiceModal && (
        <Modal
          isOpen={showServiceModal}
          onClose={() => setShowServiceModal(false)}
          title="Novo Tipo de Solicitação"
          subtitle="Cadastre um serviço que ficará visível no catálogo para os colaboradores"
        >
          <form onSubmit={handleCreateService}>
            <div style={{ marginBottom: 14 }}>
              <label className="label label-required">Nome do Serviço</label>
              <input
                type="text"
                className="input"
                placeholder="Ex: Solicitação de Novo Equipamento"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="label">Categoria (Opcional)</label>
              <select
                className="select"
                value={serviceCategoryId}
                onChange={(e) => setServiceCategoryId(e.target.value)}
              >
                <option value="">Sem categoria (Direto na caixa)</option>
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
                <option value="">Selecione um formulário publicado...</option>
                {forms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title} (v{f.current_version}) - {f.status}
                  </option>
                ))}
              </select>
              {forms.length === 0 && (
                <p className="help-text" style={{ color: '#dc2626' }}>
                  Nenhum formulário cadastrado. Acesse o Construtor de Formulários para criar o primeiro.
                </p>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="label">Descrição breve para o solicitante</label>
              <textarea
                className="textarea"
                placeholder="Ex: Use este serviço para solicitar notebook, mouse ou teclado..."
                value={serviceDesc}
                onChange={(e) => setServiceDesc(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowServiceModal(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={!serviceFormId}>
                Publicar Serviço
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
