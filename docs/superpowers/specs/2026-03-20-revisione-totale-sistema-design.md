# Revisione Totale Sistema — Design Spec
**Data:** 2026-03-20
**Stack:** React + TypeScript + Vite + Supabase + Claude API (Anthropic)
**Stato:** Approvato

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

Percorso salvato in `question_progress.category`.

---

**Passo 3 — Check-in Iniziale**

Campo testo: *"Perché sei qui oggi?"* (min 20 caratteri).
Salvato in tabella `user_checkins` (`user_id`, `text`, `created_at`).

---

**Passo 4 — Finestra Oraria**

Mantiene logica esistente: selezione ora inizio e ora fine per le notifiche.
Salvato in `question_progress.notification_window_start/end`.

---

**Passo 5 — Attivazione Notifiche (MANUALE)**

Nessun popup automatico. Schermata con testo motivazionale e un unico bottone grande:

`[ATTIVA LE TUE RIFLESSIONI]`

Solo al click parte `Notification.requestPermission()`.
Dopo permesso: salva subscription in `push_subscriptions`, crea record `question_progress` con `onboarding_completed: true`, `phase: 'incubation'`, `current_question_index: 1`.

---

## 2. Motore Notifiche e Logica a Catena

### Frequenza
- 6 slot random al giorno nella finestra oraria scelta dall'utente
- 3 domande per giornata — ogni domanda inviata 2 volte (alternate)

### Logica a Catena (modifica `check-reminders` edge function)

Prima di inviare notifica N+1, l'edge function verifica in `question_deliveries`:
- `read_completed = true` per la notifica N precedente

Se `read_completed = false` → non invia N+1, imposta `chain_blocked = true` sul record N.

Il campo `read_completed` viene impostato a `true` dalla pagina domanda solo se l'utente rimane ≥ 15 secondi (timer invisibile lato client, confermato via API call).

### Problema notifiche non funzionanti
1. **Prima azione:** fix Service Worker + logging dettagliato in `send-push-notification`
2. **Piano B (se necessario):** migrazione a FCM

---

## 3. Pagina Domanda — Layout a 2 Fasi

### Fase A — Incubazione

**Condizione:** `questions_read_count < 9` (REQUIRED_READS = 9)

**Layout:**
- Mostra la domanda
- Timer **invisibile** di 15 secondi
  - Se l'utente chiude prima dei 15s → `read_completed = false`, domanda resta "Non Letta"
  - Se rimane ≥ 15s → chiamata API per impostare `read_completed = true`, incrementa `questions_read_count`
- Campo **"I tuoi appunti privati"** — textarea libera sotto la domanda
  - Salvataggio real-time (debounce 1s) in `phase_a_notes`
- **NO** campo risposta ufficiale
- **NO** bottoni di invio
- Messaggio: *"Non puoi ancora rispondere alla domanda finale. Usa questo spazio per prendere appunti. Sputa fuori quello che pensi. Il sistema si sbloccherà tra [X] ore."*
  - `[X]` = ore rimanenti stimate in base alle notifiche mancanti

### Fase B — Risposta

**Condizione:** `questions_read_count >= 9`

**Layout sequenziale:**

1. **Timer visibile 60s** — appare immediatamente all'apertura. Campo risposta bloccato.
2. **Campo risposta ufficiale** — sblocco automatico allo scadere dei 60s
   - Minimo 50 caratteri
   - Filtro parole vietate: `domani`, `spero`, `difficile`, `stress`, `festa`, `poco`, `colpa`, `ma `
   - Messaggio di errore specifico se parola vietata rilevata
3. **4 Bottoni** — appaiono SOLO dopo validazione superata
   - Ordine **casuale** ad ogni caricamento pagina
   - Testo **casuale** per categoria:
     - **Presa di coscienza:** "Ammetto la menzogna" / "Smetto di mentire" / "Accetto la realtà"
     - **Blocco/Confusione:** "Non so rispondere" / "Mi sento bloccato" / "Non voglio vedere"
     - **Riflessione:** "Ho bisogno di tempo" / "Voglio riflettere" / "Il silenzio mi serve"
     - **Resistenza:** "Mi fa rabbia" / "Mi sento aggredito" / "Non sono d'accordo"
   - Messaggio sopra i bottoni: *"In base a quello che hai scritto, scegli uno di questi bottoni. Non ti preoccupare, pensa e scegline uno per proseguire. Va tutto bene."*
4. **Al click bottone:**
   - Salva in `question_answers`: `answer_text`, `answer_button` (categoria), `phase_a_notes_snapshot`
   - Chiama edge function `generate-next-questions`
   - Avanza `current_question_index`, reset `phase` a `incubation`, reset `questions_read_count`

