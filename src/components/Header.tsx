'use client';

import { AVAILABLE_MODELS } from '@/lib/models';
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
  Sun,
  Moon,
  Download,
  Lock,
} from 'lucide-react';

interface HeaderProps {
  activeAgentId: AgentId;
  settings: UserSettings;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
  onNewChat: () => void;
  onOpenAgentModal: () => void;
  onExportCurrentChat: () => void;
  onLockWorkspace: () => void;
}

export function Header({
  activeAgentId,
  settings,
  theme,
  onToggleTheme,
  onUpdateSettings,
  onOpenSettings,
  onToggleSidebar,
  onNewChat,
  onOpenAgentModal,
  onExportCurrentChat,
  onLockWorkspace,
}: HeaderProps) {
  const currentAgent = AGENTS[activeAgentId] || AGENTS.general;

  const handleTogglePrivacy = () => {
    const nextState = !settings.privacyMode;
    onUpdateSettings({
      privacyMode: nextState,
      selectedModel: nextState ? 'gemini-flash-latest' : 'auto',
    });
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 backdrop-blur-md px-3 sm:px-5 py-2.5 transition-colors">
      <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto">
        {/* Left: Sidebar trigger & Branding */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Chat History"
            aria-label="Toggle history sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight leading-none flex items-center gap-1.5">
                OmniChat
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-mono font-medium">
                  v2.0
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Multi-Agent & Multi-Attachment Engine
              </p>
            </div>
          </div>

          {/* Active Agent Pill Button - Click to open Agent Modal */}
          <button
            onClick={onOpenAgentModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:border-blue-500/50 text-xs transition cursor-pointer shadow-xs"
            title="Click to switch between all 17 specialized AI agents"
          >
            <AgentIcon name={currentAgent.iconName} className={`w-3.5 h-3.5 ${currentAgent.color.text}`} />
            <span className="font-semibold text-slate-900 dark:text-slate-200">{currentAgent.name}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
          </button>
        </div>

        {/* Center / Right: Model Selector, Theme, Export, Lock & Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Privacy Toggle */}
          <button
            onClick={handleTogglePrivacy}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition border ${
              settings.privacyMode
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
            title={
              settings.privacyMode
                ? 'Privacy Mode ACTIVE: Strictly uses Gemini zero-retention paid key'
                : 'Enable Privacy Mode (Switches exclusively to Gemini with zero data retention)'
            }
          >
            {settings.privacyMode ? (
              <>
                <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                <span>Gemini Only</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                <span>Privacy Off</span>
              </>
            )}
          </button>

          {/* Model Selector Dropdown - Exact Listed Models Only */}
          <div className="relative flex items-center">
            <select
              value={settings.selectedModel}
              onChange={(e) => onUpdateSettings({ selectedModel: e.target.value })}
              disabled={settings.privacyMode}
              className={`appearance-none bg-slate-100 dark:bg-slate-900 border text-xs text-slate-900 dark:text-slate-200 rounded-xl pl-2.5 pr-7 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition ${
                settings.privacyMode
                  ? 'border-emerald-500/40 opacity-80 cursor-not-allowed text-emerald-600 dark:text-emerald-300'
                  : 'border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
              }`}
            >
              {settings.privacyMode ? (
                <option value="gemini-flash-latest">Gemini Flash (Privacy Mode)</option>
              ) : (
                <>
                  <option value="auto">⚡ Auto (Smart Fallback)</option>
                  {AVAILABLE_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </>
              )}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-2" />
          </div>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Quick Export Current Chat */}
          <button
            onClick={onExportCurrentChat}
            className="hidden sm:flex p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Export this conversation to JSON"
            aria-label="Export chat"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Lock Workspace */}
          <button
            onClick={onLockWorkspace}
            className="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
            title="Lock workspace with password"
            aria-label="Lock app"
          >
            <Lock className="w-4 h-4" />
          </button>

          {/* New Chat Button */}
          <button
            onClick={onNewChat}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm shadow-blue-600/25 active:scale-95"
            title="Start new conversation"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="API Keys & Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
