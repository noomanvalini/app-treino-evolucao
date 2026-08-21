'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Dumbbell, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';

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
      } else {
        setAuthError('Ocorreu um erro. Tente novamente.');
      }
    } finally {
      setSubmittingAuth(false);
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

  // Login / Register Form
  return (
    <div className="flex min-h-[80vh] flex-col justify-center py-6">
      <div className="flex flex-col items-center mb-8">
        <div className="rounded-full bg-lime-neon/10 p-4 text-lime-neon mb-3">
          <Dumbbell className="h-10 w-10" />
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
