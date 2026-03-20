import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function generateRandomTimes(start: string, end: string, count: number): string[] {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (endMinutes <= startMinutes) return [];

  const times: Set<string> = new Set();
  let attempts = 0;

  while (times.size < count && attempts < 100) {
    const randomMin = startMinutes + Math.floor(Math.random() * (endMinutes - startMinutes));
    const h = Math.floor(randomMin / 60);
    const m = randomMin % 60;
    times.add(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    attempts++;
  }

  return [...times].sort();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const now = new Date();
    const romeFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const romeDate = romeFormatter.format(now);

    const romeTime = now.toLocaleTimeString('it-IT', {
      timeZone: 'Europe/Rome',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    console.log(`Check reminders at ${romeTime} on ${romeDate}`);

    // Get all users with completed onboarding
    const { data: allProgress, error: progressError } = await supabase
      .from('question_progress')
      .select('*')
      .eq('onboarding_completed', true);

    if (progressError) throw progressError;
    if (!allProgress?.length) {
      return new Response(JSON.stringify({ checked: romeTime, users: 0, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalSent = 0;

    for (const progress of allProgress) {
      const userId = progress.user_id;

      // Generate daily times if needed
      let dailyTimes: string[] = progress.daily_times || [];
      if (progress.daily_times_date !== romeDate) {
        dailyTimes = generateRandomTimes(
          progress.notification_window_start || '08:00',
          progress.notification_window_end || '22:00',
          6
        );

        await supabase
          .from('question_progress')
          .update({ daily_times: dailyTimes, daily_times_date: romeDate })
          .eq('id', progress.id);

        console.log(`Generated times for ${userId}: ${dailyTimes.join(', ')}`);
      }

      if (!dailyTimes.includes(romeTime)) continue;

      // Get active assignment for this user
      const { data: assignments } = await supabase
        .from('question_assignments')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'risolta')
        .order('sort_order', { ascending: true })
        .limit(1);

      if (!assignments?.length) continue;

      const assignment = assignments[0];

      // Check max 2 views per day
      const { data: todayDeliveries } = await supabase
        .from('question_deliveries')
        .select('id')
        .eq('user_id', userId)
        .eq('question_index', assignment.sort_order)
        .eq('read_completed', true)
        .gte('delivered_at', `${romeDate}T00:00:00`)
        .lte('delivered_at', `${romeDate}T23:59:59`);

      if ((todayDeliveries?.length || 0) >= 2) continue;

      // Chain logic: check if there's an unread delivery
      const { data: unreadDelivery } = await supabase
        .from('question_deliveries')
        .select('id')
        .eq('user_id', userId)
        .eq('read_completed', false)
        .limit(1)
        .maybeSingle();

      if (unreadDelivery) {
        console.log(`Skipping ${userId}: has unread delivery`);
        continue;
      }

      // Create delivery
      await supabase.from('question_deliveries').insert({
        user_id: userId,
        question_index: assignment.sort_order,
        delivered_at: now.toISOString(),
      });

      // Send push notification
      const title = `🔥 Domanda ${assignment.sort_order}`;
      const body = assignment.question_text.slice(0, 100) + (assignment.question_text.length > 100 ? '...' : '');

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
          data: { url: '/question' },
        }),
      });

      const result = await response.json();
      totalSent += result.sent || 0;
      console.log(`Sent to ${userId}: question ${assignment.sort_order}, views: ${assignment.view_count}/9`);
    }

    return new Response(JSON.stringify({
      checked: romeTime,
      date: romeDate,
      users: allProgress.length,
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
