/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Branch, VersionCommit, Track, AudioClip, ProjectMetadata, ProjectRole } from '../types';
import { GitBranch, Save, RefreshCw, Layers, Check, GitCommit, FileJson, ArrowRight, CloudUpload, GitPullRequest, Shield } from 'lucide-react';

interface VersionControlProps {
  branches: Branch[];
  activeBranchId: string;
  onSwitchBranch: (id: string) => void;
  onCreateBranch: (name: string) => void;
  commits: VersionCommit[];
  onSaveVersion: (
    message: string,
    versionNum: string,
    autoPush?: boolean,
    targetBranchName?: string,
    versionName?: string,
    description?: string
  ) => void;
  onRestoreSnapshot: (metadata: ProjectMetadata) => void;
  tracks: Track[];
  clips: AudioClip[];
  onAddActivity: (type: string, message: string) => void;
  onPush: (targetBranchName?: string) => void;
  onTabChange?: (tab: 'daw' | 'versioning' | 'merges' | 'crew' | 'comments' | 'activity') => void;
  currentUserRole?: ProjectRole;
  onCreateMergeRequest?: (
    title: string,
    description: string,
    sourceBranch: string,
    targetBranch: string,
    metadataDiff: string[]
  ) => void;
  branchStates?: Record<string, { tracks: Track[]; clips: AudioClip[] }>;
}

