// Genera un codice OTP a 6 cifre, lo salva (hashato) e lo invia via WhatsApp.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DEFAULT_WA_URL = 'https://wa.psicovallo.com/webhook';
const DEFAULT_WA_SECRET = 'zxzArGm6NYdgr9t';

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
    const { phoneNumber, userId } = await req.json();
    const clean = String(phoneNumber || '').replace(/\D/g, '');
    if (clean.length < 10 || clean.length > 16) {
      return new Response(JSON.stringify({ error: 'invalid_phone' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Rate limit: max 3 codici inviati negli ultimi 10 minuti per numero
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('phone_verifications')
      .select('id', { count: 'exact', head: true })
      .eq('phone_number', clean)
      .gte('created_at', tenMinAgo);

    if ((count ?? 0) >= 3) {
      return new Response(JSON.stringify({ error: 'rate_limited', message: 'Troppi codici inviati. Aspetta qualche minuto.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Genera codice 6 cifre
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const code_hash = await sha256(code);
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from('phone_verifications').insert({
      phone_number: clean,
      code_hash,
      expires_at,
      user_id: userId || null,
    });
    if (insertError) throw insertError;

    // Invia via WhatsApp
    const rawUrl = Deno.env.get('WA_SERVER_URL') ?? '';
    const rawSecret = Deno.env.get('WA_SERVER_SECRET') ?? '';
    const WA_SERVER_URL = /^https?:\/\//i.test(rawUrl) ? rawUrl : DEFAULT_WA_URL;
    const WA_SERVER_SECRET = rawSecret && !/^https?:\/\//i.test(rawSecret) ? rawSecret : DEFAULT_WA_SECRET;

    const message = `🔐 *Vallo* — Codice di verifica\n\n*${code}*\n\nValido 10 minuti. Non condividerlo con nessuno.`;

    const waResponse = await fetch(WA_SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: WA_SERVER_SECRET,
        phoneNumber: clean,
        messageType: 'verification',
        customMessage: message,
      }),
    });

    if (!waResponse.ok) {
      const errText = await waResponse.text();
      console.error('WA send failed', waResponse.status, errText);
      return new Response(JSON.stringify({ error: 'wa_send_failed', detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ status: 'sent', expires_at }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'unknown';
    console.error('send-phone-otp error', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});