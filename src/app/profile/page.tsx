'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import BottomNavigation from '@/components/BottomNavigation';
import { 
  User, Mail, Calendar, Ruler, LogOut, Save, Loader2, CheckCircle
} from 'lucide-react';

export default function Profile() {
  const { user, profile, loading: authLoading, updateProfile, logout } = useAuth();
  const router = useRouter();

  // Form States
  const [idade, setIdade] = useState('');
  const [altura, setAltura] = useState('');
  const [nome, setNome] = useState('');
  const [sexo, setSexo] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
      } else if (profile) {
        setNome(profile.nome);
        setIdade(profile.idade.toString());
        setAltura(profile.altura.toString());
        setSexo(profile.sexo);
      }
    }
  }, [user, authLoading, profile, router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setErrorMsg('');
    setSubmitting(true);

    const numIdade = parseInt(idade);
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
        nome: nome,
        idade: numIdade,
        altura: numAltura,
        sexo: sexo
      });

      setSuccess(true);
      // clear success notification after 3 seconds
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
      <div className="flex h-[80vh] flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-lime-neon" />
        <span className="mt-2 text-xs text-slate-400">Verificando credenciais...</span>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div>
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Configurações</span>
        <h1 className="text-2xl font-bold text-slate-100 mt-0.5">Meu Perfil</h1>
      </div>

      {/* User Card */}
      <div className="bg-slate-card border border-border rounded-2xl p-5 shadow flex items-center gap-4">
        <div className="rounded-full bg-lime-neon/10 p-3.5 text-lime-neon border border-lime-neon/20">
          <User className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-100">{profile.nome}</h2>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
            <Mail className="h-3 w-3" />
            <span>{user?.email}</span>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="bg-slate-card border border-border rounded-2xl p-5 shadow-lg space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Editar Informações</h3>

        {success && (
          <div className="bg-success/10 border border-success/20 text-success text-xs p-3 rounded-xl flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span>Perfil atualizado com sucesso!</span>
          </div>
        )}

        {errorMsg && (
          <div className="bg-danger/10 border border-danger/20 text-danger text-xs p-3 rounded-xl">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nome Completo</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-slate-card-light border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-lime-neon text-white font-semibold"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Idade (anos)
              </label>
              <input
                type="number"
                value={idade}
                onChange={(e) => setIdade(e.target.value)}
                className="w-full bg-slate-card-light border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-lime-neon text-white font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                <Ruler className="h-3.5 w-3.5" /> Altura (cm)
              </label>
              <input
                type="number"
                value={altura}
                onChange={(e) => setAltura(e.target.value)}
                className="w-full bg-slate-card-light border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-lime-neon text-white font-semibold"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Sexo</label>
            <select
              value={sexo}
              onChange={(e) => setSexo(e.target.value)}
              className="w-full bg-slate-card-light border border-border rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-lime-neon text-white font-semibold"
            >
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-lime-neon hover:bg-lime-neon-hover disabled:bg-slate-700 disabled:text-slate-400 text-slate-900 font-bold py-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 mt-4"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="h-4 w-4" /> Salvar Alterações
              </>
            )}
          </button>
        </form>
      </div>

      {/* Settings / Logout */}
      <div className="bg-slate-card border border-border rounded-2xl p-5 shadow-lg">
        <button
          onClick={handleLogout}
          className="w-full bg-danger/10 hover:bg-danger/25 text-danger font-bold py-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 border border-danger/25"
        >
          <LogOut className="h-4 w-4" /> Sair da Conta
        </button>
      </div>

      <BottomNavigation />
    </div>
  );
}
