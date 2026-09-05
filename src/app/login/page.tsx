'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Dumbbell, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';
import ClipzBodyIcon from '@/components/ClipzBodyIcon';

export default function Login() {
  const { user, profile, isOnboarding, updateProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  // Auth States
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [submittingAuth, setSubmittingAuth] = useState(false);
  
  // Forgot Password & Social Login States
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [submittingReset, setSubmittingReset] = useState(false);
  const [submittingGoogle, setSubmittingGoogle] = useState(false);

  // Onboarding States
  const [idade, setIdade] = useState('');
  const [altura, setAltura] = useState('');
  const [sexo, setSexo] = useState('M');
  const [pesoAtual, setPesoAtual] = useState('');
  const [onboardingError, setOnboardingError] = useState('');
  const [submittingOnboard, setSubmittingOnboard] = useState(false);

  // Redirection Logic
  useEffect(() => {
    if (!authLoading) {
      if (user && !isOnboarding) {
        router.push('/dashboard');
      }
    }
  }, [user, isOnboarding, authLoading, router]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setSubmittingAuth(true);

    if (!email || !password) {
      setAuthError('Preencha todos os campos.');
      setSubmittingAuth(false);
      return;
    }

    if (isRegister && !nome) {
      setAuthError('Preencha o campo nome.');
      setSubmittingAuth(false);
      return;
    }

    try {
      if (isRegister) {
        // Create user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // We'll create user document in Firestore on onboarding submit
        // Store name locally in user context or temp state
        // Actually, updateProfile handles setDoc in Firestore
        // We will call updateProfile with { nome, dataCriacao: new Date() } to kickstart profile
        // but we'll show onboarding form immediately after
      } else {
        // Sign in
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setAuthError('Este email já está em uso.');
      } else if (err.code === 'auth/invalid-credential') {
        setAuthError('Email ou senha incorretos.');
      } else if (err.code === 'auth/weak-password') {
        setAuthError('A senha deve ter pelo menos 6 caracteres.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setAuthError('Erro: O provedor de login "E-mail/Senha" não está ativado no console do Firebase (Authentication -> Sign-in method).');
      } else if (err.code === 'auth/unauthorized-domain') {
        setAuthError('Erro: Este domínio não está autorizado nas configurações do Firebase Authentication (Configurações -> Domínios autorizados).');
      } else {
        setAuthError(`Erro (${err.code || 'unknown'}): ${err.message || 'Ocorreu um erro. Tente novamente.'}`);
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
        setAuthError('Erro: O login com Google não está ativado no console do Firebase (Authentication -> Sign-in method).');
      } else if (err.code === 'auth/unauthorized-domain') {
        setAuthError('Erro: Este domínio não está autorizado nas configurações do Firebase Authentication (Configurações -> Domínios autorizados).');
      } else {
        setAuthError(`Erro (${err.code || 'unknown'}): ${err.message || 'Falha ao autenticar com o Google.'}`);
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
      setAuthError('Por favor, digite seu e-mail no campo.');
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
        setAuthError(`Erro (${err.code || 'unknown'}): ${err.message || 'Falha ao enviar e-mail de recuperação.'}`);
      }
    } finally {
      setSubmittingReset(false);
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardingError('');
    setSubmittingOnboard(true);

    const numIdade = parseInt(idade);
    const numAltura = parseFloat(altura);
    const numPeso = parseFloat(pesoAtual);

    if (!idade || !altura || !pesoAtual) {
      setOnboardingError('Preencha todos os campos de onboarding.');
      setSubmittingOnboard(false);
      return;
    }

    if (isNaN(numIdade) || numIdade <= 0) {
      setOnboardingError('Idade inválida.');
      setSubmittingOnboard(false);
      return;
    }

    if (isNaN(numAltura) || numAltura <= 30 || numAltura > 300) {
      setOnboardingError('Altura inválida (digite em centímetros, ex: 175).');
      setSubmittingOnboard(false);
      return;
    }

    if (isNaN(numPeso) || numPeso <= 10) {
      setOnboardingError('Peso inválido (digite em kg, ex: 72.5).');
      setSubmittingOnboard(false);
      return;
    }

    try {
      // Save onboarding data in Firestore users/{userId}
      await updateProfile({
        nome: nome || user?.displayName || 'Usuário',
        idade: numIdade,
        altura: numAltura,
        sexo: sexo,
        pesoAtual: numPeso,
        dataCriacao: new Date(),
      });
      // also create initial measurement in body_measurements/{measurementId}
      const imcCalculado = numPeso / Math.pow(numAltura / 100, 2);
      
      const { collection, addDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      await addDoc(collection(db, 'body_measurements'), {
        userId: user?.uid,
        pesoKg: numPeso,
        imcCalculado: Number(imcCalculado.toFixed(1)),
        medidas: {},
        data: new Date()
      });

      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      setOnboardingError('Erro ao salvar os dados. Tente novamente.');
    } finally {
      setSubmittingOnboard(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-lime-neon" />
        <span className="mt-2 text-xs text-slate-400">Verificando sessão...</span>
      </div>
    );
  }

  // Show onboarding form if logged in but profile is empty
  if (user && isOnboarding) {
    return (
      <div className="flex min-h-[80vh] flex-col justify-center py-6">
        <div className="w-full bg-slate-card border border-border rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4 text-lime-neon">
            <Sparkles className="h-6 w-6 animate-pulse" />
            <h2 className="text-xl font-bold">Quase lá!</h2>
          </div>
          <p className="text-slate-300 text-xs mb-6">
            Precisamos de algumas informações básicas para calcular seu IMC e acompanhar sua evolução de treino.
          </p>

          {onboardingError && (
            <div className="bg-danger/10 border border-danger/20 text-danger text-xs p-3 rounded-lg mb-4">
              {onboardingError}
            </div>
          )}

          <form onSubmit={handleOnboardingSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Seu Nome</label>
              <input
                type="text"
                placeholder="Ex: João Silva"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full bg-slate-card-light border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-lime-neon text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Idade (anos)</label>
                <input
                  type="number"
                  placeholder="Ex: 26"
                  value={idade}
                  onChange={(e) => setIdade(e.target.value)}
                  className="w-full bg-slate-card-light border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-lime-neon text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Altura (cm)</label>
                <input
                  type="number"
                  placeholder="Ex: 175"
                  value={altura}
                  onChange={(e) => setAltura(e.target.value)}
                  className="w-full bg-slate-card-light border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-lime-neon text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Sexo</label>
                <select
                  value={sexo}
                  onChange={(e) => setSexo(e.target.value)}
                  className="w-full bg-slate-card-light border border-border rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-lime-neon text-white"
                >
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Peso Atual (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 78.5"
                  value={pesoAtual}
                  onChange={(e) => setPesoAtual(e.target.value)}
                  className="w-full bg-slate-card-light border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-lime-neon text-white"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingOnboard}
              className="w-full bg-lime-neon hover:bg-lime-neon-hover disabled:bg-slate-700 disabled:text-slate-400 text-slate-900 font-bold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 mt-6"
            >
              {submittingOnboard ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando dados...
                </>
              ) : (
                'Concluir Onboarding'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Forgot Password View
  if (!user && isForgotPassword) {
    return (
      <div className="flex min-h-[80vh] flex-col justify-center py-6">
        <div className="flex flex-col items-center mb-8">
          <div className="rounded-full bg-lime-neon/10 p-4 text-lime-neon mb-3">
            <ClipzBodyIcon className="h-10 w-10 text-lime-neon" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-wider text-slate-100">ClipzBody</h1>
          <p className="text-xs text-slate-400 mt-1">Evolua sua força e medidas corporais</p>
        </div>

        <div className="w-full bg-slate-card border border-border rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-xl font-bold text-slate-100">Recuperar Senha</h2>
          <p className="text-slate-300 text-xs leading-relaxed">
            Digite seu e-mail abaixo e enviaremos um link de redefinição de senha para você.
          </p>

          {authError && (
            <div className="bg-danger/10 border border-danger/20 text-danger text-xs p-3 rounded-lg">
              {authError}
            </div>
          )}

          {resetEmailSent && (
            <div className="bg-success/10 border border-success/20 text-success text-xs p-3 rounded-lg">
              E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada.
            </div>
          )}

          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email</label>
              <input
                type="email"
                placeholder="exemplo@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-card-light border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-lime-neon text-white"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submittingReset}
              className="w-full bg-lime-neon hover:bg-lime-neon-hover disabled:bg-slate-700 disabled:text-slate-400 text-slate-900 font-bold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 mt-4"
            >
              {submittingReset ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar E-mail de Recuperação'
              )}
            </button>
          </form>

          <div className="pt-2 text-center">
            <button
              onClick={() => {
                setIsForgotPassword(false);
                setAuthError('');
                setResetEmailSent(false);
              }}
              className="text-xs text-lime-neon hover:underline font-bold"
            >
              Voltar para o Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Login / Register Form
  return (
    <div className="flex min-h-[80vh] flex-col justify-center py-6">
      <div className="flex flex-col items-center mb-8">
        <div className="rounded-full bg-lime-neon/10 p-4 text-lime-neon mb-3">
          <ClipzBodyIcon className="h-10 w-10 text-lime-neon" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-wider text-slate-100">ClipzBody</h1>
        <p className="text-xs text-slate-400 mt-1">Evolua sua força e medidas corporais</p>
      </div>

      <div className="w-full bg-slate-card border border-border rounded-2xl p-6 shadow-xl">
        <h2 className="text-xl font-bold text-slate-100 mb-6">
          {isRegister ? 'Criar Nova Conta' : 'Acessar Minha Conta'}
        </h2>

        {authError && (
          <div className="bg-danger/10 border border-danger/20 text-danger text-xs p-3 rounded-lg mb-4">
            {authError}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Seu Nome</label>
              <input
                type="text"
                placeholder="Ex: João Silva"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full bg-slate-card-light border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-lime-neon text-white"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email</label>
            <input
              type="email"
              placeholder="exemplo@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-card-light border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-lime-neon text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-card-light border border-border rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:border-lime-neon text-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {!isRegister && (
            <div className="flex justify-end mt-1">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(true);
                  setAuthError('');
                  setResetEmailSent(false);
                }}
                className="text-xs text-slate-400 hover:text-lime-neon hover:underline"
              >
                Esqueci minha senha
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={submittingAuth}
            className="w-full bg-lime-neon hover:bg-lime-neon-hover disabled:bg-slate-700 disabled:text-slate-400 text-slate-900 font-bold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 mt-6"
          >
            {submittingAuth ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : isRegister ? (
              'Cadastrar'
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/50"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
            <span className="bg-slate-card px-2 text-slate-400">Ou continuar com</span>
          </div>
        </div>

        <button
          type="button"
          disabled={submittingGoogle}
          onClick={handleGoogleSignIn}
          className="w-full bg-slate-card-light hover:bg-slate-card-light/80 border border-border disabled:bg-slate-700 disabled:text-slate-400 text-slate-100 font-bold py-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-3"
        >
          {submittingGoogle ? (
            <Loader2 className="h-4 w-4 animate-spin text-lime-neon" />
          ) : (
            <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          Entrar com o Google
        </button>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setAuthError('');
            }}
            className="text-xs text-slate-400 hover:text-lime-neon hover:underline"
          >
            {isRegister ? 'Já tenho uma conta. Entrar' : 'Não tem conta? Cadastre-se'}
          </button>
        </div>
      </div>
    </div>
  );
}
