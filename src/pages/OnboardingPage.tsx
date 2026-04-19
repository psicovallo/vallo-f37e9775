import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';
import { Flame, Clock, Bell, ChevronRight, Target, PenLine, Skull, Euro, Sun } from 'lucide-react';
import InstallArmor from '@/components/InstallArmor';

const TIME_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const h = i + 7;
  return `${h.toString().padStart(2, '0')}:00`;
});

type Step = 'patto' | 'obiettivo' | 'debito' | 'pietra_miliare' | 'attivazione';

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
  const [objective, setObjective] = useState('Dominio Finanziario');
  const [monthlyCost, setMonthlyCost] = useState('');
  const [costError, setCostError] = useState('');
  const [milestoneZero, setMilestoneZero] = useState('');
  const [windowStart, setWindowStart] = useState('08:00');
  const [windowEnd, setWindowEnd] = useState('22:00');
  const [loading, setLoading] = useState(false);

  const validateCost = (): boolean => {
    const n = parseFloat(monthlyCost.replace(',', '.'));
    if (!monthlyCost.trim()) {
      setCostError('VUOTO. Non sai nemmeno quanto costi a te stesso? Inserisci il numero.');
      return false;
    }
    if (isNaN(n) || n <= 0) {
      setCostError('Numero non valido. Le tue approssimazioni sono il motivo per cui sei qui.');
      return false;
    }
    if (n < 200) {
      setCostError('Stai mentendo o vivi sotto un ponte. Sii onesto: affitto, cibo, vizi. Riscrivi.');
      return false;
    }
    setCostError('');
    return true;
  };

  const handleActivate = async () => {
    if (!user) return;
    if (windowEnd <= windowStart) {
      toast.error("La fine della fascia deve essere successiva all'inizio.");
      return;
    }

    setLoading(true);
    try {
      const monthlyCostNum = parseFloat(monthlyCost.replace(',', '.'));
      const composedMilestone = `[Costo mensile dichiarato: €${monthlyCostNum}]\n\n${milestoneZero}`;

      await supabase
        .from('profiles')
        .update({ objective, milestone_zero: composedMilestone })
        .eq('user_id', user.id);

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

      const assignments = SEED_QUESTIONS.map((q, i) => ({
        user_id: user.id,
        question_text: q.text,
        is_seed_question: true,
        sort_order: i + 1,
        status: 'da_leggere' as const,
        view_count: 0,
      }));

      await supabase.from('question_assignments').insert(assignments);

      if (isSupported) {
        const ok = await requestPermission();
        if (!ok) {
          toast.warning('Notifiche non attivate. Senza di esse, il sistema non può colpirti.');
        }
      }

      toast.success('Iniziazione completata. Il Vallo è alzato.');
      onComplete();
    } catch (err) {
      toast.error("Errore durante l'iniziazione");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full rounded-none border-2 border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary";
  const primaryBtn = "flex w-full items-center justify-center gap-2 rounded-none bg-primary px-4 py-4 text-sm font-black uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-50 active:scale-[0.97]";

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 pb-24 pt-8" style={{ backgroundColor: '#050505' }}>
      {step === 'patto' && (
        <div className="flex flex-1 flex-col">
          <div className="mb-8 text-center">
            <Skull size={56} className="mx-auto mb-4 text-primary" />
            <h1 className="mb-2 text-3xl font-black uppercase text-foreground tracking-tight">Il Patto</h1>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Leggi. Capisci. Firma con il sangue del tuo tempo.
            </p>
          </div>

          <div className="flex-1 space-y-3">
            <div className="rounded-none border-2 border-primary/40 bg-card p-5">
              <p className="text-sm text-foreground leading-relaxed">
                <strong className="text-primary">Psico Vallo non è un'app di supporto.</strong> Non è un coach,
                non è un amico, non è terapia. È <strong>un'armatura</strong> e un <strong>cruscotto</strong>:
                misura quanto stai derubando il tuo futuro e ti restituisce il conto, in euro, ogni giorno.
              </p>
            </div>

            <div className="rounded-none border-2 border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <Euro size={20} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-black uppercase text-foreground">Debito Finanziario</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Ogni cedimento dichiarato vale <strong className="text-primary">+100€</strong> di debito
                    virtuale. Quando il debito sale sopra zero, l'intera app diventa <strong>grigia</strong>:
                    è la tua "Paga dello Schiavo".
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-none border-2 border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <Bell size={20} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-black uppercase text-foreground">Notifiche Inevitabili</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Domande, SOS, Sfogo. Tornano finché non le attraversi. Niente snooze, niente pietà.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-none border-2 border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <Flame size={20} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-black uppercase text-foreground">Zero Gratificazione</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Nessun badge, nessuna stellina, nessun complimento. Solo il numero che cresce o che cala.
                    Tu decidi da che parte.
                  </p>
                </div>
              </div>
            </div>

            {/* LA LEGGE DELLA PRESENZA */}
            <div className="rounded-none border-2 border-destructive bg-destructive/10 p-5">
              <div className="flex items-start gap-3">
                <Sun size={20} className="mt-0.5 shrink-0 text-destructive" />
                <div>
                  <p className="text-sm font-black uppercase text-destructive">La Legge della Presenza</p>
                  <p className="mt-2 text-xs text-foreground leading-relaxed">
                    Il Consiglio non accetta fantasmi. Se non entri nell'app per <strong className="text-destructive">24 ore</strong>,
                    il sistema presume che tu sia tornato a dormire nel gregge.
                  </p>
                  <p className="mt-2 text-xs text-foreground leading-relaxed">
                    Conseguenza: <strong className="text-destructive">+50€ di Tassa di Passività</strong> e
                    inizio della <strong>Necrosi del Nucleo</strong>.
                    La tua sovranità richiede manutenzione quotidiana.
                  </p>
                  <p className="mt-2 text-xs font-black uppercase text-destructive">
                    Non è un'opzione. È il prezzo del potere.
                  </p>
                </div>
              </div>
            </div>

            {/* InstallArmor — guida installazione PWA */}
            <InstallArmor />
          </div>

          <button onClick={() => setStep('obiettivo')} className={`mt-6 ${primaryBtn}`}>
            ACCETTO IL GELO <ChevronRight size={18} />
          </button>
        </div>
      )}

      {step === 'obiettivo' && (
        <div className="flex flex-1 flex-col">
          <div className="mb-8 text-center">
            <Target size={56} className="mx-auto mb-4 text-primary" />
            <h1 className="mb-2 text-3xl font-black uppercase text-foreground tracking-tight">Il Dominio</h1>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Su quale fronte vuoi smettere di perdere?
            </p>
          </div>

          <div className="flex-1 space-y-2">
            {['Dominio Finanziario', 'Dominio Fisico', 'Dominio Relazionale', 'Dominio della Disciplina'].map((obj) => (
              <button
                key={obj}
                onClick={() => setObjective(obj)}
                className={`w-full rounded-none border-2 p-4 text-left text-sm font-black uppercase tracking-wide transition-none active:scale-[0.97] ${
                  objective === obj
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-card text-foreground hover:border-primary/50'
                }`}
              >
                {obj}
              </button>
            ))}
          </div>

          <button onClick={() => setStep('debito')} className={`mt-6 ${primaryBtn}`}>
            CONFERMA IL FRONTE <ChevronRight size={18} />
          </button>
        </div>
      )}

      {step === 'debito' && (
        <div className="flex flex-1 flex-col">
          <div className="mb-8 text-center">
            <Euro size={56} className="mx-auto mb-4 text-primary" />
            <h1 className="mb-2 text-3xl font-black uppercase text-foreground tracking-tight">Il Tuo Costo</h1>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Quanto ti costa esistere ogni mese?
            </p>
          </div>

          <div className="flex-1 space-y-4">
            <div className="rounded-none border-2 border-primary/40 bg-card p-4">
              <p className="text-xs text-foreground leading-relaxed">
                Affitto, cibo, bollette, vizi, abbonamenti, sigarette, alcol, scemenze online.
                <strong className="text-primary"> Tutto.</strong> Se non sai questo numero, non sai dove
                stai sanguinando. Sii onesto. Le approssimazioni sono il primo cedimento.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-widest text-muted-foreground">
                Costo mensile reale (€)
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={monthlyCost}
                onChange={(e) => { setMonthlyCost(e.target.value); setCostError(''); }}
                placeholder="Es. 1850"
                className={`${inputClass} text-lg font-black tabular-nums`}
              />
              {costError && (
                <p className="mt-2 text-xs font-bold uppercase text-destructive leading-relaxed">{costError}</p>
              )}
            </div>
          </div>

          <button
            onClick={() => { if (validateCost()) setStep('pietra_miliare'); }}
            className={`mt-6 ${primaryBtn}`}
          >
            DICHIARO IL NUMERO <ChevronRight size={18} />
          </button>
        </div>
      )}

      {step === 'pietra_miliare' && (
        <div className="flex flex-1 flex-col">
          <div className="mb-8 text-center">
            <PenLine size={56} className="mx-auto mb-4 text-primary" />
            <h1 className="mb-2 text-3xl font-black uppercase text-foreground tracking-tight">Pietra Zero</h1>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Perché sei qui. La verità, non il marketing che fai a te stesso.
            </p>
          </div>

          <div className="flex-1">
            <textarea
              value={milestoneZero}
              onChange={(e) => setMilestoneZero(e.target.value)}
              placeholder="Sii brutale. Cosa stai perdendo, a chi stai mentendo, cosa devi fermare..."
              rows={6}
              className={`${inputClass} resize-none`}
            />
            <p className={`mt-2 text-xs font-bold uppercase ${milestoneZero.trim().length >= 20 ? 'text-primary' : 'text-muted-foreground'}`}>
              {milestoneZero.trim().length}/20 caratteri minimi
            </p>
          </div>

          <button
            onClick={() => setStep('attivazione')}
            disabled={milestoneZero.trim().length < 20}
            className={`mt-6 ${primaryBtn}`}
          >
            INCIDO LA PIETRA <ChevronRight size={18} />
          </button>
        </div>
      )}

      {step === 'attivazione' && (
        <div className="flex flex-1 flex-col">
          <div className="mb-8 text-center">
            <div className="mb-6"><Clock size={56} className="mx-auto text-primary" /></div>
            <h1 className="mb-2 text-3xl font-black uppercase text-foreground tracking-tight">Iniziazione</h1>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              In che fascia oraria il sistema può colpirti?
            </p>
          </div>

          <div className="flex-1 space-y-6">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-widest text-muted-foreground">Inizio fascia</label>
              <select value={windowStart} onChange={(e) => setWindowStart(e.target.value)} className={inputClass}>
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-widest text-muted-foreground">Fine fascia</label>
              <select value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} className={inputClass}>
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="rounded-none border-2 border-primary/40 bg-card p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Sarai colpito tra le <span className="font-black text-primary">{windowStart}</span> e le <span className="font-black text-primary">{windowEnd}</span>
              </p>
            </div>
          </div>

          <button onClick={handleActivate} disabled={loading} className={`mt-6 ${primaryBtn}`}>
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <>
                <Bell size={18} />
                ALZA IL VALLO
              </>
            )}
          </button>

          {!isSupported && (
            <p className="mt-4 text-center text-xs font-bold uppercase text-destructive">
              Il tuo browser non supporta le notifiche push. Usa Chrome o Safari.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
