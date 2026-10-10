/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Track,
  AudioClip,
  TimelineComment,
  VersionCommit,
  Branch,
  MergeRequest,
  TeamMember,
  ProjectNotification,
  ProjectMetadata,
  ProjectRole
} from './types';
import {
  INITIAL_TRACKS,
  INITIAL_CLIPS,
  INITIAL_COMMENTS,
  INITIAL_BRANCHES,
  INITIAL_COMMITS,
  INITIAL_MERGE_REQUESTS,
  INITIAL_TEAM,
  INITIAL_NOTIFICATIONS
} from './mockData';

import DAWTimeline from './components/DAWTimeline';
import DAWMixer from './components/DAWMixer';
import VersionControl from './components/VersionControl';
import MergeRequests from './components/MergeRequests';
import TeamManagement from './components/TeamManagement';
import CommentsPanel from './components/CommentsPanel';
import CollaborationActivity from './components/CollaborationActivity';
import LandingPage from './components/LandingPage';
import ProjectDirectory from './components/ProjectDirectory';
import ExportMixModal from './components/ExportMixModal';
import AddTrackModal from './components/AddTrackModal';
import CollaboratorSwitcher from './components/CollaboratorSwitcher';
import { useDawHistory } from './utils/useHistoryState';
import {
  getStoredCurrentUser,
  saveCurrentUser,
  getStoredProjects,
  saveProjects,
  Project,
  UserAccount,
  createNewProject,
  resetDemoProjects
} from './projectStorage';

import {
  GitBranch,
  GitPullRequest,
  Users,
  Settings,
  Bell,
  Sparkles,
  Search,
  Music,
  CheckCircle2,
  Lock,
  GitCommit,
  Folder,
  LogOut,
  MessageSquare,
  Activity,
  Check,
  Save,
  Disc
} from 'lucide-react';

