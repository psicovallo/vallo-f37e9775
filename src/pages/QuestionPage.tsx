import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Timer, AlertTriangle, Eye } from 'lucide-react';

const BLOCKED_WORDS = ['non so', 'forse', 'domani', 'boh', 'non lo so', 'vedremo', 'chissà', 'spero', 'difficile', 'stress', 'festa', 'poco', 'colpa', 'ma '];
const MIN_CHARS = 50;
const COUNTDOWN_SECONDS = 60;
const READ_SECONDS = 15;
const REQUIRED_READS = 9;

const ANSWER_BUTTONS = [
  { id: 'ammetto', label: 'AMMETTO LA MENZOGNA', color: 'bg-destructive text-destructive-foreground' },
  { id: 'non_so', label: 'NON SO RISPONDERE', color: 'bg-secondary text-secondary-foreground border border-border' },
  { id: 'tempo', label: 'HO BISOGNO DI TEMPO', color: 'bg-accent/20 text-accent-foreground border border-accent/40' },
  { id: 'scappare', label: 'VOGLIO SCAPPARE', color: 'bg-card text-muted-foreground border border-border' },
] as const;

interface QuestionData {
  index: number;
  text: string;
  category: string;
}

interface ProgressData {
  id: string;
  phase: string;
  questions_read_count: number;
  current_question_index: number;
  answered: boolean;
}

