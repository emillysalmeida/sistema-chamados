import React, { useState } from 'react';
import { authService, INITIAL_SUPER_ADMIN_EMAIL } from '../../services/authService';
import { UserProfile } from '../../types/database';
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';

interface AuthScreenProps {
  onAuthenticated: (user: UserProfile) => void;
}

type AuthMode = 'login' | 'signup' | 'forgot_password';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = email.trim().toLowerCase();

    // Corporate domain check
    if (!cleanEmail.endsWith('@mtp.com.br')) {
      setErrorMessage('O acesso é restrito a e-mails corporativos @mtp.com.br (Spec 4.1).');
      return;
    }

    try {
      setLoading(true);

      if (mode === 'signup') {
        if (!name.trim()) {
          setErrorMessage('Por favor informe seu nome completo.');
          return;
        }
        if (password.length < 6) {
          setErrorMessage('A senha deve conter no mínimo 6 caracteres.');
          return;
        }
        if (password !== confirmPassword) {
          setErrorMessage('As senhas não coincidem.');
          return;
        }

        const { user } = await authService.signUp(cleanEmail, password, name);
        setSuccessMessage('Conta criada com sucesso! Conectando ao sistema...');
        setTimeout(() => {
          onAuthenticated(user);
        }, 800);
      } else if (mode === 'login') {
        if (!password) {
          setErrorMessage('Por favor informe sua senha.');
          return;
        }

        const { user } = await authService.signIn(cleanEmail, password);
        onAuthenticated(user);
      } else if (mode === 'forgot_password') {
        await authService.resetPassword(cleanEmail);
        setSuccessMessage(
          'Instruções para redefinição de senha foram enviadas para o seu e-mail corporativo.'
        );
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      // Friendly message translation
      let msg = err.message || 'Ocorreu um erro na autenticação.';
      if (msg.includes('Invalid login credentials')) {
        msg = 'E-mail ou senha incorretos. Verifique suas credenciais.';
      } else if (msg.includes('User already registered')) {
        msg = 'Já existe uma conta cadastrada com este e-mail corporativo. Faça login.';
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePreFillAdmin = () => {
    setEmail(INITIAL_SUPER_ADMIN_EMAIL);
    setPassword('mtp@2026');
    setConfirmPassword('mtp@2026');
    setName('Emilly Almeida');
    setErrorMessage('');
    setSuccessMessage('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 10% 20%, #171b56 0%, #0b0d2c 90%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'var(--font-family)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 25px 50px -12px rgba(11, 13, 44, 0.45)',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Header with MTP logo on dark background */}
        <div
          style={{
            background: 'var(--mtp-navy-primary)',
            padding: '36px 32px 28px',
            textAlign: 'center',
            color: '#ffffff',
            borderBottom: '2px solid var(--mtp-navy-surface)',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.06)',
              marginBottom: 16,
            }}
          >
            <img
              src="/Logo-MTP-BRANCO.png"
              alt="MTP"
              style={{ height: 32, objectFit: 'contain' }}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>

          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
            Central de Serviços MTP
          </h1>
          <p style={{ fontSize: '0.825rem', color: '#cbd5e1', marginTop: 6 }}>
            {mode === 'login' && 'Autenticação corporativa com perfil individual'}
            {mode === 'signup' && 'Cadastre sua conta corporativa para abrir chamados'}
            {mode === 'forgot_password' && 'Recuperação de acesso corporativo'}
          </p>
        </div>

        {/* Form Body */}
        <div style={{ padding: '32px' }}>
          {/* Mode Switcher Tabs */}
          {mode !== 'forgot_password' && (
            <div
              style={{
                display: 'flex',
                background: 'var(--bg-main)',
                borderRadius: 'var(--radius-md)',
                padding: 4,
                marginBottom: 24,
                border: '1px solid var(--border-light)',
              }}
            >
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '8px 0',
                  fontSize: '0.85rem',
                  fontWeight: mode === 'login' ? 700 : 500,
                  color: mode === 'login' ? 'var(--mtp-navy-primary)' : 'var(--text-secondary)',
                  background: mode === 'login' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: mode === 'login' ? 'var(--shadow-sm)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  fontFamily: 'var(--font-family)',
                }}
                onClick={() => {
                  setMode('login');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
              >
                Entrar
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '8px 0',
                  fontSize: '0.85rem',
                  fontWeight: mode === 'signup' ? 700 : 500,
                  color: mode === 'signup' ? 'var(--mtp-navy-primary)' : 'var(--text-secondary)',
                  background: mode === 'signup' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: mode === 'signup' ? 'var(--shadow-sm)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  fontFamily: 'var(--font-family)',
                }}
                onClick={() => {
                  setMode('signup');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
              >
                Criar Conta
              </button>
            </div>
          )}

          {/* Feedback Alerts */}
          {errorMessage && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fee2e2',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                color: '#991b1b',
                fontSize: '0.825rem',
                marginBottom: 20,
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                color: '#065f46',
                fontSize: '0.825rem',
                marginBottom: 20,
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
              }}
            >
              <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>{successMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Name field (for signup) */}
            {mode === 'signup' && (
              <div style={{ marginBottom: 16 }}>
                <label className="label label-required">Nome Completo</label>
                <div style={{ position: 'relative' }}>
                  <User
                    size={16}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: 12, top: 12 }}
                  />
                  <input
                    type="text"
                    className="input"
                    style={{ paddingLeft: 38 }}
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {/* Email field */}
            <div style={{ marginBottom: 16 }}>
              <label className="label label-required">E-mail Corporativo MTP</label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: 12, top: 12 }}
                />
                <input
                  type="email"
                  className="input"
                  style={{ paddingLeft: 38 }}
                  placeholder="nome.sobrenome@mtp.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <p className="help-text">Obrigatório domínio corporativo @mtp.com.br</p>
            </div>

            {/* Password field (for login and signup) */}
            {mode !== 'forgot_password' && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="label label-required" style={{ marginBottom: 0 }}>
                    Senha
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--mtp-blue-primary)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setMode('forgot_password');
                        setErrorMessage('');
                        setSuccessMessage('');
                      }}
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={16}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: 12, top: 12 }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input"
                    style={{ paddingLeft: 38, paddingRight: 38 }}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: 10,
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm password (for signup) */}
            {mode === 'signup' && (
              <div style={{ marginBottom: 20 }}>
                <label className="label label-required">Confirmar Senha</label>
                <div style={{ position: 'relative' }}>
                  <KeyRound
                    size={16}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: 12, top: 12 }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input"
                    style={{ paddingLeft: 38 }}
                    placeholder="Repita sua senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {/* Profile note for signup */}
            {mode === 'signup' && (
              <div
                style={{
                  background: 'var(--bg-main)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  marginBottom: 20,
                  border: '1px solid var(--border-light)',
                  lineHeight: 1.4,
                }}
              >
                <ShieldCheck size={14} color="var(--mtp-navy-primary)" style={{ display: 'inline', marginRight: 4 }} />
                Contas novas são registradas inicialmente com perfil individual de <strong>Solicitante</strong>, habilitadas para abrir e acompanhar chamados.
              </div>
            )}

            {/* Action Submit Button */}
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '0.95rem',
                justifyContent: 'center',
              }}
              disabled={loading}
            >
              {loading ? (
                'Processando...'
              ) : mode === 'login' ? (
                <>
                  Entrar no Sistema <ArrowRight size={16} />
                </>
              ) : mode === 'signup' ? (
                <>
                  Criar Minha Conta <ArrowRight size={16} />
                </>
              ) : (
                'Enviar Link de Recuperação'
              )}
            </button>
          </form>

          {/* Back to login if in forgot password */}
          {mode === 'forgot_password' && (
            <div style={{ textAlign: 'center', marginTop: 18 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setMode('login');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
              >
                Voltar para a tela de login
              </button>
            </div>
          )}

          {/* Quick test admin pre-fill helper */}
          <div
            style={{
              marginTop: 24,
              paddingTop: 18,
              borderTop: '1px solid var(--border-light)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>
              Ambiente de Validação & Homologação MTP (Spec 3.2):
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem', width: '100%', justifyContent: 'center' }}
              onClick={handlePreFillAdmin}
            >
              Preencher dados do Super Admin (emilly.almeida@mtp.com.br)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
