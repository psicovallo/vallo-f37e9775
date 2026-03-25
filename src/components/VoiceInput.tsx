import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';

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
  const recognitionRef = useRef<any>(null);
  const accumulatedRef = useRef(currentValue);
  const intentionalStopRef = useRef(false);
  const isListeningRef = useRef(false);

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
      } else if (interimTranscript) {
        const separator = accumulatedRef.current.trim() ? ' ' : '';
        onTranscript(accumulatedRef.current + separator + interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      // "no-speech" is normal on mobile — just restart
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      toast.error('Errore riconoscimento vocale: ' + event.error);
      intentionalStopRef.current = true;
      isListeningRef.current = false;
      setIsListening(false);
      recognitionRef.current = null;
    };

    // Auto-restart on mobile when recognition ends unexpectedly
    recognition.onend = () => {
      if (!intentionalStopRef.current && isListeningRef.current) {
        // Restart after a tiny delay to avoid rapid loops
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
      // Release the stream immediately — we only needed the permission
      stream.getTracks().forEach(t => t.stop());
    } catch {
      toast.error('Permesso microfono negato.');
      return;
    }

    accumulatedRef.current = currentValue;
    intentionalStopRef.current = false;
    isListeningRef.current = true;

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
    <div className={`inline-flex flex-col items-center ${className}`}>
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
      {isListening && (
        <span className="mt-1 text-[10px] text-destructive font-medium animate-pulse">
          Parla ora...
        </span>
      )}
    </div>
  );
}
