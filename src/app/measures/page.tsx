'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import BottomNavigation from '@/components/BottomNavigation';
import { 
  Ruler, Plus, Calendar, TrendingUp, TrendingDown, ChevronDown, 
  ChevronUp, X, Loader2, Save, Sparkles, Activity
} from 'lucide-react';

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
  data: any; // Timestamp
}

const SITE_LABELS: Record<keyof Medidas, string> = {
  bracoD: 'Braço Dir. (cm)',
  bracoE: 'Braço Esq. (cm)',
  antebracoD: 'Antebraço Dir. (cm)',
  antebracoE: 'Antebraço Esq. (cm)',
  torax: 'Tórax (cm)',
  cintura: 'Cintura (cm)',
  quadril: 'Quadril (cm)',
  coxaD: 'Coxa Dir. (cm)',
  coxaE: 'Coxa Esq. (cm)',
  panturrilhaD: 'Panturrilha Dir. (cm)',
  panturrilhaE: 'Panturrilha Esq. (cm)'
};

export default function Measures() {
  const { user, profile, loading: authLoading, updateProfile } = useAuth();
  const router = useRouter();

  // Data States
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Selected metric for chart mapping
  const [selectedChartMetric, setSelectedChartMetric] = useState<string>('peso');

  // Accordion state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pesoInput, setPesoInput] = useState('');
  const [medidasInput, setMedidasInput] = useState<Record<string, string>>({
    bracoD: '', bracoE: '', antebracoD: '', antebracoE: '',
    torax: '', cintura: '', quadril: '', coxaD: '', coxaE: '',
    panturrilhaD: '', panturrilhaE: ''
  });
  const [measureDate, setMeasureDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
      } else {
        fetchMeasurements();
      }
    }
  }, [user, authLoading, router]);

  const fetchMeasurements = async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const q = query(
        collection(db, 'body_measurements'),
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(q);
      const list: Measurement[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          pesoKg: d.pesoKg,
          imcCalculado: d.imcCalculado,
          medidas: d.medidas || {},
          data: d.data
        });
      });

      // Sort by date (newest first)
      list.sort((a, b) => {
        const timeA = a.data?.seconds ? a.data.seconds * 1000 : new Date(a.data).getTime();
        const timeB = b.data?.seconds ? b.data.seconds * 1000 : new Date(b.data).getTime();
        return timeB - timeA;
      });

      setMeasurements(list);
    } catch (error) {
      console.error('Error fetching measurements:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleOpenModal = () => {
    // Prefill inputs with latest measurements if available
    if (measurements.length > 0) {
      const latest = measurements[0];
      setPesoInput(latest.pesoKg.toString());
      
      const newMedidas: Record<string, string> = {};
      Object.keys(SITE_LABELS).forEach((key) => {
        const val = latest.medidas[key as keyof Medidas];
        newMedidas[key] = val ? val.toString() : '';
      });
      setMedidasInput(newMedidas);
    } else if (profile) {
      setPesoInput(profile.pesoAtual.toString());
    }
    setMeasureDate(new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
    setErrorMsg('');
  };

  const handleSaveMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    const pesoVal = parseFloat(pesoInput);
    if (isNaN(pesoVal) || pesoVal <= 10) {
      setErrorMsg('Peso inválido (deve ser maior que 10kg).');
      setSubmitting(false);
      return;
    }

    try {
      // Calculate IMC
      const alturaCm = profile?.altura || 170;
      const imcVal = pesoVal / Math.pow(alturaCm / 100, 2);

      // Clean up body site metrics
      const cleanedMedidas: Medidas = {};
      Object.entries(medidasInput).forEach(([key, val]) => {
        const parsed = parseFloat(val);
        if (!isNaN(parsed) && parsed > 0) {
          cleanedMedidas[key as keyof Medidas] = parsed;
        }
      });

      const parsedDate = new Date(measureDate + 'T12:00:00');

      // 1. Create document in Firestore
      const { collection, addDoc } = await import('firebase/firestore');
      await addDoc(collection(db, 'body_measurements'), {
        userId: user?.uid,
        pesoKg: pesoVal,
        imcCalculado: Number(imcVal.toFixed(1)),
        medidas: cleanedMedidas,
        data: parsedDate
      });

      // 2. Update current weight in user profile
      if (profile) {
        await updateProfile({
          pesoAtual: pesoVal
        });
      }

      // Reset modal & refresh
      setIsModalOpen(false);
      fetchMeasurements();
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao salvar medição. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to draw SVG Charts
  const renderSVGChart = () => {
    if (measurements.length < 2) {
      return (
        <div className="h-44 flex flex-col items-center justify-center bg-slate-card/40 border border-dashed border-border rounded-2xl text-center p-6">
          <Activity className="h-6 w-6 text-slate-500 mb-2" />
          <p className="text-xs text-slate-400">Dados insuficientes para gerar o gráfico.</p>
          <p className="text-[10px] text-slate-500">Registre pelo menos 2 medições temporais.</p>
        </div>
      );
    }

    // Sort chronologically (oldest to newest)
    const sortedMeasures = [...measurements].sort((a, b) => {
      const timeA = a.data?.seconds ? a.data.seconds * 1000 : new Date(a.data).getTime();
      const timeB = b.data?.seconds ? b.data.seconds * 1000 : new Date(b.data).getTime();
      return timeA - timeB;
    });

    // Map measures to values
    const dataPoints: { val: number; dateStr: string }[] = sortedMeasures.map((m) => {
      let val = m.pesoKg;
      if (selectedChartMetric !== 'peso') {
        val = m.medidas[selectedChartMetric as keyof Medidas] || 0;
      }
      const rawDate = m.data?.seconds ? new Date(m.data.seconds * 1000) : new Date(m.data);
      const dateStr = rawDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      return { val, dateStr };
    }).filter((dp) => dp.val > 0); // exclude empty entries for specific metrics

    if (dataPoints.length < 2) {
      return (
        <div className="h-44 flex flex-col items-center justify-center bg-slate-card/40 border border-dashed border-border rounded-2xl text-center p-6">
          <Activity className="h-6 w-6 text-slate-500 mb-2" />
          <p className="text-xs text-slate-400">Nenhum dado registrado para esta medida.</p>
        </div>
      );
    }

    const width = 340;
    const height = 150;
    const paddingX = 25;
    const paddingY = 25;

    const values = dataPoints.map((dp) => dp.val);
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);

    // Give Y-axis padding
    if (minVal === maxVal) {
      minVal -= 5;
      maxVal += 5;
    } else {
      const range = maxVal - minVal;
      minVal = Math.max(0, minVal - range * 0.2);
      maxVal += range * 0.2;
    }

    // Map points to SVG coordinate space
    const points = dataPoints.map((dp, i) => {
      const x = paddingX + (i * (width - 2 * paddingX)) / (dataPoints.length - 1);
      const y = height - paddingY - ((dp.val - minVal) * (height - 2 * paddingY)) / (maxVal - minVal);
      return { x, y, val: dp.val, label: dp.dateStr };
    });

    // Create Path Strings
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
    }

    // Gradient Area Path
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

    return (
      <div className="bg-slate-card border border-border rounded-2xl p-4 shadow-lg">
        {/* Metric Selector inside Chart Card */}
        <div className="flex items-center justify-between mb-3 border-b border-border/30 pb-2">
          <span className="text-xs font-bold text-slate-300">Curva de Evolução</span>
          <select
            value={selectedChartMetric}
            onChange={(e) => setSelectedChartMetric(e.target.value)}
            className="bg-slate-card-light text-[11px] font-semibold border border-border rounded px-2 py-1 focus:outline-none focus:border-lime-neon text-white"
          >
            <option value="peso">Peso (kg)</option>
            {Object.entries(SITE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label.replace(' (cm)', '')}</option>
            ))}
          </select>
        </div>

        {/* SVG Drawing */}
        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
            {/* Definitions for Gradients */}
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#84CC16" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#84CC16" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Line representation */}
            <line 
              x1={paddingX} 
              y1={height - paddingY} 
              x2={width - paddingX} 
              y2={height - paddingY} 
              stroke="#334155" 
              strokeWidth="1" 
              strokeDasharray="2"
            />
            <line 
              x1={paddingX} 
              y1={paddingY} 
              x2={width - paddingX} 
              y2={paddingY} 
              stroke="#334155" 
              strokeWidth="0.5" 
              strokeDasharray="2"
            />

            {/* Gradient under line */}
            <path d={areaD} fill="url(#chartGradient)" />

            {/* Main evolution line */}
            <path d={pathD} fill="none" stroke="#84CC16" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Render Circles for points */}
            {points.map((p, i) => (
              <g key={i}>
                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r="4" 
                  fill="#0F172A" 
                  stroke="#84CC16" 
                  strokeWidth="2" 
                />
                {/* Min / Max Labels or first/last values */}
                {(i === 0 || i === points.length - 1) && (
                  <text 
                    x={p.x} 
                    y={p.y - 8} 
                    textAnchor="middle" 
                    fill="#F8FAFC" 
                    fontSize="9" 
                    fontWeight="bold"
                  >
                    {p.val}
                  </text>
                )}
                {/* X-axis date labels */}
                {(i === 0 || i === points.length - 1 || points.length <= 5) && (
                  <text 
                    x={p.x} 
                    y={height - 8} 
                    textAnchor="middle" 
                    fill="#64748B" 
                    fontSize="8"
                  >
                    {p.label}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  // Helper to determine difference from preceding chronological log
  const getMetricDiff = (currentVal: number | undefined, index: number, key: string) => {
    if (currentVal === undefined) return null;
    
    // The measurements list is sorted newest to oldest.
    // The previous chronological measurement is at index + 1
    if (index >= measurements.length - 1) return null;

    const prevMeasure = measurements[index + 1];
    let prevVal: number | undefined;

    if (key === 'peso') {
      prevVal = prevMeasure.pesoKg;
    } else {
      prevVal = prevMeasure.medidas[key as keyof Medidas];
    }

    if (prevVal === undefined || prevVal === 0) return null;

    const diff = currentVal - prevVal;
    return Number(diff.toFixed(1));
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Histórico Físico</span>
          <h1 className="text-2xl font-bold text-slate-100 mt-0.5">Medidas Corporais</h1>
        </div>
        <button
          onClick={handleOpenModal}
          className="bg-lime-neon hover:bg-lime-neon-hover text-slate-900 font-bold px-3 py-2 rounded-xl text-xs transition-colors flex items-center gap-1"
        >
          <Plus className="h-4 w-4" /> Nova Medição
        </button>
      </div>

      {/* SVG Chart */}
      {authLoading || loadingData ? (
        <div className="h-44 flex items-center justify-center bg-slate-card/40 border border-border rounded-2xl">
          <Loader2 className="h-8 w-8 animate-spin text-lime-neon" />
        </div>
      ) : (
        renderSVGChart()
      )}

      {/* History List */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Histórico de Medições</h2>

        {authLoading || loadingData ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-lime-neon" />
          </div>
        ) : measurements.length === 0 ? (
          <div className="bg-slate-card/50 border border-dashed border-border rounded-2xl p-8 text-center">
            <Ruler className="h-8 w-8 text-slate-500 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Nenhuma medição cadastrada.</p>
            <button
              onClick={handleOpenModal}
              className="mt-3 bg-lime-neon hover:bg-lime-neon-hover text-slate-900 text-xs font-bold px-4 py-2 rounded-lg transition-colors"
            >
              Criar Primeira Medição
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {measurements.map((item, idx) => {
              const isExpanded = expandedId === item.id;
              const dateObj = item.data?.seconds ? new Date(item.data.seconds * 1000) : new Date(item.data);
              const dateStr = dateObj.toLocaleDateString('pt-BR');

              const weightDiff = getMetricDiff(item.pesoKg, idx, 'peso');

              return (
                <div 
                  key={item.id}
                  className="bg-slate-card border border-border rounded-2xl overflow-hidden shadow"
                >
                  {/* Card Overview */}
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <div>
                        <span className="text-xs font-bold text-slate-100">{dateStr}</span>
                        <span className="text-[10px] text-slate-500 block">Data do registro</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-100">{item.pesoKg} kg</span>
                        <div className="flex items-center gap-1 justify-end">
                          {weightDiff !== null && (
                            <span className={`text-[10px] font-bold ${weightDiff > 0 ? 'text-success' : weightDiff < 0 ? 'text-danger' : 'text-slate-400'}`}>
                              {weightDiff > 0 ? `▲ +${weightDiff}kg` : weightDiff < 0 ? `▼ ${weightDiff}kg` : '0kg'}
                            </span>
                          )}
                          <span className="text-[9px] text-slate-500">Peso</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-300">IMC {item.imcCalculado}</span>
                        <span className="text-[9px] text-slate-500 block">IMC</span>
                      </div>

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="text-slate-400 hover:text-slate-200"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded measurements details */}
                  {isExpanded && (
                    <div className="bg-slate-card-light/20 border-t border-border/30 p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        {Object.entries(SITE_LABELS).map(([key, label]) => {
                          const val = item.medidas[key as keyof Medidas];
                          const diff = getMetricDiff(val, idx, key);

                          return (
                            <div key={key} className="flex justify-between py-1.5 border-b border-border/20 last:border-0 sm:last:border-b">
                              <span className="text-slate-400">{label.replace(' (cm)', '')}</span>
                              <div className="flex items-center gap-1.5 font-bold text-slate-100">
                                <span>{val !== undefined ? `${val} cm` : '-'}</span>
                                {diff !== null && diff !== 0 && (
                                  <span className={`text-[9px] font-bold ${diff > 0 ? 'text-success' : 'text-danger'}`}>
                                    {diff > 0 ? `(+${diff})` : `(${diff})`}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal - New Measurement */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="bg-slate-card border border-border rounded-2xl w-full max-w-sm max-h-[85vh] p-6 shadow-2xl overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <h3 className="font-bold text-slate-100 flex items-center gap-1.5">
                <Ruler className="h-5 w-5 text-lime-neon" /> Nova Medição
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="bg-danger/10 border border-danger/20 text-danger text-xs p-3 rounded-lg">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveMeasurement} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Peso Corporal (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 75.5"
                    value={pesoInput}
                    onChange={(e) => setPesoInput(e.target.value)}
                    className="w-full bg-slate-card-light border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-lime-neon text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Data da Medição
                  </label>
                  <input
                    type="date"
                    value={measureDate}
                    onChange={(e) => setMeasureDate(e.target.value)}
                    className="w-full bg-slate-card-light border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-lime-neon text-white"
                    required
                  />
                </div>
              </div>

              <div className="border-t border-border/50 pt-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Medidas Adicionais (cm)</h4>
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {Object.entries(SITE_LABELS).map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        {label.replace(' (cm)', '')}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Ex: 38"
                        value={medidasInput[key] || ''}
                        onChange={(e) => setMedidasInput({ ...medidasInput, [key]: e.target.value })}
                        className="w-full bg-slate-card-light border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-lime-neon text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-card-light hover:bg-slate-card-light/80 text-slate-200 font-semibold py-2.5 rounded-xl text-xs transition-colors border border-border"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-lime-neon hover:bg-lime-neon-hover text-slate-900 font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> Salvar
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
