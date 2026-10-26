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
  DatabaseTable,
  RestEndpoint,
  WebSocketEvent,
  MergePushHistoryEvent
} from './types';

// Initial track listing
export const INITIAL_TRACKS: Track[] = [
  {
    id: 't-1',
    name: 'Drums (Kick & Snare)',
    volume: 85,
    pan: 0,
    isMuted: false,
    isSoloed: false,
    color: '#f43f5e',
    automation: {
      enabled: true,
      mode: 'read',
      parameter: 'volume',
      points: [
        { id: 'ap-1-1', time: 0, value: 40 },
        { id: 'ap-1-2', time: 4, value: 85 },
        { id: 'ap-1-3', time: 24, value: 85 },
        { id: 'ap-1-4', time: 32, value: 20 }
      ]
    }
  },
  {
    id: 't-2',
    name: 'Synth Bass',
    volume: 75,
    pan: -10,
    isMuted: false,
    isSoloed: false,
    color: '#06b6d4',
    automation: {
      enabled: true,
      mode: 'read',
      parameter: 'volume',
      points: [
        { id: 'ap-2-1', time: 4, value: 20 },
        { id: 'ap-2-2', time: 8, value: 75 },
        { id: 'ap-2-3', time: 16, value: 90 },
        { id: 'ap-2-4', time: 28, value: 60 }
      ]
    }
  },
  {
    id: 't-3',
    name: 'Lead Vocals',
    volume: 90,
    pan: 5,
    isMuted: false,
    isSoloed: false,
    color: '#10b981',
    automation: {
      enabled: true,
      mode: 'read',
      parameter: 'volume',
      points: [
        { id: 'ap-3-1', time: 8, value: 60 },
        { id: 'ap-3-2', time: 12, value: 92 },
        { id: 'ap-3-3', time: 20, value: 95 },
        { id: 'ap-3-4', time: 22, value: 70 }
      ]
    }
  },
  {
    id: 't-4',
    name: 'Guitar Acoustic',
    volume: 65,
    pan: 25,
    isMuted: false,
    isSoloed: false,
    color: '#f59e0b',
    automation: {
      enabled: false,
      mode: 'off',
      parameter: 'volume',
      points: [
        { id: 'ap-4-1', time: 12, value: 30 },
        { id: 'ap-4-2', time: 16, value: 70 },
        { id: 'ap-4-3', time: 28, value: 70 }
      ]
    }
  },
  {
    id: 't-5',
    name: 'Ambient Pad',
    volume: 55,
    pan: -25,
    isMuted: false,
    isSoloed: false,
    color: '#8b5cf6',
    automation: {
      enabled: true,
      mode: 'read',
      parameter: 'volume',
      points: [
        { id: 'ap-5-1', time: 0, value: 30 },
        { id: 'ap-5-2', time: 8, value: 65 },
        { id: 'ap-5-3', time: 24, value: 65 },
        { id: 'ap-5-4', time: 32, value: 15 }
      ]
    }
  }
];

// Initial audio clips arranged on the timeline across tracks till end of track
export const INITIAL_CLIPS: AudioClip[] = [
  { id: 'c-1', trackId: 't-1', name: 'Drums_Beat_Full_96bpm.wav', startTime: 0, duration: 32, audioUrl: '#', lockedBy: null, color: '#f43f5e' },
  { id: 'c-2', trackId: 't-2', name: 'Synth_Bassline_Groove.wav', startTime: 4, duration: 28, audioUrl: '#', lockedBy: null, color: '#06b6d4' },
  { id: 'c-3', trackId: 't-3', name: 'Lead_Vocal_Verse_Chorus.wav', startTime: 8, duration: 20, audioUrl: '#', lockedBy: null, color: '#10b981' },
  { id: 'c-4', trackId: 't-4', name: 'Acoustic_Guitar_Strum.wav', startTime: 12, duration: 20, audioUrl: '#', lockedBy: null, color: '#f59e0b' },
  { id: 'c-5', trackId: 't-5', name: 'Ambient_Pad_Drone.wav', startTime: 0, duration: 32, audioUrl: '#', lockedBy: null, color: '#8b5cf6' }
];

// Initial timeline comments
export const INITIAL_COMMENTS: TimelineComment[] = [
  { id: 'com-1', author: 'Bodhisatwa (Owner)', timestamp: 8.5, text: 'Clean timeline ready for recording and arrangement.', createdAt: '2026-07-15 08:15' }
];

