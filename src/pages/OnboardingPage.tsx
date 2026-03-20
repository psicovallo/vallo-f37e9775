import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';
import { Flame, Clock, Bell, ChevronRight, Target, PenLine } from 'lucide-react';

const TIME_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const h = i + 7;
  return `${h.toString().padStart(2, '0')}:00`;
});

type Step = 'patto' | 'obiettivo' | 'pietra_miliare' | 'attivazione';

const SEED_QUESTIONS = [
  { text: 'Se oggi dovessi smettere di raccontarti la scusa che usi più spesso, cosa resterebbe della tua giornata?', category: 'Lo Specchio della Realtà' },
  { text: "Quante volte nell'ultima settimana hai scelto consapevolmente di fallire per non dover affrontare la fatica di riuscire?", category: 'Lo Specchio della Realtà' },
  { text: 'Qual è il vantaggio segreto che ottieni restando esattamente nella situazione in cui ti trovi ora?', category: 'Lo Specchio della Realtà' },
  { text: 'Quando dici "non ho tempo", a cosa stai dando la precedenza per evitare di guardare il tuo obiettivo?', category: 'Il Crollo delle Giustificazioni' },
  { text: 'Se la persona che ami di più al mondo ti guardasse agire oggi, sarebbe orgogliosa della tua coerenza o delle tue scuse?', category: 'Il Crollo delle Giustificazioni' },
  { text: 'Qual è la bugia più grande che hai detto a te stesso stamattina per sentirti in pace con la tua pigrizia?', category: 'Il Crollo delle Giustificazioni' },
  { text: 'Se il tuo fallimento fosse una scelta deliberata e non un incidente, quale sarebbe il tuo vero obiettivo?', category: 'La Responsabilità Cruda' },
  { text: 'A chi stai dando il potere di decidere della tua vita ogni volta che dici "è colpa dello stress"?', category: 'La Responsabilità Cruda' },
  { text: 'Cosa accadrebbe se oggi ammettessi che tutto quello che ti blocca è una tua creazione per restare al sicuro?', category: 'La Responsabilità Cruda' },
];

