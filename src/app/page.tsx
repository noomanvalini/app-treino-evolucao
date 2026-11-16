'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ClipzBodyBadge from '@/components/ClipzBodyBadge';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4">
        <ClipzBodyBadge className="h-12 w-auto" priority />
        <p className="text-xs text-slate-400">Carregando evolução de treino...</p>
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-card">
          <div className="h-full w-1/2 animate-infinite-loading rounded-full bg-lime-neon"></div>
        </div>
      </div>
    </div>
  );
}