// Active branches
export const INITIAL_BRANCHES: Branch[] = [
  { id: 'b-1', name: 'main', parentBranchId: null, createdAt: '2026-07-10 10:00', author: 'Bodhisatwa (Owner)', isLocked: false },
  { id: 'b-2', name: 'acoustic-vibe', parentBranchId: 'b-1', createdAt: '2026-07-14 14:30', author: 'Santosh (Producer)', isLocked: false },
  { id: 'b-3', name: 'vocal-harmonies', parentBranchId: 'b-1', createdAt: '2026-07-15 08:00', author: 'Payal (Editor)', isLocked: false }
];

// Core commit history and version package files
export const INITIAL_COMMITS: VersionCommit[] = [
  {
    id: 'c-rev-4',
    versionName: 'Chorus Vocal Harmonies Merge',
    versionNumber: 'v1.0.3-merge',
    timestamp: '2026-07-15 08:30',
    author: 'Santosh (Producer)',
    message: 'Merged branch "vocal-harmonies" into "main" with chorus backing arrangements',
    description: 'Merged the 3-part backing vocal harmonies recorded on branch vocal-harmonies into the main production trunk. Rebalanced lead vocals from 90 to 82 to make room in the stereo mix.',
    activity: 'Approved and merged Pull Request #MR-1 from branch "vocal-harmonies" into "main". Integrated 2 new harmony vocal tracks and adjusted lead vocal mix fader.',
    fileName: 'lofi_chill_v1.0.3_merge_harmonies.osp',
    branchName: 'main',
    mergedFromBranch: 'vocal-harmonies',
    mergedBy: 'Santosh (Producer)',
    mergedWithVersions: ['v1.0.2', 'v1.0.1'],
    isMergeCommit: true,
    fileSizeBytes: 34200000,
    diffSummary: [
      '+ Added Track: "Vocal Harmonies High" (volume: 75, pan: -15)',
      '+ Added Track: "Vocal Harmonies Low" (volume: 75, pan: 15)',
      '+ Added Clip: "harmonies_high_chorus.wav" at 12.0 sec',
      '+ Added Clip: "harmonies_low_chorus.wav" at 12.0 sec',
      '~ Adjusted Vol: Lead Vocals (90 -> 82)'
    ],
    metadataSnapshot: {
      tempo: 96,
      timeSignature: '4/4',
      tracks: [
        ...INITIAL_TRACKS,
        { id: 't-harm-high', name: 'Vocal Harmonies High', volume: 75, pan: -15, isMuted: false, isSoloed: false, color: '#ec4899' },
        { id: 't-harm-low', name: 'Vocal Harmonies Low', volume: 75, pan: 15, isMuted: false, isSoloed: false, color: '#ec4899' }
      ],
      clips: [
        ...INITIAL_CLIPS,
        { id: 'c-hh-1', trackId: 't-harm-high', name: 'harmonies_high_chorus.wav', startTime: 12, duration: 16, audioUrl: '#', lockedBy: null, color: '#ec4899' },
        { id: 'c-hl-1', trackId: 't-harm-low', name: 'harmonies_low_chorus.wav', startTime: 12, duration: 16, audioUrl: '#', lockedBy: null, color: '#ec4899' }
      ]
    },
    pushed: true
  },
  {
    id: 'c-rev-3',
    versionName: 'Tuned Lead Vocal Stems',
    versionNumber: 'v1.0.2',
    timestamp: '2026-07-15 08:10',
    author: 'Payal (Editor)',
    message: 'Tuned lead vocals and locked clip for fine editing',
    description: 'Fine-tuned the pitch and timing alignment of the lead vocal verse and chorus sections. Locked the audio clip region to prevent accidental edits.',
    activity: 'Edited and tuned audio clip "Lead_Vocal_Verse_Chorus.wav" on Track 3. Locked clip permissions for fine arrangement.',
    fileName: 'lofi_chill_v1.0.2_vocals.osp',
    branchName: 'vocal-harmonies',
    isMergeCommit: false,
    fileSizeBytes: 27800000,
    diffSummary: [
      '~ Tuned audio pitch for Lead_Vocal_Verse_Chorus.wav',
      '# Clip locked by Payal (Editor)'
    ],
    metadataSnapshot: {
      tempo: 96,
      timeSignature: '4/4',
      tracks: INITIAL_TRACKS,
      clips: INITIAL_CLIPS.map(c => c.id === 'c-3' ? { ...c, lockedBy: 'Payal' } : c)
    },
    pushed: true
  },
  {
    id: 'c-rev-2',
    versionName: 'Acoustic Guitar Rhythm Tracking',
    versionNumber: 'v1.0.1',
    timestamp: '2026-07-12 16:45',
    author: 'Santosh (Producer)',
    message: 'Overdubbed lead vocal verse and added guitar tracks',
    description: 'Recorded acoustic rhythm strumming layer and overdubbed vocal verse section. Panned guitar right (+25) to complement ambient pads.',
    activity: 'Added new Track "Guitar Acoustic" with 20s strumming clip at 12.0s mark. Updated mixer faders and panning.',
    fileName: 'lofi_chill_v1.0.1_acoustic_gtr.osp',
    branchName: 'acoustic-vibe',
    isMergeCommit: false,
    fileSizeBytes: 22400000,
    diffSummary: [
      '+ Added Track: "Guitar Acoustic" (volume: 65, pan: 25)',
      '+ Added Clip: "Acoustic_Guitar_Strum.wav" at 12.0 sec'
    ],
    metadataSnapshot: {
      tempo: 96,
      timeSignature: '4/4',
      tracks: INITIAL_TRACKS,
      clips: INITIAL_CLIPS
    },
    pushed: true
  },
  {
    id: 'c-rev-1',
    versionName: 'Initial Baseline Master Trunk',
    versionNumber: 'v1.0.0-rc1',
    timestamp: '2026-07-10 11:30',
    author: 'Bodhisatwa (Owner)',
    message: 'Initial project repository workspace created with drum and bass foundation',
    description: 'Initialized master multitrack session with SP-404 dusty drum kit and deep sub synth bassline at 96 BPM.',
    activity: 'Created project repository workspace on trunk "main" with foundation drum and synth bass tracks.',
    fileName: 'lofi_chill_v1.0.0_baseline.osp',
    branchName: 'main',
    isMergeCommit: false,
    fileSizeBytes: 14100000,
    diffSummary: [
      '+ Initialized repository trunk main',
      '+ Created baseline drum & synth bass tracks'
    ],
    metadataSnapshot: {
      tempo: 96,
      timeSignature: '4/4',
      tracks: INITIAL_TRACKS,
      clips: INITIAL_CLIPS.slice(0, 2)
    },
    pushed: true
  }
];

