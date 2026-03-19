import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';
import { Flame, Clock, Bell, ChevronRight, Check } from 'lucide-react';

const TIME_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const h = i + 7; // 07:00 to 21:00
  return `${h.toString().padStart(2, '0')}:00`;
});

type Step = 'contract' | 'window' | 'activate';

export default function OnboardingPage({ onComplete }: { onComplete: () => void }) {
  const { user } = useAuth();
  const { isSupported, requestPermission } = usePushNotifications();
  const [step, setStep] = useState<Step>('contract');
  const [windowStart, setWindowStart] = useState('08:00');
  const [windowEnd, setWindowEnd] = useState('22:00');
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Save onboarding data FIRST (before push, so progress is saved even if push fails)
      const { data: existing } = await supabase
        .from('question_progress')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('question_progress')
          .update({
            onboarding_completed: true,
            notification_window_start: windowStart,
            notification_window_end: windowEnd,
            phase: 'incubation',
            questions_read_count: 0,
          })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('question_progress')
          .insert({
            user_id: user.id,
            onboarding_completed: true,
            notification_window_start: windowStart,
            notification_window_end: windowEnd,
            phase: 'incubation',
            questions_read_count: 0,
            current_question_index: 1,
            answered: false,
          });
      }

      // Request push permission AFTER saving (non-blocking)
      if (isSupported) {
        const ok = await requestPermission();
        if (!ok) {
          toast.warning('Notifiche non attivate. Puoi attivarle dalle impostazioni del browser.');
        }
      }

      toast.success('Percorso attivato! Le tue riflessioni stanno arrivando.');
      onComplete();
    } catch (err) {
      toast.error('Errore durante l\'attivazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-8 pb-24 min-h-screen flex flex-col">
      {step === 'contract' && (
        <div className="flex-1 flex flex-col">
          <div className="text-center mb-8">
            <Flame size={48} className="text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Contratto di Consapevolezza
            </h1>
            <p className="text-sm text-muted-foreground">
              Prima di iniziare, devi sapere cosa ti aspetta.
            </p>
          </div>

          <div className="space-y-4 flex-1">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <Bell size={20} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground text-sm">6 notifiche al giorno</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Riceverai 3 domande ripetute in 6 momenti random nella tua fascia oraria.
                    Non puoi ignorarle.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <Clock size={20} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground text-sm">Fase Incubazione (2-3 giorni)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Per le prime 6 domande dovrai solo leggerle. Non puoi rispondere.
                    Dormici sopra, scrivile su carta. La verità ha bisogno di tempo.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <Flame size={20} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground text-sm">Fase Risposta</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Dopo aver letto 6 domande, si sblocca la risposta.
                    60 secondi di attesa, minimo 50 caratteri, nessuna scorciatoia.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <p className="text-sm text-foreground font-medium text-center">
                "Se il cibo è il tuo carceriere, queste domande sono la chiave.
                Ma la chiave brucia."
              </p>
            </div>
          </div>

          <button
            onClick={() => setStep('window')}
            className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Accetto il contratto
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {step === 'window' && (
        <div className="flex-1 flex flex-col">
          <div className="text-center mb-8">
            <Clock size={48} className="text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              La tua finestra di riflessione
            </h1>
            <p className="text-sm text-muted-foreground">
              Scegli quando vuoi ricevere le notifiche. Il sistema invierà 6 notifiche random in questa fascia.
            </p>
          </div>

          <div className="space-y-6 flex-1">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Inizio fascia
              </label>
              <select
                value={windowStart}
                onChange={e => setWindowStart(e.target.value)}
                className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {TIME_OPTIONS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Fine fascia
              </label>
              <select
                value={windowEnd}
                onChange={e => setWindowEnd(e.target.value)}
                className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {TIME_OPTIONS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Le tue 6 notifiche arriveranno tra le <span className="text-primary font-semibold">{windowStart}</span> e le <span className="text-primary font-semibold">{windowEnd}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setStep('activate')}
            className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Conferma orari
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {step === 'activate' && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center mb-8">
            <div className="text-6xl mb-6">🔥</div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Tutto pronto
            </h1>
            <p className="text-sm text-muted-foreground">
              Attiva le notifiche per ricevere le tue domande di sradicamento.
              Senza notifiche, il percorso non può iniziare.
            </p>
          </div>

          <button
            onClick={handleActivate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <>
                <Bell size={18} />
                Attiva le tue riflessioni
              </>
            )}
          </button>

          {!isSupported && (
            <p className="mt-4 text-xs text-destructive text-center">
              Il tuo browser non supporta le notifiche push. Prova con Chrome o Safari.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
