import type { ChatSession, UserSettings } from '@/types';

const SETTINGS_KEY = 'prash_chat_settings_v1';
const SESSIONS_KEY = 'prash_chat_sessions_v1';
const THEME_KEY = 'prash_theme_v1';

export const DEFAULT_SETTINGS: UserSettings = {
  openaiApiKey: '',
  geminiApiKey: '',
  nvidiaApiKey: '',
  groqApiKey: '',
  selectedModel: 'gpt-5.4-mini',
  preferredOpenAIModel: 'gpt-5.4-mini',
  autoFallback: true,
  privacyMode: false,
  theme: 'dark',
};

export function loadTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  } catch {
    return 'dark';
  }
}

export function saveTheme(theme: 'dark' | 'light'): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(THEME_KEY, theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch (err) {
    console.error('Failed to save theme', err);
  }
}

export function loadSettings(): UserSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings to localStorage', err);
  }
}

export function loadSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((s: ChatSession) => !s.isTemporary);
    }
    return [];
  } catch {
    return [];
  }
}

export function saveSession(session: ChatSession): void {
  if (typeof window === 'undefined' || session.isTemporary) {
    // Temporary/Privacy mode sessions are never stored in localStorage
    return;
  }
  try {
    const sessions = loadSessions();
    const index = sessions.findIndex((s) => s.id === session.id);
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.unshift(session);
    }
    // Keep max 50 sessions
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, 50)));
  } catch (err) {
    console.error('Failed to save session to localStorage', err);
  }
}

export function deleteSession(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const sessions = loadSessions().filter((s) => s.id !== id);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.error('Failed to delete session', err);
  }
}

export function clearAllSessions(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SESSIONS_KEY);
  } catch (err) {
    console.error('Failed to clear sessions', err);
  }
}

/** Export single chat session to a downloaded JSON file */
export function exportChatSession(session: ChatSession): void {
  if (typeof window === 'undefined') return;
  const bundle = {
    app: 'omnichat',
    version: 1,
    exportedAt: Date.now(),
    session,
  };
  const safeTitle = session.title.replace(/[^a-z0-9_-]/gi, '_').slice(0, 30) || 'chat';
  const filename = `omnichat-${safeTitle}-${Date.now()}.json`;
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Export all stored chats to a downloaded JSON backup */
export function exportAllSessions(sessions: ChatSession[]): void {
  if (typeof window === 'undefined') return;
  const bundle = {
    app: 'omnichat',
    version: 1,
    exportedAt: Date.now(),
    sessions,
  };
  const filename = `omnichat-backup-${new Date().toISOString().slice(0, 10)}-${Date.now()}.json`;
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function isChatSession(val: unknown): val is ChatSession {
  if (!val || typeof val !== 'object') return false;
  if (!('messages' in val)) return false;
  const messages = (val as Record<string, unknown>).messages;
  return Array.isArray(messages);
}

/** Parse and validate imported chat backup file */
export function parseChatBackup(rawText: string): {
  session?: ChatSession;
  sessions?: ChatSession[];
  count: number;
} {
  const data: unknown = JSON.parse(rawText);
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid JSON structure.');
  }

  const obj = data as Record<string, unknown>;

  // Case 1: Single session exported in bundle
  if (isChatSession(obj.session)) {
    const s = { ...obj.session };
    s.id = s.id || `session-${Date.now()}`;
    s.title = s.title || 'Imported Chat';
    s.updatedAt = Date.now();
    return { session: s, count: 1 };
  }

  // Case 2: Multi-session bundle
  if (Array.isArray(obj.sessions)) {
    const valid = obj.sessions.filter(isChatSession);
    return { sessions: valid, count: valid.length };
  }

  // Case 3: Raw session object without wrapper
  if (isChatSession(data)) {
    const s = { ...data };
    s.id = s.id || `session-${Date.now()}`;
    s.title = s.title || 'Imported Chat';
    s.updatedAt = Date.now();
    return { session: s, count: 1 };
  }

  // Case 4: Array of sessions
  if (Array.isArray(data)) {
    const valid = data.filter(isChatSession);
    return { sessions: valid, count: valid.length };
  }

  throw new Error('Invalid chat format. File must contain a valid OmniChat session or backup bundle.');
}

/** Import a session into localStorage and return it */
export function importSession(session: ChatSession): ChatSession {
  const existing = loadSessions();
  const id = existing.some((s) => s.id === session.id)
    ? `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    : session.id;
  const imported: ChatSession = {
    ...session,
    id,
    updatedAt: Date.now(),
  };
  saveSession(imported);
  return imported;
}

/** Import multiple sessions into localStorage */
export function importSessions(sessions: ChatSession[]): number {
  let importedCount = 0;
  for (const s of sessions) {
    try {
      importSession(s);
      importedCount++;
    } catch (e) {
      console.warn('Failed to import session', e);
    }
  }
  return importedCount;
}
