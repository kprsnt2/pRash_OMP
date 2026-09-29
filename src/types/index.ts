export type AgentId =
  | 'kidstory'
  | 'studybuddy'
  | 'worksheet'
  | 'dataanalyst'
  | 'doctor'
  | 'psycho'
  | 'spiritual'
  | 'legal'
  | 'fitness'
  | 'coder'
  | 'email'
  | 'finance'
  | 'chef'
  | 'travel'
  | 'career'
  | 'viral'
  | 'general';
export type ModelProvider = 'openai' | 'gemini' | 'nvidia' | 'groq';

export interface ModelOption {
  id: string;
  name: string;
  provider: ModelProvider;
  contextWindow: string;
  supportsVision: boolean;
  isDefault?: boolean;
  isBackup?: boolean;
  description?: string;
}

export interface AgentFeatures {
  allowsAttachments?: boolean;
  suggestedAttachmentType?: string;
  supportsPrint?: boolean;
  supportsReadAloud?: boolean;
  supportsFormulas?: boolean;
  hasDisclaimer?: boolean;
  disclaimerText?: string;
  specialBadge?: string;
}

export type AgentCategory = 'education' | 'productivity' | 'health' | 'creative' | 'mind' | 'general';

export interface AgentConfig {
  id: AgentId;
  name: string;
  tagline: string;
  description: string;
  category: AgentCategory;
  iconName: string;
  color: {
    bg: string;
    text: string;
    border: string;
    pill: string;
    glow: string;
  };
  systemPrompt: string;
  welcomeMessage: string;
  quickPrompts: string[];
  features: AgentFeatures;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  extractedText?: string;
  category: 'image' | 'pdf' | 'tabular' | 'code' | 'text' | 'other';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentId?: AgentId;
  attachments?: Attachment[];
  timestamp: number;
  modelUsed?: string;
  providerUsed?: ModelProvider;
  fallbackNote?: string;
  fallbackReason?: string;
  latencyMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  agentId: AgentId;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  isTemporary?: boolean;
}

export interface UserSettings {
  openaiApiKey: string;
  geminiApiKey: string;
  nvidiaApiKey: string;
  groqApiKey: string;
  selectedModel: string;
  preferredOpenAIModel: string;
  autoFallback: boolean;
  privacyMode: boolean; // Force Gemini only (paid key with zero training retention)
  theme?: 'dark' | 'light' | 'system';
}

export interface ChatBackupBundle {
  app: 'omnichat';
  version: number;
  exportedAt: number;
  session?: ChatSession;
  sessions?: ChatSession[];
}

export interface AuthState {
  authenticated: boolean;
  requiresPassword: boolean;
  error?: string;
}

export interface ChatApiRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    >;
  }>;
  agentId: AgentId;
  modelOverride?: string;
  privacyMode?: boolean;
  userKeys?: {
    openai?: string;
    gemini?: string;
    nvidia?: string;
    groq?: string;
  };
}
