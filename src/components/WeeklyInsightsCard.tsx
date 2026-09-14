'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Sparkles, RefreshCw, Loader2, Trophy, AlertTriangle, Lightbulb, 
  Flame, Scale, Layers, Activity, TrendingUp, CheckCircle2, ChevronRight,
  ArrowDownRight, ArrowUpRight, Minus
} from 'lucide-react';
import { MUSCLE_GROUPS } from '@/data/exercises';
import type { 
  AsymmetryItem, 
  AsymmetryEvolutionItem, 
  PreviousAnalysisSummary, 
  InsightRequestStats 
} from '@/app/api/insights/route';

interface Medidas {
  bracoD?: number;
  bracoE?: number;
  antebracoD?: number;
  antebracoE?: number;
  torax?: number;
  cintura?: number;
  quadril?: number;
  coxaD?: number;
  coxaE?: number;
  panturrilhaD?: number;
  panturrilhaE?: number;
}

interface Measurement {
  id: string;
  pesoKg: number;
  imcCalculado: number;
  medidas: Medidas;
  data: any;
}

export interface WeeklyInsight {
  id?: string;
  weekKey?: string;
  userId?: string;
  resumoGeral?: string;
  destaqueSemanal: string;
  analiseMedidasEPeso?: string;
  analiseAssimetrias?: string;
  pontosAtencao: string;
  dicaTecnica: string;
  mensagemMotivacional: string;
  assimetriasDetectadas?: AsymmetryItem[];
  evolucaoAssimetrias?: AsymmetryEvolutionItem[];
  analiseAnteriorSnapshot?: PreviousAnalysisSummary | null;
  pesoInfo?: {
    pesoAtual: number;
    pesoAnterior?: number;
    deltaPesoKg?: string;
    imc?: number;
  };
  totalExercicios?: number;
  dataGeracao?: any;
  version?: number;
}

export interface StrengthLog {
  exerciseId: string;
  muscleGroup: string;
  cargaKg?: number;
  reps?: number;
  oneRmCalculado: number;
  data: any;
}

export interface WeeklyInsightsCardProps {
  userId: string;
  userName: string;
  pesoAtual?: number;
  userProfile?: {
    idade?: number;
    altura?: number;
    sexo?: string;
  };
  logs: StrengthLog[];
  compact?: boolean;
  onInsightGenerated?: (newInsight: WeeklyInsight) => void;
}

