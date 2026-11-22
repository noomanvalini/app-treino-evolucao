'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppHeader from '@/components/AppHeader';
import BottomNavigation from '@/components/BottomNavigation';
import {
  generatePersonalizedPlan,
  GeneratedWorkoutSplit,
} from '@/data/workoutPlanGenerator';
import {
  Dumbbell,
  Play,
  Clock,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Sparkles,
  Plus,
  Loader2,
  Flame,
  Target,
  Timer,
} from 'lucide-react';

export default function WorkoutsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  const plan = useMemo(() => generatePersonalizedPlan(profile), [profile]);

  useEffect(() => {
    if (plan.workouts.length > 0 && !expandedWorkoutId) {
      setExpandedWorkoutId(plan.workouts[0].id);
    }
  }, [plan.workouts, expandedWorkoutId]);

  const handleStartGeneratedWorkout = (workout: GeneratedWorkoutSplit) => {
    if (!user) return;
    const storageKey = `clipzbody_active_workout_${user.uid}`;

    const activePayload = {
      title: `Treino ${workout.codigo} • ${workout.nome}`,
      startedAt: Date.now(),
      isWorkoutStarted: false,
      elapsedSeconds: 0,
      restDurationSeconds: workout.descansoSegundos,
      exercises: workout.exercicios.map((ex, idx) => ({
        id: `ex_${Date.now()}_${idx}`,
        exerciseId: ex.exerciseId,
        nomeExercicio: ex.nomeExercicio,
        muscleGroup: ex.muscleGroup,
        thumbnailUrl: ex.thumbnailUrl || '',
        gifUrl: ex.gifUrl || '',
        description: ex.description || '',
        sets: Array.from({ length: ex.series }, (_, sIdx) => ({
          setNumber: sIdx + 1,
          cargaKg: '',
          reps: ex.defaultRepsNumber,
          completed: false,
        })),
      })),
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(activePayload));
    }

    router.push('/workout/active');
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#100F0F] flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#f59e0b]" />
        <span className="mt-2 text-xs text-[#94a3b8]">Carregando seus treinos...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#100F0F] text-[#f8fafc] pb-28">
      <AppHeader />

      <main className="py-4 max-w-md mx-auto space-y-[16px]">
        {/* Header */}
        <section className="flex items-start justify-between gap-2">
          <div>
            <h1 className="font-heading font-bold text-[#f8fafc] text-[24px] tracking-[-0.7px] uppercase leading-[30px]">
              MEUS TREINOS
            </h1>
            <p className="text-[12px] text-[#94a3b8] leading-[16px] mt-0.5">
              Plano personalizado com base no seu setup
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push('/onboarding')}
            className="bg-[#151413] hover:bg-white/10 border border-white/10 px-3 py-2 rounded-[10px] text-[11px] font-semibold text-[#ffb95f] flex items-center gap-1.5 shrink-0 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Recalibrar</span>
          </button>
        </section>

        {/* Active Cycle Config Banner */}
        <section className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] border border-white/[0.06] rounded-[16px] p-[14px] space-y-[12px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.6px] text-[#ffb95f] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              CONFIGURAÇÃO DO CICLO ATIVO
            </span>
            <span className="text-[10px] font-bold uppercase bg-[#f59e0b]/15 text-[#ffb95f] px-2 py-0.5 rounded-full">
              {plan.workouts.length} fichas
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-black/65 rounded-[10px] p-2.5 space-y-0.5">
              <span className="text-[9px] font-bold uppercase text-[#64748b] flex items-center gap-1">
                <Target className="w-2.5 h-2.5 text-[#f59e0b]" /> Objetivo
              </span>
              <span className="text-[12px] font-bold text-[#f8fafc] block leading-tight">
                {plan.objetivoLabel}
              </span>
            </div>

            <div className="bg-black/65 rounded-[10px] p-2.5 space-y-0.5">
              <span className="text-[9px] font-bold uppercase text-[#64748b] flex items-center gap-1">
                <Flame className="w-2.5 h-2.5 text-[#f59e0b]" /> Foco
              </span>
              <span className="text-[12px] font-bold text-[#f8fafc] block leading-tight">
                {plan.focoLabel}
              </span>
            </div>

            <div className="bg-black/65 rounded-[10px] p-2.5 space-y-0.5">
              <span className="text-[9px] font-bold uppercase text-[#64748b] flex items-center gap-1">
                <Timer className="w-2.5 h-2.5 text-[#d3e156]" /> Alvo
              </span>
              <span className="text-[12px] font-bold text-[#d3e156] block leading-tight">
                {plan.repsTarget} reps • {plan.descansoSegundos}s
              </span>
            </div>
          </div>
        </section>

        {/* Workout Split Cards */}
        <section className="space-y-[10px]">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="font-heading font-semibold text-[#f8fafc] text-[18px] tracking-[-0.18px] uppercase leading-[24px]">
              DIVISÃO SEMANAL ({plan.frequenciaLabel})
            </h2>
          </div>

          <div className="space-y-[10px]">
            {plan.workouts.map((workout) => {
              const isExpanded = expandedWorkoutId === workout.id;

              return (
                <article
                  key={workout.id}
                  className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] border border-white/[0.06] rounded-[16px] overflow-hidden transition-all"
                >
                  {/* Card Header */}
                  <div
                    onClick={() => setExpandedWorkoutId(isExpanded ? null : workout.id)}
                    className="p-[14px] flex items-start justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-[40px] h-[40px] rounded-[10px] bg-[#f59e0b] text-[#100F0F] font-heading font-bold text-[20px] flex items-center justify-center shrink-0 shadow-sm">
                        {workout.codigo}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-[#f8fafc] text-[15px] leading-[20px]">
                          {workout.nome}
                        </h3>
                        <div className="flex items-center gap-2 text-[11px] text-[#94a3b8] mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Dumbbell className="w-3 h-3 text-[#ffb95f]" />
                            {workout.exercicios.length} exercícios
                          </span>
                          <span>•</span>
                          <span>{workout.totalSets} séries</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />~{workout.estimatedMinutes}m
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-1 text-[#94a3b8] shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-[#ffb95f]" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Exercises List + Start CTA */}
                  {isExpanded && (
                    <div className="px-[14px] pb-[14px] pt-[6px] border-t border-white/[0.06] space-y-[10px] animate-in fade-in duration-150">
                      <div className="space-y-[6px]">
                        {workout.exercicios.map((ex, i) => (
                          <div
                            key={`${ex.exerciseId}_${i}`}
                            className={`rounded-[10px] px-3 py-2 flex items-center justify-between gap-2 ${
                              ex.isFocusBonus
                                ? 'bg-[#f59e0b]/10 border border-[#f59e0b]/30'
                                : 'bg-black/60'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[13px] font-semibold text-[#f8fafc] truncate">
                                  {ex.nomeExercicio}
                                </span>
                                {ex.isFocusBonus && (
                                  <span className="text-[9px] font-bold uppercase bg-[#f59e0b]/25 text-[#ffb95f] px-1.5 py-0.5 rounded shrink-0">
                                    Foco
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-[#64748b] block">
                                {ex.muscleGroup}
                              </span>
                            </div>

                            <span className="font-mono font-bold text-[12px] text-[#d3e156] shrink-0">
                              {ex.series} × {ex.repsTarget}
                            </span>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartGeneratedWorkout(workout)}
                        className="w-full bg-[#f8fafc] hover:bg-white min-h-[46px] pl-[18px] pr-[8px] py-[8px] rounded-full flex items-center justify-between transition-transform active:scale-[0.98]"
                      >
                        <span className="font-heading font-semibold text-[#202017] text-[16px] tracking-[0.4px] uppercase">
                          INICIAR TREINO {workout.codigo}
                        </span>
                        <span className="w-[32px] h-[32px] rounded-full bg-[#ffb95f] flex items-center justify-center shrink-0">
                          <Play className="w-[14px] h-[14px] text-[#202017] fill-current ml-0.5" />
                        </span>
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        {/* Free / Custom Workout CTA */}
        <button
          type="button"
          onClick={() => router.push('/workout/active')}
          className="w-full py-3.5 px-4 rounded-[14px] bg-[#151413] hover:bg-[#1c1c13] border border-dashed border-[#f59e0b]/45 text-[#ffb95f] text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Montar Treino Livre Agora
        </button>
      </main>

      <BottomNavigation />
    </div>
  );
}
