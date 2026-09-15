'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import BottomNavigation from '@/components/BottomNavigation';
import InstallPWA from '@/components/InstallPWA';
import WeeklyInsightsCard from '@/components/WeeklyInsightsCard';
import WeeklyVolumeBars from '@/components/WeeklyVolumeBars';
import { Dumbbell, User, Award, Activity, TrendingUp, TrendingDown, ChevronRight, Loader2, AlertTriangle, Play, Clock, Sparkles } from 'lucide-react';
import BodyMap from '@/components/BodyMap';
import { PREDEFINED_EXERCISES, MUSCLE_GROUPS } from '@/data/exercises';

interface StrengthLog {
  exerciseId: string;
  muscleGroup: string;
  oneRmCalculado: number;
  cargaKg: number;
  reps: number;
  data: any; // Timestamp
}

export default function Dashboard() {
  const { user, profile, loading: authLoading, isOnboarding, firestoreError, logout } = useAuth();
  const router = useRouter();

  const [loadingData, setLoadingData] = useState(true);
  const [userLogs, setUserLogs] = useState<StrengthLog[]>([]);
  const [muscleEvolutions, setMuscleEvolutions] = useState<Record<string, number>>({});
  const [musclesWithData, setMusclesWithData] = useState<Record<string, { hasLogs: boolean; hasMultipleSessions: boolean }>>({});
  const [generalScore, setGeneralScore] = useState<number>(0);
  const [timedOut, setTimedOut] = useState(false);
  const [localDbError, setLocalDbError] = useState<string | null>(null);
  
  // State for interactive body map selection
  const [selectedMuscle, setSelectedMuscle] = useState<string>('');

  // Active workout in progress check
  const [activeWorkout, setActiveWorkout] = useState<{ title: string; elapsedSeconds: number } | null>(null);

  useEffect(() => {
    if (user && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`clipzbody_active_workout_${user.uid}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed.exercises) && parsed.exercises.length > 0) {
            const now = Date.now();
            const diff = parsed.lastSavedAt ? Math.floor((now - parsed.lastSavedAt) / 1000) : 0;
            const currentElapsed = (parsed.elapsedSeconds || 0) + (parsed.isTimerPaused ? 0 : diff);
            setActiveWorkout({
              title: parsed.title || 'Treino do Dia',
              elapsedSeconds: currentElapsed
            });
          }
        }
      } catch (e) {
        console.error('Error checking active workout:', e);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
      } else if (isOnboarding) {
        router.replace('/login');
      } else {
        fetchMetrics();
      }
    }
  }, [user, authLoading, isOnboarding, router]);

  const fetchMetrics = async () => {
    if (!user) return;
    setLoadingData(true);
    setTimedOut(false);
    setLocalDbError(null);

    const timer = setTimeout(() => {
      setTimedOut(true);
    }, 6000);

    try {
      // Helper: extract session date key (YYYY-MM-DD)
      const getSessionDateKey = (rawDate: any): string => {
        if (!rawDate) return '';
        const d = rawDate?.seconds ? new Date(rawDate.seconds * 1000) : new Date(rawDate);
        if (isNaN(d.getTime())) return '';
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };

      // 1. Fetch user exercises to map them to muscle groups (predefined + custom)
      const exercisesQuery = query(collection(db, 'exercises'), where('userId', '==', user.uid));
      const exercisesSnap = await getDocs(exercisesQuery);
      const exerciseToMuscle: Record<string, string> = {};

      // Load all predefined exercises
      PREDEFINED_EXERCISES.forEach((pe) => {
        exerciseToMuscle[pe.id] = pe.muscleGroup;
      });

      // Load user custom exercises
      exercisesSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const name = (data.nomeExercicio || '').toLowerCase();

        // Biomechanical rule: Flexora (Mesa/Cadeira) & Stiff belong strictly to Posterior de Coxa
        if (name.includes('flexora') || name.includes('stiff') || data.predefinedId?.includes('flexora') || data.predefinedId?.includes('stiff')) {
          exerciseToMuscle[docSnap.id] = 'Posterior de Coxa';
          if (data.muscleGroup === 'Quadríceps') {
            deleteDoc(docSnap.ref).catch(console.error);
          }
        } else {
          exerciseToMuscle[docSnap.id] = data.muscleGroup;
        }
      });

      // 2. Fetch all user logs
      const logsQuery = query(collection(db, 'strength_logs'), where('userId', '==', user.uid));
      const logsSnap = await getDocs(logsQuery);

      const logsList: StrengthLog[] = [];
      const logsByExercise: Record<string, StrengthLog[]> = {};
      const musclesWithLogsSet = new Set<string>();

      logsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        let muscle = data.muscleGroup;

        // Biomechanical rules & self-healing for flexora / stiff
        const isFlexoraOrStiff =
          data.exerciseId === 'pre_mesa_flexora' ||
          data.exerciseId === 'pre_cadeira_flexora' ||
          data.exerciseId === 'pre_stiff' ||
          data.exerciseId?.toLowerCase().includes('flexora') ||
          data.exerciseId?.toLowerCase().includes('stiff') ||
          exerciseToMuscle[data.exerciseId] === 'Posterior de Coxa';

        if (isFlexoraOrStiff) {
          muscle = 'Posterior de Coxa';
          if (data.muscleGroup !== 'Posterior de Coxa') {
            updateDoc(docSnap.ref, { muscleGroup: 'Posterior de Coxa' }).catch(console.error);
          }
        } else if (!muscle && exerciseToMuscle[data.exerciseId]) {
          muscle = exerciseToMuscle[data.exerciseId];
        }

        if (muscle) {
          musclesWithLogsSet.add(muscle);
        }

        const logObj: StrengthLog = {
          exerciseId: data.exerciseId,
          muscleGroup: muscle,
          oneRmCalculado: data.oneRmCalculado || 0,
          cargaKg: data.cargaKg || 0,
          reps: data.reps || 0,
          data: data.data
        };

        logsList.push(logObj);

        if (!logsByExercise[data.exerciseId]) {
          logsByExercise[data.exerciseId] = [];
        }
        logsByExercise[data.exerciseId].push(logObj);
      });
      setUserLogs(logsList);

      // 3. Group by workout session per exercise and extract peak 1RM (RP)
      const deltasByMuscle: Record<string, number[]> = {};
      const muscleMultipleSessions: Record<string, boolean> = {};
      MUSCLE_GROUPS.forEach((m) => {
        deltasByMuscle[m] = [];
        muscleMultipleSessions[m] = false;
      });

      Object.entries(logsByExercise).forEach(([exerciseId, logs]) => {
        let muscle = exerciseToMuscle[exerciseId];
        if (!muscle) {
          const sample = logs[0];
          muscle = sample?.muscleGroup;
        }
        if (exerciseId === 'pre_mesa_flexora' || exerciseId?.toLowerCase().includes('flexora') || exerciseId?.toLowerCase().includes('stiff')) {
          muscle = 'Posterior de Coxa';
        }

        // Group sets by session date key
        const sessionsMap: Record<string, StrengthLog[]> = {};
        logs.forEach((l) => {
          const dateKey = getSessionDateKey(l.data) || 'single';
          if (!sessionsMap[dateKey]) sessionsMap[dateKey] = [];
          sessionsMap[dateKey].push(l);
        });

        // Find peak 1RM per workout session
        const sessionPeaks = Object.entries(sessionsMap).map(([dateKey, sets]) => {
          const max1RM = Math.max(...sets.map((s) => s.oneRmCalculado || 0));
          const sampleDate = sets[0]?.data;
          const time = sampleDate?.seconds ? sampleDate.seconds * 1000 : new Date(sampleDate).getTime();
          return { dateKey, time, peak1RM: max1RM };
        });

        sessionPeaks.sort((a, b) => a.time - b.time);

        // If at least 2 distinct workout sessions exist, compute progression between latest and previous peak
        if (muscle && sessionPeaks.length >= 2) {
          const latestPeak = sessionPeaks[sessionPeaks.length - 1].peak1RM;
          const previousPeak = sessionPeaks[sessionPeaks.length - 2].peak1RM;
          if (previousPeak > 0) {
            const exerciseDelta = ((latestPeak - previousPeak) / previousPeak) * 100;
            if (deltasByMuscle[muscle]) {
              deltasByMuscle[muscle].push(exerciseDelta);
              muscleMultipleSessions[muscle] = true;
            }
          }
        }
      });

      // 4. Calculate muscle group evolution (average of exercise deltas)
      const evolutions: Record<string, number> = {};
      const withDataState: Record<string, { hasLogs: boolean; hasMultipleSessions: boolean }> = {};
      let totalDeltasSum = 0;
      let muscleGroupsWithDataCount = 0;

      MUSCLE_GROUPS.forEach((muscle) => {
        const deltas = deltasByMuscle[muscle] || [];
        const hasLogs = musclesWithLogsSet.has(muscle);
        const hasMultiple = muscleMultipleSessions[muscle] && deltas.length > 0;

        withDataState[muscle] = {
          hasLogs,
          hasMultipleSessions: hasMultiple
        };

        if (hasMultiple) {
          const avg = deltas.reduce((sum, d) => sum + d, 0) / deltas.length;
          evolutions[muscle] = Number(avg.toFixed(1));
          totalDeltasSum += avg;
          muscleGroupsWithDataCount++;
        } else {
          evolutions[muscle] = 0;
        }
      });

      setMuscleEvolutions(evolutions);
      setMusclesWithData(withDataState);

      // Score Geral de Força (average of all active muscle groups with progress)
      const generalScoreAvg = muscleGroupsWithDataCount > 0 
        ? totalDeltasSum / muscleGroupsWithDataCount 
        : 0;
      setGeneralScore(Number(generalScoreAvg.toFixed(1)));

    } catch (error: any) {
      console.error('Error fetching dashboard metrics:', error);
      setLocalDbError(error.message || String(error));
    } finally {
      clearTimeout(timer);
      setLoadingData(false);
    }
  };

  const dbError = firestoreError || localDbError;

  if (authLoading || (loadingData && !timedOut && !dbError)) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-lime-neon" />
        <span className="mt-2 text-xs text-slate-400">Calculando métricas...</span>
      </div>
    );
  }

  // Display helpful database error/timeout template
  if (dbError || timedOut || !profile) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center py-6">
        <div className="bg-slate-card border border-border rounded-2xl p-6 shadow-xl w-full max-w-sm text-center space-y-4">
          <div className="rounded-full bg-danger/10 p-4 text-danger w-fit mx-auto border border-danger/20">
            <AlertTriangle className="h-8 w-8 animate-bounce" />
          </div>
          <h2 className="text-base font-bold text-slate-100">Falha na conexão do Banco de Dados</h2>
          
          <div className="bg-slate-card-light/50 border border-border/30 rounded-xl p-3 text-xs text-slate-300 text-left space-y-2 leading-relaxed">
            {timedOut ? (
              <p>⏱️ **Tempo limite esgotado**: A conexão com o Firestore demorou mais que o esperado.</p>
            ) : dbError ? (
              <p>❌ **Erro**: {dbError}</p>
            ) : (
              <p>👤 **Perfil não encontrado**: Não foi possível carregar os seus dados de perfil.</p>
            )}
            
            <p className="font-semibold text-lime-neon mt-2">Como resolver:</p>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
              <li>Certifique-se de que ativou o **Cloud Firestore** no console do Firebase.</li>
              <li>Verifique se as **Regras do Firestore** estão ativadas no modo de teste ou permitem escrita/leitura.</li>
              <li>Confirme se as chaves em `.env.local` e na Vercel estão corretas.</li>
            </ul>
          </div>

          <button
            onClick={() => {
              setTimedOut(false);
              setLocalDbError(null);
              router.refresh();
              fetchMetrics();
            }}
            className="w-full bg-lime-neon hover:bg-lime-neon-hover text-slate-900 font-bold py-3 rounded-xl text-xs transition-colors"
          >
            Tentar Novamente
          </button>
          
          <button
            onClick={() => logout()}
            className="w-full bg-slate-card-light hover:bg-slate-card-light/80 text-slate-300 font-semibold py-2 rounded-xl text-xs transition-colors border border-border"
          >
            Sair da Conta
          </button>
        </div>
      </div>
    );
  }

  // IMC Calculation
  // IMC = Peso / (Altura_m)^2
  const peso = profile.pesoAtual || 70;
  const alturaCm = profile.altura || 170;
  const imc = peso / Math.pow(alturaCm / 100, 2);
  
  let imcClass = 'Saudável';
  let imcColor = 'text-success border-success/20 bg-success/10';
  
  if (imc < 18.5) {
    imcClass = 'Abaixo do peso';
    imcColor = 'text-orange-500 border-orange-500/20 bg-orange-500/10';
  } else if (imc >= 18.5 && imc < 25) {
    imcClass = 'Saudável';
    imcColor = 'text-success border-success/20 bg-success/10';
  } else if (imc >= 25 && imc < 30) {
    imcClass = 'Sobrepeso';
    imcColor = 'text-orange-500 border-orange-500/20 bg-orange-500/10';
  } else {
    imcClass = 'Obesidade';
    imcColor = 'text-danger border-danger/20 bg-danger/10';
  }

  return (
    <div className="space-y-6 pb-6">
      <InstallPWA />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Dashboard</span>
          <h1 className="text-2xl font-bold text-slate-100">Olá, {profile.nome.split(' ')[0]}!</h1>
        </div>
        <div className="rounded-full bg-slate-card p-2 border border-border">
          <User className="h-5 w-5 text-lime-neon" />
        </div>
      </div>

      {/* Active Workout In-Progress Banner */}
      {activeWorkout && (
        <div className="bg-gradient-to-r from-lime-neon/20 via-slate-card to-slate-card border border-lime-neon/50 rounded-2xl p-4 shadow-xl flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-lime-neon text-slate-900 flex items-center justify-center font-bold">
              <Play className="h-5 w-5 fill-current ml-0.5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-lime-neon block">
                Treino em Andamento
              </span>
              <h3 className="text-sm font-bold text-slate-100 truncate max-w-[180px] sm:max-w-xs">
                {activeWorkout.title}
              </h3>
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3 text-lime-neon" />
                {Math.floor(activeWorkout.elapsedSeconds / 60)}:{(activeWorkout.elapsedSeconds % 60).toString().padStart(2, '0')} decorridos
              </span>
            </div>
          </div>

          <button
            onClick={() => router.push('/workout/active')}
            className="px-4 py-2.5 bg-lime-neon hover:bg-lime-neon-hover text-slate-900 font-extrabold text-xs rounded-xl shadow-md shadow-lime-neon/20 transition-all flex items-center gap-1 active:scale-95 whitespace-nowrap"
          >
            Continuar <ChevronRight className="h-4 w-4 stroke-[3]" />
          </button>
        </div>
      )}

      {/* Start Workout Hero Card (If no active workout) */}
      {!activeWorkout && (
        <div className="bg-gradient-to-br from-slate-card via-slate-card to-slate-card-light/40 border border-lime-neon/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-2 opacity-10 pointer-events-none">
            <Dumbbell className="h-28 w-28 text-lime-neon" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-lime-neon flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Sessão em Tempo Real
              </span>
              <span className="text-[10px] font-semibold text-slate-400">Modo Ativo</span>
            </div>

            <h2 className="text-lg font-black text-slate-100 mb-1">Pronto para treinar hoje?</h2>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Marque séries, controle o tempo de descanso automático e registre suas cargas diretamente na academia.
            </p>

            <button
              onClick={() => router.push('/workout/active')}
              className="w-full py-3.5 px-4 bg-lime-neon hover:bg-lime-neon-hover text-slate-900 font-extrabold text-xs rounded-xl shadow-lg shadow-lime-neon/20 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Play className="h-4 w-4 fill-current" /> Iniciar Treino Ativo
            </button>

            {/* Quick Preset Buttons */}
            <div className="grid grid-cols-3 gap-1.5 mt-2.5">
              {[
                { label: 'Peito & Tríceps', preset: 'Peito' },
                { label: 'Costas & Bíceps', preset: 'Costas' },
                { label: 'Pernas Completo', preset: 'Quadríceps' }
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => router.push(`/workout/active?preset=${encodeURIComponent(item.preset)}`)}
                  className="py-1.5 px-1 bg-slate-card-light/60 hover:bg-slate-card-light text-slate-300 text-[10px] font-semibold rounded-lg border border-border/40 text-center truncate transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Personal Info & IMC Card */}
      <div className="bg-slate-card border border-border rounded-2xl p-5 shadow-lg">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <Activity className="h-4 w-4 text-lime-neon" /> Resumo Físico
        </h2>
        <div className="grid grid-cols-3 gap-2 text-center mb-4">
          <div className="bg-slate-card-light/50 rounded-xl p-2.5 border border-border/30">
            <span className="block text-[10px] text-slate-400">Peso</span>
            <span className="text-lg font-bold font-heading text-slate-100">{peso}kg</span>
          </div>
          <div className="bg-slate-card-light/50 rounded-xl p-2.5 border border-border/30">
            <span className="block text-[10px] text-slate-400">Idade</span>
            <span className="text-lg font-bold font-heading text-slate-100">{profile.idade} anos</span>
          </div>
          <div className="bg-slate-card-light/50 rounded-xl p-2.5 border border-border/30">
            <span className="block text-[10px] text-slate-400">Altura</span>
            <span className="text-lg font-bold font-heading text-slate-100">{alturaCm}cm</span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/50 pt-4">
          <div>
            <span className="text-[10px] text-slate-400 block">IMC Calculado</span>
            <span className="text-2xl font-black font-heading text-slate-100">{imc.toFixed(1)}</span>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${imcColor}`}>
            {imcClass}
          </div>
        </div>
      </div>

      {/* General Strength Score Card */}
      <div className="bg-slate-card border border-border rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 opacity-5">
          <Award className="h-32 w-32" />
        </div>
        <div className="relative z-10">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Award className="h-4 w-4 text-lime-neon" /> Score Geral de Força
          </h2>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-4xl font-black font-heading text-slate-100 tracking-tight">
              {generalScore >= 0 ? `+${generalScore}%` : `${generalScore}%`}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">de evolução geral de 1RM</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Média de evolução de força baseada na diferença entre as duas últimas medições de cada exercício cadastrado.
          </p>
        </div>
      </div>

      {/* Mini-Gráfico Interativo de Volume Semanal */}
      <WeeklyVolumeBars logs={userLogs} />

      {/* Coach IA • Weekly Insights (Resumo Compacto com Link para /insights) */}
      {user && profile && (
        <WeeklyInsightsCard
          userId={user.uid}
          userName={profile.nome}
          pesoAtual={peso}
          userProfile={{
            idade: profile.idade,
            altura: profile.altura,
            sexo: profile.sexo
          }}
          logs={userLogs}
          compact={true}
        />
      )}

      {/* Interactive Body Map */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Visualizar Força Muscular</h2>
          <span className="text-[10px] text-slate-500">Toque nos músculos do boneco</span>
        </div>
        <BodyMap selectedMuscle={selectedMuscle} onMuscleSelect={setSelectedMuscle} />

        {/* Selected Muscle detail panel */}
        {selectedMuscle && (() => {
          const dataInfo = musclesWithData[selectedMuscle] || { hasLogs: false, hasMultipleSessions: false };
          const val = muscleEvolutions[selectedMuscle] || 0;
          const hasData = dataInfo.hasLogs;
          const hasMultipleSessions = dataInfo.hasMultipleSessions;
          const isPositive = val >= 0;

          return (
            <div className="bg-slate-card border border-lime-neon/20 bg-lime-neon/5 rounded-2xl p-4 shadow-md space-y-3 animate-fade-in max-w-sm mx-auto">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Grupo Selecionado</span>
                <span className="text-sm font-bold text-lime-neon">{selectedMuscle}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border/30 pt-3">
                <div>
                  <span className="text-[10px] text-slate-400 block">Evolução Geral</span>
                  {hasData ? (
                    hasMultipleSessions ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        {isPositive ? (
                          <>
                            <TrendingUp className="h-4 w-4 text-success" />
                            <span className="text-sm font-bold text-success">+{val}%</span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-4 w-4 text-danger" />
                            <span className="text-sm font-bold text-danger">{val}%</span>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-sm font-bold text-slate-200">0.0%</span>
                        <span className="text-[9px] font-bold bg-lime-neon/15 text-lime-neon border border-lime-neon/25 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          Base
                        </span>
                      </div>
                    )
                  ) : (
                    <span className="text-xs text-slate-500 font-medium block mt-0.5">Sem dados cadastrados</span>
                  )}
                </div>

                <button
                  onClick={() => router.push(`/strength?muscle=${encodeURIComponent(selectedMuscle)}`)}
                  className="bg-lime-neon hover:bg-lime-neon-hover text-slate-900 font-extrabold px-3 py-2 rounded-xl text-xs transition-colors flex items-center gap-1"
                >
                  Ver Exercícios
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Muscle Groups Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Evolução por Músculo</h2>
          <span className="text-[10px] text-slate-500">Toque para ver exercícios</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {MUSCLE_GROUPS.map((muscle) => {
            const dataInfo = musclesWithData[muscle] || { hasLogs: false, hasMultipleSessions: false };
            const val = muscleEvolutions[muscle] || 0;
            const hasData = dataInfo.hasLogs;
            const hasMultipleSessions = dataInfo.hasMultipleSessions;
            const isPositive = val >= 0;

            return (
              <button
                key={muscle}
                onClick={() => router.push(`/strength?muscle=${encodeURIComponent(muscle)}`)}
                className="bg-slate-card border border-border hover:border-slate-500 rounded-xl p-4 text-left shadow transition-all duration-200 flex flex-col justify-between h-28 group"
              >
                <div className="flex justify-between items-start w-full">
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-lime-neon transition-colors">
                    {muscle}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-lime-neon transition-colors" />
                </div>

                <div className="mt-4">
                  {hasData ? (
                    hasMultipleSessions ? (
                      <div className="flex items-center gap-1">
                        {isPositive ? (
                          <>
                            <TrendingUp className="h-4 w-4 text-success" />
                            <span className="text-sm font-bold text-success">+{val}%</span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-4 w-4 text-danger" />
                            <span className="text-sm font-bold text-danger">{val}%</span>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-200">0.0%</span>
                        <span className="text-[9px] font-bold bg-lime-neon/15 text-lime-neon border border-lime-neon/25 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          Base
                        </span>
                      </div>
                    )
                  ) : (
                    <span className="text-[10px] text-slate-500 font-medium">Sem histórico</span>
                  )}
                  <span className="text-[9px] text-slate-500 block mt-0.5">Variação de força</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
