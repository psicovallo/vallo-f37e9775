import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Clock, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

interface ReflectionQuestion {
  text: string;
  timerDone: boolean;
  timerSeconds: number;
  note: string;
  noteSaved: boolean;
}

export default function SfogoPage() {
  const { user } = useAuth();
  const [sfogoText, setSfogoText] = useState('');
  const [questions, setQuestions] = useState<ReflectionQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [remainingTime, setRemainingTime] = useState<string>('');
  const [phase, setPhase] = useState<'write' | 'reflect'>('write');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Session timer
  useEffect(() => {
    if (!sessionStart) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - sessionStart;
      const remaining = SESSION_DURATION_MS - elapsed;
      if (remaining <= 0) {
        setSessionExpired(true);
        clearInterval(interval);
        setRemainingTime('00:00');
      } else {
        const m = Math.floor(remaining / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        setRemainingTime(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStart]);

  const handleAskForHelp = async () => {
    if (!user || sfogoText.trim().length < 10) {
      toast.error('Scrivi almeno qualche riga prima di chiedere aiuto.');
      return;
    }

    setLoading(true);
    if (!sessionStart) setSessionStart(Date.now());

    try {
      // Save sfogo as a note
      await supabase.from('notes').insert({
        user_id: user.id,
        text: `[SFOGO] ${sfogoText}`,
      });

      // Get user objective
      const { data: profile } = await supabase
        .from('profiles')
        .select('objective')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data, error } = await supabase.functions.invoke('generate-sfogo-questions', {
        body: { sfogo_text: sfogoText, objective: profile?.objective || 'Dimagrimento' },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const generatedQuestions: ReflectionQuestion[] = (data.questions || []).map((q: string) => ({
        text: q,
        timerDone: false,
        timerSeconds: 7 + Math.floor(Math.random() * 4), // 7-10s
        note: '',
        noteSaved: false,
      }));

      setQuestions(generatedQuestions);
      setCurrentQIndex(0);
      setPhase('reflect');
    } catch (err: any) {
      toast.error(err.message || 'Errore nella generazione delle domande.');
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[currentQIndex] || null;

  // Question timer
  useEffect(() => {
    if (phase !== 'reflect' || !currentQuestion || currentQuestion.timerDone) return;

    let remaining = currentQuestion.timerSeconds;
    timerRef.current = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setQuestions(prev => prev.map((q, i) => i === currentQIndex ? { ...q, timerDone: true } : q));
      }
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, currentQIndex, currentQuestion?.timerDone]);

  const saveNote = useCallback(async () => {
    if (!user || !currentQuestion || !currentQuestion.note.trim()) return;

    try {
      await supabase.from('notes').insert({
        user_id: user.id,
        text: `[SFOGO-RIFLESSIONE] Q: ${currentQuestion.text}\nA: ${currentQuestion.note}`,
      });
      setQuestions(prev => prev.map((q, i) => i === currentQIndex ? { ...q, noteSaved: true } : q));
    } catch {
      toast.error('Errore nel salvataggio.');
    }
  }, [user, currentQuestion, currentQIndex]);

  const nextQuestion = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
    } else {
      setPhase('write');
      setSfogoText('');
      setQuestions([]);
      toast.success('Riflessione completata. Bene così.');
    }
  };

  if (sessionExpired) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-8 pb-24">
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-lg font-semibold text-foreground mb-2">⏸️ Pausa</p>
          <p className="text-sm text-muted-foreground">
            Ora è meglio che fai una pausa. Rifletti su tutto questo. Torna più tardi.
          </p>
          <Button
            className="mt-4"
            onClick={() => {
              setSessionExpired(false);
              setSessionStart(null);
              setPhase('write');
              setSfogoText('');
              setQuestions([]);
            }}
          >
            Ricomincia più tardi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-8 pb-24">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Area Sfogo</h1>
        {sessionStart && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock size={12} />
            <span>{remainingTime}</span>
          </div>
        )}
      </div>

      {phase === 'write' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Scrivi liberamente. Nessun filtro, nessun limite. Sfogati su quello che senti, quello che pensi, quello che ti blocca.
          </p>
          <Textarea
            value={sfogoText}
            onChange={(e) => setSfogoText(e.target.value)}
            placeholder="Scrivi qui tutto quello che hai dentro..."
            className="min-h-[200px] rounded-2xl border-border bg-card text-foreground"
          />
          <Button
            onClick={handleAskForHelp}
            disabled={loading || sfogoText.trim().length < 10}
            className="w-full rounded-2xl"
          >
            {loading ? (
              <><Loader2 className="animate-spin" size={16} /> Generando riflessioni...</>
            ) : (
              <><Send size={16} /> Aiutami a riflettere</>
            )}
          </Button>
        </div>
      )}

      {phase === 'reflect' && currentQuestion && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Domanda {currentQIndex + 1} di {questions.length}
          </p>

          <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
            <p className="text-sm font-medium text-foreground leading-relaxed">
              {currentQuestion.text}
            </p>
          </div>

          {!currentQuestion.timerDone ? (
            <p className="text-center text-xs text-muted-foreground animate-pulse">
              Rileggi la domanda. Il tempo è necessario per la comprensione.
            </p>
          ) : (
            <div className="space-y-3">
              <Textarea
                value={currentQuestion.note}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuestions(prev => prev.map((q, i) => i === currentQIndex ? { ...q, note: val, noteSaved: false } : q));
                }}
                placeholder="I tuoi pensieri su questa domanda..."
                className="min-h-[100px] rounded-2xl border-border bg-card text-foreground"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={saveNote}
                  disabled={!currentQuestion.note.trim()}
                  className="flex-1 rounded-2xl"
                >
                  {currentQuestion.noteSaved ? (
                    <><Check size={16} /> Salvato</>
                  ) : (
                    'Salva appunti'
                  )}
                </Button>
                <Button
                  onClick={nextQuestion}
                  className="flex-1 rounded-2xl"
                >
                  {currentQIndex < questions.length - 1 ? 'Prossima →' : 'Fine riflessione'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
