'use client';

import React, { useState } from 'react';
import { AGENT_LIST } from '@/lib/agents';
import { AgentIcon } from './AgentIcon';
import type { AgentCategory, AgentId } from '@/types';
import {
  X,
  Search,
  Check,
  Sparkles,
  GraduationCap,
  Briefcase,
  HeartPulse,
  Compass,
  Layers,
} from 'lucide-react';

interface AgentModalProps {
  isOpen: boolean;
  activeAgentId: AgentId;
  onSelectAgent: (id: AgentId) => void;
  onClose: () => void;
}

export function AgentModal({
  isOpen,
  activeAgentId,
  onSelectAgent,
  onClose,
}: AgentModalProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AgentCategory | 'all'>('all');

  if (!isOpen) return null;

  const categories: Array<{ id: AgentCategory | 'all'; label: string; icon: React.ReactNode }> = [
    { id: 'all', label: 'All Agents', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'education', label: 'Education & Study', icon: <GraduationCap className="w-3.5 h-3.5" /> },
    { id: 'productivity', label: 'Work & Code', icon: <Briefcase className="w-3.5 h-3.5" /> },
    { id: 'health', label: 'Health & Life', icon: <HeartPulse className="w-3.5 h-3.5" /> },
    { id: 'creative', label: 'Stories & Creative', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'mind', label: 'Mind & Philosophy', icon: <Compass className="w-3.5 h-3.5" /> },
  ];

  const filteredAgents = AGENT_LIST.filter((agent) => {
    const matchesCategory = selectedCategory === 'all' || agent.category === selectedCategory;
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      agent.name.toLowerCase().includes(q) ||
      agent.tagline.toLowerCase().includes(q) ||
      agent.description.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Switch Agent Persona
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
                  {AGENT_LIST.length} Available
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Switch anytime in the middle of a chat — conversation context is preserved!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
            aria-label="Close agent picker"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Tabs */}
        <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900/60 space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by agent name, skill (e.g. math, prescription, bedtime, code, contract)..."
              autoFocus
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                      : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Agent Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAgents.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-slate-400">
              No matching agents found. Try a different keyword or category.
            </div>
          ) : (
            filteredAgents.map((agent) => {
              const isSelected = agent.id === activeAgentId;
              return (
                <div
                  key={agent.id}
                  onClick={() => {
                    onSelectAgent(agent.id);
                    onClose();
                  }}
                  className={`group relative flex flex-col justify-between p-3.5 rounded-xl cursor-pointer transition border text-left ${
                    isSelected
                      ? `${agent.color.bg} ${agent.color.border} ring-1 ring-blue-500 shadow-md`
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-2 rounded-lg bg-slate-900 border ${agent.color.border} ${agent.color.text}`}
                        >
                          <AgentIcon name={agent.iconName} className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-100 group-hover:text-blue-300 transition">
                            {agent.name}
                          </h3>
                          <span className="text-[10px] text-slate-400 line-clamp-1">
                            {agent.tagline}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="p-1 rounded-full bg-blue-600 text-white shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mt-1">
                      {agent.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 capitalize">
                      {agent.category}
                    </span>
                    {agent.features.specialBadge && (
                      <span className="font-medium text-slate-300">
                        {agent.features.specialBadge}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
