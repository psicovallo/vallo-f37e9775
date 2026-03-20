# Revisione Totale Sistema — Design Spec
**Data:** 2026-03-20
**Stack:** React + TypeScript + Vite + Supabase + Claude API (Anthropic)
**Stato:** In Revisione

---

## 0. Nota Implementativa

`OnboardingPage.tsx` va **riscritto completamente** — il file esistente con 3 passi va eliminato e sostituito con il nuovo flusso a 5 passi descritto nella Sezione 1.

`QuestionPage.tsx` va **riscritto completamente** — tutta la logica esistente di fase A/B, timer e bottoni va sostituita con il nuovo flusso descritto nella Sezione 3.

Il routing in `App.tsx` deve:
1. Aggiungere la route `/onboarding` → `<OnboardingPage />`
2. Includere un guard: se l'utente non è autenticato o ha `onboarding_completed = false`, viene rediretto a `/onboarding`
3. Rimuovere o tenere `ContractPage` solo come route separata se ancora necessaria

La creazione di `question_progress` avviene SOLO al completamento dell'onboarding (Passo 5), non come fallback in `QuestionPage.tsx`.

---

## 1. Onboarding (Riscritto Completamente)

### Flusso in 5 passi

**Passo 1 — "Il Patto"**

Schermata con testo fisso. Nessun campo. Un solo bottone di avanzamento.

Titolo (grande, grassetto): `Il Nostro Patto.`

Testo:
> Benvenuto. Questa non è la solita app per farti sentire bravo. Qui non ci sono premi, non ci sono scorciatoie e non ci sono pulsanti verdi per darti una finta gratificazione.
>
> Se vuoi usare questo sistema, devi accettare le nostre regole:
>
> **1. Il tempo è tuo alleato (e il tuo peggior nemico):** Riceverai 3 domande al giorno, in orari casuali. All'inizio non potrai rispondere. Dovrai solo leggerle. Avrai uno spazio per prendere appunti privati, ma la risposta ufficiale sarà bloccata per giorni. La verità ha bisogno di tempo per emergere, non puoi liquidarla in 10 secondi.
>
> **2. Niente risposte di pancia:** Quando il sistema sbloccherà la risposta, sarai costretto a fissare lo schermo per 60 secondi prima di poter scrivere. Respira e spegni l'istinto di difesa.
>
> **3. Zero scuse:** La tua risposta ufficiale dovrà essere lunga. Se usi parole come "domani", "spero", "ma", "difficile" o "colpa", il sistema ti bloccherà. Vogliamo un'analisi onesta, non le solite giustificazioni.
>
> **4. Tutto quello che scrivi ha un peso:** I tuoi appunti e le tue risposte diventeranno la base delle domande di domani. Il sistema impara da te e ti metterà di fronte alle tue stesse contraddizioni.
>
> Non esiste una risposta sbagliata, esiste solo la risposta onesta.

Bottone: `HO CAPITO. ACCETTO IL PATTO.`

---

**Passo 2 — Scelta Percorso**

3 card selezionabili (una sola alla volta):
- Dimagrimento
- Relazioni
- Lavoro

Percorso salvato localmente nello stato del componente; persistito in `question_progress.category` al Passo 5.

---

**Passo 3 — Check-in Iniziale**

Campo testo: *"Perché sei qui oggi?"* (min 20 caratteri).
Salvato in tabella `user_checkins` (`user_id`, `text`, `created_at`).

---

**Passo 4 — Finestra Oraria**

Selezione ora inizio e ora fine per le notifiche giornaliere (range: 07:00–22:00).
Savedato localmente nello stato; persistito in `question_progress` al Passo 5.

---

**Passo 5 — Attivazione Notifiche (MANUALE)**

Nessun popup automatico all'apertura. Schermata con testo motivazionale e un unico bottone grande:

`[ATTIVA LE TUE RIFLESSIONI]`

Solo al click:
1. Parte `Notification.requestPermission()`
2. Se permesso concesso: salva subscription in `push_subscriptions`
3. Crea record `question_progress` con tutti i campi raccolti nei passi precedenti:
   - `onboarding_completed: true`
   - `phase: 'incubation'`
   - `current_question_index: 1`
   - `questions_read_count: 0`
   - `category`: valore dal Passo 2
   - `notification_window_start/end`: valori dal Passo 4

