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

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { user_ids, title, body, data, category } = await req.json();

    if (!user_ids?.length || !title || !body) {
      return new Response(JSON.stringify({ error: 'Missing required fields: user_ids, title, body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', user_ids);

    if (error) throw error;
    if (!subscriptions?.length) {
      return new Response(JSON.stringify({ sent: 0, results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@vallo.app';

    const payload = JSON.stringify({ title, body, data: data || {} });
    const results: Array<{ endpoint: string; status: string; statusCode?: number }> = [];
    const expiredIds: string[] = [];

    for (const sub of subscriptions) {
      try {
        const response = await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload,
          { privateKey: vapidPrivateKey, publicKey: vapidPublicKey, subject: vapidSubject }
        );

        if (response.status === 410 || response.status === 404) {
          expiredIds.push(sub.id);
          results.push({ endpoint: sub.endpoint, status: 'expired', statusCode: response.status });
        } else if (response.ok) {
          results.push({ endpoint: sub.endpoint, status: 'sent', statusCode: response.status });
        } else {
          results.push({ endpoint: sub.endpoint, status: 'failed', statusCode: response.status });
        }
      } catch (err) {
        results.push({ endpoint: sub.endpoint, status: 'error' });
      }
    }

    // Clean up expired subscriptions
    if (expiredIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', expiredIds);
    }

    // Log notifications (best-effort)
    const sentCount = results.filter(r => r.status === 'sent').length;
    if (sentCount > 0 && category !== 'skip-log') {
      try {
        const rows = user_ids.map((uid: string) => ({
          user_id: uid,
          category: category || 'manual',
          title,
          body,
          url: data?.url || null,
        }));
        await supabase.from('notification_log').insert(rows);
      } catch (logErr) {
        console.error('log error:', logErr);
      }
    }

    return new Response(JSON.stringify({
      sent: sentCount,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ===== Web Push implementation using Web Crypto API =====

function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBase64url(arr: Uint8Array): string {
  let binary = '';
  for (const byte of arr) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateVapidAuthHeader(
  audience: string,
  subject: string,
  privateKeyBase64url: string,
  publicKeyBase64url: string
): Promise<{ authorization: string; cryptoKey: string }> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: subject };

  const headerB64 = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key
  const privateKeyBytes = base64urlToUint8Array(privateKeyBase64url);
  const publicKeyBytes = base64urlToUint8Array(publicKeyBase64url);

  // Build JWK from raw keys
  const x = uint8ArrayToBase64url(publicKeyBytes.slice(1, 33));
  const y = uint8ArrayToBase64url(publicKeyBytes.slice(33, 65));
  const d = uint8ArrayToBase64url(privateKeyBytes);

  const jwk = { kty: 'EC', crv: 'P-256', x, y, d };
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);

  const signature = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    key,
    new TextEncoder().encode(unsignedToken)
  ));

  // Convert DER signature to raw r||s format if needed
  const rawSig = derToRaw(signature);
  const signatureB64 = uint8ArrayToBase64url(rawSig);
  const token = `${unsignedToken}.${signatureB64}`;

  return {
    authorization: `vapid t=${token}, k=${publicKeyBase64url}`,
    cryptoKey: `p256ecdsa=${publicKeyBase64url}`,
  };
}

function derToRaw(signature: Uint8Array): Uint8Array {
  // If already 64 bytes, it's raw format
  if (signature.length === 64) return signature;

  // Parse DER sequence
  if (signature[0] !== 0x30) return signature;

  const raw = new Uint8Array(64);
  let offset = 2;

  // R value
  if (signature[offset] !== 0x02) return signature;
  offset++;
  const rLen = signature[offset++];
  const rStart = offset + (rLen > 32 ? rLen - 32 : 0);
  const rDest = rLen < 32 ? 32 - rLen : 0;
  raw.set(signature.slice(rStart, offset + rLen), rDest);
  offset += rLen;

  // S value
  if (signature[offset] !== 0x02) return signature;
  offset++;
  const sLen = signature[offset++];
  const sStart = offset + (sLen > 32 ? sLen - 32 : 0);
  const sDest = 32 + (sLen < 32 ? 32 - sLen : 0);
  raw.set(signature.slice(sStart, offset + sLen), sDest);

  return raw;
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapid: { privateKey: string; publicKey: string; subject: string }
): Promise<Response> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const { authorization, cryptoKey: _cryptoKey } = await generateVapidAuthHeader(
    audience, vapid.subject, vapid.privateKey, vapid.publicKey
  );

  // Encrypt payload using aes128gcm
  const encrypted = await encryptPayload(
    payload,
    base64urlToUint8Array(subscription.p256dh),
    base64urlToUint8Array(subscription.auth)
  );

  return fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': authorization,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'TTL': '86400',
      'Urgency': 'high',
    },
    body: encrypted,
  });
}

async function encryptPayload(
  payload: string,
  p256dhKey: Uint8Array,
  authSecret: Uint8Array
): Promise<Uint8Array> {
  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Import subscriber's public key
  const subscriberKey = await crypto.subtle.importKey(
    'raw', p256dhKey, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );

  // ECDH shared secret
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subscriberKey },
    localKeyPair.privateKey,
    256
  ));

  // Export local public key (raw, uncompressed)
  const localPublicKey = new Uint8Array(await crypto.subtle.exportKey('raw', localKeyPair.publicKey));

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF for IKM: HMAC-SHA256(auth_secret, shared_secret)
  const authInfo = new TextEncoder().encode('WebPush: info\0');
  const infoConcat = new Uint8Array(authInfo.length + p256dhKey.length + localPublicKey.length);
  infoConcat.set(authInfo);
  infoConcat.set(p256dhKey, authInfo.length);
  infoConcat.set(localPublicKey, authInfo.length + p256dhKey.length);

  // PRK = HMAC-SHA-256(auth_secret, ecdh_secret)
  const authKey = await crypto.subtle.importKey('raw', authSecret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', authKey, sharedSecret));

  // IKM = HMAC-SHA-256(PRK, info || 0x01)
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const ikmInfo = new Uint8Array(infoConcat.length + 1);
  ikmInfo.set(infoConcat);
  ikmInfo[infoConcat.length] = 1;
  const ikm = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, ikmInfo));

  // Derive CEK and nonce using salt
  const saltKey = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prkSalt = new Uint8Array(await crypto.subtle.sign('HMAC', saltKey, ikm));
  const prkSaltKey = await crypto.subtle.importKey('raw', prkSalt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

  // CEK
  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const cekInfoFull = new Uint8Array(cekInfo.length + 1);
  cekInfoFull.set(cekInfo);
  cekInfoFull[cekInfo.length] = 1;
  const cekFull = new Uint8Array(await crypto.subtle.sign('HMAC', prkSaltKey, cekInfoFull));
  const cek = cekFull.slice(0, 16);

  // Nonce
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');
  const nonceInfoFull = new Uint8Array(nonceInfo.length + 1);
  nonceInfoFull.set(nonceInfo);
  nonceInfoFull[nonceInfo.length] = 1;
  const nonceFull = new Uint8Array(await crypto.subtle.sign('HMAC', prkSaltKey, nonceInfoFull));
  const nonce = nonceFull.slice(0, 12);

  // Encrypt with AES-128-GCM
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const payloadBytes = new TextEncoder().encode(payload);
  
  // Add padding delimiter (0x02) to plaintext
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2; // padding delimiter

  const encrypted = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    aesKey,
    paddedPayload
  ));

  // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65) + encrypted
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + localPublicKey.length);
  header.set(salt);
  header[16] = (rs >> 24) & 0xff;
  header[17] = (rs >> 16) & 0xff;
  header[18] = (rs >> 8) & 0xff;
  header[19] = rs & 0xff;
  header[20] = localPublicKey.length;
  header.set(localPublicKey, 21);

  const result = new Uint8Array(header.length + encrypted.length);
  result.set(header);
  result.set(encrypted, header.length);

  return result;
}
