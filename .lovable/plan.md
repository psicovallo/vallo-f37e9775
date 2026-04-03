

## Piano: Aggiungere pulsanti Condividi e Copia alle domande

### Cosa cambia

In `src/pages/QuestionPage.tsx`, dentro il box della domanda (il `div` con bordo `border-primary/30`), aggiungiamo due piccoli pulsanti icona sotto il testo della domanda:

1. **Copia** (icona `Copy`): copia il testo della domanda negli appunti con `navigator.clipboard.writeText()` e mostra un toast di conferma
2. **Condividi** (icona `Share2`): usa `navigator.share()` se disponibile (mobile), altrimenti fallback a copia negli appunti

### Dettagli tecnici

- Modifica **un solo file**: `src/pages/QuestionPage.tsx`
- I pulsanti appaiono sia in Fase A (osservazione) che in Fase B (risposta), sempre dentro il box domanda
- Stile: icone piccole (`size={18}`), colore `text-muted-foreground hover:text-primary`, posizionate in basso a destra del box domanda con `flex justify-end gap-2`
- Il testo condiviso include la domanda preceduta da un breve intro: `"Domanda dal Consiglio dei Maestri:\n\n{testo}"`

