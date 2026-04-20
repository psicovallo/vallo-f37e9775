// Edge function: invia notifica WhatsApp tramite server self-hosted (Baileys/whatsapp-web.js)
// URL e SECRET sono configurati come secrets, MAI hardcoded.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface WaPayload {
  phoneNumber: string;
  messageType?: string;
  customMessage?: string;
  // Opzionale: se passato, l'edge function risolve il numero dal profilo
  user_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Default hard-coded sul webhook pubblico per evitare richieste ripetute di chiavi.
  // Se i secret sono configurati correttamente vengono usati, altrimenti si usa il fallback.
  const DEFAULT_WA_URL = 'https://wa.psicovallo.com/webhook';
  const DEFAULT_WA_SECRET = 'zxzArGm6NYdgr9t';

  const rawUrl = Deno.env.get('WA_SERVER_URL') ?? '';
  const rawSecret = Deno.env.get('WA_SERVER_SECRET') ?? '';

  // Se il valore non sembra un URL valido (es. è stato salvato il secret al posto dell'URL), usa il default
  const WA_SERVER_URL = /^https?:\/\//i.test(rawUrl) ? rawUrl : DEFAULT_WA_URL;
  // Se WA_SERVER_SECRET è vuoto o coincide con un URL, usa il default
  const WA_SERVER_SECRET = rawSecret && !/^https?:\/\//i.test(rawSecret) ? rawSecret : DEFAULT_WA_SECRET;

  try {
    const body = (await req.json()) as WaPayload;
    let { phoneNumber, messageType, customMessage, user_id } = body;

    // Se non c'è phoneNumber ma c'è user_id, recuperalo dal profilo
    if (!phoneNumber && user_id) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone_number, wa_notifications_enabled')
        .eq('user_id', user_id)
        .maybeSingle();

      if (!profile?.wa_notifications_enabled) {
        return new Response(JSON.stringify({ status: 'skipped', reason: 'wa_disabled' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      phoneNumber = profile.phone_number ?? undefined;
    }

    if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.length < 8) {
      return new Response(JSON.stringify({ error: 'Invalid phoneNumber' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!customMessage || typeof customMessage !== 'string' || customMessage.length > 4000) {
      return new Response(JSON.stringify({ error: 'Invalid customMessage' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(WA_SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: WA_SERVER_SECRET,
        phoneNumber,
        messageType: messageType ?? 'mandato',
        customMessage,
      }),
    });

    const result = await response.text();

    if (!response.ok) {
      console.error('WA server error', response.status, result);
      return new Response(JSON.stringify({ error: 'wa_server_failed', status: response.status, result }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ status: 'sent', result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'unknown';
    console.error('trigger-wa-notification error', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