---

## 2. Motore Notifiche e Logica a Catena

### Frequenza
- 6 slot random al giorno nella finestra oraria scelta dall'utente
- 3 domande per giornata — ogni domanda inviata 2 volte (slot alternati)

### Logica a Catena (modifica `check-reminders` edge function)

Prima di inviare notifica N+1, l'edge function verifica in `question_deliveries`:

```sql
SELECT read_completed FROM question_deliveries
WHERE user_id = $user_id
ORDER BY delivered_at DESC
LIMIT 1
```

- Se `read_completed = false` → non invia N+1, imposta `chain_blocked = true` sul record N
- Se `read_completed = true` → procede normalmente

Il campo `read_completed` viene impostato a `true` dalla pagina domanda tramite una chiamata API (PATCH su `question_deliveries`) solo se l'utente rimane ≥ 15 secondi (timer invisibile lato client).

### Problema notifiche non funzionanti
1. **Prima azione:** fix Service Worker + logging dettagliato in `send-push-notification`
2. **Piano B (noto rischio):** migrazione a FCM se il fix non risolve. Decisione rinviata a post-deploy con testing.

---

## 3. Pagina Domanda — Layout a 2 Fasi

### Routing Guard
Se `question_progress.onboarding_completed = false` o il record non esiste → redirect a `/onboarding`.

### Fase A — Incubazione

**Condizione:** `questions_read_count < 9` (REQUIRED_READS = 9)

**Layout:**
- Mostra la domanda
- Timer **invisibile** (nessun contatore visibile, nessuna icona). Dopo 15 secondi di permanenza sulla pagina, viene eseguita una chiamata API silenziosa per impostare `read_completed = true` e incrementare `questions_read_count`. Se l'utente chiude prima → `read_completed` rimane `false`.
- Campo **"I tuoi appunti privati"** — textarea libera sotto la domanda
  - Salvataggio real-time via upsert (debounce 1s) in `phase_a_notes` su `(user_id, question_index)`
  - Il campo `note_text` viene **sovrascritto** ad ogni salvataggio (non si accumula una lista — è un unico testo per sessione di domanda)
- **NO** campo risposta ufficiale
- **NO** bottoni di invio
- Messaggio: *"Non puoi ancora rispondere alla domanda finale. Usa questo spazio per prendere appunti. Sputa fuori quello che pensi. Il sistema si sbloccherà tra [X] ore."*
  - Formula per `[X]`: `ceil((9 - questions_read_count) / 3) * 24` — stima basata su 3 letture/giorno (6 slot, 3 domande diverse × 2)

### Fase B — Risposta

**Condizione:** `questions_read_count >= 9`

**Layout sequenziale:**

1. **Timer visibile 60s** — appare immediatamente all'apertura. Campo risposta bloccato con opacity ridotta.
2. **Campo risposta ufficiale** — sblocco automatico allo scadere dei 60s
   - Minimo 50 caratteri
   - Lista parole vietate (fonte di verità): `domani`, `spero`, `difficile`, `stress`, `festa`, `poco`, `colpa`, `ma `
   - Metodo di controllo: **case-insensitive**, **substring match** sull'input normalizzato (trim + lowercase). Eccezione: `ma ` richiede uno spazio dopo per evitare falsi positivi su parole come "mangiare", "maledetto". Verificare anche `ma,` e `ma.` come varianti.
   - Messaggio di errore specifico se parola vietata rilevata: *"La parola '[X]' è una scusa. Riformula."*
3. **4 Bottoni** — appaiono SOLO dopo validazione superata
   - Ordine **casuale** ad ogni caricamento pagina (Fisher-Yates shuffle)
   - Testo **casuale** per categoria (pescato al caricamento, non al click):
     - **Presa di coscienza:** "Ammetto la menzogna" / "Smetto di mentire" / "Accetto la realtà"
     - **Blocco/Confusione:** "Non so rispondere" / "Mi sento bloccato" / "Non voglio vedere"
     - **Riflessione:** "Ho bisogno di tempo" / "Voglio riflettere" / "Il silenzio mi serve"
     - **Resistenza:** "Mi fa rabbia" / "Mi sento aggredito" / "Non sono d'accordo"
   - Messaggio sopra i bottoni: *"In base a quello che hai scritto, scegli uno di questi bottoni. Non ti preoccupare, pensa e scegline uno per proseguire. Va tutto bene."*
