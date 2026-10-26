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
  ProjectRole,
  MergePushHistoryEvent
} from './types';

import {
  INITIAL_TRACKS,
  INITIAL_CLIPS,
  INITIAL_COMMENTS,
  INITIAL_BRANCHES,
  INITIAL_COMMITS,
  INITIAL_MERGE_REQUESTS,
  INITIAL_TEAM,
  INITIAL_NOTIFICATIONS,
  INITIAL_MERGE_PUSH_HISTORY
} from './mockData';

import { db } from './firebase';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';

export interface UserAccount {
  id: string;
  username: string; // unique lowercase username handle (e.g. bodhisatwa, santosh, payal, samarth, suraj, priya)
  name: string;
  email: string;
  preferredRole: ProjectRole;
  password?: string;
  avatar?: string;
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
  creatorUsername?: string;
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
  mergePushHistory?: MergePushHistoryEvent[];
}

export const DEMO_ACCOUNTS: UserAccount[] = [
  {
    id: 'u-1',
    username: 'bodhisatwa',
    name: 'Bodhisatwa',
    email: 'bodhisatwa@ourstudio.co',
    preferredRole: 'Owner',
    password: 'password'
  },
  {
    id: 'u-2',
    username: 'santosh',
    name: 'Santosh',
    email: 'santosh@ourstudio.co',
    preferredRole: 'Producer',
    password: 'password'
  },
  {
    id: 'u-3',
    username: 'payal',
    name: 'Payal',
    email: 'payal@ourstudio.co',
    preferredRole: 'Editor',
    password: 'password'
  },
  {
    id: 'u-4',
    username: 'samarth',
    name: 'Samarth',
    email: 'samarth@ourstudio.co',
    preferredRole: 'Track Editor',
    password: 'password'
  },
  {
    id: 'u-5',
    username: 'suraj',
    name: 'Suraj',
    email: 'suraj@ourstudio.co',
    preferredRole: 'Viewer',
    password: 'password'
  },
  {
    id: 'u-6',
    username: 'priya',
    name: 'Priya',
    email: 'priya@ourstudio.co',
    preferredRole: 'Editor',
    password: 'password'
  }
];

export const INITIAL_COLLAB_TEAM: TeamMember[] = [
  { id: 'tm-1', name: 'Bodhisatwa', username: 'bodhisatwa', email: 'bodhisatwa@ourstudio.co', role: 'Owner', assignedTrackIds: [], canAddTracks: true },
  { id: 'tm-2', name: 'Santosh', username: 'santosh', email: 'santosh@ourstudio.co', role: 'Producer', assignedTrackIds: [], canAddTracks: true },
  { id: 'tm-3', name: 'Payal', username: 'payal', email: 'payal@ourstudio.co', role: 'Editor', assignedTrackIds: [], canAddTracks: true },
  { id: 'tm-4', name: 'Samarth', username: 'samarth', email: 'samarth@ourstudio.co', role: 'Track Editor', assignedTrackIds: ['t-3', 't-4'], canAddTracks: false },
  { id: 'tm-5', name: 'Suraj', username: 'suraj', email: 'suraj@ourstudio.co', role: 'Viewer', assignedTrackIds: [], canAddTracks: false },
  { id: 'tm-6', name: 'Priya', username: 'priya', email: 'priya@ourstudio.co', role: 'Editor', assignedTrackIds: [], canAddTracks: true }
];

export const CURRENT_DEMO_STORAGE_VERSION = 'v10.0';

export function getStoredUsers(): UserAccount[] {
  const data = localStorage.getItem('ourstudio_users');
  if (!data) {
    localStorage.setItem('ourstudio_users', JSON.stringify(DEMO_ACCOUNTS));
    syncUsersToFirestore(DEMO_ACCOUNTS);
    return DEMO_ACCOUNTS;
  }
  try {
    const parsed: UserAccount[] = JSON.parse(data);
    const existingUsernames = new Set(parsed.map(u => (u.username || '').toLowerCase()));
    let updated = false;
    DEMO_ACCOUNTS.forEach(demo => {
      if (!existingUsernames.has(demo.username.toLowerCase())) {
        parsed.push(demo);
        updated = true;
      }
    });
    if (updated) {
      localStorage.setItem('ourstudio_users', JSON.stringify(parsed));
      syncUsersToFirestore(parsed);
    }
    return parsed;
  } catch {
    localStorage.setItem('ourstudio_users', JSON.stringify(DEMO_ACCOUNTS));
    return DEMO_ACCOUNTS;
  }
}

export function saveUsers(users: UserAccount[]) {
  localStorage.setItem('ourstudio_users', JSON.stringify(users));
  syncUsersToFirestore(users);
}

