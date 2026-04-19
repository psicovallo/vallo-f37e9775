import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronRight, X, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

interface GuidedTourProps {
  onClose: () => void;
}

const STEPS = [
  {
    emoji: '🏠',
    title: 'HOME',
    headline: 'Da qui comandi tutto.',
    body: 'Una sola plancia. Sette strumenti. Niente decorazioni inutili. Ogni icona è un\'arma.',
    accent: 'text-primary',
  },
  {
    emoji: '🔥',
    title: 'DOMANDA ATTIVA',
    headline: 'Il cuore del sistema.',
    body: 'Ogni giorno una domanda. La leggi 9 volte, in 9 momenti diversi. Solo dopo puoi rispondere. Niente scorciatoie.',
    accent: 'text-primary',
  },
  {
    emoji: '⚔️',
    title: 'SOS DNA',
    headline: 'Quando lo scontro è reale.',
    body: 'Profila il bersaglio. Il Consiglio dei 15 Maestri smonta i suoi veli e ti consegna le frecce. Tu le ripeti 5 volte e le lanci.',
    accent: 'text-amber-500',
  },
  {
    emoji: '✍️',
    title: 'AREA SFOGO',
    headline: 'Quando hai casino in testa.',
    body: 'Scrivi tutto, senza filtri. L\'AI raccoglie il fango e te lo restituisce sotto forma di domande chirurgiche. 30 minuti, poi chiudi.',
    accent: 'text-primary',
  },
  {
    emoji: '🔨',
    title: 'LA FORGIA & OVERTON',
    headline: 'Quando vuoi spingere oltre.',
    body: 'La Forgia: sfide quotidiane brutali. Overton Shift: 5 step per spostare l\'impossibile dentro di te. Solo per chi è pronto.',
    accent: 'text-red-500',
  },
  {
    emoji: '🔔',
    title: 'NOTIFICHE',
    headline: 'Tutto programmato. Tutto modificabile.',
    body: 'Nei Promemoria gestisci ogni singola domanda: orario, archivio, eliminazione. Sei tu il regista del ritmo.',
    accent: 'text-primary',
  },
];

export default function GuidedTour({ onClose }: GuidedTourProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);

  const finish = async () => {
    if (closing) return;
    setClosing(true);
    if (user) {
      await supabase.from('profiles').update({ tour_completed: true } as any).eq('user_id', user.id);
    }
    onClose();
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  };

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* progress */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 w-8 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>
          <button onClick={finish} className="text-muted-foreground hover:text-foreground" aria-label="Salta">
            <X size={20} />
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 space-y-5 text-center">
          <div className="text-7xl leading-none">{current.emoji}</div>
          <p className={`text-xs font-black uppercase tracking-widest ${current.accent}`}>{current.title}</p>
          <h2 className="text-2xl font-black text-foreground uppercase leading-tight">{current.headline}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{current.body}</p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={next}
            className="flex items-center justify-center gap-2 w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {step === STEPS.length - 1 ? 'INIZIA' : 'AVANTI'} <ChevronRight size={18} />
          </button>
          <Link
            to="/manuale"
            onClick={finish}
            className="flex items-center justify-center gap-2 w-full rounded-2xl border border-border py-3 text-xs text-muted-foreground hover:bg-muted/40"
          >
            <BookOpen size={14} /> Apri il Manuale completo
          </Link>
        </div>

        <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest">
          Step {step + 1} di {STEPS.length}
        </p>
      </div>
    </div>
  );
}
