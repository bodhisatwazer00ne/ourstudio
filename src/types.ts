/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ProjectRole = 'Owner' | 'Producer' | 'Editor' | 'Track Editor' | 'Viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: ProjectRole;
  avatar: string;
  assignedTrackIds?: string[];
  canAddTracks?: boolean;
}

export interface AudioClip {
  id: string;
  trackId: string;
  name: string;
  startTime: number; // in seconds
  duration: number;  // in seconds
  audioUrl: string;  // immutable asset reference
  lockedBy: string | null; // user name if locked, null if free
  color: string;
  fadeIn?: number;   // fade in duration in seconds
  fadeOut?: number;  // fade out duration in seconds
}

export interface AutomationPoint {
  id: string;
  time: number;  // in seconds along timeline
  value: number; // 0 to 100
}

export type AutomationMode = 'read' | 'write' | 'off';

export interface TrackAutomation {
  enabled: boolean;
  mode: AutomationMode; // 'read': plays back envelope; 'write': records slider movements; 'off': disabled
  parameter: 'volume' | 'pan';
  points: AutomationPoint[];
}

export interface Track {
  id: string;
  name: string;
  volume: number;    // 0 to 100
  pan: number;       // -50 to 50
  isMuted: boolean;
  isSoloed: boolean;
  color: string;
  createdBy?: string; // User ID or email of person who added this track
  eqHigh?: number;   // 0 to 100 (default 50)
  eqMid?: number;    // 0 to 100 (default 50)
  eqLow?: number;    // 0 to 100 (default 50)
  reverb?: number;   // 0 to 100 (default 15)
  delay?: number;    // 0 to 100 (default 10)
  distortion?: number; // 0 to 100 (default 0)
  distortionTone?: number; // 0 to 100 (default 50)
  compressorEnabled?: boolean; // default false
  compressorThreshold?: number; // -60 to 0 dB (default -24)
  compressorRatio?: number; // 1 to 20 (default 4)
  compressorAttack?: number; // in seconds, 0.001 to 0.1 (default 0.01)
  compressorRelease?: number; // in seconds, 0.01 to 1.0 (default 0.25)
  compressorKnee?: number; // in dB, 0 to 40 (default 5)
  compressorGain?: number; // makeup gain in dB, 0 to 24 (default 0)
  automation?: TrackAutomation;
}

export interface TimelineComment {
  id: string;
  author: string;
  avatar: string;
  timestamp: number; // position on the timeline in seconds
  text: string;
  createdAt: string;
}

export interface ProjectMetadata {
  tempo: number;
  timeSignature: string;
  tracks: Track[];
  clips: AudioClip[];
}

export interface VersionCommit {
  id: string;
  versionNumber: string; // e.g., v1.0.3 or commit-hash
  timestamp: string;
  author: string;
  message: string;
  metadataSnapshot: ProjectMetadata;
  pushed?: boolean;
}

export interface Branch {
  id: string;
  name: string;
  parentBranchId: string | null;
  createdAt: string;
  author: string;
  isLocked: boolean;
}

export interface MergeRequest {
  id: string;
  title: string;
  description: string;
  sourceBranch: string;
  targetBranch: string;
  author: string;
  status: 'OPEN' | 'MERGED' | 'REJECTED';
  createdAt: string;
  metadataDiff: string[]; // readable array of diff lines
}

export interface ProjectNotification {
  id: string;
  title: string;
  message: string;
  type: 'version' | 'comment' | 'merge_request' | 'branch' | 'team';
  createdAt: string;
  unread: boolean;
}

export interface DatabaseTable {
  name: string;
  description: string;
  columns: {
    name: string;
    type: string;
    constraints: string;
    description: string;
  }[];
}

export interface RestEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
  requestBody?: string;
  responseBody: string;
}

export interface WebSocketEvent {
  event: string;
  direction: 'CLIENT_TO_SERVER' | 'SERVER_TO_CLIENT' | 'BIDIRECTIONAL';
  description: string;
  payloadExample: string;
}