export default function QuestionPage() {
  const { user } = useAuth();
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [readTimer, setReadTimer] = useState(READ_SECONDS);
  const [isLocked, setIsLocked] = useState(true);
  const [readCompleted, setReadCompleted] = useState(false);
  const [hasPendingDelivery, setHasPendingDelivery] = useState(false);
  const [selectedButton, setSelectedButton] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [textValid, setTextValid] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const readTimerRef = useRef<ReturnType<typeof setInterval>>();
  const deliveryIdRef = useRef<string | null>(null);

  const isIncubation = progress?.phase !== 'response';
  const readsRemaining = Math.max(REQUIRED_READS - (progress?.questions_read_count ?? 0), 0);

  const startReadTimer = useCallback(() => {
    setReadTimer(READ_SECONDS);
    setReadCompleted(false);
    if (readTimerRef.current) clearInterval(readTimerRef.current);
    readTimerRef.current = setInterval(() => {
      setReadTimer(prev => {
        if (prev <= 1) {
          clearInterval(readTimerRef.current!);
          setReadCompleted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const startCountdown = useCallback((seconds = COUNTDOWN_SECONDS) => {
    setCountdown(seconds);
    setIsLocked(true);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setIsLocked(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadQuestion = async () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (readTimerRef.current) clearInterval(readTimerRef.current);

      deliveryIdRef.current = null;
      setHasPendingDelivery(false);
      setReadCompleted(false);
      setCompleted(false);
      setAllDone(false);
      setSelectedButton(null);
      setAnswerText('');
      setTextValid(false);
      setValidationError(null);

      let { data: prog, error: progError } = await supabase
        .from('question_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (progError) {
        toast.error(progError.message);
        return;
      }

      if (!prog) {
        const { data: newProg, error: newProgError } = await supabase
          .from('question_progress')
          .insert({
            user_id: user.id,
            current_question_index: 1,
            answered: false,
            phase: 'incubation',
            questions_read_count: 0,
            onboarding_completed: false,
          })
          .select()
          .single();

        if (newProgError) {
          toast.error(newProgError.message);
          return;
        }

        prog = newProg;
      }

      if (!prog) return;

      if (prog.answered) {
        const nextIndex = prog.current_question_index + 1;
        if (nextIndex > 21) {
          setAllDone(true);
          return;
        }

        const { error: resetError } = await supabase
          .from('question_progress')
          .update({
            current_question_index: nextIndex,
            answered: false,
            answer_text: null,
            answer_button: null,
            answered_at: null,
            phase: 'incubation',
            questions_read_count: 0,
          })
          .eq('id', prog.id);

        if (resetError) {
          toast.error(resetError.message);
          return;
        }

        prog = {
          ...prog,
          current_question_index: nextIndex,
          answered: false,
          answer_text: null,
          answer_button: null,
          answered_at: null,
          phase: 'incubation',
          questions_read_count: 0,
        };
      }

      const normalizedReadCount = Math.max(0, prog.questions_read_count || 0);
      const normalizedPhase = normalizedReadCount >= REQUIRED_READS ? 'response' : 'incubation';

      if (prog.phase !== normalizedPhase) {
        await supabase
          .from('question_progress')
          .update({ phase: normalizedPhase })
          .eq('id', prog.id);
      }

      setProgress({
        id: prog.id,
        phase: normalizedPhase,
        questions_read_count: normalizedReadCount,
        current_question_index: prog.current_question_index,
        answered: prog.answered,
      });

      const { data: questions, error: questionsError } = await supabase
        .from('phrases')
        .select('*')
        .eq('type', 'domanda')
        .order('created_at', { ascending: true });

      if (questionsError) {
        toast.error(questionsError.message);
        return;
      }

      if (!questions || questions.length === 0) return;

      const idx = prog.current_question_index;
      if (idx > questions.length) {
        setAllDone(true);
        return;
      }

      const q = questions[idx - 1];
      setQuestion({ index: idx, text: q.text, category: q.category });

      const { data: delivery, error: deliveryError } = await supabase
        .from('question_deliveries')
        .select('id, read_completed')
        .eq('user_id', user.id)
        .eq('question_index', idx)
        .eq('read_completed', false)
        .order('delivered_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (deliveryError) {
        toast.error(deliveryError.message);
        return;
      }

      deliveryIdRef.current = delivery?.id ?? null;
      setHasPendingDelivery(Boolean(delivery));

      if (normalizedPhase === 'response') {
        startCountdown();
        return;
      }

      if (delivery) {
        startReadTimer();
      }
    };

    loadQuestion();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (readTimerRef.current) clearInterval(readTimerRef.current);
    };
  }, [user, startCountdown, startReadTimer]);

  useEffect(() => {
    if (!readCompleted || !user || !question || !progress || !deliveryIdRef.current) return;

    const markRead = async () => {
      const activeDeliveryId = deliveryIdRef.current;
      if (!activeDeliveryId) return;

      const { error: deliveryError } = await supabase
        .from('question_deliveries')
        .update({
          read_completed: true,
          read_at: new Date().toISOString(),
          read_duration_seconds: READ_SECONDS,
        })
        .eq('id', activeDeliveryId);

      if (deliveryError) {
        toast.error(deliveryError.message);
        return;
      }

      const newCount = Math.min((progress.questions_read_count || 0) + 1, REQUIRED_READS);
      const nextPhase = newCount >= REQUIRED_READS ? 'response' : 'incubation';

      const { error: progressError } = await supabase
        .from('question_progress')
        .update({
          questions_read_count: newCount,
          phase: nextPhase,
        })
        .eq('id', progress.id);

      if (progressError) {
        toast.error(progressError.message);
        return;
      }

      deliveryIdRef.current = null;
      setHasPendingDelivery(false);
      setProgress(prev => prev ? {
        ...prev,
        questions_read_count: newCount,
        phase: nextPhase,
      } : prev);
    };

    markRead();
  }, [readCompleted, user, question]);

  const validateText = (text: string): string | null => {
    if (text.trim().length < MIN_CHARS) {
      return `La risposta deve contenere almeno ${MIN_CHARS} caratteri. Ne hai scritti ${text.trim().length}.`;
    }

    const lower = text.toLowerCase();
    for (const word of BLOCKED_WORDS) {
      if (lower.includes(word)) {
        return `La risposta contiene "${word.trim()}". Scava più a fondo. Non accettiamo scorciatoie mentali.`;
      }
    }

    return null;
  };

  const handleTextChange = (text: string) => {
    setAnswerText(text);
    setSelectedButton(null);
    setValidationError(null);
    const error = validateText(text);
    setTextValid(error === null && text.trim().length >= MIN_CHARS);
  };

  const handleSubmit = async () => {
    if (!user || !question || !selectedButton || !progress) return;

    const error = validateText(answerText);
    if (error) {
      setValidationError(error);
      setAnswerText('');
      setSelectedButton(null);
      setTextValid(false);
      startCountdown();
      toast.error('Risposta rifiutata. Timer resettato.');
      return;
    }

    setSubmitting(true);

    const { error: insertError } = await supabase.from('question_answers').insert({
      user_id: user.id,
      question_index: question.index,
      question_text: question.text,
      answer_text: answerText.trim(),
      answer_button: selectedButton,
    });

    if (insertError) {
      toast.error(insertError.message);
      setSubmitting(false);
      return;
    }

    const { error: progressError } = await supabase
      .from('question_progress')
      .update({
        answered: true,
        answer_text: answerText.trim(),
        answer_button: selectedButton,
        answered_at: new Date().toISOString(),
      })
      .eq('id', progress.id);

    if (progressError) {
      toast.error(progressError.message);
      setSubmitting(false);
      return;
    }

    setCompleted(true);
    setSubmitting(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (allDone) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-24 pt-16 text-center">
        <div className="mb-6 text-6xl">🔥</div>
        <h1 className="mb-4 text-2xl font-bold text-foreground">Hai completato tutte le 21 domande</h1>
        <p className="text-muted-foreground">
          Hai attraversato ogni singola domanda. Non sei più la stessa persona che ha iniziato.
        </p>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-24 pt-16 text-center">
        <div className="mb-6 text-6xl">⚡</div>
        <h1 className="mb-4 text-2xl font-bold text-foreground">Domanda attraversata</h1>
        <p className="mb-2 text-muted-foreground">
          Hai scelto: <span className="font-semibold text-primary">{ANSWER_BUTTONS.find(b => b.id === selectedButton)?.label}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Dalla prossima notifica inizierà la domanda successiva.
        </p>
      </div>
    );
  }

  if (!question || !progress) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-24 pt-16 text-center">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  if (isIncubation) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-24 pt-8">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-primary">
            Domanda {question.index}/21
          </span>
          <span className="text-xs text-muted-foreground">{question.category}</span>
        </div>

        <div className="mb-2">
          <span className="inline-block rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-primary">
            Fase Osservazione · {progress.questions_read_count}/{REQUIRED_READS} letture
          </span>
        </div>

        <div className="mb-8 rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <p className="text-lg font-semibold leading-relaxed text-foreground">{question.text}</p>
        </div>

        <div className="mb-6 text-center">
          {hasPendingDelivery && !readCompleted ? (
            <div className="inline-flex items-center gap-3 rounded-2xl border border-border bg-card px-6 py-4">
              <Eye size={20} className="animate-pulse text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground font-mono">{formatTime(readTimer)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Resta qui 15 secondi.<br />
                  Solo così questa lettura verrà conteggiata.
                </p>
              </div>
            </div>
          ) : readCompleted ? (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
              <p className="mb-2 text-sm font-medium text-foreground">✅ Lettura registrata</p>
              <p className="text-xs text-muted-foreground">
                Ottimo, continua così. La stessa domanda tornerà finché non raggiungi tutte le osservazioni richieste.
              </p>
              {progress.questions_read_count >= REQUIRED_READS ? (
                <p className="mt-3 text-xs font-semibold text-primary">
                  🔓 Hai completato 9 letture. Alla prossima apertura partirà il minuto obbligatorio per rispondere.
                </p>
              ) : (
                <p className="mt-3 text-xs font-semibold text-primary">
                  Mancano {readsRemaining} letture da 15 secondi prima della risposta.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="mb-2 text-sm font-medium text-foreground">Nessuna lettura attiva</p>
              <p className="text-xs text-muted-foreground">
                Aspetta la prossima notifica push o recupera una consegna non letta: la domanda continua a tornare finché non la completi davvero.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-8">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-primary">
          Domanda {question.index}/21
        </span>
        <span className="text-xs text-muted-foreground">{question.category}</span>
      </div>

      <div className="mb-2">
        <span className="inline-block rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-primary">
          Fase Risposta · 10ª apertura
        </span>
      </div>

      <div className="mb-8 rounded-2xl border border-primary/30 bg-primary/5 p-6">
        <p className="text-lg font-semibold leading-relaxed text-foreground">{question.text}</p>
      </div>

      {isLocked && (
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-border bg-card px-6 py-4">
            <Timer size={20} className="animate-pulse text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground font-mono">{formatTime(countdown)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Sei alla 10ª apertura.<br />
                Aspetta un minuto intero prima di rispondere.
              </p>
            </div>
          </div>
        </div>
      )}

      {validationError && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{validationError}</p>
        </div>
      )}

      {!isLocked && (
        <div className="mb-6">
          <textarea
            value={answerText}
            onChange={e => handleTextChange(e.target.value)}
            placeholder="Scrivi la tua risposta sincera... (minimo 50 caratteri)"
            rows={5}
            className="w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 text-foreground transition-all placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className={`mt-1 text-xs ${answerText.trim().length >= MIN_CHARS ? 'text-primary' : 'text-muted-foreground'}`}>
            {answerText.trim().length}/{MIN_CHARS} caratteri minimi
          </p>
        </div>
      )}

      {!isLocked && textValid && (
        <div className="space-y-3">
          <p className="mb-2 text-xs text-muted-foreground">
            Grazie per l'onestà. Scegli come ti senti ora per proseguire. Va tutto bene.
          </p>
          {ANSWER_BUTTONS.map(btn => (
            <button
              key={btn.id}
              onClick={() => setSelectedButton(btn.id)}
              className={`w-full rounded-2xl px-4 py-3.5 text-sm font-bold uppercase tracking-wide transition-all ${
                selectedButton === btn.id
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background ' + btn.color
                  : btn.color + ' hover:opacity-80'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}

      {selectedButton && !isLocked && textValid && (
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-6 w-full rounded-2xl bg-primary px-4 py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? 'Invio...' : 'ATTRAVERSA QUESTA DOMANDA'}
        </button>
      )}
    </div>
  );
}