// Background asynchronous Firestore sync for user accounts
export async function syncUsersToFirestore(users: UserAccount[]) {
  try {
    for (const u of users) {
      const docId = u.username.toLowerCase();
      await setDoc(doc(db, 'users', docId), {
        id: u.id,
        username: u.username.toLowerCase(),
        name: u.name,
        email: u.email || `${u.username.toLowerCase()}@ourstudio.co`,
        preferredRole: u.preferredRole,
        password: u.password || 'password',
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  } catch (err) {
    console.warn('Firestore user sync notice:', err);
  }
}

// Pull cloud users from Firestore into local cache
export async function fetchUsersFromFirestore(): Promise<UserAccount[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    if (!snap.empty) {
      const cloudUsers: UserAccount[] = [];
      snap.forEach(d => {
        const data = d.data();
        cloudUsers.push({
          id: data.id || `u-${d.id}`,
          username: data.username || d.id,
          name: data.name || d.id,
          email: data.email || `${d.id}@ourstudio.co`,
          preferredRole: data.preferredRole || 'Editor',
          password: data.password || 'password'
        });
      });
      if (cloudUsers.length > 0) {
        localStorage.setItem('ourstudio_users', JSON.stringify(cloudUsers));
        return cloudUsers;
      }
    } else {
      // Seed initial demo accounts if Firestore users is empty
      await syncUsersToFirestore(DEMO_ACCOUNTS);
    }
  } catch (err) {
    console.warn('Firestore fetch users notice:', err);
  }
  return getStoredUsers();
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

// Starter projects
const INITIAL_PROJECTS: Project[] = [
  {
    id: 'p-1',
    name: 'Lofi Chill Album',
    description: 'A cozy collection of dusty SP-404 drum beats, warm electric piano chords, and soothing vinyl crackle. Perfect for late-night programming or study sessions.',
    genre: 'Lofi Hip-Hop',
    tempo: 96,
    timeSignature: '4/4',
    creatorId: 'u-1',
    creatorName: 'Bodhisatwa',
    creatorUsername: 'bodhisatwa',
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
          ...INITIAL_TRACKS.map(t => {
            if (t.id === 't-3') return { ...t, volume: 82 };
            if (t.id === 't-5') return { ...t, pan: -35 };
            return t;
          }),
          { id: 't-harmony', name: 'Backing Harmonies Chorus', volume: 70, pan: -15, isMuted: false, isSoloed: false, color: '#ec4899', createdBy: 'payal@ourstudio.co' }
        ],
        clips: [
          ...INITIAL_CLIPS,
          { id: 'c-harmony-1', trackId: 't-harmony', name: 'vocal_harmonies_chorus_high.wav', startTime: 12, duration: 16, audioUrl: '#', lockedBy: null, color: '#ec4899' }
        ]
      }
    },
    commits: INITIAL_COMMITS,
    mergeRequests: INITIAL_MERGE_REQUESTS,
    team: INITIAL_COLLAB_TEAM,
    notifications: INITIAL_NOTIFICATIONS,
    mergePushHistory: INITIAL_MERGE_PUSH_HISTORY
  },
  {
    id: 'p-2',
    name: 'Midnight Synthwave',
    description: 'Retro-futuristic analog lead synths, pumping compressor sidechains, and 80s driving drum machines designed for digital neon highways.',
    genre: 'Synthwave / Retrowave',
    tempo: 110,
    timeSignature: '4/4',
    creatorId: 'u-3',
    creatorName: 'Payal',
    creatorUsername: 'payal',
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
      { id: 'com-s1', author: 'Payal', timestamp: 8.0, text: 'Clean synth project template ready for tracking.', createdAt: '2026-07-12 14:10' }
    ],
    branches: [
      { id: 'b-s1', name: 'main', parentBranchId: null, createdAt: '2026-07-12 12:00', author: 'Payal', isLocked: false }
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
        author: 'Payal',
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
          clips: [
            { id: 'c-s1', trackId: 't-s1', name: 'LinnDrum_Neon_Beat.wav', startTime: 0, duration: 32, audioUrl: '#', lockedBy: null, color: '#f43f5e' },
            { id: 'c-s2', trackId: 't-s2', name: 'Juno_Bass_Arpeggio.wav', startTime: 4, duration: 28, audioUrl: '#', lockedBy: null, color: '#06b6d4' },
            { id: 'c-s3', trackId: 't-s3', name: 'Jupiter8_Lead_Stab.wav', startTime: 0, duration: 32, audioUrl: '#', lockedBy: null, color: '#8b5cf6' },
            { id: 'c-s4', trackId: 't-s4', name: 'DX7_Bell_Atmosphere.wav', startTime: 8, duration: 24, audioUrl: '#', lockedBy: null, color: '#f59e0b' }
          ]
        }
      }
    ],
    mergeRequests: [],
    team: INITIAL_COLLAB_TEAM.map(m => m.id === 'tm-3' ? { ...m, role: 'Owner' as ProjectRole } : m),
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
    creatorName: 'Santosh',
    creatorUsername: 'santosh',
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
      { id: 'com-a1', author: 'Santosh', timestamp: 6.0, text: 'Template ready for tracking.', createdAt: '2026-07-14 15:30' }
    ],
    branches: [
      { id: 'b-a1', name: 'main', parentBranchId: null, createdAt: '2026-07-14 14:00', author: 'Santosh', isLocked: false }
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
        author: 'Santosh',
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
    team: INITIAL_COLLAB_TEAM.map(m => m.id === 'tm-2' ? { ...m, role: 'Owner' as ProjectRole } : m),
    notifications: []
  }
];

