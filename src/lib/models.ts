import { ModelOption, ModelProvider } from '@/types';

export const AVAILABLE_MODELS: ModelOption[] = [
  // OpenAI Models
  {
    id: 'gpt-5.4-mini',
    name: 'ChatGPT GPT-5.4 Mini',
    provider: 'openai',
    contextWindow: '128k',
    supportsVision: true,
    isDefault: true,
    description: 'Fast, high-efficiency next-gen flagship (Default)',
  },
  {
    id: 'gpt-5.4-nano',
    name: 'ChatGPT GPT-5.4 Nano',
    provider: 'openai',
    contextWindow: '128k',
    supportsVision: true,
    description: 'Ultra-lightweight, rapid inference model',
  },
  {
    id: 'gpt-4o-mini',
    name: 'ChatGPT GPT-4o Mini',
    provider: 'openai',
    contextWindow: '128k',
    supportsVision: true,
    description: 'Reliable, cost-effective multimodal workhorse',
  },
  {
    id: 'gpt-4o',
    name: 'ChatGPT GPT-4o',
    provider: 'openai',
    contextWindow: '128k',
    supportsVision: true,
    description: 'Full capabilities frontier model for difficult reasoning',
  },

  // Google Gemini Models
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    contextWindow: '1M',
    supportsVision: true,
    isBackup: true,
    description: 'Primary Backup & Zero-Retention Privacy model',
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash Latest',
    provider: 'gemini',
    contextWindow: '1M',
    supportsVision: true,
    description: 'Google high-speed multimodal model',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'gemini',
    contextWindow: '2M',
    supportsVision: true,
    description: 'Deep reasoning, massive 2M token context window',
  },

  // NVIDIA NIM Models
  {
    id: 'meta/llama-3.3-70b-instruct',
    name: 'NVIDIA Llama 3.3 70B',
    provider: 'nvidia',
    contextWindow: '128k',
    supportsVision: false,
    description: 'High-throughput enterprise open-weights via NVIDIA NIM',
  },
  {
    id: 'nvidia/llama-3.1-nemotron-70b-instruct',
    name: 'NVIDIA Nemotron 70B',
    provider: 'nvidia',
    contextWindow: '128k',
    supportsVision: false,
    description: 'NVIDIA fine-tuned alignment for complex instruction following',
  },

  // Groq Models
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Groq Llama 3.3 70B',
    provider: 'groq',
    contextWindow: '128k',
    supportsVision: false,
    description: 'Ultra-fast LPU inference (500+ tokens/sec)',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Groq Llama 3.1 8B Instant',
    provider: 'groq',
    contextWindow: '128k',
    supportsVision: false,
    description: 'Near-instantaneous token generation speed',
  },
];

export const PROVIDER_LABELS: Record<ModelProvider, { name: string; badge: string; color: string }> = {
  openai: {
    name: 'OpenAI (ChatGPT)',
    badge: 'OpenAI',
    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  gemini: {
    name: 'Google Gemini',
    badge: 'Gemini',
    color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  nvidia: {
    name: 'NVIDIA NIM',
    badge: 'NVIDIA',
    color: 'bg-lime-500/20 text-lime-300 border-lime-500/30',
  },
  groq: {
    name: 'Groq LPU',
    badge: 'Groq',
    color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
};

export const DEFAULT_FALLBACK_CHAIN: Array<{ provider: ModelProvider; model: string }> = [
  { provider: 'openai', model: 'gpt-5.4-mini' },
  { provider: 'gemini', model: 'gemini-2.5-flash' },
  { provider: 'nvidia', model: 'meta/llama-3.3-70b-instruct' },
  { provider: 'groq', model: 'llama-3.3-70b-versatile' },
];

export const PRIVACY_FALLBACK_CHAIN: Array<{ provider: ModelProvider; model: string }> = [
  { provider: 'gemini', model: 'gemini-2.5-flash' },
  { provider: 'gemini', model: 'gemini-flash-latest' },
];