export default function VersionControl({
  branches,
  activeBranchId,
  onSwitchBranch,
  onCreateBranch,
  commits,
  onSaveVersion,
  onRestoreSnapshot,
  tracks,
  clips,
  onAddActivity,
  onPush,
  onTabChange,
  currentUserRole = 'Producer',
  onCreateMergeRequest,
  branchStates = {}
}: VersionControlProps) {
  const [newBranchName, setNewBranchName] = useState('');
  const [versionName, setVersionName] = useState('');
  const [commitDescription, setCommitDescription] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [commitVersion, setCommitVersion] = useState('v1.0.3');
  const [selectedCommitId, setSelectedCommitId] = useState<string | null>(null);
  const [showJsonInspector, setShowJsonInspector] = useState(false);

  const activeBranch = branches.find(b => b.id === activeBranchId) || branches[0];
  
  // Target branch for merge/push (defaults to active branch for direct versioning or main)
  const [mergeTargetBranch, setMergeTargetBranch] = useState(activeBranch.name);
  const [lastPushedBranch, setLastPushedBranch] = useState<string | null>(null);
  const [commitFeedback, setCommitFeedback] = useState<string | null>(null);

  // If active branch changes, update default target
  React.useEffect(() => {
    setMergeTargetBranch(activeBranch.name);
  }, [activeBranch.id]);

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    const cleanName = newBranchName.trim().toLowerCase().replace(/\s+/g, '-');
    onCreateBranch(cleanName);
    onAddActivity('CREATE_BRANCH', `Created branch "${cleanName}" from "${activeBranch.name}"`);
    setNewBranchName('');
  };

  const generateDiff = (srcName: string, tgtName: string): string[] => {
    const srcBranch = branches.find(b => b.name === srcName);
    const tgtBranch = branches.find(b => b.name === tgtName);
    if (!srcBranch || !tgtBranch) return ['Branch metadata sync pending'];

    const srcState = branchStates[srcBranch.id];
    const tgtState = branchStates[tgtBranch.id];
    if (!srcState || !tgtState) return ['Track and clip metadata differences detected'];

    const diffs: string[] = [];
    srcState.tracks.forEach(sTrack => {
      const tTrack = tgtState.tracks.find(t => t.id === sTrack.id);
      if (!tTrack) {
        diffs.push(`+ Track added: "${sTrack.name}"`);
      } else {
        if (sTrack.volume !== tTrack.volume) diffs.push(`~ Vol adjusted: ${sTrack.name} (${tTrack.volume} -> ${sTrack.volume})`);
        if (sTrack.pan !== tTrack.pan) diffs.push(`~ Pan adjusted: ${sTrack.name} (${tTrack.pan} -> ${sTrack.pan})`);
        if (sTrack.isMuted !== tTrack.isMuted) diffs.push(`~ Mute state changed: ${sTrack.name}`);
      }
    });

    tgtState.tracks.forEach(tTrack => {
      if (!srcState.tracks.some(s => s.id === tTrack.id)) diffs.push(`- Track removed: "${tTrack.name}"`);
    });

    srcState.clips.forEach(sClip => {
      if (!tgtState.clips.some(c => c.id === sClip.id)) diffs.push(`+ Clip added: "${sClip.name}" at ${sClip.startTime}s`);
    });

    tgtState.clips.forEach(tClip => {
      if (!srcState.clips.some(c => c.id === tClip.id)) diffs.push(`- Clip removed: "${tClip.name}"`);
    });

    return diffs.length > 0 ? diffs : ['No audio or parameter differences between branches.'];
  };

  const handleCommitSubmit = (e: React.FormEvent, shouldPush: boolean = false) => {
    e.preventDefault();
    const finalVersionName = versionName.trim() || commitMessage.trim() || `Session ${commitVersion}`;
    const finalDescription = commitDescription.trim() || commitMessage.trim() || 'Session adjustments and track recordings';
    const finalMessage = commitMessage.trim() || finalVersionName;

    onSaveVersion(
      finalMessage,
      commitVersion.trim(),
      shouldPush,
      mergeTargetBranch,
      finalVersionName,
      finalDescription
    );

    if (shouldPush) {
      if (onCreateMergeRequest && mergeTargetBranch !== activeBranch.name) {
        const diff = generateDiff(activeBranch.name, mergeTargetBranch);
        onCreateMergeRequest(
          finalVersionName,
          finalDescription,
          activeBranch.name,
          mergeTargetBranch,
          diff
        );
        setLastPushedBranch(mergeTargetBranch);
        setCommitFeedback(`Pushed "${finalVersionName}" and opened merge request into origin/${mergeTargetBranch}.`);
      } else {
        // Merging with itself - directly committed and pushed to activeBranch.name
        setLastPushedBranch(activeBranch.name);
        setCommitFeedback(`Pushed version "${finalVersionName}" directly to branch "${activeBranch.name}".`);
      }
    } else {
      setLastPushedBranch(null);
      setCommitFeedback(`Local version "${finalVersionName}" saved to branch "${activeBranch.name}".`);
    }

    setVersionName('');
    setCommitDescription('');
    setCommitMessage('');

    // Auto increment version tag
    const parts = commitVersion.replace('v', '').split('.');
    if (parts.length === 3) {
      const nextMinor = parseInt(parts[2]) + 1;
      setCommitVersion(`v${parts[0]}.${parts[1]}.${nextMinor}`);
    }
  };

  const handleRestoreCommit = (commit: VersionCommit) => {
    onRestoreSnapshot(commit.metadataSnapshot);
    onAddActivity('SAVE_VERSION', `Restored timeline and mixer state to snapshot "${commit.versionNumber}"`);
  };

  const otherBranches = branches.filter(b => b.id !== activeBranchId);

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex flex-col h-full gap-4" id="version-control-panel">
      {/* Branch Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <GitBranch size={16} className="text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Branches</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-400 font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
              Active: {activeBranch.name}
            </span>
          </div>
        </div>

        {/* List of Branches */}
        <div className="flex flex-wrap gap-1.5">
          {branches.map(branch => {
            const isActive = branch.id === activeBranchId;
            return (
              <button
                key={branch.id}
                onClick={() => onSwitchBranch(branch.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-950 text-blue-400 border border-blue-500/40'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800/60'
                }`}
              >
                <GitBranch size={12} />
                <span>{branch.name}</span>
                {isActive && <Check size={10} className="ml-0.5" />}
              </button>
            );
          })}
        </div>

        {/* Fork New Branch Form */}
        <form onSubmit={handleCreateBranch} className="flex gap-2 pt-1">
          <input
            type="text"
            placeholder="New branch name..."
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            className="flex-1 bg-zinc-900 text-zinc-200 placeholder-zinc-600 px-3 py-1.5 text-xs rounded-lg border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 text-xs rounded-lg font-semibold hover:bg-zinc-800 transition whitespace-nowrap cursor-pointer"
          >
            Create Branch
          </button>
        </form>
      </div>

      {/* Commit & Merge Action Box */}
      <div className="space-y-3 bg-zinc-900/40 p-3 rounded-lg border border-zinc-800">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <Save size={14} className="text-blue-400" />
            <h4 className="text-[11px] font-bold uppercase tracking-wider">Commit Workspace Changes</h4>
          </div>
          {currentUserRole !== 'Owner' && (
            <span className="text-[10px] text-amber-400 flex items-center gap-1 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40">
              <Shield size={10} />
              Owner Approval Required to Merge
            </span>
          )}
        </div>

        <form className="space-y-3" onSubmit={(e) => handleCommitSubmit(e, false)}>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div className="sm:col-span-3">
              <label className="block text-[10px] text-zinc-300 uppercase font-bold mb-1">
                Version Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Chorus Harmonies Take 2"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                className="w-full bg-zinc-950 text-zinc-100 placeholder-zinc-500 text-xs px-2.5 py-1.5 rounded border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 uppercase font-bold mb-1">Tag</label>
              <input
                type="text"
                value={commitVersion}
                onChange={(e) => setCommitVersion(e.target.value)}
                className="w-full bg-zinc-950 text-zinc-300 text-xs font-mono px-2.5 py-1.5 rounded border border-zinc-800 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-zinc-300 uppercase font-bold mb-1">
              Description of Commit & Activity Details
            </label>
            <textarea
              rows={2}
              placeholder="Describe what changes were made, takes recorded, faders balanced, or arrangement edits..."
              value={commitDescription}
              onChange={(e) => setCommitDescription(e.target.value)}
              className="w-full bg-zinc-950 text-zinc-200 placeholder-zinc-500 text-xs px-2.5 py-1.5 rounded border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
            />
          </div>

          <div>
            <label className="block text-[9px] text-zinc-500 uppercase font-bold mb-1">Merge Target Branch</label>
            <select
              value={mergeTargetBranch}
              onChange={(e) => setMergeTargetBranch(e.target.value)}
              className="w-full bg-zinc-950 text-zinc-300 text-xs px-2.5 py-1.5 rounded border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            >
              <option value={activeBranch.name} className="bg-zinc-950 text-blue-300 font-semibold">
                {activeBranch.name} (Direct branch version / self-merge)
              </option>
              {branches
                .filter(b => b.name !== activeBranch.name)
                .map(b => (
                  <option key={b.id} value={b.name} className="bg-zinc-950 text-zinc-300">
                    {b.name === 'main' ? 'main (Production Master)' : b.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={(e) => handleCommitSubmit(e, false)}
              className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 hover:text-white font-semibold text-xs rounded-md shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
              title="Save changes to your local branch only"
            >
              <GitCommit size={14} />
              <span>Commit Local</span>
            </button>
            <button
              type="button"
              onClick={(e) => handleCommitSubmit(e, true)}
              className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-md shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
              title="Push changes and request merge into target branch"
            >
              <CloudUpload size={14} />
              <span>Commit & Push</span>
            </button>
            {commits.filter(c => c.pushed === false).length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const unpushedCount = commits.filter(c => c.pushed === false).length;
                  onPush(mergeTargetBranch);
                  setLastPushedBranch(mergeTargetBranch);
                  setCommitFeedback(`Pushed ${unpushedCount} local commits to origin/${mergeTargetBranch}.`);
                }}
                className="py-1.5 px-3 bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 hover:text-white font-semibold text-xs rounded-md shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Push unpushed local commits to remote tracking branch"
              >
                <CloudUpload size={14} />
                <span>Push ({commits.filter(c => c.pushed === false).length})</span>
              </button>
            )}
          </div>
        </form>

        {commitFeedback && (
          <div className="mt-2 bg-blue-950/30 border border-blue-900/40 p-2.5 rounded-md flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] text-zinc-300 font-medium">
                {commitFeedback}
              </div>
              {lastPushedBranch && onTabChange && (
                <button
                  onClick={() => {
                    setCommitFeedback(null);
                    onTabChange('merges');
                  }}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] rounded flex items-center gap-1 transition shrink-0 cursor-pointer"
                >
                  <span>View Merge Request</span>
                  <ArrowRight size={10} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Version Commits Ledger Timeline */}
      <div className="flex-1 space-y-2 flex flex-col min-h-[220px]">
        <div className="flex items-center justify-between text-zinc-300 border-b border-zinc-900 pb-2">
          <div className="flex items-center gap-1.5">
            <Layers size={14} className="text-blue-400" />
            <h4 className="text-[11px] font-bold uppercase tracking-wider">Commit History</h4>
          </div>
          <button
            onClick={() => setShowJsonInspector(!showJsonInspector)}
            className="text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition cursor-pointer"
          >
            <FileJson size={12} />
            <span>{showJsonInspector ? 'Hide JSON' : 'Show JSON'}</span>
          </button>
        </div>

        {/* Ledger Scroll List */}
        <div className="flex-1 overflow-y-auto relative space-y-3 pr-1">
          {showJsonInspector ? (
            <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800 font-mono text-[9px] text-blue-400 overflow-x-auto whitespace-pre h-[200px]">
              {JSON.stringify({
                activeBranch: activeBranch.name,
                tracksCount: tracks.length,
                tracks: tracks.map(t => ({ id: t.id, name: t.name, volume: t.volume, pan: t.pan })),
                clipsCount: clips.length,
                clips: clips.map(c => ({ id: c.id, name: c.name, start: c.startTime, duration: c.duration }))
              }, null, 2)}
            </div>
          ) : (
            <div className="relative pl-4 space-y-3">
              <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-zinc-800"></div>

              {commits.map((commit) => {
                const isSelected = selectedCommitId === commit.id;
                return (
                  <div key={commit.id} className="relative group select-none">
                    <div
                      className={`absolute -left-[13px] top-1.5 w-2 h-2 rounded-full border transition ${
                        isSelected
                          ? 'bg-blue-400 border-blue-400 scale-125 shadow-lg'
                          : 'bg-zinc-950 border-zinc-700 hover:border-blue-400'
                      }`}
                    ></div>

                    <div
                      onClick={() => setSelectedCommitId(commit.id === selectedCommitId ? null : commit.id)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition ${
                        isSelected
                          ? 'bg-zinc-900/90 border-blue-500/40'
                          : 'bg-zinc-950 hover:bg-zinc-900/40 border-zinc-900'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-zinc-200 font-mono flex items-center gap-1">
                            <GitCommit size={10} className="text-zinc-500" />
                            {commit.versionNumber}
                          </span>
                          {commit.pushed !== false ? (
                            <span className="text-[8px] font-bold uppercase bg-green-950/65 border border-green-900/60 text-green-400 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <Check size={8} />
                              <span>Pushed</span>
                            </span>
                          ) : (
                            <span className="text-[8px] font-bold uppercase bg-amber-950/65 border border-amber-900/60 text-amber-400 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <CloudUpload size={8} />
                              <span>Local</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-zinc-500">{commit.timestamp}</span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-normal line-clamp-2">{commit.message}</p>
                      <div className="text-[9px] text-zinc-500 mt-1 flex items-center gap-1.5">
                        <span>{commit.author}</span>
                        <span className="text-zinc-600">/</span>
                        <span>{commit.metadataSnapshot.tracks.length} tracks</span>
                      </div>

                      {isSelected && (
                        <div className="mt-2.5 pt-2 border-t border-zinc-800 flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestoreCommit(commit);
                            }}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] rounded flex items-center gap-1 transition cursor-pointer"
                          >
                            <RefreshCw size={10} />
                            <span>Restore Version</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
