'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import BottomNavigation from '@/components/BottomNavigation';
import WeeklyInsightsCard, { WeeklyInsight, StrengthLog, getWeekKey } from '@/components/WeeklyInsightsCard';
import { 
  Sparkles, History, Calendar, ChevronDown, ChevronUp, Trophy, 
  AlertTriangle, Lightbulb, Flame, Scale, Layers, Loader2, Activity,
  ArrowDownRight, ArrowUpRight
} from 'lucide-react';

export default function InsightsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [userLogs, setUserLogs] = useState<StrengthLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [historyInsights, setHistoryInsights] = useState<WeeklyInsight[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expandedWeekKey, setExpandedWeekKey] = useState<string | null>(null);

  const currentWeekKey = getWeekKey();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
      } else {
        fetchLogs();
        fetchHistory();
      }
    }
  }, [user, authLoading, router]);

  const fetchLogs = async () => {
    if (!user) return;
    setLoadingLogs(true);
    try {
      const q = query(collection(db, 'strength_logs'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const list: StrengthLog[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        list.push({
          exerciseId: d.exerciseId,
          muscleGroup: d.muscleGroup,
          cargaKg: d.cargaKg,
          reps: d.reps,
          oneRmCalculado: d.oneRmCalculado,
          data: d.data
        });
      });
      setUserLogs(list);
    } catch (err) {
      console.error('Error fetching logs for insights page:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const q = query(collection(db, 'weekly_insights'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const list: WeeklyInsight[] = [];
      snap.forEach((doc) => {
        const d = doc.data() as WeeklyInsight;
        list.push({
          ...d,
          id: doc.id
        });
      });

      // Sort by weekKey / date descending (newest first)
      list.sort((a, b) => {
        const timeA = a.dataGeracao?.seconds ? a.dataGeracao.seconds * 1000 : new Date(a.dataGeracao || 0).getTime();
        const timeB = b.dataGeracao?.seconds ? b.dataGeracao.seconds * 1000 : new Date(b.dataGeracao || 0).getTime();
        return (timeB || 0) - (timeA || 0);
      });

      setHistoryInsights(list);
    } catch (err) {
      console.error('Error fetching insights history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (authLoading || (loadingLogs && !user)) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-lime-neon" />
        <span className="mt-2 text-xs text-slate-400">Carregando análises do Coach IA...</span>
      </div>
    );
  }

  // Filter history to separate current active week from past archives
  const pastInsights = historyInsights.filter((item) => item.weekKey !== currentWeekKey);

  return (
    <div className="space-y-6 pb-6">
      <BottomNavigation />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Coach IA • ClipzBody</span>
          <h1 className="text-2xl font-bold text-slate-100 mt-0.5">Análises & Histórico</h1>
        </div>
        <div className="p-2.5 rounded-2xl bg-lime-neon/10 text-lime-neon border border-lime-neon/20">
          <Sparkles className="h-6 w-6 animate-pulse" />
        </div>
      </div>

      {/* Current Week Active Card */}
      {user && profile && (
        <WeeklyInsightsCard
          userId={user.uid}
          userName={profile.nome}
          pesoAtual={profile.pesoAtual}
          userProfile={{
            idade: profile.idade,
            altura: profile.altura,
            sexo: profile.sexo
          }}
          logs={userLogs}
          compact={false}
          onInsightGenerated={() => {
            fetchHistory();
          }}
        />
      )}

      {/* History Timeline Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-lime-neon" />
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Linha do Tempo de Análises
            </h2>
          </div>
          <span className="text-[10px] font-semibold text-slate-500">
            {pastInsights.length} {pastInsights.length === 1 ? 'semana arquivada' : 'semanas arquivadas'}
          </span>
        </div>

        {loadingHistory ? (
          <div className="py-8 flex justify-center items-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin text-lime-neon" />
            <span>Carregando histórico...</span>
          </div>
        ) : pastInsights.length === 0 ? (
          <div className="bg-slate-card/40 border border-dashed border-border rounded-2xl p-6 text-center space-y-2">
            <Calendar className="h-8 w-8 text-slate-500 mx-auto mb-1" />
            <p className="text-xs font-semibold text-slate-300">Nenhuma análise passada arquivada ainda.</p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Ao gerar análises a cada semana, elas ficarão guardadas aqui cronologicamente para você acompanhar toda a sua evolução.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pastInsights.map((item) => {
              const isExpanded = expandedWeekKey === (item.id || item.weekKey);
              const dateStr = item.dataGeracao?.seconds 
                ? new Date(item.dataGeracao.seconds * 1000).toLocaleDateString('pt-BR')
                : 'Data arquivada';

              return (
                <div 
                  key={item.id || item.weekKey}
                  className="bg-slate-card border border-border rounded-2xl overflow-hidden shadow transition-all"
                >
                  {/* Summary Bar */}
                  <div 
                    onClick={() => setExpandedWeekKey(isExpanded ? null : (item.id || item.weekKey || ''))}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-card-light/40 transition-colors select-none"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100">
                          {item.weekKey?.replace('W', 'Semana ')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          • {dateStr}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        {item.pesoInfo?.pesoAtual && (
                          <span className="bg-slate-card-light/60 px-2 py-0.5 rounded text-slate-300 font-semibold border border-border/30">
                            {item.pesoInfo.pesoAtual}kg
                          </span>
                        )}

                        {item.destaqueSemanal && (
                          <span className="text-lime-neon font-semibold truncate max-w-[200px]">
                            🏆 {item.destaqueSemanal.split('.')[0]}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                        aria-label={isExpanded ? 'Recolher análise' : 'Expandir análise'}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-border/30 bg-slate-card-light/20 p-4 space-y-3.5 text-xs animate-fade-in">
                      {/* Visão Geral */}
                      {item.resumoGeral && (
                        <div className="bg-slate-card/80 border border-lime-neon/20 rounded-xl p-3 space-y-1">
                          <span className="text-lime-neon font-bold text-[10px] uppercase tracking-wider block">
                            Visão Geral da Época
                          </span>
                          <p className="text-slate-200 leading-relaxed text-xs">{item.resumoGeral}</p>
                        </div>
                      )}

                      {/* Composição & Medidas */}
                      {item.analiseMedidasEPeso && (
                        <div className="bg-slate-card/60 border border-border/30 rounded-xl p-3 space-y-1">
                          <span className="text-slate-300 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                            <Scale className="h-3 w-3 text-lime-neon" /> Composição & Medidas
                          </span>
                          <p className="text-slate-300 leading-relaxed text-xs">{item.analiseMedidasEPeso}</p>
                        </div>
                      )}

                      {/* Assimetrias & Evolução */}
                      {item.analiseAssimetrias && (
                        <div className="bg-slate-card/60 border border-border/30 rounded-xl p-3 space-y-2">
                          <span className="text-slate-300 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                            <Layers className="h-3 w-3 text-lime-neon" /> Assimetrias Diagnosticadas
                          </span>

                          {item.evolucaoAssimetrias && item.evolucaoAssimetrias.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {item.evolucaoAssimetrias.map((ev, i) => (
                                <div key={i} className="bg-slate-card border border-border/40 p-2 rounded-lg text-[10px]">
                                  <div className="flex justify-between font-bold text-slate-200">
                                    <span>{ev.membro}</span>
                                    <span>Δ {ev.assimetriaAtual}</span>
                                  </div>
                                  {ev.deltaAssimetriaCm && (
                                    <span className={ev.deltaAssimetriaCm.startsWith('-') ? 'text-success font-bold' : 'text-slate-400'}>
                                      Evolução: {ev.deltaAssimetriaCm}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : null}

                          <p className="text-slate-300 leading-relaxed text-xs">{item.analiseAssimetrias}</p>
                        </div>
                      )}

                      {/* Dica Técnica */}
                      {item.dicaTecnica && (
                        <div className="bg-slate-card/60 border border-border/30 rounded-xl p-3 space-y-1">
                          <span className="text-slate-300 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                            <Lightbulb className="h-3 w-3 text-lime-neon" /> Dica Recomendada
                          </span>
                          <p className="text-slate-300 leading-relaxed text-xs">{item.dicaTecnica}</p>
                        </div>
                      )}

                      {/* Mensagem Motivacional */}
                      {item.mensagemMotivacional && (
                        <div className="pt-2 border-t border-border/20 flex items-start gap-2 text-slate-400 italic text-[11px]">
                          <Flame className="h-3.5 w-3.5 text-lime-neon flex-shrink-0 mt-0.5" />
                          <span>&ldquo;{item.mensagemMotivacional}&rdquo;</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
