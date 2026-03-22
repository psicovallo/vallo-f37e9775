# Piano: SOS Conflitti — Modulo di Decostruzione Relazionale

## Panoramica

Nuova sezione dell'app dedicata alla gestione strategica dei conflitti interpersonali. L'utente crea un "profilo bersaglio" (nome, relazione, descrizione, storico), poi convoca il Consiglio dei 15 Maestri che genera 3 domande letali con validazione tecnica.

---

## 1. Database — Nuove tabelle

### `conflict_profiles`

Schedario dei bersagli dell'utente:

- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `name` (text) — nome della persona
- `relationship` (text) — tipo relazione
- `profile_description` (text) — carattere/punti deboli
- `failure_history` (text) — conflitti passati
- `created_at`, `updated_at` (timestamptz)
- RLS: solo il proprio utente

### `conflict_questions`

Archivio delle domande generate e validate:

- `id` (uuid, PK)
- `conflict_profile_id` (uuid, FK → conflict_profiles)
- `user_id` (uuid, NOT NULL)
- `question_text` (text)
- `validation_text` (text) — spiegazione tecnica del Consiglio
- `status` (text: `generated`, `validated`, `adjusted`)
- `adjustment_notes` (text, nullable) — note di ricalibrazione
- `maestri_used` (text) — quali maestri hanno ispirato la domanda
- `created_at` (timestamptz)
- RLS: solo il proprio utente

## 2. Edge Function — `generate-conflict-questions`

Riceve: `conflict_profile_id`, `user_id`, `language` (default "italiano").

Logica:

1. Carica profilo bersaglio + storico domande precedenti per quel profilo
2. Crea Nuovo consiglio di 15 Mestri   
**I 15 MAESTRI DEL CONSIGLIO:**
  1. **Richard Bandler:** Hacking linguistico. Identifica dove l'altro mente a se stesso nella struttura della frase.
  2. **Albert Ellis:** Demolitore di convinzioni irrazionali. Colpisce i "devo" e le pretese assurde.
  3. **Allen Carr:** Dissolve l'illusione che il comportamento tossico (es. urlare) sia un piacere o un sollievo.
  4. **Sigmund Freud:** Analizza le proiezioni e i traumi infantili che il bersaglio scarica sull'utente.
  5. **Carl Jung:** Identifica l'Ombra. Costringe l'altro a vedere il mostro che sta proiettando all'esterno.
  6. **Viktor Frankl:** Il custode della responsabilità. Rende il "sintomo" (rabbia/colpa) inutile di fronte al senso.
  7. **Milton Erickson:** Crea confusione ipnotica per bypassare le difese razionali della controparte.
  8. **Paul Watzlawick:** Ristrutturazione della realtà (Reframing). Cambia le regole del gioco comunicativo.
  9. **Robert Cialdini:** Ingegneria della persuasione per spingere all'azione senza creare muri.
  10. **Dale Carnegie:** Manipolazione etica della comunicazione per disarmare l'ostilità.
  11. **Marcus Aurelius:** Logica stoica. Separa il comportamento del bersaglio dalla reazione dell'utente.
  12. **Jordan Peterson:** Ordine dal Caos. Esige autorità morale e controllo della parola.
  13. **Niccolò Machiavelli:** Analisi dei rapporti di forza e del potere reale nella relazione.
  14. **Socrate:** Maieutica distruttiva. Porta l'altro all'autocontraddizione logica tramite domande.
  15. **Friedrich Nietzsche:** Annientamento del risentimento e della morale vittimistica.
