/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ConflictingTrack } from '../types';
import {
  AlertTriangle,
  GitMerge,
  GitBranch,
  CheckCircle2,
  X,
  Volume2,
  Sliders,
  Music,
  Check,
  Layers,
  ArrowRight
} from 'lucide-react';

interface MergeConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  mrTitle: string;
  sourceBranchName: string;
  targetBranchName: string;
  conflictingTracks: ConflictingTrack[];
  nonConflictingTracksCount?: number;
  onConfirmResolution: (resolutions: Record<string, 'source' | 'target'>) => void;
}

export default function MergeConflictModal({
  isOpen,
  onClose,
  mrTitle,
  sourceBranchName,
  targetBranchName,
  conflictingTracks,
  nonConflictingTracksCount = 0,
  onConfirmResolution
}: MergeConflictModalProps) {
  // Store user choice for each conflicting track id ('source' or 'target')
  const [resolutions, setResolutions] = useState<Record<string, 'source' | 'target'>>(() => {
    const initial: Record<string, 'source' | 'target'> = {};
    conflictingTracks.forEach(ct => {
      initial[ct.trackId] = 'source';
    });
    return initial;
  });

  useEffect(() => {
    const initial: Record<string, 'source' | 'target'> = {};
    conflictingTracks.forEach(ct => {
      initial[ct.trackId] = 'source';
    });
    setResolutions(initial);
  }, [conflictingTracks]);

  if (!isOpen) return null;

  const handleSelectBranchForTrack = (trackId: string, choice: 'source' | 'target') => {
    setResolutions(prev => ({ ...prev, [trackId]: choice }));
  };

  const handleSelectAll = (choice: 'source' | 'target') => {
    const next: Record<string, 'source' | 'target'> = {};
    conflictingTracks.forEach(ct => {
      next[ct.trackId] = choice;
    });
    setResolutions(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmResolution(resolutions);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950/80 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5">
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Resolve Merge Conflicts
                </h3>
                <span className="text-[10px] uppercase font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-800/80 px-2 py-0.5 rounded-full">
                  {conflictingTracks.length} Conflicting Track{conflictingTracks.length !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                Which track of which branch should be kept in the version? Select whether to keep the track from <span className="font-mono text-emerald-400 font-semibold">{sourceBranchName}</span> or <span className="font-mono text-blue-400 font-semibold">{targetBranchName}</span> for each conflicting stem.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
            title="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Global Bulk Selection & Context Bar */}
        <div className="px-4 sm:px-5 py-2.5 bg-zinc-950/50 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
            <GitMerge size={13} className="text-blue-400" />
            <span className="truncate max-w-xs">{mrTitle}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-500 uppercase font-bold mr-1">Quick Resolve:</span>
            <button
              type="button"
              onClick={() => handleSelectAll('source')}
              className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 hover:text-white rounded-md transition cursor-pointer"
            >
              Keep All from {sourceBranchName}
            </button>
            <button
              type="button"
              onClick={() => handleSelectAll('target')}
              className="px-2.5 py-1 text-[11px] font-semibold bg-blue-950/60 hover:bg-blue-900 border border-blue-700/60 text-blue-300 hover:text-white rounded-md transition cursor-pointer"
            >
              Keep All from {targetBranchName}
            </button>
          </div>
        </div>

        {/* Conflicting Tracks List */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {conflictingTracks.map(ct => {
            const currentChoice = resolutions[ct.trackId] || 'source';

            return (
              <div
                key={ct.trackId}
                className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-3.5 sm:p-4 space-y-3 shadow-md"
              >
                {/* Track Header & Diff Badge */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-850 pb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: ct.sourceTrack.color || ct.targetTrack.color || '#3b82f6' }}
                    />
                    <h4 className="text-sm font-bold text-white tracking-wide truncate">
                      {ct.trackName}
                    </h4>
                  </div>

                  {/* Conflict Reasons */}
                  <div className="flex flex-wrap items-center gap-1">
                    {ct.diffReasons.map((reason, rIdx) => (
                      <span
                        key={rIdx}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Question Prompt */}
                <p className="text-[11px] text-zinc-400 font-medium">
                  Which branch version of <strong className="text-zinc-200">"{ct.trackName}"</strong> should be kept in the merged version?
                </p>

                {/* Choice Cards (Source vs Target) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Choice A: Source Branch */}
                  <div
                    onClick={() => handleSelectBranchForTrack(ct.trackId, 'source')}
                    className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-2.5 ${
                      currentChoice === 'source'
                        ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md shadow-emerald-950/50'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <GitBranch size={13} className="text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-300 font-mono">
                          branch: {sourceBranchName}
                        </span>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        currentChoice === 'source'
                          ? 'border-emerald-400 bg-emerald-500 text-black'
                          : 'border-zinc-600 bg-zinc-950'
                      }`}>
                        {currentChoice === 'source' && <Check size={11} className="stroke-[3]" />}
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-zinc-300 font-mono text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Volume Level:</span>
                        <span className="font-bold text-white">{ct.sourceTrack.volume}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Stereo Pan:</span>
                        <span className="text-zinc-200">{ct.sourceTrack.pan > 0 ? `+${ct.sourceTrack.pan}` : ct.sourceTrack.pan}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Clips on Track:</span>
                        <span className="text-emerald-300 font-bold">{ct.sourceClips.length} clip{ct.sourceClips.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    {ct.sourceClips.length > 0 && (
                      <div className="pt-1.5 border-t border-zinc-800/80 text-[10px] text-zinc-400 truncate">
                        Clip: {ct.sourceClips[0].name}
                      </div>
                    )}

                    <div className={`py-1 text-center rounded text-[11px] font-bold uppercase tracking-wider transition ${
                      currentChoice === 'source'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {currentChoice === 'source' ? 'Keeping this branch track' : `Keep from ${sourceBranchName}`}
                    </div>
                  </div>

                  {/* Choice B: Target Branch */}
                  <div
                    onClick={() => handleSelectBranchForTrack(ct.trackId, 'target')}
                    className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-2.5 ${
                      currentChoice === 'target'
                        ? 'bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/50 shadow-md shadow-blue-950/50'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <GitBranch size={13} className="text-blue-400" />
                        <span className="text-xs font-bold text-blue-300 font-mono">
                          branch: {targetBranchName}
                        </span>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        currentChoice === 'target'
                          ? 'border-blue-400 bg-blue-500 text-black'
                          : 'border-zinc-600 bg-zinc-950'
                      }`}>
                        {currentChoice === 'target' && <Check size={11} className="stroke-[3]" />}
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-zinc-300 font-mono text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Volume Level:</span>
                        <span className="font-bold text-white">{ct.targetTrack.volume}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Stereo Pan:</span>
                        <span className="text-zinc-200">{ct.targetTrack.pan > 0 ? `+${ct.targetTrack.pan}` : ct.targetTrack.pan}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">Clips on Track:</span>
                        <span className="text-blue-300 font-bold">{ct.targetClips.length} clip{ct.targetClips.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    {ct.targetClips.length > 0 && (
                      <div className="pt-1.5 border-t border-zinc-800/80 text-[10px] text-zinc-400 truncate">
                        Clip: {ct.targetClips[0].name}
                      </div>
                    )}

                    <div className={`py-1 text-center rounded text-[11px] font-bold uppercase tracking-wider transition ${
                      currentChoice === 'target'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {currentChoice === 'target' ? 'Keeping this branch track' : `Keep from ${targetBranchName}`}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Auto-merged Stems note */}
          {nonConflictingTracksCount > 0 && (
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-3 flex items-center gap-2 text-xs text-zinc-400">
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              <span>
                <strong className="text-zinc-200">{nonConflictingTracksCount} non-conflicting track(s)</strong> (including newly added stem tracks) will be preserved and merged automatically.
              </span>
            </div>
          )}

          {/* Bottom Dialog Action Footer */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer"
              id="btn-confirm-resolve-conflicts"
            >
              <CheckCircle2 size={14} />
              <span>Complete Merge & Keep Selected Tracks</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
