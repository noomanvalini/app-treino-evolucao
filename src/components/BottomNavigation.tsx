'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Dumbbell, TrendingUp, Sparkles, History } from 'lucide-react';

export default function BottomNavigation() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Início', href: '/dashboard', icon: Home, matchPrefixes: ['/dashboard'] },
    { name: 'Treinos', href: '/workouts', icon: Dumbbell, matchPrefixes: ['/workouts', '/workout'] },
    { name: 'Evolução', href: '/evolution', icon: TrendingUp, matchPrefixes: ['/evolution', '/strength', '/measures'] },
    { name: 'Análises', href: '/insights', icon: Sparkles, matchPrefixes: ['/insights'] },
    { name: 'Histórico', href: '/history', icon: History, matchPrefixes: ['/history'] },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-[#100F0F]/95 backdrop-blur-md pb-safe">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.matchPrefixes.some((p) => pathname?.startsWith(p));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
                isActive
                  ? 'text-[#f59e0b] font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-[10px] tracking-wide">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