3. Prompt include: nome, relazione, descrizione, storico fallimenti, domande precedenti validate
4. Genera 3 domande con per ognuna: testo della domanda + validazione tecnica (il consiglio valida la domande e ne propone 3 all'utente con lo stesso scopo ma forma diversa)
5. Se ci sono domande precedenti validate, il prompt ricorda all'AI di cambiare strategia
6. Output JSON: `[{text, validation, maestri_used}]`

Usa Lovable AI (Gemini 2.5 Pro) — nessuna API key aggiuntiva.

## 3. Pagina `SOSConflittiPage.tsx`

### Vista principale con 3 tab:

1. **Profili** — Lista dei profili bersaglio salvati con possibilità di crearne di nuovi
2. **Sessione** — Pannello di elaborazione attivo (dopo aver selezionato un profilo)
3. **Archivio** — Storico domande validate per profilo

### Tab "Profili" — Schedario Bersaglio

- Form: Nome (input testo), Relazione (dropdown con le opzioni specificate + "Altro" con campo libero), Descrizione Profilo (textarea), Storico Fallimenti (textarea)
- Lista profili esistenti con possibilità di selezionare/modificare

### Tab "Sessione" — Pannello di Controllo Strategico

- Profilo selezionato visibile in alto
- Selettore Lingua (dropdown, default Italiano)
- Bottone **CONVOCA IL CONSIGLIO**
- Display della Trinità (3 domande):
  - Testo della domanda
  - "Validazione del Consiglio" — spiegazione tecnica collassabile
  - Bottone **[VALIDA]** — salva in archivio con status `validated`
  - Bottone **[AGGIUSTA]** — apre campo note per ricalibrazione, salva con status `adjusted`
- Disclaimer fisso in fondo: "Il Consiglio richiede tempo. Una domanda di decostruzione è un seme: lascialo marcire nella mente dell'altro prima di aspettarti il crollo."

### Tab "Archivio"

- Storico domande per profilo, ordinate per data
- Per ogni domanda: testo, validazione, maestri, eventuali note di aggiustamento

## 4. Integrazione nell'app

- `App.tsx`: rotta `/sos-conflitti`
- `BottomNav.tsx`: nuova tab "SOS" con icona `Swords` (lucide-react)
- `HomePage.tsx`: card "SOS Conflitti" con link

## 5. I 15 Maestri (creare nuovo conglio 15 maestri)

Aggiungere i 15 Maestri `MAESTRI_CONFLITTI`   
**I 15 MAESTRI DEL CONSIGLIO:**

1. **Richard Bandler:** Hacking linguistico. Identifica dove l'altro mente a se stesso nella struttura della frase.
2. **Albert Ellis:** Demolitore di convinzioni irrazionali. Colpisce i "devo" e le pretese assurde.
3. **Allen Carr:** Dissolve l'illusione che il comportamento tossico (es. urlare) sia un piacere o un sollievo.
4. **Sigmund Freud:** Analizza le proiezioni e i traumi infantili che il bersaglio scarica sull'utente.
5. **Carl Jung:** Identifica l'Ombra. Costringe l'altro a vedere il mostro che sta proiettando all'esterno.
6. **Viktor Frankl:** Il custode della responsabilità. Rende il "sintomo" (rabbia/colpa) inutile di fronte al senso.
7. **Milton Erickson:** Crea confusione ipnotica per bypassare le difese razionali della controparte.
8. **Paul Watzlawick:** Ristrutturazione della realtà (Reframing). Cambia le regole del gioco comunicativo.
9. **Robert Cialdini:** Ingegneria della persuasione per spingere all'azione senza creare muri.
10. **Dale Carnegie:** Manipolazione etica della comunicazione per disarmare l'ostilità.
11. **Marcus Aurelius:** Logica stoica. Separa il comportamento del bersaglio dalla reazione dell'utente.
12. **Jordan Peterson:** Ordine dal Caos. Esige autorità morale e controllo della parola.
13. **Niccolò Machiavelli:** Analisi dei rapporti di forza e del potere reale nella relazione.
14. **Socrate:** Maieutica distruttiva. Porta l'altro all'autocontraddizione logica tramite domande.
15. **Friedrich Nietzsche:** Annientamento del risentimento e della morale vittimistica.

---

## File da creare/modificare


| File                                                      | Azione                         |
| --------------------------------------------------------- | ------------------------------ |
| Migrazione SQL                                            | 2 nuove tabelle + RLS          |
| `supabase/functions/generate-conflict-questions/index.ts` | Nuova edge function            |
| `src/pages/SOSConflittiPage.tsx`                          | Nuova pagina completa          |
| `src/lib/consiglio-maestri-15.ts`                         | Nuova `MAESTRI_CONFLITTI` (15) |
| `src/App.tsx`                                             | Rotta `/sos-conflitti`         |
| `src/components/BottomNav.tsx`                            | Tab SOS                        |
| `src/pages/HomePage.tsx`                                  | Card link                      |
| `supabase/config.toml`                                    | Registrare nuova function      |
