/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { UserAccount, DEMO_ACCOUNTS } from '../projectStorage';
import { ProjectRole } from '../types';
import { Users, Check, ChevronDown, LogOut, Shield, UserCheck } from 'lucide-react';

interface CollaboratorSwitcherProps {
  currentUser: UserAccount;
  currentRole?: ProjectRole;
  onSwitchUser: (user: UserAccount) => void;
  onLogout?: () => void;
  compact?: boolean;
  projectTeam?: Array<{ id: string; name: string; email: string; role: ProjectRole }>;
  projectCreatorId?: string;
}

export default function CollaboratorSwitcher({
  currentUser,
  currentRole,
  onSwitchUser,
  onLogout,
  compact = false,
  projectTeam,
  projectCreatorId
}: CollaboratorSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const displayRole: ProjectRole = currentRole || currentUser.preferredRole || 'Viewer';

  const getRoleBadgeStyle = (role: ProjectRole) => {
    switch (role) {
      case 'Owner':
        return 'text-purple-400 bg-purple-950/70 border-purple-800/50';
      case 'Producer':
        return 'text-rose-400 bg-rose-950/70 border-rose-800/50';
      case 'Editor':
        return 'text-blue-400 bg-blue-950/70 border-blue-800/50';
      case 'Track Editor':
        return 'text-amber-400 bg-amber-950/70 border-amber-800/50';
      case 'Viewer':
      default:
        return 'text-zinc-400 bg-zinc-900 border-zinc-700/60';
    }
  };

  const getAccountDescription = (role: ProjectRole) => {
    switch (role) {
      case 'Owner':
        return 'Full Project Admin & Branch Authority';
      case 'Producer':
        return 'Mix, Audio Recording & Merge Approvals';
      case 'Editor':
        return 'Timeline Clips, Automation & MRs';
      case 'Track Editor':
        return 'Scoped Track Access (Rhodes & FX)';
      case 'Viewer':
      default:
        return 'Read-Only Audition & Review Comments';
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef} id="collaborator-switcher">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 px-2.5 py-1.5 rounded-lg transition duration-150 cursor-pointer shadow-sm group focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        title="Switch demo collaborator account"
      >
        <img
          src={currentUser.avatar}
          alt={currentUser.name}
          referrerPolicy="no-referrer"
          className="w-6 h-6 rounded-full object-cover border border-zinc-700 group-hover:border-zinc-500 transition-colors"
        />
        {!compact && (
          <div className="flex flex-col text-left leading-none">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors">
                {currentUser.name}
              </span>
              <span
                className={`text-[8.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border leading-none ${getRoleBadgeStyle(
                  displayRole
                )}`}
              >
                {displayRole}
              </span>
            </div>
            <span className="text-[9px] text-zinc-500 font-mono mt-0.5">{currentUser.email}</span>
          </div>
        )}
        {compact && (
          <span
            className={`text-[8.5px] font-mono font-bold uppercase px-1 py-0.5 rounded border leading-none ${getRoleBadgeStyle(
              displayRole
            )}`}
          >
            {displayRole}
          </span>
        )}
        <ChevronDown
          size={13}
          className={`text-zinc-500 group-hover:text-zinc-300 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="px-2.5 py-2 border-b border-zinc-800/80 mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Users size={14} className="text-blue-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Demo Collaborators</span>
            </div>
            <span className="text-[9px] text-emerald-400 font-mono font-semibold bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.5 rounded">
              Multi-Role Ready
            </span>
          </div>

          <div className="px-2.5 py-1 text-[10px] text-zinc-400 leading-tight mb-2">
            Switch persona to test real-time collaboration, role permissions, and track lock boundaries:
          </div>

          <div className="space-y-1 max-h-72 overflow-y-auto pr-0.5">
            {DEMO_ACCOUNTS.map(demo => {
              const isSelected = demo.email.toLowerCase() === currentUser.email.toLowerCase();

              // Calculate role in active project if project context is available
              let inProjectRole: ProjectRole | null = null;
              let isMemberOfProject = true;
              if (projectTeam) {
                if (demo.id === projectCreatorId) {
                  inProjectRole = 'Owner';
                } else {
                  const m = projectTeam.find(item => item.email.toLowerCase() === demo.email.toLowerCase());
                  if (m) {
                    inProjectRole = m.role;
                  } else {
                    isMemberOfProject = false;
                  }
                }
              }

              const badgeRole = inProjectRole || demo.preferredRole;

              return (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => {
                    onSwitchUser(demo);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition duration-150 cursor-pointer border ${
                    isSelected
                      ? 'bg-blue-950/30 border-blue-500/40 text-white'
                      : 'bg-zinc-900/50 hover:bg-zinc-900 border-zinc-900 hover:border-zinc-800 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={demo.avatar}
                      alt={demo.name}
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full object-cover border border-zinc-800 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold truncate text-zinc-200">{demo.name}</span>
                        {projectTeam ? (
                          isMemberOfProject ? (
                            <span
                              className={`text-[8px] font-mono font-bold uppercase px-1 py-0.2 rounded border leading-none ${getRoleBadgeStyle(
                                badgeRole
                              )}`}
                            >
                              {badgeRole}
                            </span>
                          ) : (
                            <span className="text-[7.5px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-1 py-0.2 rounded">
                              Dashboard
                            </span>
                          )
                        ) : (
                          <span
                            className={`text-[8px] font-mono font-bold uppercase px-1 py-0.2 rounded border leading-none ${getRoleBadgeStyle(
                              demo.preferredRole
                            )}`}
                          >
                            {demo.preferredRole}
                          </span>
                        )}
                      </div>
                      <p className="text-[9.5px] text-zinc-500 truncate mt-0.5">
                        {projectTeam && !isMemberOfProject
                          ? 'Not in project (Opens Dashboard)'
                          : getAccountDescription(badgeRole)}
                      </p>
                    </div>
                  </div>

                  {isSelected ? (
                    <div className="p-1 text-emerald-400 bg-emerald-950/50 rounded-full border border-emerald-800/40 shrink-0 ml-2">
                      <Check size={12} />
                    </div>
                  ) : (
                    <span className="text-[9px] text-zinc-600 font-mono shrink-0 ml-2 opacity-0 group-hover:opacity-100">
                      Switch
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {onLogout && (
            <div className="mt-2 pt-2 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition duration-150 cursor-pointer"
              >
                <LogOut size={13} />
                <span>Log Out of Session</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
