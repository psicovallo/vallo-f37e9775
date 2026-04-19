import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Clock, Loader2, PenLine, History } from 'lucide-react';
import VoiceInput from '@/components/VoiceInput';
import QuestionActions from '@/components/QuestionActions';
import { toast } from 'sonner';

const SESSION_DURATION_MS = 30 * 60 * 1000;
const MAX_EMPTY_NOTES = 5;

interface ReflectionQuestion {
  text: string;
  timerDone: boolean;
  timerSeconds: number;
  note: string;
}

interface SfogoSession {
  date: string;
  entries: { tag: string; text: string; created_at: string }[];
}

export default function SfogoPage() {
  const { user } = useAuth();
  const [sfogoText, setSfogoText] = useState('');
  const [questions, setQuestions] = useState<ReflectionQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [remainingTime, setRemainingTime] = useState('');
  const [phase, setPhase] = useState<'write' | 'reflect'>('write');
  const [round, setRound] = useState(1);
  const [emptyNoteCount, setEmptyNoteCount] = useState(0);
  const [history, setHistory] = useState<SfogoSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
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

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setLoadingHistory(true);
    const { data } = await supabase
      .from('notes')
      .select('text, created_at')
      .eq('user_id', user.id)
      .or('text.ilike.[SFOGO]%,text.ilike.[SFOGO-ROUND-%,text.ilike.[SFOGO-RIFLESSIONE]%')
      .order('created_at', { ascending: false })
      .limit(200);

    if (data) {
      const sessions: Record<string, SfogoSession> = {};
      data.forEach((n) => {
        const date = n.created_at.slice(0, 10);
        if (!sessions[date]) sessions[date] = { date, entries: [] };
        const tagMatch = n.text.match(/^\[([^\]]+)\]\s*/);
        const tag = tagMatch ? tagMatch[1] : 'SFOGO';
        const text = tagMatch ? n.text.slice(tagMatch[0].length) : n.text;
        sessions[date].entries.push({ tag, text, created_at: n.created_at });
      });
      setHistory(Object.values(sessions).sort((a, b) => b.date.localeCompare(a.date)));
    }
    setLoadingHistory(false);
  }, [user]);

  const collectNotesContext = (): string => {
    return questions
      .filter(q => q.note.trim())
      .map(q => `D: ${q.text}\nAppunti: ${q.note}`)
      .join('\n\n');
  };

  const handleAskForHelp = async (contextOverride?: string) => {
    if (!user) return;
    const inputText = contextOverride || sfogoText;
    if (inputText.trim().length < 10) {
      toast.error('Scrivi almeno qualche riga prima di chiedere aiuto.');
      return;
    }

    setLoading(true);
    if (!sessionStart) setSessionStart(Date.now());

    try {
      // Save sfogo/round note
      const tag = round === 1 ? '[SFOGO]' : `[SFOGO-ROUND-${round}]`;
      await supabase.from('notes').insert({
        user_id: user.id,
        text: `${tag} ${inputText}`,
      });

      const { data: profile } = await supabase
        .from('profiles')
        .select('objective')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data, error } = await supabase.functions.invoke('generate-sfogo-questions', {
        body: { sfogo_text: inputText, objective: profile?.objective || 'Dimagrimento' },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const generatedQuestions: ReflectionQuestion[] = (data.questions || []).map((q: string) => ({
        text: q,
        timerDone: false,
        timerSeconds: 7 + Math.floor(Math.random() * 4),
        note: '',
      }));

      setQuestions(generatedQuestions);
      setCurrentQIndex(0);
      setEmptyNoteCount(0);
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

  const saveCurrentNoteAndContinue = async () => {
    if (!user || !currentQuestion) return;

    const hasNote = currentQuestion.note.trim().length > 0;

    // Save reflection note
    if (hasNote) {
      await supabase.from('notes').insert({
        user_id: user.id,
        text: `[SFOGO-RIFLESSIONE] Q: ${currentQuestion.text}\nA: ${currentQuestion.note}`,
      });
    }

    // Persist the AI-generated question into sfogo_questions (idempotent)
    try {
      const { data: existing } = await supabase
        .from('sfogo_questions')
        .select('id')
        .eq('user_id', user.id)
        .eq('question_text', currentQuestion.text)
        .maybeSingle();
      if (!existing) {
        await supabase.from('sfogo_questions').insert({
          user_id: user.id,
          question_text: currentQuestion.text,
        });
      }
    } catch (e) { console.warn('sfogo_questions persist:', e); }

    const newEmptyCount = hasNote ? 0 : emptyNoteCount + 1;
    setEmptyNoteCount(newEmptyCount);

    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
    } else {
      // End of batch — check if we should continue or go back to write
      if (newEmptyCount >= MAX_EMPTY_NOTES) {
        setPhase('write');
        setSfogoText('');
        setQuestions([]);
        toast.info('Prova a scrivere di nuovo i tuoi pensieri. Gli appunti aiutano il sistema ad aiutarti nel percorso.');
        return;
      }

      // Use notes as context for next round
      const notesContext = collectNotesContext();
      if (notesContext.length > 10) {
        setRound(prev => prev + 1);
        await handleAskForHelp(notesContext);
      } else {
        setPhase('write');
        setSfogoText('');
        setQuestions([]);
        toast.info('Scrivi di nuovo i tuoi pensieri per continuare.');
      }
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
              setRound(1);
              setEmptyNoteCount(0);
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

      <Tabs defaultValue="write" onValueChange={(v) => { if (v === 'history') loadHistory(); }}>
        <TabsList className="w-full mb-4">
          <TabsTrigger value="write" className="flex-1 gap-1">
            <PenLine size={14} /> Scrivi
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 gap-1">
            <History size={14} /> Storico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="write">
          {phase === 'write' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Scrivi liberamente. Nessun filtro, nessun limite. Sfogati su quello che senti, quello che pensi, quello che ti blocca.
              </p>
              <div className="relative">
                <Textarea
                  value={sfogoText}
                  onChange={(e) => setSfogoText(e.target.value)}
                  placeholder="Scrivi qui tutto quello che hai dentro..."
                  className="min-h-[200px] rounded-2xl border-border bg-card text-foreground pr-12"
                />
                <div className="absolute right-3 top-3">
                  <VoiceInput onTranscript={setSfogoText} currentValue={sfogoText} />
                </div>
              </div>
              <Button
                onClick={() => handleAskForHelp()}
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
                Domanda {currentQIndex + 1} di {questions.length} · Round {round}
              </p>

              <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground leading-relaxed flex-1">
                    {currentQuestion.text}
                  </p>
                  <QuestionActions text={currentQuestion.text} />
                </div>
              </div>

              {!currentQuestion.timerDone ? (
                <p className="text-center text-xs text-muted-foreground animate-pulse">
                  Rileggi la domanda. Il tempo è necessario per la comprensione.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    I tuoi appunti aiutano il sistema a generare domande più mirate per te.
                  </p>
                  <div className="relative">
                    <Textarea
                      value={currentQuestion.note}
                      onChange={(e) => {
                        const val = e.target.value;
                        setQuestions(prev => prev.map((q, i) => i === currentQIndex ? { ...q, note: val } : q));
                      }}
                      placeholder="I tuoi pensieri su questa domanda..."
                      className="min-h-[100px] rounded-2xl border-border bg-card text-foreground pr-12"
                    />
                    <div className="absolute right-3 top-3">
                      <VoiceInput
                        onTranscript={(t) => setQuestions(prev => prev.map((q, i) => i === currentQIndex ? { ...q, note: t } : q))}
                        currentValue={currentQuestion.note}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={saveCurrentNoteAndContinue}
                    disabled={loading}
                    className="w-full rounded-2xl"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : currentQIndex < questions.length - 1 ? (
                      'Continua →'
                    ) : (
                      'Avanti'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          {loadingHistory ? (
            <div className="text-center py-8">
              <Loader2 className="animate-spin mx-auto text-muted-foreground" size={24} />
            </div>
          ) : history.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Nessuno sfogo registrato ancora.
            </p>
          ) : (
            <div className="space-y-6">
              {history.map((session) => (
                <div key={session.date} className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {new Date(session.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </h3>
                  {session.entries.map((entry, i) => (
                    <div key={i} className="rounded-xl border border-border bg-card p-3">
                      <span className={`inline-block text-[10px] font-bold uppercase tracking-wider mb-1 ${
                        entry.tag.includes('RIFLESSIONE') ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        {entry.tag.includes('RIFLESSIONE') ? '💭 Riflessione' : entry.tag.includes('ROUND') ? `📝 Round ${entry.tag.match(/\d+/)?.[0]}` : '📝 Sfogo'}
                      </span>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{entry.text}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {new Date(entry.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
