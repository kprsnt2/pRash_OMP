import type { ChatSession, UserSettings } from '@/types';

const SETTINGS_KEY = 'prash_chat_settings_v1';
const SESSIONS_KEY = 'prash_chat_sessions_v1';

export const DEFAULT_SETTINGS: UserSettings = {
  openaiApiKey: '',
  geminiApiKey: '',
  nvidiaApiKey: '',
  groqApiKey: '',
  selectedModel: 'gpt-5.4-mini',
  preferredOpenAIModel: 'gpt-5.4-mini',
  autoFallback: true,
  privacyMode: false,
};

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
