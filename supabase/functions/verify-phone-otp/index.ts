// Verifica il codice OTP e, se valido, salva phone_number sul profilo + attiva WA.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { phoneNumber, code, userId } = await req.json();
    const clean = String(phoneNumber || '').replace(/\D/g, '');
    const cleanCode = String(code || '').replace(/\D/g, '');

    if (clean.length < 10 || cleanCode.length !== 6) {
      return new Response(JSON.stringify({ error: 'invalid_input' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Recupera l'ultimo codice attivo per il numero
    const { data: verif, error } = await supabase
      .from('phone_verifications')
      .select('id, code_hash, expires_at, attempts, verified_at')
      .eq('phone_number', clean)
      .is('verified_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!verif) {
      return new Response(JSON.stringify({ error: 'no_code', message: 'Nessun codice attivo. Richiedine uno nuovo.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (new Date(verif.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: 'expired', message: 'Codice scaduto. Richiedine uno nuovo.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (verif.attempts >= 5) {
      return new Response(JSON.stringify({ error: 'too_many_attempts', message: 'Troppi tentativi. Richiedi un nuovo codice.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const submittedHash = await sha256(cleanCode);
    if (submittedHash !== verif.code_hash) {
      await supabase
        .from('phone_verifications')
        .update({ attempts: verif.attempts + 1 })
        .eq('id', verif.id);
      return new Response(JSON.stringify({ error: 'wrong_code', message: 'Codice errato.', remaining: 4 - verif.attempts }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Successo: marca verificato
    await supabase
      .from('phone_verifications')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', verif.id);

    // Se passato userId, salva anche sul profilo + attiva WA
    if (userId) {
      await supabase
        .from('profiles')
        .update({ phone_number: clean, wa_notifications_enabled: true })
        .eq('user_id', userId);
    }

    return new Response(JSON.stringify({ status: 'verified', phoneNumber: clean }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'unknown';
    console.error('verify-phone-otp error', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});