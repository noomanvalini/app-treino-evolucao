'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, UserProfile } from '@/context/AuthContext';
import AppHeader from '@/components/AppHeader';
import BottomNavigation from '@/components/BottomNavigation';
import {
  Mail,
  Calendar,
  Ruler,
  LogOut,
  Save,
  Loader2,
  CheckCircle,
  SlidersHorizontal,
  Target,
  Flame,
  Dumbbell,
  ChevronRight,
  Scale,
} from 'lucide-react';

const OBJETIVO_LABELS: Record<NonNullable<UserProfile['objetivo']>, string> = {
  hipertrofia: 'Hipertrofia',
  forca: 'Força',
  definicao: 'Definição',
  condicionamento: 'Condicionamento',
};

const FREQUENCIA_LABELS: Record<NonNullable<UserProfile['frequenciaSemanal']>, string> = {
  '2-3': '2-3 dias/sem',
  '4-5': '4-5 dias/sem',
  '6': '6 dias/sem',
  flexivel: 'Flexível',
};

const FOCO_LABELS: Record<NonNullable<UserProfile['focoMuscularGrupo']>, string> = {
  corpo_inteiro: 'Corpo Inteiro',
  superiores: 'Superiores',
  inferiores: 'Inferiores',
};

export default function Profile() {
  const { user, profile, loading: authLoading, updateProfile, logout } = useAuth();
  const router = useRouter();

  // Form States
  const [idade, setIdade] = useState('');
  const [altura, setAltura] = useState('');
  const [nome, setNome] = useState('');
  const [sexo, setSexo] = useState('M');

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
      } else if (profile) {
        setNome(profile.nome || '');
        setIdade(profile.idade ? profile.idade.toString() : '');
        setAltura(profile.altura ? profile.altura.toString() : '');
        setSexo(profile.sexo || 'M');
      }
    }
  }, [user, authLoading, profile, router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setErrorMsg('');
    setSubmitting(true);

    const numIdade = parseInt(idade, 10);
    const numAltura = parseFloat(altura);

    if (isNaN(numIdade) || numIdade <= 0) {
      setErrorMsg('Idade inválida.');
      setSubmitting(false);
      return;
    }

    if (isNaN(numAltura) || numAltura <= 30 || numAltura > 300) {
      setErrorMsg('Altura inválida (digite em centímetros, ex: 175).');
      setSubmitting(false);
      return;
    }

    try {
      await updateProfile({
        nome: nome.trim(),
        idade: numIdade,
        altura: numAltura,
        sexo,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao atualizar perfil. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#100F0F] flex flex-col items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-[#f59e0b]" />
        <span className="mt-2.5 text-xs text-[#94a3b8]">Carregando perfil...</span>
      </div>
    );
  }

  if (!profile) return null;

  const initials = (profile.nome || user?.email || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const objetivoLabel = profile.objetivo ? OBJETIVO_LABELS[profile.objetivo] : 'Hipertrofia';
  const frequenciaLabel = profile.frequenciaSemanal
    ? FREQUENCIA_LABELS[profile.frequenciaSemanal]
    : '4-5 dias/sem';
  const focoLabel = profile.focoMuscularGrupo
    ? FOCO_LABELS[profile.focoMuscularGrupo]
    : 'Corpo Inteiro';

  return (
    <div className="min-h-screen bg-[#100F0F] text-[#f8fafc] pb-28 -mx-4 px-4">
      <AppHeader />

      <main className="pt-4 space-y-5">
        {/* Page Heading */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.8px] text-[#ffb95f]">
            Conta & Preferências
          </span>
          <h1 className="font-heading font-bold text-[#f8fafc] text-[24px] tracking-[-0.24px] uppercase leading-[28px] mt-0.5">
            MEU PERFIL
          </h1>
        </div>

        {/* User Identity Hero Card */}
        <section className="bg-[#151413] border border-white/[0.08] rounded-[16px] p-5 space-y-4">
          <div className="flex items-center gap-4">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={profile.nome}
                className="w-14 h-14 rounded-full object-cover border-2 border-[#f59e0b]/40 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#ffb95f] text-[#100F0F] font-heading font-bold text-[20px] flex items-center justify-center shrink-0 shadow-md">
                {initials}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-[17px] text-[#f8fafc] leading-tight truncate">
                {profile.nome}
              </h2>
              <div className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mt-1 truncate">
                <Mail className="h-3.5 w-3.5 shrink-0 text-[#64748b]" />
                <span className="truncate">{user?.email || profile.email}</span>
              </div>
            </div>
          </div>

          {/* Quick Biometrics Strip */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/[0.06]">
            <div className="bg-[#100F0F] border border-white/[0.06] rounded-[12px] px-3 py-2.5 text-center">
              <span className="text-[10px] uppercase tracking-wider text-[#64748b] block">
                Idade
              </span>
              <span className="font-mono font-bold text-[14px] text-[#f8fafc] mt-0.5 block">
                {profile.idade || '--'} <span className="text-[10px] text-[#94a3b8] font-sans">anos</span>
              </span>
            </div>
            <div className="bg-[#100F0F] border border-white/[0.06] rounded-[12px] px-3 py-2.5 text-center">
              <span className="text-[10px] uppercase tracking-wider text-[#64748b] block">
                Altura
              </span>
              <span className="font-mono font-bold text-[14px] text-[#f8fafc] mt-0.5 block">
                {profile.altura || '--'} <span className="text-[10px] text-[#94a3b8] font-sans">cm</span>
              </span>
            </div>
            <div className="bg-[#100F0F] border border-white/[0.06] rounded-[12px] px-3 py-2.5 text-center">
              <span className="text-[10px] uppercase tracking-wider text-[#64748b] block flex items-center justify-center gap-1">
                <Scale className="w-2.5 h-2.5" /> Peso
              </span>
              <span className="font-mono font-bold text-[14px] text-[#d3e156] mt-0.5 block">
                {profile.pesoAtual ? profile.pesoAtual.toFixed(1) : '--'}{' '}
                <span className="text-[10px] text-[#94a3b8] font-sans">kg</span>
              </span>
            </div>
          </div>
        </section>

        {/* Training Plan / Onboarding Summary Card */}
        <section className="bg-[#151413] border border-white/[0.08] rounded-[16px] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-semibold text-[#f8fafc] text-[16px] uppercase leading-[20px]">
                SETUP DE TREINO
              </h3>
              <span className="text-[11px] text-[#94a3b8]">
                Usado pela IA para montar sua divisão semanal
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#100F0F] border border-white/[0.06] rounded-[12px] p-2.5 space-y-1">
              <Target className="w-3.5 h-3.5 text-[#ffb95f]" />
              <span className="block text-[9px] uppercase tracking-wider text-[#64748b]">
                Objetivo
              </span>
              <span className="block text-[11px] font-bold text-[#f8fafc] truncate">
                {objetivoLabel}
              </span>
            </div>

            <div className="bg-[#100F0F] border border-white/[0.06] rounded-[12px] p-2.5 space-y-1">
              <Flame className="w-3.5 h-3.5 text-[#d3e156]" />
              <span className="block text-[9px] uppercase tracking-wider text-[#64748b]">
                Frequência
              </span>
              <span className="block text-[11px] font-bold text-[#f8fafc] truncate">
                {frequenciaLabel}
              </span>
            </div>

            <div className="bg-[#100F0F] border border-white/[0.06] rounded-[12px] p-2.5 space-y-1">
              <Dumbbell className="w-3.5 h-3.5 text-[#ffb95f]" />
              <span className="block text-[9px] uppercase tracking-wider text-[#64748b]">
                Foco
              </span>
              <span className="block text-[11px] font-bold text-[#f8fafc] truncate">
                {focoLabel}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push('/onboarding')}
            className="w-full bg-[#f59e0b]/15 hover:bg-[#f59e0b]/25 border border-[#f59e0b]/30 text-[#ffb95f] font-semibold py-3 px-4 rounded-[12px] text-[12px] transition-colors flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Refazer Setup de Treino (Onboarding)
            </span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </section>

        {/* Edit Profile Form */}
        <section className="bg-[#151413] border border-white/[0.08] rounded-[16px] p-5 space-y-4">
          <div>
            <h3 className="font-heading font-semibold text-[#f8fafc] text-[16px] uppercase leading-[20px]">
              DADOS PESSOAIS
            </h3>
            <span className="text-[11px] text-[#94a3b8]">
              Mantenha suas medidas atualizadas para cálculos precisos
            </span>
          </div>

          {success && (
            <div className="bg-[#d3e156]/15 border border-[#d3e156]/35 text-[#d3e156] text-xs font-semibold p-3 rounded-[12px] flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>Perfil atualizado com sucesso!</span>
            </div>
          )}

          {errorMsg && (
            <div className="bg-[#ff6e61]/15 border border-[#ff6e61]/35 text-[#ff6e61] text-xs font-semibold p-3 rounded-[12px]">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-1.5">
                Nome Completo
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full bg-[#100F0F] border border-white/[0.08] rounded-[12px] px-4 py-3 text-sm focus:outline-none focus:border-[#f59e0b] text-[#f8fafc] font-semibold placeholder:text-[#64748b]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-1.5 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-[#ffb95f]" /> Idade (anos)
                </label>
                <input
                  type="number"
                  value={idade}
                  onChange={(e) => setIdade(e.target.value)}
                  className="w-full bg-[#100F0F] border border-white/[0.08] rounded-[12px] px-4 py-3 text-sm focus:outline-none focus:border-[#f59e0b] text-[#f8fafc] font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-1.5 flex items-center gap-1">
                  <Ruler className="h-3.5 w-3.5 text-[#ffb95f]" /> Altura (cm)
                </label>
                <input
                  type="number"
                  value={altura}
                  onChange={(e) => setAltura(e.target.value)}
                  className="w-full bg-[#100F0F] border border-white/[0.08] rounded-[12px] px-4 py-3 text-sm focus:outline-none focus:border-[#f59e0b] text-[#f8fafc] font-mono font-bold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-1.5">
                Sexo
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'M', label: 'Masculino' },
                  { value: 'F', label: 'Feminino' },
                  { value: 'Outro', label: 'Outro' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSexo(opt.value)}
                    className={`py-2.5 rounded-[12px] text-[12px] font-semibold transition-all border ${
                      sexo === opt.value
                        ? 'bg-[#f59e0b] text-[#100F0F] border-[#f59e0b]'
                        : 'bg-[#100F0F] text-[#94a3b8] border-white/[0.08] hover:text-[#f8fafc]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#f8fafc] hover:bg-white disabled:opacity-50 min-h-[48px] pl-[20px] pr-[8px] py-[8px] rounded-full flex items-center justify-between transition-transform active:scale-[0.98] mt-2"
            >
              <span className="font-heading font-semibold text-[#202017] text-[15px] tracking-[0.4px] uppercase">
                {submitting ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
              </span>
              <span className="w-[34px] h-[34px] rounded-full bg-[#ffb95f] flex items-center justify-center shrink-0">
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#202017]" />
                ) : (
                  <Save className="h-4 w-4 text-[#202017]" />
                )}
              </span>
            </button>
          </form>
        </section>

        {/* Account Logout */}
        <section className="bg-[#151413] border border-white/[0.08] rounded-[16px] p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full bg-[#ff6e61]/10 hover:bg-[#ff6e61]/20 border border-[#ff6e61]/25 text-[#ff6e61] font-semibold py-3 px-4 rounded-[12px] text-[13px] transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sair da Conta
          </button>
        </section>
      </main>

      <BottomNavigation />
    </div>
  );
}
