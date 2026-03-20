# Piano: Sistema di Riflessione Psicologica — Revisione Completa

## Panoramica

Ristrutturazione completa dell'app Vallo secondo il documento MASTER. Il progetto si sposta su Supabase — serve colelgarlo

Il lavoro si divide in **3 fasi** implementative.

---

## FASE 1: Database e Onboarding

### 1.1 Migrazione Database

Nuove tabelle e modifiche:

- `**profiles**`: aggiungere colonna `objective` (text, nullable) e `milestone_zero` (text, nullable)
- `**question_assignments**` (nuova tabella): `id`, `user_id`, `question_text`, `view_count` (default 0, max 9), `status` (enum: `da_leggere`, `in_incubazione`, `risolta`), `phase_b_unlock_at` (timestamp nullable), `is_seed_question` (boolean default false), `created_at`
- `**question_notes**` (nuova tabella): `id`, `assignment_id` (FK → question_assignments), `user_id`, `text`, `created_at` — per appunti privati Fase A
- `**question_official_answers**` (nuova tabella): `id`, `assignment_id` (FK → question_assignments), `user_id`, `answer_text`, `button_clicked`, `created_at`
- Mantenere le tabelle esistenti (`question_progress`, `question_deliveries`, `question_answers`) per compatibilità, ma il nuovo flusso usa le nuove tabelle
- RLS: ogni utente vede/scrive solo i propri dati

### 1.2 Inserire le 9 Domande Seme

Inserire nel DB le 9 domande del "Carburante Iniziale" come frasi con flag `is_seed = true` o tipo dedicato.

### 1.3 Onboarding a 4 Step

Riscrivere `OnboardingPage.tsx` con 4 schermate:

1. **Il Patto** — Testo severo non bypassabile. Bottone: `[HO CAPITO. ACCETTO IL PATTO]`
2. **Scelta Obiettivo** — Selezione obiettivo (Dimagrimento per ora). Salva su `profiles.objective`
3. **Pietra Miliare 0** — Campo testo: "Perché sei qui oggi?". Salva su `profiles.milestone_zero`
4. **Attivazione Notifiche** — Fascia oraria + bottone `[ATTIVA LE TUE RIFLESSIONI]` → `Notification.requestPermission()`

---

## FASE 2: Question Page (Fase A + Fase B)

### 2.1 Fase A — Incubazione (9 cicli, max 2/giorno)

- Timer invisibile random **7-17 secondi** (non più fisso a 15)
- Testo: "Rileggi la domanda. Il tempo è necessario per la comprensione."
- Se chiude prima → "Non Letta", `view_count` non avanza, notifiche bloccate
- **Area Appunti**: dopo il timer, appare textarea "I tuoi appunti privati" con salvataggio realtime/onBlur su `question_notes`
- Messaggio: "Il sistema di risposta ufficiale è bloccato. La risposta finale si sbloccherà tra [X] ore."
- Max 2 visualizzazioni contate al giorno per domanda

### 2.2 Fase B — Risposta (sblocco imprevedibile)

- Trigger random tra visualizzazione 1 e 8; obbligatorio alla 9a
- Timer 60s visibile con input disabilitato
- Dopo 60s: textarea sbloccata, minimo 50 caratteri, contatore visibile `12/50`
- Filtro parole vietate esteso: `domani, spero, difficile, stress, festa, poco, colpa, ma, proverò, forse` → alert rosso "Stai usando scuse. Riscrivi." + invio bloccato
- 4 bottoni con **posizione randomizzata** e **testo pescato a caso** da un pool (es. "Ammetto la menzogna", "Mi sento bloccato", etc.)
- Salvataggio su `question_official_answers`
- Dopo la risposta, la domanda può riapparire per completare il ciclo delle 9 viste

### 2.3 Edge Function `check-reminders`

- Aggiornare per usare `question_assignments` invece di `question_progress`
- Rispettare vincolo max 2 visualizzazioni/giorno
- Logica a catena: blocco se precedente non letta

---

## FASE 3: Consiglio dei 12 Maestri (IA)

### 3.1 Edge Function `generate-questions`

- Dopo che l'utente ha completato le 9 domande seme, raccogliere tutti gli appunti e le risposte
- Inviare il materiale a un modello AI (Lovable AI — nessuna API key esterna necessaria) con un system prompt che impersona i 12 Maestri
- Il prompt include le personalità di ciascun maestro (Bandler, Ellis, Carr, Freud, Jung, Frankl, Erickson, Marcus Aurelius, Peterson, Skinner, Adler, Epitteto)
- L'AI genera 3 domande provvisorie
- Validazione interna (nel prompt): no monosillabi possibili, no scuse implicite, deve essere tagliente
- Output salvato in `question_assignments` come nuove domande assegnate

### 3.2 Trigger automatico

- Dopo la risposta alla 9a domanda seme, il sistema invoca `generate-questions` per creare le prime domande dinamiche
- Le domande generate vengono messe in coda per le notifiche future

---

## Dettagli Tecnici

```text
Flusso Utente:
Login → Onboarding (4 step) → 9 Domande Seme (Fase A only)
→ Accumulo Appunti → AI genera nuove domande → Ciclo continuo

Tabelle Principali:
profiles ──── objective, milestone_zero
question_assignments ──── view_count, status, is_seed_question
question_notes ──── appunti Fase A (FK → assignments)
question_official_answers ──── risposta Fase B (FK → assignments)

Edge Functions:
check-reminders ──── scheduling 6 notifiche/giorno
generate-questions ──── AI Council dei 12 Maestri
```

### File da modificare/creare:

- **Migrazione SQL**: nuove tabelle + colonne profiles
- `**OnboardingPage.tsx**`: riscrittura completa a 4 step
- `**QuestionPage.tsx**`: riscrittura con Fase A (timer random, appunti) + Fase B (sblocco random, bottoni randomizzati)
- `**check-reminders/index.ts**`: adattare a nuova struttura DB
- `**generate-questions/index.ts**` (nuovo): edge function per AI Council
- `**HomePage.tsx**`: aggiornare stato domanda attiva

---

## Note

- collegare Supabase separatamente — è la stessa infrastruttura.
- Per l'AI dei 12 Maestri si usa Lovable AI (modello `google/gemini-2.5-pro`) — nessuna API key aggiuntiva.
- L'implementazione sarà progressiva: prima DB + Onboarding, poi Question Page, infine AI.