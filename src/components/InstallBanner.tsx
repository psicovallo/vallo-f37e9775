import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallBanner() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Don't show if already installed (standalone mode)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;

    if (isStandalone) return;

    // Check if dismissed recently
    const dismissed = localStorage.getItem('install-banner-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    // Android: listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS: show manual instruction banner
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS && !isStandalone) {
      setShow(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setShow(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('install-banner-dismissed', Date.now().toString());
  };

  if (!show) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
      <Download size={18} className="shrink-0 text-destructive" />
      <div className="flex-1 min-w-0">
        {isIOS ? (
          <p className="text-xs text-foreground leading-snug">
            Installa l'app: tocca <span className="font-bold">Condividi</span> → <span className="font-bold">Aggiungi alla schermata Home</span>
          </p>
        ) : (
          <button onClick={handleInstall} className="text-xs text-foreground font-medium leading-snug text-left">
            Installa l'app sul tuo telefono per un'esperienza migliore
          </button>
        )}
      </div>
      <button onClick={handleDismiss} className="shrink-0 p-1 text-muted-foreground hover:text-foreground">
        <X size={14} />
      </button>
    </div>
  );
}
