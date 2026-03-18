import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Timer, AlertTriangle, Eye } from 'lucide-react';

const BLOCKED_WORDS = ['non so', 'forse', 'domani', 'boh', 'non lo so', 'vedremo', 'chissà', 'spero', 'difficile', 'stress', 'festa', 'poco', 'colpa', 'ma '];
const MIN_CHARS = 50;
const COUNTDOWN_SECONDS = 60;
const READ_SECONDS = 15;

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
  const [selectedButton, setSelectedButton] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [textValid, setTextValid] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const readTimerRef = useRef<ReturnType<typeof setInterval>>();
  const deliveryIdRef = useRef<string | null>(null);

  const isIncubation = progress?.phase === 'incubation';

  // Start read timer (15s for incubation phase)
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

  // Start answer countdown (60s for response phase)
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

  // Load current question
  useEffect(() => {
    if (!user) return;

    const loadQuestion = async () => {
      // Get or create progress
      let { data: prog } = await supabase
        .from('question_progress')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!prog) {
        const { data: newProg } = await supabase
          .from('question_progress')
          .insert({ user_id: user.id, current_question_index: 1, answered: false })
          .select()
          .single();
        prog = newProg;
      }

      if (!prog) return;

      // If already answered, move to next
      if (prog.answered) {
        const nextIndex = prog.current_question_index + 1;
        if (nextIndex > 21) {
          setAllDone(true);
          return;
        }
        await supabase
          .from('question_progress')
          .update({
            current_question_index: nextIndex,
            answered: false,
            answer_text: null,
            answer_button: null,
            answered_at: null,
          })
          .eq('user_id', user.id);
        prog.current_question_index = nextIndex;
        prog.answered = false;
      }

      setProgress({
        phase: prog.phase || 'incubation',
        questions_read_count: prog.questions_read_count || 0,
        current_question_index: prog.current_question_index,
        answered: prog.answered,
      });

      // Fetch questions
      const { data: questions } = await supabase
        .from('phrases')
        .select('*')
        .eq('type', 'domanda')
        .order('created_at', { ascending: true });

      if (!questions || questions.length === 0) return;

      const idx = prog.current_question_index;
      if (idx > questions.length) {
        setAllDone(true);
        return;
      }

      const q = questions[idx - 1];
      setQuestion({ index: idx, text: q.text, category: q.category });

      // Check for existing unread delivery
      const { data: delivery } = await supabase
        .from('question_deliveries')
        .select('id, read_completed')
        .eq('user_id', user.id)
        .eq('question_index', idx)
        .eq('read_completed', false)
        .order('delivered_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (delivery) {
        deliveryIdRef.current = delivery.id;
      }

      // Start appropriate timer
      if (prog.phase === 'incubation') {
        startReadTimer();
      } else {
        startCountdown();
      }
    };

    loadQuestion();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (readTimerRef.current) clearInterval(readTimerRef.current);
    };
  }, [user, startCountdown, startReadTimer]);

  // Mark read completed (15s) and update progress
  useEffect(() => {
    if (!readCompleted || !user || !question) return;

    const markRead = async () => {
      // Update delivery if exists
      if (deliveryIdRef.current) {
        await supabase
          .from('question_deliveries')
          .update({ read_completed: true, read_at: new Date().toISOString(), read_duration_seconds: READ_SECONDS })
          .eq('id', deliveryIdRef.current);
      }

      // Increment read count
      const newCount = (progress?.questions_read_count || 0) + 1;
      const shouldUnlockResponse = newCount >= 6;

      await supabase
        .from('question_progress')
        .update({
          questions_read_count: newCount,
          ...(shouldUnlockResponse ? { phase: 'response' } : {}),
        })
        .eq('user_id', user.id);

      setProgress(prev => prev ? {
        ...prev,
        questions_read_count: newCount,
        ...(shouldUnlockResponse ? { phase: 'response' } : {}),
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
    setValidationError(null);
    const error = validateText(text);
    setTextValid(error === null && text.trim().length >= MIN_CHARS);
  };

  const handleSubmit = async () => {
    if (!user || !question || !selectedButton) return;

    const error = validateText(answerText);
    if (error) {
      setValidationError(error);
      setAnswerText('');
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

    await supabase
      .from('question_progress')
      .update({
        answered: true,
        answer_text: answerText.trim(),
        answer_button: selectedButton,
        answered_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    setCompleted(true);
    setSubmitting(false);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // All done
  if (allDone) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-16 pb-24 text-center">
        <div className="text-6xl mb-6">🔥</div>
        <h1 className="text-2xl font-bold text-foreground mb-4">Hai completato tutte le 21 domande</h1>
        <p className="text-muted-foreground">
          Hai attraversato ogni singola domanda. Non sei più la stessa persona che ha iniziato.
        </p>
      </div>
    );
  }

  // Completed current question
  if (completed) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-16 pb-24 text-center">
        <div className="text-6xl mb-6">⚡</div>
        <h1 className="text-2xl font-bold text-foreground mb-4">Domanda attraversata</h1>
        <p className="text-muted-foreground mb-2">
          Hai scelto: <span className="text-primary font-semibold">{ANSWER_BUTTONS.find(b => b.id === selectedButton)?.label}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          La prossima domanda arriverà con la tua prossima notifica.
        </p>
      </div>
    );
  }

  // Loading
  if (!question || !progress) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-16 pb-24 text-center">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  // PHASE A: Incubation (read only)
  if (isIncubation) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-8 pb-24">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-primary uppercase tracking-wider">
            Domanda {question.index}/21
          </span>
          <span className="text-xs text-muted-foreground">{question.category}</span>
        </div>

        <div className="mb-2">
          <span className="inline-block rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-primary">
            Fase Incubazione · {progress.questions_read_count}/6 lette
          </span>
        </div>

        <div className="mb-8 rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <p className="text-lg font-semibold text-foreground leading-relaxed">
            {question.text}
          </p>
        </div>

        {/* Read timer */}
        <div className="mb-6 text-center">
          {!readCompleted ? (
            <div className="inline-flex items-center gap-3 rounded-2xl border border-border bg-card px-6 py-4">
              <Eye size={20} className="text-primary animate-pulse" />
              <div>
                <p className="text-2xl font-mono font-bold text-foreground">{formatTime(readTimer)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Leggi con attenzione.<br />
                  La domanda si sta incidendo nella tua mente.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
              <p className="text-sm text-foreground font-medium mb-2">
                ✅ Domanda letta
              </p>
              <p className="text-xs text-muted-foreground">
                Ottimo, continua così. Non puoi ancora rispondere.
                Dormici sopra, scrivila su carta. La verità ha bisogno di tempo.
              </p>
              {progress.questions_read_count + 1 >= 6 && (
                <p className="text-xs text-primary font-semibold mt-3">
                  🔓 Hai raggiunto 6 letture! La prossima domanda sbloccherà la risposta.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // PHASE B: Response
  return (
    <div className="mx-auto max-w-lg px-4 pt-8 pb-24">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-primary uppercase tracking-wider">
          Domanda {question.index}/21
        </span>
        <span className="text-xs text-muted-foreground">{question.category}</span>
      </div>

      <div className="mb-8 rounded-2xl border border-primary/30 bg-primary/5 p-6">
        <p className="text-lg font-semibold text-foreground leading-relaxed">
          {question.text}
        </p>
      </div>

      {/* Countdown */}
      {isLocked && (
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-border bg-card px-6 py-4">
            <Timer size={20} className="text-primary animate-pulse" />
            <div>
              <p className="text-2xl font-mono font-bold text-foreground">{formatTime(countdown)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Il tuo subconscio sta elaborando...<br />
                non mentire ancora. Aspetta.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Validation error */}
      {validationError && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
          <AlertTriangle size={18} className="text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{validationError}</p>
        </div>
      )}

      {/* Answer textarea */}
      {!isLocked && (
        <div className="mb-6">
          <textarea
            ref={textareaRef}
            value={answerText}
            onChange={e => handleTextChange(e.target.value)}
            placeholder="Scrivi la tua risposta sincera... (minimo 50 caratteri)"
            rows={5}
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none transition-all"
          />
          <p className={`mt-1 text-xs ${answerText.trim().length >= MIN_CHARS ? 'text-primary' : 'text-muted-foreground'}`}>
            {answerText.trim().length}/{MIN_CHARS} caratteri minimi
          </p>
        </div>
      )}

      {/* 4 answer buttons - only show when text is valid */}
      {!isLocked && textValid && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground mb-2">
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

      {/* Submit */}
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
