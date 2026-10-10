/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MergeRequest, Track, AudioClip, Branch, ProjectRole } from '../types';
import { GitPullRequest, CheckCircle2, XCircle, ChevronRight, CornerDownRight, FilePlus, FileMinus, Edit, RefreshCcw, AlertCircle, ArrowRight, Activity, Lock, Shield } from 'lucide-react';

interface MergeRequestsProps {
  mergeRequests: MergeRequest[];
  onApproveMerge: (mrId: string) => void;
  onRejectMerge: (mrId: string) => void;
  onAddActivity: (type: string, message: string) => void;
  branches: Branch[];
  activeBranchId: string;
  onCreateMergeRequest: (
    title: string,
    description: string,
    sourceBranch: string,
    targetBranch: string,
    metadataDiff: string[]
  ) => void;
  branchStates: Record<string, { tracks: Track[]; clips: AudioClip[] }>;
  currentUserRole?: ProjectRole;
}

export default function MergeRequests({
  mergeRequests,
  onApproveMerge,
  onRejectMerge,
  onAddActivity,
  branches,
  activeBranchId,
  onCreateMergeRequest,
  branchStates,
  currentUserRole = 'Producer'
}: MergeRequestsProps) {
  const [selectedMrId, setSelectedMrId] = useState<string | null>(
    mergeRequests.length > 0 ? mergeRequests[0].id : null
  );

  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  
  // Find current active branch and set as default source, target is default main
  const activeBranchName = branches.find(b => b.id === activeBranchId)?.name || 'vocal-harmonies';
  const [sourceBranchName, setSourceBranchName] = useState(activeBranchName);
  const [targetBranchName, setTargetBranchName] = useState('main');

  // Sync state if active branch or selection changes
  useEffect(() => {
    setSourceBranchName(activeBranchName);
  }, [activeBranchId, activeBranchName]);

  // Sync title when source/target changes
  useEffect(() => {
    setNewTitle(`Merge branch '${sourceBranchName}' into '${targetBranchName}'`);
  }, [sourceBranchName, targetBranchName]);

  const selectedMr = mergeRequests.find(m => m.id === selectedMrId);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const canApprove = currentUserRole === 'Owner' || currentUserRole === 'Producer';

  const handleApprove = (mr: MergeRequest) => {
    onApproveMerge(mr.id);
    onAddActivity('MERGE_BRANCH', `Approved Merge Request #${mr.id.toUpperCase()}: "${mr.title}"`);
    setActionFeedback(`Merge Request #${mr.id.toUpperCase()} approved and merged into ${mr.targetBranch}.`);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleReject = (mr: MergeRequest) => {
    onRejectMerge(mr.id);
    onAddActivity('MERGE_BRANCH', `Rejected Merge Request #${mr.id.toUpperCase()}: "${mr.title}"`);
    setActionFeedback(`Merge Request #${mr.id.toUpperCase()} rejected.`);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Live Diff generator based on branch states
  const generateDiff = (srcName: string, tgtName: string): string[] => {
    const srcBranch = branches.find(b => b.name === srcName);
    const tgtBranch = branches.find(b => b.name === tgtName);

    if (!srcBranch || !tgtBranch) {
      return ["No diff data available: branches not initialized."];
    }

    const srcState = branchStates[srcBranch.id];
    const tgtState = branchStates[tgtBranch.id];

    if (!srcState || !tgtState) {
      // Fallback fallback if one doesn't exist yet to maintain friendly initial UX
      if (srcName === 'vocal-harmonies') {
        return [
          '+ Added Track: "Backing Harmonies Chorus" (volume: 70, pan: -15)',
          '+ Added Clip: "harmonies_high_chorus.wav" at 12.0 sec',
          '~ Adjusted Vol: Lead Vocals (90 -> 82)',
          '~ Adjusted Pan: Ambient Pad (-25 -> -35)'
        ];
      }
      if (srcName === 'acoustic-vibe') {
        return [
          '- Removed Track: "Drums (Kick & Snare)"',
          '+ Added Track: "Percussion Shakers" (volume: 60, pan: 10)',
          '~ Adjusted Vol: Acoustic Guitar (75 -> 85)'
        ];
      }
      return ["~ Adjusted fader metadata alignments", "+ Saved workspace track layouts"];
    }

    const diffs: string[] = [];

    // Compare tracks
    const srcTracks = srcState.tracks;
    const tgtTracks = tgtState.tracks;

    srcTracks.forEach(sTrack => {
      const tTrack = tgtTracks.find(t => t.id === sTrack.id);
      if (!tTrack) {
        diffs.push(`+ Added Track: "${sTrack.name}" (volume: ${sTrack.volume}, pan: ${sTrack.pan})`);
      } else {
        if (sTrack.volume !== tTrack.volume) {
          diffs.push(`~ Adjusted Vol: ${sTrack.name} (${tTrack.volume} -> ${sTrack.volume})`);
        }
        if (sTrack.pan !== tTrack.pan) {
          diffs.push(`~ Adjusted Pan: ${sTrack.name} (${tTrack.pan} -> ${sTrack.pan})`);
        }
        if (sTrack.isMuted !== tTrack.isMuted) {
          diffs.push(`~ Changed Mute: ${sTrack.name} (${tTrack.isMuted ? 'Muted' : 'Unmuted'})`);
        }
      }
    });

    tgtTracks.forEach(tTrack => {
      const sTrack = srcTracks.find(s => s.id === tTrack.id);
      if (!sTrack) {
        diffs.push(`- Removed Track: "${tTrack.name}"`);
      }
    });

    // Compare clips
    const srcClips = srcState.clips;
    const tgtClips = tgtState.clips;

    srcClips.forEach(sClip => {
      const tClip = tgtClips.find(t => t.id === sClip.id);
      if (!tClip) {
        diffs.push(`+ Added Clip: "${sClip.name}" starting at ${sClip.startTime}s`);
      }
    });

    tgtClips.forEach(tClip => {
      const sClip = srcClips.find(s => s.id === tClip.id);
      if (!sClip) {
        diffs.push(`- Removed Clip: "${tClip.name}"`);
      }
    });

    if (diffs.length === 0) {
      return ["~ Identical snapshots. No metadata differences found."];
    }

    return diffs;
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceBranchName === targetBranchName) {
      alert('Source branch and Target branch must be different!');
      return;
    }

    const computedDiff = generateDiff(sourceBranchName, targetBranchName);
    onCreateMergeRequest(
      newTitle,
      newDescription.trim() || 'No description provided.',
      sourceBranchName,
      targetBranchName,
      computedDiff
    );

    // Reset fields
    setNewDescription('');
    setIsCreating(false);
  };

  const liveDiff = generateDiff(sourceBranchName, targetBranchName);

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 h-full flex flex-col gap-4" id="merge-requests-tab">
      {/* Tab Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
        <div className="flex items-center gap-1.5 text-zinc-350">
          <GitPullRequest size={16} className="text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider">Merge Requests (MRs)</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-md shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <GitPullRequest size={12} />
            <span>{isCreating ? "View MR List" : "New Merge Request"}</span>
          </button>
          <span className="text-[10px] bg-blue-950/40 text-blue-400 border border-blue-900/30 px-2 py-0.5 rounded font-semibold">
            {mergeRequests.filter(m => m.status === 'OPEN').length} Open
          </span>
        </div>
      </div>

      {isCreating ? (
        /* Dynamic Merge Request Creation Form */
        <form onSubmit={handleCreateSubmit} className="space-y-4 bg-zinc-900/30 border border-zinc-850 p-4 rounded-xl flex-1 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-300">
              <GitPullRequest size={14} className="text-blue-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Open a New Collaborative Pull Request</h4>
            </div>

            {/* Branch Pickers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-zinc-950 p-3 rounded-lg border border-zinc-900">
              <div>
                <label className="block text-[9px] text-zinc-500 uppercase font-bold mb-1">Source (Compare Branch)</label>
                <select
                  value={sourceBranchName}
                  onChange={(e) => setSourceBranchName(e.target.value)}
                  className="w-full bg-zinc-900 text-zinc-200 text-xs px-2.5 py-1.5 rounded border border-zinc-800 focus:outline-none"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.name}>
                      origin/{b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] text-zinc-500 uppercase font-bold mb-1">Target (Base Branch)</label>
                <select
                  value={targetBranchName}
                  onChange={(e) => setTargetBranchName(e.target.value)}
                  className="w-full bg-zinc-900 text-zinc-200 text-xs px-2.5 py-1.5 rounded border border-zinc-800 focus:outline-none"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.name}>
                      origin/{b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {sourceBranchName === targetBranchName && (
              <div className="bg-amber-950/20 border border-amber-900/40 px-3 py-2 rounded-lg flex items-center gap-2 text-[11px] text-amber-400">
                <AlertCircle size={14} className="shrink-0" />
                <span>Source and Target branches cannot be identical. Please select different branches to merge.</span>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-[9px] text-zinc-500 uppercase font-bold mb-1">Pull Request Title</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Merge backing-harmonies into main"
                className="w-full bg-zinc-950 text-zinc-250 text-xs px-2.5 py-1.5 rounded border border-zinc-800 focus:outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[9px] text-zinc-500 uppercase font-bold mb-1">Description of Changes</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Summarize the creative or layout enhancements you made in this mix..."
                className="w-full bg-zinc-950 text-zinc-250 text-xs px-2.5 py-2 rounded border border-zinc-800 focus:outline-none h-16 resize-none"
              />
            </div>

            {/* Dynamic Metadata Comparison Preview */}
            <div className="space-y-1.5">
              <label className="block text-[9px] text-zinc-550 uppercase font-bold">Incoming Changes Preview (Calculated Diff)</label>
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden font-mono text-[10.5px]">
                <div className="bg-zinc-900/60 px-3 py-1.5 text-[9px] text-zinc-500 flex justify-between border-b border-zinc-900">
                  <span>Branch diff details</span>
                  <span className="text-blue-400">Comparing Snapshots</span>
                </div>
                <div className="p-3 max-h-[120px] overflow-y-auto space-y-1">
                  {liveDiff.map((diffLine, idx) => {
                    const isAdded = diffLine.startsWith('+');
                    const isRemoved = diffLine.startsWith('-');
                    const isChanged = diffLine.startsWith('~');

                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-1.5 px-2 py-0.5 rounded ${
                          isAdded
                            ? 'bg-blue-950/20 text-blue-400'
                            : isRemoved
                            ? 'bg-red-950/20 text-red-400'
                            : 'bg-amber-950/10 text-amber-300'
                        }`}
                      >
                        <span className="select-none font-bold shrink-0 w-2.5">
                          {isAdded ? '+' : isRemoved ? '-' : '~'}
                        </span>
                        <span>{diffLine.substring(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-zinc-900 mt-4">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="flex-1 py-2 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white font-bold text-xs rounded-md border border-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sourceBranchName === targetBranchName}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-md shadow-lg transition flex items-center justify-center gap-1.5"
            >
              <GitPullRequest size={14} />
              <span>Submit Pull Request</span>
            </button>
          </div>
        </form>
      ) : (
        /* Merge Requests Split Pane View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden min-h-[350px]">
          {/* Open Merge Requests Sidebar List */}
          <div className="lg:col-span-5 flex flex-col gap-2.5 overflow-y-auto pr-1">
            {mergeRequests.length === 0 ? (
              <div className="text-center py-12 text-zinc-550 bg-zinc-900/10 rounded-lg border border-zinc-900 border-dashed">
                <CheckCircle2 className="mx-auto text-zinc-700 mb-2" size={24} />
                <p className="text-xs">All merge requests have been successfully resolved.</p>
              </div>
            ) : (
              mergeRequests.map(mr => {
                const isSelected = mr.id === selectedMrId;
                const isOpen = mr.status === 'OPEN';

                return (
                  <div
                    key={mr.id}
                    onClick={() => setSelectedMrId(mr.id)}
                    className={`p-3 rounded-lg border cursor-pointer select-none transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-zinc-900 border-blue-500/40 shadow-md'
                        : 'bg-zinc-950 hover:bg-zinc-900/40 border-zinc-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <GitPullRequest size={11} className={isOpen ? 'text-amber-500' : mr.status === 'MERGED' ? 'text-blue-550' : 'text-rose-500'} />
                          <span className="text-[11px] font-bold text-zinc-500 font-mono">#{mr.id.toUpperCase()}</span>
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase ${
                            mr.status === 'OPEN'
                              ? 'bg-amber-950/40 text-amber-400 border border-amber-900/20'
                              : mr.status === 'MERGED'
                              ? 'bg-blue-950/40 text-blue-400 border border-blue-900/20'
                              : 'bg-rose-950/40 text-rose-400 border border-rose-900/20'
                          }`}>
                            {mr.status}
                          </span>
                        </div>
                        <span className="text-[9px] text-zinc-500 font-mono">
                          {mr.createdAt ? mr.createdAt.substring(0, 10) : 'Just now'}
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-zinc-200 line-clamp-1 mb-1.5">{mr.title}</h4>
                      <p className="text-[11px] text-zinc-450 line-clamp-2 leading-relaxed">{mr.description}</p>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800 text-[10px] text-zinc-500">
                      <span className="flex items-center gap-1 truncate max-w-[150px]">
                        By: <strong className="text-zinc-300">{mr.author}</strong>
                      </span>
                      <span className="flex items-center gap-1 text-[9px] bg-zinc-950 border border-zinc-900 px-1.5 py-0.5 rounded font-mono text-zinc-400">
                        {mr.sourceBranch} {'->'} {mr.targetBranch}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Selected Merge Request Details + METADATA DIFF Panel - Feature 8 */}
          <div className="lg:col-span-7 bg-zinc-900/40 border border-zinc-800 rounded-lg p-3.5 flex flex-col justify-between overflow-y-auto">
            {selectedMr ? (
              <div className="flex flex-col h-full justify-between gap-4">
                <div>
                  {/* Header Information */}
                  <div className="border-b border-zinc-800 pb-3 mb-3">
                    <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                      <span>Target: <strong>{selectedMr.targetBranch}</strong></span>
                      <ChevronRight size={12} className="text-zinc-600" />
                      <span>Source: <strong className="text-blue-400">{selectedMr.sourceBranch}</strong></span>
                    </div>
                    <h3 className="text-sm font-bold text-zinc-100 leading-snug">{selectedMr.title}</h3>
                    <p className="text-xs text-zinc-450 mt-2 leading-relaxed bg-zinc-950/40 p-2.5 rounded border border-zinc-800">
                      {selectedMr.description}
                    </p>
                  </div>

                  {/* Metadata Diff Section - Feature 8 */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-550 flex items-center gap-1">
                      <RefreshCcw size={10} />
                      Project Metadata Diff Details
                    </h4>

                    <div className="bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden font-mono text-[10.5px]">
                      <div className="bg-zinc-900 px-3 py-1.5 border-b border-zinc-800 text-[9px] text-zinc-500 flex justify-between">
                        <span>Metadata Diff File comparison</span>
                        <span className="text-blue-400 font-bold">Line modifications</span>
                      </div>

                      <div className="p-3 divide-y divide-zinc-900/50 space-y-1.5 h-[160px] overflow-y-auto">
                        {selectedMr.metadataDiff.map((diffLine, idx) => {
                          const isAdded = diffLine.startsWith('+');
                          const isRemoved = diffLine.startsWith('-');
                          const isChanged = diffLine.startsWith('~');

                          return (
                            <div
                              key={idx}
                              className={`flex items-start gap-1.5 px-2 py-1 rounded transition ${
                                isAdded
                                  ? 'bg-blue-950/30 text-blue-400 border-l-2 border-blue-500'
                                  : isRemoved
                                  ? 'bg-red-950/30 text-red-400 border-l-2 border-red-500'
                                  : 'bg-amber-950/20 text-amber-300 border-l-2 border-amber-500'
                              }`}
                            >
                              <span className="select-none font-bold shrink-0 w-3">
                                {isAdded ? '+' : isRemoved ? '-' : '~'}
                              </span>
                              <span className="break-all">{diffLine.substring(2)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Feedback Banner */}
                {actionFeedback && (
                  <div className="bg-emerald-950/40 border border-emerald-500/40 px-3 py-2 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                    <span>{actionFeedback}</span>
                  </div>
                )}

                {/* Approve & Reject controls */}
                {selectedMr.status === 'OPEN' ? (
                  canApprove ? (
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800">
                      <button
                        onClick={() => handleReject(selectedMr)}
                        className="py-2 bg-zinc-950 hover:bg-red-950/30 border border-zinc-800 hover:border-red-900/40 text-red-400 font-bold text-xs rounded-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <XCircle size={14} />
                        <span>Reject Merge</span>
                      </button>
                      <button
                        onClick={() => handleApprove(selectedMr)}
                        className="py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-md shadow-lg shadow-blue-950/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 size={14} />
                        <span>Approve & Merge</span>
                      </button>
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-zinc-800">
                      <div className="py-2.5 px-3 bg-amber-950/30 border border-amber-900/40 rounded-md flex items-center justify-center gap-2 text-amber-400 text-xs font-semibold">
                        <Lock size={14} />
                        <span>Awaiting Owner or Producer Approval to Merge</span>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg flex items-center gap-2 justify-center text-xs text-zinc-400">
                    {selectedMr.status === 'MERGED' ? (
                      <span className="text-blue-400 flex items-center gap-1.5 font-bold">
                        <CheckCircle2 size={14} />
                        Merged into target branch
                      </span>
                    ) : (
                      <span className="text-red-500 flex items-center gap-1.5 font-bold">
                        <XCircle size={14} />
                        Rejected
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-10 text-zinc-650">
                <GitPullRequest size={32} className="text-zinc-800 mb-2" />
                <p className="text-xs">Select a Merge Request to review.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
