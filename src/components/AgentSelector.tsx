'use client';

import React from 'react';
import { AGENT_LIST, AGENTS } from '@/lib/agents';
import { AgentIcon } from './AgentIcon';
import type { AgentId } from '@/types';
import { ChevronRight, AlertTriangle } from 'lucide-react';

interface AgentSelectorProps {
  activeAgentId: AgentId;
  onSelectAgent: (id: AgentId) => void;
  onSelectPrompt: (prompt: string) => void;
  compact?: boolean;
}

export function AgentSelector({
  activeAgentId,
  onSelectAgent,
  onSelectPrompt,
  compact = false,
}: AgentSelectorProps) {
  const currentAgent = AGENTS[activeAgentId] || AGENTS.general;

  return (
    <div className="w-full flex flex-col gap-2.5">
      {/* Horizontal Agent Pills Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-700">
        {AGENT_LIST.map((agent) => {
          const isActive = agent.id === activeAgentId;
          return (
            <button
              key={agent.id}
              onClick={() => onSelectAgent(agent.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 border ${
                isActive
                  ? `${agent.color.pill} ring-1 ring-white/20 shadow-md ${agent.color.glow}`
                  : 'bg-slate-900/60 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <AgentIcon name={agent.iconName} className="w-3.5 h-3.5" />
              <span>{agent.name}</span>
              {agent.features.specialBadge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/30 text-slate-300">
                  {agent.features.specialBadge.split(' ')[0]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Expanded Agent Hero Card (hidden when compact) */}
      {!compact && (
        <div
          className={`rounded-xl p-4 border transition-all duration-300 ${currentAgent.color.bg} ${currentAgent.color.border}`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-lg bg-slate-900/80 border ${currentAgent.color.border} ${currentAgent.color.text}`}
              >
                <AgentIcon name={currentAgent.iconName} className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    {currentAgent.name}
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700">
                    {currentAgent.features.specialBadge || currentAgent.tagline}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  {currentAgent.description}
                </p>
              </div>
            </div>
          </div>

          {/* Medical/Legal disclaimer banner if needed */}
          {currentAgent.features.hasDisclaimer && currentAgent.features.disclaimerText && (
            <div className="mt-3 flex items-center gap-2 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-1.5 rounded-lg">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{currentAgent.features.disclaimerText}</span>
            </div>
          )}

          {/* Quick Starter Prompts */}
          <div className="mt-3.5 pt-3 border-t border-slate-700/50">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 block mb-2">
              Quick Suggestions for {currentAgent.name}:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {currentAgent.quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectPrompt(prompt)}
                  className="flex items-center gap-1.5 text-xs text-left bg-slate-900/70 hover:bg-slate-800 text-slate-200 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition"
                >
                  <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="line-clamp-1">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