// Get ISO Week string like '2026-W37'
export function getWeekKey(date = new Date()): string {
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
  userProfile,
  logs,
  compact = false,
  onInsightGenerated
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

  // Aggregate stats from logs, measurements and historical analyses
  const compileHolisticStats = async (): Promise<{ 
    stats: InsightRequestStats; 
    assimetrias: AsymmetryItem[]; 
    evolucaoAssimetrias: AsymmetryEvolutionItem[]; 
    analiseAnterior: PreviousAnalysisSummary | null;
    pesoInfo: any 
  }> => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekMs = oneWeekAgo.getTime();

    // Group workout logs by muscle
    const muscleMap: Record<string, { recentLogs: StrengthLog[]; allLogs: StrengthLog[] }> = {};
    MUSCLE_GROUPS.forEach((m) => {
      muscleMap[m] = { recentLogs: [], allLogs: [] };
    });

    logs.forEach((log) => {
      let group = log.muscleGroup;
      // Guarantee flexora exercises strictly map to Posterior de Coxa
      if (log.exerciseId === 'pre_mesa_flexora' || log.exerciseId?.toLowerCase().includes('flexora')) {
        group = 'Posterior de Coxa';
      }
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
        let max1RM = 0;
        data.recentLogs.forEach((l) => {
          if (l.oneRmCalculado > max1RM) max1RM = l.oneRmCalculado;
        });

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

    // 1. Fetch body measurements for user
    let rawMeasures: Measurement[] = [];
    try {
      const q = query(collection(db, 'body_measurements'), where('userId', '==', userId));
      const snap = await getDocs(q);
      snap.forEach((d) => {
        const item = d.data();
        rawMeasures.push({
          id: d.id,
          pesoKg: item.pesoKg,
          imcCalculado: item.imcCalculado,
          medidas: item.medidas || {},
          data: item.data
        });
      });
    } catch (err) {
      console.warn('Could not fetch body measurements for insights:', err);
    }

    // Sort newest first
    rawMeasures.sort((a, b) => {
      const timeA = a.data?.seconds ? a.data.seconds * 1000 : new Date(a.data).getTime();
      const timeB = b.data?.seconds ? b.data.seconds * 1000 : new Date(b.data).getTime();
      return timeB - timeA;
    });

    // 2. Fetch past insights to provide continuity from previous analysis
    let analiseAnterior: PreviousAnalysisSummary | null = null;
    try {
      const pastQ = query(collection(db, 'weekly_insights'), where('userId', '==', userId));
      const pastSnap = await getDocs(pastQ);
      const pastList: WeeklyInsight[] = [];
      pastSnap.forEach((d) => {
        const item = d.data() as WeeklyInsight;
        if (item.weekKey !== currentWeekKey) {
          pastList.push(item);
        }
      });
      // Sort newest week first
      pastList.sort((a, b) => (b.weekKey || '').localeCompare(a.weekKey || ''));
      if (pastList.length > 0) {
        const prevDoc = pastList[0];
        const dateStr = prevDoc.dataGeracao?.seconds 
          ? new Date(prevDoc.dataGeracao.seconds * 1000).toLocaleDateString('pt-BR')
          : undefined;
        analiseAnterior = {
          semana: prevDoc.weekKey,
          dataGeracao: dateStr,
          destaqueAnterior: prevDoc.destaqueSemanal,
          pontosAtencaoAnterior: prevDoc.pontosAtencao,
          dicaPrescritaAnterior: prevDoc.dicaTecnica,
          resumoGeralAnterior: prevDoc.resumoGeral
        };
      }
    } catch (err) {
      console.warn('Could not fetch previous insights:', err);
    }

    let medidasCorporais: InsightRequestStats['medidasCorporais'] = null;
    let assimetrias: AsymmetryItem[] = [];
    let evolucaoAssimetrias: AsymmetryEvolutionItem[] = [];

    let pesoInfo: any = {
      pesoAtual: pesoAtual || 0,
      imc: userProfile?.altura && pesoAtual ? Number((pesoAtual / Math.pow(userProfile.altura / 100, 2)).toFixed(1)) : undefined
    };

    if (rawMeasures.length > 0) {
      const latest = rawMeasures[0];
      const prev = rawMeasures.length > 1 ? rawMeasures[1] : null;

      const dateToLocale = (raw: any) => {
        const d = raw?.seconds ? new Date(raw.seconds * 1000) : new Date(raw);
        return isNaN(d.getTime()) ? undefined : d.toLocaleDateString('pt-BR');
      };

      const deltaPesoKg = prev ? `${(latest.pesoKg - prev.pesoKg) >= 0 ? '+' : ''}${(latest.pesoKg - prev.pesoKg).toFixed(1)}kg` : undefined;

      pesoInfo = {
        pesoAtual: latest.pesoKg,
        pesoAnterior: prev?.pesoKg,
        deltaPesoKg,
        imc: latest.imcCalculado
      };

      // Calculate deltas for body parts
      const deltaMedidasCm: Record<string, string> = {};
      if (prev && prev.medidas) {
        Object.entries(latest.medidas).forEach(([k, v]) => {
          const prevVal = prev.medidas[k as keyof Medidas];
          if (prevVal !== undefined && v !== undefined) {
            const diff = v - prevVal;
            deltaMedidasCm[k] = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}cm`;
          }
        });
      }

      medidasCorporais = {
        dataAtual: dateToLocale(latest.data) || 'Recente',
        dataAnterior: prev ? dateToLocale(prev.data) : undefined,
        medidasAtuais: latest.medidas as Record<string, number>,
        deltaMedidasCm: Object.keys(deltaMedidasCm).length > 0 ? deltaMedidasCm : undefined
      };

      // Calculate bilateral asymmetries and evolution between measurements
      const pairs = [
        { 
          membro: 'Braço', 
          d: latest.medidas.bracoD, 
          e: latest.medidas.bracoE, 
          prevD: prev?.medidas.bracoD, 
          prevE: prev?.medidas.bracoE 
        },
        { 
          membro: 'Antebraço', 
          d: latest.medidas.antebracoD, 
          e: latest.medidas.antebracoE,
          prevD: prev?.medidas.antebracoD, 
          prevE: prev?.medidas.antebracoE 
        },
        { 
          membro: 'Coxa', 
          d: latest.medidas.coxaD, 
          e: latest.medidas.coxaE,
          prevD: prev?.medidas.coxaD, 
          prevE: prev?.medidas.coxaE 
        },
        { 
          membro: 'Panturrilha', 
          d: latest.medidas.panturrilhaD, 
          e: latest.medidas.panturrilhaE,
          prevD: prev?.medidas.panturrilhaD, 
          prevE: prev?.medidas.panturrilhaE 
        }
      ];

      assimetrias = pairs
        .filter((p) => p.d !== undefined && p.e !== undefined && p.d > 0 && p.e > 0)
        .map((p) => {
          const d = p.d!;
          const e = p.e!;
          const diff = Math.abs(d - e);
          const ladoMaior = d > e ? 'Direito' : e > d ? 'Esquerdo' : 'Igual';
          let status = 'Simetria Perfeita';
          if (diff > 1.0) status = 'Assimetria Moderada/Atenção';
          else if (diff > 0.5) status = 'Leve Assimetria';
          else if (diff > 0) status = 'Simétrico';

          return {
            membro: p.membro,
            ladoDireito: `${d}cm`,
            ladoEsquerdo: `${e}cm`,
            diferenca: `${diff.toFixed(1)}cm`,
            ladoMaior,
            status
          };
        });

      // Evolution of asymmetries compared to previous measurement
      evolucaoAssimetrias = pairs
        .filter((p) => p.d !== undefined && p.e !== undefined && p.d > 0 && p.e > 0)
        .map((p) => {
          const d = p.d!;
          const e = p.e!;
          const currentDiff = Math.abs(d - e);
          const ladoMaior = d > e ? 'Direito' : e > d ? 'Esquerdo' : 'Igual';

          let status = 'Simetria Perfeita';
          if (currentDiff > 1.0) status = 'Assimetria Moderada/Atenção';
          else if (currentDiff > 0.5) status = 'Leve Assimetria';
          else if (currentDiff > 0) status = 'Simétrico';

          let assimetriaAnterior: string | undefined = undefined;
          let deltaAssimetriaCm: string | undefined = undefined;
          let evolucaoDescricao = 'Primeira medição com dados bilaterais';

          if (p.prevD !== undefined && p.prevE !== undefined && p.prevD > 0 && p.prevE > 0) {
            const prevDiff = Math.abs(p.prevD - p.prevE);
            assimetriaAnterior = `${prevDiff.toFixed(1)}cm`;
            const change = currentDiff - prevDiff;

            if (change < -0.05) {
              const melhora = Math.abs(change).toFixed(1);
              evolucaoDescricao = `Redução de ${melhora}cm na assimetria (progresso comprovado!)`;
              deltaAssimetriaCm = `-${melhora}cm`;
            } else if (change > 0.05) {
              const aumento = change.toFixed(1);
              evolucaoDescricao = `Assimetria aumentou em ${aumento}cm (requer atenção)`;
              deltaAssimetriaCm = `+${aumento}cm`;
            } else {
              evolucaoDescricao = 'Assimetria estável em relação à medição anterior';
              deltaAssimetriaCm = '0.0cm';
            }
          }

          return {
            membro: p.membro,
            assimetriaAnterior,
            assimetriaAtual: `${currentDiff.toFixed(1)}cm`,
            deltaAssimetriaCm,
            ladoMaiorAtual: ladoMaior,
            status,
            evolucaoDescricao
          };
        });
    }

    const recentWorkoutsCount = logs.filter((l) => {
      const logTime = l.data?.seconds ? l.data.seconds * 1000 : new Date(l.data).getTime();
      return logTime >= oneWeekMs;
    }).length;

    const stats: InsightRequestStats = {
      atleta: {
        nome: userName,
        idade: userProfile?.idade,
        alturaCm: userProfile?.altura,
        sexo: userProfile?.sexo
      },
      pesoCorporal: pesoInfo,
      medidasCorporais,
      assimetrias,
      evolucaoAssimetrias,
      analiseAnterior,
      treinosSemana: {
        periodo: 'Últimos 7 dias',
        totalExerciciosRealizados: recentWorkoutsCount,
        musculosTreinados,
        musculosSemRegistro
      }
    };

    return { stats, assimetrias, evolucaoAssimetrias, analiseAnterior, pesoInfo };
  };

  const handleGenerateInsight = async () => {
    setGenerating(true);
    setErrorMessage(null);

    try {
      const { stats, assimetrias, evolucaoAssimetrias, analiseAnterior, pesoInfo } = await compileHolisticStats();

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
        assimetriasDetectadas: assimetrias,
        evolucaoAssimetrias,
        analiseAnteriorSnapshot: analiseAnterior,
        pesoInfo,
        totalExercicios: stats.treinosSemana.totalExerciciosRealizados,
        dataGeracao: new Date(),
        weekKey: currentWeekKey,
        userId,
        version: 3
      };

      // Save to Firestore cache
      const docRef = doc(db, 'weekly_insights', `${userId}_${currentWeekKey}`);
      await setDoc(docRef, {
        ...generatedInsight,
        weekKey: currentWeekKey,
        userId
      });

      setInsight(generatedInsight);
      onInsightGenerated?.(generatedInsight);
    } catch (err: any) {
      console.error('Error generating insight:', err);
      setErrorMessage(err.message || 'Erro ao gerar análise com IA.');
    } finally {
      setGenerating(false);
    }
  };

  // Determine asymmetry overall badge
  const getAsymmetrySummaryBadge = () => {
    if (!insight?.assimetriasDetectadas || insight.assimetriasDetectadas.length === 0) {
      return null;
    }
    // Check if any asymmetry had a notable reduction (progress!)
    const improvedItem = insight.evolucaoAssimetrias?.find((a) => a.deltaAssimetriaCm?.startsWith('-'));
    if (improvedItem) {
      return {
        label: `✨ Melhora: ${improvedItem.membro} (${improvedItem.deltaAssimetriaCm})`,
        className: 'bg-success/15 text-success border-success/30 font-bold'
      };
    }
    const hasModerate = insight.assimetriasDetectadas.find((a) => a.status.includes('Atenção'));
    if (hasModerate) {
      return {
        label: `⚠️ Assimetria em ${hasModerate.membro} (${hasModerate.diferenca})`,
        className: 'bg-danger/10 text-danger border-danger/20'
      };
    }
    const hasMild = insight.assimetriasDetectadas.find((a) => a.status.includes('Leve'));
    if (hasMild) {
      return {
        label: `⚡ Leve assimetria em ${hasMild.membro} (${hasMild.diferenca})`,
        className: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      };
    }
    return {
      label: '✓ Excelente simetria bilateral',
      className: 'bg-success/10 text-success border-success/20'
    };
  };

  const asymmetryBadge = getAsymmetrySummaryBadge();

  // --- COMPACT VIEW (DASHBOARD) ---
  if (compact) {
    return (
      <div className="bg-slate-card border border-border rounded-2xl p-5 shadow-lg relative overflow-hidden space-y-4">
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
              <h2 className="text-sm font-bold text-slate-100">Análise da Semana</h2>
            </div>
          </div>

          <span className="text-[10px] font-bold text-slate-400 bg-slate-card-light/60 px-2.5 py-1 rounded-full border border-border/40">
            {currentWeekKey.replace('W', 'Semana ')}
          </span>
        </div>

        {loadingCache ? (
          <div className="py-4 flex justify-center items-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin text-lime-neon" />
            <span>Verificando análise da semana...</span>
          </div>
        ) : insight ? (
          <div className="space-y-3 relative z-10 text-xs">
            {/* Quick Chips */}
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold">
              {insight.pesoInfo?.pesoAtual ? (
                <div className="bg-slate-card-light/50 border border-border/40 px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-slate-300">
                  <Scale className="h-3 w-3 text-lime-neon" />
                  <span>Peso: <strong className="text-slate-100 font-bold">{insight.pesoInfo.pesoAtual}kg</strong></span>
                  {insight.pesoInfo.deltaPesoKg && (
                    <span className={insight.pesoInfo.deltaPesoKg.startsWith('+') ? 'text-success font-bold' : 'text-danger font-bold'}>
                      ({insight.pesoInfo.deltaPesoKg})
                    </span>
                  )}
                </div>
              ) : null}

              {asymmetryBadge && (
                <div className={`border px-2.5 py-1 rounded-lg flex items-center gap-1 ${asymmetryBadge.className}`}>
                  <Layers className="h-3 w-3" />
                  <span>{asymmetryBadge.label}</span>
                </div>
              )}
            </div>

            {/* Destaque Curto */}
            {insight.destaqueSemanal && (
              <div className="bg-lime-neon/5 border border-lime-neon/20 rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-lime-neon font-bold text-[10px] uppercase tracking-wider">
                  <Trophy className="h-3 w-3" /> Destaque: {insight.destaqueSemanal.split('.')[0]}
                </div>
              </div>
            )}

            {/* Link para aba dedicada com histórico */}
            <Link
              href="/insights"
              className="w-full bg-slate-card-light hover:bg-slate-card-light/80 text-lime-neon border border-lime-neon/30 font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Ver Análise Completa & Histórico</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 leading-relaxed">
              Receba um diagnóstico completo cruzando cargas, medidas corporais e assimetrias.
            </p>
            <Link
              href="/insights"
              className="w-full bg-lime-neon hover:bg-lime-neon-hover text-slate-900 font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" /> Ir para Aba de Análises
            </Link>
          </div>
        )}
      </div>
    );
  }

  // --- FULL VIEW (PAGE /INSIGHTS) ---
  return (
    <div className="bg-slate-card border border-border rounded-2xl p-5 shadow-lg relative overflow-hidden space-y-4">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-lime-neon/5 rounded-full blur-2xl pointer-events-none -mr-12 -mt-12" />

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
            <h2 className="text-sm font-bold text-slate-100">Análise da Semana Atual</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 bg-slate-card-light/60 px-2.5 py-1 rounded-full border border-border/40">
            {currentWeekKey.replace('W', 'Semana ')}
          </span>

          {insight && !generating && (
            <button
              onClick={handleGenerateInsight}
              title="Recalcular Análise da Semana"
              className="p-1.5 rounded-lg text-slate-400 hover:text-lime-neon hover:bg-slate-card-light transition-colors border border-border/40"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick summary chips when insight exists */}
      {insight && !generating && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/30 text-[10px] font-semibold">
          {insight.pesoInfo?.pesoAtual ? (
            <div className="bg-slate-card-light/50 border border-border/40 px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-slate-300">
              <Scale className="h-3 w-3 text-lime-neon" />
              <span>Peso: <strong className="text-slate-100 font-bold">{insight.pesoInfo.pesoAtual}kg</strong></span>
              {insight.pesoInfo.deltaPesoKg && (
                <span className={insight.pesoInfo.deltaPesoKg.startsWith('+') ? 'text-success font-bold' : 'text-danger font-bold'}>
                  ({insight.pesoInfo.deltaPesoKg})
                </span>
              )}
            </div>
          ) : null}

          {asymmetryBadge && (
            <div className={`border px-2.5 py-1 rounded-lg flex items-center gap-1 ${asymmetryBadge.className}`}>
              <Layers className="h-3 w-3" />
              <span>{asymmetryBadge.label}</span>
            </div>
          )}

          {typeof insight.totalExercicios === 'number' && (
            <div className="bg-slate-card-light/50 border border-border/40 px-2.5 py-1 rounded-lg text-slate-400">
              {insight.totalExercicios} séries/exercícios na semana
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="bg-danger/10 border border-danger/20 text-danger text-xs p-3 rounded-xl">
          {errorMessage}
        </div>
      )}

      {loadingCache ? (
        <div className="py-6 flex justify-center items-center gap-2 text-xs text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin text-lime-neon" />
          <span>Carregando análise da semana...</span>
        </div>
      ) : generating ? (
        <div className="py-8 flex flex-col items-center justify-center gap-2.5 text-center">
          <div className="p-3 rounded-full bg-lime-neon/10 text-lime-neon animate-bounce">
            <Sparkles className="h-6 w-6" />
          </div>
          <span className="text-xs font-bold text-slate-200">
            Gemini cruzando treinos, medidas, assimetrias e histórico...
          </span>
          <span className="text-[10px] text-slate-400 max-w-xs">
            Comparando com a análise anterior, avaliando redução de assimetria e traçando o novo plano.
          </span>
        </div>
      ) : insight ? (
        <div className="space-y-3 relative z-10 text-xs">
          {/* Legacy version upgrade banner if loaded old insight */}
          {(!insight.resumoGeral || !insight.analiseMedidasEPeso) && (
            <div className="bg-lime-neon/10 border border-lime-neon/30 rounded-xl p-3 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-200">
                ✨ Nova análise expandida disponível com comparativo histórico e assimetrias!
              </span>
              <button
                onClick={handleGenerateInsight}
                className="bg-lime-neon text-slate-900 font-bold px-3 py-1.5 rounded-lg text-[10px] flex-shrink-0 hover:bg-lime-neon-hover transition-colors"
              >
                Atualizar Agora
              </button>
            </div>
          )}

          {/* 1. Resumo Geral Integrado (Treino + Medidas + Peso + Histórico) */}
          {insight.resumoGeral && (
            <div className="bg-slate-card-light/40 border border-lime-neon/20 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-lime-neon font-bold text-[11px] uppercase tracking-wider">
                <Activity className="h-3.5 w-3.5" /> Visão Geral & Cruzamento Físico
              </div>
              <p className="text-slate-200 leading-relaxed text-xs">{insight.resumoGeral}</p>
            </div>
          )}

          {/* 2. Composição Corporal & Fita Métrica */}
          {insight.analiseMedidasEPeso && (
            <div className="bg-slate-card-light/30 border border-border/40 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-200 font-bold text-[11px] uppercase tracking-wider">
                <Scale className="h-3.5 w-3.5 text-lime-neon" /> Composição Corporal & Fita Métrica
              </div>
              <p className="text-slate-300 leading-relaxed text-xs">{insight.analiseMedidasEPeso}</p>
            </div>
          )}

          {/* 3. Diagnóstico de Assimetrias & Evolução entre Medições */}
          {insight.analiseAssimetrias && (
            <div className="bg-slate-card-light/30 border border-border/40 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-200 font-bold text-[11px] uppercase tracking-wider">
                  <Layers className="h-3.5 w-3.5 text-lime-neon" /> Diagnóstico de Assimetrias & Evolução
                </div>
              </div>

              {/* Bilateral Differences & Progression Visual Cards */}
              {insight.evolucaoAssimetrias && insight.evolucaoAssimetrias.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pb-1">
                  {insight.evolucaoAssimetrias.map((item, idx) => {
                    const isImproved = item.deltaAssimetriaCm?.startsWith('-');
                    const isWorse = item.deltaAssimetriaCm?.startsWith('+');
                    const isWarning = item.status.includes('Atenção');

                    return (
                      <div
                        key={idx}
                        className="bg-slate-card/80 border border-border/40 rounded-lg p-2.5 flex flex-col justify-between text-[10px] space-y-1"
                      >
                        <div className="flex justify-between items-center text-slate-400 font-medium">
                          <span className="font-bold text-slate-200">{item.membro}</span>
                          <span className={`font-bold text-[9px] px-1.5 py-0.5 rounded ${
                            isWarning 
                              ? 'bg-danger/10 text-danger border border-danger/20' 
                              : item.status.includes('Leve') 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                              : 'bg-success/10 text-success border border-success/20'
                          }`}>
                            Δ Atual: {item.assimetriaAtual}
                          </span>
                        </div>

                        {item.assimetriaAnterior && item.deltaAssimetriaCm && (
                          <div className="flex items-center justify-between text-[9px] pt-1 border-t border-border/30">
                            <span className="text-slate-400">
                              Anterior: {item.assimetriaAnterior} ➔ Atual: {item.assimetriaAtual}
                            </span>
                            <span className={`font-bold flex items-center gap-0.5 ${
                              isImproved ? 'text-success' : isWorse ? 'text-danger' : 'text-slate-400'
                            }`}>
                              {isImproved && <ArrowDownRight className="h-2.5 w-2.5" />}
                              {isWorse && <ArrowUpRight className="h-2.5 w-2.5" />}
                              {item.deltaAssimetriaCm}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : insight.assimetriasDetectadas && insight.assimetriasDetectadas.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 pt-1 pb-1">
                  {insight.assimetriasDetectadas.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-card/80 border border-border/40 rounded-lg p-2 flex flex-col justify-between text-[10px]"
                    >
                      <div className="flex justify-between items-center text-slate-400 font-medium">
                        <span>{item.membro}</span>
                        <span className="font-bold text-[9px] text-lime-neon">Δ {item.diferenca}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1 text-slate-200 text-[9px]">
                        <span>D: {item.ladoDireito}</span>
                        <span>E: {item.ladoEsquerdo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <p className="text-slate-300 leading-relaxed text-xs">{insight.analiseAssimetrias}</p>
            </div>
          )}

          {/* 4. Destaque Semanal */}
          {insight.destaqueSemanal && (
            <div className="bg-lime-neon/5 border border-lime-neon/20 rounded-xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-lime-neon font-bold text-[11px] uppercase tracking-wider">
                <Trophy className="h-3.5 w-3.5" /> Músculo em Destaque
              </div>
              <p className="text-slate-200 leading-relaxed text-xs">{insight.destaqueSemanal}</p>
            </div>
          )}

          {/* 5. Pontos de Atenção */}
          {insight.pontosAtencao && (
            <div className="bg-danger/5 border border-danger/20 rounded-xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-danger font-bold text-[11px] uppercase tracking-wider">
                <AlertTriangle className="h-3.5 w-3.5" /> Pontos para Atenção
              </div>
              <p className="text-slate-300 leading-relaxed text-xs">{insight.pontosAtencao}</p>
            </div>
          )}

          {/* 6. Dica Técnica */}
          {insight.dicaTecnica && (
            <div className="bg-slate-card-light/40 border border-border/40 rounded-xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px] uppercase tracking-wider">
                <Lightbulb className="h-3.5 w-3.5 text-lime-neon" /> Dica para Próxima Semana
              </div>
              <p className="text-slate-300 leading-relaxed text-xs">{insight.dicaTecnica}</p>
            </div>
          )}

          {/* 7. Mensagem Motivacional */}
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
            Obtenha uma análise completa cruzando seus <strong>treinos de força</strong>, <strong>medidas corporais</strong>, <strong>evolução do peso</strong> e o <strong>histórico de assimetrias</strong>.
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
