import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Skull, Shield } from 'lucide-react';

const STORAGE_KEY = 'sos_lock_passed_at';
const PASS_TTL_MS = 30 * 60 * 1000; // 30 min — re-prompt after that

const QUESTIONS = [
  {
    q: 'Cosa stai per cedere adesso?',
    placeholder: 'Nominalo. Senza eufemismi.',
  },
  {
    q: 'Quanto vale, in euro, il piacere di 5 minuti contro 10 anni del tuo futuro?',
    placeholder: 'Scrivi la cifra. Guardala.',
  },
  {
    q: 'Chi sarai tra 6 mesi se cedi adesso? E chi sarai se reggi?',
    placeholder: 'Due righe. Una per scenario.',
  },
];

export default function SOSLockGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [passed, setPassed] = useState<boolean | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(['', '', '']);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const ts = localStorage.getItem(STORAGE_KEY);
    if (ts && Date.now() - Number(ts) < PASS_TTL_MS) {
      setPassed(true);
    } else {
      setPassed(false);
    }

    // Block back navigation while gate is active
    const blockBack = () => {
      window.history.pushState(null, '', window.location.href);
    };
    blockBack();
    window.addEventListener('popstate', blockBack);
    return () => window.removeEventListener('popstate', blockBack);
  }, []);

  const next = () => {
    if (!answers[step].trim()) return;
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      // "Riprendo il Controllo" path
      handleResist();
    }
  };

  async function handleResist() {
    if (!user || submitting) return;
    setSubmitting(true);
    // Salva l'anima: registra azione sovrana
    try {
      await supabase.functions.invoke('calculateVicePenalty', {
        body: { action: 'sovereign' },
      });
    } catch {
      /* non bloccante */
    }
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setPassed(true);
    setSubmitting(false);
  }

  async function handleCedo() {
    if (!user || submitting) return;
    const ok = window.confirm(
      'STAI PER VENDERE IL TUO FUTURO.\n\n+100€ al debito. Lucidità a 0. Streak azzerata.\n\nConfermi il cedimento?',
    );
    if (!ok) return;
    setSubmitting(true);
    try {
      await supabase.functions.invoke('calculateVicePenalty', {
        body: { action: 'sos_cedo' },
      });
    } catch {
      /* server is source of truth */
    }
    setSubmitting(false);
    window.alert('Hai ceduto. Lucidità: 0. Debito aumentato. Ora chiudi.');
    // "chiudi l'app forzatamente" — best effort: torna alla home + prova close
    window.location.replace('/home');
    setTimeout(() => {
      try {
        window.close();
      } catch {
        /* noop */
      }
    }, 200);
  }

  if (passed === null) return null;
  if (passed) return <>{children}</>;

  const current = QUESTIONS[step];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: '#050505' }}
    >
      <div
        className="w-full max-w-md border-2 border-red-700 p-6"
        style={{ backgroundColor: '#0a0000' }}
      >
        <div className="mb-4 flex items-center justify-between border-b-2 border-red-800 pb-3">
          <div className="flex items-center gap-2">
            <Skull size={18} className="text-red-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">
              SOS DNA — Blocco Attivo
            </span>
          </div>
          <span className="text-[10px] font-black tabular-nums text-red-400">
            {step + 1}/{QUESTIONS.length}
          </span>
        </div>

        <h2 className="mb-3 text-xl font-black uppercase leading-tight text-white">
          {current.q}
        </h2>

        <textarea
          value={answers[step]}
          onChange={(e) => {
            const next = [...answers];
            next[step] = e.target.value;
            setAnswers(next);
          }}
          placeholder={current.placeholder}
          rows={4}
          autoFocus
          className="mb-4 w-full border-2 border-neutral-800 bg-black p-3 text-sm text-white placeholder:text-neutral-700 focus:border-red-700 focus:outline-none"
        />

        <div className="space-y-2">
          {step < QUESTIONS.length - 1 ? (
            <button
              onClick={next}
              disabled={!answers[step].trim() || submitting}
              className="w-full border-2 border-amber-700 bg-amber-950/40 p-3 text-sm font-black uppercase tracking-widest text-amber-400 hover:bg-amber-900/50 disabled:opacity-30"
            >
              Avanti →
            </button>
          ) : (
            <button
              onClick={handleResist}
              disabled={!answers[step].trim() || submitting}
              className="flex w-full items-center justify-center gap-2 border-2 border-emerald-700 bg-emerald-950/40 p-3 text-sm font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-900/50 disabled:opacity-30"
            >
              <Shield size={14} /> Riprendo il Controllo
            </button>
          )}

          <button
            onClick={handleCedo}
            disabled={submitting}
            className="w-full border-2 border-red-800 bg-red-950/40 p-3 text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-900/50 disabled:opacity-30"
          >
            ⛓ Cedo — Vendi il futuro
          </button>
        </div>

        <p className="mt-4 text-center text-[9px] uppercase tracking-widest text-neutral-600">
          Nessuna scorciatoia. Rispondi o cedi.
        </p>
      </div>
    </div>
  );
}
