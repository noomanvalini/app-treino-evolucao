'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import BottomNavigation from '@/components/BottomNavigation';
import { 
  Dumbbell, Plus, History, Calendar, Calculator, TrendingUp, TrendingDown,
  ChevronDown, ChevronUp, X, Loader2, Save, AlertTriangle
} from 'lucide-react';
import { PREDEFINED_EXERCISES, MUSCLE_GROUPS } from '@/data/exercises';

interface Exercise {
  id: string;
  nomeExercicio: string;
  muscleGroup: string;
  dataCriacao?: any;
  thumbnailUrl?: string;
  isPredefined?: boolean;
}

interface StrengthLog {
  id: string;
  exerciseId: string;
  cargaKg: number;
  reps: number;
  oneRmCalculado: number;
  data: any; // Timestamp or date string
}

function StrengthContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Selected Muscle Group
  const [selectedMuscle, setSelectedMuscle] = useState(MUSCLE_GROUPS[0]);

  // Data States
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [logs, setLogs] = useState<StrengthLog[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Accordion state for history
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

  // Modal States - New Exercise
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [submittingExercise, setSubmittingExercise] = useState(false);
  const [exerciseError, setExerciseError] = useState('');

  // Modal States - New Log
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedExerciseForLog, setSelectedExerciseForLog] = useState<Exercise | null>(null);
  const [carga, setCarga] = useState('');
  const [reps, setReps] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [submittingLog, setSubmittingLog] = useState(false);
  const [logError, setLogError] = useState('');

  // Read muscle parameter from URL on mount
  useEffect(() => {
    const muscleParam = searchParams.get('muscle');
    if (muscleParam && MUSCLE_GROUPS.includes(muscleParam)) {
      setSelectedMuscle(muscleParam);
    }
  }, [searchParams]);

  // Fetch Exercises and Logs for the current user & muscle group
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
      } else {
        fetchData();
      }
    }
  }, [user, authLoading, selectedMuscle, router]);

  const fetchData = async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      // 1. Fetch exercises for this muscle from Firestore
      const exQuery = query(
        collection(db, 'exercises'),
        where('userId', '==', user.uid),
        where('muscleGroup', '==', selectedMuscle)
      );
      const exSnap = await getDocs(exQuery);
      const customExList: Exercise[] = [];
      exSnap.forEach((doc) => {
        const d = doc.data();
        customExList.push({
          id: doc.id,
          nomeExercicio: d.nomeExercicio,
          muscleGroup: d.muscleGroup,
          dataCriacao: d.dataCriacao,
          isPredefined: false
        });
      });

      // 2. Map predefined exercises for this muscle group
      const predefinedForMuscle = PREDEFINED_EXERCISES
        .filter((pe) => pe.muscleGroup === selectedMuscle)
        .map((pe) => ({
          id: pe.id,
          nomeExercicio: pe.nome,
          muscleGroup: pe.muscleGroup,
          thumbnailUrl: pe.thumbnailUrl,
          isPredefined: true
        }));

      // Combine both lists and sort alphabetically
      const combinedExList = [...predefinedForMuscle, ...customExList];
      combinedExList.sort((a, b) => a.nomeExercicio.localeCompare(b.nomeExercicio));
      setExercises(combinedExList);

      // 2. Fetch all logs for this muscle group
      const logsQuery = query(
        collection(db, 'strength_logs'),
        where('userId', '==', user.uid),
        where('muscleGroup', '==', selectedMuscle)
      );
      const logsSnap = await getDocs(logsQuery);
      const logsList: StrengthLog[] = [];
      logsSnap.forEach((doc) => {
        const d = doc.data();
        logsList.push({
          id: doc.id,
          exerciseId: d.exerciseId,
          cargaKg: d.cargaKg,
          reps: d.reps,
          oneRmCalculado: d.oneRmCalculado,
          data: d.data
        });
      });
      setLogs(logsList);
    } catch (error) {
      console.error('Error fetching strength data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // Helper: calculate 1RM using Brzycki formula
  const calculate1RM = (cargaKg: number, repsCount: number) => {
    if (repsCount <= 0) return 0;
    if (repsCount === 1) return cargaKg;
    return cargaKg * (1 + repsCount / 30);
  };

  // Process exercise calculations: latest logs, 1RM, delta
  const getExerciseMetrics = (exerciseId: string) => {
    const exerciseLogs = logs
      .filter((l) => l.exerciseId === exerciseId)
      .sort((a, b) => {
        const timeA = a.data?.seconds ? a.data.seconds * 1000 : new Date(a.data).getTime();
        const timeB = b.data?.seconds ? b.data.seconds * 1000 : new Date(b.data).getTime();
        return timeA - timeB;
      });

    if (exerciseLogs.length === 0) {
      return { latest: null, delta: null, history: [] };
    }

    const latest = exerciseLogs[exerciseLogs.length - 1];
    let delta = null;

    if (exerciseLogs.length >= 2) {
      const current1RM = latest.oneRmCalculado;
      const previous1RM = exerciseLogs[exerciseLogs.length - 2].oneRmCalculado;
      if (previous1RM > 0) {
        delta = ((current1RM - previous1RM) / previous1RM) * 100;
      }
    }

    return {
      latest,
      delta,
      history: [...exerciseLogs].reverse() // Show newest first in history
    };
  };

  // Calculate Muscle Group variation
  const getMuscleVariation = () => {
    let sumDeltas = 0;
    let count = 0;

    exercises.forEach((ex) => {
      const { delta } = getExerciseMetrics(ex.id);
      if (delta !== null) {
        sumDeltas += delta;
        count++;
      }
    });

    if (count === 0) return null;
    return Number((sumDeltas / count).toFixed(1));
  };

  const handleAddExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExerciseName.trim()) {
      setExerciseError('Digite o nome do exercício.');
      return;
    }
    setExerciseError('');
    setSubmittingExercise(true);

    try {
      const { collection, addDoc } = await import('firebase/firestore');
      const docRef = await addDoc(collection(db, 'exercises'), {
        userId: user?.uid,
        muscleGroup: selectedMuscle,
        nomeExercicio: newExerciseName.trim(),
        dataCriacao: new Date()
      });

      // Update local state
      const newEx: Exercise = {
        id: docRef.id,
        nomeExercicio: newExerciseName.trim(),
        muscleGroup: selectedMuscle,
        dataCriacao: new Date()
      };
      setExercises((prev) => [...prev, newEx].sort((a, b) => a.nomeExercicio.localeCompare(b.nomeExercicio)));
      setNewExerciseName('');
      setIsExerciseModalOpen(false);
    } catch (err) {
      console.error(err);
      setExerciseError('Erro ao criar exercício. Tente novamente.');
    } finally {
      setSubmittingExercise(false);
    }
  };

  const handleAddPredefined = async (predefinedId: string, name: string) => {
    setExerciseError('');
    setSubmittingExercise(true);
    try {
      const docRef = await addDoc(collection(db, 'exercises'), {
        userId: user?.uid,
        muscleGroup: selectedMuscle,
        nomeExercicio: name,
        predefinedId: predefinedId,
        dataCriacao: new Date()
      });

      // Update local state
      const predefined = PREDEFINED_EXERCISES.find(pe => pe.id === predefinedId);
      const newEx: Exercise = {
        id: docRef.id,
        nomeExercicio: name,
        muscleGroup: selectedMuscle,
        dataCriacao: new Date(),
        thumbnailUrl: predefined?.thumbnailUrl,
        isPredefined: true
      };

      setExercises((prev) => [...prev, newEx].sort((a, b) => a.nomeExercicio.localeCompare(b.nomeExercicio)));
      setIsExerciseModalOpen(false);
    } catch (err) {
      console.error(err);
      setExerciseError('Erro ao adicionar exercício padrão. Tente novamente.');
    } finally {
      setSubmittingExercise(false);
    }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExerciseForLog) return;

    setLogError('');
    setSubmittingLog(true);

    const cargaNum = parseFloat(carga);
    const repsNum = parseInt(reps);

    if (isNaN(cargaNum) || cargaNum <= 0) {
      setLogError('Carga inválida (deve ser maior que zero).');
      setSubmittingLog(false);
      return;
    }

    if (isNaN(repsNum) || repsNum <= 0) {
      setLogError('Repetições inválidas (deve ser maior que zero).');
      setSubmittingLog(false);
      return;
    }

    try {
      const oneRm = calculate1RM(cargaNum, repsNum);
      const parsedDate = new Date(logDate + 'T12:00:00'); // avoids timezone offsets
      
      const { collection, addDoc } = await import('firebase/firestore');
      const docRef = await addDoc(collection(db, 'strength_logs'), {
        userId: user?.uid,
        exerciseId: selectedExerciseForLog.id,
        muscleGroup: selectedMuscle,
        cargaKg: cargaNum,
        reps: repsNum,
        oneRmCalculado: Number(oneRm.toFixed(2)),
        data: parsedDate
      });

      const newLog: StrengthLog = {
        id: docRef.id,
        exerciseId: selectedExerciseForLog.id,
        cargaKg: cargaNum,
        reps: repsNum,
        oneRmCalculado: Number(oneRm.toFixed(2)),
        data: Timestamp.fromDate(parsedDate)
      };

      setLogs((prev) => [...prev, newLog]);
      setCarga('');
      setReps('');
      setIsLogModalOpen(false);
      setSelectedExerciseForLog(null);
    } catch (err) {
      console.error(err);
      setLogError('Erro ao salvar carga. Tente novamente.');
    } finally {
      setSubmittingLog(false);
    }
  };

  const openLogModal = (exercise: Exercise) => {
    setSelectedExerciseForLog(exercise);
    setIsLogModalOpen(true);
    setLogError('');
  };

  const muscleVar = getMuscleVariation();

  return (
    <div className="space-y-6 pb-6">
      {/* Header Tabs */}
      <div>
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Força & Exercícios</span>
        <h1 className="text-2xl font-bold text-slate-100 mt-0.5">Grupos Musculares</h1>
        
        {/* Horizontal Scrollable Tabs */}
        <div className="flex gap-2 overflow-x-auto py-3 no-scrollbar -mx-4 px-4 mask-right">
          {MUSCLE_GROUPS.map((muscle) => (
            <button
              key={muscle}
              onClick={() => {
                setSelectedMuscle(muscle);
                setExpandedExercise(null);
              }}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${
                selectedMuscle === muscle
                  ? 'bg-lime-neon text-slate-900 border-lime-neon font-bold'
                  : 'bg-slate-card text-slate-400 border-border hover:text-slate-200'
              }`}
            >
              {muscle}
            </button>
          ))}
        </div>
      </div>

      {/* Muscle stats banner */}
      <div className="bg-slate-card border border-border rounded-2xl p-4 shadow flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-400 block uppercase font-semibold">Evolução de Força</span>
          <span className="text-sm font-extrabold text-slate-100">{selectedMuscle}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {muscleVar === null ? (
            <span className="text-xs text-slate-500 font-medium">Sem histórico suficiente</span>
          ) : muscleVar >= 0 ? (
            <div className="flex items-center gap-1 bg-success/15 border border-success/20 text-success text-xs font-bold px-3 py-1.5 rounded-full">
              <TrendingUp className="h-4 w-4" />
              <span>▲ +{muscleVar}%</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-danger/15 border border-danger/20 text-danger text-xs font-bold px-3 py-1.5 rounded-full">
              <TrendingDown className="h-4 w-4" />
              <span>▼ {muscleVar}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Exercises Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Exercícios ({exercises.length})</h2>
          <button
            onClick={() => setIsExerciseModalOpen(true)}
            className="flex items-center gap-1 text-xs text-lime-neon font-bold hover:underline"
          >
            <Plus className="h-4 w-4" /> Novo Exercício
          </button>
        </div>

        {authLoading || loadingData ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-lime-neon" />
          </div>
        ) : exercises.length === 0 ? (
          <div className="bg-slate-card/50 border border-dashed border-border rounded-2xl p-8 text-center">
            <Dumbbell className="h-8 w-8 text-slate-500 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Nenhum exercício cadastrado para este grupo.</p>
            <button
              onClick={() => setIsExerciseModalOpen(true)}
              className="mt-3 bg-lime-neon hover:bg-lime-neon-hover text-slate-900 text-xs font-bold px-4 py-2 rounded-lg transition-colors"
            >
              Criar Primeiro Exercício
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {exercises.map((exercise) => {
              const { latest, delta, history } = getExerciseMetrics(exercise.id);
              const isExpanded = expandedExercise === exercise.id;

              return (
                <div
                  key={exercise.id}
                  className="bg-slate-card border border-border rounded-2xl overflow-hidden shadow flex flex-col"
                >
                  {/* Card Header with Thumbnail */}
                  <div className="flex p-4 gap-4 items-center">
                    {/* Thumbnail Image Container */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 border border-border/50 flex-shrink-0 flex items-center justify-center relative">
                      {exercise.thumbnailUrl ? (
                        <img
                          src={exercise.thumbnailUrl}
                          alt={exercise.nomeExercicio}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <Dumbbell className="h-6 w-6 text-slate-600" />
                          <span className="text-[8px] mt-1 text-slate-500 font-bold uppercase tracking-wider">Custom</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-sm font-bold text-slate-100 truncate">{exercise.nomeExercicio}</h3>
                        {exercise.isPredefined ? (
                          <span className="text-[8px] bg-lime-neon/10 text-lime-neon border border-lime-neon/20 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">Padrão</span>
                        ) : (
                          <span className="text-[8px] bg-slate-card-light text-slate-400 border border-border px-1.5 py-0.5 rounded font-black uppercase tracking-wider">Criado</span>
                        )}
                      </div>
                      
                      {latest ? (
                        <p className="text-xs text-slate-400">
                          Última: <span className="text-slate-200 font-semibold">{latest.cargaKg}kg</span> x {latest.reps} reps
                          <span className="text-[9px] text-slate-500 ml-1.5">
                            ({latest.data?.seconds 
                              ? new Date(latest.data.seconds * 1000).toLocaleDateString('pt-BR') 
                              : new Date(latest.data).toLocaleDateString('pt-BR')})
                          </span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500">Sem cargas registradas</p>
                      )}
                    </div>
                  </div>

                  {/* Carga, 1RM, Delta & Button */}
                  <div className="px-4 pb-4 flex items-center justify-between border-t border-border/10 pt-3">
                    <div className="flex gap-4">
                      {latest && (
                        <div>
                          <span className="text-[9px] text-slate-500 block leading-tight">1RM Estimado</span>
                          <span className="text-xs font-bold text-lime-neon">{latest.oneRmCalculado} kg</span>
                        </div>
                      )}

                      {delta !== null && (
                        <div>
                          <span className="text-[9px] text-slate-500 block leading-tight">Evolução</span>
                          {delta >= 0 ? (
                            <span className="text-xs font-bold text-success">▲ +{delta.toFixed(1)}%</span>
                          ) : (
                            <span className="text-xs font-bold text-danger">▼ {delta.toFixed(1)}%</span>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => openLogModal(exercise)}
                      className="bg-lime-neon hover:bg-lime-neon-hover text-slate-900 font-bold px-3.5 py-1.5 rounded-xl text-xs transition-colors"
                    >
                      + Carga
                    </button>
                  </div>

                  {/* Accordion Trigger */}
                  {history.length > 0 && (
                    <button
                      onClick={() => setExpandedExercise(isExpanded ? null : exercise.id)}
                      className="w-full bg-slate-card-light/30 border-t border-border/30 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      <span className="flex items-center gap-1">
                        <History className="h-3 w-3" /> Histórico ({history.length})
                      </span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  )}

                  {/* Expanded History List */}
                  {isExpanded && history.length > 0 && (
                    <div className="bg-slate-card-light/10 border-t border-border/40 p-4 space-y-2 max-h-48 overflow-y-auto">
                      {history.map((logItem, index) => {
                        const isPrev = index < history.length - 1;
                        let itemDelta = null;
                        if (isPrev) {
                          const prev1RM = history[index + 1].oneRmCalculado;
                          if (prev1RM > 0) {
                            itemDelta = ((logItem.oneRmCalculado - prev1RM) / prev1RM) * 100;
                          }
                        }

                        return (
                          <div
                            key={logItem.id}
                            className="flex items-center justify-between text-xs py-1.5 border-b border-border/30 last:border-b-0"
                          >
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-slate-500" />
                              <span className="text-slate-300">
                                {logItem.data?.seconds
                                  ? new Date(logItem.data.seconds * 1000).toLocaleDateString('pt-BR')
                                  : new Date(logItem.data).toLocaleDateString('pt-BR')}
                              </span>
                              <span className="font-bold text-slate-100 ml-2">{logItem.cargaKg}kg x {logItem.reps} reps</span>
                            </div>
                            <div className="flex items-center gap-2 text-right">
                              <div>
                                <span className="text-[9px] text-slate-500 mr-1">1RM:</span>
                                <span className="font-bold text-slate-300">{logItem.oneRmCalculado}kg</span>
                              </div>
                              {itemDelta !== null && (
                                <span className={`font-semibold text-[10px] ${itemDelta >= 0 ? 'text-success' : 'text-danger'}`}>
                                  {itemDelta >= 0 ? `+${itemDelta.toFixed(1)}%` : `${itemDelta.toFixed(1)}%`}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal - New Exercise */}
      {isExerciseModalOpen && (() => {
        // Calculate predefined exercises not added yet
        const addedNames = exercises.map(ex => ex.nomeExercicio.toLowerCase());
        const availablePredefined = PREDEFINED_EXERCISES.filter(
          pe => pe.muscleGroup === selectedMuscle && !addedNames.includes(pe.nome.toLowerCase())
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
            <div className="bg-slate-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <h3 className="font-bold text-slate-100 flex items-center gap-1.5">
                  <Dumbbell className="h-5 w-5 text-lime-neon" /> Novo Exercício
                </h3>
                <button
                  onClick={() => {
                    setIsExerciseModalOpen(false);
                    setNewExerciseName('');
                    setExerciseError('');
                  }}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {exerciseError && (
                <div className="bg-danger/10 border border-danger/20 text-danger text-xs p-3 rounded-lg">
                  {exerciseError}
                </div>
              )}

              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 no-scrollbar">
                {availablePredefined.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Exercícios Recomendados
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availablePredefined.map((pe) => (
                        <button
                          key={pe.id}
                          type="button"
                          onClick={() => handleAddPredefined(pe.id, pe.nome)}
                          disabled={submittingExercise}
                          className="bg-slate-card-light hover:bg-slate-card-light/80 border border-border/80 hover:border-lime-neon/50 rounded-xl p-2 text-left transition-all flex items-center gap-2.5 w-full group disabled:opacity-50"
                        >
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-900 border border-border/50 flex-shrink-0 flex items-center justify-center relative">
                            {pe.thumbnailUrl ? (
                              <img
                                src={pe.thumbnailUrl}
                                alt={pe.nome}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Dumbbell className="h-4 w-4 text-slate-500 group-hover:text-lime-neon" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-bold text-slate-200 block truncate group-hover:text-lime-neon transition-colors">
                              {pe.nome}
                            </span>
                            <span className="text-[8px] text-slate-500 block">Adicionar com 1 toque</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="relative my-5">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border/40"></div>
                      </div>
                      <div className="relative flex justify-center text-[9px] uppercase tracking-wider">
                        <span className="bg-slate-card px-2 text-slate-500">Ou crie um personalizado</span>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleAddExercise} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Nome do Exercício Personalizado
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Crucifixo Inclinado com Halteres"
                      value={newExerciseName}
                      onChange={(e) => setNewExerciseName(e.target.value)}
                      className="w-full bg-slate-card-light border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-lime-neon text-white"
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsExerciseModalOpen(false);
                        setNewExerciseName('');
                        setExerciseError('');
                      }}
                      className="flex-1 bg-slate-card-light hover:bg-slate-card-light/80 text-slate-200 font-semibold py-2.5 rounded-xl text-xs transition-colors border border-border"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submittingExercise}
                      className="flex-1 bg-lime-neon hover:bg-lime-neon-hover text-slate-900 font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      {submittingExercise ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Save className="h-4 w-4" /> Criar
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal - New Log */}
      {isLogModalOpen && selectedExerciseForLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="bg-slate-card border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <h3 className="font-bold text-slate-100 flex items-center gap-1.5">
                <Calculator className="h-5 w-5 text-lime-neon" /> Registrar Carga
              </h3>
              <button
                onClick={() => {
                  setIsLogModalOpen(false);
                  setSelectedExerciseForLog(null);
                  setLogError('');
                }}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Registrando para: <span className="text-slate-200 font-bold">{selectedExerciseForLog.nomeExercicio}</span>
            </p>

            {logError && (
              <div className="bg-danger/10 border border-danger/20 text-danger text-xs p-3 rounded-lg">
                {logError}
              </div>
            )}

            <form onSubmit={handleAddLog} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Carga (kg)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Ex: 60"
                    value={carga}
                    onChange={(e) => setCarga(e.target.value)}
                    className="w-full bg-slate-card-light border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-lime-neon text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Repetições (reps)
                  </label>
                  <input
                    type="number"
                    placeholder="Ex: 10"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    className="w-full bg-slate-card-light border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-lime-neon text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Data
                </label>
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full bg-slate-card-light border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-lime-neon text-white"
                  required
                />
              </div>

              {carga && reps && !isNaN(parseFloat(carga)) && !isNaN(parseInt(reps)) && (
                <div className="bg-slate-card-light/40 border border-border/40 rounded-xl p-3 flex justify-between items-center text-xs">
                  <span className="text-slate-400">1RM Estimado (Brzycki):</span>
                  <span className="font-bold text-lime-neon">
                    {calculate1RM(parseFloat(carga), parseInt(reps)).toFixed(1)} kg
                  </span>
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogModalOpen(false);
                    setSelectedExerciseForLog(null);
                    setLogError('');
                  }}
                  className="flex-1 bg-slate-card-light hover:bg-slate-card-light/80 text-slate-200 font-semibold py-2.5 rounded-xl text-xs transition-colors border border-border"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingLog}
                  className="flex-1 bg-lime-neon hover:bg-lime-neon-hover text-slate-900 font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  {submittingLog ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> Registrar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
}

export default function Strength() {
  return (
    <Suspense fallback={
      <div className="flex h-[80vh] flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-lime-neon" />
        <span className="mt-2 text-xs text-slate-400">Carregando dados de força...</span>
      </div>
    }>
      <StrengthContent />
    </Suspense>
  );
}
