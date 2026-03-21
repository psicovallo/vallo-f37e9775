# Piano: Miglioramenti UX Question Page + Area Sfogo

## 1. Avviso parole vietate in tempo reale (Question Page - Fase B)

Attualmente l'errore appare solo al submit. Invece: mostrare un alert rosso **in tempo reale** mentre l'utente digita, evidenziando quale parola è bloccata. L'alert appare sopra la textarea e scompare quando la parola viene rimossa.

**File**: `QuestionPage.tsx` — modificare `handleTextChange` per mostrare `validationError` live durante la digitazione (non solo al submit).

## 2. Timer reset con avviso "Rileggi"

Quando il timer (Fase A o Fase B) riparte perché l'utente non ha prestato attenzione, mostrare un messaggio: **"Rileggi più volte la domanda. Il timer è ricominciato. Con serenità lascia il tempo alla tua mente."**

**File**: `QuestionPage.tsx` — aggiungere stato `timerRestarted` e messaggio visibile sotto il countdown.

## 3. Bottoni: click diretto = attraversamento

Rimuovere il bottone separato "ATTRAVERSA QUESTA DOMANDA". Quando l'utente clicca uno dei 4 bottoni, il sistema salva immediatamente e chiude. Messaggio sopra i bottoni: **"Scegli quello che pensi si addica di più a cosa hai scritto. Non ti preoccupare, tutto va bene. Scegline uno."**

**File**: `QuestionPage.tsx` — nel click del bottone, chiamare direttamente `handleSubmit` con il bottone selezionato. Rimuovere lo stato `selectedButton` separato e il bottone finale.

## 4. Bottoni randomizzati ad ogni apertura

I 4 bottoni sono già randomizzati dal pool (`useMemo` con `shuffleArray`). Verificare che il `useMemo` si ricalcoli ad ogni nuova apertura di Fase B (dipendenza su `assignment?.id`). Questo è già implementato correttamente.

## 5. Area Sfogo: loop continuo di domande basate su appunti

Riscrivere il flusso reflect in `SfogoPage.tsx`:

- Dopo che l'utente risponde alle prime domande AI, **usare gli appunti scritti** come input per generare la batch successiva di domande (non il testo originale dello sfogo).  
Togliere il tasto salva appunti si salvano automaticamente quando clicca su continua
- Il ciclo continua finché la sessione di 30 min è attiva.
- Se l'utente non scrive appunti per 5 domande consecutive, riportarlo alla fase "write" per scrivere un nuovo sfogo.
- Salvare tutto su DB (`notes` tabella) con tag `[SFOGO-ROUND-N]`.  
Informare l'utente che gli appunti servono per aiutarlo nel percorso.

## 6. Storico sfoghi consultabile

Aggiungere una sezione "I tuoi sfoghi" nella pagina Sfogo:

- Un toggle/tab per passare tra "Scrivi" e "Storico".
- Lo storico mostra tutte le note taggate `[SFOGO]` e `[SFOGO-RIFLESSIONE]` ordinate per data, raggruppate per sessione.

**File**: `SfogoPage.tsx` — aggiungere tab "Storico" che carica da `notes` con filtro sul prefisso.

## File da modificare


| File               | Modifiche                                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `QuestionPage.tsx` | Alert parole vietate live, rimuovere bottone finale (click diretto), messaggio timer restart, messaggio sopra bottoni |
| `SfogoPage.tsx`    | Loop domande basato su appunti, storico sfoghi, gestione round multipli                                               |
