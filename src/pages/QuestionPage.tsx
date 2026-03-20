import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Timer, AlertTriangle, Eye, Pencil } from 'lucide-react';

const BLOCKED_WORDS = ['domani', 'spero', 'difficile', 'stress', 'festa', 'poco', 'colpa', 'ma ', 'proverò', 'forse'];
const MIN_CHARS = 50;
const COUNTDOWN_SECONDS = 60;
const MAX_VIEWS = 9;

const BUTTON_POOL = [
  'Ammetto la menzogna',
  'Mi sento bloccato',
  'Non so rispondere',
  'Ho bisogno di tempo',
  'Voglio scappare',
  'Sto mentendo a me stesso',
  'Ho paura della verità',
  'Non sono pronto',
];

const BUTTON_COLORS = [
  'bg-destructive text-destructive-foreground',
  'bg-secondary text-secondary-foreground border border-border',
  'bg-accent/20 text-accent-foreground border border-accent/40',
  'bg-card text-muted-foreground border border-border',
];

interface Assignment {
  id: string;
  question_text: string;
  view_count: number;
  status: string;
  phase_b_unlock_at: string | null;
  is_seed_question: boolean;
  sort_order: number;
}

function getRandomTimer(): number {
  return Math.floor(Math.random() * 11) + 7; // 7-17 seconds
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shouldUnlockPhaseB(viewCount: number): boolean {
  if (viewCount >= MAX_VIEWS - 1) return true; // 9th view (0-indexed: 8) = mandatory
  if (viewCount < 1) return false;
  // Random chance between views 1-7
  return Math.random() < 0.15;
}

export default function QuestionPage() {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [phaseB, setPhaseB] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [readTimer, setReadTimer] = useState(0);
  const [readSeconds, setReadSeconds] = useState(0);
  const [isLocked, setIsLocked] = useState(true);
  const [readCompleted, setReadCompleted] = useState(false);
  const [selectedButton, setSelectedButton] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [textValid, setTextValid] = useState(false);
  const [noteId, setNoteId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const readTimerRef = useRef<ReturnType<typeof setInterval>>();
  const noteSaveRef = useRef<ReturnType<typeof setTimeout>>();

  const randomButtons = useMemo(() => {
    const picked = shuffleArray(BUTTON_POOL).slice(0, 4);
    const colors = shuffleArray(BUTTON_COLORS);
    return picked.map((label, i) => ({ label, color: colors[i] }));
  }, [assignment?.id, phaseB]);

  const startReadTimer = useCallback((seconds: number) => {
    setReadTimer(seconds);
    setReadSeconds(seconds);
    setReadCompleted(false);
    if (readTimerRef.current) clearInterval(readTimerRef.current);
    readTimerRef.current = setInterval(() => {
      setReadTimer((prev) => {
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
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setIsLocked(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Load assignment
  useEffect(() => {
    if (!user) return;

    const loadAssignment = async () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (readTimerRef.current) clearInterval(readTimerRef.current);
      setCompleted(false);
      setAllDone(false);
      setSelectedButton(null);
      setAnswerText('');
      setNoteText('');
      setNoteId(null);
      setTextValid(false);
      setValidationError(null);
      setPhaseB(false);
      setReadCompleted(false);

      // Get current active assignment (not resolved, lowest sort_order)
      const { data: assignments, error } = await supabase
        .from('question_assignments')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'risolta')
        .order('sort_order', { ascending: true })
        .limit(1);

      if (error) {
        toast.error(error.message);
        return;
      }

      if (!assignments || assignments.length === 0) {
        setAllDone(true);
        return;
      }

      const a = assignments[0] as Assignment;
      setAssignment(a);

      // Check today's view count (max 2 per day)
      const today = new Date().toISOString().slice(0, 10);
      const { data: todayDeliveries } = await supabase
        .from('question_deliveries')
        .select('id')
        .eq('user_id', user.id)
        .eq('question_index', a.sort_order)
        .eq('read_completed', true)
        .gte('delivered_at', `${today}T00:00:00`)
        .lte('delivered_at', `${today}T23:59:59`);

      const todayViews = todayDeliveries?.length || 0;

      // Load existing note
      const { data: existingNote } = await supabase
        .from('question_notes')
        .select('id, text')
        .eq('assignment_id', a.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingNote) {
        setNoteId(existingNote.id);
        setNoteText(existingNote.text || '');
      }

      // Determine if this is Phase B
      const isPhaseB = a.phase_b_unlock_at !== null || shouldUnlockPhaseB(a.view_count);
      setPhaseB(isPhaseB);

      if (isPhaseB) {
        // Mark phase_b_unlock_at if not already
        if (!a.phase_b_unlock_at) {
          await supabase
            .from('question_assignments')
            .update({ phase_b_unlock_at: new Date().toISOString() })
            .eq('id', a.id);
        }
        startCountdown();
      } else if (todayViews < 2) {
        // Phase A: start read timer
        const seconds = getRandomTimer();
        startReadTimer(seconds);
      }
    };

    loadAssignment();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (readTimerRef.current) clearInterval(readTimerRef.current);
    };
  }, [user, startCountdown, startReadTimer]);

  // When read timer completes, mark view
  useEffect(() => {
    if (!readCompleted || !user || !assignment) return;

    const markView = async () => {
      const newCount = Math.min(assignment.view_count + 1, MAX_VIEWS);
      const newStatus = newCount >= MAX_VIEWS ? 'in_incubazione' : 'da_leggere';

      await supabase
        .from('question_assignments')
        .update({ view_count: newCount, status: newStatus as any })
        .eq('id', assignment.id);

      // Also create a delivery record
      await supabase.from('question_deliveries').insert({
        user_id: user.id,
        question_index: assignment.sort_order,
        read_completed: true,
        read_at: new Date().toISOString(),
        read_duration_seconds: readSeconds,
      });

      setAssignment((prev) => prev ? { ...prev, view_count: newCount, status: newStatus } : prev);
    };

    markView();
  }, [readCompleted, user, assignment?.id]);

  // Auto-save notes (debounced)
  const saveNote = useCallback(async (text: string) => {
    if (!user || !assignment) return;
    if (noteId) {
      await supabase.from('question_notes').update({ text }).eq('id', noteId);
    } else {
      const { data } = await supabase
        .from('question_notes')
        .insert({ assignment_id: assignment.id, user_id: user.id, text })
        .select('id')
        .single();
      if (data) setNoteId(data.id);
    }
  }, [user, assignment?.id, noteId]);

  const handleNoteChange = (text: string) => {
    setNoteText(text);
    if (noteSaveRef.current) clearTimeout(noteSaveRef.current);
    noteSaveRef.current = setTimeout(() => saveNote(text), 1000);
  };

  const validateText = (text: string): string | null => {
    if (text.trim().length < MIN_CHARS) {
      return `Minimo ${MIN_CHARS} caratteri. Ne hai scritti ${text.trim().length}.`;
    }
    const lower = text.toLowerCase();
    for (const word of BLOCKED_WORDS) {
      if (lower.includes(word.trim())) {
        return `Stai usando scuse ("${word.trim()}"). Riscrivi.`;
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
    if (!user || !assignment || !selectedButton) return;

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

    // Save official answer
    const { error: insertError } = await supabase.from('question_official_answers').insert({
      assignment_id: assignment.id,
      user_id: user.id,
      answer_text: answerText.trim(),
      button_clicked: selectedButton,
    });

    if (insertError) {
      toast.error(insertError.message);
      setSubmitting(false);
      return;
    }

    // Mark assignment as resolved
    await supabase
      .from('question_assignments')
      .update({ status: 'risolta' as any })
      .eq('id', assignment.id);

    // Also save to legacy question_answers for compatibility
    await supabase.from('question_answers').insert({
      user_id: user.id,
      question_index: assignment.sort_order,
      question_text: assignment.question_text,
      answer_text: answerText.trim(),
      answer_button: selectedButton,
    });

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
        <h1 className="mb-4 text-2xl font-bold text-foreground">Tutte le domande completate</h1>
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
          Hai scelto: <span className="font-semibold text-primary">{selectedButton}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          La prossima domanda è in arrivo.
        </p>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-24 pt-16 text-center">
        <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const viewsRemaining = MAX_VIEWS - assignment.view_count;

  // PHASE B: Response
  if (phaseB) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-24 pt-8">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-primary">
            Domanda {assignment.sort_order}
          </span>
          <span className="inline-block rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
            Fase Risposta
          </span>
        </div>

        <div className="mb-8 rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <p className="text-lg font-semibold leading-relaxed text-foreground">{assignment.question_text}</p>
        </div>

        {isLocked && (
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-border bg-card px-6 py-4">
              <Timer size={20} className="animate-pulse text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground font-mono">{formatTime(countdown)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Il tuo subconscio sta elaborando.<br />
                  Non mentire ancora. Aspetta.
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
              onChange={(e) => handleTextChange(e.target.value)}
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
              Grazie per l'onestà. Scegli come ti senti ora per proseguire.
            </p>
            {randomButtons.map((btn) => (
              <button
                key={btn.label}
                onClick={() => setSelectedButton(btn.label)}
                className={`w-full rounded-2xl px-4 py-3.5 text-sm font-bold uppercase tracking-wide transition-all active:scale-[0.97] ${
                  selectedButton === btn.label
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
            className="mt-6 w-full rounded-2xl bg-primary px-4 py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 active:scale-[0.97]"
          >
            {submitting ? 'Invio...' : 'ATTRAVERSA QUESTA DOMANDA'}
          </button>
        )}
      </div>
    );
  }

  // PHASE A: Incubation
  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-8">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-primary">
          Domanda {assignment.sort_order}
        </span>
        <span className="inline-block rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-primary">
          Osservazione · {assignment.view_count}/{MAX_VIEWS}
        </span>
      </div>

      <div className="mb-8 rounded-2xl border border-primary/30 bg-primary/5 p-6">
        <p className="text-lg font-semibold leading-relaxed text-foreground">{assignment.question_text}</p>
      </div>

      <div className="mb-6 text-center">
        {!readCompleted ? (
          <div className="inline-flex items-center gap-3 rounded-2xl border border-border bg-card px-6 py-4">
            <Eye size={20} className="animate-pulse text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground font-mono">{formatTime(readTimer)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Rileggi la domanda.<br />
                Il tempo è necessario per la comprensione.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
            <p className="mb-2 text-sm font-medium text-foreground">✅ Lettura registrata</p>
            <p className="text-xs text-muted-foreground">
              {viewsRemaining > 0
                ? `Mancano ${viewsRemaining} letture. La stessa domanda tornerà.`
                : '🔓 Osservazione completata. Alla prossima apertura partirà la fase risposta.'}
            </p>
          </div>
        )}
      </div>

      {/* Private notes area — appears after read timer completes */}
      {readCompleted && (
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <Pencil size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">I tuoi appunti privati</span>
          </div>
          <textarea
            value={noteText}
            onChange={(e) => handleNoteChange(e.target.value)}
            onBlur={() => { if (noteText.trim()) saveNote(noteText); }}
            placeholder="Sfoga i tuoi pensieri qui... nessuno li vedrà tranne te e il sistema."
            rows={4}
            className="w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground transition-all placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Il sistema di risposta ufficiale è bloccato. La risposta finale si sbloccherà quando sarai pronto.
          </p>
        </div>
      )}
    </div>
  );
}