// Open Merge Requests
export const INITIAL_MERGE_REQUESTS: MergeRequest[] = [
  {
    id: 'mr-1',
    title: 'Merge vocal harmonies into Main branch',
    description: 'Added 3-part backing harmonies in the chorus section (beats 12-28). Needs vocal balancing check.',
    sourceBranch: 'vocal-harmonies',
    targetBranch: 'main',
    author: 'Payal (Editor)',
    status: 'OPEN',
    createdAt: '2026-07-15T08:12:00Z',
    metadataDiff: [
      '+ Added Track: "Vocal Harmonies High" (volume: 75, pan: -15)',
      '+ Added Track: "Vocal Harmonies Low" (volume: 75, pan: 15)',
      '+ Added Clip: "harmonies_high_chorus.wav" at 12.0 sec on Track "Vocal Harmonies High"',
      '+ Added Clip: "harmonies_low_chorus.wav" at 12.0 sec on Track "Vocal Harmonies Low"',
      '~ Adjusted Vol: Lead Vocals (90 -> 82) to make room for harmonies',
      '~ Adjusted Pan: Ambient Pad (-25 -> -35) to widen the soundstage'
    ]
  },
  {
    id: 'mr-2',
    title: 'Acoustic Guitar Alt-Arrangement Mix',
    description: 'Replacing heavy drums with high-passed shaker and boosting lofi ambient pads.',
    sourceBranch: 'acoustic-vibe',
    targetBranch: 'main',
    author: 'Santosh (Producer)',
    status: 'OPEN',
    createdAt: '2026-07-14T17:40:00Z',
    metadataDiff: [
      '- Removed Track: "Drums (Kick & Snare)"',
      '+ Added Track: "Percussion Shakers" (volume: 60, pan: 10)',
      '+ Added Clip: "shaker_pattern_96bpm.wav" at 0.0 sec',
      '~ Adjusted Vol: Ambient Pad (55 -> 75)',
      '~ Adjusted Vol: Guitar Acoustic (65 -> 85)'
    ]
  }
];

