/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TeamMember } from '../types';
import { Activity, Radio, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';

interface CollaborationActivityProps {
  onlineMembers: TeamMember[];
  activityLogs: { id: string; timestamp: string; message: string; type: string }[];
  isCollapsible?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function CollaborationActivity({
  onlineMembers,
  activityLogs,
  isCollapsible = false,
  isCollapsed = false,
  onToggleCollapse
}: CollaborationActivityProps) {
  return (
    <div className={`bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex flex-col gap-4 transition-all duration-200 ${isCollapsed ? 'pb-2 h-auto' : 'h-full'}`} id="collab-activity-container">
      {/* Panel Header (Main) */}
      <div 
        className={`flex items-center justify-between ${isCollapsed ? '' : 'border-b border-zinc-900 pb-3'} ${isCollapsible ? 'cursor-pointer select-none' : ''}`}
        onClick={() => {
          if (isCollapsible && onToggleCollapse) {
            onToggleCollapse();
          }
        }}
      >
        <div className="flex items-center gap-1.5 text-zinc-350">
          <Activity size={14} className="text-blue-400" />
          <h4 className="text-[11px] font-bold uppercase tracking-wider">Session Activity Tracker</h4>
        </div>
        {isCollapsible && onToggleCollapse && (
          <button
            type="button"
            className="text-zinc-500 hover:text-white transition p-0.5"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse();
            }}
          >
            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        )}
      </div>

      {!isCollapsed && (
        <>
          {/* Active members */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              {onlineMembers.map(member => (
                <div key={member.id} className="flex items-center gap-2 bg-zinc-900 px-2.5 py-1.5 rounded-lg border border-zinc-800 select-none">
                  <div className="relative">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-full object-cover border border-zinc-800"
                    />
                    <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-blue-400 rounded-full ring-1 ring-zinc-950 animate-pulse"></span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-zinc-200 leading-none">{member.name.split(' ')[0]}</span>
                    <span className="text-[8px] text-zinc-500 font-semibold uppercase">{member.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Session operations feed */}
          <div className="flex-1 flex flex-col gap-2 min-h-[140px]">
            <div className="flex items-center gap-1.5 border-b border-zinc-900 pb-2 text-zinc-350">
              <Activity size={14} className="text-blue-400" />
              <h4 className="text-[11px] font-bold uppercase tracking-wider">Session Activity Feed</h4>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-[10px] max-h-[180px]">
              {activityLogs.length === 0 ? (
                <div className="text-zinc-650 text-center py-4">
                  [Waiting for active events...]
                </div>
              ) : (
                activityLogs.map(log => (
                  <div key={log.id} className="p-1.5 bg-zinc-900/40 rounded border border-zinc-900/50 flex items-start gap-1.5 leading-normal">
                    <ArrowRight size={10} className="text-blue-400 mt-1 shrink-0 select-none" />
                    <div className="flex-1">
                      <span className="text-zinc-300">{log.message}</span>
                      <span className="text-[8.5px] text-zinc-600 block mt-0.5">{log.timestamp} | Operation logged</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
