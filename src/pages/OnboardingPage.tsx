import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';
import { Flame, Clock, Bell, ChevronRight } from 'lucide-react';

const TIME_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const h = i + 7;
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
    if (windowEnd <= windowStart) {
      toast.error('La fine della fascia deve essere successiva all’inizio.');
      return;
    }

    setLoading(true);

    try {
      const { data: existing, error: existingError } = await supabase
        .from('question_progress')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        const { error: updateError } = await supabase
          .from('question_progress')
          .update({
            onboarding_completed: true,
            notification_window_start: windowStart,
            notification_window_end: windowEnd,
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
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

        if (insertError) throw insertError;
      }

      if (isSupported) {
        const ok = await requestPermission();
        if (!ok) {
          toast.warning('Notifiche non attivate. Puoi attivarle dalle impostazioni del browser.');
        }
      }

      toast.success('Percorso attivato. Da ora la stessa domanda tornerà finché non la completi.');
      onComplete();
    } catch (err) {
      toast.error('Errore durante l\'attivazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 pb-24 pt-8">
      {step === 'contract' && (
        <div className="flex flex-1 flex-col">
          <div className="mb-8 text-center">
            <Flame size={48} className="mx-auto mb-4 text-primary" />
            <h1 className="mb-2 text-2xl font-bold text-foreground">Contratto di Consapevolezza</h1>
            <p className="text-sm text-muted-foreground">Prima di iniziare, devi sapere esattamente come funzionerà.</p>
          </div>

          <div className="flex-1 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <Bell size={20} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">6 notifiche al giorno</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    La stessa domanda tornerà nei 6 slot casuali della tua fascia oraria finché non l’hai davvero attraversata.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <Clock size={20} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Fase Osservazione</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ogni domanda va guardata per 15 secondi almeno 9 volte. Se salti una lettura, il sistema continua a riproportela.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <Flame size={20} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">10ª apertura = risposta</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Alla 10ª apertura si sblocca 1 minuto di attesa, poi minimo 50 caratteri e infine scegli il bottone emotivo.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <p className="text-center text-sm font-medium text-foreground">
                "Se il cibo è il tuo carceriere, queste domande sono la chiave. Ma la chiave brucia."
              </p>
            </div>
          </div>

          <button
            onClick={() => setStep('window')}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Accetto il contratto
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {step === 'window' && (
        <div className="flex flex-1 flex-col">
          <div className="mb-8 text-center">
            <Clock size={48} className="mx-auto mb-4 text-primary" />
            <h1 className="mb-2 text-2xl font-bold text-foreground">La tua finestra di riflessione</h1>
            <p className="text-sm text-muted-foreground">
              Scegli quando vuoi ricevere le notifiche. Il sistema userà 6 orari casuali dentro questa fascia.
            </p>
          </div>

          <div className="flex-1 space-y-6">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Inizio fascia</label>
              <select
                value={windowStart}
                onChange={e => setWindowStart(e.target.value)}
                className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {TIME_OPTIONS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Fine fascia</label>
              <select
                value={windowEnd}
                onChange={e => setWindowEnd(e.target.value)}
                className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {TIME_OPTIONS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Le tue 6 notifiche arriveranno tra le <span className="font-semibold text-primary">{windowStart}</span> e le <span className="font-semibold text-primary">{windowEnd}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setStep('activate')}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Conferma orari
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {step === 'activate' && (
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="mb-8 text-center">
            <div className="mb-6 text-6xl">🔥</div>
            <h1 className="mb-2 text-2xl font-bold text-foreground">Tutto pronto</h1>
            <p className="text-sm text-muted-foreground">
              Attiva le notifiche per ricevere la tua domanda attiva 6 volte al giorno finché non la completi davvero.
            </p>
          </div>

          <button
            onClick={handleActivate}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
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
            <p className="mt-4 text-center text-xs text-destructive">
              Il tuo browser non supporta le notifiche push. Prova con Chrome o Safari.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