4. **Al click bottone:**
   - Salva in `question_answers`:
     - `answer_text`: testo risposta
     - `answer_button`: categoria del bottone (es. `presa_di_coscienza`)
     - `phase_a_notes_snapshot`: array JSON delle ultime note Fase A (struttura: `["testo nota corrente"]` — può essere array con un solo elemento o vuoto se nessuna nota)
   - Chiama edge function `generate-next-questions` in **modalità fire-and-forget** (nessuna attesa lato client)
   - Avanza `current_question_index`, reset `phase` a `incubation`, reset `questions_read_count` a 0
   - Mostra schermata di completamento

---

## 4. Generazione Domande Dinamiche (Claude API)

### Modalità: Asincrona (fire-and-forget)

La chiamata viene avviata dal client dopo il click bottone ma **non blocca l'UI**. L'edge function si esegue in background. Le domande generate vengono salvate nel DB prima che `check-reminders` le invii il giorno successivo (finestra di esecuzione: dalla risposta fino al giorno dopo).

**Fallback temporizzato:** se al momento dell'esecuzione di `check-reminders` non esistono domande AI generate per l'utente corrente (`phrases` con `source = 'ai_generated'` e `user_id` corrispondente), usa le domande statiche del percorso.

### Edge Function: `generate-next-questions`

**Variabile d'ambiente richiesta:** `ANTHROPIC_API_KEY` (da aggiungere ai Supabase Secrets)

**Modello Claude:** `claude-sonnet-4-6` (ID: `claude-sonnet-4-6`)

**Max tokens output:** 500 (sufficiente per 3 domande brevi)

**Input:**
```json
{
  "user_id": "...",
  "category": "dimagrimento | relazioni | lavoro",
  "current_answer": { "text": "...", "button": "presa_di_coscienza | blocco | riflessione | resistenza" },
  "phase_a_notes": ["testo degli appunti fase A oppure stringa vuota"],
  "previous_answers": [
    { "text": "...", "button": "..." }
  ]
}
```

**System prompt a Claude:**
```
Sei un analista psicologico brutalmente onesto. Analizza le note e la risposta dell'utente.
Trova le contraddizioni, le giustificazioni e le parole di fuga.
Genera esattamente 3 domande che mettono l'utente di fronte alle sue stesse parole.
Tono: diretto, senza pietà, senza giudizio morale.
Percorso: [categoria].
Rispondi SOLO con un JSON array di 3 stringhe: ["domanda1", "domanda2", "domanda3"]
Nessun testo aggiuntivo fuori dal JSON.
```

**Validazione output:**
- Parsa il JSON; se fallisce → fallback a domande statiche
- Verifica che sia un array di esattamente 3 stringhe; se no → fallback
- Verifica che ogni stringa sia tra 20 e 300 caratteri; altrimenti tronca/scarta e fallback

**Salvataggio:** 3 INSERT in `phrases`:
```sql
INSERT INTO phrases (text, type, category, source, user_id)
VALUES ($question, 'domanda', $category, 'ai_generated', $user_id)
```

**RLS:** la INSERT viene eseguita tramite il service role client (già usato nelle altre edge functions), bypassando la policy admin-only per gli utenti normali.

---

## 5. Database

### Tabelle Nuove

**`user_checkins`**
```sql
CREATE TABLE user_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkins"
  ON user_checkins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkins"
  ON user_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**`phase_a_notes`**
```sql
CREATE TABLE phase_a_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  note_text TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, question_index)
);

ALTER TABLE phase_a_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes"
  ON phase_a_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own notes"
  ON phase_a_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
  ON phase_a_notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-aggiorna updated_at ad ogni modifica
CREATE TRIGGER update_phase_a_notes_updated_at
  BEFORE UPDATE ON phase_a_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

> **Nota:** nessuna policy UPDATE su `user_checkins` — è intenzionale. Il check-in iniziale è immutabile.

### Tabelle Modificate

