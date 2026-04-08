import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Lock } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

interface Challenge {
  id: string;
  challenge_type: string;
  question: string;
  options: string[];
  user_response: string | null;
  submitted_at: string | null;
  day_number: number;
}

export default function LaForgiaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [textResponse, setTextResponse] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    checkProfileAndLoad();
  }, [user, searchParams]);

  const checkProfileAndLoad = async () => {
    if (!user) return;
    setLoading(true);

    // Gatekeeper: check profile completeness
    const { data: profile } = await supabase
      .from('profiles')
      .select('objective, communication_style, current_problems, vision')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile || !profile.objective || !profile.current_problems || !profile.vision) {
      toast.error('Il Consiglio richiede i tuoi dati per forgiare le sfide. Compila il Profilo Evolutivo per accedere.');
      navigate('/profile');
      return;
    }

    // Check for challengeId from deep link (notification)
    const challengeId = searchParams.get('challengeId');

    if (challengeId) {
      const { data } = await supabase
        .from('forgia_challenges')
        .select('*')
        .eq('id', challengeId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setChallenge({
          id: data.id,
          challenge_type: data.challenge_type,
          question: data.question,
          options: data.options || [],
          user_response: data.user_response,
          submitted_at: data.submitted_at,
          day_number: data.day_number,
        });
        setIsSubmitted(!!data.submitted_at);
        setLoading(false);
        return;
      }
    }

    // Load latest unsubmitted challenge or use mock
    const { data: latest } = await supabase
      .from('forgia_challenges')
      .select('*')
      .eq('user_id', user.id)
      .is('submitted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest) {
      setChallenge({
        id: latest.id,
        challenge_type: latest.challenge_type,
        question: latest.question,
        options: latest.options || [],
        user_response: latest.user_response,
        submitted_at: latest.submitted_at,
        day_number: latest.day_number,
      });
      setIsSubmitted(false);
    } else {
      // Check latest submitted
      const { data: lastSubmitted } = await supabase
        .from('forgia_challenges')
        .select('*')
        .eq('user_id', user.id)
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastSubmitted) {
        setChallenge({
          id: lastSubmitted.id,
          challenge_type: lastSubmitted.challenge_type,
          question: lastSubmitted.question,
          options: lastSubmitted.options || [],
          user_response: lastSubmitted.user_response,
          submitted_at: lastSubmitted.submitted_at,
          day_number: lastSubmitted.day_number,
        });
        setIsSubmitted(true);
      } else {
        // Mock for first-time users
        setChallenge({
          id: 'mock',
          challenge_type: 'binary',
          question: 'Hai agito da Sovrano o da Suddito oggi?',
          options: ['Sovrano', 'Suddito'],
          user_response: null,
          submitted_at: null,
          day_number: 1,
        });
        setIsSubmitted(false);
      }
    }

    setLoading(false);
  };

  const handleBinaryResponse = async (option: string) => {
    if (!user || !challenge || submitting) return;
    setSubmitting(true);

    if (challenge.id !== 'mock') {
      await supabase
        .from('forgia_challenges')
        .update({
          user_response: option,
          submitted_at: new Date().toISOString(),
        })
        .eq('id', challenge.id);
    }

    setChallenge(prev => prev ? { ...prev, user_response: option, submitted_at: new Date().toISOString() } : null);
    setIsSubmitted(true);
    setSubmitting(false);
  };

  const handleTextSubmit = async () => {
    if (!user || !challenge || !textResponse.trim() || submitting) return;
    setSubmitting(true);

    if (challenge.id !== 'mock') {
      await supabase
        .from('forgia_challenges')
        .update({
          user_response: textResponse.trim(),
          submitted_at: new Date().toISOString(),
        })
        .eq('id', challenge.id);
    }

    setChallenge(prev => prev ? { ...prev, user_response: textResponse.trim(), submitted_at: new Date().toISOString() } : null);
    setIsSubmitted(true);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-[#E0E0E0] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-800">
        <button onClick={() => navigate(-1)} className="p-2 text-neutral-400 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-black tracking-widest uppercase text-white">LA FORGIA</h1>
        <div className="w-10" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {!isSubmitted && challenge ? (
          <>
            {/* Day indicator */}
            <div className="mb-8">
              <span className="text-xs tracking-[0.3em] uppercase text-neutral-500">
                Giorno {challenge.day_number}
              </span>
            </div>

            {/* Question */}
            <p className="text-xl md:text-2xl font-bold text-center leading-relaxed mb-12 max-w-md">
              {challenge.question}
            </p>

            {/* Input area */}
            {challenge.challenge_type === 'binary' ? (
              <div className="flex gap-4 w-full max-w-sm">
                {challenge.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleBinaryResponse(opt)}
                    disabled={submitting}
                    className="flex-1 py-4 rounded-none border-2 border-neutral-700 text-sm font-bold uppercase tracking-wider text-white hover:bg-red-900/40 hover:border-red-700 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <div className="w-full max-w-sm space-y-4">
                <div className="relative">
                  <textarea
                    value={textResponse}
                    onChange={e => {
                      if (e.target.value.length <= 50) setTextResponse(e.target.value);
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                    placeholder="Rispondi in massimo 50 caratteri"
                    rows={2}
                    className="w-full bg-neutral-900 border-2 border-neutral-700 rounded-none p-4 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-red-700 resize-none"
                  />
                  <span className={`absolute bottom-2 right-3 text-[10px] ${textResponse.length >= 45 ? 'text-red-500' : 'text-neutral-500'}`}>
                    {textResponse.length}/50
                  </span>
                </div>
                <button
                  onClick={handleTextSubmit}
                  disabled={!textResponse.trim() || submitting}
                  className="w-full py-4 border-2 border-red-800 bg-red-900/30 text-sm font-bold uppercase tracking-wider text-white hover:bg-red-900/60 active:scale-95 transition-all disabled:opacity-30"
                >
                  Registra
                </button>
              </div>
            )}
          </>
        ) : (
          /* Lockout state */
          <div className="text-center space-y-6 max-w-sm">
            <Lock size={40} className="mx-auto text-neutral-600" />
            <p className="text-lg font-bold text-white">Dato acquisito.</p>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Il sistema è in blocco di elaborazione.<br />
              Ritorna nel mondo fisico.
            </p>
            {challenge?.user_response && (
              <div className="mt-6 border border-neutral-800 p-4">
                <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">La tua risposta</p>
                <p className="text-sm text-neutral-300">{challenge.user_response}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