export function getStoredProjects(): Project[] {
  const versionKey = 'ourstudio_demo_version';
  const storedVersion = localStorage.getItem(versionKey);
  const data = localStorage.getItem('ourstudio_projects');

  // Seed fresh demo projects if not yet initialized or if updating to v8.0
  if (!data || storedVersion !== CURRENT_DEMO_STORAGE_VERSION) {
    localStorage.setItem('ourstudio_projects', JSON.stringify(INITIAL_PROJECTS));
    localStorage.setItem(versionKey, CURRENT_DEMO_STORAGE_VERSION);
    syncProjectsToFirestore(INITIAL_PROJECTS);
    return INITIAL_PROJECTS;
  }

  try {
    const parsed: Project[] = JSON.parse(data);
    // Sanitize projects and retain accurate collaborator teams and saved state
    const sanitized = parsed.map(p => {
      const defaultProj = INITIAL_PROJECTS.find(initP => initP.id === p.id);

      const effectiveClips = Array.isArray(p.clips) ? p.clips : (defaultProj ? defaultProj.clips : INITIAL_CLIPS);
      const effectiveTracks = Array.isArray(p.tracks) ? p.tracks : (defaultProj ? defaultProj.tracks : INITIAL_TRACKS);
      
      const effectiveBranchStates = (p.branchStates && Object.keys(p.branchStates).length > 0)
        ? p.branchStates
        : (defaultProj?.branchStates) || {
            [p.activeBranchId || 'b-1']: { tracks: effectiveTracks, clips: effectiveClips }
          };

      const currentTeam = Array.isArray(p.team) && p.team.length > 0
        ? p.team
        : (defaultProj?.team || INITIAL_COLLAB_TEAM);
      const updatedTeam = [...currentTeam];

      // Ensure creator is present in team as Owner
      const hasCreator = updatedTeam.some(
        m => m.id === p.creatorId || (m.username && m.username.toLowerCase() === p.creatorUsername?.toLowerCase())
      );
      if (!hasCreator && p.creatorId) {
        const creatorAcc = DEMO_ACCOUNTS.find(a => a.id === p.creatorId);
        updatedTeam.unshift({
          id: `tm-${p.id}-${p.creatorId}`,
          name: creatorAcc?.name || p.creatorName || 'Project Creator',
          username: creatorAcc?.username || p.creatorUsername || 'creator',
          email: creatorAcc?.email || `${(p.creatorName || 'creator').toLowerCase().replace(/\s+/g, '')}@ourstudio.co`,
          role: 'Owner',
          assignedTrackIds: [],
          canAddTracks: true
        });
      }

      return {
        ...p,
        tracks: effectiveTracks,
        clips: effectiveClips,
        branchStates: effectiveBranchStates,
        team: updatedTeam.map(m => ({
          ...m,
          assignedTrackIds: Array.isArray(m.assignedTrackIds) ? m.assignedTrackIds : [],
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
        }),
        mergePushHistory: Array.isArray(p.mergePushHistory) && p.mergePushHistory.length > 0
          ? p.mergePushHistory
          : (defaultProj?.mergePushHistory || INITIAL_MERGE_PUSH_HISTORY)
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
  syncProjectsToFirestore(INITIAL_PROJECTS);
  return INITIAL_PROJECTS;
}

export function saveProjects(projects: Project[]) {
  localStorage.setItem('ourstudio_projects', JSON.stringify(projects));
  syncProjectsToFirestore(projects);
}

// Push projects to Firestore so they are accessible on any device
export async function syncProjectsToFirestore(projects: Project[]) {
  try {
    for (const p of projects) {
      await setDoc(doc(db, 'projects', p.id), {
        ...p,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  } catch (err) {
    console.warn('Firestore project sync notice:', err);
  }
}

// Fetch cloud projects from Firestore to sync across devices
export async function fetchProjectsFromFirestore(): Promise<Project[]> {
  try {
    const snap = await getDocs(collection(db, 'projects'));
    if (!snap.empty) {
      const cloudProjects: Project[] = [];
      snap.forEach(d => {
        cloudProjects.push(d.data() as Project);
      });
      if (cloudProjects.length > 0) {
        localStorage.setItem('ourstudio_projects', JSON.stringify(cloudProjects));
        return cloudProjects;
      }
    } else {
      await syncProjectsToFirestore(INITIAL_PROJECTS);
    }
  } catch (err) {
    console.warn('Firestore fetch projects notice:', err);
  }
  return getStoredProjects();
}

export function createNewProject(
  name: string,
  description: string,
  genre: string,
  tempo: number,
  timeSignature: string,
  creator: UserAccount
): Project {
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
      fileName: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_v1.0.0_baseline.osp`,
      branchName: 'main',
      isMergeCommit: false,
      fileSizeBytes: 12500000,
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
      username: creator.username,
      email: creator.email || `${creator.username}@ourstudio.co`,
      role: 'Owner',
      assignedTrackIds: [],
      canAddTracks: true
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
    creatorUsername: creator.username,
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
    notifications: []
  };

  return newProject;
}