// Historical Integration Ledger: Merges and Pushes for Debranching & Rollbacks
export const INITIAL_MERGE_PUSH_HISTORY: MergePushHistoryEvent[] = [
  {
    id: 'ev-merge-1',
    type: 'MERGE',
    sourceBranch: 'vocal-harmonies',
    targetBranch: 'main',
    author: 'Santosh (Producer)',
    requestedBy: 'Payal (Editor)',
    title: 'Merge vocal harmonies into Main branch (#MR-1)',
    timestamp: '2026-07-15 08:12',
    mrId: 'mr-1',
    diffSummary: [
      '+ Added Track: "Vocal Harmonies High" (volume: 75, pan: -15)',
      '+ Added Track: "Vocal Harmonies Low" (volume: 75, pan: 15)',
      '+ Added Clip: "harmonies_high_chorus.wav" at 12.0 sec',
      '+ Added Clip: "harmonies_low_chorus.wav" at 12.0 sec',
      '~ Adjusted Vol: Lead Vocals (90 -> 82)'
    ],
    preState: {
      tempo: 96,
      tracks: INITIAL_TRACKS,
      clips: INITIAL_CLIPS
    },
    postState: {
      tempo: 96,
      tracks: [
        ...INITIAL_TRACKS,
        { id: 't-harm-high', name: 'Vocal Harmonies High', volume: 75, pan: -15, isMuted: false, isSoloed: false, color: '#ec4899' },
        { id: 't-harm-low', name: 'Vocal Harmonies Low', volume: 75, pan: 15, isMuted: false, isSoloed: false, color: '#ec4899' }
      ],
      clips: [
        ...INITIAL_CLIPS,
        { id: 'c-hh-1', trackId: 't-harm-high', name: 'harmonies_high_chorus.wav', startTime: 12, duration: 16, audioUrl: '#', lockedBy: null, color: '#ec4899' },
        { id: 'c-hl-1', trackId: 't-harm-low', name: 'harmonies_low_chorus.wav', startTime: 12, duration: 16, audioUrl: '#', lockedBy: null, color: '#ec4899' }
      ]
    }
  },
  {
    id: 'ev-push-1',
    type: 'PUSH',
    sourceBranch: 'acoustic-vibe',
    targetBranch: 'main',
    author: 'Santosh (Producer)',
    requestedBy: 'Santosh (Producer)',
    title: 'Pushed acoustic guitar strum rhythm track to origin/main',
    timestamp: '2026-07-14 17:40',
    mrId: 'mr-2',
    diffSummary: [
      '+ Added Track: "Guitar Acoustic" (volume: 65, pan: 25)',
      '+ Added Clip: "Acoustic_Guitar_Strum.wav" at 12.0 sec on Track 4',
      '~ Boosted Vol: Ambient Pad (55 -> 65)'
    ],
    preState: {
      tempo: 96,
      tracks: INITIAL_TRACKS.slice(0, 3), // Drums, Bass, Vocals
      clips: INITIAL_CLIPS.slice(0, 3)
    },
    postState: {
      tempo: 96,
      tracks: INITIAL_TRACKS,
      clips: INITIAL_CLIPS
    }
  },
  {
    id: 'ev-commit-1',
    type: 'COMMIT',
    sourceBranch: 'main',
    targetBranch: 'main',
    author: 'Bodhisatwa (Owner)',
    requestedBy: 'Bodhisatwa (Owner)',
    title: 'Initial baseline setup with Drums (Kick & Snare) and Synth Bass',
    timestamp: '2026-07-10 11:30',
    diffSummary: [
      '+ Added Track: "Drums (Kick & Snare)" (volume: 85)',
      '+ Added Track: "Synth Bass" (volume: 75)',
      '+ Added Clip: "Drums_Beat_Full_96bpm.wav"',
      '+ Added Clip: "Synth_Bassline_Groove.wav"'
    ],
    preState: {
      tempo: 96,
      tracks: INITIAL_TRACKS.slice(0, 2), // Drums, Bass only
      clips: INITIAL_CLIPS.slice(0, 2)
    },
    postState: {
      tempo: 96,
      tracks: INITIAL_TRACKS.slice(0, 3),
      clips: INITIAL_CLIPS.slice(0, 3)
    }
  }
];

