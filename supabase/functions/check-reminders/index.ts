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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get current time in Europe/Rome timezone as HH:MM
    const now = new Date();
    const romeTime = now.toLocaleTimeString('it-IT', {
      timeZone: 'Europe/Rome',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    console.log(`Checking reminders for time: ${romeTime}`);

    // Find active reminders that have the current time in their times array
    const { data: reminders, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('active', true)
      .contains('times', [romeTime]);

    if (error) throw error;

    console.log(`Found ${reminders?.length || 0} reminders matching ${romeTime}`);

    if (!reminders?.length) {
      return new Response(JSON.stringify({ checked: romeTime, found: 0, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Group reminders by user_id
    const userReminders = new Map<string, string[]>();
    for (const r of reminders) {
      const existing = userReminders.get(r.user_id) || [];
      existing.push(r.text);
      userReminders.set(r.user_id, existing);
    }

    let totalSent = 0;

    // Send push notifications per user
    for (const [userId, texts] of userReminders) {
      const title = '⏰ Promemoria Vallo';
      const body = texts.length === 1 ? texts[0] : `Hai ${texts.length} promemoria:\n${texts.join('\n')}`;

      // Call send-push-notification function
      const sendUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`;
      const response = await fetch(sendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          user_ids: [userId],
          title,
          body,
          data: { url: '/reminders' },
        }),
      });

      const result = await response.json();
      totalSent += result.sent || 0;
    }

    return new Response(JSON.stringify({
      checked: romeTime,
      found: reminders.length,
      sent: totalSent,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('check-reminders error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
