# Revisione Totale Sistema — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Riscrivere completamente il sistema di onboarding (5 passi), la pagina domanda (Fase A con note private + Fase B con timer/bottoni shufflati), la logica notifiche a catena, e aggiungere la generazione dinamica di domande via Claude API.

**Architecture:** React SPA + Supabase Edge Functions + Claude API (fire-and-forget). Le migrazioni DB vengono applicate prima di qualsiasi modifica frontend o backend. Il flusso: Onboarding → question_progress creato → check-reminders (6x/giorno con chain check) → QuestionPage (Fase A note private, Fase B risposta) → generate-next-questions (Claude API async).

**Tech Stack:** React 18 + TypeScript + Vite, Supabase (PostgreSQL + Auth + Edge Functions), Claude API `claude-sonnet-4-6`, TailwindCSS + shadcn-ui, React Router v6, TanStack React Query v5.

**Spec:** `docs/superpowers/specs/2026-03-20-revisione-totale-sistema-design.md`

---

## File Map

### Nuovi file
- `supabase/migrations/20260320000001_new_tables.sql` — tabelle user_checkins e phase_a_notes
- `supabase/migrations/20260320000002_modify_tables.sql` — modifiche a question_progress, phrases, question_answers, question_deliveries
- `supabase/functions/generate-next-questions/index.ts` — edge function Claude API
- `src/components/onboarding/OnboardingPatto.tsx` — step 1: Il Patto
- `src/components/onboarding/OnboardingPercorso.tsx` — step 2: scelta percorso
- `src/components/onboarding/OnboardingCheckin.tsx` — step 3: check-in iniziale
- `src/components/onboarding/OnboardingFinestraOraria.tsx` — step 4: finestra oraria
- `src/components/onboarding/OnboardingAttivazione.tsx` — step 5: attivazione notifiche
- `src/components/question/PhaseANotes.tsx` — textarea con debounce + upsert
- `src/components/question/PhaseBTimer.tsx` — timer visibile 60s
- `src/components/question/PhaseBButtons.tsx` — 4 bottoni shufflati con testo casuale

### File modificati
- `supabase/functions/check-reminders/index.ts` — aggiunge chain check + filtraggio domande per category + ai_generated priorità
- `supabase/functions/send-push-notification/index.ts` — logging dettagliato
- `src/App.tsx` — aggiunge route /onboarding, guard onboarding in AppLayout
- `src/components/AppLayout.tsx` — aggiunge onboarding guard
- `src/pages/OnboardingPage.tsx` — **RISCRITTO** come orchestratore 5 passi (standalone, no prop onComplete)
- `src/pages/QuestionPage.tsx` — **RISCRITTO** con Fase A + Fase B + routing guard
- `src/pages/HomePage.tsx` — rimuove embed OnboardingPage, aggiunge redirect a /onboarding

---

## Task 1: Migrazione DB — Nuove tabelle

**Files:**
- Create: `supabase/migrations/20260320000001_new_tables.sql`

- [ ] **Step 1: Crea il file di migrazione per le nuove tabelle**

```sql
-- supabase/migrations/20260320000001_new_tables.sql

-- user_checkins: risposta a "Perché sei qui oggi?" durante onboarding
CREATE TABLE IF NOT EXISTS public.user_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkins"
  ON public.user_checkins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkins"
  ON public.user_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Nessuna UPDATE policy: il check-in iniziale è immutabile per design.

-- phase_a_notes: appunti privati durante la fase di incubazione
CREATE TABLE IF NOT EXISTS public.phase_a_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  note_text TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, question_index)
);

ALTER TABLE public.phase_a_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes"
  ON public.phase_a_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes"
  ON public.phase_a_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
  ON public.phase_a_notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger per auto-aggiornare updated_at ad ogni UPDATE
CREATE TRIGGER update_phase_a_notes_updated_at
  BEFORE UPDATE ON public.phase_a_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

- [ ] **Step 2: Applica la migrazione localmente**

```bash
# Assicurati di essere nella root del progetto
npx supabase db push
# Oppure via Supabase Dashboard → SQL Editor, incolla e esegui il file
```

Verifica: nessun errore. Le tabelle `user_checkins` e `phase_a_notes` appaiono nel dashboard Supabase.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260320000001_new_tables.sql
git commit -m "feat(db): add user_checkins and phase_a_notes tables"
```

---

## Task 2: Migrazione DB — Modifiche tabelle esistenti

**Files:**
- Create: `supabase/migrations/20260320000002_modify_tables.sql`

- [ ] **Step 1: Crea il file di migrazione per le modifiche**

```sql
-- supabase/migrations/20260320000002_modify_tables.sql

-- question_progress: aggiunge category per filtrare le domande per percorso
ALTER TABLE public.question_progress
  ADD COLUMN IF NOT EXISTS category TEXT
  CHECK (category IN ('dimagrimento', 'relazioni', 'lavoro'));

-- phrases: aggiunge source (static vs ai_generated) e user_id per domande personalizzate
ALTER TABLE public.phrases
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'static'
  CHECK (source IN ('static', 'ai_generated'));

ALTER TABLE public.phrases
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Permette al service role di inserire domande AI (bypass della policy admin-only esistente)
CREATE POLICY "Service role can insert phrases"
  ON public.phrases FOR INSERT
  TO service_role
  WITH CHECK (true);

-- question_answers: aggiunge snapshot delle note Fase A al momento della risposta
-- Struttura: ["testo appunti"] — array JSON con 0 o 1 elementi
ALTER TABLE public.question_answers
  ADD COLUMN IF NOT EXISTS phase_a_notes_snapshot JSONB;
-- answer_button già esistente (definito in migration 20260317214231)

-- question_deliveries: aggiunge campi per chain logic e tracking apertura
ALTER TABLE public.question_deliveries
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS chain_blocked BOOLEAN NOT NULL DEFAULT false;
```

- [ ] **Step 2: Applica la migrazione**

```bash
npx supabase db push
```

Verifica: colonne presenti nelle tabelle. Controlla `phrases` ha `source` e `user_id`. Controlla `question_deliveries` ha `chain_blocked`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260320000002_modify_tables.sql
git commit -m "feat(db): add category, source, chain_blocked, phase_a_notes_snapshot columns"
```

---

## Task 3: Routing — /onboarding route e guard

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/AppLayout.tsx`

- [ ] **Step 1: Aggiungi la route /onboarding in App.tsx**

