# Memory: index.md
Updated: now

# Project Memory

## Core
- Brutalist, severe tone ("Provocatore di Consapevolezza"). Zero discounts, no rewards, forced waiting.
- Theme: Dark (#0a0a0a) with Amber accents (#d97706).
- Tech: React, TS, Vite, Tailwind, Supabase (import client from `@/integrations/supabase/client`).
- AI Council ALWAYS outputs in Italian (Regola Lingua Assoluta), regardless of input/browser language.
- Constraint: Internal chat system removed. Do NOT re-add 'Chatta con Vallo'.
- GLOSSARIO DI GUERRA: l'app è IL VALLO (trincea), non armatura. Vizi=Barbari, Azioni Sovrane=Rinforzare le Mura, Install=Erigere il Vallo, Roll Call=Turno di Guardia, Tassa Passività=Tassa di Diserzione, Notifiche=Corni di Guardia.

## Memories
- [Glossario di Guerra](mem://style/glossario-di-guerra) — Mappa completa sostituzioni marziali del copy UI
- [Project Identity](mem://project/identity) — "Vallo" app, relational engineering, viral sharing message
- [Visual Direction](mem://style/visual-direction) — Notification icons, sonar/soft vibration patterns
- [Tech Stack](mem://tech/stack) — Google Translate MutationObserver, React/Supabase stack details
- [UX Patterns](mem://ui/ux-patterns) — Time-based greetings, manual push auth in onboarding
- [Onboarding](mem://features/onboarding) — 4 mandatory steps (Patto, Obiettivo, Miliare 0, Notifiche)
- [Guided Tour & Manual](mem://features/guided-tour) — 6-step tour post-onboarding, /manuale page, HelpDrawer (?) on feature pages
- [Venting Area](mem://features/venting-area) — /sfogo, free writing with 30m limit, AI questions loop
- [Auth Branding](mem://auth/branding) — "Proteggi il tuo DNA" text, required fields
- [Hamburger Menu](mem://ui/hamburger-menu) — Sidebar links, full-screen overlay on mobile
- [Language Settings](mem://user/settings-language) — Local storage state, `translate="no"` to suppress prompts
- [Voice Input](mem://features/voice-input) — MediaRecorder + Groq Whisper edge func, background recording
- [Auth Implementation](mem://auth/implementation) — Auto-register on login, role-based access
- [Notification Scheduling](mem://features/notifications/scheduling) — 1-20/day or hour, random hourly slots
- [Notification Content](mem://features/notifications/content) — Emojis per category, Overton Shift overrides
- [Reflection Logic](mem://features/reflection/logic) — 9 mandatory views, whole-word forbidden regex, 60s timer
- [Database Reflection](mem://tech/database/schema-reflection) — `question_assignments`, text hour keys for slots
- [Database SOS DNA](mem://tech/database/schema-sos-dna) — `conflict_profiles`, `conflict_questions` schema
- [SOS DNA Objective](mem://features/sos-dna/objective) — Final objective mandatory, weak intents rejected
- [SOS DNA Quantum](mem://features/sos-dna/quantum) — Focus 12 protocol, 30s hologram stabilization timer
- [SOS DNA Resistance](mem://features/sos-dna/resistance) — Brutalist popup for "Troppo dura" mitigation attempts
- [SOS DNA System](mem://features/sos-dna/system) — Onion method, 4 scenarios, mental repetition
- [SOS DNA Scenarios](mem://style/sos-dna-scenarios) — Color coding: Conflitto (Amber), Eros (Red), Power (Purple), Shield (Green)
- [Install Banner](mem://ui/install-banner) — Red PWA install banner for Android/iOS
- [AI Council Identities](mem://features/ai-council/identities) — 15 Masters (Bandler, Freud, etc.) debating
- [SOS DNA Detail](mem://features/sos-dna/detail-view) — /dna-question, translation and AI analysis
- [SOS DNA Translation](mem://features/sos-dna/translation-logic) — Retroactive translation via edge function
- [Venting Notifications](mem://features/venting-area/notifications-and-detail) — Links to /sfogo-question, voice comments
- [Profile Evolution](mem://user/profile-evolution) — Written + Generated profile, gatekeeper for La Forgia
- [La Forgia](mem://features/la-forgia/logic) — Daily challenges (#000000 bg), lockout reset via push deep link
- [Tribunale](mem://features/la-forgia/tribunale) — 15-day evaluation cycles (Mattoni vs Crepe)
- [Reflection Sharing](mem://features/reflection/sharing) — Copy/Share formatting ("Domanda dal Consiglio...")
- [Navigation](mem://ui/navigation) — Bottom tab bar, globe button for language
- [Overton Shift](mem://features/overton-shift/system) — 5 steps, 48h decay timer, 50% reminder override
- [Push Architecture](mem://tech/notifications/push-architecture) — VAPID, SW, syncSubscriptionWithBackend
- [Notification Management](mem://features/notifications/management) — Save AI questions via BellPlus icon
- [Infinite Evolution](mem://features/reflection/infinite-evolution) — Auto-generate 3 questions when pool <= 2
- [Delivery Guarantee](mem://features/notifications/delivery-guarantee) — Push sent regardless of read status
