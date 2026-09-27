'use client';

import React from 'react';
import { AVAILABLE_MODELS, PROVIDER_LABELS } from '@/lib/models';
import { AGENTS } from '@/lib/agents';
import { AgentIcon } from './AgentIcon';
import type { AgentId, UserSettings } from '@/types';
import {
  Shield,
  ShieldAlert,
  Settings,
  PlusCircle,
  Menu,
  ChevronDown,
  Layers,
} from 'lucide-react';

interface HeaderProps {
  activeAgentId: AgentId;
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
  onNewChat: () => void;
}

export function Header({
  activeAgentId,
  settings,
  onUpdateSettings,
  onOpenSettings,
  onToggleSidebar,
  onNewChat,
}: HeaderProps) {
  const currentAgent = AGENTS[activeAgentId] || AGENTS.general;

  const handleTogglePrivacy = () => {
    const nextState = !settings.privacyMode;
    onUpdateSettings({
      privacyMode: nextState,
      selectedModel: nextState ? 'gemini-2.5-flash' : settings.preferredOpenAIModel || 'gpt-5.4-mini',
    });
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-3 sm:px-5 py-2.5">
      <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto">
        {/* Left: Sidebar trigger & Branding */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
            title="Chat History"
            aria-label="Toggle history sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-white tracking-tight leading-none flex items-center gap-1.5">
                OmniChat
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono font-medium">
                  All-in-One
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 leading-tight">
                Multi-Agent & Multi-Attachment Engine
              </p>
            </div>
          </div>

          {/* Current Agent Mini Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <AgentIcon name={currentAgent.iconName} className={`w-3.5 h-3.5 ${currentAgent.color.text}`} />
            <span className="text-slate-300 font-medium">{currentAgent.name}</span>
          </div>
        </div>

        {/* Center / Right: Model Selector & Privacy Mode & Actions */}
        <div className="flex items-center gap-2">
          {/* Privacy / Temporary Chat Toggle */}
          <button
            onClick={handleTogglePrivacy}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition border ${
              settings.privacyMode
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
            title={
              settings.privacyMode
                ? 'Privacy Mode ACTIVE: Strictly uses Gemini with paid zero-retention key. OpenAI is completely bypassed.'
                : 'Enable Privacy Mode (Switches exclusively to paid Gemini key with zero data sharing)'
            }
          >
            {settings.privacyMode ? (
              <>
                <Shield className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">Privacy Mode:</span>
                <span className="text-emerald-400 font-bold">Gemini Only</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Standard Mode</span>
              </>
            )}
          </button>

          {/* Model Selector Dropdown */}
          <div className="relative flex items-center">
            <select
              value={settings.selectedModel}
              onChange={(e) => onUpdateSettings({ selectedModel: e.target.value })}
              disabled={settings.privacyMode}
              className={`appearance-none bg-slate-900 border text-xs text-slate-200 rounded-lg pl-2.5 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition ${
                settings.privacyMode
                  ? 'border-emerald-500/30 opacity-80 cursor-not-allowed text-emerald-300'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {settings.privacyMode ? (
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Privacy Locked)</option>
              ) : (
                AVAILABLE_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({PROVIDER_LABELS[model.provider].badge})
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-2" />
          </div>

          {/* New Chat Button */}
          <button
            onClick={onNewChat}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm shadow-blue-600/30"
            title="Start new conversation"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="API Keys & Fallback Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