**`question_progress`** — aggiungere:
```sql
ALTER TABLE question_progress
  ADD COLUMN category TEXT CHECK (category IN ('dimagrimento', 'relazioni', 'lavoro'));
```

**`phrases`** — aggiungere:
```sql
ALTER TABLE phrases
  ADD COLUMN source TEXT NOT NULL DEFAULT 'static' CHECK (source IN ('static', 'ai_generated')),
  ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Permette al service role di inserire domande AI
CREATE POLICY "Service role can insert phrases"
  ON phrases FOR INSERT
  TO service_role
  WITH CHECK (true);
```

**`question_answers`** — aggiungere:
```sql
ALTER TABLE question_answers
  ADD COLUMN phase_a_notes_snapshot JSONB;
-- Struttura: ["testo appunti"] — array JSON con 0 o 1 elementi
-- answer_button già esistente (definito in migration 20260317214231)
```

**`question_deliveries`** — aggiungere:
```sql
ALTER TABLE question_deliveries
  ADD COLUMN opened_at TIMESTAMPTZ,
  ADD COLUMN chain_blocked BOOLEAN NOT NULL DEFAULT false;
```

---

## 6. Architettura dei Componenti (React)

### Componenti riscritti
- `OnboardingPage.tsx` — **RISCRITTO** con 5 passi (vedi Sezione 1)
- `QuestionPage.tsx` — **RISCRITTO** con logica Fase A / Fase B (vedi Sezione 3)

### Nuovi componenti
- `OnboardingPatto.tsx` — step 1 testo fisso
- `OnboardingPercorso.tsx` — step 2 selezione percorso (3 card)
- `OnboardingCheckin.tsx` — step 3 campo testo
- `OnboardingFinestraOraria.tsx` — step 4 selezione orario (estratto dall'esistente)
- `OnboardingAttivazione.tsx` — step 5 bottone [ATTIVA]
- `PhaseANotes.tsx` — textarea con debounce + upsert real-time
- `PhaseBTimer.tsx` — timer visibile 60s con progress bar
- `PhaseBButtons.tsx` — 4 bottoni con Fisher-Yates shuffle + testo casuale per categoria

### Edge Functions (Supabase) — modificate/nuove
- `check-reminders/index.ts` — **MODIFICATA**: aggiunge query di controllo catena prima di ogni invio
- `generate-next-questions/index.ts` — **NUOVA**: chiama Claude API, valida output, salva in `phrases`
- `send-push-notification/index.ts` — **MODIFICATA**: aggiunge logging dettagliato per debug

### Variabili d'ambiente da aggiungere
- `ANTHROPIC_API_KEY` → Supabase Project Secrets

---

## 7. Flusso Dati Completo

```
Signup → OnboardingPage (5 passi)
  Passo 1: Accetta Il Patto
  Passo 2: Sceglie Percorso (category)
  Passo 3: Check-in → user_checkins
  Passo 4: Finestra oraria
  Passo 5: [ATTIVA LE TUE RIFLESSIONI]
    → push_subscriptions insert
    → question_progress insert (onboarding_completed=true, category, phase=incubation)

check-reminders (6x/giorno, Rome TZ)
  └─ Per ogni utente con onboarding_completed=true:
      ├─ Query: ultimo question_deliveries → read_completed?
      │   ├─ No → skip, chain_blocked=true
      │   └─ Sì → continua
      ├─ Determina domanda attuale (category + ai_generated prioritario)
      └─ send-push-notification → question_deliveries insert

User apre notifica → /question (routing guard: onboarding_completed?)
  ├─ Fase A (read_count < 9)
  │   ├─ Timer invisibile 15s → se ≥15s: read_completed=true, read_count++
  │   └─ Textarea appunti → phase_a_notes upsert (real-time, debounce 1s)
  └─ Fase B (read_count >= 9)
      ├─ Timer visibile 60s → sblocca campo
      ├─ Validazione: 50 char + parole vietate
      ├─ 4 bottoni shufflati con testo casuale
      └─ Click bottone
          ├─ question_answers insert (testo + bottone + snapshot note)
          ├─ question_progress update (next_index, reset phase+count)
          └─ generate-next-questions (fire-and-forget)
              ├─ Claude API → 3 domande personalizzate
              └─ phrases insert × 3 (ai_generated, user_id, category)
```