// Team Management roles for active collaboration testing
export const INITIAL_TEAM: TeamMember[] = [
  { id: 'tm-1', name: 'Bodhisatwa', username: 'bodhisatwa', email: 'bodhisatwa@ourstudio.co', role: 'Owner', assignedTrackIds: [], canAddTracks: true },
  { id: 'tm-2', name: 'Santosh', username: 'santosh', email: 'santosh@ourstudio.co', role: 'Producer', assignedTrackIds: [], canAddTracks: true },
  { id: 'tm-3', name: 'Payal', username: 'payal', email: 'payal@ourstudio.co', role: 'Editor', assignedTrackIds: [], canAddTracks: true },
  { id: 'tm-4', name: 'Samarth', username: 'samarth', email: 'samarth@ourstudio.co', role: 'Track Editor', assignedTrackIds: ['t-3', 't-4'], canAddTracks: false },
  { id: 'tm-5', name: 'Suraj', username: 'suraj', email: 'suraj@ourstudio.co', role: 'Viewer', assignedTrackIds: [], canAddTracks: false },
  { id: 'tm-6', name: 'Priya', username: 'priya', email: 'priya@ourstudio.co', role: 'Editor', assignedTrackIds: [], canAddTracks: true }
];

// Interactive notifications
export const INITIAL_NOTIFICATIONS: ProjectNotification[] = [
  { id: 'n-1', title: 'New Comment', message: 'Payal left a comment on the timeline.', type: 'comment', createdAt: '3 mins ago', unread: true },
  { id: 'n-2', title: 'Merge Request Submitted', message: 'Payal submitted a merge request: "Merge vocal harmonies into Main branch"', type: 'merge_request', createdAt: '15 mins ago', unread: true },
  { id: 'n-3', title: 'Branch Created', message: 'Santosh created branch "acoustic-vibe"', type: 'branch', createdAt: 'Yesterday', unread: false }
];