export default function App() {
  // Global Authentication & Project Directory States
  const [currentUserAccount, setCurrentUserAccount] = useState<UserAccount | null>(() => getStoredCurrentUser());
  const [projects, setProjects] = useState<Project[]>(() => getStoredProjects());
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    return localStorage.getItem('ourstudio_active_project_id');
  });

  const activeProject = projects.find(p => p.id === activeProjectId);

  // State definitions (loaded/synced dynamically with activeProject)
  const [tracks, setTracks] = useState<Track[]>(() => activeProject?.tracks || INITIAL_TRACKS);
  const [clips, setClips] = useState<AudioClip[]>(() => activeProject?.clips || INITIAL_CLIPS);
  const [comments, setComments] = useState<TimelineComment[]>(() => activeProject?.comments || INITIAL_COMMENTS);
  const [branches, setBranches] = useState<Branch[]>(() => activeProject?.branches || INITIAL_BRANCHES);
  const [activeBranchId, setActiveBranchId] = useState<string>(() => activeProject?.activeBranchId || 'b-1');
  const [commits, setCommits] = useState<VersionCommit[]>(() => activeProject?.commits || INITIAL_COMMITS);
  const [mergeRequests, setMergeRequests] = useState<MergeRequest[]>(() => activeProject?.mergeRequests || INITIAL_MERGE_REQUESTS);
  const [team, setTeam] = useState<TeamMember[]>(() => activeProject?.team || INITIAL_TEAM);
  const [notifications, setNotifications] = useState<ProjectNotification[]>(() => activeProject?.notifications || INITIAL_NOTIFICATIONS);
  const [tempo, setTempo] = useState<number>(() => activeProject?.tempo || 120);

  // Undo / Redo history tracking for tracks and clips
  const history = useDawHistory(
    tracks,
    clips,
    (restoredTracks, restoredClips) => {
      setTracks(restoredTracks);
      setClips(restoredClips);
    }
  );

  const getUserRole = (): ProjectRole => {
    if (!currentUserAccount || !activeProject) return 'Viewer';
    if (activeProject.creatorId === currentUserAccount.id) return 'Owner';
    const member = team.find(
      m => m.email.toLowerCase() === currentUserAccount.email.toLowerCase()
    );
    return member ? member.role : 'Viewer';
  };

  const currentUserAssignedTracks = React.useMemo(() => {
    if (!currentUserAccount || !activeProject) return [];
    if (activeProject.creatorId === currentUserAccount.id) return [];
    const member = team.find(
      m => m.email.toLowerCase() === currentUserAccount.email.toLowerCase()
    );
    return member?.assignedTrackIds || [];
  }, [currentUserAccount, activeProject, team]);

  const currentUserCanAddTracks = React.useMemo(() => {
    if (!currentUserAccount || !activeProject) return true;
    if (activeProject.creatorId === currentUserAccount.id) return true;
    const member = team.find(
      m => m.email.toLowerCase() === currentUserAccount.email.toLowerCase()
    );
    if (!member) return false;
    if (member.role === 'Owner' || member.role === 'Producer') return true;
    if (member.role === 'Viewer') return false;
    return Boolean(member.canAddTracks);
  }, [currentUserAccount, activeProject, team]);

  // computed string variable for backwards compatibility in existing triggers
  const currentUser = currentUserAccount ? `${currentUserAccount.name} (${getUserRole()})` : 'John (Owner)';

  // Active branch metadata state dictionary to preserve workspace adjustments across branch context-switching
  const [branchStates, setBranchStates] = useState<Record<string, { tracks: Track[]; clips: AudioClip[] }>>(() => {
    return {
      'b-1': { tracks: INITIAL_TRACKS, clips: INITIAL_CLIPS },
      'b-2': {
        tracks: INITIAL_TRACKS.map(t => {
          if (t.id === 't-1') return { ...t, isMuted: true };
          if (t.id === 't-4') return { ...t, volume: 85 };
          if (t.id === 't-5') return { ...t, volume: 75 };
          return t;
        }),
        clips: INITIAL_CLIPS.filter(c => c.trackId !== 't-1')
      },
      'b-3': {
        tracks: [
          ...INITIAL_TRACKS,
          { id: 't-harmony', name: 'Backing Harmonies Chorus', volume: 70, pan: -15, isMuted: false, isSoloed: false, color: '#ec4899' }
        ],
        clips: [
          ...INITIAL_CLIPS,
          { id: 'c-harmony-1', trackId: 't-harmony', name: 'vocal_harmonies_chorus_high.wav', startTime: 12, duration: 16, audioUrl: '#', lockedBy: null, color: '#ec4899' }
        ]
      }
    };
  });

  const loadedBranchIdRef = useRef(activeBranchId);

  // Dynamically synchronize active edits (tracks, clips) back to the saved branch states dictionary
  useEffect(() => {
    if (loadedBranchIdRef.current === activeBranchId) {
      setBranchStates(prev => ({
        ...prev,
        [activeBranchId]: { tracks, clips }
      }));
    }
  }, [tracks, clips, activeBranchId]);

  // Active workspace UI selections
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>('t-1');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'daw' | 'versioning' | 'merges' | 'crew' | 'comments' | 'activity'>('daw');
  const [isCommentsCollapsed, setIsCommentsCollapsed] = useState(false);
  const [isActivityCollapsed, setIsActivityCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAddTrackModal, setShowAddTrackModal] = useState(false);

  // Live WebSocket operations activity feed
  const [activityLogs, setActivityLogs] = useState<{ id: string; timestamp: string; message: string; type: string }[]>([]);

  // Open and load a project workspace
  const handleOpenProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      localStorage.setItem('ourstudio_active_project_id', projectId);
      
      const bStates = project.branchStates || {
        'b-1': { tracks: project.tracks || [], clips: project.clips || [] }
      };
      setBranchStates(bStates);

      const targetBranchId = project.activeBranchId || 'b-1';
      setActiveBranchId(targetBranchId);
      loadedBranchIdRef.current = targetBranchId;

      // Populate tracks and clips specifically for the active branch workspace
      const branchSnapshot = bStates[targetBranchId] || { tracks: project.tracks || [], clips: project.clips || [] };
      const pTracks = branchSnapshot.tracks || [];
      const pClips = branchSnapshot.clips || [];

      setTracks(pTracks);
      setClips(pClips);
      setComments(project.comments || []);
      setBranches(project.branches || []);
      setCommits(project.commits || []);
      setMergeRequests(project.mergeRequests || []);
      setTeam(project.team || []);
      setNotifications(project.notifications || []);
      if (project.tempo) {
        setTempo(project.tempo);
      }
      history.resetHistory(pTracks, pClips);

      setActiveProjectId(projectId);
    }
  };

  const handleCloseProject = () => {
    localStorage.removeItem('ourstudio_active_project_id');
    setActiveProjectId(null);
  };

  const handleSaveProject = () => {
    if (!activeProjectId) return;
    setSaveStatus('saving');
    
    setProjects(prevProjects => {
      const idx = prevProjects.findIndex(p => p.id === activeProjectId);
      if (idx === -1) return prevProjects;
      
      const currentProj = prevProjects[idx];
      const updatedProj: Project = {
        ...currentProj,
        tempo,
        tracks,
        clips,
        comments,
        branches,
        activeBranchId,
        branchStates: {
          ...currentProj.branchStates,
          ...branchStates,
          [activeBranchId]: { tracks, clips }
        },
        commits,
        mergeRequests,
        team,
        notifications
      };
      
      const nextProjects = [...prevProjects];
      nextProjects[idx] = updatedProj;
      saveProjects(nextProjects);
      return nextProjects;
    });

    handleAddActivity('MANUAL_SAVE', `Saved all project faders, clips, and mix parameters successfully`);

    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2500);
    }, 800);
  };

  const handleSaveAndExitProject = () => {
    if (!activeProjectId) return;
    // Explicit save before exit
    setProjects(prevProjects => {
      const idx = prevProjects.findIndex(p => p.id === activeProjectId);
      if (idx === -1) return prevProjects;
      
      const currentProj = prevProjects[idx];
      const updatedProj: Project = {
        ...currentProj,
        tempo,
        tracks,
        clips,
        comments,
        branches,
        activeBranchId,
        commits,
        mergeRequests,
        team,
        notifications
      };
      
      const nextProjects = [...prevProjects];
      nextProjects[idx] = updatedProj;
      saveProjects(nextProjects);
      return nextProjects;
    });

    handleAddActivity('SAVE_EXIT', `Saved work and closed project workspace`);
    handleCloseProject();
  };

  // Autosave active project state back to projects database and localStorage
  useEffect(() => {
    if (!activeProjectId) return;
    setProjects(prevProjects => {
      const idx = prevProjects.findIndex(p => p.id === activeProjectId);
      if (idx === -1) return prevProjects;
      
      const currentProj = prevProjects[idx];
      // Skip updates if everything matches perfectly
      if (
        currentProj.tempo === tempo &&
        currentProj.tracks === tracks &&
        currentProj.clips === clips &&
        currentProj.comments === comments &&
        currentProj.branches === branches &&
        currentProj.activeBranchId === activeBranchId &&
        currentProj.commits === commits &&
        currentProj.mergeRequests === mergeRequests &&
        currentProj.team === team &&
        currentProj.notifications === notifications
      ) {
        return prevProjects;
      }
      
      const updatedProj: Project = {
        ...currentProj,
        tempo,
        tracks,
        clips,
        comments,
        branches,
        activeBranchId,
        branchStates: {
          ...currentProj.branchStates,
          ...branchStates,
          [activeBranchId]: { tracks, clips }
        },
        commits,
        mergeRequests,
        team,
        notifications
      };
      
      const nextProjects = [...prevProjects];
      nextProjects[idx] = updatedProj;
      saveProjects(nextProjects);
      return nextProjects;
    });
  }, [activeProjectId, tempo, tracks, clips, comments, branches, activeBranchId, branchStates, commits, mergeRequests, team, notifications]);

  // Append a live activity event to simulate WebSockets in real time
  const handleAddActivity = (type: string, message: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const newLog = {
      id: `log-${Date.now()}-${randomSuffix}`,
      timestamp: time,
      message: message,
      type: type
    };
    setActivityLogs(prev => [newLog, ...prev]);

    // Only notify about user-facing collaboration operations
    // Do NOT create notifications regarding backend, working status, or servers
    const isTechnical = ['SYSTEM', 'WEBSOCKET', 'BACKEND', 'DB'].includes(type) ||
      message.toLowerCase().includes('backend') ||
      message.toLowerCase().includes('working') ||
      message.toLowerCase().includes('server') ||
      message.toLowerCase().includes('stomp') ||
      message.toLowerCase().includes('websocket') ||
      message.toLowerCase().includes('postgres');

    if (!isTechnical) {
      const newNotify: ProjectNotification = {
        id: `notif-${Date.now()}-${randomSuffix}`,
        title: type.toUpperCase().replace(/_/g, ' '),
        message: message,
        type: 'version',
        createdAt: 'Just now',
        unread: true
      };
      setNotifications(prev => [newNotify, ...prev]);
    }
  };

  // 1. Branch switching - Feature 6
  // Swapping the active DAW state (tracks and clips) dynamically based on the selected branch's snapshot metadata!
  const handleSwitchBranch = (branchId: string) => {
    if (branchId === activeBranchId) return;

    // 1. Save current active branch state into state dictionary
    const currentBranchSnapshot = { tracks: [...tracks], clips: [...clips] };
    const updatedStates = {
      ...branchStates,
      [activeBranchId]: currentBranchSnapshot
    };

    loadedBranchIdRef.current = branchId;
    setActiveBranchId(branchId);

    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;

    let targetState = updatedStates[branchId];
    if (!targetState) {
      if (branch.name === 'main') {
        targetState = { tracks: INITIAL_TRACKS, clips: INITIAL_CLIPS };
      } else if (branch.parentBranchId && updatedStates[branch.parentBranchId]) {
        targetState = {
          tracks: [...updatedStates[branch.parentBranchId].tracks],
          clips: [...updatedStates[branch.parentBranchId].clips]
        };
      } else {
        targetState = { tracks: [], clips: [] };
      }
      updatedStates[branchId] = targetState;
    }

    setBranchStates(updatedStates);
    setTracks(targetState.tracks);
    setClips(targetState.clips);
    history.resetHistory(targetState.tracks, targetState.clips);
    setSelectedClipId(null);
    setSelectedTrackId(targetState.tracks[0]?.id || null);

    handleAddActivity('BRANCH_SWITCH', `Switched active workspace branch to "${branch.name}"`);
  };

  // Create new branch - Feature 6
  const handleCreateBranch = (name: string) => {
    const newBranchId = `b-${Date.now()}`;
    const newBranch: Branch = {
      id: newBranchId,
      name: name,
      parentBranchId: activeBranchId,
      createdAt: new Date().toISOString().slice(0, 10),
      author: currentUser,
      isLocked: false
    };

    // Store a duplicate of current active tracks and clips under the new branch name in branchStates
    const currentSnapshot = { tracks: [...tracks], clips: [...clips] };
    const nextStates = {
      ...branchStates,
      [activeBranchId]: currentSnapshot,
      [newBranchId]: { tracks: [...tracks], clips: [...clips] }
    };

    setBranchStates(nextStates);
    setBranches([...branches, newBranch]);
    
    // Set ref synchronously before switching ID to keep state flow pristine
    loadedBranchIdRef.current = newBranchId;
    setActiveBranchId(newBranchId);
    history.resetHistory(tracks, clips);
    handleAddActivity('CREATE_BRANCH', `Forked new branch "${name}" from "${activeBranchName}"`);
  };

  // 2. Save snapshot commit - Feature 5
  const handleSaveVersion = (message: string, versionNum: string, autoPush?: boolean, targetBranchName?: string) => {
    const currentMetadata: ProjectMetadata = {
      tempo: 96,
      timeSignature: '4/4',
      tracks: [...tracks],
      clips: [...clips]
    };

    const newCommit: VersionCommit = {
      id: `c-rev-${Date.now()}`,
      versionNumber: versionNum,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      author: currentUser,
      message: message,
      metadataSnapshot: currentMetadata,
      pushed: autoPush ? true : false
    };

    setCommits([newCommit, ...commits]);

    const finalTargetName = targetBranchName || activeBranchName;

    if (autoPush) {
      handleAddActivity('PUSH', `Committed and pushed snapshot "${versionNum}" successfully to origin/${finalTargetName}`);
      const newNotif = {
        id: `notif-push-${Date.now()}`,
        title: 'Committed & Pushed',
        message: `Successfully pushed snapshot "${versionNum}" to origin/${finalTargetName}`,
        type: 'version' as const,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        unread: true
      };
      setNotifications([newNotif, ...notifications]);
    } else {
      handleAddActivity('SAVE_VERSION', `Created local commit snapshot "${versionNum}": "${message}"`);
    }
  };

  // Push local commits to remote branch
  const handlePush = (targetBranchName?: string) => {
    const localCommits = commits.filter(c => c.pushed === false);
    if (localCommits.length === 0) {
      alert('All commits are already pushed to origin remote!');
      return;
    }

    const finalTargetName = targetBranchName || activeBranchName;

    setCommits(prev => prev.map(c => c.pushed === false ? { ...c, pushed: true } : c));
    handleAddActivity('PUSH', `Pushed ${localCommits.length} local commits to tracking branch origin/${finalTargetName}`);

    const newNotif = {
      id: `notif-push-${Date.now()}`,
      title: 'Repository Pushed',
      message: `Successfully pushed ${localCommits.length} local commits to origin/${finalTargetName}`,
      type: 'version' as const,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      unread: true
    };
    setNotifications([newNotif, ...notifications]);
    alert(`Successfully pushed ${localCommits.length} commits to tracking branch origin/${finalTargetName}!`);
  };

  // Rollback state to a historical commit snapshot - Feature 5
  const handleRestoreSnapshot = (metadata: ProjectMetadata) => {
    setTracks(metadata.tracks);
    setClips(metadata.clips);
    setSelectedClipId(null);
  };

  // Create a new Merge Request dynamically
  const handleCreateMergeRequest = (
    title: string,
    description: string,
    sourceBranch: string,
    targetBranch: string,
    metadataDiff: string[]
  ) => {
    const newMr: MergeRequest = {
      id: `mr-${Date.now().toString().slice(-4)}`,
      title: title,
      description: description,
      sourceBranch: sourceBranch,
      targetBranch: targetBranch,
      author: currentUser,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      metadataDiff: metadataDiff
    };

    setMergeRequests([newMr, ...mergeRequests]);
    handleAddActivity('CREATE_MERGE_REQUEST', `Opened Merge Request #${newMr.id.toUpperCase()}: "${title}" (${sourceBranch} -> ${targetBranch})`);
    
    const newNotif = {
      id: `notif-mr-${Date.now()}`,
      title: 'New Merge Request Opened',
      message: `${currentUser} opened a request to merge "${sourceBranch}" into "${targetBranch}"`,
      type: 'merge_request' as const,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      unread: true
    };
    setNotifications([newNotif, ...notifications]);
  };

  // 3. Approve Merge Request - Feature 7
  // Perform a full visual git merge of the source branch clips/tracks into master/target!
  const handleApproveMerge = (mrId: string) => {
    const role = getUserRole();
    if (role !== 'Owner' && role !== 'Producer') {
      handleAddActivity('PERMISSION_DENIED', `User role "${role}" cannot approve merge requests. Requires Owner or Producer.`);
      alert('Only the Project Owner or Producer can approve and merge requests.');
      return;
    }

    const mr = mergeRequests.find(m => m.id === mrId);
    if (!mr) return;

    setMergeRequests(prev => prev.map(m => m.id === mrId ? { ...m, status: 'MERGED' as const } : m));

    const sourceBranchObj = branches.find(b => b.name === mr.sourceBranch);
    const targetBranchObj = branches.find(b => b.name === mr.targetBranch);

    if (sourceBranchObj && targetBranchObj) {
      const srcState = branchStates[sourceBranchObj.id] || { tracks: [], clips: [] };
      const tgtState = branchStates[targetBranchObj.id] || { tracks: [...tracks], clips: [...clips] };

      // Additive Musical Merge Algorithm:
      // 1. Start with target branch tracks
      const mergedTracks: Track[] = [...tgtState.tracks];

      srcState.tracks.forEach(sTrack => {
        const existingIdx = mergedTracks.findIndex(
          t => t.id === sTrack.id || t.name.toLowerCase().trim() === sTrack.name.toLowerCase().trim()
        );
        if (existingIdx >= 0) {
          // If track already exists in target, merge fader/pan/solo/fx parameters
          mergedTracks[existingIdx] = {
            ...mergedTracks[existingIdx],
            volume: sTrack.volume,
            pan: sTrack.pan,
            isMuted: sTrack.isMuted,
            isSoloed: sTrack.isSoloed,
            color: sTrack.color || mergedTracks[existingIdx].color,
            automation: sTrack.automation || mergedTracks[existingIdx].automation
          };
        } else {
          // New track from source branch: add it into target branch!
          mergedTracks.push({ ...sTrack });
        }
      });

      // 2. Start with target branch clips
      const mergedClips: AudioClip[] = [...tgtState.clips];

      srcState.clips.forEach(sClip => {
        const existingClipIdx = mergedClips.findIndex(c => c.id === sClip.id);
        if (existingClipIdx >= 0) {
          mergedClips[existingClipIdx] = { ...sClip };
        } else {
          mergedClips.push({ ...sClip });
        }
      });

      // Save merged state under target branch in branchStates
      const nextStates = {
        ...branchStates,
        [targetBranchObj.id]: { tracks: mergedTracks, clips: mergedClips }
      };
      setBranchStates(nextStates);

      // If target branch is the currently active branch, update immediate workspace states
      if (activeBranchId === targetBranchObj.id) {
        setTracks(mergedTracks);
        setClips(mergedClips);
        history.pushSnapshot(mergedTracks, mergedClips, `Merged branch "${mr.sourceBranch}" into "${mr.targetBranch}"`);
      }

      // Auto commit a merge record
      const mergeCommit: VersionCommit = {
        id: `c-merge-${Date.now()}`,
        versionNumber: `v-merge-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        author: currentUser,
        message: `Merge pull request #${mrId.toUpperCase()} from branch: ${mr.sourceBranch} into ${mr.targetBranch}`,
        metadataSnapshot: {
          tempo: tempo,
          timeSignature: '4/4',
          tracks: mergedTracks,
          clips: mergedClips
        },
        pushed: true
      };
      setCommits([mergeCommit, ...commits]);

      handleAddActivity('MERGE_BRANCH', `Merged branch "${mr.sourceBranch}" into "${mr.targetBranch}". Changes combined!`);

      const newNotif: ProjectNotification = {
        id: `notif-merge-${Date.now()}`,
        title: 'Merge Request Accepted',
        message: `Branch "${mr.sourceBranch}" was successfully merged into "${mr.targetBranch}"`,
        type: 'merge_request',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        unread: true
      };
      setNotifications(prev => [newNotif, ...prev]);
    }
  };

  const handleRejectMerge = (mrId: string) => {
    setMergeRequests(prev => prev.map(mr => mr.id === mrId ? { ...mr, status: 'REJECTED' as const } : mr));
  };

  // 4. Timeline Comments - Feature 10
  const handleAddComment = (text: string, timestamp: number) => {
    const newComment: TimelineComment = {
      id: `com-user-${Date.now()}`,
      author: currentUser,
      avatar: currentUserAccount?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&fit=crop&q=80',
      timestamp: timestamp,
      text: text,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setComments([...comments, newComment]);
  };

  const handleDeleteComment = (commentId: string) => {
    setComments(comments.filter(c => c.id !== commentId));
  };

  // 5. Team Crew - Feature 11
  const handleInviteMember = (
    name: string,
    email: string,
    role: ProjectRole,
    assignedTrackIds?: string[],
    avatar?: string,
    canAddTracks?: boolean
  ) => {
    const newMember: TeamMember = {
      id: `tm-${Date.now()}`,
      name: name,
      email: email,
      role: role,
      avatar: avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&fit=crop&q=80',
      assignedTrackIds: assignedTrackIds || [],
      canAddTracks: canAddTracks !== undefined ? canAddTracks : (role === 'Producer' || role === 'Owner')
    };
    setTeam(prev => {
      const nextTeam = [...prev, newMember];
      if (activeProjectId) {
        setProjects(prevProjects => {
          const idx = prevProjects.findIndex(p => p.id === activeProjectId);
          if (idx === -1) return prevProjects;
          const nextProjects = [...prevProjects];
          nextProjects[idx] = { ...nextProjects[idx], team: nextTeam };
          saveProjects(nextProjects);
          return nextProjects;
        });
      }
      return nextTeam;
    });
    handleAddActivity('INVITE_MEMBER', `Invited ${name} as ${role}${assignedTrackIds && assignedTrackIds.length > 0 ? ` for ${assignedTrackIds.length} track(s)` : ''}`);
  };

  const handleUpdateMemberRole = (
    id: string,
    role: ProjectRole,
    assignedTrackIds?: string[],
    canAddTracks?: boolean
  ) => {
    setTeam(prev => {
      const nextTeam = prev.map(m =>
        m.id === id
          ? {
              ...m,
              role: role,
              ...(assignedTrackIds !== undefined ? { assignedTrackIds } : {}),
              ...(canAddTracks !== undefined ? { canAddTracks } : {})
            }
          : m
      );
      if (activeProjectId) {
        setProjects(prevProjects => {
          const idx = prevProjects.findIndex(p => p.id === activeProjectId);
          if (idx === -1) return prevProjects;
          const nextProjects = [...prevProjects];
          nextProjects[idx] = { ...nextProjects[idx], team: nextTeam };
          saveProjects(nextProjects);
          return nextProjects;
        });
      }
      return nextTeam;
    });
    handleAddActivity('UPDATE_ROLE', 'Updated collaborator permissions');
  };

  const handleRemoveMember = (id: string) => {
    const target = team.find(m => m.id === id);
    setTeam(prev => {
      const nextTeam = prev.filter(m => m.id !== id);
      if (activeProjectId) {
        setProjects(prevProjects => {
          const idx = prevProjects.findIndex(p => p.id === activeProjectId);
          if (idx === -1) return prevProjects;
          const nextProjects = [...prevProjects];
          nextProjects[idx] = { ...nextProjects[idx], team: nextTeam };
          saveProjects(nextProjects);
          return nextProjects;
        });
      }
      return nextTeam;
    });
    handleAddActivity('REMOVE_MEMBER', `Removed collaborator ${target?.name || 'member'} from project`);
  };

  // Track & Clip modifiers with Undo/Redo history support
  const handleUpdateTrack = (trackId: string, updates: Partial<Track>, actionName?: string) => {
    setTracks(prev => {
      const nextTracks = prev.map(t => t.id === trackId ? { ...t, ...updates } : t);
      let desc = actionName;
      if (!desc) {
        if (updates.volume !== undefined) desc = 'Adjust Volume';
        else if (updates.pan !== undefined) desc = 'Adjust Pan';
        else if (updates.isMuted !== undefined) desc = updates.isMuted ? 'Mute Track' : 'Unmute Track';
        else if (updates.isSoloed !== undefined) desc = updates.isSoloed ? 'Solo Track' : 'Unsolo Track';
        else if (updates.distortion !== undefined) desc = 'Adjust Distortion';
        else if (updates.compressorEnabled !== undefined) desc = 'Toggle Compressor';
        else if (updates.eqLow !== undefined || updates.eqMid !== undefined || updates.eqHigh !== undefined) desc = 'Adjust EQ';
        else desc = 'Update Track Settings';
      }
      history.pushSnapshot(nextTracks, clips, desc);
      return nextTracks;
    });
  };

  const handleUpdateClips = (
    newClipsOrUpdater: AudioClip[] | ((prev: AudioClip[]) => AudioClip[]),
    actionName: string = 'Edit Clips'
  ) => {
    if (typeof newClipsOrUpdater === 'function') {
      setClips(prev => {
        const next = newClipsOrUpdater(prev);
        history.pushSnapshot(tracks, next, actionName);
        return next;
      });
    } else {
      history.pushSnapshot(tracks, newClipsOrUpdater, actionName);
      setClips(newClipsOrUpdater);
    }
  };

  // Timeline seek playhead helper
  const handleSeekCursor = (seconds: number) => {
    setCurrentTime(seconds);
  };

  // Timeline track creation helper - opens user naming dialog
  const handleAddTrack = () => {
    // User requirement: irrespective of his role, when a person adds a new track, he should be able to work on it
    setShowAddTrackModal(true);
  };

  const handleConfirmAddTrack = (name: string, color: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const userIdentifier = currentUserAccount?.email || currentUser;
    const newId = `t-user-${Date.now()}`;
    const newTrack: Track = {
      id: newId,
      name: trimmedName,
      volume: 80,
      pan: 0,
      isMuted: false,
      isSoloed: false,
      color: color,
      createdBy: userIdentifier
    };

    const nextTracks = [...tracks, newTrack];
    history.pushSnapshot(nextTracks, clips, `Add Track "${trimmedName}"`);
    setTracks(nextTracks);
    setSelectedTrackId(newTrack.id);

    // Auto-assign to user in team so they also have it in assignedTrackIds
    if (currentUserAccount) {
      setTeam(prevTeam => prevTeam.map(m => {
        if (m.email.toLowerCase() === currentUserAccount.email.toLowerCase()) {
          const currentAssigned = m.assignedTrackIds || [];
          return {
            ...m,
            assignedTrackIds: [...currentAssigned, newId]
          };
        }
        return m;
      }));
    }

    handleAddActivity('ADD_TRACK', `Created track "${newTrack.name}"`);
  };

  const handleImportTrack = (trackName: string, clipName: string, duration: number, color: string, targetTrackId?: string, startTime?: number, audioUrl?: string) => {
    const userIdentifier = currentUserAccount?.email || currentUser;
    if (targetTrackId) {
      const existingTrack = tracks.find(t => t.id === targetTrackId);
      const clipColor = existingTrack ? existingTrack.color : color;
      
      const clipId = `clip-import-${Date.now()}`;
      const newClip: AudioClip = {
        id: clipId,
        trackId: targetTrackId,
        name: clipName,
        startTime: startTime !== undefined ? startTime : 0,
        duration: duration || 16,
        audioUrl: audioUrl || '#',
        lockedBy: null,
        color: clipColor
      };
      
      const nextClips = [...clips, newClip];
      history.pushSnapshot(tracks, nextClips, `Import Clip "${clipName}"`);
      setClips(nextClips);
      setSelectedClipId(clipId);
      setSelectedTrackId(targetTrackId);
      handleAddActivity('IMPORT_CLIP', `Imported external audio clip "${clipName}" into track "${existingTrack?.name || 'Existing Track'}" successfully`);
    } else {
      const trackId = `t-user-import-${Date.now()}`;
      const newTrack: Track = {
        id: trackId,
        name: trackName,
        volume: 80,
        pan: 0,
        isMuted: false,
        isSoloed: false,
        color: color,
        createdBy: userIdentifier
      };

      const clipId = `clip-import-${Date.now()}`;
      const newClip: AudioClip = {
        id: clipId,
        trackId: trackId,
        name: clipName,
        startTime: startTime !== undefined ? startTime : 0,
        duration: duration || 16,
        audioUrl: audioUrl || '#',
        lockedBy: null,
        color: color
      };

      const nextTracks = [...tracks, newTrack];
      const nextClips = [...clips, newClip];
      history.pushSnapshot(nextTracks, nextClips, `Import Track "${trackName}"`);
      setTracks(nextTracks);
      setClips(nextClips);
      setSelectedTrackId(trackId);
      setSelectedClipId(clipId);

      // Auto-assign to user in team
      if (currentUserAccount) {
        setTeam(prevTeam => prevTeam.map(m => {
          if (m.email.toLowerCase() === currentUserAccount.email.toLowerCase()) {
            const currentAssigned = m.assignedTrackIds || [];
            return {
              ...m,
              assignedTrackIds: [...currentAssigned, trackId]
            };
          }
          return m;
        }));
      }

      handleAddActivity('IMPORT_TRACK', `Imported external track "${trackName}" (${clipName}) successfully into session`);
    }
  };

  // Search logic - Feature 13
  const activeBranchName = branches.find(b => b.id === activeBranchId)?.name || 'main';

  // Clear unread badge
  const clearNotifications = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const handleSwitchDemoAccount = (user: UserAccount) => {
    // 1. Commit active project state to storage before switching persona
    if (activeProjectId) {
      setProjects(prevProjects => {
        const idx = prevProjects.findIndex(p => p.id === activeProjectId);
        if (idx === -1) return prevProjects;
        const currentProj = prevProjects[idx];
        const updatedProj: Project = {
          ...currentProj,
          tempo,
          tracks,
          clips,
          comments,
          branches,
          activeBranchId,
          commits,
          mergeRequests,
          team,
          notifications
        };
        const next = [...prevProjects];
        next[idx] = updatedProj;
        saveProjects(next);
        return next;
      });
    }

    // 2. Update active user
    setCurrentUserAccount(user);
    saveCurrentUser(user);

    // 3. Check access rights to current project
    if (activeProjectId) {
      const currentProj = projects.find(p => p.id === activeProjectId);
      if (currentProj) {
        const isOwner = currentProj.creatorId === user.id;
        const member = currentProj.team.find(
          m => m.email.toLowerCase() === user.email.toLowerCase()
        );

        if (isOwner || member) {
          const role = isOwner ? 'Owner' : (member?.role || 'Viewer');
          handleAddActivity('USER_SWITCH', `Switched active session to ${user.name} (${role})`);
          if (member?.role === 'Track Editor' && member.assignedTrackIds && member.assignedTrackIds.length > 0) {
            setSelectedTrackId(member.assignedTrackIds[0]);
          }
        } else {
          // If the user has not been invited to this project, redirect them to their dashboard
          handleCloseProject();
        }
      }
    }
  };

  if (!currentUserAccount) {
    return (
      <LandingPage
        onLoginSuccess={(user) => {
          setCurrentUserAccount(user);
          saveCurrentUser(user);
        }}
      />
    );
  }

  if (!activeProjectId) {
    return (
      <ProjectDirectory
        currentUser={currentUserAccount}
        projects={projects}
        onOpenProject={handleOpenProject}
        onSwitchUser={handleSwitchDemoAccount}
        onResetDemoData={() => {
          const fresh = resetDemoProjects();
          setProjects(fresh);
        }}
        onCreateProject={(name, description, genre, tempo, timeSignature) => {
          const newProj = createNewProject(name, description, genre, tempo, timeSignature, currentUserAccount);
          const nextProjects = [newProj, ...projects];
          setProjects(nextProjects);
          saveProjects(nextProjects);
          handleOpenProject(newProj.id);
        }}
        onEditProject={(projectId, name, description, genre, tempo) => {
          const nextProjects = projects.map(p => p.id === projectId ? { ...p, name, description, genre, tempo } : p);
          setProjects(nextProjects);
          saveProjects(nextProjects);
        }}
        onDeleteProject={(projectId) => {
          const nextProjects = projects.filter(p => p.id !== projectId);
          setProjects(nextProjects);
          saveProjects(nextProjects);
        }}
        onLogout={() => {
          setCurrentUserAccount(null);
          saveCurrentUser(null);
          handleCloseProject();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 flex flex-col font-sans select-none antialiased">
      {/* Studio Global App-Header */}
      <header className="bg-zinc-900/50 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {/* Brand Logo */}
          <div className="bg-blue-600 p-2 rounded-md text-white shadow-lg shadow-blue-950/20 flex items-center justify-center">
            <Music size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold font-display uppercase tracking-wider text-white">OurStudio</h1>
              <span className="text-[10px] bg-zinc-950 text-zinc-500 font-mono border border-zinc-800 px-1.5 py-0.5 rounded">v1.0.0-MVP</span>
            </div>
            <p className="text-[10px] text-zinc-500 font-medium">Create Together. Version Everything.</p>
          </div>
        </div>

        {/* Global Repository Roster details */}
        <div className="hidden md:flex items-center gap-4 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] font-bold text-zinc-500">repo:</span>
            <span className="text-[11px] font-mono font-semibold text-blue-400">OurStudio/lofi-collab-vibe</span>
          </div>
          <div className="h-4 w-px bg-zinc-800"></div>
          <div className="flex items-center gap-1">
            <GitBranch size={11} className="text-zinc-500" />
            <span className="text-[11px] font-semibold text-zinc-300">{activeBranchName}</span>
          </div>
        </div>

         {/* Header Right Widgets */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          {/* Export Mix Master Button */}
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold transition shadow-md shadow-emerald-950/30 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            title="Export & Render Stereo Master Mixdown"
            id="btn-export-mix-header"
          >
            <Disc size={13} className="animate-spin-slow text-emerald-200" />
            <span>Export Mix</span>
          </button>

          {/* Explicit Save Project Button */}
          <button
            onClick={handleSaveProject}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-lg text-xs font-semibold transition shadow-md shadow-blue-950/20 cursor-pointer"
            title="Save all changes manually to storage"
            id="btn-save-project-header"
          >
            {saveStatus === 'saving' ? (
              <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
            ) : saveStatus === 'saved' ? (
              <Check size={13} className="text-emerald-300" />
            ) : (
              <Save size={13} />
            )}
            <span>{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save Project'}</span>
          </button>

          {/* Explicit Save and Exit Project Button */}
          <button
            onClick={handleSaveAndExitProject}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 hover:text-white rounded-lg text-xs font-semibold text-zinc-300 transition border border-zinc-800 cursor-pointer"
            title="Save changes and Exit to Project Directory"
            id="btn-exit-project-header"
          >
            <LogOut size={13} className="text-rose-400" />
            <span>Save & Exit</span>
          </button>

          {/* Interactive Search query input */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-2.5 top-2 text-zinc-600" size={14} />
            <input
              type="text"
              placeholder="Search songs, artists, commits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-950 text-zinc-200 placeholder-zinc-600 text-xs pl-8 pr-3 py-1.5 rounded-lg border border-zinc-800 w-52 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
            />
          </div>

          {/* Live Notification Indicator Dropdown Bell */}
          <div className="relative">
            {(() => {
              const filteredNotifications = notifications.filter(notif => {
                const text = `${notif.title} ${notif.message}`.toLowerCase();
                return (
                  !text.includes('backend') &&
                  !text.includes('working') &&
                  !text.includes('work') &&
                  !text.includes('stomp') &&
                  !text.includes('websocket') &&
                  !text.includes('postgres') &&
                  !text.includes('server') &&
                  !text.includes('system') &&
                  !text.includes('status') &&
                  !text.includes('connected') &&
                  !text.includes('connection')
                );
              });
              const hasUnread = filteredNotifications.some(n => n.unread);

              return (
                <>
                  <button
                    onClick={() => {
                      setShowNotifications(!showNotifications);
                      if (!showNotifications) clearNotifications();
                    }}
                    className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition relative cursor-pointer"
                    title="Repository Notifications"
                    id="btn-notifications-bell"
                  >
                    <Bell size={15} />
                    {hasUnread && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                    )}
                  </button>

                  {/* Notifications overlay menu */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-2.5 w-72 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl p-3 z-50 animate-fade-in divide-y divide-zinc-800">
                      <div className="flex items-center justify-between pb-2 mb-2">
                        <span className="text-[10px] font-bold uppercase text-zinc-400">Collaboration Alerts</span>
                        <span className="text-[9px] text-zinc-500 font-mono">{filteredNotifications.length} updates</span>
                      </div>
                      <div className="space-y-2 pt-2 max-h-56 overflow-y-auto">
                        {filteredNotifications.length === 0 ? (
                          <div className="text-zinc-500 text-[10px] text-center py-4">No new alerts</div>
                        ) : (
                          filteredNotifications.map(notif => (
                            <div key={notif.id} className="text-[11px] leading-relaxed pb-1.5">
                              <div className="flex justify-between font-semibold text-zinc-200">
                                <span>{notif.title}</span>
                                <span className="text-[9px] text-zinc-500 font-mono font-normal">{notif.createdAt}</span>
                              </div>
                              <p className="text-zinc-400 text-[10px] mt-0.5">{notif.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Active Collaborator Persona Switcher */}
          <CollaboratorSwitcher
            currentUser={currentUserAccount}
            currentRole={getUserRole()}
            onSwitchUser={handleSwitchDemoAccount}
            projectTeam={team}
            projectCreatorId={activeProject?.creatorId}
            onLogout={() => {
              setCurrentUserAccount(null);
              saveCurrentUser(null);
              handleCloseProject();
            }}
          />
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-[1500px] w-full mx-auto p-4 flex flex-col gap-4">
        
        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-zinc-900 pb-2 gap-2">
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('daw')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition ${
                activeTab === 'daw' ? 'bg-zinc-800 text-white border-b-2 border-blue-500 shadow-inner' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
              }`}
            >
              <Music size={13} className="text-blue-400" />
              <span>DAW Workspace</span>
            </button>

            <button
              onClick={() => setActiveTab('versioning')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition ${
                activeTab === 'versioning' ? 'bg-zinc-800 text-white border-b-2 border-blue-500 shadow-inner' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
              }`}
            >
              <GitCommit size={13} className="text-blue-400" />
              <span>Version Ledger</span>
            </button>

            <button
              onClick={() => setActiveTab('merges')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition ${
                activeTab === 'merges' ? 'bg-zinc-800 text-white border-b-2 border-blue-500 shadow-inner' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
              }`}
            >
              <GitPullRequest size={13} className="text-blue-400" />
              <span>Merge Requests</span>
              {mergeRequests.filter(m => m.status === 'OPEN').length > 0 && (
                <span className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
                  {mergeRequests.filter(m => m.status === 'OPEN').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('crew')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition ${
                activeTab === 'crew' ? 'bg-zinc-800 text-white border-b-2 border-blue-500 shadow-inner' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
              }`}
            >
              <Users size={13} className="text-blue-400" />
              <span>Studio Crew</span>
            </button>

            <button
              onClick={() => setActiveTab('comments')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition ${
                activeTab === 'comments' ? 'bg-zinc-800 text-white border-b-2 border-blue-500 shadow-inner' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
              }`}
              id="tab-btn-comments"
            >
              <MessageSquare size={13} className="text-blue-400" />
              <span>Timeline Feedbacks</span>
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition ${
                activeTab === 'activity' ? 'bg-zinc-800 text-white border-b-2 border-blue-500 shadow-inner' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
              }`}
              id="tab-btn-activity"
            >
              <Activity size={13} className="text-blue-400" />
              <span>Active Session</span>
            </button>
          </div>

          <div className="text-[10px] text-zinc-500 font-mono font-semibold bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800">
            Tempo: <span className="text-blue-400 font-bold">{tempo} BPM</span> | Time: <span className="text-blue-400 font-bold">4/4</span>
          </div>
        </div>

        {/* TABS CONTENT PANELS */}

        {/* TAB 1: DAW WORKSPACE HUB */}
        {activeTab === 'daw' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1 items-start">
            {/* Left DAW timeline & Mixer panel (8/12 grid span) */}
            <div className="xl:col-span-8 flex flex-col gap-4 min-w-0">
              {/* Timeline multitrack workspace */}
              <div className="h-[430px]">
                <DAWTimeline
                  tracks={tracks}
                  clips={clips}
                  comments={comments}
                  selectedClipId={selectedClipId}
                  onSelectClip={setSelectedClipId}
                  onUpdateClips={handleUpdateClips}
                  onAddTrack={handleAddTrack}
                  onUpdateTrack={handleUpdateTrack}
                  selectedTrackId={selectedTrackId}
                  onSelectTrack={setSelectedTrackId}
                  onAddActivity={handleAddActivity}
                  currentUser={currentUser}
                  onImportTrack={handleImportTrack}
                  isPlaying={isPlaying}
                  setIsPlaying={setIsPlaying}
                  currentTime={currentTime}
                  setCurrentTime={setCurrentTime}
                  currentUserRole={getUserRole()}
                  currentUserAssignedTracks={currentUserAssignedTracks}
                  currentUserCanAddTracks={currentUserCanAddTracks}
                  currentUserEmail={currentUserAccount?.email}
                  tempo={tempo}
                  onUpdateTempo={setTempo}
                  canUndo={history.canUndo}
                  canRedo={history.canRedo}
                  onUndo={history.undo}
                  onRedo={history.redo}
                  undoActionName={history.undoActionName}
                  redoActionName={history.redoActionName}
                />
              </div>

              {/* Mixer faders console */}
              <div className="min-h-[280px]">
                <DAWMixer
                  tracks={tracks}
                  onUpdateTrack={handleUpdateTrack}
                  selectedTrackId={selectedTrackId}
                  onSelectTrack={setSelectedTrackId}
                  isPlaying={isPlaying} // Connect standard mixer triggers
                  onAddActivity={handleAddActivity}
                  currentUserRole={getUserRole()}
                  currentUserAssignedTracks={currentUserAssignedTracks}
                  currentUserEmail={currentUserAccount?.email}
                />
              </div>
            </div>

            {/* Right Collaboration, Feedbacks & Activity panel (4/12 span) */}
            <div className="xl:col-span-4 flex flex-col gap-4">
              {/* Chat Feed / Comments (Timeline tied) */}
              <div>
                <CommentsPanel
                  comments={comments}
                  onAddComment={handleAddComment}
                  onDeleteComment={handleDeleteComment}
                  currentTime={currentTime}
                  onSeek={handleSeekCursor}
                  onAddActivity={handleAddActivity}
                  isCollapsible={true}
                  isCollapsed={isCommentsCollapsed}
                  onToggleCollapse={() => setIsCommentsCollapsed(!isCommentsCollapsed)}
                />
              </div>

              {/* Real-time WS operations output log */}
              <div className="flex-1">
                <CollaborationActivity
                  onlineMembers={team.slice(0, 3)} // Render online guys
                  activityLogs={activityLogs}
                  isCollapsible={true}
                  isCollapsed={isActivityCollapsed}
                  onToggleCollapse={() => setIsActivityCollapsed(!isActivityCollapsed)}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VERSION CONTROL LEDGER TREE */}
        {activeTab === 'versioning' && (
          <div className="flex-1">
            <VersionControl
              branches={branches}
              activeBranchId={activeBranchId}
              onSwitchBranch={handleSwitchBranch}
              onCreateBranch={handleCreateBranch}
              commits={commits}
              onSaveVersion={handleSaveVersion}
              onRestoreSnapshot={handleRestoreSnapshot}
              tracks={tracks}
              clips={clips}
              onAddActivity={handleAddActivity}
              onPush={handlePush}
              onTabChange={setActiveTab}
              branchStates={branchStates}
              onCreateMergeRequest={handleCreateMergeRequest}
            />
          </div>
        )}

        {/* TAB 3: MERGE REQUESTS WITH METADATA DIFFS */}
        {activeTab === 'merges' && (
          <div className="flex-1">
            <MergeRequests
              mergeRequests={mergeRequests}
              onApproveMerge={handleApproveMerge}
              onRejectMerge={handleRejectMerge}
              onAddActivity={handleAddActivity}
              branches={branches}
              activeBranchId={activeBranchId}
              onCreateMergeRequest={handleCreateMergeRequest}
              branchStates={branchStates}
              currentUserRole={getUserRole()}
            />
          </div>
        )}

        {/* TAB 4: STUDIO CREW PERMISSIONS ACCESS */}
        {activeTab === 'crew' && (
          <div className="flex-1">
            <TeamManagement
              team={team}
              tracks={tracks}
              currentUserRole={getUserRole()}
              onInviteMember={handleInviteMember}
              onUpdateMemberRole={handleUpdateMemberRole}
              onRemoveMember={handleRemoveMember}
              onAddActivity={handleAddActivity}
              onSwitchUser={handleSwitchDemoAccount}
              currentUserEmail={currentUserAccount.email}
            />
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="flex-1">
            <CommentsPanel
              comments={comments}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
              currentTime={currentTime}
              onSeek={handleSeekCursor}
              onAddActivity={handleAddActivity}
            />
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="flex-1">
            <CollaborationActivity
              onlineMembers={team}
              activityLogs={activityLogs}
            />
          </div>
        )}

      </main>

      {/* Footer Branding Status Bar */}
      <footer className="bg-zinc-950 border-t border-zinc-800 py-3 px-4 text-center text-[10px] text-zinc-500 font-mono flex flex-wrap items-center justify-between gap-2">
        <span className="text-zinc-500">OurStudio &bull; Collaborative Audio Workstation</span>
        <div className="flex gap-4">
          <span className="text-zinc-500">Audio Engine: <strong className="text-blue-400">44.1 kHz / 24-bit</strong></span>
          <span className="text-zinc-500">Master Bus: <strong className="text-emerald-400">Stereo Limiter Active</strong></span>
        </div>
      </footer>

      {/* Custom Track Naming Modal */}
      <AddTrackModal
        isOpen={showAddTrackModal}
        onClose={() => setShowAddTrackModal(false)}
        onAddTrack={handleConfirmAddTrack}
        defaultIndex={tracks.length + 1}
      />

      {/* Export Mix & Master Audio Render Modal - Always renders and downloads the main production master */}
      {(() => {
        const mainBranchObj = branches.find(b => b.name === 'main');
        const mainState = mainBranchObj ? branchStates[mainBranchObj.id] : null;
        const mainExportTracks = mainState?.tracks || (activeBranchName === 'main' ? tracks : activeProject?.tracks || tracks);
        const mainExportClips = mainState?.clips || (activeBranchName === 'main' ? clips : activeProject?.clips || clips);

        return (
          <ExportMixModal
            isOpen={showExportModal}
            onClose={() => setShowExportModal(false)}
            projectName={activeProject?.name || 'lofi-collab-vibe'}
            activeBranchName="main"
            tracks={mainExportTracks}
            clips={mainExportClips}
            onAddActivity={handleAddActivity}
            tempo={tempo}
          />
        );
      })()}
    </div>
  );
}
