/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Track,
  AudioClip,
  TimelineComment,
  VersionCommit,
  Branch,
  MergeRequest,
  TeamMember,
  ProjectNotification,
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

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  avatar: string;
  preferredRole: ProjectRole;
  password?: string; // stored in plaintext for client-side demo mock auth
}

export interface Project {
  id: string;
  name: string;
  description: string;
  genre: string;
  tempo: number;
  timeSignature: string;
  creatorId: string;
  creatorName: string;
  createdAt: string;
  tracks: Track[];
  clips: AudioClip[];
  comments: TimelineComment[];
  branches: Branch[];
  activeBranchId: string;
  branchStates?: Record<string, { tracks: Track[]; clips: AudioClip[] }>;
  commits: VersionCommit[];
  mergeRequests: MergeRequest[];
  team: TeamMember[];
  notifications: ProjectNotification[];
}

export const DEMO_ACCOUNTS: UserAccount[] = [
  {
    id: 'u-1',
    name: 'John Doe',
    email: 'john@ourstudio.co',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&fit=crop&q=80',
    preferredRole: 'Owner',
    password: 'password'
  },
  {
    id: 'u-2',
    name: 'Mike Miller',
    email: 'mike@ourstudio.co',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&fit=crop&q=80',
    preferredRole: 'Producer',
    password: 'password'
  },
  {
    id: 'u-3',
    name: 'Sarah Connor',
    email: 'sarah@ourstudio.co',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&fit=crop&q=80',
    preferredRole: 'Editor',
    password: 'password'
  },
  {
    id: 'u-4',
    name: 'Alex Rivera',
    email: 'alex@ourstudio.co',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=80',
    preferredRole: 'Track Editor',
    password: 'password'
  },
  {
    id: 'u-5',
    name: 'Devin Cole',
    email: 'devin@ourstudio.co',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&fit=crop&q=80',
    preferredRole: 'Viewer',
    password: 'password'
  }
];