export default function OnboardingPage({ onComplete }: { onComplete: () => void }) {
  const { user } = useAuth();
  const { isSupported, requestPermission } = usePushNotifications();
  const [step, setStep] = useState<Step>('patto');
  const [objective, setObjective] = useState('Dimagrimento');
  const [milestoneZero, setMilestoneZero] = useState('');
  const [windowStart, setWindowStart] = useState('08:00');
  const [windowEnd, setWindowEnd] = useState('22:00');
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    if (!user) return;
    if (windowEnd <= windowStart) {
      toast.error("La fine della fascia deve essere successiva all'inizio.");
      return;
    }

    setLoading(true);
    try {
      // Save objective and milestone on profile
      await supabase
        .from('profiles')
        .update({ objective, milestone_zero: milestoneZero })
        .eq('user_id', user.id);

      // Upsert question_progress for notification scheduling
      const { data: existing } = await supabase
        .from('question_progress')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('question_progress')
          .update({
            onboarding_completed: true,
            notification_window_start: windowStart,
            notification_window_end: windowEnd,
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('question_progress').insert({
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

      // Create seed question_assignments
      const assignments = SEED_QUESTIONS.map((q, i) => ({
        user_id: user.id,
        question_text: q.text,
        is_seed_question: true,
        sort_order: i + 1,
        status: 'da_leggere' as const,
        view_count: 0,
      }));

      await supabase.from('question_assignments').insert(assignments);

      // Request push permission
      if (isSupported) {
        const ok = await requestPermission();
        if (!ok) {
          toast.warning('Notifiche non attivate. Puoi attivarle dalle impostazioni del browser.');
        }
      }

      toast.success('Percorso attivato.');
      onComplete();
    } catch (err) {
      toast.error("Errore durante l'attivazione");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 pb-24 pt-8">
      {step === 'patto' && (
        <div className="flex flex-1 flex-col">
          <div className="mb-8 text-center">
            <Flame size={48} className="mx-auto mb-4 text-primary" />
            <h1 className="mb-2 text-2xl font-bold text-foreground">Il Patto</h1>
            <p className="text-sm text-muted-foreground">
              Prima di procedere, devi sapere in cosa ti stai cacciando.
            </p>
          </div>

          <div className="flex-1 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm text-foreground leading-relaxed">
                Questo non è un'app motivazionale. Non ci sono premi, badge, stelline o complimenti.
                Questo è uno specchio. E gli specchi non mentono.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <Bell size={20} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">6 notifiche al giorno</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    La stessa domanda tornerà finché non l'hai attraversata. Non puoi saltarla, non puoi ignorarla.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <Clock size={20} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Nessuna risposta immediata</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Dovrai guardare ogni domanda per giorni. 9 volte minimo. Solo allora potrai rispondere — e la risposta sarà filtrata senza pietà.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <Flame size={20} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Zero gratificazione</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Il tono è severo. Le scuse vengono bloccate. Le parole vaghe rifiutate. Se cerchi comfort, questa non è l'app per te.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep('obiettivo')}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.97]"
          >
            HO CAPITO. ACCETTO IL PATTO
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {step === 'obiettivo' && (
        <div className="flex flex-1 flex-col">
          <div className="mb-8 text-center">
            <Target size={48} className="mx-auto mb-4 text-primary" />
            <h1 className="mb-2 text-2xl font-bold text-foreground">Il tuo obiettivo</h1>
            <p className="text-sm text-muted-foreground">
              Su cosa vuoi lavorare? Scegli il focus del percorso.
            </p>
          </div>

          <div className="flex-1 space-y-3">
            {['Dimagrimento', 'Autostima', 'Disciplina', 'Relazioni'].map((obj) => (
              <button
                key={obj}
                onClick={() => setObjective(obj)}
                className={`w-full rounded-2xl border p-4 text-left text-sm font-medium transition-all active:scale-[0.97] ${
                  objective === obj
                    ? 'border-primary bg-primary/10 text-foreground ring-2 ring-primary ring-offset-2 ring-offset-background'
                    : 'border-border bg-card text-foreground hover:border-primary/50'
                }`}
              >
                {obj}
              </button>
            ))}
          </div>

          <button
            onClick={() => setStep('pietra_miliare')}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.97]"
          >
            Conferma obiettivo
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {step === 'pietra_miliare' && (
        <div className="flex flex-1 flex-col">
          <div className="mb-8 text-center">
            <PenLine size={48} className="mx-auto mb-4 text-primary" />
            <h1 className="mb-2 text-2xl font-bold text-foreground">Pietra Miliare Zero</h1>
            <p className="text-sm text-muted-foreground">
              Perché sei qui oggi? Scrivi la verità, non quello che vorresti fosse vero.
            </p>
          </div>

          <div className="flex-1">
            <textarea
              value={milestoneZero}
              onChange={(e) => setMilestoneZero(e.target.value)}
              placeholder="Perché sei qui oggi? Sii brutalmente onesto con te stesso..."
              rows={6}
              className={`${inputClass} resize-none`}
            />
            <p className={`mt-2 text-xs ${milestoneZero.trim().length >= 20 ? 'text-primary' : 'text-muted-foreground'}`}>
              {milestoneZero.trim().length}/20 caratteri minimi
            </p>
          </div>

          <button
            onClick={() => setStep('attivazione')}
            disabled={milestoneZero.trim().length < 20}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 active:scale-[0.97]"
          >
            Conferma
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {step === 'attivazione' && (
        <div className="flex flex-1 flex-col">
          <div className="mb-8 text-center">
            <div className="mb-6 text-6xl">🔥</div>
            <h1 className="mb-2 text-2xl font-bold text-foreground">Attivazione</h1>
            <p className="text-sm text-muted-foreground">
              Scegli quando vuoi ricevere le notifiche. 6 orari casuali dentro questa fascia.
            </p>
          </div>

          <div className="flex-1 space-y-6">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Inizio fascia</label>
              <select value={windowStart} onChange={(e) => setWindowStart(e.target.value)} className={inputClass}>
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Fine fascia</label>
              <select value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} className={inputClass}>
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Le tue 6 notifiche arriveranno tra le <span className="font-semibold text-primary">{windowStart}</span> e le <span className="font-semibold text-primary">{windowEnd}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleActivate}
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 active:scale-[0.97]"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <>
                <Bell size={18} />
                ATTIVA LE TUE RIFLESSIONI
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
