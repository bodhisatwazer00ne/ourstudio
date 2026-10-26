/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TeamMember, ProjectRole, Track } from '../types';
import { Users, UserPlus, Shield, Check, Lock, X, AlertCircle, Trash2, CheckCircle2, UserCheck, AtSign, Search, Sparkles } from 'lucide-react';
import { getStoredUsers, saveUsers, DEMO_ACCOUNTS, UserAccount, fetchUsersFromFirestore } from '../projectStorage';

interface TeamManagementProps {
  team: TeamMember[];
  tracks: Track[];
  currentUserRole: ProjectRole;
  onInviteMember: (
    name: string,
    email: string,
    role: ProjectRole,
    assignedTrackIds?: string[],
    avatar?: string,
    canAddTracks?: boolean,
    username?: string
  ) => void;
  onUpdateMemberRole: (
    id: string,
    role: ProjectRole,
    assignedTrackIds?: string[],
    canAddTracks?: boolean
  ) => void;
  onRemoveMember: (id: string) => void;
  onAddActivity: (type: string, message: string) => void;
  onSwitchUser?: (user: UserAccount) => void;
  currentUserEmail?: string;
}

export default function TeamManagement({
  team,
  tracks,
  currentUserRole,
  onInviteMember,
  onUpdateMemberRole,
  onRemoveMember,
  onAddActivity,
  onSwitchUser,
  currentUserEmail
}: TeamManagementProps) {
  const [registeredUsers, setRegisteredUsers] = useState<UserAccount[]>(() => getStoredUsers());
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<ProjectRole>('Editor');
  const [inviteCanAddTracks, setInviteCanAddTracks] = useState(true);
  const [selectedInviteTrackIds, setSelectedInviteTrackIds] = useState<string[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(team[0]?.id || null);

  // Sync users from Firestore in background so all devices share newly created accounts
  useEffect(() => {
    fetchUsersFromFirestore().then(cloudUsers => {
      if (cloudUsers && cloudUsers.length > 0) {
        setRegisteredUsers(cloudUsers);
      }
    });
  }, []);

  // Modal state for removing collaborator safely without window.confirm
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);

  // In-app feedback toast
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(prev => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // Inspector edit state for the selected member
  const selectedMember = team.find(m => m.id === selectedMemberId);
  const [editRole, setEditRole] = useState<ProjectRole>(selectedMember?.role || 'Editor');
  const [editCanAddTracks, setEditCanAddTracks] = useState<boolean>(
    selectedMember?.canAddTracks ?? (selectedMember?.role === 'Producer' || selectedMember?.role === 'Owner')
  );
  const [editTrackIds, setEditTrackIds] = useState<string[]>(
    selectedMember?.assignedTrackIds || []
  );

  // Synchronize inspector edit state when selected member changes
  useEffect(() => {
    if (selectedMember) {
      setEditRole(selectedMember.role);
      setEditCanAddTracks(
        selectedMember.canAddTracks ?? (selectedMember.role === 'Producer' || selectedMember.role === 'Owner')
      );
      setEditTrackIds(selectedMember.assignedTrackIds || []);
    }
  }, [selectedMemberId, selectedMember]);

  const toggleInviteTrack = (trackId: string) => {
    setSelectedInviteTrackIds(prev =>
      prev.includes(trackId) ? prev.filter(id => id !== trackId) : [...prev, trackId]
    );
  };

  const toggleEditTrack = (trackId: string) => {
    setEditTrackIds(prev =>
      prev.includes(trackId) ? prev.filter(id => id !== trackId) : [...prev, trackId]
    );
  };

  const cleanInput = usernameInput.trim().toLowerCase();
  const cleanHandle = cleanInput.replace(/^@/, '').replace(/[^a-z0-9_-]/g, '');
  const matchedUser = registeredUsers.find(
    u => (u.username && u.username.toLowerCase() === cleanHandle) ||
         (u.email && u.email.toLowerCase() === cleanInput)
  );

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUserRole !== 'Owner') {
      showStatus('Only the Project Owner can invite collaborators.', 'error');
      return;
    }

    if (!cleanHandle) {
      showStatus('Please enter a username to invite.', 'error');
      return;
    }

    // STRICT REQUIREMENT: Collaborators can only be invited from registered or demo users
    if (!matchedUser) {
      showStatus(`User "@${cleanHandle}" not found. Collaborators can only be invited from registered users or demo accounts.`, 'error');
      return;
    }

    const name = matchedUser.name;
    const email = matchedUser.email || `${matchedUser.username}@ourstudio.co`;
    const username = matchedUser.username;

    // Check if already in the team list
    const isAlreadyCollaborator = team.some(
      m => (m.username && m.username.toLowerCase() === username.toLowerCase()) ||
           (m.email && m.email.toLowerCase() === email.toLowerCase())
    );

    if (isAlreadyCollaborator) {
      showStatus(`@${username} (${name}) is already a collaborator on this project.`, 'error');
      return;
    }

    const assigned = inviteRole === 'Track Editor' ? selectedInviteTrackIds : [];
    const canAdd = inviteRole === 'Producer' ? true : inviteRole === 'Viewer' ? false : inviteCanAddTracks;

    onInviteMember(name, email, inviteRole, assigned, undefined, canAdd, username);
    onAddActivity(
      'team',
      `Invited @${username} (${name}) as ${inviteRole}${
        inviteRole === 'Track Editor' ? ` (${assigned.length} assigned track(s))` : ''
      }${canAdd ? ' with Add Tracks permission' : ''}`
    );

    showStatus(`Invited @${username} (${name}) as ${inviteRole} successfully!`, 'success');
    setUsernameInput('');
    setInviteRole('Editor');
    setInviteCanAddTracks(true);
    setSelectedInviteTrackIds([]);
  };

  const handleSaveMemberPermissions = () => {
    if (!selectedMember || currentUserRole !== 'Owner') {
      showStatus('Only the Project Owner can modify permissions.', 'error');
      return;
    }
    const assigned = editRole === 'Track Editor' ? editTrackIds : [];
    const canAdd = editRole === 'Producer' ? true : editRole === 'Viewer' ? false : editCanAddTracks;

    onUpdateMemberRole(selectedMember.id, editRole, assigned, canAdd);
    onAddActivity('team', `Updated permissions for ${selectedMember.name}`);
    showStatus(`Permissions saved for ${selectedMember.name}.`);
  };

  const confirmDeleteMember = () => {
    if (!memberToDelete) return;
    const targetId = memberToDelete.id;
    const targetName = memberToDelete.name;

    onRemoveMember(targetId);
    onAddActivity('team', `Removed ${targetName} from the project`);

    if (selectedMemberId === targetId) {
      setSelectedMemberId(team.find(m => m.id !== targetId)?.id || null);
    }

    setMemberToDelete(null);
    showStatus(`Removed collaborator ${targetName} from project.`);
  };

  const getAssignedTrackNames = (member: TeamMember): string => {
    if (member.role === 'Owner' || member.role === 'Producer' || member.role === 'Editor') {
      return 'Full DAW Access (All Tracks)';
    }
    if (member.role === 'Viewer') {
      return 'Read-Only Listening';
    }
    if (!member.assignedTrackIds || member.assignedTrackIds.length === 0) {
      return 'Specific Tracks (None assigned yet)';
    }
    const names = member.assignedTrackIds.map(id => tracks.find(t => t.id === id)?.name).filter(Boolean);
    return names.length > 0 ? names.join(', ') : 'No tracks assigned';
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 h-full flex flex-col gap-4 relative" id="team-management-panel">
      {/* Status Feedback Banner */}
      {statusMessage && (
        <div
          className={`px-3 py-2 rounded-lg text-xs flex items-center justify-between border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
              : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-zinc-400 hover:text-white p-0.5"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Confirmation Modal for Removing Collaborator */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-400">
              <div className="p-2 bg-rose-950/60 rounded-full border border-rose-900/60">
                <Trash2 size={18} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-100">Remove Collaborator</h4>
                <p className="text-[11px] text-zinc-400">Confirm access revocation</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to remove <strong className="text-white">{memberToDelete.name}</strong> ({memberToDelete.email}) from this project? They will immediately lose access to all project tracks, branches, and merge requests.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteMember}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition cursor-pointer shadow-lg shadow-rose-950/40"
              >
                Remove Collaborator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
        <div className="flex items-center gap-1.5 text-zinc-300">
          <Users size={16} className="text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider">Project Collaborators & Permissions</h3>
        </div>
        <span className="text-[10px] text-zinc-400 font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
          Your Role: {currentUserRole}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Collaborators List & Invite */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Member Directory */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Team Members ({team.length})</span>
            <div className="grid grid-cols-1 gap-2 max-h-[260px] overflow-y-auto pr-1">
              {team.map(member => {
                const isSelected = selectedMemberId === member.id;
                const trackSummary = getAssignedTrackNames(member);

                return (
                  <div
                    key={member.id}
                    onClick={() => setSelectedMemberId(member.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer select-none transition ${
                      isSelected ? 'bg-zinc-900 border-blue-500/40 shadow' : 'bg-zinc-950 hover:bg-zinc-900/40 border-zinc-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Initials badge - No image avatar */}
                      <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold font-mono flex items-center justify-center uppercase shrink-0">
                        {(member.username || member.name || 'U').slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-semibold text-zinc-200">{member.name}</h4>
                          {member.username && (
                            <span className="text-[10px] text-blue-400/80 font-mono">
                              @{member.username}
                            </span>
                          )}
                          {member.role === 'Owner' && (
                            <span className="text-[8px] bg-purple-950 text-purple-400 border border-purple-900/40 px-1 py-0.2 rounded font-bold uppercase">
                              Owner
                            </span>
                          )}
                          {member.canAddTracks && member.role !== 'Owner' && (
                            <span className="text-[8px] bg-blue-950/60 text-blue-400 border border-blue-900/40 px-1 py-0.2 rounded font-mono">
                              +Tracks
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-500">{member.email}</span>
                        <div className="text-[9px] text-zinc-400 mt-0.5">
                          <span className="text-zinc-500">Access:</span> {trackSummary}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {currentUserEmail?.toLowerCase() === member.email.toLowerCase() && (
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <UserCheck size={10} />
                          <span>Active You</span>
                        </span>
                      )}

                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                        member.role === 'Owner'
                          ? 'bg-purple-950 text-purple-400 border-purple-900/40'
                          : member.role === 'Producer'
                          ? 'bg-rose-950 text-rose-400 border-rose-900/40'
                          : member.role === 'Editor'
                          ? 'bg-blue-950 text-blue-400 border-blue-900/40'
                          : member.role === 'Track Editor'
                          ? 'bg-amber-950 text-amber-400 border-amber-900/40'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}>
                        {member.role}
                      </span>
                      {currentUserRole === 'Owner' && member.role !== 'Owner' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMemberToDelete(member);
                          }}
                          className="p-1 text-zinc-500 hover:text-red-400 transition cursor-pointer"
                          title="Remove collaborator from project"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Invitation Console */}
          {currentUserRole === 'Owner' ? (
            <div className="bg-zinc-900/40 p-3.5 rounded-lg border border-zinc-800 space-y-3.5">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2 text-zinc-300">
                <div className="flex items-center gap-1.5">
                  <UserPlus size={14} className="text-blue-400" />
                  <h4 className="text-[10px] font-bold uppercase tracking-wider">Invite Collaborator by Username</h4>
                </div>
                <span className="text-[9px] text-zinc-500 font-mono">Owner Controls</span>
              </div>

              <form onSubmit={handleInvite} className="space-y-3">
                {/* Username Input */}
                <div className="space-y-1">
                  <label className="block text-[10px] text-zinc-300 uppercase font-bold flex items-center justify-between">
                    <span>Collaborator Username or Email</span>
                    <span className="text-[9px] text-blue-400 font-mono font-normal">Type @username or email</span>
                  </label>
                  <div className="relative">
                    <AtSign size={13} className="absolute left-3 top-2.5 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="e.g. santosh, payal, or registered email"
                      required
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      className="w-full bg-zinc-950 text-zinc-200 text-xs pl-8 pr-3 py-2 rounded-lg border border-zinc-750 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                {/* Match Preview Card or Unregistered Warning */}
                {matchedUser ? (
                  <div className="bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-800/60 flex items-center justify-between shadow-sm animate-fade-in">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold font-mono flex items-center justify-center uppercase shrink-0">
                        {(matchedUser.username || matchedUser.name).slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-white">{matchedUser.name}</span>
                          <span className="text-[10px] font-mono text-emerald-400 font-bold">@{matchedUser.username}</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono">{matchedUser.email}</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border bg-emerald-950 text-emerald-300 border-emerald-700/60 flex items-center gap-1">
                      <CheckCircle2 size={10} className="text-emerald-400" />
                      <span>Registered User</span>
                    </span>
                  </div>
                ) : (cleanHandle || cleanInput) ? (
                  <div className="bg-rose-950/30 p-2.5 rounded-lg border border-rose-800/50 flex items-start gap-2 shadow-sm animate-fade-in text-rose-300">
                    <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-rose-200">
                        "{cleanHandle ? `@${cleanHandle}` : cleanInput}" is not a registered user
                      </p>
                      <p className="text-[10.5px] text-rose-300/80 mt-0.5 leading-relaxed">
                        You can only invite registered users. Please enter a valid registered username or email.
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Role Configuration */}
                <div>
                  <label className="block text-[9px] text-zinc-400 uppercase font-bold mb-1">Assign Project Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => {
                      const newRole = e.target.value as ProjectRole;
                      setInviteRole(newRole);
                      if (newRole === 'Producer') {
                        setInviteCanAddTracks(true);
                      } else if (newRole === 'Viewer') {
                        setInviteCanAddTracks(false);
                      } else if (newRole === 'Editor') {
                        setInviteCanAddTracks(true);
                      }
                      if (newRole === 'Track Editor' && selectedInviteTrackIds.length === 0 && tracks.length > 0) {
                        setSelectedInviteTrackIds([tracks[0].id]);
                      }
                    }}
                    className="w-full bg-zinc-950 text-zinc-200 text-xs px-2.5 py-2 rounded-lg border border-zinc-800 focus:outline-none"
                  >
                    <option value="Producer">Producer (Full DAW Access & Merge Approvals)</option>
                    <option value="Editor">Editor (Full DAW Timeline & Clips Access)</option>
                    <option value="Track Editor">Track Editor (Specific Assigned Track Only)</option>
                    <option value="Viewer">Viewer (Read-Only Listening & Comments)</option>
                  </select>
                </div>

                {/* Option to Allow Adding New Tracks */}
                <div className="bg-zinc-950/70 p-2.5 rounded-lg border border-zinc-850 flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-zinc-200 block">Allow adding new tracks</label>
                    <p className="text-[10px] text-zinc-500">
                      {inviteRole === 'Producer'
                        ? 'Producers always have full access to create tracks and approve merges.'
                        : inviteRole === 'Viewer'
                        ? 'Viewers have read-only listening permissions.'
                        : 'Permit this collaborator to create new tracks in the DAW timeline.'}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={inviteRole === 'Producer' ? true : inviteRole === 'Viewer' ? false : inviteCanAddTracks}
                    disabled={inviteRole === 'Producer' || inviteRole === 'Viewer'}
                    onChange={(e) => setInviteCanAddTracks(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer disabled:opacity-50"
                  />
                </div>

                {/* Specific Track Permissions (for Track Editor) */}
                {inviteRole === 'Track Editor' && (
                  <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-850 space-y-2">
                    <label className="block text-[9px] text-zinc-400 uppercase font-bold">
                      Assigned Tracks / Sections (Specific Track Only)
                    </label>
                    <p className="text-[10px] text-zinc-500">
                      Select which track(s) this collaborator can record, edit, or adjust.
                    </p>

                    {tracks.length === 0 ? (
                      <p className="text-[10px] text-zinc-500 italic">No tracks currently in project. Add tracks to assign section permissions.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto pr-1">
                        {tracks.map(track => {
                          const isChecked = selectedInviteTrackIds.includes(track.id);
                          return (
                            <button
                              key={track.id}
                              type="button"
                              onClick={() => toggleInviteTrack(track.id)}
                              className={`flex items-center gap-2 p-1.5 rounded text-xs border text-left transition cursor-pointer ${
                                isChecked
                                  ? 'bg-blue-950/40 border-blue-500/50 text-blue-200'
                                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              <div
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: track.color }}
                              />
                              <span className="truncate flex-1 text-[11px] font-medium">{track.name}</span>
                              {isChecked && <Check size={12} className="text-blue-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!cleanHandle || !matchedUser}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-950/20"
                  id="btn-confirm-add-collaborator"
                  title={!cleanHandle ? 'Enter a registered username' : !matchedUser ? 'User is not registered' : `Invite @${matchedUser.username}`}
                >
                  <UserPlus size={14} />
                  <span>
                    {!cleanHandle
                      ? 'Enter Registered Username'
                      : !matchedUser
                      ? 'User Not Found in Registered Accounts'
                      : `Invite @${matchedUser.username} (${matchedUser.name})`}
                  </span>
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-zinc-900/30 p-3 rounded-lg border border-zinc-800 text-zinc-500 text-xs flex items-center gap-2">
              <Lock size={14} className="text-zinc-600 shrink-0" />
              <span>Only the project Owner can invite or remove collaborators.</span>
            </div>
          )}
        </div>

        {/* Permissions Inspector Sidebar Card */}
        <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-800 rounded-lg p-3.5 flex flex-col justify-between overflow-y-auto">
          {selectedMember ? (
            <div className="space-y-4">
              {/* Selected header */}
              <div className="border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Shield size={14} className="text-blue-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Collaborator Details</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold font-mono flex items-center justify-center uppercase shrink-0">
                    {(selectedMember.username || selectedMember.name || 'U').slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-200">
                      {selectedMember.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      {selectedMember.username && (
                        <span className="text-blue-400 font-mono">@{selectedMember.username}</span>
                      )}
                      <span>({selectedMember.email})</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modify Role & Track Permissions */}
              <div className="space-y-3 bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                <div className="space-y-1">
                  <label className="block text-[9px] text-zinc-500 uppercase font-bold">Role</label>
                  {currentUserRole === 'Owner' && selectedMember.role !== 'Owner' ? (
                    <select
                      value={editRole}
                      onChange={(e) => {
                        const newRole = e.target.value as ProjectRole;
                        setEditRole(newRole);
                        if (newRole === 'Producer') {
                          setEditCanAddTracks(true);
                        } else if (newRole === 'Viewer') {
                          setEditCanAddTracks(false);
                        }
                      }}
                      className="w-full bg-zinc-900 text-zinc-200 text-xs px-2.5 py-1.5 rounded border border-zinc-800 focus:outline-none"
                    >
                      <option value="Producer">Producer (Full DAW Access)</option>
                      <option value="Editor">Editor (Full DAW Access)</option>
                      <option value="Track Editor">Track Editor (Specific Track Only)</option>
                      <option value="Viewer">Viewer (Read-Only Listening)</option>
                    </select>
                  ) : (
                    <div className="text-xs font-semibold text-zinc-300 py-1">
                      {selectedMember.role === 'Producer'
                        ? 'Producer (Full DAW Access)'
                        : selectedMember.role === 'Editor'
                        ? 'Editor (Full DAW Access)'
                        : selectedMember.role === 'Track Editor'
                        ? 'Track Editor (Specific Track Only)'
                        : selectedMember.role === 'Viewer'
                        ? 'Viewer (Read-Only Listening)'
                        : selectedMember.role}
                    </div>
                  )}
                </div>

                {/* Option to Allow Adding New Tracks in Inspector */}
                <div className="pt-2 border-t border-zinc-900">
                  {currentUserRole === 'Owner' && selectedMember.role !== 'Owner' ? (
                    <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer py-1">
                      <span>Allow adding new tracks</span>
                      <input
                        type="checkbox"
                        checked={editRole === 'Producer' ? true : editRole === 'Viewer' ? false : editCanAddTracks}
                        disabled={editRole === 'Producer' || editRole === 'Viewer'}
                        onChange={(e) => setEditCanAddTracks(e.target.checked)}
                        className="w-4 h-4 accent-blue-600 rounded cursor-pointer disabled:opacity-50"
                      />
                    </label>
                  ) : (
                    <div className="text-[11px] text-zinc-400">
                      Can Add Tracks: <span className="text-zinc-200 font-semibold">{selectedMember.canAddTracks ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                </div>

                {/* Specific Track Permissions for Track Editor in Inspector */}
                {editRole === 'Track Editor' && (
                  <div className="space-y-1.5 pt-2 border-t border-zinc-900">
                    <label className="block text-[9px] text-zinc-500 uppercase font-bold">Specific Track Permissions</label>
                    {currentUserRole === 'Owner' && selectedMember.role !== 'Owner' ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto pr-1 pt-1">
                          {tracks.map(t => {
                            const isChecked = editTrackIds.includes(t.id);
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => toggleEditTrack(t.id)}
                                className={`flex items-center gap-2 p-1.5 rounded text-xs border text-left transition cursor-pointer ${
                                  isChecked
                                    ? 'bg-blue-950/40 border-blue-500/50 text-blue-200'
                                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                                }`}
                              >
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                                <span className="truncate flex-1 text-[11px]">{t.name}</span>
                                {isChecked && <Check size={12} className="text-blue-400 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-400 py-1">
                        {getAssignedTrackNames(selectedMember)}
                      </div>
                    )}
                  </div>
                )}

                {currentUserRole === 'Owner' && selectedMember.role !== 'Owner' && (
                  <button
                    type="button"
                    onClick={handleSaveMemberPermissions}
                    className="w-full mt-2 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded transition cursor-pointer shadow"
                  >
                    Save Permissions
                  </button>
                )}
              </div>

              {/* Remove button if owner */}
              {currentUserRole === 'Owner' && selectedMember.role !== 'Owner' && (
                <div className="pt-2 border-t border-zinc-850">
                  <button
                    type="button"
                    onClick={() => setMemberToDelete(selectedMember)}
                    className="w-full py-2 bg-red-950/40 hover:bg-red-950/60 border border-red-900/40 hover:border-red-800 text-red-400 font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Remove from Project</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-10 text-zinc-600">
              <Shield size={32} className="text-zinc-800 mb-2" />
              <p className="text-xs">Select a collaborator to view their access.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