export const INITIAL_COLLAB_TEAM: TeamMember[] = [
  { id: 'tm-1', name: 'John Doe', email: 'john@ourstudio.co', role: 'Owner', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&fit=crop&q=80', assignedTrackIds: [], canAddTracks: true },
  { id: 'tm-2', name: 'Mike Miller', email: 'mike@ourstudio.co', role: 'Producer', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&fit=crop&q=80', assignedTrackIds: [], canAddTracks: true },
  { id: 'tm-3', name: 'Sarah Connor', email: 'sarah@ourstudio.co', role: 'Editor', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&fit=crop&q=80', assignedTrackIds: [], canAddTracks: true },
  { id: 'tm-4', name: 'Alex Rivera', email: 'alex@ourstudio.co', role: 'Track Editor', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=80', assignedTrackIds: ['t-3', 't-4'], canAddTracks: false },
  { id: 'tm-5', name: 'Devin Cole', email: 'devin@ourstudio.co', role: 'Viewer', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&fit=crop&q=80', assignedTrackIds: [], canAddTracks: false }
];

export function getStoredUsers(): UserAccount[] {
  const data = localStorage.getItem('ourstudio_users');
  if (!data) {
    localStorage.setItem('ourstudio_users', JSON.stringify(DEMO_ACCOUNTS));
    return DEMO_ACCOUNTS;
  }
  try {
    const parsed: UserAccount[] = JSON.parse(data);
    const existingEmails = new Set(parsed.map(u => u.email.toLowerCase()));
    let updated = false;
    DEMO_ACCOUNTS.forEach(demo => {
      if (!existingEmails.has(demo.email.toLowerCase())) {
        parsed.push(demo);
        updated = true;
      }
    });
    if (updated) {
      localStorage.setItem('ourstudio_users', JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    localStorage.setItem('ourstudio_users', JSON.stringify(DEMO_ACCOUNTS));
    return DEMO_ACCOUNTS;
  }
}

export function saveUsers(users: UserAccount[]) {
  localStorage.setItem('ourstudio_users', JSON.stringify(users));
}

export function getStoredCurrentUser(): UserAccount | null {
  const data = localStorage.getItem('ourstudio_current_user');
  if (!data) return null;
  return JSON.parse(data);
}

export function saveCurrentUser(user: UserAccount | null) {
  if (user) {
    localStorage.setItem('ourstudio_current_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('ourstudio_current_user');
  }
}

// Generate some nice mock projects to start with
const INITIAL_PROJECTS: Project[] = [
  {
    id: 'p-1',
    name: 'Lofi Chill Album',
    description: 'A cozy collection of dusty SP-404 drum beats, warm electric piano chords, and soothing vinyl crackle. Perfect for late-night programming or study sessions.',
    genre: 'Lofi Hip-Hop',
    tempo: 96,
    timeSignature: '4/4',
    creatorId: 'u-1',
    creatorName: 'John Doe',
    createdAt: '2026-07-10',
    tracks: INITIAL_TRACKS,
    clips: INITIAL_CLIPS,
    comments: INITIAL_COMMENTS,
    branches: INITIAL_BRANCHES,
    activeBranchId: 'b-1',
    branchStates: {
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
          { id: 't-harmony', name: 'Backing Harmonies Chorus', volume: 70, pan: -15, isMuted: false, isSoloed: false, color: '#ec4899', createdBy: 'sarah@ourstudio.co' }
        ],
        clips: [
          ...INITIAL_CLIPS,
          { id: 'c-harmony-1', trackId: 't-harmony', name: 'vocal_harmonies_chorus_high.wav', startTime: 12, duration: 16, audioUrl: '#', lockedBy: null, color: '#ec4899' }
        ]
      }
    },
    commits: INITIAL_COMMITS,
    mergeRequests: INITIAL_MERGE_REQUESTS,
    team: [
      { id: 'tm-1', name: 'John Doe', email: 'john@ourstudio.co', role: 'Owner', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&fit=crop&q=80', assignedTrackIds: [], canAddTracks: true },
      { id: 'tm-2', name: 'Mike Miller', email: 'mike@ourstudio.co', role: 'Producer', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&fit=crop&q=80', assignedTrackIds: [], canAddTracks: true }
    ],
    notifications: INITIAL_NOTIFICATIONS
  },
  {
    id: 'p-2',
    name: 'Midnight Synthwave',
    description: 'Retro-futuristic analog lead synths, pumping compressor sidechains, and 80s driving drum machines designed for digital neon highways.',
    genre: 'Synthwave / Retrowave',
    tempo: 110,
    timeSignature: '4/4',
    creatorId: 'u-3',
    creatorName: 'Sarah Connor',
    createdAt: '2026-07-12',
    tracks: [
      { id: 't-s1', name: 'LinnDrum Core Beat', volume: 82, pan: 0, isMuted: false, isSoloed: false, color: '#f43f5e' },
      { id: 't-s2', name: 'FM Juno Bassline', volume: 78, pan: -5, isMuted: false, isSoloed: false, color: '#06b6d4' },
      { id: 't-s3', name: 'Jup-8 Lead Pad', volume: 72, pan: 15, isMuted: false, isSoloed: false, color: '#8b5cf6' },
      { id: 't-s4', name: 'DX7 Bell Echoes', volume: 60, pan: -20, isMuted: false, isSoloed: false, color: '#f59e0b' }
    ],
    clips: [
      { id: 'c-s1', trackId: 't-s1', name: 'LinnDrum_Neon_Beat.wav', startTime: 0, duration: 32, audioUrl: '#', lockedBy: null, color: '#f43f5e' },
      { id: 'c-s2', trackId: 't-s2', name: 'Juno_Bass_Arpeggio.wav', startTime: 4, duration: 28, audioUrl: '#', lockedBy: null, color: '#06b6d4' },
      { id: 'c-s3', trackId: 't-s3', name: 'Jupiter8_Lead_Stab.wav', startTime: 0, duration: 32, audioUrl: '#', lockedBy: null, color: '#8b5cf6' },
      { id: 'c-s4', trackId: 't-s4', name: 'DX7_Bell_Atmosphere.wav', startTime: 8, duration: 24, audioUrl: '#', lockedBy: null, color: '#f59e0b' }
    ],
    comments: [
      { id: 'com-s1', author: 'Sarah Connor', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&fit=crop&q=80', timestamp: 8.0, text: 'Clean synth project template ready for tracking.', createdAt: '2026-07-12 14:10' }
    ],
    branches: [
      { id: 'b-s1', name: 'main', parentBranchId: null, createdAt: '2026-07-12 12:00', author: 'Sarah Connor', isLocked: false }
    ],
    activeBranchId: 'b-s1',
    branchStates: {
      'b-s1': {
        tracks: [
          { id: 't-s1', name: 'LinnDrum Core Beat', volume: 82, pan: 0, isMuted: false, isSoloed: false, color: '#f43f5e' },
          { id: 't-s2', name: 'FM Juno Bassline', volume: 78, pan: -5, isMuted: false, isSoloed: false, color: '#06b6d4' },
          { id: 't-s3', name: 'Jup-8 Lead Pad', volume: 72, pan: 15, isMuted: false, isSoloed: false, color: '#8b5cf6' },
          { id: 't-s4', name: 'DX7 Bell Echoes', volume: 60, pan: -20, isMuted: false, isSoloed: false, color: '#f59e0b' }
        ],
        clips: [
          { id: 'c-s1', trackId: 't-s1', name: 'LinnDrum_Neon_Beat.wav', startTime: 0, duration: 32, audioUrl: '#', lockedBy: null, color: '#f43f5e' },
          { id: 'c-s2', trackId: 't-s2', name: 'Juno_Bass_Arpeggio.wav', startTime: 4, duration: 28, audioUrl: '#', lockedBy: null, color: '#06b6d4' },
          { id: 'c-s3', trackId: 't-s3', name: 'Jupiter8_Lead_Stab.wav', startTime: 0, duration: 32, audioUrl: '#', lockedBy: null, color: '#8b5cf6' },
          { id: 'c-s4', trackId: 't-s4', name: 'DX7_Bell_Atmosphere.wav', startTime: 8, duration: 24, audioUrl: '#', lockedBy: null, color: '#f59e0b' }
        ]
      }
    },
    commits: [
      {
        id: 'c-srev-1',
        versionNumber: 'v1.0.0',
        timestamp: '2026-07-12 12:30',
        author: 'Sarah Connor',
        message: 'Initial project setup',
        metadataSnapshot: {
          tempo: 110,
          timeSignature: '4/4',
          tracks: [
            { id: 't-s1', name: 'LinnDrum Core Beat', volume: 82, pan: 0, isMuted: false, isSoloed: false, color: '#f43f5e' },
            { id: 't-s2', name: 'FM Juno Bassline', volume: 78, pan: -5, isMuted: false, isSoloed: false, color: '#06b6d4' },
            { id: 't-s3', name: 'Jup-8 Lead Pad', volume: 72, pan: 15, isMuted: false, isSoloed: false, color: '#8b5cf6' },
            { id: 't-s4', name: 'DX7 Bell Echoes', volume: 60, pan: -20, isMuted: false, isSoloed: false, color: '#f59e0b' }
          ],
          clips: []
        }
      }
    ],
    mergeRequests: [],
    team: [
      { id: 'tm-s1', name: 'Sarah Connor', email: 'sarah@ourstudio.co', role: 'Owner', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&fit=crop&q=80', assignedTrackIds: [], canAddTracks: true },
      { id: 'tm-s2', name: 'John Doe', email: 'john@ourstudio.co', role: 'Producer', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&fit=crop&q=80', assignedTrackIds: [], canAddTracks: true }
    ],
    notifications: []
  },
  {
    id: 'p-3',
    name: 'Acoustic Sessions',
    description: 'Raw, pristine, and acoustic. Stereo-mic\'d acoustic guitar strums, delicate fingerpicking patterns, and warm lead vocals with natural room acoustic resonances.',
    genre: 'Indie Folk / Acoustic',
    tempo: 84,
    timeSignature: '3/4',
    creatorId: 'u-2',
    creatorName: 'Mike Miller',
    createdAt: '2026-07-14',
    tracks: [
      { id: 't-a1', name: 'Acoustic Guitar L', volume: 75, pan: -30, isMuted: false, isSoloed: false, color: '#f59e0b' },
      { id: 't-a2', name: 'Acoustic Guitar R', volume: 75, pan: 30, isMuted: false, isSoloed: false, color: '#f59e0b' },
      { id: 't-a3', name: 'Warm Lead Vocal', volume: 88, pan: 0, isMuted: false, isSoloed: false, color: '#10b981' },
      { id: 't-a4', name: 'Studio Room Shaker', volume: 50, pan: 10, isMuted: false, isSoloed: false, color: '#06b6d4' }
    ],
    clips: [
      { id: 'c-a1', trackId: 't-a1', name: 'Acoustic_Guitar_Left_Strum.wav', startTime: 0, duration: 28, audioUrl: '#', lockedBy: null, color: '#f59e0b' },
      { id: 'c-a2', trackId: 't-a2', name: 'Acoustic_Guitar_Right_Fingerpick.wav', startTime: 0, duration: 28, audioUrl: '#', lockedBy: null, color: '#f59e0b' },
      { id: 'c-a3', trackId: 't-a3', name: 'Warm_Lead_Vocal_Take1.wav', startTime: 4, duration: 24, audioUrl: '#', lockedBy: null, color: '#10b981' },
      { id: 'c-a4', trackId: 't-a4', name: 'Studio_Room_Shaker_Loop.wav', startTime: 0, duration: 28, audioUrl: '#', lockedBy: null, color: '#06b6d4' }
    ],
    comments: [
      { id: 'com-a1', author: 'Mike Miller', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&fit=crop&q=80', timestamp: 6.0, text: 'Template ready for tracking.', createdAt: '2026-07-14 15:30' }
    ],
    branches: [
      { id: 'b-a1', name: 'main', parentBranchId: null, createdAt: '2026-07-14 14:00', author: 'Mike Miller', isLocked: false }
    ],
    activeBranchId: 'b-a1',
    branchStates: {
      'b-a1': {
        tracks: [
          { id: 't-a1', name: 'Acoustic Guitar L', volume: 75, pan: -30, isMuted: false, isSoloed: false, color: '#f59e0b' },
          { id: 't-a2', name: 'Acoustic Guitar R', volume: 75, pan: 30, isMuted: false, isSoloed: false, color: '#f59e0b' },
          { id: 't-a3', name: 'Warm Lead Vocal', volume: 88, pan: 0, isMuted: false, isSoloed: false, color: '#10b981' },
          { id: 't-a4', name: 'Studio Room Shaker', volume: 50, pan: 10, isMuted: false, isSoloed: false, color: '#06b6d4' }
        ],
        clips: [
          { id: 'c-a1', trackId: 't-a1', name: 'Acoustic_Guitar_Left_Strum.wav', startTime: 0, duration: 28, audioUrl: '#', lockedBy: null, color: '#f59e0b' },
          { id: 'c-a2', trackId: 't-a2', name: 'Acoustic_Guitar_Right_Fingerpick.wav', startTime: 0, duration: 28, audioUrl: '#', lockedBy: null, color: '#f59e0b' },
          { id: 'c-a3', trackId: 't-a3', name: 'Warm_Lead_Vocal_Take1.wav', startTime: 4, duration: 24, audioUrl: '#', lockedBy: null, color: '#10b981' },
          { id: 'c-a4', trackId: 't-a4', name: 'Studio_Room_Shaker_Loop.wav', startTime: 0, duration: 28, audioUrl: '#', lockedBy: null, color: '#06b6d4' }
        ]
      }
    },
    commits: [
      {
        id: 'c-arev-1',
        versionNumber: 'v1.0.0',
        timestamp: '2026-07-14 14:15',
        author: 'Mike Miller',
        message: 'Initial acoustic workspace',
        metadataSnapshot: {
          tempo: 84,
          timeSignature: '3/4',
          tracks: [
            { id: 't-a1', name: 'Acoustic Guitar L', volume: 75, pan: -30, isMuted: false, isSoloed: false, color: '#f59e0b' },
            { id: 't-a2', name: 'Acoustic Guitar R', volume: 75, pan: 30, isMuted: false, isSoloed: false, color: '#f59e0b' },
            { id: 't-a3', name: 'Warm Lead Vocal', volume: 88, pan: 0, isMuted: false, isSoloed: false, color: '#10b981' }
          ],
          clips: []
        }
      }
    ],
    mergeRequests: [],
    team: [
      { id: 'tm-a1', name: 'Mike Miller', email: 'mike@ourstudio.co', role: 'Owner', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&fit=crop&q=80', assignedTrackIds: [], canAddTracks: true },
      { id: 'tm-a5', name: 'Devin Cole', email: 'devin@ourstudio.co', role: 'Viewer', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&fit=crop&q=80', assignedTrackIds: [], canAddTracks: false }
    ],
    notifications: []
  }
];

export const CURRENT_DEMO_STORAGE_VERSION = 'v6.0';

export function getStoredProjects(): Project[] {
  const versionKey = 'ourstudio_demo_version';
  const storedVersion = localStorage.getItem(versionKey);
  const data = localStorage.getItem('ourstudio_projects');

  // Seed fresh demo projects if not yet initialized or if updating to v6.0
  if (!data || storedVersion !== CURRENT_DEMO_STORAGE_VERSION) {
    localStorage.setItem('ourstudio_projects', JSON.stringify(INITIAL_PROJECTS));
    localStorage.setItem(versionKey, CURRENT_DEMO_STORAGE_VERSION);
    return INITIAL_PROJECTS;
  }

  try {
    const parsed: Project[] = JSON.parse(data);
    // Sanitize projects and retain accurate collaborator teams without auto-injecting all accounts
    const sanitized = parsed.map(p => {
      const currentTeam = p.team || [];
      const updatedTeam = [...currentTeam];

      // Ensure the project creator is present in team as Owner
      const hasCreator = updatedTeam.some(
        m => m.id === p.creatorId || m.email.toLowerCase() === (p.creatorName?.toLowerCase())
      );
      if (!hasCreator) {
        const creatorAcc = DEMO_ACCOUNTS.find(a => a.id === p.creatorId);
        updatedTeam.unshift({
          id: `tm-${p.id}-${p.creatorId}`,
          name: creatorAcc?.name || p.creatorName,
          email: creatorAcc?.email || `${p.creatorName.toLowerCase().replace(/\s+/g, '')}@ourstudio.co`,
          role: 'Owner',
          avatar: creatorAcc?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&fit=crop&q=80',
          assignedTrackIds: [],
          canAddTracks: true
        });
      }

      const defaultProj = INITIAL_PROJECTS.find(initP => initP.id === p.id);
      const effectiveClips = (p.clips && p.clips.length > 0) ? p.clips : (defaultProj ? defaultProj.clips : INITIAL_CLIPS);
      const effectiveBranchStates = p.branchStates || (defaultProj?.branchStates) || {
        [p.activeBranchId || 'b-1']: { tracks: p.tracks || [], clips: effectiveClips }
      };

      return {
        ...p,
        clips: effectiveClips,
        branchStates: effectiveBranchStates,
        team: updatedTeam.map(m => ({
          ...m,
          assignedTrackIds: m.assignedTrackIds || [],
          canAddTracks: m.canAddTracks !== undefined ? m.canAddTracks : (m.role === 'Producer' || m.role === 'Owner')
        })),
        notifications: (p.notifications || []).filter(n => {
          const text = `${n.title} ${n.message}`.toLowerCase();
          return !text.includes('backend') &&
                 !text.includes('working') &&
                 !text.includes('server') &&
                 !text.includes('websocket') &&
                 !text.includes('postgres') &&
                 !text.includes('status');
        })
      };
    });
    return sanitized;
  } catch (_) {
    localStorage.setItem('ourstudio_projects', JSON.stringify(INITIAL_PROJECTS));
    localStorage.setItem(versionKey, CURRENT_DEMO_STORAGE_VERSION);
    return INITIAL_PROJECTS;
  }
}

export function resetDemoProjects(): Project[] {
  localStorage.setItem('ourstudio_projects', JSON.stringify(INITIAL_PROJECTS));
  localStorage.setItem('ourstudio_demo_version', CURRENT_DEMO_STORAGE_VERSION);
  return INITIAL_PROJECTS;
}

export function saveProjects(projects: Project[]) {
  localStorage.setItem('ourstudio_projects', JSON.stringify(projects));
}

export function createNewProject(
  name: string,
  description: string,
  genre: string,
  tempo: number,
  timeSignature: string,
  creator: UserAccount
): Project {
  // Clean starter tracks with zero default sounds or audio files
  const initialTracks: Track[] = [];
  const initialClips: AudioClip[] = [];

  const initialBranches: Branch[] = [
    { id: 'b-pmain', name: 'main', parentBranchId: null, createdAt: new Date().toISOString().slice(0, 10), author: creator.name, isLocked: false }
  ];

  const initialCommits: VersionCommit[] = [
    {
      id: `c-prev-${Date.now()}`,
      versionNumber: 'v1.0.0',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      author: creator.name,
      message: 'Initial clean project repository created',
      metadataSnapshot: {
        tempo: tempo,
        timeSignature: timeSignature,
        tracks: initialTracks,
        clips: initialClips
      }
    }
  ];

  const initialTeam: TeamMember[] = [
    {
      id: `tm-${creator.id}`,
      name: creator.name,
      email: creator.email,
      role: 'Owner',
      avatar: creator.avatar,
      assignedTrackIds: []
    }
  ];

  const newProject: Project = {
    id: `p-${Date.now()}`,
    name,
    description,
    genre,
    tempo,
    timeSignature,
    creatorId: creator.id,
    creatorName: creator.name,
    createdAt: new Date().toISOString().slice(0, 10),
    tracks: initialTracks,
    clips: initialClips,
    comments: [],
    branches: initialBranches,
    activeBranchId: 'b-pmain',
    branchStates: {
      'b-pmain': { tracks: initialTracks, clips: initialClips }
    },
    commits: initialCommits,
    mergeRequests: [],
    team: initialTeam,
    notifications: [
      {
        id: `notif-${Date.now()}`,
        title: 'Project Initialized',
        message: `Welcome to ${name}! Ready to record and version control.`,
        type: 'team',
        createdAt: 'Just now',
        unread: true
      }
    ]
  };

  return newProject;
}