Apri `src/App.tsx`. Aggiungi import e route. Il file finale deve essere:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import AuthPage from "@/pages/AuthPage";
import HomePage from "@/pages/HomePage";
import OnboardingPage from "@/pages/OnboardingPage";
import RemindersPage from "@/pages/RemindersPage";
import NotesPage from "@/pages/NotesPage";
import MessagesPage from "@/pages/MessagesPage";
import AdminPage from "@/pages/AdminPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import QuestionPage from "@/pages/QuestionPage";
import ContractPage from "@/pages/ContractPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            {/* /onboarding è standalone, fuori da AppLayout per non mostrare BottomNav */}
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route element={<AppLayout />}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/question" element={<QuestionPage />} />
              <Route path="/contract" element={<ContractPage />} />
              <Route path="/reminders" element={<RemindersPage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
```

- [ ] **Step 2: Aggiungi guard in AppLayout.tsx**

Il guard reindirizza a /onboarding se l'utente ha `onboarding_completed = false`. Sostituisci il contenuto di `src/components/AppLayout.tsx`:

```tsx
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/BottomNav';

export default function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    if (loading) return;    // auth ancora in risoluzione
    if (!user) {
      setOnboardingChecked(true); // lascia che Navigate gestisca il redirect a /
      return;
    }

    supabase
      .from('question_progress')
      .select('onboarding_completed')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data?.onboarding_completed) {
          navigate('/onboarding', { replace: true });
        } else {
          setOnboardingChecked(true);
        }
      });
  }, [user, loading]);

  if (loading || !onboardingChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Outlet />
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 3: Verifica TypeScript**

```bash
npx tsc --noEmit
```

Atteso: nessun errore.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/AppLayout.tsx
git commit -m "feat(routing): add /onboarding route and onboarding guard in AppLayout"
```

---

## Task 4: Onboarding — Step 1 "Il Patto"

**Files:**
- Create: `src/components/onboarding/OnboardingPatto.tsx`

- [ ] **Step 1: Crea la directory e il componente**

```tsx
// src/components/onboarding/OnboardingPatto.tsx

interface Props {
  onNext: () => void;
}

export default function OnboardingPatto({ onNext }: Props) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-foreground">Il Nostro Patto.</h1>
      </div>

      <div className="flex-1 space-y-6 text-sm leading-relaxed text-foreground">
        <p>
          Benvenuto. Questa non è la solita app per farti sentire bravo. Qui non ci sono premi,
          non ci sono scorciatoie e non ci sono pulsanti verdi per darti una finta gratificazione.
        </p>
        <p>Se vuoi usare questo sistema, devi accettare le nostre regole:</p>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-1 font-bold">1. Il tempo è tuo alleato (e il tuo peggior nemico):</p>
            <p className="text-muted-foreground">
              Riceverai 3 domande al giorno, in orari casuali. All'inizio non potrai rispondere.
              Dovrai solo leggerle. Avrai uno spazio per prendere appunti privati, ma la risposta
              ufficiale sarà bloccata per giorni. La verità ha bisogno di tempo per emergere, non
              puoi liquidarla in 10 secondi.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-1 font-bold">2. Niente risposte di pancia:</p>
            <p className="text-muted-foreground">
              Quando il sistema sbloccherà la risposta, sarai costretto a fissare lo schermo per
              60 secondi prima di poter scrivere. Respira e spegni l'istinto di difesa.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-1 font-bold">3. Zero scuse:</p>
            <p className="text-muted-foreground">
              La tua risposta ufficiale dovrà essere lunga. Se usi parole come "domani", "spero",
              "ma", "difficile" o "colpa", il sistema ti bloccherà. Vogliamo un'analisi onesta,
              non le solite giustificazioni.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-1 font-bold">4. Tutto quello che scrivi ha un peso:</p>
            <p className="text-muted-foreground">
              I tuoi appunti e le tue risposte diventeranno la base delle domande di domani. Il
              sistema impara da te e ti metterà di fronte alle tue stesse contraddizioni.
            </p>
          </div>
        </div>

        <p className="text-center font-medium">
          Non esiste una risposta sbagliata, esiste solo la risposta onesta.
        </p>
      </div>

      <button
        onClick={onNext}
        className="mt-6 w-full rounded-2xl bg-primary px-4 py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
      >
        HO CAPITO. ACCETTO IL PATTO.
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verifica TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/OnboardingPatto.tsx
git commit -m "feat(onboarding): add OnboardingPatto step 1 component"
```

---

## Task 5: Onboarding — Step 2 "Scelta Percorso"

**Files:**
- Create: `src/components/onboarding/OnboardingPercorso.tsx`

- [ ] **Step 1: Crea il componente**

```tsx
// src/components/onboarding/OnboardingPercorso.tsx

export type Percorso = 'dimagrimento' | 'relazioni' | 'lavoro';

interface Props {
  selected: Percorso | null;
  onSelect: (p: Percorso) => void;
  onNext: () => void;
}

const PERCORSI: { value: Percorso; label: string; desc: string }[] = [
  { value: 'dimagrimento', label: 'Dimagrimento', desc: 'Domande sul rapporto con il cibo, il corpo e le abitudini.' },
  { value: 'relazioni', label: 'Relazioni', desc: 'Domande sui legami, i confini e i pattern relazionali.' },
  { value: 'lavoro', label: 'Lavoro', desc: 'Domande sulla carriera, le ambizioni e le autosabotazioni.' },
];

export default function OnboardingPercorso({ selected, onSelect, onNext }: Props) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-bold text-foreground">Scegli il tuo percorso</h1>
        <p className="text-sm text-muted-foreground">
          Le domande che riceverai dipendono da questo. Scegli con onestà.
        </p>
      </div>

      <div className="flex-1 space-y-4">
        {PERCORSI.map(p => (
          <button
            key={p.value}
            onClick={() => onSelect(p.value)}
            className={`w-full rounded-2xl border p-5 text-left transition-all ${
              selected === p.value
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card hover:border-primary/50'
            }`}
          >
            <p className="font-bold text-foreground">{p.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{p.desc}</p>
          </button>
        ))}
      </div>

      <button
        onClick={onNext}
        disabled={!selected}
        className="mt-6 w-full rounded-2xl bg-primary px-4 py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
      >
        Continua
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verifica TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/OnboardingPercorso.tsx
git commit -m "feat(onboarding): add OnboardingPercorso step 2 component"
```

---

## Task 6: Onboarding — Step 3 "Check-in iniziale"

**Files:**
- Create: `src/components/onboarding/OnboardingCheckin.tsx`

- [ ] **Step 1: Crea il componente**

```tsx
// src/components/onboarding/OnboardingCheckin.tsx

import { useState } from 'react';

interface Props {
  onNext: (text: string) => void;
}

const MIN_CHARS = 20;

export default function OnboardingCheckin({ onNext }: Props) {
  const [text, setText] = useState('');
  const isValid = text.trim().length >= MIN_CHARS;

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-bold text-foreground">Perché sei qui oggi?</h1>
        <p className="text-sm text-muted-foreground">
          Non c'è risposta giusta. Scrivi quello che ti viene in mente adesso.
        </p>
      </div>

      <div className="flex-1">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Scrivi almeno 20 caratteri..."
          rows={6}
          className="w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className={`mt-1 text-xs ${isValid ? 'text-primary' : 'text-muted-foreground'}`}>
          {text.trim().length}/{MIN_CHARS} caratteri minimi
        </p>
      </div>

      <button
        onClick={() => onNext(text.trim())}
        disabled={!isValid}
        className="mt-6 w-full rounded-2xl bg-primary px-4 py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
      >
        Continua
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verifica TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/OnboardingCheckin.tsx
git commit -m "feat(onboarding): add OnboardingCheckin step 3 component"
```

---

## Task 7: Onboarding — Step 4 "Finestra Oraria"

**Files:**
- Create: `src/components/onboarding/OnboardingFinestraOraria.tsx`

- [ ] **Step 1: Crea il componente (estratto dall'OnboardingPage esistente)**

```tsx
// src/components/onboarding/OnboardingFinestraOraria.tsx

interface Props {
  windowStart: string;
  windowEnd: string;
  onChangeStart: (v: string) => void;
  onChangeEnd: (v: string) => void;
  onNext: () => void;
}

const TIME_OPTIONS = Array.from({ length: 16 }, (_, i) => {
  const h = i + 7;
  return `${h.toString().padStart(2, '0')}:00`;
});

export default function OnboardingFinestraOraria({
  windowStart, windowEnd, onChangeStart, onChangeEnd, onNext,
}: Props) {
  const isValid = windowEnd > windowStart;

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-bold text-foreground">La tua finestra di riflessione</h1>
        <p className="text-sm text-muted-foreground">
          Scegli quando vuoi ricevere le notifiche. Il sistema userà 6 orari casuali dentro questa fascia.
        </p>
      </div>

      <div className="flex-1 space-y-6">
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Inizio fascia
          </label>
          <select
            value={windowStart}
            onChange={e => onChangeStart(e.target.value)}
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Fine fascia
          </label>
          <select
            value={windowEnd}
            onChange={e => onChangeEnd(e.target.value)}
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Le tue 6 notifiche arriveranno tra le{' '}
            <span className="font-semibold text-primary">{windowStart}</span> e le{' '}
            <span className="font-semibold text-primary">{windowEnd}</span>
          </p>
        </div>

        {!isValid && (
          <p className="text-center text-xs text-destructive">
            La fine deve essere successiva all'inizio.
          </p>
        )}
      </div>

      <button
        onClick={onNext}
        disabled={!isValid}
        className="mt-6 w-full rounded-2xl bg-primary px-4 py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
      >
        Conferma orari
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verifica TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/OnboardingFinestraOraria.tsx
git commit -m "feat(onboarding): add OnboardingFinestraOraria step 4 component"
```

---

## Task 8: Onboarding — Step 5 "Attivazione" + orchestratore

**Files:**
- Create: `src/components/onboarding/OnboardingAttivazione.tsx`
- Modify: `src/pages/OnboardingPage.tsx` (**RISCRITTO COMPLETAMENTE**)

- [ ] **Step 1: Crea OnboardingAttivazione**

```tsx
// src/components/onboarding/OnboardingAttivazione.tsx

import { Bell } from 'lucide-react';

interface Props {
  loading: boolean;
  isSupported: boolean;
  onActivate: () => void;
}

export default function OnboardingAttivazione({ loading, isSupported, onActivate }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div className="mb-10 text-center">
        <div className="mb-6 text-6xl">🔥</div>
        <h1 className="mb-3 text-2xl font-bold text-foreground">Tutto pronto</h1>
        <p className="text-sm text-muted-foreground">
          Premi il bottone per attivare le tue notifiche giornaliere. La richiesta arriverà dal sistema operativo, non da noi.
        </p>
      </div>

      <button
        onClick={onActivate}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-5 text-base font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
        ) : (
          <>
            <Bell size={20} />
            ATTIVA LE TUE RIFLESSIONI
          </>
        )}
      </button>

      {!isSupported && (
        <p className="mt-4 text-center text-xs text-destructive">
          Il tuo browser non supporta le notifiche push. Prova con Chrome su Android o Safari su iOS 16.4+.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Riscrivi OnboardingPage.tsx come orchestratore 5 passi**

Sostituisci **tutto** il contenuto di `src/pages/OnboardingPage.tsx`:

```tsx
// src/pages/OnboardingPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';
import OnboardingPatto from '@/components/onboarding/OnboardingPatto';
import OnboardingPercorso, { Percorso } from '@/components/onboarding/OnboardingPercorso';
import OnboardingCheckin from '@/components/onboarding/OnboardingCheckin';
import OnboardingFinestraOraria from '@/components/onboarding/OnboardingFinestraOraria';
import OnboardingAttivazione from '@/components/onboarding/OnboardingAttivazione';

type Step = 'patto' | 'percorso' | 'checkin' | 'finestra' | 'attivazione';

const STEPS: Step[] = ['patto', 'percorso', 'checkin', 'finestra', 'attivazione'];

function StepIndicator({ current }: { current: Step }) {
  const idx = STEPS.indexOf(current);
  return (
    <div className="mb-6 flex justify-center gap-2">
      {STEPS.map((_, i) => (
        <div
          key={i}
          className={`h-1.5 w-8 rounded-full transition-all ${
            i <= idx ? 'bg-primary' : 'bg-border'
          }`}
        />
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isSupported, requestPermission } = usePushNotifications();

  const [step, setStep] = useState<Step>('patto');
  const [percorso, setPercorso] = useState<Percorso | null>(null);
  const [windowStart, setWindowStart] = useState('08:00');
  const [windowEnd, setWindowEnd] = useState('22:00');
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    if (!user || !percorso) return;
    setLoading(true);

    try {
      // Guarda se esiste già un question_progress (es. utente che torna indietro)
      // question_progress ha UNIQUE(user_id) — non fare INSERT cieco
      const { data: existing } = await supabase
        .from('question_progress')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await supabase
          .from('question_progress')
          .update({
            onboarding_completed: true,
            notification_window_start: windowStart,
            notification_window_end: windowEnd,
            category: percorso,
          })
          .eq('id', existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: progressError } = await supabase
          .from('question_progress')
          .insert({
            user_id: user.id,
            onboarding_completed: true,
            notification_window_start: windowStart,
            notification_window_end: windowEnd,
            phase: 'incubation',
            questions_read_count: 0,
            current_question_index: 1,
            answered: false,
            category: percorso,
          });
        if (progressError) throw progressError;
      }

      // 2. Richiedi permessi notifiche — SOLO AL CLICK
      if (isSupported) {
        const ok = await requestPermission();
        if (!ok) {
          toast.warning('Notifiche non attivate. Puoi attivarle dalle impostazioni del browser.');
        }
      }

      toast.success('Percorso attivato. Le domande arriveranno a breve.');
      navigate('/home', { replace: true });
    } catch (err: unknown) {
      toast.error('Errore durante l\'attivazione. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckinNext = async (text: string) => {
    if (!user) return;

    // Salva il check-in nel DB prima di passare al passo successivo
    const { error } = await supabase
      .from('user_checkins')
      .insert({ user_id: user.id, text });

    if (error) {
      toast.error('Errore nel salvataggio. Riprova.');
      return;
    }

    setStep('finestra');
  };

  const next = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 pb-10 pt-8">
      <StepIndicator current={step} />

      {step === 'patto' && <OnboardingPatto onNext={next} />}

      {step === 'percorso' && (
        <OnboardingPercorso
          selected={percorso}
          onSelect={setPercorso}
          onNext={next}
        />
      )}

      {step === 'checkin' && (
        <OnboardingCheckin onNext={handleCheckinNext} />
      )}

      {step === 'finestra' && (
        <OnboardingFinestraOraria
          windowStart={windowStart}
          windowEnd={windowEnd}
          onChangeStart={setWindowStart}
          onChangeEnd={setWindowEnd}
          onNext={next}
        />
      )}

      {step === 'attivazione' && (
        <OnboardingAttivazione
          loading={loading}
          isSupported={isSupported}
          onActivate={handleActivate}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Aggiorna HomePage.tsx — rimuovi OnboardingPage embedded**

In `src/pages/HomePage.tsx`, rimuovi:
- L'import di `OnboardingPage`
- Lo state `onboardingDone`
- Il `useEffect` che chiama `checkOnboarding`
- Il render condizionale di `<OnboardingPage>`

Sostituisci la parte condizionale con un redirect:

```tsx
// Aggiungi import useNavigate e useEffect all'inizio di HomePage
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// All'interno del componente, sostituisci la logica onboardingDone con:
const navigate = useNavigate();

useEffect(() => {
  if (!user) return;
  supabase
    .from('question_progress')
    .select('onboarding_completed')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
    .then(({ data }) => {
      if (!data?.onboarding_completed) {
        navigate('/onboarding', { replace: true });
      }
    });
}, [user]);
```

Rimuovi tutto il rendering condizionale `if (!onboardingDone)` e il ritorno dell'overlay `<OnboardingPage>`.

- [ ] **Step 4: Verifica TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Build**

```bash
npm run build
```

Atteso: build riuscita senza errori.

- [ ] **Step 6: Test manuale**
  - Apri l'app con un utente nuovo → deve vedere `/onboarding` con i 5 passi
  - Completa tutti i passi → deve arrivare a `/home`
  - Ricarica → rimane su `/home` (onboarding completato)
  - Utente non autenticato su `/home` → redirect a `/`

- [ ] **Step 7: Commit**

```bash
git add src/components/onboarding/ src/pages/OnboardingPage.tsx src/pages/HomePage.tsx
git commit -m "feat(onboarding): rewrite 5-step onboarding with Il Patto, percorso, checkin, finestra, attivazione"
```

---

## Task 9: QuestionPage — PhaseANotes component

**Files:**
- Create: `src/components/question/PhaseANotes.tsx`

- [ ] **Step 1: Crea il componente con debounce e upsert real-time**

```tsx
// src/components/question/PhaseANotes.tsx

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  userId: string;
  questionIndex: number;
  initialText?: string;
}

const DEBOUNCE_MS = 1000;

export default function PhaseANotes({ userId, questionIndex, initialText = '' }: Props) {
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Carica note esistenti al mount
  useEffect(() => {
    supabase
      .from('phase_a_notes')
      .select('note_text')
      .eq('user_id', userId)
      .eq('question_index', questionIndex)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.note_text) setText(data.note_text);
      });
  }, [userId, questionIndex]);

  const save = async (value: string) => {
    setSaving(true);
    setSaved(false);
    await supabase
      .from('phase_a_notes')
      .upsert(
        { user_id: userId, question_index: questionIndex, note_text: value, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,question_index' }
      );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChange = (value: string) => {
    setText(value);
    setSaved(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(value), DEBOUNCE_MS);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          I tuoi appunti privati
        </label>
        {saving && <span className="text-xs text-muted-foreground">Salvataggio...</span>}
        {saved && <span className="text-xs text-primary">Salvato</span>}
      </div>
      <textarea
        value={text}
        onChange={e => handleChange(e.target.value)}
        placeholder="Sputa fuori quello che pensi. Rabbia, dubbi, resistenza. Nessuno leggerà questi appunti tranne l'IA che genererà la prossima domanda."
        rows={6}
        className="w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}
```

- [ ] **Step 2: Verifica TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/question/PhaseANotes.tsx
git commit -m "feat(question): add PhaseANotes component with debounce and real-time upsert"
```

---

## Task 10: QuestionPage — PhaseBTimer component

**Files:**
- Create: `src/components/question/PhaseBTimer.tsx`

- [ ] **Step 1: Crea il componente**

```tsx
// src/components/question/PhaseBTimer.tsx

import { useEffect, useState, useRef } from 'react';
import { Timer } from 'lucide-react';

interface Props {
  seconds: number;
  onComplete: () => void;
}

export default function PhaseBTimer({ seconds, onComplete }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const calledRef = useRef(false);

  useEffect(() => {
    calledRef.current = false;
    setRemaining(seconds);

    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          if (!calledRef.current) {
            calledRef.current = true;
            onComplete();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const progress = ((seconds - remaining) / seconds) * 100;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const formatted = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="mb-6 text-center">
      <div className="inline-flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-8 py-5">
        <div className="flex items-center gap-2">
          <Timer size={20} className="animate-pulse text-primary" />
          <p className="font-mono text-3xl font-bold text-foreground">{formatted}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Sei alla risposta. Aspetta un minuto intero prima di scrivere.
        </p>
        {/* Progress bar */}
        <div className="h-1 w-40 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-primary transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verifica TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/question/PhaseBTimer.tsx
git commit -m "feat(question): add PhaseBTimer visible 60s countdown component"
```

---

## Task 11: QuestionPage — PhaseBButtons component

**Files:**
- Create: `src/components/question/PhaseBButtons.tsx`

- [ ] **Step 1: Crea il componente con shuffle e testo casuale**

```tsx
// src/components/question/PhaseBButtons.tsx

import { useMemo } from 'react';

export type ButtonCategory = 'presa_di_coscienza' | 'blocco' | 'riflessione' | 'resistenza';

export interface ButtonChoice {
  category: ButtonCategory;
  label: string;
  color: string;
}

interface Props {
  onSelect: (choice: ButtonChoice) => void;
  selected: ButtonCategory | null;
}

const BUTTON_VARIANTS: Record<ButtonCategory, string[]> = {
  presa_di_coscienza: ['Ammetto la menzogna', 'Smetto di mentire', 'Accetto la realtà'],
  blocco: ['Non so rispondere', 'Mi sento bloccato', 'Non voglio vedere'],
  riflessione: ['Ho bisogno di tempo', 'Voglio riflettere', 'Il silenzio mi serve'],
  resistenza: ['Mi fa rabbia', 'Mi sento aggredito', 'Non sono d\'accordo'],
};

const BUTTON_COLORS: Record<ButtonCategory, string> = {
  presa_di_coscienza: 'bg-destructive text-destructive-foreground',
  blocco: 'bg-secondary text-secondary-foreground border border-border',
  riflessione: 'bg-accent/20 text-accent-foreground border border-accent/40',
  resistenza: 'bg-card text-muted-foreground border border-border',
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PhaseBButtons({ onSelect, selected }: Props) {
  // Shuffle e testo casuale stabilizzati al mount (non cambiano al click)
  const buttons: ButtonChoice[] = useMemo(() => {
    const base: ButtonChoice[] = (Object.keys(BUTTON_VARIANTS) as ButtonCategory[]).map(cat => ({
      category: cat,
      label: pickRandom(BUTTON_VARIANTS[cat]),
      color: BUTTON_COLORS[cat],
    }));
    return shuffleArray(base);
  }, []);

  return (
    <div className="space-y-3">
      <p className="mb-4 text-sm text-muted-foreground">
        In base a quello che hai scritto, scegli uno di questi bottoni. Non ti preoccupare,
        pensa e scegline uno per proseguire. Va tutto bene.
      </p>
      {buttons.map(btn => (
        <button
          key={btn.category}
          onClick={() => onSelect(btn)}
          className={`w-full rounded-2xl px-4 py-3.5 text-sm font-bold uppercase tracking-wide transition-all ${btn.color} ${
            selected === btn.category
              ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
              : 'hover:opacity-80'
          }`}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verifica TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/question/PhaseBButtons.tsx
git commit -m "feat(question): add PhaseBButtons with Fisher-Yates shuffle and random labels"
```

---

## Task 12: QuestionPage — Riscrittura completa

**Files:**
- Modify: `src/pages/QuestionPage.tsx` (**RISCRITTO COMPLETAMENTE**)

- [ ] **Step 1: Riscrivi QuestionPage.tsx**

Sostituisci **tutto** il contenuto del file:

```tsx
// src/pages/QuestionPage.tsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import PhaseANotes from '@/components/question/PhaseANotes';
import PhaseBTimer from '@/components/question/PhaseBTimer';
import PhaseBButtons, { ButtonCategory, ButtonChoice } from '@/components/question/PhaseBButtons';

const BLOCKED_WORDS = ['domani', 'spero', 'difficile', 'stress', 'festa', 'poco', 'colpa', 'ma '];
const BLOCKED_WORD_VARIANTS = ['ma,', 'ma.'];
const MIN_CHARS = 50;
const READ_SECONDS = 15;
const REQUIRED_READS = 9;
const COUNTDOWN_SECONDS = 60;

interface QuestionData { index: number; text: string; }
interface ProgressData {
  id: string;
  phase: string;
  questions_read_count: number;
  current_question_index: number;
  answered: boolean;
  category: string | null;
}

function validateText(text: string): string | null {
  if (text.trim().length < MIN_CHARS) {
    return `La risposta deve contenere almeno ${MIN_CHARS} caratteri. Ne hai scritti ${text.trim().length}.`;
  }
  const lower = text.toLowerCase().trim();
  for (const word of BLOCKED_WORDS) {
    if (lower.includes(word)) {
      return `La parola "${word.trim()}" è una scusa. Riformula.`;
    }
  }
  for (const variant of BLOCKED_WORD_VARIANTS) {
    if (lower.includes(variant)) {
      return `La parola "ma" è una scusa. Riformula.`;
    }
  }
  return null;
}

export default function QuestionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [timerDone, setTimerDone] = useState(false);
  const [readCompleted, setReadCompleted] = useState(false);
  const [selectedButton, setSelectedButton] = useState<ButtonChoice | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [textValid, setTextValid] = useState(false);
  const readTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const deliveryIdRef = useRef<string | null>(null);

  const isIncubation = !progress || progress.questions_read_count < REQUIRED_READS;
  const readsRemaining = Math.max(REQUIRED_READS - (progress?.questions_read_count ?? 0), 0);
  const hoursEstimate = Math.ceil(readsRemaining / 3) * 24;

  const startReadTimer = useCallback(() => {
    if (readTimerRef.current) clearTimeout(readTimerRef.current);
    readTimerRef.current = setTimeout(() => setReadCompleted(true), READ_SECONDS * 1000);
  }, []);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      // Routing guard: redirect se onboarding non completato
      const { data: prog } = await supabase
        .from('question_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!prog?.onboarding_completed) {
        navigate('/onboarding', { replace: true });
        return;
      }

      if (prog.answered) {
        const nextIndex = prog.current_question_index + 1;
        if (nextIndex > 21) { setAllDone(true); return; }

        await supabase.from('question_progress').update({
          current_question_index: nextIndex,
          answered: false, answer_text: null, answer_button: null, answered_at: null,
          phase: 'incubation', questions_read_count: 0,
        }).eq('id', prog.id);

        prog.current_question_index = nextIndex;
        prog.answered = false;
        prog.phase = 'incubation';
        prog.questions_read_count = 0;
      }

      const readCount = Math.max(0, prog.questions_read_count || 0);
      const phase = readCount >= REQUIRED_READS ? 'response' : 'incubation';

      setProgress({
        id: prog.id,
        phase,
        questions_read_count: readCount,
        current_question_index: prog.current_question_index,
        answered: prog.answered,
        category: prog.category,
      });

      // Carica domande: prima le ai_generated per l'utente corrente, poi le statiche per category
      const { data: aiQuestions } = await supabase
        .from('phrases')
        .select('*')
        .eq('type', 'domanda')
        .eq('source', 'ai_generated')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      let questions = aiQuestions && aiQuestions.length > 0 ? aiQuestions : null;

      if (!questions || questions.length < prog.current_question_index) {
        const { data: staticQ } = await supabase
          .from('phrases')
          .select('*')
          .eq('type', 'domanda')
          .eq('source', 'static')
          .eq('category', prog.category ?? '')
          .order('created_at', { ascending: true });

        questions = staticQ || [];
      }

      if (!questions.length) {
        toast.error('Nessuna domanda disponibile per il tuo percorso.');
        return;
      }

      const idx = prog.current_question_index;
      if (idx > questions.length) { setAllDone(true); return; }

      setQuestion({ index: idx, text: questions[idx - 1].text });

      // Cerca una delivery non letta per avviare il timer invisibile
      const { data: delivery } = await supabase
        .from('question_deliveries')
        .select('id')
        .eq('user_id', user.id)
        .eq('question_index', idx)
        .eq('read_completed', false)
        .order('delivered_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      deliveryIdRef.current = delivery?.id ?? null;

      if (phase === 'incubation' && delivery) {
        startReadTimer(); // timer invisibile
      }
    };

    load();

    return () => {
      if (readTimerRef.current) clearTimeout(readTimerRef.current);
    };
  }, [user]);

  // Quando il timer invisibile scade, marca la lettura come completata
  useEffect(() => {
    if (!readCompleted || !user || !progress || !deliveryIdRef.current) return;

    const markRead = async () => {
      const id = deliveryIdRef.current;
      if (!id) return;

      await supabase.from('question_deliveries').update({
        read_completed: true,
        read_at: new Date().toISOString(),
        read_duration_seconds: READ_SECONDS,
      }).eq('id', id);

      const newCount = Math.min((progress.questions_read_count || 0) + 1, REQUIRED_READS);
      const nextPhase = newCount >= REQUIRED_READS ? 'response' : 'incubation';

      await supabase.from('question_progress').update({
        questions_read_count: newCount,
        phase: nextPhase,
      }).eq('id', progress.id);

      deliveryIdRef.current = null;
      setProgress(p => p ? { ...p, questions_read_count: newCount, phase: nextPhase } : p);
    };

    markRead();
  }, [readCompleted]);

  const handleTextChange = (text: string) => {
    setAnswerText(text);
    setSelectedButton(null);
    const error = validateText(text);
    setValidationError(error);
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
      setTimerDone(false); // resetta il timer
      toast.error('Risposta rifiutata. Il timer riparte.');
      return;
    }

    setSubmitting(true);

    // Recupera nota Fase A per lo snapshot
    const { data: noteData } = await supabase
      .from('phase_a_notes')
      .select('note_text')
      .eq('user_id', user.id)
      .eq('question_index', question.index)
      .maybeSingle();

    const snapshot = noteData?.note_text ? [noteData.note_text] : [];

    const { error: insertError } = await supabase.from('question_answers').insert({
      user_id: user.id,
      question_index: question.index,
      question_text: question.text,
      answer_text: answerText.trim(),
      answer_button: selectedButton.category,
      phase_a_notes_snapshot: snapshot,
    });

    if (insertError) {
      toast.error(insertError.message);
      setSubmitting(false);
      return;
    }

    await supabase.from('question_progress').update({
      answered: true,
      answer_text: answerText.trim(),
      answer_button: selectedButton.category,
      answered_at: new Date().toISOString(),
    }).eq('id', progress.id);

    // Recupera le ultime 3 risposte precedenti per contesto AI
    const { data: prevAnswers } = await supabase
      .from('question_answers')
      .select('answer_text, answer_button')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3);

    const previousAnswers = (prevAnswers || []).map(a => ({
      text: a.answer_text,
      button: a.answer_button,
    }));

    // Fire-and-forget: genera domande AI per il giorno dopo
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-next-questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        user_id: user.id,
        category: progress.category,
        current_answer: { text: answerText.trim(), button: selectedButton.category },
        phase_a_notes: snapshot,
        previous_answers: previousAnswers,
      }),
    }).catch(() => { /* fire and forget — errori ignorati */ });

    setCompleted(true);
    setSubmitting(false);
  };

  // --- Render states ---

  if (allDone) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-24 pt-16 text-center">
        <div className="mb-6 text-6xl">🔥</div>
        <h1 className="mb-4 text-2xl font-bold text-foreground">Hai completato tutte le domande</h1>
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
          Hai scelto: <span className="font-semibold text-primary">{selectedButton?.label}</span>
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

  // --- Fase A ---
  if (isIncubation) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-24 pt-8">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-primary">
            Domanda {question.index}/21
          </span>
          <span className="inline-block rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-primary">
            Fase Osservazione · {progress.questions_read_count}/{REQUIRED_READS}
          </span>
        </div>

        <div className="mb-8 rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <p className="text-lg font-semibold leading-relaxed text-foreground">{question.text}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Non puoi ancora rispondere alla domanda finale. Usa questo spazio per prendere appunti.
            Sputa fuori quello che pensi.{' '}
            {readsRemaining > 0 && (
              <span className="font-medium text-foreground">
                Il sistema si sbloccherà tra circa {hoursEstimate} ore.
              </span>
            )}
          </p>
        </div>

        {/* Timer invisibile — nessun indicatore visivo */}

        {/* Note private — sempre visibili in Fase A */}
        <PhaseANotes userId={user!.id} questionIndex={question.index} />
      </div>
    );
  }

  // --- Fase B ---
  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-8">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-primary">
          Domanda {question.index}/21
        </span>
        <span className="inline-block rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary">
          Fase Risposta
        </span>
      </div>

      <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/5 p-6">
        <p className="text-lg font-semibold leading-relaxed text-foreground">{question.text}</p>
      </div>

      {/* Timer visibile 60s — appare all'apertura */}
      {!timerDone && (
        <PhaseBTimer seconds={COUNTDOWN_SECONDS} onComplete={() => setTimerDone(true)} />
      )}

      {validationError && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{validationError}</p>
        </div>
      )}

      {timerDone && (
        <div className="mb-6">
          <textarea
            value={answerText}
            onChange={e => handleTextChange(e.target.value)}
            placeholder="Scrivi la tua risposta sincera... (minimo 50 caratteri)"
            rows={5}
            className="w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className={`mt-1 text-xs ${textValid ? 'text-primary' : 'text-muted-foreground'}`}>
            {answerText.trim().length}/{MIN_CHARS} caratteri minimi
          </p>
        </div>
      )}

      {timerDone && textValid && (
        <PhaseBButtons
          selected={selectedButton?.category ?? null}
          onSelect={setSelectedButton}
        />
      )}

      {timerDone && selectedButton && textValid && (
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
```

- [ ] **Step 2: Verifica TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Build**

```bash
npm run build
```

- [ ] **Step 4: Test manuale Fase A**
  - Utente con `questions_read_count < 9` → vede domanda + area note, NO campo risposta, NO bottoni
  - Rimane sulla pagina 15s → `read_completed = true` nella tabella `question_deliveries`
  - Scrive nelle note → salvataggio dopo 1s in `phase_a_notes`

- [ ] **Step 5: Test manuale Fase B**
  - Utente con `questions_read_count >= 9` → vede timer 60s visibile
  - Dopo 60s → appare campo risposta
  - Parola vietata nel testo → errore specifico
  - Testo valido → appaiono 4 bottoni in ordine casuale con label casuale
  - Click bottone + submit → dati salvati in `question_answers` con `phase_a_notes_snapshot`

- [ ] **Step 6: Commit**

```bash
git add src/pages/QuestionPage.tsx src/components/question/
git commit -m "feat(question): rewrite QuestionPage with Phase A notes and Phase B timer/buttons"
```

---

## Task 13: check-reminders — Chain logic + filtraggio per category

**Files:**
- Modify: `supabase/functions/check-reminders/index.ts`

- [ ] **Step 1: Aggiungi la chain check e il filtraggio domande**

Sostituisci **tutto** il contenuto di `supabase/functions/check-reminders/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateRandomTimes(start: string, end: string, count: number): string[] {
  const [startH] = start.split(':').map(Number);
  const [endH] = end.split(':').map(Number);
  const startMinutes = startH * 60;
  const endMinutes = endH * 60;

  if (endMinutes <= startMinutes) return [];

  const times: Set<string> = new Set();
  let attempts = 0;

  while (times.size < count && attempts < 200) {
    const randomMin = startMinutes + Math.floor(Math.random() * (endMinutes - startMinutes));
    const h = Math.floor(randomMin / 60);
    const m = randomMin % 60;
    times.add(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    attempts++;
  }

  return [...times].sort();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const now = new Date();
    const romeFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
    });
    const romeDate = romeFormatter.format(now);
    const romeTime = now.toLocaleTimeString('it-IT', {
      timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hour12: false,
    });

    console.log(`[check-reminders] ${romeTime} on ${romeDate}`);

    const { data: allProgress, error: progressError } = await supabase
      .from('question_progress')
      .select('*')
      .eq('onboarding_completed', true);

    if (progressError) throw progressError;
    if (!allProgress?.length) {
      return new Response(JSON.stringify({ checked: romeTime, users: 0, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalSent = 0;

    for (const progress of allProgress) {
      const userId = progress.user_id;

      // --- CHAIN CHECK: controlla se l'ultima delivery è stata letta ---
      // NOTA: per utenti nuovi (nessuna delivery precedente), lastDelivery è null
      // e la condizione è false → l'utente viene correttamente incluso nell'invio.
      const { data: lastDelivery } = await supabase
        .from('question_deliveries')
        .select('id, read_completed')
        .eq('user_id', userId)
        .order('delivered_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastDelivery && !lastDelivery.read_completed) {
        // Marca come chain_blocked e salta questo utente
        await supabase
          .from('question_deliveries')
          .update({ chain_blocked: true })
          .eq('id', lastDelivery.id);
        console.log(`[chain-blocked] user ${userId} — last delivery not read`);
        continue;
      }

      // --- DAILY TIMES ---
      let dailyTimes: string[] = progress.daily_times || [];
      if (progress.daily_times_date !== romeDate) {
        dailyTimes = generateRandomTimes(
          progress.notification_window_start || '08:00',
          progress.notification_window_end || '22:00',
          6
        );
        await supabase
          .from('question_progress')
          .update({ daily_times: dailyTimes, daily_times_date: romeDate })
          .eq('id', progress.id);
        console.log(`[times] user ${userId}: ${dailyTimes.join(', ')}`);
      }

      if (!dailyTimes.includes(romeTime)) continue;

      let qIndex = progress.current_question_index;
      if (progress.answered) {
        qIndex = qIndex + 1;
        await supabase.from('question_progress').update({
          current_question_index: qIndex,
          answered: false, answer_text: null, answer_button: null, answered_at: null,
          phase: 'incubation', questions_read_count: 0,
        }).eq('id', progress.id);
      }

      // --- CARICA DOMANDA: AI-generated prima, poi static per category ---
      let questionText: string | null = null;

      const { data: aiQuestions } = await supabase
        .from('phrases')
        .select('text')
        .eq('type', 'domanda')
        .eq('source', 'ai_generated')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (aiQuestions && aiQuestions.length >= qIndex) {
        questionText = aiQuestions[qIndex - 1]?.text ?? null;
      }

      if (!questionText) {
        const category = progress.category || 'dimagrimento';
        const { data: staticQ } = await supabase
          .from('phrases')
          .select('text')
          .eq('type', 'domanda')
          .eq('source', 'static')
          .eq('category', category)
          .order('created_at', { ascending: true });

        if (!staticQ?.length) {
          console.error(`[no-questions] user ${userId} category ${category}`);
          continue;
        }

        if (qIndex > staticQ.length) {
          console.log(`[all-done] user ${userId}`);
          continue;
        }

        questionText = staticQ[qIndex - 1].text;
      }

      // --- CREA DELIVERY E INVIA NOTIFICA ---
      const { error: deliveryError } = await supabase
        .from('question_deliveries')
        .insert({
          user_id: userId,
          question_index: qIndex,
          delivered_at: now.toISOString(),
        });

      if (deliveryError) {
        console.error(`[delivery-error] user ${userId}:`, deliveryError.message);
        continue;
      }

      const sendUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`;
      const resp = await fetch(sendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          user_ids: [userId],
          title: `🔥 Domanda ${qIndex}/21`,
          body: questionText,
          data: { url: '/question', questionIndex: qIndex },
        }),
      });

      const result = await resp.json();
      totalSent += result.sent || 0;
      console.log(`[sent] user ${userId} q${qIndex}: ${JSON.stringify(result)}`);
    }

    return new Response(JSON.stringify({ checked: romeTime, date: romeDate, users: allProgress.length, sent: totalSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[check-reminders] error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Step 2: Deploy dell'edge function**

```bash
npx supabase functions deploy check-reminders
```

- [ ] **Step 3: Verifica nel dashboard Supabase**
  - Vai a Edge Functions → check-reminders → Logs
  - Chiama manualmente: Functions → check-reminders → Invoke
  - Atteso: risposta JSON con `checked`, `users`, `sent`
  - Con una delivery non letta: log `[chain-blocked]` per quell'utente

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/check-reminders/index.ts
git commit -m "feat(notifications): add chain-blocking logic and category-filtered question selection"
```

---

## Task 14: generate-next-questions — Nuova edge function Claude API

**Files:**
- Create: `supabase/functions/generate-next-questions/index.ts`

> **Prerequisito:** aggiungere `ANTHROPIC_API_KEY` ai Supabase Secrets prima del deploy.
> Dashboard → Settings → Edge Functions → Secrets → Add `ANTHROPIC_API_KEY`

- [ ] **Step 1: Crea la directory e il file**

```typescript
// supabase/functions/generate-next-questions/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 500;

interface RequestBody {
  user_id: string;
  category: string;
  current_answer: { text: string; button: string };
  phase_a_notes: string[];
  previous_answers?: { text: string; button: string }[];
}

function buildPrompt(body: RequestBody): string {
  const notes = body.phase_a_notes.filter(n => n.trim()).join('\n');
  const prevAnswers = (body.previous_answers || [])
    .map((a, i) => `Risposta precedente ${i + 1}: "${a.text}" (bottone: ${a.button})`)
    .join('\n');

  return [
    notes ? `Appunti della fase di osservazione:\n${notes}` : '',
    `Risposta ufficiale: "${body.current_answer.text}"`,
    `Stato emotivo scelto: ${body.current_answer.button}`,
    prevAnswers ? `\nRisposte precedenti per contesto:\n${prevAnswers}` : '',
  ].filter(Boolean).join('\n\n');
}

function validateQuestions(parsed: unknown): string[] | null {
  if (!Array.isArray(parsed)) return null;
  if (parsed.length !== 3) return null;
  const validated = parsed.filter(
    (q): q is string => typeof q === 'string' && q.trim().length >= 20 && q.trim().length <= 300
  );
  if (validated.length !== 3) return null;
  return validated;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { user_id, category } = body;

    if (!user_id || !category) {
      return new Response(JSON.stringify({ error: 'user_id and category required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      console.error('[generate-next-questions] ANTHROPIC_API_KEY not set');
      return fallbackToStatic(supabase, user_id, category, corsHeaders);
    }

    const userContent = buildPrompt(body);
    const systemPrompt = `Sei un analista psicologico brutalmente onesto. Analizza le note e la risposta dell'utente. Trova le contraddizioni, le giustificazioni e le parole di fuga. Genera esattamente 3 domande che mettono l'utente di fronte alle sue stesse parole. Tono: diretto, senza pietà, senza giudizio morale. Percorso: ${category}. Rispondi SOLO con un JSON array di 3 stringhe: ["domanda1", "domanda2", "domanda3"] — nessun testo aggiuntivo fuori dal JSON.`;

    const anthropicResp = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!anthropicResp.ok) {
      const errText = await anthropicResp.text();
      console.error('[claude-error]', errText);
      return fallbackToStatic(supabase, user_id, category, corsHeaders);
    }

    const claude = await anthropicResp.json();
    const rawText = claude.content?.[0]?.text ?? '';
    console.log('[claude-raw]', rawText);

    let questions: string[] | null = null;

    try {
      // Claude potrebbe avvolgere il JSON in markdown code blocks
      const cleaned = rawText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      questions = validateQuestions(parsed);
    } catch {
      console.error('[parse-error] failed to parse Claude output');
    }

    if (!questions) {
      console.log('[fallback] Claude output invalid, using static questions');
      return fallbackToStatic(supabase, user_id, category, corsHeaders);
    }

    // Salva le 3 domande in phrases con service role (bypassa RLS admin-only)
    const rows = questions.map(text => ({
      text,
      type: 'domanda',
      category,
      source: 'ai_generated',
      user_id,
    }));

    const { error: insertError } = await supabase.from('phrases').insert(rows);

    if (insertError) {
      console.error('[insert-error]', insertError.message);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[success] Generated 3 questions for user ${user_id} (${category})`);

    return new Response(JSON.stringify({ generated: 3, questions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[generate-next-questions] error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fallbackToStatic(
  supabase: ReturnType<typeof createClient>,
  user_id: string,
  category: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  console.log(`[fallback-static] using static questions for ${user_id} category ${category}`);
  return new Response(JSON.stringify({ fallback: true, category }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

- [ ] **Step 2: Aggiungi ANTHROPIC_API_KEY ai Supabase Secrets**

```
Dashboard Supabase → Settings → Edge Functions → Add new secret:
Name: ANTHROPIC_API_KEY
Value: sk-ant-... (la tua chiave API Anthropic)
```

- [ ] **Step 3: Deploy**

```bash
npx supabase functions deploy generate-next-questions
```

- [ ] **Step 4: Test manuale**

Invoca dalla Dashboard Edge Functions con body:
```json
{
  "user_id": "<tuo user_id>",
  "category": "dimagrimento",
  "current_answer": { "text": "Non riesco a smettere di mangiare di notte perché sono stressato dal lavoro", "button": "blocco" },
  "phase_a_notes": ["Ho pensato che forse dipende dall'infanzia ma non ne sono sicuro"]
}
```

Atteso: risposta con `generated: 3` e array di domande. Controlla `phrases` nel DB: 3 nuove righe con `source = 'ai_generated'` e `user_id` corrispondente.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/generate-next-questions/
git commit -m "feat(ai): add generate-next-questions edge function with Claude API and fallback"
```

---

## Task 15: send-push-notification — Logging migliorato

**Files:**
- Modify: `supabase/functions/send-push-notification/index.ts`

- [ ] **Step 1: Sostituisci la parte superiore del file con logging**

Il file è lungo (317 righe). Modifica SOLO le righe 20–91 (la funzione `serve` principale). Le funzioni crittografiche (righe 93–316) vanno lasciate **invariate**. Sostituisci solo il blocco `serve(async (req) => { ... })`:

```typescript
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { user_ids, title, body, data } = await req.json();

    console.log(`[send-push] Request: ${user_ids?.length} users, title="${title}", body_length=${body?.length}`);

    if (!user_ids?.length || !title || !body) {
      return new Response(JSON.stringify({ error: 'Missing required fields: user_ids, title, body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', user_ids);

    if (error) throw error;

    console.log(`[send-push] Found ${subscriptions?.length ?? 0} subscriptions for ${user_ids.length} users`);

    if (!subscriptions?.length) {
      return new Response(JSON.stringify({ sent: 0, results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@vallo.app';

    const payload = JSON.stringify({ title, body, data: data || {} });
    const results: Array<{ endpoint: string; status: string; statusCode?: number }> = [];
    const expiredIds: string[] = [];

    for (const sub of subscriptions) {
      const endpointShort = sub.endpoint.slice(0, 50) + '...';
      console.log(`[send-push] Sending to endpoint: ${endpointShort}`);

      try {
        const response = await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload,
          { privateKey: vapidPrivateKey, publicKey: vapidPublicKey, subject: vapidSubject }
        );

        console.log(`[send-push] Response status: ${response.status} for ${endpointShort}`);

        if (response.status === 410 || response.status === 404) {
          expiredIds.push(sub.id);
          results.push({ endpoint: sub.endpoint, status: 'expired', statusCode: response.status });
          console.log(`[send-push] Subscription expired (${response.status}), removing: ${endpointShort}`);
        } else if (response.ok) {
          results.push({ endpoint: sub.endpoint, status: 'sent', statusCode: response.status });
        } else {
          const errBody = await response.text().catch(() => '');
          console.error(`[send-push] Failed ${response.status} for ${endpointShort}: ${errBody}`);
          results.push({ endpoint: sub.endpoint, status: 'failed', statusCode: response.status });
        }
      } catch (err) {
        console.error(`[send-push] Exception for ${endpointShort}:`, err);
        results.push({ endpoint: sub.endpoint, status: 'error' });
      }
    }

    if (expiredIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', expiredIds);
      console.log(`[send-push] Removed ${expiredIds.length} expired subscriptions`);
    }

    const sentCount = results.filter(r => r.status === 'sent').length;
    console.log(`[send-push] Done: ${sentCount}/${subscriptions.length} sent`);

    return new Response(JSON.stringify({
      sent: sentCount,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[send-push] Unhandled error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

**Lascia invariate** tutte le funzioni dopo la riga 92: `base64urlToUint8Array`, `uint8ArrayToBase64url`, `generateVapidAuthHeader`, `derToRaw`, `sendWebPush`, `encryptPayload`.

- [ ] **Step 2: Deploy**

```bash
npx supabase functions deploy send-push-notification
```

- [ ] **Step 3: Verifica**

Invoca `check-reminders` manualmente → guarda i log di `send-push-notification` in Dashboard → Edge Functions → Logs. Atteso: righe `[send-push] Request`, `[send-push] Found`, `[send-push] Response status`.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/send-push-notification/index.ts
git commit -m "fix(notifications): add detailed logging to send-push-notification for debugging"
```

---

## Task 16: Verifica finale end-to-end

- [ ] **Step 1: Build production**

```bash
npm run build
```

Atteso: nessun errore TypeScript, bundle generato.

- [ ] **Step 2: Test flusso completo**

1. **Nuovo utente** → signup → `/onboarding` → completa tutti i 5 passi → `/home`
2. **Verifica DB**: `user_checkins` ha la riga, `question_progress` ha `onboarding_completed=true`, `category` settato
3. **Trigger manuale** `check-reminders` → verifica che crei una `question_deliveries` row
4. **Apertura** `/question` → Fase A: domanda + note, NO bottoni
5. **Rimani 15s** → delivery marcata `read_completed=true` nel DB
6. **Dopo 9 reads** → Fase B: timer 60s visibile → campo risposta → bottoni shufflati
7. **Risposta valida** → submit → `question_answers` row con `phase_a_notes_snapshot` → `generate-next-questions` chiamata
8. **Verifica DB**: `phrases` ha 3 nuove righe `ai_generated` per quell'utente

- [ ] **Step 3: Verifica chain blocking**

1. Lascia una delivery con `read_completed=false`
2. Chiama `check-reminders` manualmente
3. Atteso: log `[chain-blocked]` per quell'utente, nessuna nuova delivery creata

- [ ] **Step 4: Commit finale**

```bash
git add -A
git commit -m "feat: complete system revision — onboarding, question flow, chain notifications, AI questions"
```
