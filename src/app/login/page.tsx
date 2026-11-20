'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import ClipzBodyBadge from '@/components/ClipzBodyBadge';
import OnboardingFlow from '@/components/OnboardingFlow';
import { Eye, EyeOff, Loader2, Mail, Sparkles, X, Check, ArrowLeft } from 'lucide-react';

type AuthModalMode = 'closed' | 'login' | 'register' | 'forgot';

export default function Login() {
  const { user, isOnboarding, enterPreviewMode, loading: authLoading } = useAuth();
  const router = useRouter();

  const [modalMode, setModalMode] = useState<AuthModalMode>('closed');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [submittingAuth, setSubmittingAuth] = useState(false);

  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [submittingReset, setSubmittingReset] = useState(false);
  const [submittingGoogle, setSubmittingGoogle] = useState(false);

  // Redirect already authenticated users who finished onboarding
  useEffect(() => {
    if (!authLoading && user && !isOnboarding) {
      router.push('/dashboard');
    }
  }, [user, isOnboarding, authLoading, router]);

  const openModal = (mode: Exclude<AuthModalMode, 'closed'>) => {
    setAuthError('');
    setResetEmailSent(false);
    setModalMode(mode);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setSubmittingAuth(true);

    if (!email || !password) {
      setAuthError('Preencha todos os campos.');
      setSubmittingAuth(false);
      return;
    }

    if (modalMode === 'register' && !nome.trim()) {
      setAuthError('Preencha o campo nome.');
      setSubmittingAuth(false);
      return;
    }

    try {
      if (modalMode === 'register') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setModalMode('closed');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setAuthError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/invalid-credential') {
        setAuthError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/weak-password') {
        setAuthError('A senha deve ter pelo menos 6 caracteres.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setAuthError(
          'Erro: O provedor de login "E-mail/Senha" não está ativado no console do Firebase.'
        );
      } else if (err.code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'este domínio';
        setAuthError(
          `Erro de Domínio: "${host}" precisa ser autorizado no console do Firebase.`
        );
      } else {
        setAuthError(`Erro (${err.code || 'unknown'}): ${err.message || 'Tente novamente.'}`);
      }
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setSubmittingGoogle(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setAuthError('Erro: O login com Google não está ativado no console do Firebase.');
      } else if (err.code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'este domínio';
        setAuthError(
          `Erro de Domínio: "${host}" precisa ser autorizado no console do Firebase.`
        );
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setAuthError(
          `Erro (${err.code || 'unknown'}): ${err.message || 'Falha ao autenticar com o Google.'}`
        );
      }
    } finally {
      setSubmittingGoogle(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setResetEmailSent(false);
    setSubmittingReset(true);

    if (!email) {
      setAuthError('Digite seu e-mail para receber o link de recuperação.');
      setSubmittingReset(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-email') {
        setAuthError('E-mail inválido.');
      } else if (err.code === 'auth/user-not-found') {
        setAuthError('Nenhum usuário cadastrado com este e-mail.');
      } else {
        setAuthError(
          `Erro (${err.code || 'unknown'}): ${err.message || 'Falha ao enviar e-mail.'}`
        );
      }
    } finally {
      setSubmittingReset(false);
    }
  };

  if (authLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0d1117] flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#f59e0b]" />
        <span className="mt-3 text-xs text-[#94a3b8]">Verificando sessão...</span>
      </div>
    );
  }

  // New user authenticated -> Launch full 4-screen Onboarding Flow
  if (user && isOnboarding) {
    return <OnboardingFlow initialName={nome || user.displayName || ''} />;
  }

  // =========================================================================
  // TELA INICIAL COM LOGIN (Figma Node 69:1990)
  // =========================================================================
  return (
    <div className="fixed inset-0 z-50 bg-[#0d1117] overflow-y-auto">
      {/* Full-bleed Background Photo in Cover Mode + Lighter Overlay */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('/images/BACKGROUND-ONBOARDING-TELA-INICIAL.jpg')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(13,17,23,0.45)] via-[rgba(13,17,23,0.18)] to-[rgba(13,17,23,0.75)]" />
      </div>

      <div className="relative min-h-full w-full max-w-[448px] mx-auto flex flex-col justify-between">
        {/* Top Header + Hero Headline */}
        <div className="relative z-10 px-[20px] pt-[36px] space-y-[24px]">
          <ClipzBodyBadge className="h-[38px] w-auto" priority />

          <div className="space-y-[8px]">
            <h1 className="font-heading font-bold text-[36px] leading-[36px] tracking-[-0.9px] uppercase text-white">
              EVOLUÇÃO, SEM ACHISMO.
            </h1>
            <p className="text-[17px] leading-[23px] text-[#f8fafc] max-w-[340px]">
              Registre seus treinos, supere suas cargas e acompanhe cada centímetro da sua evolução.
            </p>
          </div>
        </div>

        {/* Bottom Action Buttons & Footer */}
        <div className="relative z-10 px-[20px] pb-[40px] pt-[24px] space-y-[16px]">
          {authError && modalMode === 'closed' && (
            <div className="bg-[#ff6e61]/20 backdrop-blur-md border border-[#ff6e61] text-white text-xs font-medium p-3 rounded-[12px]">
              {authError}
            </div>
          )}

          <div className="space-y-[12px]">
            {/* Primary White Button: Continuar com o Google */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={submittingGoogle}
              className="w-full h-[56px] bg-white hover:bg-[#f8fafc] disabled:opacity-60 border border-white rounded-[16px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.4),0px_4px_6px_-4px_rgba(0,0,0,0.4)] flex items-center justify-center gap-[12px] transition-transform active:scale-[0.98]"
            >
              {submittingGoogle ? (
                <Loader2 className="w-5 h-5 animate-spin text-[#0f172a]" />
              ) : (
                <svg className="w-[20px] h-[20px] shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              <span className="font-semibold text-[#0f172a] text-[14px] tracking-[0.35px]">
                Continuar com o Google
              </span>
            </button>

            {/* Secondary Translucent Dark Button: Continuar com E-mail */}
            <button
              type="button"
              onClick={() => openModal('register')}
              className="w-full h-[56px] backdrop-blur-md bg-black/70 hover:bg-black/85 border border-white/15 rounded-[16px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.2)] flex items-center justify-center gap-[12px] transition-transform active:scale-[0.98]"
            >
              <Mail className="w-[20px] h-[20px] text-[#f59e0b]" />
              <span className="font-semibold text-white text-[14px] tracking-[0.35px]">
                Continuar com E-mail
              </span>
            </button>
          </div>

          {/* Login Link + Preview Mode + Legal */}
          <div className="flex flex-col items-center gap-[10px] pt-[4px] text-center">
            <p className="text-[12px] text-[#f8fafc]">
              Já possui uma conta?{' '}
              <button
                type="button"
                onClick={() => openModal('login')}
                className="font-semibold text-[#f59e0b] hover:underline"
              >
                Fazer login
              </button>
            </p>

            {/* Preview Mode Shortcut (kept until production merge) */}
            <button
              type="button"
              onClick={() => {
                enterPreviewMode();
                router.push('/dashboard');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] font-semibold text-[#ffb95f] backdrop-blur-md transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Entrar no Modo Preview (Ver Nova UI)
            </button>

            <p className="text-[10px] leading-[13px] text-[#f8fafc]/80">
              Ao continuar, você concorda com nossos{' '}
              <span className="underline">Termos</span> e{' '}
              <span className="underline">Política de Privacidade</span>.
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================================
          AUTH BOTTOM-SHEET MODAL (E-mail Cadastro / Login / Esqueci Senha)
         ===================================================================== */}
      {modalMode !== 'closed' && (
        <div className="fixed inset-0 z-50 backdrop-blur-[12px] bg-[rgba(13,17,23,0.8)] flex items-end sm:items-center justify-center px-[12px] pb-[16px] pt-[24px] animate-in fade-in duration-200">
          <div className="bg-[#f4f4f0] rounded-[24px] shadow-[0px_20px_50px_-10px_rgba(0,0,0,0.85)] w-full max-w-[448px] overflow-hidden">
            {/* Top Amber Glow Line */}
            <div className="h-[4px] w-full bg-gradient-to-r from-[rgba(255,185,95,0.5)] via-[#ffb95f] to-[rgba(255,185,95,0.5)]" />

            <div className="p-[18px] space-y-[16px]">
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {modalMode === 'forgot' && (
                    <button
                      type="button"
                      onClick={() => openModal('login')}
                      className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-black"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  <div>
                    <h2 className="font-heading font-semibold text-black text-[20px] uppercase leading-[24px] tracking-[-0.4px]">
                      {modalMode === 'register'
                        ? 'CRIAR NOVA CONTA'
                        : modalMode === 'forgot'
                        ? 'RECUPERAR SENHA'
                        : 'ACESSAR MINHA CONTA'}
                    </h2>
                    <p className="text-[12px] text-[#475569]">
                      {modalMode === 'register'
                        ? 'Comece seu acompanhamento com precisão.'
                        : modalMode === 'forgot'
                        ? 'Enviaremos um link de redefinição para seu e-mail.'
                        : 'Entre para continuar sua evolução.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalMode('closed')}
                  className="bg-black hover:bg-[#151413] rounded-full w-[32px] h-[32px] flex items-center justify-center text-[#f59e0b] shrink-0 transition-colors"
                >
                  <X className="w-[14px] h-[14px] stroke-[2.5]" />
                </button>
              </div>

              {authError && (
                <div className="bg-[#ff6e61]/15 border border-[#ff6e61] text-[#b91c1c] text-xs font-semibold p-2.5 rounded-[10px]">
                  {authError}
                </div>
              )}

              {modalMode === 'forgot' ? (
                <form onSubmit={handlePasswordReset} className="space-y-[14px]">
                  {resetEmailSent && (
                    <div className="bg-[#151413] text-[#d3e156] text-xs font-semibold p-3 rounded-[12px]">
                      E-mail de recuperação enviado! Verifique sua caixa de entrada e spam.
                    </div>
                  )}

                  <div className="bg-[#151413] rounded-[12px] p-[10px]">
                    <label className="text-[10px] font-bold text-[#94a3b8] uppercase block mb-1">
                      Seu E-mail
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="exemplo@email.com"
                      className="w-full bg-black text-[#f8fafc] text-[13px] rounded-[8px] px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#f59e0b]"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingReset}
                    className="bg-black hover:bg-[#151413] disabled:opacity-50 min-h-[48px] pl-[16px] pr-[8px] py-[8px] rounded-full flex items-center justify-between w-full transition-transform active:scale-[0.98]"
                  >
                    <span className="font-heading font-semibold text-[#f8fafc] text-[17px] tracking-[0.45px] uppercase">
                      {submittingReset ? 'ENVIANDO...' : 'ENVIAR LINK DE RECUPERAÇÃO'}
                    </span>
                    <span className="bg-[#ffb95f] rounded-full w-[32px] h-[32px] flex items-center justify-center shrink-0">
                      <Check className="w-[15px] h-[15px] text-[#151413] stroke-[2.8]" />
                    </span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleAuthSubmit} className="space-y-[12px]">
                  <div className="bg-[#151413] rounded-[14px] p-[12px] space-y-[10px]">
                    {modalMode === 'register' && (
                      <div>
                        <label className="text-[10px] font-bold text-[#94a3b8] uppercase block mb-1">
                          Seu Nome
                        </label>
                        <input
                          type="text"
                          value={nome}
                          onChange={(e) => setNome(e.target.value)}
                          placeholder="Ex: Lucas Valini"
                          className="w-full bg-black text-[#f8fafc] text-[13px] rounded-[8px] px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#f59e0b]"
                          required
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-[10px] font-bold text-[#94a3b8] uppercase block mb-1">
                        E-mail
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="exemplo@email.com"
                        className="w-full bg-black text-[#f8fafc] text-[13px] rounded-[8px] px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#f59e0b]"
                        required
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-[#94a3b8] uppercase">
                          Senha
                        </label>
                        {modalMode === 'login' && (
                          <button
                            type="button"
                            onClick={() => openModal('forgot')}
                            className="text-[10px] font-semibold text-[#ffb95f] hover:underline"
                          >
                            Esqueci minha senha
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-black text-[#f8fafc] text-[13px] rounded-[8px] px-3 py-2.5 pr-10 focus:outline-none focus:ring-1 focus:ring-[#f59e0b]"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-white"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingAuth}
                    className="bg-black hover:bg-[#151413] disabled:opacity-50 min-h-[48px] pl-[16px] pr-[8px] py-[8px] rounded-full flex items-center justify-between w-full transition-transform active:scale-[0.98]"
                  >
                    <span className="font-heading font-semibold text-[#f8fafc] text-[17px] tracking-[0.45px] uppercase">
                      {submittingAuth
                        ? 'PROCESSANDO...'
                        : modalMode === 'register'
                        ? 'CRIAR CONTA E CONTINUAR'
                        : 'ENTRAR NA CONTA'}
                    </span>
                    <span className="bg-[#ffb95f] rounded-full w-[32px] h-[32px] flex items-center justify-center shrink-0">
                      {submittingAuth ? (
                        <Loader2 className="w-[15px] h-[15px] text-[#151413] animate-spin" />
                      ) : (
                        <Check className="w-[15px] h-[15px] text-[#151413] stroke-[2.8]" />
                      )}
                    </span>
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => openModal(modalMode === 'register' ? 'login' : 'register')}
                      className="text-xs font-semibold text-[#151413] hover:text-[#f59e0b] transition-colors"
                    >
                      {modalMode === 'register'
                        ? 'Já tem conta? Fazer login'
                        : 'Não tem conta? Criar agora'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
