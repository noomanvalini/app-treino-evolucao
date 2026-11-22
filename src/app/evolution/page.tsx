'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import BottomNavigation from '@/components/BottomNavigation';
import { EmbeddedViewProvider } from '@/context/EmbeddedViewContext';
import StrengthPage from '@/app/strength/page';
import MeasuresPage from '@/app/measures/page';
import { Dumbbell, Ruler, Loader2 } from 'lucide-react';

function EvolutionContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'medidas' ? 'medidas' : 'forca';
  const [activeTab, setActiveTab] = useState<'forca' | 'medidas'>(initialTab);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'medidas') setActiveTab('medidas');
    else if (t === 'forca') setActiveTab('forca');
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#100F0F] text-[#f8fafc] pb-28">
      <AppHeader />

      <div className="pt-4 max-w-md mx-auto">
        {/* Top Switch Pill (Força | Medidas) — same pattern as History (Timeline | Calendário) */}
        <div className="grid grid-cols-2 p-[4px] rounded-full bg-[#151413] border border-white/[0.06] mb-2">
          <button
            type="button"
            onClick={() => setActiveTab('forca')}
            className={`flex items-center justify-center gap-1.5 py-[9px] px-3 rounded-full text-[13px] font-bold transition-all ${
              activeTab === 'forca'
                ? 'bg-[#f59e0b] text-[#100F0F] shadow-sm'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Dumbbell className="w-[15px] h-[15px]" />
            <span>Força</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('medidas')}
            className={`flex items-center justify-center gap-1.5 py-[9px] px-3 rounded-full text-[13px] font-bold transition-all ${
              activeTab === 'medidas'
                ? 'bg-[#f59e0b] text-[#100F0F] shadow-sm'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Ruler className="w-[15px] h-[15px]" />
            <span>Medidas</span>
          </button>
        </div>

        {/* Embedded View Content */}
        <EmbeddedViewProvider embedded={true}>
          {activeTab === 'forca' ? <StrengthPage /> : <MeasuresPage />}
        </EmbeddedViewProvider>
      </div>

      <BottomNavigation />
    </div>
  );
}

export default function EvolutionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#100F0F] flex flex-col items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#f59e0b]" />
          <span className="mt-2 text-xs text-[#94a3b8]">Carregando evolução...</span>
        </div>
      }
    >
      <EvolutionContent />
    </Suspense>
  );
}
