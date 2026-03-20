

# Piano: Notifiche Randomizzate + Area Sfogo Interattiva

## 1. Notifiche con distribuzione intelligente

**Problema**: gli orari sono fissi alle ore intere. Serve randomizzazione vera con prima notifica entro la prima ora e ultima entro l'ultima ora della fascia.

**Soluzione** in `check-reminders/index.ts`:
- Modificare `generateRandomTimes()`: la prima notifica cade nei primi 60 min della fascia, l'ultima negli ultimi 60 min, le 4 restanti distribuite random nel mezzo.
- Ogni giorno orari completamente diversi (già funziona così, ma ora con vincolo prima/ultima ora).

## 2. Area Sfogo con domande AI reattive

**Nuova pagina `SfogoPage.tsx`**:
- Textarea libera dove l'utente scrive senza limiti di caratteri o parole bloccate.
- Bottone **"Aiutami a riflettere"**: invia il testo dello sfogo a una nuova Edge Function che genera 3-5 domande di riflessione legate a ciò che ha scritto, usando il Consiglio dei 12 Maestri ma con tono più empatico/guidato.
- Le domande generate appaiono una alla volta, con area appunti sotto ciascuna (stesso pattern Fase A: timer breve 7-10s, poi textarea).
- **Timer sessione 30 minuti**: dopo 30 min dall'inizio della sessione sfogo, il sistema mostra un messaggio: "Ora è meglio che fai una pausa. Rifletti su tutto questo." e blocca l'interazione. L'utente può tornare più tardi.
- Tutto viene salvato nella tabella `notes` (sfogo) e `question_notes` (appunti sulle domande generate).

**Nuova Edge Function `generate-sfogo-questions/index.ts`**:
- Riceve il testo dello sfogo + l'obiettivo dell'utente (dal profilo).
- Usa Lovable AI (Gemini 2.5 Pro) con prompt dei 12 Maestri adattato: genera domande di riflessione contestuali allo sfogo, legate al topic (es. dimagrimento).
- Ritorna 3-5 domande in formato JSON.

## 3. Integrazione nell'app

- **App.tsx**: aggiungere rotta `/sfogo`.
- **BottomNav.tsx**: aggiungere tab "Sfogo" con icona `PenLine`.
- **HomePage.tsx**: aggiungere card "Area Sfogo" con link.

## File da modificare/creare

| File | Azione |
|------|--------|
| `supabase/functions/check-reminders/index.ts` | Randomizzazione prima/ultima ora |
| `src/pages/SfogoPage.tsx` | Nuova pagina sfogo completa |
| `supabase/functions/generate-sfogo-questions/index.ts` | Nuova edge function per domande reattive |
| `src/App.tsx` | Rotta `/sfogo` |
| `src/components/BottomNav.tsx` | Tab Sfogo |
| `src/pages/HomePage.tsx` | Card link sfogo |

