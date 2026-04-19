import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe`
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

type State =
  | { kind: 'validating' }
  | { kind: 'invalid'; reason: string }
  | { kind: 'already' }
  | { kind: 'ready' }
  | { kind: 'submitting' }
  | { kind: 'done' }
  | { kind: 'error'; msg: string }

export default function UnsubscribePage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [state, setState] = useState<State>({ kind: 'validating' })

  useEffect(() => {
    if (!token) {
      setState({ kind: 'invalid', reason: 'Token mancante' })
      return
    }
    ;(async () => {
      try {
        const res = await fetch(`${FN_URL}?token=${encodeURIComponent(token)}`, {
          headers: { apikey: ANON_KEY },
        })
        const data = await res.json()
        if (data.valid === true) setState({ kind: 'ready' })
        else if (data.reason === 'already_unsubscribed') setState({ kind: 'already' })
        else setState({ kind: 'invalid', reason: data.error || 'Token non valido' })
      } catch (e: any) {
        setState({ kind: 'error', msg: e?.message || 'Errore di rete' })
      }
    })()
  }, [token])

  const handleConfirm = async () => {
    if (!token) return
    setState({ kind: 'submitting' })
    try {
      const res = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (data.success) setState({ kind: 'done' })
      else if (data.reason === 'already_unsubscribed') setState({ kind: 'already' })
      else setState({ kind: 'error', msg: data.error || 'Errore' })
    } catch (e: any) {
      setState({ kind: 'error', msg: e?.message || 'Errore di rete' })
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full border-t-4 border-amber-600 bg-black p-8">
        <div className="text-amber-600 text-xs tracking-[0.3em] mb-2">// VALLO</div>
        <h1 className="text-2xl font-bold tracking-widest mb-6">DISERZIONE EMAIL</h1>

        {state.kind === 'validating' && (
          <div className="flex items-center gap-3 text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Verifica del mandato in corso…</span>
          </div>
        )}

        {state.kind === 'ready' && (
          <>
            <p className="text-sm text-zinc-300 mb-2 leading-relaxed">
              Stai per <span className="text-amber-600 font-bold">interrompere</span> i Mandati di
              Comparizione del Consiglio.
            </p>
            <p className="text-xs text-zinc-500 mb-6 italic">
              Il sistema continuerà a tracciare il tuo debito. Solo le email cesseranno.
              Il Consiglio considera questa una dichiarazione di debolezza.
            </p>
            <Button
              onClick={handleConfirm}
              className="w-full bg-amber-600 hover:bg-amber-700 text-black font-bold tracking-widest border-2 border-black"
            >
              CONFERMA DISERZIONE
            </Button>
          </>
        )}

        {state.kind === 'submitting' && (
          <div className="flex items-center gap-3 text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Registrazione della diserzione…</span>
          </div>
        )}

        {state.kind === 'done' && (
          <div>
            <div className="text-amber-600 text-xs tracking-[0.2em] mb-2">// REGISTRATO</div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Disiscrizione confermata. Non riceverai più Mandati. Il debito continua.
            </p>
          </div>
        )}

        {state.kind === 'already' && (
          <div>
            <div className="text-zinc-500 text-xs tracking-[0.2em] mb-2">// GIÀ REGISTRATO</div>
            <p className="text-sm text-zinc-400">Eri già stato disiscritto. Nessuna azione necessaria.</p>
          </div>
        )}

        {state.kind === 'invalid' && (
          <div>
            <div className="text-red-500 text-xs tracking-[0.2em] mb-2">// MANDATO NON VALIDO</div>
            <p className="text-sm text-zinc-400">{state.reason}</p>
          </div>
        )}

        {state.kind === 'error' && (
          <div>
            <div className="text-red-500 text-xs tracking-[0.2em] mb-2">// ERRORE</div>
            <p className="text-sm text-zinc-400">{state.msg}</p>
          </div>
        )}
      </div>
    </div>
  )
}
