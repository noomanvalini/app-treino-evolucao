'use client';

import React, { useEffect, useState, useRef } from 'react';
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
  Camera,
  Trash2,
  RefreshCw,
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoFeedback, setPhotoFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const compressAvatarFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Falha ao ler imagem.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Formato de imagem inválido.'));
        img.onload = () => {
          const size = 256;
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas indisponível.'));
            return;
          }
          // Center-crop square
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Selecione um arquivo de imagem válido.');
      return;
    }

    setUploadingPhoto(true);
    setErrorMsg('');
    try {
      const dataUrl = await compressAvatarFile(file);
      await updateProfile({ photoURL: dataUrl });
      setPhotoFeedback('Foto atualizada!');
      setTimeout(() => setPhotoFeedback(null), 2500);
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setErrorMsg('Não foi possível salvar a foto. Tente outra imagem.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRestoreGooglePhoto = async () => {
    if (!user?.photoURL) return;
    setUploadingPhoto(true);
    setErrorMsg('');
    try {
      await updateProfile({ photoURL: user.photoURL });
      setPhotoFeedback('Foto do Google restaurada!');
      setTimeout(() => setPhotoFeedback(null), 2500);
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao restaurar foto do Google.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    setUploadingPhoto(true);
    setErrorMsg('');
    try {
      await updateProfile({ photoURL: '' });
      setPhotoFeedback('Foto removida.');
      setTimeout(() => setPhotoFeedback(null), 2500);
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao remover foto.');
    } finally {
      setUploadingPhoto(false);
    }
  };

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

  const avatarSrc =
    profile.photoURL !== undefined ? profile.photoURL || null : user?.photoURL || null;
  const hasGooglePhoto = Boolean(user?.photoURL);
  const canRestoreGoogle = hasGooglePhoto && avatarSrc !== user?.photoURL;

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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoFileChange}
            className="hidden"
          />

          <div className="flex items-center gap-4">
            <button
              type="button"
              disabled={uploadingPhoto}
              onClick={() => fileInputRef.current?.click()}
              className="relative group shrink-0 rounded-full focus:outline-none"
              title="Alterar foto de perfil"
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={profile.nome}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-full object-cover border-2 border-[#f59e0b]/50 group-hover:border-[#f59e0b] transition-colors"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#ffb95f] text-[#100F0F] font-heading font-bold text-[22px] flex items-center justify-center shadow-md">
                  {initials}
                </div>
              )}

              <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#151413] border border-[#f59e0b]/60 text-[#ffb95f] flex items-center justify-center shadow-md group-hover:bg-[#f59e0b] group-hover:text-[#100F0F] transition-colors">
                {uploadingPhoto ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Camera className="w-3 h-3" />
                )}
              </span>
            </button>

            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-[17px] text-[#f8fafc] leading-tight truncate">
                {profile.nome}
              </h2>
              <div className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mt-1 truncate">
                <Mail className="h-3.5 w-3.5 shrink-0 text-[#64748b]" />
                <span className="truncate">{user?.email || profile.email}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                <button
                  type="button"
                  disabled={uploadingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] font-semibold text-[#ffb95f] hover:underline flex items-center gap-1"
                >
                  <Camera className="w-3 h-3" />
                  {avatarSrc ? 'Alterar foto' : 'Adicionar foto'}
                </button>

                {canRestoreGoogle && (
                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={handleRestoreGooglePhoto}
                    className="text-[11px] font-semibold text-[#94a3b8] hover:text-[#f8fafc] flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Usar do Google
                  </button>
                )}

                {avatarSrc && (
                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={handleRemovePhoto}
                    className="text-[11px] font-semibold text-[#ff6e61]/80 hover:text-[#ff6e61] flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remover
                  </button>
                )}
              </div>
            </div>
          </div>

          {photoFeedback && (
            <div className="bg-[#d3e156]/15 border border-[#d3e156]/35 text-[#d3e156] text-xs font-semibold px-3 py-2 rounded-[10px] flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{photoFeedback}</span>
            </div>
          )}

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
