import { ModelOption, ModelProvider } from '@/types';

// The canonical default models as requested
export const CANONICAL_MODELS: Record<ModelProvider, string> = {
  openai: 'gpt-5.4-mini',
  gemini: 'gemini-flash-latest',
  nvidia: 'meta/llama-3.2-90b-vision-instruct',
  groq: 'meta-llama/llama-4-scout-17b-16e-instruct',
};

/** Get the configured model for a provider, respecting environment variable overrides */
export function getModelForProvider(provider: ModelProvider): string {
  if (typeof process !== 'undefined' && process.env) {
    if (provider === 'openai' && process.env.OPENAI_MODEL?.trim()) {
      return process.env.OPENAI_MODEL.trim();
    }
    if (provider === 'gemini' && process.env.GEMINI_MODEL?.trim()) {
      return process.env.GEMINI_MODEL.trim();
    }
    if (provider === 'nvidia' && process.env.NVIDIA_MODEL?.trim()) {
      return process.env.NVIDIA_MODEL.trim();
    }
    if (provider === 'groq' && process.env.GROQ_MODEL?.trim()) {
      return process.env.GROQ_MODEL.trim();
    }
  }
  return CANONICAL_MODELS[provider];
}

/** Get the global default model if set via DEFAULT_MODEL env var */
export function getGlobalDefaultModel(): string {
  if (typeof process !== 'undefined' && process.env?.DEFAULT_MODEL?.trim()) {
    return process.env.DEFAULT_MODEL.trim();
  }
  return CANONICAL_MODELS.openai;
}

export const PROVIDER_LABELS: Record<ModelProvider, { name: string; badge: string; color: string }> = {
  openai: {
    name: 'OpenAI',
    badge: 'OpenAI',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  gemini: {
    name: 'Google Gemini',
    badge: 'Gemini',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  nvidia: {
    name: 'NVIDIA NIM',
    badge: 'NVIDIA',
    color: 'bg-lime-500/20 text-lime-400 border-lime-500/30',
  },
  groq: {
    name: 'Groq LPU',
    badge: 'Groq',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
};

/** Only the 4 listed models requested by the user, dynamically resolved */
export function getAvailableModels(): ModelOption[] {
  const openaiModel = getModelForProvider('openai');
  const geminiModel = getModelForProvider('gemini');
  const nvidiaModel = getModelForProvider('nvidia');
  const groqModel = getModelForProvider('groq');

  return [
    {
      id: openaiModel,
      name: `OpenAI · ${openaiModel}`,
      provider: 'openai',
      contextWindow: '128k',
      supportsVision: true,
      isDefault: true,
      description: 'Primary flagship model with advanced multimodal reasoning',
    },
    {
      id: geminiModel,
      name: `Google Gemini · ${geminiModel}`,
      provider: 'gemini',
      contextWindow: '1M',
      supportsVision: true,
      isBackup: true,
      description: 'Ultra-fast multimodal with zero-retention privacy mode',
    },
    {
      id: nvidiaModel,
      name: `NVIDIA NIM · ${nvidiaModel}`,
      provider: 'nvidia',
      contextWindow: '128k',
      supportsVision: true,
      description: 'Enterprise open-weights inference hosted on NVIDIA NIM',
    },
    {
      id: groqModel,
      name: `Groq LPU · ${groqModel}`,
      provider: 'groq',
      contextWindow: '128k',
      supportsVision: true,
      description: 'Ultra-fast LPU inference (500+ tokens/sec) open weights',
    },
  ];
}

export const AVAILABLE_MODELS: ModelOption[] = getAvailableModels();

export const DEFAULT_FALLBACK_CHAIN: Array<{ provider: ModelProvider; model: string }> = [
  { provider: 'gemini', model: CANONICAL_MODELS.gemini },
  { provider: 'openai', model: CANONICAL_MODELS.openai },
  { provider: 'groq', model: CANONICAL_MODELS.groq },
  { provider: 'nvidia', model: CANONICAL_MODELS.nvidia },
];

export const PRIVACY_FALLBACK_CHAIN: Array<{ provider: ModelProvider; model: string }> = [
  { provider: 'gemini', model: CANONICAL_MODELS.gemini },
  { provider: 'gemini', model: 'gemini-2.5-flash' },
];
