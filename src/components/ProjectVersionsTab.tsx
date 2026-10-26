/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { VersionCommit, TeamMember } from '../types';
import {
  FolderGit2,
  Disc,
  Play,
  CheckCircle2,
  GitPullRequest,
  GitBranch,
  User,
  Clock,
  Music,
  Search,
  ChevronDown,
  ChevronUp,
  FileArchive,
  Activity,
  FileText,
  Copy,
  Check
} from 'lucide-react';

interface ProjectVersionsTabProps {
  commits: VersionCommit[];
  team: TeamMember[];
  projectName: string;
  activeBranchName: string;
  activeLoadedVersionId?: string | null;
  onOpenInWorkspace: (commit: VersionCommit) => void;
  onExportVersion: (commit: VersionCommit) => void;
  onResetToMainWorkspace?: () => void;
  onAddActivity?: (type: string, message: string) => void;
}

export default function ProjectVersionsTab({
  commits = [],
  team = [],
  projectName = 'OurStudio Project',
  activeBranchName = 'main',
  activeLoadedVersionId = null,
  onOpenInWorkspace,
  onExportVersion,
  onResetToMainWorkspace,
  onAddActivity
}: ProjectVersionsTabProps) {
  const [selectedUserCategory, setSelectedUserCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'merges' | 'branches' | 'active'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);
  const [copiedFileName, setCopiedFileName] = useState<string | null>(null);

  // Compute normalized author name helper
  const getAuthorNameOnly = (authorStr: string): string => {
    if (!authorStr) return 'Anonymous';
    return authorStr.replace(/\s*\([^)]*\)/g, '').trim();
  };

  // Deduplicate commits so each version is displayed only once
  const deduplicatedCommits = useMemo(() => {
    const seen = new Set<string>();
    const result: VersionCommit[] = [];

    commits.forEach(commit => {
      if (seen.has(commit.id)) return;
      seen.add(commit.id);

      // If this is an auto-generated "Merge X into Y" title and another version exists with a custom name for the same merge/time, skip the duplicate auto-generated one
      const isAutoMergeTitle = /^Merge\s+['"]?[^'"]+['"]?\s+into\s+['"]?[^'"]+['"]?/i.test(commit.versionName || '');
      if (isAutoMergeTitle) {
        const hasCustomNamedSister = commits.some(
          other => other.id !== commit.id &&
                   !/^Merge\s+/i.test(other.versionName || '') &&
                   ((other.branchName === commit.mergedFromBranch || other.branchName === commit.branchName) ||
                    (other.timestamp && commit.timestamp && other.timestamp === commit.timestamp))
        );
        if (hasCustomNamedSister) {
          return;
        }
      }

      result.push(commit);
    });

    return result;
  }, [commits]);

  // Derive unique contributors who have committed versions
  const contributorCategories = useMemo(() => {
    const map = new Map<string, { label: string; count: number; rawAuthor: string; role?: string }>();

    deduplicatedCommits.forEach(commit => {
      const cleanName = getAuthorNameOnly(commit.author);
      const teamMember = team.find(
        m => m.name.toLowerCase() === cleanName.toLowerCase() ||
             commit.author.toLowerCase().includes(m.name.toLowerCase())
      );
      const roleStr = teamMember ? teamMember.role : (commit.author.match(/\(([^)]+)\)/)?.[1] || '');
      const displayLabel = roleStr ? `${cleanName} (${roleStr})` : cleanName;

      const existing = map.get(cleanName);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(cleanName, {
          label: displayLabel,
          count: 1,
          rawAuthor: commit.author,
          role: roleStr
        });
      }
    });

    return Array.from(map.values());
  }, [deduplicatedCommits, team]);

  // Generate clean .osp file name
  const getVersionFileName = (commit: VersionCommit): string => {
    if (commit.fileName) return commit.fileName;
    const sanitizedProject = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 15);
    const ver = (commit.versionNumber || 'v1.0').toLowerCase().replace(/[^a-z0-9.-]+/g, '_');
    const branch = (commit.branchName || (commit.isMergeCommit ? 'merge' : 'main')).toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return `${sanitizedProject}_${ver}_${branch}.osp`;
  };

  // Get readable version name
  const getDisplayVersionName = (commit: VersionCommit): string => {
    return commit.versionName || commit.message || `Version ${commit.versionNumber}`;
  };

  // Get merge lineage metadata
  const getVersionLineageInfo = (commit: VersionCommit) => {
    const isMerge = Boolean(
      commit.isMergeCommit ||
      commit.mergedFromBranch ||
      commit.message.toLowerCase().includes('merge') ||
      commit.versionNumber.toLowerCase().includes('merge')
    );

    const sourceBranch = commit.mergedFromBranch || (
      commit.message.match(/from branch:?\s*([a-zA-Z0-9_-]+)/i)?.[1] ||
      commit.message.match(/branch "([^"]+)"/i)?.[1] ||
      'feature-branch'
    );

    const targetBranch = commit.branchName || (
      commit.message.match(/into\s+([a-zA-Z0-9_-]+)/i)?.[1] || 'main'
    );

    const mergedBy = commit.mergedBy || commit.author;
    const mergedWith = commit.mergedWithVersions && commit.mergedWithVersions.length > 0
      ? commit.mergedWithVersions.join(', ')
      : 'baseline trunk';

    return {
      isMerge,
      sourceBranch,
      targetBranch,
      mergedBy,
      mergedWith
    };
  };

  // Filter commits
  const filteredCommits = useMemo(() => {
    return deduplicatedCommits.filter(commit => {
      const vName = getDisplayVersionName(commit).toLowerCase();
      const fileName = getVersionFileName(commit).toLowerCase();
      const author = commit.author.toLowerCase();
      const message = (commit.message || '').toLowerCase();
      const description = (commit.description || '').toLowerCase();
      const versionNum = (commit.versionNumber || '').toLowerCase();
      const branch = (commit.branchName || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      if (q) {
        const matchesSearch =
          vName.includes(q) ||
          fileName.includes(q) ||
          author.includes(q) ||
          message.includes(q) ||
          description.includes(q) ||
          versionNum.includes(q) ||
          branch.includes(q);
        if (!matchesSearch) return false;
      }

      if (selectedUserCategory !== 'all') {
        const cleanAuthor = getAuthorNameOnly(commit.author).toLowerCase();
        if (cleanAuthor !== selectedUserCategory.toLowerCase()) {
          return false;
        }
      }

      const lineage = getVersionLineageInfo(commit);
      if (filterType === 'merges' && !lineage.isMerge) return false;
      if (filterType === 'branches' && lineage.isMerge) return false;
      if (filterType === 'active' && commit.id !== activeLoadedVersionId) return false;

      return true;
    });
  }, [deduplicatedCommits, searchQuery, selectedUserCategory, filterType, activeLoadedVersionId, projectName]);

  const handleCopyFileName = (fileName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(fileName);
    setCopiedFileName(fileName);
    setTimeout(() => setCopiedFileName(null), 2000);
  };

  const toggleExpand = (commitId: string) => {
    setExpandedVersionId(prev => prev === commitId ? null : commitId);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <FolderGit2 size={18} />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
              Project Versions
            </h2>
            <span className="text-[10px] uppercase font-mono font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
              {deduplicatedCommits.length} Available
            </span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
            Click on any version name to inspect its description and recorded activity. Open any version directly into your DAW workspace or export its stereo mix.
          </p>
        </div>

        {/* Current Workspace State */}
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-lg p-3 flex items-center gap-3 shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-zinc-500">Workspace Active Version</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono font-bold text-zinc-200">
                {activeLoadedVersionId
                  ? (deduplicatedCommits.find(c => c.id === activeLoadedVersionId)?.versionName || deduplicatedCommits.find(c => c.id === activeLoadedVersionId)?.versionNumber || 'Custom Version')
                  : `main (Live Trunk)`}
              </span>
            </div>
          </div>
          {activeLoadedVersionId && onResetToMainWorkspace && (
            <button
              onClick={onResetToMainWorkspace}
              className="px-2.5 py-1 text-[11px] font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded border border-zinc-700 transition cursor-pointer"
              title="Return DAW workspace to main branch state"
            >
              Reset to Main
            </button>
          )}
        </div>
      </div>

      {/* Categories & Filter Bar */}
      <div className="space-y-3 bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4">
        {/* User Categories (Versions committed by users) */}
        <div>
          <div className="flex items-center gap-2 mb-2 text-zinc-400 text-xs font-semibold">
            <User size={13} className="text-blue-400" />
            <span>Versions Committed By User:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedUserCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                selectedUserCategory === 'all'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30 font-bold'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-750 border border-zinc-750'
              }`}
            >
              <span>All Contributors</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedUserCategory === 'all' ? 'bg-blue-800 text-blue-100' : 'bg-zinc-700 text-zinc-400'
              }`}>
                {deduplicatedCommits.length}
              </span>
            </button>

            {contributorCategories.map(cat => {
              const isSelected = selectedUserCategory.toLowerCase() === getAuthorNameOnly(cat.rawAuthor).toLowerCase();
              return (
                <button
                  key={cat.label}
                  onClick={() => setSelectedUserCategory(getAuthorNameOnly(cat.rawAuthor))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30 font-bold'
                      : 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-750 border border-zinc-750'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-blue-800 text-blue-100' : 'bg-zinc-700 text-zinc-400'
                  }`}>
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search & Type Filters */}
        <div className="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search version name, activity, branch, tag..."
              className="w-full bg-zinc-950 text-xs text-zinc-200 placeholder-zinc-500 pl-9 pr-3 py-2 rounded-lg border border-zinc-800 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 text-[11px] rounded-md font-medium transition cursor-pointer ${
                filterType === 'all' ? 'bg-zinc-700 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              All Versions
            </button>
            <button
              onClick={() => setFilterType('merges')}
              className={`px-2.5 py-1 text-[11px] rounded-md font-medium transition cursor-pointer flex items-center gap-1 ${
                filterType === 'merges'
                  ? 'bg-emerald-800/60 text-emerald-200 border border-emerald-600/50 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <GitPullRequest size={11} className="text-emerald-400" />
              <span>Merges</span>
            </button>
            <button
              onClick={() => setFilterType('branches')}
              className={`px-2.5 py-1 text-[11px] rounded-md font-medium transition cursor-pointer flex items-center gap-1 ${
                filterType === 'branches'
                  ? 'bg-purple-800/60 text-purple-200 border border-purple-600/50 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <GitBranch size={11} className="text-purple-400" />
              <span>Branch Commits</span>
            </button>
            {activeLoadedVersionId && (
              <button
                onClick={() => setFilterType('active')}
                className={`px-2.5 py-1 text-[11px] rounded-md font-medium transition cursor-pointer flex items-center gap-1 ${
                  filterType === 'active'
                    ? 'bg-blue-800/60 text-blue-200 border border-blue-600/50 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                <CheckCircle2 size={11} className="text-blue-400" />
                <span>Active in DAW</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Version Items List */}
      <div className="space-y-2.5">
        {filteredCommits.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center flex flex-col items-center justify-center">
            <FileArchive size={32} className="text-zinc-600 mb-2" />
            <h3 className="text-sm font-bold text-zinc-300">No versions found</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm">
              No project versions match your search or category filter. Try clearing filters or committing your current session from the DAW.
            </p>
          </div>
        ) : (
          filteredCommits.map(commit => {
            const versionName = getDisplayVersionName(commit);
            const fileName = getVersionFileName(commit);
            const lineage = getVersionLineageInfo(commit);
            const isCurrentlyActive = activeLoadedVersionId === commit.id;
            const isExpanded = expandedVersionId === commit.id;
            const tracksCount = commit.metadataSnapshot?.tracks?.length || 0;
            const clipsCount = commit.metadataSnapshot?.clips?.length || 0;
            const tempoVal = commit.metadataSnapshot?.tempo || 96;

            // Formulate activity message
            const activityMessage = commit.activity || (
              lineage.isMerge
                ? `Merged branch "${lineage.sourceBranch}" into "${lineage.targetBranch}" by ${lineage.mergedBy}. Combined arrangements and fader balances.`
                : `Committed session snapshot on branch "${commit.branchName || 'main'}" with ${tracksCount} stems and ${clipsCount} audio clips.`
            );

            // Formulate description
            const descriptionMessage = commit.description || commit.message || 'No description provided for this commit.';

            return (
              <div
                key={commit.id}
                className={`bg-zinc-900 border rounded-xl transition-all shadow-md overflow-hidden ${
                  isCurrentlyActive
                    ? 'border-emerald-500/80 ring-1 ring-emerald-500/40 bg-zinc-900/95'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Main Row: Clean, concise header with Version Name, Tag, Author, and Buttons */}
                <div
                  onClick={() => toggleExpand(commit.id)}
                  className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-zinc-850/60 transition select-none"
                >
                  {/* Left: Version Name, Badges, and Author / Timestamp */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Status / Type Icon */}
                    <div className={`p-2 rounded-lg shrink-0 flex items-center justify-center ${
                      lineage.isMerge
                        ? 'bg-emerald-950/80 border border-emerald-700/60 text-emerald-400'
                        : 'bg-blue-950/80 border border-blue-700/60 text-blue-400'
                    }`}>
                      {lineage.isMerge ? <GitPullRequest size={18} /> : <FolderGit2 size={18} />}
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Version Name and Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm sm:text-base font-bold text-white tracking-wide truncate">
                          {versionName}
                        </span>

                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-950 text-blue-300 border border-blue-900/60">
                          {commit.versionNumber}
                        </span>

                        {isCurrentlyActive && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            ACTIVE IN WORKSPACE
                          </span>
                        )}

                        {lineage.isMerge ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-950/90 text-emerald-300 border border-emerald-800">
                            MERGED TO {lineage.targetBranch.toUpperCase()}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-blue-950/90 text-blue-300 border border-blue-800">
                            {commit.branchName || 'main'}
                          </span>
                        )}
                      </div>

                      {/* Author, File Name & Timestamp (Clean 1-liner) */}
                      <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-zinc-400 mt-1 font-mono">
                        <span className="text-zinc-300 font-medium">By {commit.author}</span>
                        <span className="text-zinc-600">•</span>
                        <span className="flex items-center gap-1 text-zinc-400">
                          <Clock size={11} className="text-zinc-500" />
                          <span>{commit.timestamp}</span>
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-zinc-400 font-mono text-[10px]">{fileName}</span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyFileName(fileName, e)}
                          className="p-0.5 text-zinc-500 hover:text-zinc-200 transition"
                          title="Copy package file name"
                        >
                          {copiedFileName === fileName ? (
                            <Check size={11} className="text-emerald-400" />
                          ) : (
                            <Copy size={11} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right: Open in Workspace button & Export button beside it */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800">
                    {/* Open in Workspace Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenInWorkspace(commit);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md ${
                        isCurrentlyActive
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40 ring-1 ring-emerald-400'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950/40 hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                      title={isCurrentlyActive ? 'Currently active in DAW workspace' : 'Load this version into DAW workspace'}
                    >
                      {isCurrentlyActive ? (
                        <>
                          <CheckCircle2 size={13} className="text-emerald-100" />
                          <span>Loaded in Workspace</span>
                        </>
                      ) : (
                        <>
                          <Play size={12} className="fill-current" />
                          <span>Open in Workspace</span>
                        </>
                      )}
                    </button>

                    {/* Export Button Beside It */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onExportVersion(commit);
                      }}
                      className="px-3 py-1.5 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-950/30 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                      title="Render and export stereo mixdown for this version"
                    >
                      <Disc size={13} className="text-emerald-200" />
                      <span>Export</span>
                    </button>

                    {/* Expand / Collapse Indicator */}
                    <div
                      className="p-1 text-zinc-500 hover:text-zinc-300 transition"
                      title={isExpanded ? 'Hide description and activity' : 'Show description and activity'}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Section: Shown ONLY when clicked */}
                {isExpanded && (
                  <div className="bg-zinc-950 border-t border-zinc-800/80 p-4 space-y-3 animate-fade-in text-xs">
                    {/* Description Section */}
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-zinc-400 font-semibold mb-1 text-[11px] uppercase tracking-wider">
                        <FileText size={13} className="text-blue-400" />
                        <span>Version Description</span>
                      </div>
                      <p className="text-zinc-200 leading-relaxed text-xs">
                        {descriptionMessage}
                      </p>
                    </div>

                    {/* What Was the Activity Section */}
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between text-zinc-400 font-semibold text-[11px] uppercase tracking-wider">
                        <div className="flex items-center gap-1.5">
                          <Activity size={13} className="text-amber-400" />
                          <span>What Was The Activity</span>
                        </div>
                        <span className="font-mono text-[10px] text-zinc-500">
                          {tracksCount} Tracks • {clipsCount} Clips • {tempoVal} BPM
                        </span>
                      </div>

                      <p className="text-zinc-300 leading-relaxed text-xs">
                        {activityMessage}
                      </p>

                      {/* Diff Items & Branch Changes */}
                      {commit.diffSummary && commit.diffSummary.length > 0 && (
                        <div className="pt-2 border-t border-zinc-800/60 flex flex-wrap gap-1.5">
                          {commit.diffSummary.map((diff, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300"
                            >
                              {diff}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Merge Lineage details if merge */}
                      {lineage.isMerge && (
                        <div className="pt-2 border-t border-zinc-800/60 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-400 font-mono">
                          <div>
                            <span className="text-zinc-500">Source: </span>
                            <span className="text-emerald-300 font-semibold">{lineage.sourceBranch}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500">Target: </span>
                            <span className="text-zinc-200 font-semibold">{lineage.targetBranch}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500">Merged by: </span>
                            <span className="text-amber-300 font-semibold">{lineage.mergedBy}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500">Combined with: </span>
                            <span className="text-blue-300">{lineage.mergedWith}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
