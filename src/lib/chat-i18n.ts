export type ChatLang = 'en' | 'it' | 'es' | 'fr' | 'de' | 'pt';

export const CHAT_LANGS: { code: ChatLang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'it', label: 'Italiano' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
];

type Dict = Record<string, string>;

const STRINGS: Record<ChatLang, Dict> = {
  en: {
    chat: 'Chat', new_chat: 'New chat', no_chats: 'No conversations yet.',
    select_user: 'Select a user', search_user: 'Search by name or email…',
    type_message: 'Type a message', send: 'Send', recording: 'Recording',
    transcribing: 'Transcribing…', show_transcript: 'Show transcript',
    hide_transcript: 'Hide transcript', download_txt: 'Download .txt',
    transcript_lang: 'Transcript language', back: 'Back', you: 'You',
    audio_message: 'Audio message',
  },
  it: {
    chat: 'Chat', new_chat: 'Nuova chat', no_chats: 'Nessuna conversazione.',
    select_user: 'Seleziona un utente', search_user: 'Cerca per nome o email…',
    type_message: 'Scrivi un messaggio', send: 'Invia', recording: 'Registrazione',
    transcribing: 'Trascrizione…', show_transcript: 'Mostra trascritto',
    hide_transcript: 'Nascondi trascritto', download_txt: 'Scarica .txt',
    transcript_lang: 'Lingua trascritto', back: 'Indietro', you: 'Tu',
    audio_message: 'Messaggio audio',
  },
  es: {
    chat: 'Chat', new_chat: 'Nuevo chat', no_chats: 'Sin conversaciones.',
    select_user: 'Selecciona un usuario', search_user: 'Buscar por nombre o email…',
    type_message: 'Escribe un mensaje', send: 'Enviar', recording: 'Grabando',
    transcribing: 'Transcribiendo…', show_transcript: 'Mostrar transcripción',
    hide_transcript: 'Ocultar transcripción', download_txt: 'Descargar .txt',
    transcript_lang: 'Idioma transcripción', back: 'Atrás', you: 'Tú',
    audio_message: 'Mensaje de audio',
  },
  fr: {
    chat: 'Chat', new_chat: 'Nouveau chat', no_chats: 'Aucune conversation.',
    select_user: 'Choisir un utilisateur', search_user: 'Rechercher par nom ou email…',
    type_message: 'Écrire un message', send: 'Envoyer', recording: 'Enregistrement',
    transcribing: 'Transcription…', show_transcript: 'Afficher transcription',
    hide_transcript: 'Masquer transcription', download_txt: 'Télécharger .txt',
    transcript_lang: 'Langue transcription', back: 'Retour', you: 'Vous',
    audio_message: 'Message audio',
  },
  de: {
    chat: 'Chat', new_chat: 'Neuer Chat', no_chats: 'Keine Unterhaltungen.',
    select_user: 'Benutzer wählen', search_user: 'Nach Name oder E-Mail suchen…',
    type_message: 'Nachricht schreiben', send: 'Senden', recording: 'Aufnahme',
    transcribing: 'Transkription…', show_transcript: 'Transkript anzeigen',
    hide_transcript: 'Transkript ausblenden', download_txt: '.txt herunterladen',
    transcript_lang: 'Transkript-Sprache', back: 'Zurück', you: 'Du',
    audio_message: 'Audionachricht',
  },
  pt: {
    chat: 'Chat', new_chat: 'Novo chat', no_chats: 'Sem conversas.',
    select_user: 'Selecionar utilizador', search_user: 'Procurar por nome ou email…',
    type_message: 'Escrever mensagem', send: 'Enviar', recording: 'A gravar',
    transcribing: 'A transcrever…', show_transcript: 'Mostrar transcrição',
    hide_transcript: 'Ocultar transcrição', download_txt: 'Descarregar .txt',
    transcript_lang: 'Idioma transcrição', back: 'Voltar', you: 'Tu',
    audio_message: 'Mensagem de áudio',
  },
};

const STORAGE_KEY = 'chat_ui_lang';

export function getChatLang(): ChatLang {
  if (typeof window === 'undefined') return 'en';
  const v = localStorage.getItem(STORAGE_KEY) as ChatLang | null;
  return v && STRINGS[v] ? v : 'en';
}

export function setChatLang(lang: ChatLang) {
  localStorage.setItem(STORAGE_KEY, lang);
}

export function t(lang: ChatLang, key: string): string {
  return STRINGS[lang]?.[key] || STRINGS.en[key] || key;
}