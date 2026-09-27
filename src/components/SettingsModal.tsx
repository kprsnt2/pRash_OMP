'use client';

import React, { useState, useEffect } from 'react';
import type { UserSettings, ModelProvider } from '@/types';
import {
  X,
  Key,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Eye,
  EyeOff,
  Cloud,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}: SettingsModalProps) {
  const [formData, setFormData] = useState<UserSettings>(settings);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testingProvider, setTestingProvider] = useState<ModelProvider | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, { ok: boolean; message: string }>
  >({});
  const [serverConfigured, setServerConfigured] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/models')
        .then((res) => res.json())
        .then((data) => {
          if (data && typeof data === 'object' && 'serverConfigured' in data) {
            setServerConfigured(data.serverConfigured);
          }
        })
        .catch((err) => console.error('Failed to check server keys', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleShowKey = (provider: string) => {
    setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleTestKey = async (provider: ModelProvider) => {
    const key =
      provider === 'openai'
        ? formData.openaiApiKey
        : provider === 'gemini'
        ? formData.geminiApiKey
        : provider === 'nvidia'
        ? formData.nvidiaApiKey
        : formData.groqApiKey;

    if (!key && !serverConfigured[provider]) {
      setTestResults((prev) => ({
        ...prev,
        [provider]: { ok: false, message: 'Please enter an API key to test' },
      }));
      return;
    }

    setTestingProvider(provider);
    setTestResults((prev) => ({ ...prev, [provider]: undefined! }));

    try {
      const res = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: key }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestResults((prev) => ({
          ...prev,
          [provider]: { ok: true, message: `Connected successfully (${data.model})` },
        }));
      } else {
        setTestResults((prev) => ({
          ...prev,
          [provider]: { ok: false, message: data.error || 'Connection failed' },
        }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResults((prev) => ({
        ...prev,
        [provider]: { ok: false, message: msg },
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  const handleSave = () => {
    onSaveSettings(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Settings & API Keys
              </h2>
              <p className="text-xs text-slate-400">
                Personal API keys are stored safely in your browser localStorage
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin text-xs">
          {/* Privacy Mode Explainer Callout */}
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Zero-Retention Privacy Guarantee</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              When Privacy Mode is enabled, all requests strictly bypass OpenAI and route exclusively to
              your paid Google Gemini key (which does not use customer prompts for training). Conversations
              in Privacy Mode are also marked temporary and never stored in history.
            </p>
          </div>

          {/* Provider API Keys */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-300 tracking-wider uppercase">
              Provider API Keys (Fallback Chain)
            </h3>

            {/* 1. OpenAI (Primary) */}
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-200 flex items-center gap-2">
                  <span>1. OpenAI API Key (Primary ChatGPT)</span>
                  {serverConfigured.openai && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                      Server env configured
                    </span>
                  )}
                </label>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>Get Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-[11px] text-slate-400">
                Default: <code className="text-blue-300 font-mono">gpt-5.4-mini</code> /{' '}
                <code className="text-blue-300 font-mono">gpt-5.4-nano</code> (auto-fallbacks to gpt-4o-mini if 5.4 not provisioned).
              </p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKeys.openai ? 'text' : 'password'}
                    value={formData.openaiApiKey}
                    onChange={(e) => setFormData({ ...formData, openaiApiKey: e.target.value })}
                    placeholder={serverConfigured.openai ? 'Using server key (or enter custom key)' : 'sk-proj-...'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 pr-9 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('openai')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showKeys.openai ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleTestKey('openai')}
                  disabled={testingProvider === 'openai'}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium shrink-0 flex items-center gap-1.5"
                >
                  {testingProvider === 'openai' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : null}
                  <span>Test</span>
                </button>
              </div>
              {testResults.openai && (
                <div
                  className={`flex items-center gap-1.5 text-[11px] ${
                    testResults.openai.ok ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {testResults.openai.ok ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  <span>{testResults.openai.message}</span>
                </div>
              )}
            </div>

            {/* 2. Google Gemini (Backup 1 & Privacy Mode) */}
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-200 flex items-center gap-2">
                  <span>2. Google Gemini API Key (Backup 1 & Privacy Key)</span>
                  {serverConfigured.gemini && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                      Server env configured
                    </span>
                  )}
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>Get Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-[11px] text-slate-400">
                Model: <code className="text-blue-300 font-mono">gemini-2.5-flash</code> /{' '}
                <code className="text-blue-300 font-mono">gemini-flash-latest</code>. High-speed multimodal & paid zero-training retention.
              </p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKeys.gemini ? 'text' : 'password'}
                    value={formData.geminiApiKey}
                    onChange={(e) => setFormData({ ...formData, geminiApiKey: e.target.value })}
                    placeholder={serverConfigured.gemini ? 'Using server key (or enter custom key)' : 'AIzaSy...'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 pr-9 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('gemini')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showKeys.gemini ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleTestKey('gemini')}
                  disabled={testingProvider === 'gemini'}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium shrink-0 flex items-center gap-1.5"
                >
                  {testingProvider === 'gemini' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : null}
                  <span>Test</span>
                </button>
              </div>
              {testResults.gemini && (
                <div
                  className={`flex items-center gap-1.5 text-[11px] ${
                    testResults.gemini.ok ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {testResults.gemini.ok ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  <span>{testResults.gemini.message}</span>
                </div>
              )}
            </div>

            {/* 3. NVIDIA NIM (Backup 2) */}
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-200 flex items-center gap-2">
                  <span>3. NVIDIA NIM API Key (Backup 2)</span>
                  {serverConfigured.nvidia && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                      Server env configured
                    </span>
                  )}
                </label>
                <a
                  href="https://build.nvidia.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>Get Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-[11px] text-slate-400">
                Model: <code className="text-blue-300 font-mono">meta/llama-3.3-70b-instruct</code> via NVIDIA NIM.
              </p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKeys.nvidia ? 'text' : 'password'}
                    value={formData.nvidiaApiKey}
                    onChange={(e) => setFormData({ ...formData, nvidiaApiKey: e.target.value })}
                    placeholder={serverConfigured.nvidia ? 'Using server key (or enter custom key)' : 'nvapi-...'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 pr-9 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('nvidia')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showKeys.nvidia ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleTestKey('nvidia')}
                  disabled={testingProvider === 'nvidia'}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium shrink-0 flex items-center gap-1.5"
                >
                  {testingProvider === 'nvidia' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : null}
                  <span>Test</span>
                </button>
              </div>
              {testResults.nvidia && (
                <div
                  className={`flex items-center gap-1.5 text-[11px] ${
                    testResults.nvidia.ok ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {testResults.nvidia.ok ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  <span>{testResults.nvidia.message}</span>
                </div>
              )}
            </div>

            {/* 4. Groq (Backup 3) */}
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-200 flex items-center gap-2">
                  <span>4. Groq API Key (Backup 3)</span>
                  {serverConfigured.groq && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                      Server env configured
                    </span>
                  )}
                </label>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>Get Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-[11px] text-slate-400">
                Model: <code className="text-blue-300 font-mono">llama-3.3-70b-versatile</code>. Ultra-fast LPU inference fallback.
              </p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKeys.groq ? 'text' : 'password'}
                    value={formData.groqApiKey}
                    onChange={(e) => setFormData({ ...formData, groqApiKey: e.target.value })}
                    placeholder={serverConfigured.groq ? 'Using server key (or enter custom key)' : 'gsk_...'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 pr-9 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('groq')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showKeys.groq ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleTestKey('groq')}
                  disabled={testingProvider === 'groq'}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium shrink-0 flex items-center gap-1.5"
                >
                  {testingProvider === 'groq' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : null}
                  <span>Test</span>
                </button>
              </div>
              {testResults.groq && (
                <div
                  className={`flex items-center gap-1.5 text-[11px] ${
                    testResults.groq.ok ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {testResults.groq.ok ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  <span>{testResults.groq.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Preferences */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
            <h4 className="font-semibold text-slate-200">Execution Preferences</h4>

            {/* Auto Fallback Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-slate-300">Automatic Fallback Engine</span>
                <p className="text-[11px] text-slate-500">
                  When primary provider is rate-limited or errors, cascade to Gemini → NVIDIA → Groq
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.autoFallback}
                onChange={(e) => setFormData({ ...formData, autoFallback: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 bg-slate-950 border-slate-700 cursor-pointer"
              />
            </div>

            {/* Preferred OpenAI model */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <span className="font-medium text-slate-300">Default OpenAI Model</span>
                <p className="text-[11px] text-slate-500">Target model for ChatGPT requests</p>
              </div>
              <select
                value={formData.preferredOpenAIModel}
                onChange={(e) => setFormData({ ...formData, preferredOpenAIModel: e.target.value })}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
              >
                <option value="gpt-5.4-mini">gpt-5.4-mini (Recommended)</option>
                <option value="gpt-5.4-nano">gpt-5.4-nano</option>
                <option value="gpt-4o-mini">gpt-4o-mini</option>
                <option value="gpt-4o">gpt-4o</option>
              </select>
            </div>
          </div>

          {/* Vercel / Cloudflare Deployment Instructions */}
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-blue-300">
              <Cloud className="w-4 h-4" />
              <span>Vercel / Cloudflare Hosting</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              To use environment variables permanently across all your devices without re-entering keys,
              add the following in your Vercel or Cloudflare project settings:
            </p>
            <div className="p-2 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-300 space-y-0.5">
              <p>OPENAI_API_KEY=your_key_here</p>
              <p>GEMINI_API_KEY=your_key_here</p>
              <p>NVIDIA_API_KEY=your_key_here</p>
              <p>GROQ_API_KEY=your_key_here</p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2 bg-slate-950">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-600/30 transition"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
