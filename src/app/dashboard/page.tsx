'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import BottomNavigation from '@/components/BottomNavigation';
import InstallPWA from '@/components/InstallPWA';
import { Dumbbell, User, Award, Activity, TrendingUp, TrendingDown, ChevronRight, Loader2 } from 'lucide-react';

const MUSCLE_GROUPS = [
  'Peito',
  'Costas',
  'Ombro',
  'Bíceps',
  'Tríceps',
  'Antebraço',
  'Glúteos',
  'Quadríceps',
  'Posterior de Coxa',
  'Panturrilha/Canela'
];

interface StrengthLog {
  exerciseId: string;
  muscleGroup: string;
  oneRmCalculado: number;
  data: any; // Timestamp
}

export default function Dashboard() {
  const { user, profile, loading: authLoading, isOnboarding } = useAuth();
  const router = useRouter();

  const [loadingData, setLoadingData] = useState(true);
  const [muscleEvolutions, setMuscleEvolutions] = useState<Record<string, number>>({});
  const [generalScore, setGeneralScore] = useState<number>(0);

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
    try {
      // 1. Fetch all user logs
      const logsQuery = query(collection(db, 'strength_logs'), where('userId', '==', user.uid));
      const logsSnap = await getDocs(logsQuery);
      
      const logsList: StrengthLog[] = [];
      logsSnap.forEach((doc) => {
        const data = doc.data();
        logsList.push({
          exerciseId: data.exerciseId,
          muscleGroup: data.muscleGroup,
          oneRmCalculado: data.oneRmCalculado,
          data: data.data
        });
      });

      // Group logs by exercise ID
      const logsByExercise: Record<string, StrengthLog[]> = {};
      logsList.forEach((log) => {
        if (!logsByExercise[log.exerciseId]) {
          logsByExercise[log.exerciseId] = [];
        }
        logsByExercise[log.exerciseId].push(log);
      });

      // Calculate evolution per exercise
      // Delta = ((1RM_atual - 1RM_anterior) / 1RM_anterior) * 100
      const exerciseDeltas: Record<string, number> = {};
      Object.entries(logsByExercise).forEach(([exerciseId, logs]) => {
        // Sort chronologically (oldest to newest)
        const sorted = [...logs].sort((a, b) => {
          const timeA = a.data?.seconds ? a.data.seconds * 1000 : new Date(a.data).getTime();
          const timeB = b.data?.seconds ? b.data.seconds * 1000 : new Date(b.data).getTime();
          return timeA - timeB;
        });

        if (sorted.length >= 2) {
          const latest = sorted[sorted.length - 1].oneRmCalculado;
          const previous = sorted[sorted.length - 2].oneRmCalculado;
          
          if (previous > 0) {
            exerciseDeltas[exerciseId] = ((latest - previous) / previous) * 100;
          }
        }
      });

      // 2. Fetch all user exercises to map them to muscle groups
      const exercisesQuery = query(collection(db, 'exercises'), where('userId', '==', user.uid));
      const exercisesSnap = await getDocs(exercisesQuery);
      const exerciseToMuscle: Record<string, string> = {};
      
      exercisesSnap.forEach((doc) => {
        const data = doc.data();
        exerciseToMuscle[doc.id] = data.muscleGroup;
      });

      // Group exercise deltas by muscle group
      const deltasByMuscle: Record<string, number[]> = {};
      MUSCLE_GROUPS.forEach((m) => {
        deltasByMuscle[m] = [];
      });

      Object.entries(exerciseDeltas).forEach(([exerciseId, delta]) => {
        const muscle = exerciseToMuscle[exerciseId];
        if (muscle && deltasByMuscle[muscle]) {
          deltasByMuscle[muscle].push(delta);
        }
      });

      // Calculate muscle group evolution (average of exercise deltas)
      const evolutions: Record<string, number> = {};
      let totalDeltasSum = 0;
      let muscleGroupsWithDataCount = 0;

      Object.entries(deltasByMuscle).forEach(([muscle, deltas]) => {
        if (deltas.length > 0) {
          const avg = deltas.reduce((sum, d) => sum + d, 0) / deltas.length;
          evolutions[muscle] = Number(avg.toFixed(1));
          totalDeltasSum += avg;
          muscleGroupsWithDataCount++;
        } else {
          evolutions[muscle] = 0; // Default to 0 if no evolution data
        }
      });

      setMuscleEvolutions(evolutions);

      // Score Geral de Força (average of all active muscle groups)
      const generalScoreAvg = muscleGroupsWithDataCount > 0 
        ? totalDeltasSum / muscleGroupsWithDataCount 
        : 0;
      setGeneralScore(Number(generalScoreAvg.toFixed(1)));

    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
    } finally {
      setLoadingData(false);
    }
  };

  if (authLoading || loadingData) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-lime-neon" />
        <span className="mt-2 text-xs text-slate-400">Calculando métricas...</span>
      </div>
    );
  }

  if (!profile) return null;

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

      {/* Personal Info & IMC Card */}
      <div className="bg-slate-card border border-border rounded-2xl p-5 shadow-lg">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <Activity className="h-4 w-4 text-lime-neon" /> Resumo Físico
        </h2>
        <div className="grid grid-cols-3 gap-2 text-center mb-4">
          <div className="bg-slate-card-light/50 rounded-xl p-2.5 border border-border/30">
            <span className="block text-[10px] text-slate-400">Peso</span>
            <span className="text-base font-bold text-slate-100">{peso}kg</span>
          </div>
          <div className="bg-slate-card-light/50 rounded-xl p-2.5 border border-border/30">
            <span className="block text-[10px] text-slate-400">Idade</span>
            <span className="text-base font-bold text-slate-100">{profile.idade} anos</span>
          </div>
          <div className="bg-slate-card-light/50 rounded-xl p-2.5 border border-border/30">
            <span className="block text-[10px] text-slate-400">Altura</span>
            <span className="text-base font-bold text-slate-100">{alturaCm}cm</span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/50 pt-4">
          <div>
            <span className="text-[10px] text-slate-400 block">IMC Calculado</span>
            <span className="text-xl font-black text-slate-100">{imc.toFixed(1)}</span>
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
            <span className="text-3xl font-black text-slate-100">
              {generalScore >= 0 ? `+${generalScore}%` : `${generalScore}%`}
            </span>
            <span className="text-[10px] text-slate-400">de evolução geral de 1RM</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Média de evolução de força baseada na diferença entre as duas últimas medições de cada exercício cadastrado.
          </p>
        </div>
      </div>

      {/* Muscle Groups Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Evolução por Músculo</h2>
          <span className="text-[10px] text-slate-500">Toque para ver exercícios</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {MUSCLE_GROUPS.map((muscle) => {
            const val = muscleEvolutions[muscle] || 0;
            const hasData = val !== 0;
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
