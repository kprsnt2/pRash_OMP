'use client';

import { AGENT_LIST, AGENTS } from '@/lib/agents';
import { AgentIcon } from './AgentIcon';
import type { AgentId } from '@/types';
import { ChevronRight, AlertTriangle, Sparkles, SlidersHorizontal } from 'lucide-react';

interface AgentSelectorProps {
  activeAgentId: AgentId;
  onSelectAgent: (id: AgentId) => void;
  onSelectPrompt: (prompt: string) => void;
  onOpenAgentModal: () => void;
  compact?: boolean;
}

export function AgentSelector({
  activeAgentId,
  onSelectAgent,
  onSelectPrompt,
  onOpenAgentModal,
  compact = false,
}: AgentSelectorProps) {
  const currentAgent = AGENTS[activeAgentId] || AGENTS.general;

  // Curated quick agents for top row
  const popularIds: AgentId[] = ['kidstory', 'studybuddy', 'worksheet', 'doctor', 'dataanalyst', 'coder'];
  const popularAgents = AGENT_LIST.filter((a) => popularIds.includes(a.id) || a.id === activeAgentId);

  return (
    <div className="w-full flex flex-col gap-2.5">
      {/* Top Quick Bar: Active Agent + Quick Switcher + Explore All Modal Button */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {popularAgents.map((agent) => {
            const isActive = agent.id === activeAgentId;
            return (
              <button
                key={agent.id}
                onClick={() => onSelectAgent(agent.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition border ${
                  isActive
                    ? `${agent.color.pill} ring-1 ring-white/20 shadow-sm`
                    : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <AgentIcon name={agent.iconName} className="w-3.5 h-3.5" />
                <span>{agent.name}</span>
              </button>
            );
          })}

          <button
            onClick={onOpenAgentModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600/20 text-blue-300 border border-blue-500/40 hover:bg-blue-600/30 transition shadow-sm"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>All 17 Agents...</span>
          </button>
        </div>

        <button
          onClick={onOpenAgentModal}
          className="text-xs text-slate-400 hover:text-blue-400 flex items-center gap-1 transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Switch Agent Persona</span>
        </button>
      </div>

      {/* Expanded Agent Hero Card (hidden when conversation has messages) */}
      {!compact && (
        <div
          className={`rounded-2xl p-4 sm:p-5 border transition-all duration-300 shadow-lg ${currentAgent.color.bg} ${currentAgent.color.border}`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <div
                className={`p-3 rounded-xl bg-slate-900/90 border ${currentAgent.color.border} ${currentAgent.color.text} shadow-md`}
              >
                <AgentIcon name={currentAgent.iconName} className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    {currentAgent.name}
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-medium">
                    {currentAgent.features.specialBadge || currentAgent.tagline}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  {currentAgent.description}
                </p>
              </div>
            </div>

            <button
              onClick={onOpenAgentModal}
              className="self-start sm:self-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/90 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-600 transition"
            >
              Browse All Agents
            </button>
          </div>

          {/* Medical/Legal disclaimer banner if needed */}
          {currentAgent.features.hasDisclaimer && currentAgent.features.disclaimerText && (
            <div className="mt-3 flex items-center gap-2 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3.5 py-2 rounded-xl">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{currentAgent.features.disclaimerText}</span>
            </div>
          )}

          {/* Quick Starter Prompts */}
          <div className="mt-4 pt-3.5 border-t border-slate-700/50">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-600 dark:text-slate-400 block mb-2">
              Suggested Starters for {currentAgent.name}:
            </span>
            <div className="flex flex-wrap gap-2">
              {currentAgent.quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectPrompt(prompt)}
                  className="flex items-center gap-1.5 text-xs text-left bg-white/90 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 transition active:scale-[0.99]"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
