import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const form = await req.formData();
    const audio = form.get("audio") as File | null;
    const chatId = form.get("chat_id")?.toString();
    const recipientId = form.get("recipient_id")?.toString();
    const language = form.get("language")?.toString() || "en";
    const durationStr = form.get("duration")?.toString() || "0";
    if (!audio || !chatId || !recipientId) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Validate membership
    const { data: chat, error: chatErr } = await admin
      .from("user_chats").select("user_a, user_b").eq("id", chatId).maybeSingle();
    if (chatErr || !chat) {
      return new Response(JSON.stringify({ error: "Chat not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const members = [chat.user_a, chat.user_b];
    if (!members.includes(user.id) || !members.includes(recipientId)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload audio
    const ext = (audio.type.includes("mp4") ? "mp4" : "webm");
    const objectPath = `${chatId}/${crypto.randomUUID()}.${ext}`;
    const arrayBuf = await audio.arrayBuffer();
    const { error: upErr } = await admin.storage.from("chat-audio")
      .upload(objectPath, arrayBuf, { contentType: audio.type || "audio/webm" });
    if (upErr) throw upErr;

    // Transcribe via Groq Whisper
    const groqForm = new FormData();
    groqForm.append("file", new Blob([arrayBuf], { type: audio.type || "audio/webm" }), `rec.${ext}`);
    groqForm.append("model", "whisper-large-v3-turbo");
    if (language && language !== "auto") groqForm.append("language", language);
    groqForm.append("response_format", "json");

    let transcript = "";
    try {
      const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
        body: groqForm,
      });
      if (r.ok) {
        const j = await r.json();
        transcript = j.text || "";
      } else {
        console.error("Groq error", r.status, await r.text());
      }
    } catch (e) {
      console.error("Transcribe failed", e);
    }

    const { data: msg, error: insErr } = await admin.from("user_chat_messages").insert({
      chat_id: chatId,
      sender_id: user.id,
      recipient_id: recipientId,
      body: transcript || "[audio]",
      audio_path: objectPath,
      audio_duration_sec: parseInt(durationStr) || null,
      transcript: transcript || null,
      transcript_lang: language,
    }).select().single();
    if (insErr) throw insErr;

    await admin.from("user_chats").update({ last_message_at: new Date().toISOString() }).eq("id", chatId);

    return new Response(JSON.stringify({ message: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat-send-audio error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});