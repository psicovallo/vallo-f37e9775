import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Lock, Check, Timer } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const STEP_LABELS = [
  { num: 1, label: 'IMPENSABILE', subtitle: 'Il Tabù' },
  { num: 2, label: 'RADICALE', subtitle: 'La Frattura' },
  { num: 3, label: 'ACCETTABILE', subtitle: "L'Azione" },
  { num: 4, label: 'NORMA', subtitle: "L'Abitudine" },
  { num: 5, label: 'DOMINIO', subtitle: 'Il Nuovo DNA' },
];

const DECAY_HOURS = 48;

interface OvertoneShift {
  id: string;
  goal_text: string;
  current_step: number;
  status: string;
  step_confirmed_at: string | null;
}

interface OvertoneStep {
  id: string;
  step_number: number;
  label: string;
  action_text: string;
  confirmed: boolean;
  confirmed_at: string | null;
}

export default function OvertonPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState<OvertoneShift | null>(null);
  const [steps, setSteps] = useState<OvertoneStep[]>([]);
  const [goalInput, setGoalInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: shifts } = await supabase
      .from('overton_shifts')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    const activeShift = shifts?.[0] as OvertoneShift | undefined;

    if (activeShift) {
      setShift(activeShift);
      const { data: stepsData } = await supabase
        .from('overton_steps')
        .select('*')
        .eq('shift_id', activeShift.id)
        .order('step_number', { ascending: true });
      setSteps((stepsData || []) as OvertoneStep[]);
    } else {
      setShift(null);
      setSteps([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!shift?.step_confirmed_at) return;
    const interval = setInterval(() => {
      const confirmed = new Date(shift.step_confirmed_at!).getTime();
      const deadline = confirmed + DECAY_HOURS * 60 * 60 * 1000;
      const now = Date.now();
      const remaining = deadline - now;

      if (remaining <= 0) {
        handleDecay();
        clearInterval(interval);
        return;
      }

      const h = Math.floor(remaining / (1000 * 60 * 60));
      const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${h}h ${m}m`);
    }, 1000);

    return () => clearInterval(interval);
  }, [shift?.step_confirmed_at]);

  const handleDecay = async () => {
    if (!shift || !user) return;
    await supabase.from('overton_shifts').update({
      current_step: 1,
      step_confirmed_at: null,
      status: 'failed',
    } as any).eq('id', shift.id);

    toast.error('La finestra si è chiusa. Hai scelto la sicurezza della vittima rispetto al brivido del dominio. L\'ologramma resta intatto. Riavvia quando sei pronto a non mentire.', { duration: 8000 });
    setShift(null);
    setSteps([]);
  };

  const handleCreateShift = async () => {
    if (!user || !goalInput.trim()) return;

    const { data: prof } = await supabase
      .from('profiles')
      .select('objective, current_problems, vision')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!prof?.objective || !prof?.current_problems || !prof?.vision) {
      toast.error('Il Consiglio richiede i tuoi dati. Compila il Profilo Evolutivo per accedere.');
      navigate('/profile');
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-overton-steps', {
        body: { user_id: user.id, goal_text: goalInput.trim() },
      });
      if (error) throw error;
      toast.success('Il Consiglio ha scomposto il tuo obiettivo.');
      setGoalInput('');
      await loadData();
    } catch (err: any) {
      toast.error('Errore: ' + (err.message || 'Riprova'));
    }
    setGenerating(false);
  };

  const handleConfirmStep = async () => {
    if (!shift || !user) return;
    setConfirming(true);

    const nextStep = shift.current_step + 1;
    const now = new Date().toISOString();

    const currentStepData = steps.find(s => s.step_number === shift.current_step);
    if (currentStepData) {
      await supabase.from('overton_steps').update({
        confirmed: true,
        confirmed_at: now,
      } as any).eq('id', currentStepData.id);
    }

    if (nextStep > 5) {
      await supabase.from('overton_shifts').update({
        current_step: 5,
        status: 'completed',
        step_confirmed_at: now,
      } as any).eq('id', shift.id);
      toast.success('DOMINIO RAGGIUNTO. Il tuo DNA è stato riscritto.', { duration: 6000 });
      setShift(null);
      setSteps([]);
    } else {
      await supabase.from('overton_shifts').update({
        current_step: nextStep,
        step_confirmed_at: now,
      } as any).eq('id', shift.id);
      toast.success(`Step ${nextStep} sbloccato.`);
      await loadData();
    }
    setConfirming(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-[#E0E0E0]">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-neutral-800">
        <button onClick={() => navigate('/home')} className="text-neutral-400 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-black uppercase tracking-[0.2em]">OVERTON SHIFT</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 pb-28">
        {!shift ? (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <div className="text-4xl">🎯</div>
              <h2 className="text-lg font-bold text-white">La Finestra di Overton</h2>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Scegli un'azione che oggi consideri impossibile o inaccettabile.
                Il Consiglio la scomporrà in 5 step crescenti.
                Hai 48 ore per ogni step, o precipiti.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Qual è l'azione che oggi ritieni impossibile o inaccettabile compiere, e che cambierebbe le regole del tuo ologramma?
              </label>
              <Textarea
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                placeholder="Scrivi qui il tuo obiettivo impossibile..."
                className="bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600 min-h-[120px]"
              />
              <Button
                onClick={handleCreateShift}
                disabled={generating || !goalInput.trim()}
                className="w-full bg-red-900 hover:bg-red-800 text-white font-black uppercase tracking-wider py-3"
              >
                {generating ? (
                  <><Loader2 size={16} className="animate-spin" /> Il Consiglio sta deliberando...</>
                ) : (
                  'INIZIA LO SHIFT'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Obiettivo</p>
              <p className="text-sm text-white font-medium">{shift.goal_text}</p>
            </div>

            {shift.step_confirmed_at && shift.current_step < 5 && (
              <div className="flex items-center justify-center gap-2 text-amber-500">
                <Timer size={16} />
                <span className="text-sm font-mono font-bold">{timeLeft || 'Calcolo...'}</span>
                <span className="text-xs text-neutral-500">prima del decadimento</span>
              </div>
            )}

            <div className="flex flex-col items-center gap-0">
              {STEP_LABELS.map((step, idx) => {
                const stepData = steps.find(s => s.step_number === step.num);
                const isCurrent = shift.current_step === step.num;
                const isCompleted = stepData?.confirmed;
                const isLocked = step.num > shift.current_step;
                const isFirst = step.num === 1;

                return (
                  <div key={step.num} className="w-full">
                    {idx > 0 && (
                      <div className="flex justify-center">
                        <div className={`w-0.5 h-4 ${isCompleted || isCurrent ? 'bg-primary' : 'bg-neutral-800'}`} />
                      </div>
                    )}

                    <div className={`rounded-xl border p-4 transition-all ${
                      isCurrent ? 'border-primary bg-primary/10' :
                      isCompleted ? 'border-green-800 bg-green-900/20' :
                      'border-neutral-800 bg-neutral-950'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                          isCompleted ? 'bg-green-800 text-green-200' :
                          isCurrent ? 'bg-primary text-primary-foreground' :
                          'bg-neutral-800 text-neutral-500'
                        }`}>
                          {isCompleted ? <Check size={14} /> : isLocked ? <Lock size={12} /> : step.num}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-black uppercase tracking-wider ${
                              isCurrent ? 'text-primary' : isCompleted ? 'text-green-400' : 'text-neutral-600'
                            }`}>
                              {step.label}
                            </span>
                            <span className="text-[10px] text-neutral-500">— {step.subtitle}</span>
                          </div>

                          {isFirst && !stepData && (
                            <p className="text-xs text-neutral-400 mt-1 italic">
                              {shift.goal_text}
                            </p>
                          )}

                          {stepData && !isLocked && (
                            <p className={`text-xs mt-1 ${isCurrent ? 'text-white' : 'text-neutral-400'}`}>
                              {stepData.action_text}
                            </p>
                          )}

                          {isLocked && (
                            <p className="text-xs text-neutral-700 mt-1 blur-sm select-none">
                              Contenuto bloccato fino al completamento dello step precedente.
                            </p>
                          )}

                          {isCurrent && !isCompleted && (
                            <button
                              onClick={handleConfirmStep}
                              disabled={confirming}
                              className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg bg-red-900 hover:bg-red-800 px-4 py-2.5 text-xs font-black text-white uppercase tracking-wider transition-colors disabled:opacity-50"
                            >
                              {confirming ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <>
                                  <Check size={14} />
                                  Scelgo di confermare l'azione. Non sto mentendo.
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={async () => {
                await supabase.from('overton_shifts').update({ status: 'abandoned' } as any).eq('id', shift.id);
                toast('Shift abbandonato.');
                setShift(null);
                setSteps([]);
              }}
              className="w-full text-center text-xs text-neutral-600 hover:text-red-500 transition-colors py-2"
            >
              Abbandona questo Shift
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
