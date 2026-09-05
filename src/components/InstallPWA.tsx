'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import ClipzBodyIcon from '@/components/ClipzBodyIcon';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Show the install banner
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="bg-slate-card border-b border-border text-slate-100 px-4 py-3 flex items-center justify-between text-sm md:max-w-md mx-auto md:rounded-lg md:border md:mt-4 md:shadow-lg">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-lime-neon/10 text-lime-neon flex items-center justify-center">
          <ClipzBodyIcon className="h-4 w-4 text-lime-neon" />
        </div>
        <div>
          <p className="font-semibold text-xs">Instalar ClipzBody</p>
          <p className="text-[10px] text-slate-400">Instale no celular para usar offline e ter acesso rápido</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleInstallClick}
          className="bg-lime-neon hover:bg-lime-neon-hover text-slate-900 font-bold px-3 py-1 rounded-xl text-xs transition-colors"
        >
          Instalar
        </button>
        <button
          onClick={() => setShowBanner(false)}
          className="text-slate-400 hover:text-slate-200"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
