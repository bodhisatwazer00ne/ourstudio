/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Project, UserAccount } from '../projectStorage';
import CollaboratorSwitcher from './CollaboratorSwitcher';
import {
  Folder,
  Plus,
  Edit2,
  Trash2,
  Music,
  Search,
  Filter,
  LogOut,
  Layers,
  Activity,
  ArrowRight,
  HelpCircle,
  RotateCcw,
  Users
} from 'lucide-react';

interface ProjectDirectoryProps {
  currentUser: UserAccount;
  projects: Project[];
  onOpenProject: (projectId: string) => void;
  onCreateProject: (name: string, description: string, genre: string, tempo: number, timeSignature: string) => void;
  onEditProject: (projectId: string, name: string, description: string, genre: string, tempo: number) => void;
  onDeleteProject: (projectId: string) => void;
  onLogout: () => void;
  onSwitchUser?: (user: UserAccount) => void;
  onResetDemoData?: () => void;
}

export default function ProjectDirectory({
  currentUser,
  projects,
  onOpenProject,
  onCreateProject,
  onEditProject,
  onDeleteProject,
  onLogout,
  onSwitchUser,
  onResetDemoData
}: ProjectDirectoryProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjGenre, setNewProjGenre] = useState('Lofi Hip-Hop');
  const [newProjTempo, setNewProjTempo] = useState(96);
  const [newProjTimeSig, setNewProjTimeSig] = useState('4/4');

  const [editProjName, setEditProjName] = useState('');
  const [editProjDesc, setEditProjDesc] = useState('');
  const [editProjGenre, setEditProjGenre] = useState('');
  const [editProjTempo, setEditProjTempo] = useState(96);

  const [searchQuery, setSearchQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('All');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'owned' | 'collab'>('all');

  const allGenres = ['All', ...Array.from(new Set(projects.map(p => p.genre)))];

  // User projects partition
  const userVisibleProjects = projects.filter(p => {
    return p.creatorId === currentUser.id ||
      p.team.some(m => m.email.toLowerCase() === currentUser.email.toLowerCase());
  });

  const ownedCount = userVisibleProjects.filter(p => p.creatorId === currentUser.id).length;
  const collabCount = userVisibleProjects.filter(p => p.creatorId !== currentUser.id).length;

  const filteredProjects = userVisibleProjects.filter(p => {
    if (scopeFilter === 'owned' && p.creatorId !== currentUser.id) return false;
    if (scopeFilter === 'collab' && p.creatorId === currentUser.id) return false;

    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.creatorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = genreFilter === 'All' || p.genre === genreFilter;
    return matchesSearch && matchesGenre;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    onCreateProject(
      newProjName.trim(),
      newProjDesc.trim(),
      newProjGenre,
      Number(newProjTempo),
      newProjTimeSig
    );

    setNewProjName('');
    setNewProjDesc('');
    setNewProjGenre('Lofi Hip-Hop');
    setNewProjTempo(96);
    setNewProjTimeSig('4/4');
    setShowCreateModal(false);
  };

  const handleOpenEditModal = (p: Project) => {
    setEditingProjectId(p.id);
    setEditProjName(p.name);
    setEditProjDesc(p.description);
    setEditProjGenre(p.genre);
    setEditProjTempo(p.tempo);
    setShowEditModal(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProjName.trim() || !editingProjectId) return;

    onEditProject(
      editingProjectId,
      editProjName.trim(),
      editProjDesc.trim(),
      editProjGenre,
      Number(editProjTempo)
    );

    setShowEditModal(false);
    setEditingProjectId(null);
  };

  const handleDeleteClick = (projectId: string, name: string) => {
    const confirm = window.confirm(`Are you sure you want to permanently delete "${name}"?`);
    if (confirm) {
      onDeleteProject(projectId);
    }
  };

  const getUserRoleInProject = (p: Project): string => {
    if (p.creatorId === currentUser.id) return 'Owner';
    const member = p.team.find(m => m.email.toLowerCase() === currentUser.email.toLowerCase());
    return member ? member.role : 'Viewer';
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between" id="project-directory-dashboard">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-950/15 via-zinc-950 to-zinc-950 pointer-events-none z-0" />

      {/* Header */}
      <header className="relative z-10 max-w-7xl w-full mx-auto px-6 py-4 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/80 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-lg flex items-center justify-center">
            <Music size={18} />
          </div>
          <div>
            <span className="font-display font-bold text-base tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              OurStudio
            </span>
            <span className="text-[9px] font-mono text-zinc-500 block">Workspace repositories</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onSwitchUser ? (
            <CollaboratorSwitcher
              currentUser={currentUser}
              currentRole={currentUser.preferredRole}
              onSwitchUser={onSwitchUser}
              onLogout={onLogout}
            />
          ) : (
            <div className="flex items-center gap-2.5 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
                className="w-5.5 h-5.5 rounded-full object-cover border border-zinc-700"
              />
              <div className="flex flex-col text-left leading-none">
                <span className="text-xs font-bold text-zinc-200">{currentUser.name}</span>
                <span className="text-[8.5px] text-blue-400 font-mono font-semibold uppercase tracking-wider mt-0.5">
                  Role: {currentUser.preferredRole}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={onLogout}
            className="p-2 bg-zinc-900 hover:bg-red-950/40 border border-zinc-800 hover:border-red-900/30 text-zinc-400 hover:text-red-400 rounded-lg transition duration-200 cursor-pointer"
            title="Log Out Artist"
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-display font-extrabold text-white flex items-center gap-2">
              <Folder size={18} className="text-blue-400" />
              <span>Studio Project Directory</span>
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Select an active song repository to load its track layouts, branches, comments, and mixer.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start">
            {onResetDemoData && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Reset all demo projects and collaborator lists to initial starter state?")) {
                    onResetDemoData();
                  }
                }}
                className="inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs px-3 py-2 rounded-lg transition duration-200 cursor-pointer"
                title="Reset projects to initial demo dataset"
              >
                <RotateCcw size={12} />
                <span>Reset Demo Repos</span>
              </button>
            )}
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition duration-200 shadow-md shadow-blue-900/10 cursor-pointer"
            >
              <Plus size={14} />
              <span>Create New Song Repo</span>
            </button>
          </div>
        </div>

        {/* Repository Scope Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-900 pb-3">
          <button
            type="button"
            onClick={() => setScopeFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              scopeFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            <span>All Accessible Repos</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              scopeFilter === 'all' ? 'bg-blue-800 text-blue-100' : 'bg-zinc-800 text-zinc-500'
            }`}>
              {userVisibleProjects.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setScopeFilter('owned')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              scopeFilter === 'owned'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            <span>Created by You (Owner)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              scopeFilter === 'owned' ? 'bg-blue-800 text-blue-100' : 'bg-zinc-800 text-zinc-500'
            }`}>
              {ownedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setScopeFilter('collab')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              scopeFilter === 'collab'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            <Users size={12} />
            <span>Shared with You (Collaborator)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              scopeFilter === 'collab' ? 'bg-blue-800 text-blue-100' : 'bg-zinc-800 text-zinc-500'
            }`}>
              {collabCount}
            </span>
          </button>
        </div>

        {/* Filters and Search Hub */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-zinc-900/30 border border-zinc-900 p-3 rounded-xl">
          <div className="md:col-span-6 relative">
            <Search size={14} className="absolute left-3 top-2.5 text-zinc-600" />
            <input
              type="text"
              placeholder="Search by song name, genre, or creator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg py-1.5 pl-9 pr-4 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
            />
          </div>

          <div className="md:col-span-3 flex items-center gap-1.5">
            <Filter size={12} className="text-zinc-500 shrink-0" />
            <span className="text-[10px] uppercase font-bold text-zinc-500 font-sans">Genre:</span>
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              className="flex-1 bg-zinc-950 text-zinc-300 text-xs py-1.5 px-2 rounded-lg border border-zinc-800/80 focus:outline-none focus:border-zinc-700"
            >
              {allGenres.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 flex items-center justify-end text-[10px] text-zinc-500 font-mono gap-1 px-2">
            <span>Showing</span>
            <span className="text-blue-400 font-bold">{filteredProjects.length}</span>
            <span>of</span>
            <span>{projects.length} Repos</span>
          </div>
        </div>

        {/* Projects Grid Desk */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-16 border border-zinc-900 bg-zinc-900/10 rounded-2xl space-y-3">
            <Folder size={40} className="text-zinc-800 mx-auto" />
            <h3 className="text-sm font-semibold text-zinc-300">No Projects Found</h3>
            <p className="text-xs text-zinc-600 max-w-sm mx-auto">
              No repositories match your search or filter settings. Create a brand new project to begin.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map(p => {
              const myRole = getUserRoleInProject(p);
              const totalTracks = p.tracks.length;
              const totalBranches = p.branches.length;
              const totalComments = p.comments.length;
              const totalMRs = p.mergeRequests.filter(m => m.status === 'OPEN').length;

              return (
                <div
                  key={p.id}
                  className="bg-zinc-900/40 border border-zinc-850 hover:border-zinc-750 rounded-xl p-5 flex flex-col justify-between gap-5 transition duration-200 group relative"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="inline-block bg-blue-950/40 text-blue-400 text-[9px] font-bold font-mono px-2 py-0.5 rounded border border-blue-900/30">
                          {p.genre}
                        </span>
                        <h3 className="text-sm font-display font-bold text-white group-hover:text-blue-400 transition leading-tight pt-1">
                          {p.name}
                        </h3>
                      </div>

                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition duration-150 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(p);
                          }}
                          className="p-1 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-white rounded transition"
                          title="Edit project specs"
                        >
                          <Edit2 size={11} />
                        </button>
                        {p.creatorId === currentUser.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(p.id, p.name);
                            }}
                            className="p-1 bg-zinc-950 hover:bg-red-950/30 border border-zinc-850 hover:border-red-900/30 text-zinc-500 hover:text-red-400 rounded transition"
                            title="Delete project permanently"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {p.description || 'No description provided.'}
                    </p>

                    <div className="flex items-center gap-3.5 text-[10px] text-zinc-500 font-mono">
                      <div className="flex items-center gap-1">
                        <Activity size={10} className="text-zinc-600" />
                        <span>Tempo: <strong className="text-zinc-300 font-semibold">{p.tempo} BPM</strong></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Layers size={10} className="text-zinc-600" />
                        <span>Meter: <strong className="text-zinc-300 font-semibold">{p.timeSignature}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 border-y border-zinc-900 py-3 text-center">
                    <div>
                      <span className="text-xs font-bold font-mono text-zinc-300">{totalTracks}</span>
                      <span className="text-[8px] text-zinc-500 block uppercase font-bold">Tracks</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold font-mono text-zinc-300">{totalBranches}</span>
                      <span className="text-[8px] text-zinc-500 block uppercase font-bold">Branches</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold font-mono text-zinc-300">{totalComments}</span>
                      <span className="text-[8px] text-zinc-500 block uppercase font-bold">Notes</span>
                    </div>
                    <div>
                      <span className={`text-xs font-bold font-mono ${totalMRs > 0 ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'}`}>
                        {totalMRs}
                      </span>
                      <span className="text-[8px] text-zinc-500 block uppercase font-bold">Open MRs</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-900/10 pt-2 gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 bg-zinc-950 text-[9px] text-zinc-400 font-mono rounded-full border border-zinc-800 flex items-center justify-center font-bold">
                        {p.creatorName.split(' ')[0][0]}
                      </div>
                      <span className="text-[9px] text-zinc-500 truncate max-w-[80px]">
                        Owner: {p.creatorName.split(' ')[0]}
                      </span>
                    </div>

                    <span className={`text-[8.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${
                      myRole === 'Owner'
                        ? 'bg-purple-950/45 text-purple-400 border-purple-900/20'
                        : myRole === 'Producer'
                        ? 'bg-rose-950/45 text-rose-400 border-rose-900/20'
                        : myRole === 'Editor'
                        ? 'bg-blue-950/45 text-blue-400 border-blue-900/20'
                        : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                    }`}>
                      As {myRole}
                    </span>

                    <button
                      onClick={() => onOpenProject(p.id)}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-blue-600 text-white font-bold text-[10px] rounded-lg transition duration-200 flex items-center gap-1"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight size={10} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* CREATE NEW PROJECT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-display font-extrabold text-white">Create New Song Repository</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-500 hover:text-white transition font-mono text-xs"
              >
                CLOSE
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider font-bold text-zinc-500">Project Name</label>
                <input
                  type="text"
                  placeholder="e.g. Summer Memories EP"
                  required
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider font-bold text-zinc-500">Repository Description</label>
                <textarea
                  placeholder="Describe your instrumentation ideas and artist guidelines."
                  rows={2}
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-600 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-wider font-bold text-zinc-500">Tempo (BPM)</label>
                  <input
                    type="number"
                    min="40"
                    max="220"
                    required
                    value={newProjTempo}
                    onChange={(e) => setNewProjTempo(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-wider font-bold text-zinc-500">Time Signature</label>
                  <select
                    value={newProjTimeSig}
                    onChange={(e) => setNewProjTimeSig(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-blue-600"
                  >
                    <option value="4/4">4/4 Standard</option>
                    <option value="3/4">3/4 Waltz</option>
                    <option value="6/8">6/8 Swing</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider font-bold text-zinc-500">Genre Tag</label>
                <select
                  value={newProjGenre}
                  onChange={(e) => setNewProjGenre(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-blue-600"
                >
                  <option value="Lofi Hip-Hop">Lofi Hip-Hop</option>
                  <option value="Synthwave / Retrowave">Synthwave / Retrowave</option>
                  <option value="Indie Folk / Acoustic">Indie Folk / Acoustic</option>
                  <option value="Progressive Techno">Progressive Techno</option>
                  <option value="Cinematic Orchestral">Cinematic Orchestral</option>
                </select>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-400 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition"
                >
                  Create & Launch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROJECT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-display font-extrabold text-white">Edit Song Specifications</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-zinc-500 hover:text-white transition font-mono text-xs"
              >
                CLOSE
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider font-bold text-zinc-500">Project Name</label>
                <input
                  type="text"
                  required
                  value={editProjName}
                  onChange={(e) => setEditProjName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider font-bold text-zinc-500">Description</label>
                <textarea
                  rows={2}
                  value={editProjDesc}
                  onChange={(e) => setEditProjDesc(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-600 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-wider font-bold text-zinc-500">Tempo (BPM)</label>
                  <input
                    type="number"
                    min="40"
                    max="220"
                    required
                    value={editProjTempo}
                    onChange={(e) => setEditProjTempo(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-wider font-bold text-zinc-500">Genre Tag</label>
                  <input
                    type="text"
                    required
                    value={editProjGenre}
                    onChange={(e) => setEditProjGenre(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-400 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl w-full mx-auto px-6 py-5 border-t border-zinc-900/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 font-sans">
        <p>&copy; 2026 OurStudio, Inc. All rights reserved.</p>
        <p className="flex items-center gap-1 text-[11px] text-zinc-500">
          <HelpCircle size={12} />
          <span>Need help? Check out our Phase 1 Blueprint Specifications tab inside your project.</span>
        </p>
      </footer>
    </div>
  );
}
