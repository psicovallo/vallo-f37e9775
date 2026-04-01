import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // GET: return VAPID public key
    if (req.method === 'GET') {
      const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
      if (!publicKey) {
        return new Response(JSON.stringify({ error: 'VAPID_PUBLIC_KEY not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ publicKey }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST: save push subscription
    if (req.method === 'POST') {
      const { endpoint, keys, user_id } = await req.json();

      if (!endpoint || !keys?.p256dh || !keys?.auth || !user_id) {
        return new Response(JSON.stringify({ error: 'Missing required fields: endpoint, keys.p256dh, keys.auth, user_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Use service role to bypass RLS
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Upsert: replace if same endpoint exists, otherwise add new device
      // First check if this endpoint already exists
      const { data: existing } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', user_id)
        .eq('endpoint', endpoint)
        .maybeSingle();

      let error;
      if (existing) {
        // Update existing subscription keys
        ({ error } = await supabase.from('push_subscriptions').update({
          p256dh: keys.p256dh,
          auth: keys.auth,
        }).eq('id', existing.id));
      } else {
        // Insert new device subscription
        ({ error } = await supabase.from('push_subscriptions').insert({
        user_id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        }));
      }

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
