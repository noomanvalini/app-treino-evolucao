'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import AppHeader from '@/components/AppHeader';
import BottomNavigation from '@/components/BottomNavigation';
import { PREDEFINED_EXERCISES } from '@/data/exercises';
import { toDayKey } from '@/components/WorkoutCalendarAndStreak';
import {
  ArrowLeft,
  Clock,
  Trophy,
  Pencil,
  Dumbbell,
  Loader2,
  X,
  Check,
  Zap,
  Plus,
  Trash2,
} from 'lucide-react';

interface LogSet {
  setNumber?: number;
  cargaKg: number;
  reps: number;
  oneRmCalculado: number;
  isPeak?: boolean;
}

interface SessionLogItem {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: string;
  cargaKg: number;
  reps: number;
  oneRmCalculado: number;
  totalSetsCompleted?: number;
  allSets?: LogSet[];
  isPr?: boolean;
  data: any;
}

function calculate1RM(carga: number, reps: number): number {
  if (carga <= 0 || reps <= 0) return 0;
  if (reps === 1) return Number(carga.toFixed(1));
  const denom = 1.0278 - 0.0278 * Math.min(reps, 30);
  return denom > 0 ? Number((carga / denom).toFixed(1)) : Number(carga.toFixed(1));
}

function parseDate(raw: any): Date {
  if (!raw) return new Date(0);
  if (raw?.seconds) return new Date(raw.seconds * 1000);
  return new Date(raw);
}

