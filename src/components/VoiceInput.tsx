import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  currentValue?: string;
  className?: string;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export default function VoiceInput({ onTranscript, currentValue = '', className = '' }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [showClean, setShowClean] = useState(false);
  const recognitionRef = useRef<any>(null);
  const accumulatedRef = useRef(currentValue);
  const intentionalStopRef = useRef(false);
  const isListeningRef = useRef(false);
  const didDictateRef = useRef(false);

  useEffect(() => {
    if (!isListeningRef.current) {
      accumulatedRef.current = currentValue;
    }
  }, [currentValue]);

  const createRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        const separator = accumulatedRef.current.trim() ? ' ' : '';
        accumulatedRef.current = accumulatedRef.current + separator + finalTranscript;
        onTranscript(accumulatedRef.current);
        didDictateRef.current = true;
      } else if (interimTranscript) {
        const separator = accumulatedRef.current.trim() ? ' ' : '';
        onTranscript(accumulatedRef.current + separator + interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      toast.error('Errore riconoscimento vocale: ' + event.error);
      intentionalStopRef.current = true;
      isListeningRef.current = false;
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      if (!intentionalStopRef.current && isListeningRef.current) {
        setTimeout(() => {
          if (isListeningRef.current && !intentionalStopRef.current) {
            try {
              const newRecog = createRecognition();
              if (newRecog) {
                recognitionRef.current = newRecog;
                newRecog.start();
              }
            } catch {
              isListeningRef.current = false;
              setIsListening(false);
              recognitionRef.current = null;
            }
          }
        }, 100);
      } else {
        isListeningRef.current = false;
        setIsListening(false);
        recognitionRef.current = null;
        // Show clean button if user dictated something
        if (didDictateRef.current && accumulatedRef.current.trim().length > 20) {
          setShowClean(true);
        }
      }
    };

    return recognition;
  }, [onTranscript]);

  const stopListening = useCallback(() => {
    intentionalStopRef.current = true;
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Il tuo browser non supporta il riconoscimento vocale.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch {
      toast.error('Permesso microfono negato.');
      return;
    }

    accumulatedRef.current = currentValue;
    intentionalStopRef.current = false;
    isListeningRef.current = true;
    didDictateRef.current = false;
    setShowClean(false);

    const recognition = createRecognition();
    if (!recognition) {
      toast.error('Il tuo browser non supporta il riconoscimento vocale.');
      return;
    }

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      toast.error('Impossibile avviare il riconoscimento vocale.');
      isListeningRef.current = false;
    }
  }, [currentValue, createRecognition]);

  const toggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const cleanTranscription = useCallback(async () => {
    const textToClean = accumulatedRef.current.trim();
    if (!textToClean) return;

    setIsCleaning(true);
    setShowClean(false);

    try {
      const { data, error } = await supabase.functions.invoke('clean-transcription', {
        body: { text: textToClean },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        setShowClean(true);
        return;
      }

      const cleaned = data?.cleaned || textToClean;
      accumulatedRef.current = cleaned;
      onTranscript(cleaned);
      toast.success('Testo pulito dal Consiglio ✨');
    } catch (e) {
      console.error('Clean transcription error:', e);
      toast.error('Errore nella pulizia del testo');
      setShowClean(true);
    } finally {
      setIsCleaning(false);
    }
  }, [onTranscript]);

  useEffect(() => {
    return () => {
      intentionalStopRef.current = true;
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggle}
          className={`rounded-full p-2 transition-all ${
            isListening
              ? 'bg-destructive text-destructive-foreground animate-pulse shadow-lg shadow-destructive/30'
              : 'bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary'
          }`}
          title={isListening ? 'Ferma dettatura' : 'Avvia dettatura vocale'}
        >
          {isListening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        {showClean && !isListening && (
          <button
            type="button"
            onClick={cleanTranscription}
            disabled={isCleaning}
            className="rounded-full p-2 bg-primary/10 text-primary hover:bg-primary/20 transition-all animate-in fade-in"
            title="Pulisci e ordina il testo dettato"
          >
            <Sparkles size={16} className={isCleaning ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {isListening && (
        <span className="text-[10px] text-destructive font-medium animate-pulse">
          Parla ora...
        </span>
      )}
      {isCleaning && (
        <span className="text-[10px] text-primary font-medium animate-pulse">
          Pulizia...
        </span>
      )}
    </div>
  );
}
