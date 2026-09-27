'use client';

import React, { useState } from 'react';
import { AGENTS } from '@/lib/agents';
import { AgentIcon } from './AgentIcon';
import type { ChatSession } from '@/types';
import {
  X,
  MessageSquare,
  Trash2,
  Search,
  PlusCircle,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onClearAll: () => void;
  onNewChat: () => void;
}

export function Sidebar({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onClearAll,
  onNewChat,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity lg:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className="fixed inset-y-0 left-0 z-50 w-72 sm:w-80 bg-slate-950 border-r border-slate-800 flex flex-col shadow-2xl transition-transform duration-300">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">Conversations</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Button & Search */}
        <div className="p-3 border-b border-slate-800 space-y-2">
          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Start New Chat</span>
          </button>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-700"
            />
          </div>
        </div>

        {/* Privacy notice banner */}
        <div className="mx-3 my-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong>Zero Retention Active:</strong> Privacy / temporary chats are never saved to history.
          </span>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          {filteredSessions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 px-4">
              {searchQuery ? 'No matching chats found.' : 'No saved conversations yet.'}
            </div>
          ) : (
            filteredSessions.map((session) => {
              const agent = AGENTS[session.agentId] || AGENTS.general;
              const isSelected = session.id === currentSessionId;

              return (
                <div
                  key={session.id}
                  onClick={() => {
                    onSelectSession(session.id);
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition border ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-700 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-900/60 border-transparent hover:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1">
                    <div
                      className={`p-1.5 rounded-md ${agent.color.bg} ${agent.color.text} shrink-0`}
                    >
                      <AgentIcon name={agent.iconName} className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-slate-200">{session.title}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                        <Calendar className="w-2.5 h-2.5" />
                        <span>{new Date(session.updatedAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{agent.name}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition shrink-0"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {sessions.length > 0 && (
          <div className="p-3 border-t border-slate-800">
            <button
              onClick={() => {
                if (confirm('Clear all conversation history? This cannot be undone.')) {
                  onClearAll();
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-slate-500 hover:text-rose-400 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear all conversations</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