export default function WorkoutDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isPreviewMode, loading: authLoading } = useAuth();

  const dateKey = typeof params?.date === 'string' ? params.date : toDayKey(new Date());

  const [logs, setLogs] = useState<SessionLogItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Edit Exercise Modal State (Off-white standardized modal)
  const [editingItem, setEditingItem] = useState<SessionLogItem | null>(null);
  const [editSets, setEditSets] = useState<Array<{ setNumber: number; cargaKg: number; reps: number }>>([]);
  const [activeInputCard, setActiveInputCard] = useState<string>('carga_0');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
      } else {
        loadSessionDetails();
      }
    }
  }, [user, authLoading, dateKey, router]);

  const loadSessionDetails = async () => {
    if (!user) return;
    setLoadingData(true);

    if (isPreviewMode || user.uid === 'preview_user_uid') {
      setLogs([
        {
          id: 'prev_ex_1',
          exerciseId: 'supino-reto-barra',
          name: 'Supino Reto Barra',
          muscleGroup: 'Peito',
          cargaKg: 85,
          reps: 8,
          oneRmCalculado: 102,
          totalSetsCompleted: 3,
          isPr: true,
          allSets: [
            { setNumber: 1, cargaKg: 82.5, reps: 10, oneRmCalculado: 110.0 },
            { setNumber: 2, cargaKg: 85, reps: 8, oneRmCalculado: 105.5, isPeak: true },
            { setNumber: 3, cargaKg: 85, reps: 6, oneRmCalculado: 98.7 },
          ],
          data: new Date(),
        },
        {
          id: 'prev_ex_2',
          exerciseId: 'supino-inclinado-halteres',
          name: 'Supino Inclinado Halteres',
          muscleGroup: 'Peito',
          cargaKg: 32,
          reps: 10,
          oneRmCalculado: 42.7,
          totalSetsCompleted: 3,
          allSets: [
            { setNumber: 1, cargaKg: 30, reps: 10, oneRmCalculado: 40.0 },
            { setNumber: 2, cargaKg: 32, reps: 10, oneRmCalculado: 42.7, isPeak: true },
            { setNumber: 3, cargaKg: 32, reps: 9, oneRmCalculado: 41.1 },
          ],
          data: new Date(),
        },
        {
          id: 'prev_ex_3',
          exerciseId: 'desenvolvimento-militar',
          name: 'Desenvolvimento Militar',
          muscleGroup: 'Ombro',
          cargaKg: 24,
          reps: 8,
          oneRmCalculado: 29.8,
          totalSetsCompleted: 4,
          allSets: [
            { setNumber: 1, cargaKg: 22, reps: 10, oneRmCalculado: 29.3 },
            { setNumber: 2, cargaKg: 24, reps: 8, oneRmCalculado: 29.8, isPeak: true },
            { setNumber: 3, cargaKg: 24, reps: 8, oneRmCalculado: 29.8 },
            { setNumber: 4, cargaKg: 22, reps: 9, oneRmCalculado: 28.3 },
          ],
          data: new Date(),
        },
        {
          id: 'prev_ex_4',
          exerciseId: 'triceps-corda',
          name: 'Tríceps Corda na Polia',
          muscleGroup: 'Tríceps',
          cargaKg: 35,
          reps: 12,
          oneRmCalculado: 49.0,
          totalSetsCompleted: 4,
          allSets: [
            { setNumber: 1, cargaKg: 35, reps: 12, oneRmCalculado: 49.0, isPeak: true },
            { setNumber: 2, cargaKg: 35, reps: 11, oneRmCalculado: 47.2 },
            { setNumber: 3, cargaKg: 35, reps: 10, oneRmCalculado: 46.7 },
            { setNumber: 4, cargaKg: 30, reps: 12, oneRmCalculado: 42.0 },
          ],
          data: new Date(),
        },
      ]);
      setLoadingData(false);
      return;
    }

    try {
      const nameMap: Record<string, string> = {};
      PREDEFINED_EXERCISES.forEach((ex) => {
        nameMap[ex.id] = ex.nome;
      });

      const [logsSnap, exSnap] = await Promise.all([
        getDocs(query(collection(db, 'strength_logs'), where('userId', '==', user.uid))),
        getDocs(query(collection(db, 'exercises'), where('userId', '==', user.uid))),
      ]);

      exSnap.forEach((d) => {
        const data = d.data();
        if (data.nomeExercicio) nameMap[d.id] = data.nomeExercicio;
      });

      const max1RmByEx: Record<string, number> = {};
      const matching: SessionLogItem[] = [];

      logsSnap.forEach((d) => {
        const data = d.data();
        const oneRm = Number(data.oneRmCalculado) || 0;
        if (oneRm > (max1RmByEx[data.exerciseId] || 0)) {
          max1RmByEx[data.exerciseId] = oneRm;
        }
      });

      logsSnap.forEach((d) => {
        const data = d.data();
        const dt = parseDate(data.data);
        if (toDayKey(dt) !== dateKey) return;
        const oneRm = Number(data.oneRmCalculado) || 0;
        matching.push({
          id: d.id,
          exerciseId: data.exerciseId,
          name: nameMap[data.exerciseId] || data.exerciseId,
          muscleGroup: data.muscleGroup || 'Geral',
          cargaKg: Number(data.cargaKg) || 0,
          reps: Number(data.reps) || 0,
          oneRmCalculado: oneRm,
          totalSetsCompleted:
            data.totalSetsCompleted || (Array.isArray(data.allSets) ? data.allSets.length : 1),
          allSets: Array.isArray(data.allSets) ? data.allSets : undefined,
          isPr: oneRm > 0 && oneRm >= (max1RmByEx[data.exerciseId] || 0),
          data: data.data,
        });
      });

      setLogs(matching);
    } catch (err) {
      console.error('Error loading workout detail:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const sessionSummary = useMemo(() => {
    const muscles = Array.from(new Set(logs.map((l) => l.muscleGroup).filter(Boolean)));
    const title = muscles.length > 0 ? `Treino — ${muscles.slice(0, 3).join(', ')}` : 'Detalhes do Treino';
    let totalSets = 0;
    let totalVolume = 0;
    let hasPr = false;

    logs.forEach((l) => {
      if (l.isPr) hasPr = true;
      if (l.allSets && l.allSets.length > 0) {
        totalSets += l.allSets.length;
        l.allSets.forEach((s) => {
          totalVolume += (Number(s.cargaKg) || 0) * (Number(s.reps) || 0);
        });
      } else {
        const sc = l.totalSetsCompleted || 1;
        totalSets += sc;
        totalVolume += l.cargaKg * l.reps * sc;
      }
    });

    return {
      title,
      totalSets,
      totalVolume: Math.round(totalVolume),
      durationMin: Math.max(25, Math.min(90, totalSets * 3 + 10)),
      hasPr,
    };
  }, [logs]);

  const handleOpenEdit = (item: SessionLogItem) => {
    setEditingItem(item);
    if (item.allSets && item.allSets.length > 0) {
      setEditSets(
        item.allSets.map((s, idx) => ({
          setNumber: s.setNumber || idx + 1,
          cargaKg: s.cargaKg,
          reps: s.reps,
        }))
      );
    } else {
      setEditSets([{ setNumber: 1, cargaKg: item.cargaKg, reps: item.reps }]);
    }
    setActiveInputCard('carga_0');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || editSets.length === 0) return;

    setSavingEdit(true);
    try {
      let peakSet = editSets[0];
      let peak1RM = calculate1RM(editSets[0].cargaKg, editSets[0].reps);
      editSets.forEach((s) => {
        const rm = calculate1RM(s.cargaKg, s.reps);
        if (rm > peak1RM) {
          peak1RM = rm;
          peakSet = s;
        }
      });

      const formattedSets: LogSet[] = editSets.map((s) => ({
        setNumber: s.setNumber,
        cargaKg: s.cargaKg,
        reps: s.reps,
        oneRmCalculado: calculate1RM(s.cargaKg, s.reps),
        isPeak: s.setNumber === peakSet.setNumber,
      }));

      if (!isPreviewMode && user?.uid !== 'preview_user_uid') {
        await updateDoc(doc(db, 'strength_logs', editingItem.id), {
          cargaKg: peakSet.cargaKg,
          reps: peakSet.reps,
          oneRmCalculado: peak1RM,
          totalSetsCompleted: editSets.length,
          allSets: formattedSets,
        });
      }

      setLogs((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                cargaKg: peakSet.cargaKg,
                reps: peakSet.reps,
                oneRmCalculado: peak1RM,
                totalSetsCompleted: editSets.length,
                allSets: formattedSets,
              }
            : item
        )
      );

      setEditingItem(null);
    } catch (err) {
      console.error('Error updating exercise log:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  const formattedDateBr = useMemo(() => {
    const parts = dateKey.split('-');
    if (parts.length !== 3) return dateKey;
    return `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`;
  }, [dateKey]);

  if (authLoading || loadingData) {
    return (
      <div className="min-h-screen bg-[#100F0F] flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#f59e0b]" />
        <span className="mt-2 text-xs text-[#94a3b8]">Carregando detalhes do treino...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#100F0F] text-[#f8fafc] pb-28">
      <AppHeader />

      <main className="py-4 max-w-md mx-auto space-y-[16px]">
        {/* Top Back + Session Header */}
        <section className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-9 h-9 rounded-[10px] bg-[#151413] hover:bg-white/10 border border-white/[0.08] flex items-center justify-center text-[#f8fafc] shrink-0 mt-0.5 transition-colors"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-[0.5px] text-[#ffb95f]">
                  {formattedDateBr}
                </span>
                <span className="text-[11px] text-[#64748b] flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {sessionSummary.durationMin} min
                </span>
              </div>
              <h1 className="font-heading font-bold text-[#f8fafc] text-[22px] tracking-[-0.5px] uppercase leading-[26px] mt-0.5">
                {sessionSummary.title}
              </h1>
            </div>
          </div>

          {sessionSummary.hasPr && (
            <span className="bg-[#ffb95f] text-[#100F0F] px-[9px] py-[4px] rounded-full text-[10px] font-bold uppercase tracking-[0.4px] flex items-center gap-1 shrink-0">
              <Trophy className="w-[11px] h-[11px]" />
              RECORDE
            </span>
          )}
        </section>

        {/* Session Metrics Card */}
        <section className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] border border-white/[0.06] rounded-[14px] p-[14px] grid grid-cols-3 gap-2">
          <div className="bg-black/60 rounded-[10px] p-2.5">
            <span className="text-[9px] font-bold uppercase text-[#64748b] block">VOLUME</span>
            <span className="font-heading font-bold text-[18px] text-[#f8fafc]">
              {sessionSummary.totalVolume.toLocaleString('pt-BR')} kg
            </span>
          </div>
          <div className="bg-black/60 rounded-[10px] p-2.5">
            <span className="text-[9px] font-bold uppercase text-[#64748b] block">SÉRIES</span>
            <span className="font-heading font-bold text-[18px] text-[#f8fafc]">
              {sessionSummary.totalSets} séries
            </span>
          </div>
          <div className="bg-black/60 rounded-[10px] p-2.5">
            <span className="text-[9px] font-bold uppercase text-[#64748b] block">EXERCÍCIOS</span>
            <span className="font-heading font-bold text-[18px] text-[#ffb95f]">
              {logs.length} feitos
            </span>
          </div>
        </section>

        {/* Exercises List (Strength-page style with Edit Action) */}
        <section className="space-y-[10px]">
          <h2 className="font-heading font-semibold text-[#f8fafc] text-[18px] tracking-[-0.18px] uppercase leading-[24px] px-0.5">
            EXERCÍCIOS REALIZADOS
          </h2>

          {logs.length === 0 ? (
            <div className="bg-[#151413] border border-white/[0.06] rounded-[14px] p-8 text-center space-y-2">
              <Dumbbell className="w-8 h-8 text-[#64748b] mx-auto" />
              <p className="text-xs text-[#94a3b8]">
                Nenhum exercício encontrado para esta data.
              </p>
            </div>
          ) : (
            <div className="space-y-[10px]">
              {logs.map((item) => {
                const setsList: LogSet[] =
                  item.allSets && item.allSets.length > 0
                    ? item.allSets
                    : [
                        {
                          setNumber: 1,
                          cargaKg: item.cargaKg,
                          reps: item.reps,
                          oneRmCalculado: item.oneRmCalculado,
                          isPeak: true,
                        },
                      ];

                return (
                  <article
                    key={item.id}
                    className="bg-[#151413] bg-[linear-gradient(0deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02))] border border-white/[0.06] rounded-[14px] p-[14px] space-y-[12px]"
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-[#f8fafc] text-[15px] leading-[20px]">
                            {item.name}
                          </h3>
                          {item.isPr && (
                            <span className="bg-[#f59e0b]/20 text-[#ffb95f] text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <Zap className="w-2.5 h-2.5 fill-current" /> RECORDE
                            </span>
                          )}
                        </div>
                        <span className="text-[12px] text-[#94a3b8] block mt-0.5">
                          {item.muscleGroup} • {setsList.length}{' '}
                          {setsList.length === 1 ? 'série' : 'séries'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="block text-[9px] font-bold uppercase text-[#64748b]">
                            1RM EST.
                          </span>
                          <span className="font-heading font-bold text-[#f59e0b] text-[18px] leading-none">
                            {item.oneRmCalculado.toFixed(1)}kg
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="w-[34px] h-[34px] rounded-[9px] bg-black hover:bg-[#1c1c13] border border-white/10 flex items-center justify-center text-[#94a3b8] hover:text-[#ffb95f] transition-colors"
                          title="Editar cargas e séries deste exercício"
                        >
                          <Pencil className="w-[14px] h-[14px]" />
                        </button>
                      </div>
                    </div>

                    {/* Sets Breakdown */}
                    <div className="space-y-[6px]">
                      {setsList.map((s, idx) => (
                        <div
                          key={idx}
                          className={`rounded-[8px] px-3 py-2 flex items-center justify-between text-[12px] ${
                            s.isPeak
                              ? 'bg-black/80 border border-[#f59e0b]/30'
                              : 'bg-black/45'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase text-[#64748b] w-12">
                              Série {s.setNumber || idx + 1}
                            </span>
                            <span className="font-mono font-bold text-[#f8fafc]">
                              {s.cargaKg}kg × {s.reps} reps
                            </span>
                          </div>
                          <span className="font-mono font-semibold text-[#d3e156] text-[11px]">
                            1RM {s.oneRmCalculado.toFixed(1)}kg
                          </span>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* =====================================================================
          MODAL OFF-WHITE (#f4f4f0): EDITAR EXERCÍCIO / SÉRIES DO TREINO
         ===================================================================== */}
      {editingItem && (
        <div
          className="fixed inset-0 z-50 backdrop-blur-[12px] bg-[rgba(13,17,23,0.82)] flex items-center justify-center px-[12px] py-[20px] animate-in fade-in duration-200"
          onClick={() => setEditingItem(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#f4f4f0] rounded-[24px] shadow-2xl w-full max-w-[448px] max-h-[88vh] flex flex-col overflow-hidden"
          >
            <div className="h-[4px] w-full bg-gradient-to-r from-[rgba(255,185,95,0.5)] via-[#ffb95f] to-[rgba(255,185,95,0.5)] shrink-0" />

            <div className="px-[16px] pt-[14px] pb-[10px] flex items-start justify-between gap-2 shrink-0">
              <div>
                <h2 className="font-heading font-semibold text-black text-[18px] uppercase leading-[22px]">
                  EDITAR EXERCÍCIO
                </h2>
                <p className="text-[12px] text-[#475569] mt-0.5">{editingItem.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="bg-black hover:bg-[#151413] rounded-full w-[32px] h-[32px] flex items-center justify-center text-[#f59e0b] shrink-0"
              >
                <X className="w-[14px] h-[14px] stroke-[2.5]" />
              </button>
            </div>

            <form
              onSubmit={handleSaveEdit}
              className="flex-1 overflow-y-auto px-[16px] pb-[16px] space-y-[12px]"
            >
              {editSets.map((s, idx) => {
                const isCargaActive = activeInputCard === `carga_${idx}`;
                const isRepsActive = activeInputCard === `reps_${idx}`;
                return (
                  <div
                    key={s.setNumber}
                    className="bg-[#151413] rounded-[14px] p-[10px] space-y-[8px]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-bold text-[#f59e0b] text-[13px] uppercase">
                        Série {s.setNumber}
                      </span>
                      {editSets.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditSets((prev) =>
                              prev
                                .filter((_, i) => i !== idx)
                                .map((item, i) => ({ ...item, setNumber: i + 1 }))
                            )
                          }
                          className="text-[#94a3b8] hover:text-[#ff6e61] p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-[8px]">
                      {/* Carga */}
                      <div
                        onClick={() => setActiveInputCard(`carga_${idx}`)}
                        className={`${
                          isCargaActive ? 'bg-black' : 'bg-[rgba(57,58,47,0.75)]'
                        } rounded-[10px] p-[8px] space-y-1 cursor-pointer`}
                      >
                        <span
                          className={`text-[11px] font-semibold block ${
                            isCargaActive ? 'text-[#f59e0b]' : 'text-[#f8fafc]'
                          }`}
                        >
                          Carga (kg)
                        </span>
                        <div
                          className={`${
                            isCargaActive ? 'bg-[rgba(245,158,11,0.9)]' : 'bg-[#2a2b21]'
                          } rounded-[6px] p-[3px] flex items-center gap-1`}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveInputCard(`carga_${idx}`);
                              setEditSets((prev) =>
                                prev.map((it, i) =>
                                  i === idx ? { ...it, cargaKg: Math.max(0, it.cargaKg - 2.5) } : it
                                )
                              );
                            }}
                            className="bg-black rounded w-[22px] h-[24px] text-[#94a3b8] hover:text-white font-bold text-xs"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="0.5"
                            value={s.cargaKg || ''}
                            onFocus={() => setActiveInputCard(`carga_${idx}`)}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value) || 0;
                              setEditSets((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, cargaKg: v } : it))
                              );
                            }}
                            className="w-full bg-transparent font-heading font-bold text-[#f8fafc] text-[18px] text-center focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveInputCard(`carga_${idx}`);
                              setEditSets((prev) =>
                                prev.map((it, i) =>
                                  i === idx ? { ...it, cargaKg: it.cargaKg + 2.5 } : it
                                )
                              );
                            }}
                            className="bg-black rounded w-[22px] h-[24px] text-[#94a3b8] hover:text-white font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Reps */}
                      <div
                        onClick={() => setActiveInputCard(`reps_${idx}`)}
                        className={`${
                          isRepsActive ? 'bg-black' : 'bg-[rgba(57,58,47,0.75)]'
                        } rounded-[10px] p-[8px] space-y-1 cursor-pointer`}
                      >
                        <span
                          className={`text-[11px] font-semibold block ${
                            isRepsActive ? 'text-[#f59e0b]' : 'text-[#f8fafc]'
                          }`}
                        >
                          Repetições
                        </span>
                        <div
                          className={`${
                            isRepsActive ? 'bg-[rgba(245,158,11,0.9)]' : 'bg-[#2a2b21]'
                          } rounded-[6px] p-[3px] flex items-center gap-1`}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveInputCard(`reps_${idx}`);
                              setEditSets((prev) =>
                                prev.map((it, i) =>
                                  i === idx ? { ...it, reps: Math.max(1, it.reps - 1) } : it
                                )
                              );
                            }}
                            className="bg-black rounded w-[22px] h-[24px] text-[#94a3b8] hover:text-white font-bold text-xs"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="1"
                            value={s.reps || ''}
                            onFocus={() => setActiveInputCard(`reps_${idx}`)}
                            onChange={(e) => {
                              const v = parseInt(e.target.value) || 0;
                              setEditSets((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, reps: v } : it))
                              );
                            }}
                            className="w-full bg-transparent font-heading font-bold text-[#f8fafc] text-[18px] text-center focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveInputCard(`reps_${idx}`);
                              setEditSets((prev) =>
                                prev.map((it, i) =>
                                  i === idx ? { ...it, reps: it.reps + 1 } : it
                                )
                              );
                            }}
                            className="bg-black rounded w-[22px] h-[24px] text-[#94a3b8] hover:text-white font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() =>
                  setEditSets((prev) => {
                    const last = prev[prev.length - 1];
                    return [
                      ...prev,
                      {
                        setNumber: prev.length + 1,
                        cargaKg: last ? last.cargaKg : 20,
                        reps: last ? last.reps : 10,
                      },
                    ];
                  })
                }
                className="w-full py-2.5 rounded-[12px] border border-dashed border-[#f59e0b]/60 bg-[#f59e0b]/10 text-[#d97706] font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Série {editSets.length + 1}
              </button>

              <button
                type="submit"
                disabled={savingEdit}
                className="bg-black hover:bg-[#151413] disabled:opacity-50 min-h-[48px] pl-[16px] pr-[8px] py-[8px] rounded-full flex items-center justify-between w-full mt-2"
              >
                <span className="font-heading font-semibold text-[#f8fafc] text-[17px] uppercase">
                  {savingEdit ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
                </span>
                <span className="bg-[#ffb95f] rounded-full w-[32px] h-[32px] flex items-center justify-center shrink-0">
                  <Check className="w-[15px] h-[15px] text-[#151413] stroke-[2.8]" />
                </span>
              </button>
            </form>
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
}