// Database Schema Specification
export const DATABASE_SCHEMA: DatabaseTable[] = [
  {
    name: 'users',
    description: 'Stores core user identities and Google OAuth credentials.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY, DEFAULT gen_random_uuid()', description: 'Unique identifier for the user.' },
      { name: 'email', type: 'VARCHAR(255)', constraints: 'UNIQUE, NOT NULL', description: 'Email address used for communication and JWT auth.' },
      { name: 'password_hash', type: 'VARCHAR(255)', constraints: 'NOT NULL', description: 'Bcrypt hashed password. Nullable for OAuth accounts.' },
      { name: 'display_name', type: 'VARCHAR(100)', constraints: 'NOT NULL', description: 'Public facing user name.' },
      { name: 'avatar_url', type: 'VARCHAR(512)', constraints: 'NULL', description: 'Profile picture CDN link.' },
      { name: 'created_at', type: 'TIMESTAMP', constraints: 'DEFAULT NOW()', description: 'Record creation timestamp.' }
    ]
  },
  {
    name: 'projects',
    description: 'Repositories housing albums, songs, and collaboration controls.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY', description: 'Unique repository code.' },
      { name: 'name', type: 'VARCHAR(100)', constraints: 'NOT NULL', description: 'Name of the project/album repository.' },
      { name: 'description', type: 'TEXT', constraints: 'NULL', description: 'Context and metadata of the music repository.' },
      { name: 'owner_id', type: 'UUID', constraints: 'REFERENCES users(id) ON DELETE CASCADE', description: 'User who created/owns this workspace.' },
      { name: 'created_at', type: 'TIMESTAMP', constraints: 'DEFAULT NOW()', description: 'Repository generation date.' }
    ]
  },
  {
    name: 'songs',
    description: 'Represents specific song files or musical tracks in a project repository.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY', description: 'Song identifier.' },
      { name: 'project_id', type: 'UUID', constraints: 'REFERENCES projects(id) ON DELETE CASCADE', description: 'Parent project link.' },
      { name: 'title', type: 'VARCHAR(100)', constraints: 'NOT NULL', description: 'Song title (e.g., Lofi Beats Intro).' },
      { name: 'tempo_bpm', type: 'INTEGER', constraints: 'DEFAULT 120', description: 'Project tempo (Beats Per Minute).' },
      { name: 'time_signature', type: 'VARCHAR(10)', constraints: 'DEFAULT \'4/4\'', description: 'Metric time signature.' }
    ]
  },
  {
    name: 'audio_assets',
    description: 'Immutable references to real physical audio files stored in Object Storage (MinIO/S3).',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY', description: 'Asset SHA-256 or ID.' },
      { name: 'project_id', type: 'UUID', constraints: 'REFERENCES projects(id)', description: 'Asset scope.' },
      { name: 'file_key', type: 'VARCHAR(512)', constraints: 'NOT NULL', description: 'MinIO/S3 Object storage reference key.' },
      { name: 'file_size_bytes', type: 'BIGINT', constraints: 'NOT NULL', description: 'Asset footprint size.' },
      { name: 'format', type: 'VARCHAR(10)', constraints: 'NOT NULL', description: 'Audio file extension (WAV, MP3, OGG).' },
      { name: 'duration_seconds', type: 'DECIMAL(10,2)', constraints: 'NOT NULL', description: 'Playback span.' }
    ]
  },
  {
    name: 'branches',
    description: 'Musical branches storing individual metadata layers (Main, Acoustic, Live).',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY', description: 'Branch key.' },
      { name: 'song_id', type: 'UUID', constraints: 'REFERENCES songs(id) ON DELETE CASCADE', description: 'Musical composition link.' },
      { name: 'name', type: 'VARCHAR(50)', constraints: 'NOT NULL', description: 'Name (e.g., demo, remix, vocal-harmony).' },
      { name: 'parent_branch_id', type: 'UUID', constraints: 'REFERENCES branches(id)', description: 'Upstream branch context.' },
      { name: 'metadata_state', type: 'JSONB', constraints: 'NOT NULL', description: 'Active JSON graph specifying tracks, panning, volume, and clip links.' },
      { name: 'created_at', type: 'TIMESTAMP', constraints: 'DEFAULT NOW()', description: 'Fork date.' }
    ]
  },
  {
    name: 'version_commits',
    description: 'Immutable historical commits of a branch metadata snapshot.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY', description: 'Commit SHA identifier.' },
      { name: 'branch_id', type: 'UUID', constraints: 'REFERENCES branches(id) ON DELETE CASCADE', description: 'Associated branch.' },
      { name: 'author_id', type: 'UUID', constraints: 'REFERENCES users(id)', description: 'Committer profile.' },
      { name: 'version_number', type: 'VARCHAR(50)', constraints: 'NOT NULL', description: 'Semantic code (e.g. v1.1.2).' },
      { name: 'commit_message', type: 'VARCHAR(255)', constraints: 'NOT NULL', description: 'Commit summary log.' },
      { name: 'metadata_snapshot', type: 'JSONB', constraints: 'NOT NULL', description: 'Exact copy of ProjectMetadata JSON at that instant.' },
      { name: 'created_at', type: 'TIMESTAMP', constraints: 'DEFAULT NOW()', description: 'Commit instant.' }
    ]
  },
  {
    name: 'timeline_comments',
    description: 'Timestamped contextual annotations connected directly to sections of the audio workspace.',
    columns: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY', description: 'Comment entry.' },
      { name: 'branch_id', type: 'UUID', constraints: 'REFERENCES branches(id) ON DELETE CASCADE', description: 'Branch context.' },
      { name: 'author_id', type: 'UUID', constraints: 'REFERENCES users(id)', description: 'Author of comment.' },
      { name: 'timeline_seconds', type: 'DECIMAL(10,2)', constraints: 'NOT NULL', description: 'Audio seek point (e.g., 24.5 sec).' },
      { name: 'comment_text', type: 'TEXT', constraints: 'NOT NULL', description: 'The text feedback.' },
      { name: 'created_at', type: 'TIMESTAMP', constraints: 'DEFAULT NOW()', description: 'Created timestamp.' }
    ]
  }
];

