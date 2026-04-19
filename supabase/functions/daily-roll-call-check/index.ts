// Daily Roll Call Check — invoked daily at 22:00 Europe/Rome via pg_cron
// 1. Finds users who haven't done their Roll Call (last_clean_day_at < today)
// 2. Increments consecutive_silent_days
// 3. Applies +100€ Tassa di Latitanza if >= 2 days silent
// 4. Sends "Mandato di Comparizione" email via send-transactional-email
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const COUNCIL_MESSAGES = [
  'Il silenzio è il rumore del tuo fallimento. Il debito è aumentato.',
  'Hai scelto la diserzione. Il Consiglio ha preso nota.',
  'Ogni ora di omissione è un mattone tolto al tuo Vallo. Stai costruendo le tue rovine.',
  'La passività non è neutralità. È una dichiarazione di guerra contro te stesso.',
  'Mentre dormivi, il tuo debito ha lavorato. Lui non si stanca mai.',
  'Hai trattato questo strumento come opzionale. Il sistema ti tratterà di conseguenza.',
  'L\'assenza di azione è già azione. Hai scelto di marcire.',
  'Ti sei nascosto. Il Consiglio ti ha trovato comunque. Sempre.',
  'Il tempo che non hai dato qui, lo hai dato al vizio. Senza eccezioni.',
  'Domani non esiste. Esiste solo il debito che hai contratto oggi.',
]

const LATITANZA_PENALTY = 100

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Get today's date in Europe/Rome
    const now = new Date()
    const romeDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)

    console.log(`[daily-roll-call-check] Running for ${romeDate}`)

    // Get all users who completed onboarding
    const { data: progressRows, error: progressErr } = await supabase
      .from('question_progress')
      .select('user_id')
      .eq('onboarding_completed', true)

    if (progressErr) throw progressErr

    const userIds = (progressRows || []).map((r) => r.user_id)
    if (userIds.length === 0) {
      return jsonResp({ checked: 0, silent: 0, emails_sent: 0, penalties_applied: 0 })
    }

    // Fetch profiles for these users
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select(
        'user_id, email, name, financial_debt, sovereign_streak, consecutive_silent_days, last_clean_day_at, last_roll_call_check_date, phone_number, wa_notifications_enabled'
      )
      .in('user_id', userIds)

    if (profErr) throw profErr

    let emailsSent = 0
    let penaltiesApplied = 0
    let silentCount = 0

    for (const profile of profiles || []) {
      // Skip if already checked today (idempotency)
      if (profile.last_roll_call_check_date === romeDate) {
        console.log(`[skip] Already checked ${profile.user_id} today`)
        continue
      }

      // Determine if user did their Roll Call today
      const lastCleanDate = profile.last_clean_day_at
        ? new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Rome',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(new Date(profile.last_clean_day_at))
        : null

      const didRollCall = lastCleanDate === romeDate

      if (didRollCall) {
        // Reset silent counter
        await supabase
          .from('profiles')
          .update({
            consecutive_silent_days: 0,
            last_roll_call_check_date: romeDate,
          })
          .eq('user_id', profile.user_id)
        continue
      }

      // User missed Roll Call → SILENT day
      silentCount++
      const newSilentDays = (profile.consecutive_silent_days || 0) + 1

      // Apply Tassa di Latitanza on day 2+
      let newDebt = Number(profile.financial_debt || 0)
      let latitanzaPenalty = 0
      if (newSilentDays >= 2) {
        latitanzaPenalty = LATITANZA_PENALTY
        newDebt += LATITANZA_PENALTY
        penaltiesApplied++
        console.log(
          `[latitanza] User ${profile.user_id} day ${newSilentDays} silent → +${LATITANZA_PENALTY}€`
        )
      }

      // Update profile
      await supabase
        .from('profiles')
        .update({
          consecutive_silent_days: newSilentDays,
          financial_debt: newDebt,
          last_roll_call_check_date: romeDate,
          last_mandato_email_sent_at: now.toISOString(),
        })
        .eq('user_id', profile.user_id)

      // Send email if we have an address
      if (!profile.email) {
        console.log(`[no-email] Skipping ${profile.user_id} — no email address`)
        continue
      }

      const message =
        COUNCIL_MESSAGES[Math.floor(Math.random() * COUNCIL_MESSAGES.length)]

      const { error: invokeErr } = await supabase.functions.invoke(
        'send-transactional-email',
        {
          body: {
            templateName: 'mandato-comparizione',
            recipientEmail: profile.email,
            idempotencyKey: `mandato-${profile.user_id}-${romeDate}`,
            templateData: {
              name: profile.name || null,
              consigliMessage: message,
              financialDebt: newDebt,
              sovereignStreak: profile.sovereign_streak || 0,
              consecutiveSilentDays: newSilentDays,
              latitanzaPenalty,
            },
          },
        }
      )

      if (invokeErr) {
        console.error(`[email-error] ${profile.user_id}:`, invokeErr)
      } else {
        emailsSent++
        console.log(`[email-sent] ${profile.email} → day ${newSilentDays}`)
      }

      // WhatsApp Mandato — only if user opted in and has a phone number
      if (profile.wa_notifications_enabled && profile.phone_number) {
        const waBody = `🔴 MANDATO DI COMPARIZIONE\n\n${message}\n\nDebito attuale: ${newDebt}€\nGiorni di silenzio: ${newSilentDays}\n\nApri Vallo: https://psicovallo.com`;
        supabase.functions
          .invoke('trigger-wa-notification', {
            body: {
              phoneNumber: profile.phone_number,
              messageType: 'mandato',
              customMessage: waBody,
            },
          })
          .then(({ error: waErr }) => {
            if (waErr) console.error(`[wa-error] ${profile.user_id}:`, waErr);
            else console.log(`[wa-sent] ${profile.phone_number}`);
          })
          .catch((e) => console.error(`[wa-throw] ${profile.user_id}:`, e));
      }
    }

    const result = {
      checked: profiles?.length || 0,
      silent: silentCount,
      emails_sent: emailsSent,
      penalties_applied: penaltiesApplied,
      date: romeDate,
    }
    console.log('[daily-roll-call-check] Done:', JSON.stringify(result))
    return jsonResp(result)
  } catch (error) {
    console.error('[daily-roll-call-check] FATAL:', error)
    return jsonResp(
      { error: error instanceof Error ? error.message : String(error) },
      500
    )
  }
})

function jsonResp(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
