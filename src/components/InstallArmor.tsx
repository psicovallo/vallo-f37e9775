/**
 * InstallArmor — Guida brutale all'installazione PWA.
 * Rileva il dispositivo (iOS/Android/Desktop) e mostra istruzioni mirate.
 * Non registra service worker, non installa nulla in autonomia: solo UI.
 *
 * Su Android, se il browser supporta `beforeinstallprompt`, espone un
 * pulsante che invoca il prompt nativo.
 */

import { useEffect, useState } from 'react';
import { Share, MoreVertical, Skull, Smartphone, Apple, Monitor } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform = 'ios' | 'android' | 'desktop';

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream) {
    return 'ios';
  }
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

function isStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export default function InstallArmor() {
  const [platform, setPlatform] = useState<Platform>('desktop');
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isStandaloneMode());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  };

  if (installed) {
    return (
      <div className="rounded-none border-2 border-primary bg-primary/10 p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-primary">
          ⚡ Armatura installata
        </p>
        <p className="mt-1 text-xs text-foreground leading-relaxed">
          Sei un soldato, non un passante. L'app vive sul tuo schermo.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-none border-2 border-destructive/60 bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Skull size={18} className="text-destructive" />
        <p className="text-[10px] font-black uppercase tracking-widest text-destructive">
          Installa l'arma sul tuo schermo
        </p>
      </div>

      {platform === 'ios' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-foreground">
            <Apple size={14} className="text-primary" /> Procedura iOS (Safari)
          </div>
          <ol className="list-decimal pl-5 text-xs text-foreground space-y-1.5 leading-relaxed">
            <li>
              Tocca il pulsante <strong className="text-primary inline-flex items-center gap-1">
                <Share size={12} /> Condividi
              </strong> in basso al centro.
            </li>
            <li>
              Scorri e scegli <strong className="text-primary">"Aggiungi alla schermata Home"</strong>.
            </li>
            <li>Conferma con <strong className="text-primary">"Aggiungi"</strong>.</li>
          </ol>
          <p className="text-[10px] uppercase font-black text-destructive leading-snug">
            Se non lo fai, sei solo un passante nel browser. Le notifiche non possono raggiungerti.
          </p>
        </div>
      )}

      {platform === 'android' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-foreground">
            <Smartphone size={14} className="text-primary" /> Procedura Android (Chrome)
          </div>
          {deferredPrompt ? (
            <button
              onClick={handleAndroidInstall}
              className="w-full rounded-none bg-primary px-4 py-3 text-xs font-black uppercase tracking-widest text-primary-foreground hover:bg-primary/90 active:scale-[0.97]"
            >
              ⚡ Installa l'App ora
            </button>
          ) : (
            <ol className="list-decimal pl-5 text-xs text-foreground space-y-1.5 leading-relaxed">
              <li>
                Tocca i <strong className="text-primary inline-flex items-center gap-1">
                  <MoreVertical size={12} /> tre puntini
                </strong> in alto a destra del browser.
              </li>
              <li>
                Scegli <strong className="text-primary">"Installa app"</strong> o
                {' '}<strong className="text-primary">"Aggiungi a schermata Home"</strong>.
              </li>
              <li>Conferma. L'icona apparirà sul tuo schermo.</li>
            </ol>
          )}
          <p className="text-[10px] uppercase font-black text-destructive leading-snug">
            Trasforma questo sito in un'arma permanente sul tuo schermo. Il browser è una stanza in affitto.
          </p>
        </div>
      )}

      {platform === 'desktop' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-foreground">
            <Monitor size={14} className="text-primary" /> Procedura Desktop (Chrome / Edge)
          </div>
          <ol className="list-decimal pl-5 text-xs text-foreground space-y-1.5 leading-relaxed">
            <li>
              Cerca l'icona <strong className="text-primary">"Installa"</strong> nella barra degli indirizzi (a destra).
            </li>
            <li>Clicca e conferma <strong className="text-primary">"Installa"</strong>.</li>
            <li>L'app diventerà una finestra dedicata sul tuo computer.</li>
          </ol>
          <p className="text-[10px] uppercase font-black text-muted-foreground leading-snug">
            Per la massima efficacia, installa l'app sul telefono: lì arrivano le push.
          </p>
        </div>
      )}
    </div>
  );
}
