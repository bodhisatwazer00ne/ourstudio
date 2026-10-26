/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { UserAccount, DEMO_ACCOUNTS, getStoredUsers } from '../projectStorage';
import { ProjectRole, TeamMember } from '../types';
import { Check, ChevronDown, LogOut, Shield, Sparkles } from 'lucide-react';

interface CollaboratorSwitcherProps {
  currentUser: UserAccount;
  currentRole?: ProjectRole;
  onSwitchUser: (user: UserAccount) => void;
  onSwitchRole?: (role: ProjectRole) => void;
  onLogout?: () => void;
  compact?: boolean;
  projectTeam?: TeamMember[];
  projectCreatorId?: string;
}

export default function CollaboratorSwitcher({
  currentUser,
  currentRole,
  onSwitchUser,
  onSwitchRole,
  onLogout,
  compact = false,
  projectTeam,
  projectCreatorId
}: CollaboratorSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
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
        return 'Scoped Track Access (Assigned Lanes)';
      case 'Viewer':
      default:
        return 'Read-Only Audition & Review Comments';
    }
  };

  // Combine demo accounts and custom stored users if any
  const availableAccounts = React.useMemo(() => {
    try {
      const stored = getStoredUsers();
      const map = new Map<string, UserAccount>();
      DEMO_ACCOUNTS.forEach(a => map.set(a.email.toLowerCase(), a));
      stored.forEach(a => map.set(a.email.toLowerCase(), a));
      if (!map.has(currentUser.email.toLowerCase())) {
        map.set(currentUser.email.toLowerCase(), currentUser);
      }
      return Array.from(map.values());
    } catch {
      return DEMO_ACCOUNTS;
    }
  }, [currentUser]);

  // Filter accounts strictly to project team members when inside a project
  const displayAccounts = React.useMemo(() => {
    if (!projectTeam || projectTeam.length === 0) {
      return availableAccounts;
    }

    const teamEmails = new Set(projectTeam.map(t => (t.email || '').toLowerCase().trim()));
    const teamIds = new Set(projectTeam.map(t => t.id));
    if (projectCreatorId) teamIds.add(projectCreatorId);

    // Keep accounts from availableAccounts that match team emails or IDs, or current user
    const filtered = availableAccounts.filter(acc => {
      const emailMatch = acc.email && teamEmails.has(acc.email.toLowerCase().trim());
      const idMatch = teamIds.has(acc.id);
      const isCurrent = currentUser && acc.email && acc.email.toLowerCase() === currentUser.email.toLowerCase();
      return emailMatch || idMatch || isCurrent;
    });

    // Also include any projectTeam member who may not yet be in storedUsers/demo (e.g. freshly invited user)
    projectTeam.forEach(member => {
      const exists = filtered.some(
        f => (member.email && f.email.toLowerCase() === member.email.toLowerCase()) ||
             f.id === member.id
      );
      if (!exists) {
        filtered.push({
          id: member.id,
          name: member.name,
          username: member.username || member.name.toLowerCase().replace(/\s+/g, '_'),
          email: member.email,
          preferredRole: member.role,
          isDemo: false
        });
      }
    });

    return filtered;
  }, [availableAccounts, projectTeam, projectCreatorId, currentUser]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef} id="collaborator-switcher">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700 px-2.5 py-1.5 rounded-lg transition duration-150 cursor-pointer shadow-sm group focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        title="User account and session options"
      >
        <div className="w-6 h-6 rounded-md bg-blue-600/20 border border-blue-500/40 text-blue-400 text-[10px] font-bold font-mono flex items-center justify-center uppercase shrink-0">
          {(currentUser.username || currentUser.name || 'U').slice(0, 2)}
        </div>
        {!compact && (
          <div className="flex flex-col text-left leading-none">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors truncate max-w-[110px]">
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
            <span className="text-[9px] text-zinc-500 font-mono mt-0.5 truncate max-w-[150px]">
              @{currentUser.username || currentUser.name.toLowerCase()}
            </span>
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
          className={`text-zinc-500 group-hover:text-zinc-300 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-2 w-84 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-2.5 z-[100] animate-in fade-in duration-100 max-h-[85vh] overflow-y-auto"
        >
          {/* Account Profile Header */}
          <div className="px-2 py-2 border-b border-zinc-800/80 mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold font-mono flex items-center justify-center uppercase shrink-0">
                {(currentUser.username || currentUser.name || 'U').slice(0, 2)}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-zinc-100">{currentUser.name}</span>
                  <span
                    className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.2 rounded border leading-none ${getRoleBadgeStyle(
                      displayRole
                    )}`}
                  >
                    {displayRole}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">
                  @{currentUser.username || currentUser.name.toLowerCase()}
                </span>
              </div>
            </div>
            <span className="text-[9px] text-emerald-400 font-mono font-semibold bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.5 rounded flex items-center gap-1">
              <Sparkles size={10} /> Active
            </span>
          </div>

          {/* Section 2: Switch Project Collaborator */}
          <div className="border-t border-zinc-800/80 pt-2 mb-1">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
              <span>{projectTeam && projectTeam.length > 0 ? 'Project Team Members' : 'Switch Collaborator Persona'}</span>
              <span className="text-[9px] text-zinc-500 font-normal">
                {projectTeam && projectTeam.length > 0 ? `${displayAccounts.length} Collaborator${displayAccounts.length === 1 ? '' : 's'}` : 'Multi-user simulation'}
              </span>
            </div>
            <div className="space-y-1 mt-1 max-h-48 overflow-y-auto pr-0.5">
              {displayAccounts.map(demo => {
                const isSelected = demo.email.toLowerCase() === currentUser.email.toLowerCase();

                // Calculate role in active project if project context is available
                let inProjectRole: ProjectRole | null = null;
                if (projectTeam) {
                  if (demo.id === projectCreatorId) {
                    inProjectRole = 'Owner';
                  } else {
                    const m = projectTeam.find(item => item.email.toLowerCase() === demo.email.toLowerCase() || (item.username && demo.username && item.username.toLowerCase() === demo.username.toLowerCase()));
                    if (m) {
                      inProjectRole = m.role;
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
                        : 'bg-zinc-900/40 hover:bg-zinc-900 border-zinc-900 hover:border-zinc-800 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6.5 h-6.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-bold font-mono flex items-center justify-center uppercase shrink-0">
                        {(demo.username || demo.name || 'U').slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold truncate text-zinc-200">{demo.name}</span>
                          <span className="text-[9px] text-zinc-500 font-mono">@{demo.username}</span>
                          <span
                            className={`text-[7.5px] font-mono font-bold uppercase px-1 py-0.2 rounded border leading-none ${getRoleBadgeStyle(
                              badgeRole
                            )}`}
                          >
                            {badgeRole}
                          </span>
                        </div>
                        <p className="text-[9px] text-zinc-500 truncate mt-0.5">
                          {getAccountDescription(badgeRole)}
                        </p>
                      </div>
                    </div>

                    {isSelected ? (
                      <div className="p-0.5 text-emerald-400 bg-emerald-950/50 rounded-full border border-emerald-800/40 shrink-0 ml-1.5">
                        <Check size={11} />
                      </div>
                    ) : (
                      <span className="text-[9px] text-zinc-500 font-mono shrink-0 ml-1.5">
                        Switch
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Logout option */}
          {onLogout && (
            <div className="mt-2 pt-2 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center justify-center gap-2 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition duration-150 cursor-pointer border border-transparent hover:border-red-900/30"
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
