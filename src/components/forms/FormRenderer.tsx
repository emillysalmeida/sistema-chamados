import React, { useState } from 'react';
import { FormField } from '../../types/database';
import { Upload, Info, CheckSquare } from 'lucide-react';

interface FormRendererProps {
  fields: FormField[];
  values: Record<string, any>;
  onChange: (fieldId: string, value: any) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export const FormRenderer: React.FC<FormRendererProps> = ({
  fields,
  values,
  onChange,
  errors = {},
  disabled = false,
}) => {
  const sortedFields = [...fields].sort((a, b) => a.order - b.order);

  const renderFieldInput = (field: FormField) => {
    const val = values[field.id];
    const hasError = !!errors[field.id];

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            className="input"
            style={hasError ? { borderColor: '#ef4444' } : {}}
            placeholder={field.placeholder || 'Digite sua resposta'}
            value={val || ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            disabled={disabled}
            required={field.required}
          />
        );

      case 'textarea':
        return (
          <textarea
            className="textarea"
            style={{ minHeight: 90, ...(hasError ? { borderColor: '#ef4444' } : {}) }}
            placeholder={field.placeholder || 'Descreva detalhadamente...'}
            value={val || ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            disabled={disabled}
            required={field.required}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            className="input"
            style={hasError ? { borderColor: '#ef4444' } : {}}
            placeholder={field.placeholder || '0'}
            value={val !== undefined ? val : ''}
            onChange={(e) => onChange(field.id, e.target.value ? Number(e.target.value) : '')}
            disabled={disabled}
            required={field.required}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            className="input"
            style={hasError ? { borderColor: '#ef4444' } : {}}
            placeholder={field.placeholder || 'nome@mtp.com.br'}
            value={val || ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            disabled={disabled}
            required={field.required}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            className="input"
            style={hasError ? { borderColor: '#ef4444' } : {}}
            value={val || ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            disabled={disabled}
            required={field.required}
          />
        );

      case 'select':
        return (
          <select
            className="select"
            style={hasError ? { borderColor: '#ef4444' } : {}}
            value={val || ''}
            onChange={(e) => onChange(field.id, e.target.value)}
            disabled={disabled}
            required={field.required}
          >
            <option value="">Selecione uma opção...</option>
            {(field.options || []).map((opt, idx) => (
              <option key={idx} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case 'multiselect': {
        const currentSelected: string[] = Array.isArray(val) ? val : [];
        const toggleOption = (opt: string) => {
          if (currentSelected.includes(opt)) {
            onChange(field.id, currentSelected.filter((item) => item !== opt));
          } else {
            onChange(field.id, [...currentSelected, opt]);
          }
        };

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 0' }}>
            {(field.options || []).map((opt, idx) => (
              <label
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.85rem',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={currentSelected.includes(opt)}
                  onChange={() => toggleOption(opt)}
                  disabled={disabled}
                  style={{ accentColor: 'var(--mtp-navy-primary)' }}
                />
                {opt}
              </label>
            ))}
          </div>
        );
      }

      case 'radio':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 0' }}>
            {(field.options || []).map((opt, idx) => (
              <label
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.85rem',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
              >
                <input
                  type="radio"
                  name={`radio_${field.id}`}
                  checked={val === opt}
                  onChange={() => onChange(field.id, opt)}
                  disabled={disabled}
                  style={{ accentColor: 'var(--mtp-navy-primary)' }}
                />
                {opt}
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.85rem',
              cursor: disabled ? 'not-allowed' : 'pointer',
              marginTop: 4,
            }}
          >
            <input
              type="checkbox"
              checked={!!val}
              onChange={(e) => onChange(field.id, e.target.checked)}
              disabled={disabled}
              style={{ accentColor: 'var(--mtp-navy-primary)' }}
            />
            <span>{field.placeholder || 'Sim, concordo / confirmar seleção'}</span>
          </label>
        );

      case 'boolean':
        return (
          <div style={{ display: 'flex', gap: 14, padding: '4px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name={`bool_${field.id}`}
                checked={val === true}
                onChange={() => onChange(field.id, true)}
                disabled={disabled}
                style={{ accentColor: 'var(--mtp-navy-primary)' }}
              />
              Sim
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name={`bool_${field.id}`}
                checked={val === false}
                onChange={() => onChange(field.id, false)}
                disabled={disabled}
                style={{ accentColor: 'var(--mtp-navy-primary)' }}
              />
              Não
            </label>
          </div>
        );

      case 'file':
        const acceptedTypes = field.validation?.fileTypes?.join(',');
        return (
          <div
            style={{
              border: hasError ? '1px dashed #ef4444' : '1px dashed var(--border-light)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              textAlign: 'center',
              background: '#f8fafc',
            }}
          >
            <Upload size={22} color="var(--text-muted)" style={{ margin: '0 auto 6px' }} />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {val?.name ? (
                <span style={{ fontWeight: 600, color: 'var(--mtp-navy-primary)' }}>
                  Arquivo selecionado: {val.name}
                </span>
              ) : (
                'Clique para anexar arquivo ou arraste até aqui'
              )}
            </div>
            {field.validation?.fileTypes && field.validation.fileTypes.length > 0 && (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Formatos aceitos: {field.validation.fileTypes.join(', ')}
              </div>
            )}
            <input
              type="file"
              style={{ display: 'none' }}
              id={`file_upload_${field.id}`}
              disabled={disabled}
              accept={acceptedTypes}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onChange(field.id, {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                  });
                }
              }}
            />
            <label
              htmlFor={`file_upload_${field.id}`}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 10, cursor: 'pointer' }}
            >
              Escolher Arquivo
            </label>
          </div>
        );

      case 'info':
        return (
          <div
            style={{
              background: 'var(--mtp-blue-light)',
              border: '1px solid rgba(91, 178, 221, 0.4)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              display: 'flex',
              gap: 10,
              fontSize: '0.85rem',
              color: 'var(--mtp-navy-surface)',
            }}
          >
            <Info size={18} color="var(--mtp-navy-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>{field.infoContent || field.helpText || 'Informação importante sobre este atendimento.'}</div>
          </div>
        );

      case 'terms':
        return (
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
            }}
          >
            <div
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                maxHeight: 100,
                overflowY: 'auto',
                marginBottom: 10,
                lineHeight: 1.4,
              }}
            >
              {field.infoContent || 'Declaro que as informações prestadas são verdadeiras e estou ciente das normas corporativas da MTP.'}
            </div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={!!val}
                onChange={(e) => onChange(field.id, e.target.checked)}
                disabled={disabled}
                required={field.required}
                style={{ accentColor: 'var(--mtp-navy-primary)' }}
              />
              Li e concordo com os termos acima
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {sortedFields.map((field) => (
        <div key={field.id}>
          {field.type !== 'info' && (
            <label className={`label ${field.required ? 'label-required' : ''}`}>
              {field.label}
            </label>
          )}

          {renderFieldInput(field)}

          {field.helpText && field.type !== 'info' && (
            <p className="help-text">{field.helpText}</p>
          )}

          {errors[field.id] && (
            <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: 4, fontWeight: 500 }}>
              {errors[field.id]}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};
