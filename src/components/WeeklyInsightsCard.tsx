'use client';

import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Sparkles, RefreshCw, Loader2, Trophy, AlertTriangle, Lightbulb, Flame } from 'lucide-react';
import { MUSCLE_GROUPS } from '@/data/exercises';

interface WeeklyInsight {
  destaqueSemanal: string;
  pontosAtencao: string;
  dicaTecnica: string;
  mensagemMotivacional: string;
  dataGeracao?: any;
}

interface StrengthLog {
  exerciseId: string;
  muscleGroup: string;
  cargaKg?: number;
  reps?: number;
  oneRmCalculado: number;
  data: any;
}

interface WeeklyInsightsCardProps {
  userId: string;
  userName: string;
  pesoAtual?: number;
  logs: StrengthLog[];
}

// Get ISO Week string like '2026-W36'
function getWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

export default function WeeklyInsightsCard({
  userId,
  userName,
  pesoAtual,
  logs
}: WeeklyInsightsCardProps) {
  const [insight, setInsight] = useState<WeeklyInsight | null>(null);
  const [loadingCache, setLoadingCache] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentWeekKey = getWeekKey();

  // 1. Check Firestore cache on mount
  useEffect(() => {
    async function loadCachedInsight() {
      if (!userId) return;
      setLoadingCache(true);
      try {
        const docRef = doc(db, 'weekly_insights', `${userId}_${currentWeekKey}`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setInsight(docSnap.data() as WeeklyInsight);
        } else {
          setInsight(null);
        }
      } catch (e) {
        console.error('Error loading cached weekly insight:', e);
      } finally {
        setLoadingCache(false);
      }
    }

    loadCachedInsight();
  }, [userId, currentWeekKey]);

  // Aggregate stats from logs
  const compileWorkoutStats = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekMs = oneWeekAgo.getTime();

    // Group logs by muscle
    const muscleMap: Record<string, { recentLogs: StrengthLog[]; allLogs: StrengthLog[] }> = {};
    MUSCLE_GROUPS.forEach((m) => {
      muscleMap[m] = { recentLogs: [], allLogs: [] };
    });

    logs.forEach((log) => {
      const group = log.muscleGroup;
      if (!muscleMap[group]) {
        muscleMap[group] = { recentLogs: [], allLogs: [] };
      }
      muscleMap[group].allLogs.push(log);

      const logTime = log.data?.seconds ? log.data.seconds * 1000 : new Date(log.data).getTime();
      if (logTime >= oneWeekMs) {
        muscleMap[group].recentLogs.push(log);
      }
    });

    const musculosTreinados: Array<{
      grupo: string;
      exercicios: number;
      deltaCargaMedio: string;
      melhor1RM: string;
    }> = [];

    const musculosSemRegistro: string[] = [];

    MUSCLE_GROUPS.forEach((group) => {
      const data = muscleMap[group];
      const recentCount = data.recentLogs.length;

      if (recentCount > 0) {
        // Calculate 1RM max
        let max1RM = 0;
        data.recentLogs.forEach((l) => {
          if (l.oneRmCalculado > max1RM) max1RM = l.oneRmCalculado;
        });

        // Calculate delta if possible
        let deltaStr = '0.0%';
        if (data.allLogs.length >= 2) {
          const sorted = [...data.allLogs].sort((a, b) => {
            const timeA = a.data?.seconds ? a.data.seconds * 1000 : new Date(a.data).getTime();
            const timeB = b.data?.seconds ? b.data.seconds * 1000 : new Date(b.data).getTime();
            return timeA - timeB;
          });
          const latest = sorted[sorted.length - 1]?.oneRmCalculado || 0;
          const previous = sorted[sorted.length - 2]?.oneRmCalculado || 0;
          if (previous > 0) {
            const diff = ((latest - previous) / previous) * 100;
            deltaStr = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
          }
        }

        musculosTreinados.push({
          grupo: group,
          exercicios: recentCount,
          deltaCargaMedio: deltaStr,
          melhor1RM: max1RM > 0 ? `${max1RM}kg` : 'N/A'
        });
      } else {
        musculosSemRegistro.push(group);
      }
    });

    return {
      nome: userName,
      pesoAtual: pesoAtual || 0,
      periodo: 'Últimos 7 dias',
      totalExerciciosRealizados: logs.filter((l) => {
        const logTime = l.data?.seconds ? l.data.seconds * 1000 : new Date(l.data).getTime();
        return logTime >= oneWeekMs;
      }).length,
      musculosTreinados,
      musculosSemRegistro
    };
  };

  const handleGenerateInsight = async () => {
    setGenerating(true);
    setErrorMessage(null);

    try {
      const stats = compileWorkoutStats();

      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao processar análise.');
      }

      const generatedInsight: WeeklyInsight = {
        ...data.insight,
        dataGeracao: new Date()
      };

      // Save to Firestore cache
      const docRef = doc(db, 'weekly_insights', `${userId}_${currentWeekKey}`);
      await setDoc(docRef, {
        ...generatedInsight,
        weekKey: currentWeekKey,
        userId
      });

      setInsight(generatedInsight);
    } catch (err: any) {
      console.error('Error generating insight:', err);
      setErrorMessage(err.message || 'Erro ao gerar análise com IA.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-slate-card border border-border rounded-2xl p-5 shadow-lg relative overflow-hidden space-y-4">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-lime-neon/5 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />

      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-lime-neon/10 text-lime-neon border border-lime-neon/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-lime-neon block">
              Coach IA ClipzBody
            </span>
            <h2 className="text-sm font-bold text-slate-100">Insights da Semana</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 bg-slate-card-light/60 px-2.5 py-1 rounded-full border border-border/40">
            {currentWeekKey.replace('W', 'Semana ')}
          </span>

          {insight && !generating && (
            <button
              onClick={handleGenerateInsight}
              title="Atualizar Análise"
              className="p-1.5 rounded-lg text-slate-400 hover:text-lime-neon hover:bg-slate-card-light transition-colors border border-border/40"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="bg-danger/10 border border-danger/20 text-danger text-xs p-3 rounded-xl">
          {errorMessage}
        </div>
      )}

      {loadingCache ? (
        <div className="py-6 flex justify-center items-center gap-2 text-xs text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin text-lime-neon" />
          <span>Verificando insights semanais...</span>
        </div>
      ) : generating ? (
        <div className="py-8 flex flex-col items-center justify-center gap-2.5 text-center">
          <div className="p-3 rounded-full bg-lime-neon/10 text-lime-neon animate-bounce">
            <Sparkles className="h-6 w-6" />
          </div>
          <span className="text-xs font-bold text-slate-200">
            Gemini analisando sua progressão de cargas...
          </span>
          <span className="text-[10px] text-slate-400 max-w-xs">
            Avaliando grupos em destaque, balanço muscular e preparando dicas para sua semana.
          </span>
        </div>
      ) : insight ? (
        <div className="space-y-3 relative z-10 text-xs">
          {/* Destaque */}
          {insight.destaqueSemanal && (
            <div className="bg-lime-neon/5 border border-lime-neon/20 rounded-xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-lime-neon font-bold text-[11px] uppercase tracking-wider">
                <Trophy className="h-3.5 w-3.5" /> Músculo em Destaque
              </div>
              <p className="text-slate-200 leading-relaxed text-xs">{insight.destaqueSemanal}</p>
            </div>
          )}

          {/* Pontos de Atenção */}
          {insight.pontosAtencao && (
            <div className="bg-danger/5 border border-danger/20 rounded-xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-danger font-bold text-[11px] uppercase tracking-wider">
                <AlertTriangle className="h-3.5 w-3.5" /> Pontos para Atenção
              </div>
              <p className="text-slate-300 leading-relaxed text-xs">{insight.pontosAtencao}</p>
            </div>
          )}

          {/* Dica Técnica */}
          {insight.dicaTecnica && (
            <div className="bg-slate-card-light/40 border border-border/40 rounded-xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px] uppercase tracking-wider">
                <Lightbulb className="h-3.5 w-3.5 text-lime-neon" /> Dica para Próxima Semana
              </div>
              <p className="text-slate-300 leading-relaxed text-xs">{insight.dicaTecnica}</p>
            </div>
          )}

          {/* Mensagem Motivacional */}
          {insight.mensagemMotivacional && (
            <div className="pt-2 border-t border-border/30 flex items-start gap-2 text-slate-400 italic text-[11px] leading-relaxed">
              <Flame className="h-3.5 w-3.5 text-lime-neon flex-shrink-0 mt-0.5" />
              <span>&ldquo;{insight.mensagemMotivacional}&rdquo;</span>
            </div>
          )}
        </div>
      ) : (
        /* Empty State / Invitation to Generate */
        <div className="bg-slate-card-light/30 border border-dashed border-border rounded-xl p-5 text-center space-y-3">
          <p className="text-xs text-slate-300 leading-relaxed">
            Obtenha uma análise detalhada dos músculos que mais evoluíram e identifique pontos que precisam de mais estímulo.
          </p>
          <button
            onClick={handleGenerateInsight}
            disabled={generating}
            className="w-full bg-lime-neon hover:bg-lime-neon-hover text-slate-900 font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow"
          >
            <Sparkles className="h-4 w-4" /> Gerar Análise Semanal com IA
          </button>
        </div>
      )}
    </div>
  );
}
