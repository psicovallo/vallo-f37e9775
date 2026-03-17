import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Timer, AlertTriangle } from 'lucide-react';

const BLOCKED_WORDS = ['non so', 'forse', 'domani', 'boh', 'non lo so', 'vedremo', 'chissà'];
const MIN_CHARS = 50;
const COUNTDOWN_SECONDS = 60;

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

export default function QuestionPage() {
  const { user } = useAuth();
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [isLocked, setIsLocked] = useState(true);
  const [selectedButton, setSelectedButton] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Start countdown
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
      let { data: progress } = await supabase
        .from('question_progress')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!progress) {
        const { data: newProgress } = await supabase
          .from('question_progress')
          .insert({ user_id: user.id, current_question_index: 1, answered: false })
          .select()
          .single();
        progress = newProgress;
      }

      if (!progress) return;

      // If already answered current, they completed it
      if (progress.answered) {
        // Move to next question
        const nextIndex = progress.current_question_index + 1;
        if (nextIndex > 21) {
          setAllDone(true);
          return;
        }
        await supabase
          .from('question_progress')
          .update({ current_question_index: nextIndex, answered: false, answer_text: null, answer_button: null, answered_at: null })
          .eq('user_id', user.id);
        progress.current_question_index = nextIndex;
        progress.answered = false;
      }

      // Fetch questions ordered by creation (insertion order = question order)
      const { data: questions } = await supabase
        .from('phrases')
        .select('*')
        .eq('type', 'domanda')
        .order('created_at', { ascending: true });

      if (!questions || questions.length === 0) return;

      const idx = progress.current_question_index;
      if (idx > questions.length) {
        setAllDone(true);
        return;
      }

      const q = questions[idx - 1];
      setQuestion({ index: idx, text: q.text, category: q.category });
      startCountdown();
    };

    loadQuestion();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [user, startCountdown]);

  const validateText = (text: string): string | null => {
    if (text.trim().length < MIN_CHARS) {
      return `La risposta deve contenere almeno ${MIN_CHARS} caratteri. Ne hai scritti ${text.trim().length}.`;
    }
    const lower = text.toLowerCase();
    for (const word of BLOCKED_WORDS) {
      if (lower.includes(word)) {
        return `La risposta contiene "${word}". Scava più a fondo. Non accettiamo scorciatoie mentali.`;
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!user || !question || !selectedButton) return;

    // Validate text
    const error = validateText(answerText);
    if (error) {
      setValidationError(error);
      setAnswerText('');
      startCountdown();
      toast.error('Risposta rifiutata. Timer resettato.');
      return;
    }

    setSubmitting(true);

    // Save answer
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

    // Mark progress as answered
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

  // Format countdown
  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

  if (!question) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-16 pb-24 text-center">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-8 pb-24">
      {/* Question number & category */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-primary uppercase tracking-wider">
          Domanda {question.index}/21
        </span>
        <span className="text-xs text-muted-foreground">{question.category}</span>
      </div>

      {/* Question */}
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
      <div className="mb-6">
        <textarea
          ref={textareaRef}
          value={answerText}
          onChange={e => {
            setAnswerText(e.target.value);
            setValidationError(null);
          }}
          disabled={isLocked}
          readOnly={isLocked}
          placeholder={isLocked ? 'Aspetta che il timer scada...' : 'Scrivi la tua risposta sincera... (minimo 50 caratteri)'}
          rows={5}
          className={`w-full rounded-2xl border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none transition-all ${
            isLocked
              ? 'border-border/50 opacity-40 cursor-not-allowed'
              : 'border-border'
          }`}
          onFocus={e => {
            if (isLocked) e.target.blur();
          }}
        />
        {!isLocked && (
          <p className={`mt-1 text-xs ${answerText.trim().length >= MIN_CHARS ? 'text-primary' : 'text-muted-foreground'}`}>
            {answerText.trim().length}/{MIN_CHARS} caratteri minimi
          </p>
        )}
      </div>

      {/* 4 answer buttons */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          {isLocked ? 'Scegli dopo aver scritto la risposta' : 'Scegli la tua verità'}
        </p>
        {ANSWER_BUTTONS.map(btn => (
          <button
            key={btn.id}
            onClick={() => {
              if (isLocked) return;
              setSelectedButton(btn.id);
            }}
            disabled={isLocked}
            className={`w-full rounded-2xl px-4 py-3.5 text-sm font-bold uppercase tracking-wide transition-all ${
              isLocked
                ? 'opacity-30 cursor-not-allowed bg-secondary text-muted-foreground'
                : selectedButton === btn.id
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background ' + btn.color
                  : btn.color + ' hover:opacity-80'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Submit */}
      {selectedButton && !isLocked && (
        <button
          onClick={handleSubmit}
          disabled={submitting || answerText.trim().length === 0}
          className="mt-6 w-full rounded-2xl bg-primary px-4 py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? 'Invio...' : 'ATTRAVERSA QUESTA DOMANDA'}
        </button>
      )}
    </div>
  );
}