---

## 4. Generazione Domande Dinamiche (Claude API)

### Edge Function: `generate-next-questions`

**Trigger:** chiamata POST dopo click bottone finale Fase B

**Input:**
```json
{
  "user_id": "...",
  "category": "dimagrimento | relazioni | lavoro",
  "current_answer": { "text": "...", "button": "..." },
  "phase_a_notes": ["nota1", "nota2", "..."],
  "previous_answers": [ /* ultime 3 risposte */ ]
}
```

**System prompt a Claude:**
> Sei un analista psicologico brutalmente onesto. Analizza le note e la risposta dell'utente. Trova le contraddizioni, le giustificazioni e le parole di fuga. Genera esattamente 3 domande che mettono l'utente di fronte alle sue stesse parole. Tono: diretto, senza pietà, senza giudizio morale. Percorso: [categoria].

**Output:** array di 3 stringhe (domande)

**Salvataggio:** insert in `phrases` con `source = 'ai_generated'`, `user_id` valorizzato, `category` corrispondente.

**Fallback:** se Claude API fallisce → usa domande statiche dal percorso (`phrases` dove `source = 'static'` e `category` = percorso utente).

---

## 5. Database

### Tabelle Nuove

**`user_checkins`**
| Campo | Tipo | Note |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → auth.users | |
| text | TEXT | risposta "Perché sei qui?" |
| created_at | TIMESTAMPTZ | |

**`phase_a_notes`**
| Campo | Tipo | Note |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → auth.users | |
| question_index | INTEGER | |
| note_text | TEXT | aggiornato real-time |
| updated_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

RLS: utente vede/modifica solo i propri record. Upsert per `(user_id, question_index)`.

### Tabelle Modificate

**`question_progress`** — aggiungere:
- `category` TEXT (enum check: `dimagrimento`, `relazioni`, `lavoro`)

**`phrases`** — aggiungere:
- `source` TEXT DEFAULT `'static'` (valori: `static`, `ai_generated`)
- `user_id` UUID nullable FK → auth.users (null per domande statiche)

**`question_answers`** — aggiungere:
- `phase_a_notes_snapshot` JSONB (snapshot delle note al momento della risposta)
- Verificare presenza `answer_button` (già esistente nel DB)

**`question_deliveries`** — aggiungere:
- `opened_at` TIMESTAMPTZ nullable
- `chain_blocked` BOOLEAN DEFAULT false

---

## 6. Architettura dei Componenti (React)

### Componenti modificati/riscritti
- `OnboardingPage.tsx` — riscritto con 5 passi
- `QuestionPage.tsx` — riscritto con logica Fase A / Fase B

### Nuovi componenti
- `OnboardingPatto.tsx` — step 1 testo fisso
- `OnboardingPercorso.tsx` — step 2 selezione percorso
- `OnboardingCheckin.tsx` — step 3 campo testo
- `OnboardingFinestraOraria.tsx` — step 4 (estratto dall'esistente)
- `OnboardingAttivazione.tsx` — step 5 con bottone [ATTIVA]
- `PhaseANotes.tsx` — textarea real-time con debounce
- `PhaseBTimer.tsx` — timer visibile 60s
- `PhaseBButtons.tsx` — 4 bottoni con shuffle + testo casuale

### Edge Functions (Supabase) — modificate/nuove
- `check-reminders/index.ts` — aggiunge controllo catena prima di ogni invio
- `generate-next-questions/index.ts` — **NUOVA** — chiama Claude API e salva domande
- `send-push-notification/index.ts` — aggiunge logging dettagliato

---

## 7. Flusso Dati Completo

```
Signup → OnboardingPage (5 passi) → question_progress creato
         ↓
check-reminders (6x/giorno)
  └─ Controlla catena: delivery N-1 read_completed?
       ├─ No → skip, chain_blocked=true
       └─ Sì → send-push-notification → question_deliveries insert
                                         ↓
User apre notifica → /question
  ├─ Fase A (read_count < 9)
  │   ├─ Timer 15s invisibile
  │   ├─ Textarea appunti → phase_a_notes (real-time)
  │   └─ ≥15s → read_completed=true, read_count++
  └─ Fase B (read_count >= 9)
      ├─ Timer 60s visibile
      ├─ Campo risposta (50 char + parole vietate)
      ├─ 4 bottoni shufflati con testo casuale
      └─ Click bottone
          ├─ Salva question_answers
          └─ generate-next-questions (Claude API)
              ├─ Analizza note + risposta
              ├─ Genera 3 domande personalizzate
              └─ Salva in phrases (ai_generated, user_id)
```