// REST API Specifications
export const REST_API_ENDPOINTS: RestEndpoint[] = [
  {
    path: '/api/v1/auth/login',
    method: 'POST',
    description: 'Authenticates a user and returns a signed JWT token.',
    requestBody: '{\n  "email": "user@ourstudio.co",\n  "password": "SecurePassword123"\n}',
    responseBody: '{\n  "token": "eyJhbGciOiJIUzI1NiIsIn...",\n  "user": {\n    "id": "u-991",\n    "email": "user@ourstudio.co",\n    "name": "Sarah Connor"\n  }\n}'
  },
  {
    path: '/api/v1/projects',
    method: 'GET',
    description: 'Fetch all music repositories that the authenticated user belongs to.',
    responseBody: '[\n  {\n    "id": "p-101",\n    "name": "Lofi Chill Album",\n    "role": "Producer",\n    "createdAt": "2026-07-10T12:00:00Z"\n  }\n]'
  },
  {
    path: '/api/v1/songs/{songId}/branches',
    method: 'GET',
    description: 'List all branches available for a song repository.',
    responseBody: '[\n  { "id": "b-1", "name": "main", "author": "John" },\n  { "id": "b-2", "name": "acoustic-vibe", "author": "Mike" }\n]'
  },
  {
    path: '/api/v1/branches/{branchId}/commits',
    method: 'GET',
    description: 'Retrieve the commit ledger (version history) for a specific branch.',
    responseBody: '[\n  {\n    "id": "c-rev-3",\n    "versionNumber": "v1.0.2",\n    "author": "Sarah Connor",\n    "message": "Tuned lead vocals and locked clip",\n    "timestamp": "2026-07-15 08:10"\n  }\n]'
  },
  {
    path: '/api/v1/branches/{branchId}/commit',
    method: 'POST',
    description: 'Saves a new metadata snapshot version, creating an immutable history point.',
    requestBody: '{\n  "message": "Overdubbed backing synths",\n  "versionNumber": "v1.1.0",\n  "metadataSnapshot": { "tempo": 96, "tracks": [...], "clips": [...] }\n}',
    responseBody: '{\n  "id": "c-rev-4",\n  "versionNumber": "v1.1.0",\n  "timestamp": "2026-07-15T08:35:00Z",\n  "status": "COMMITTED"\n}'
  },
  {
    path: '/api/v1/merge-requests',
    method: 'POST',
    description: 'Creates a new merge request comparing a source and target branch.',
    requestBody: '{\n  "title": "Merge Acoustic Guitar alt layout",\n  "description": "Swapping drum layers for clean shakers.",\n  "sourceBranchId": "b-2",\n  "targetBranchId": "b-1"\n}',
    responseBody: '{\n  "id": "mr-3",\n  "status": "OPEN",\n  "metadataDiff": ["+ Added Track: Percussion Shakers", "- Removed Track: Drums"]\n}'
  }
];

// WebSocket Event protocol specification
export const WEBSOCKET_EVENTS: WebSocketEvent[] = [
  {
    event: 'MOVE_CLIP',
    direction: 'BIDIRECTIONAL',
    description: 'Sent when a user drags and drops an audio clip to a new start-time or track.',
    payloadExample: '{\n  "userId": "u-3",\n  "clipId": "c-4",\n  "targetTrackId": "t-2",\n  "newStartTime": 12.5\n}'
  },
  {
    event: 'LOCK_CLIP',
    direction: 'BIDIRECTIONAL',
    description: 'Broadcasts a block preventing other concurrent users from editing or moving a clip.',
    payloadExample: '{\n  "userId": "u-3",\n  "userName": "Sarah Connor",\n  "clipId": "c-3"\n}'
  },
  {
    event: 'UNLOCK_CLIP',
    direction: 'BIDIRECTIONAL',
    description: 'Releases the edit block on a clip, restoring edit capability for the team.',
    payloadExample: '{\n  "clipId": "c-3"\n}'
  },
  {
    event: 'CHANGE_VOLUME',
    direction: 'BIDIRECTIONAL',
    description: 'Sent when a fader is dragged on the mixer console.',
    payloadExample: '{\n  "trackId": "t-1",\n  "volume": 72\n}'
  },
  {
    event: 'ADD_TRACK',
    direction: 'BIDIRECTIONAL',
    description: 'Pushes a new audio track shell to all live clients.',
    payloadExample: '{\n  "trackId": "t-99",\n  "name": "Soprano Harmony",\n  "color": "#e11d48"\n}'
  },
  {
    event: 'NEW_COMMENT',
    direction: 'SERVER_TO_CLIENT',
    description: 'Triggers a real-time floating overlay comment at a specific seek index.',
    payloadExample: '{\n  "commentId": "com-9",\n  "author": "Mike",\n  "timestamp": 14.5,\n  "text": "Check bass alignment here."\n}'
  }
];
