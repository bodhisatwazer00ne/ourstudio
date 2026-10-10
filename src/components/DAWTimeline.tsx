/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Track, AudioClip, TimelineComment, ProjectRole } from '../types';
import { Play, Pause, Square, Plus, Scissors, Copy, Trash, ZoomIn, ZoomOut, Mic, Lock, ShieldAlert, Upload, Repeat, Sliders, X, RotateCcw, RotateCw, Timer, Volume2, SkipBack, SkipForward, Rewind, FastForward } from 'lucide-react';
import { AutomationLane } from './AutomationLane';
import { getAutomatedValueAtTime } from '../utils/automationUtils';
import { synthesizeStepNote, makeDistortionCurve, playMetronomeClick } from '../utils/audioEngine';

interface DAWTimelineProps {
  tracks: Track[];
  clips: AudioClip[];
  comments: TimelineComment[];
  selectedClipId: string | null;
  onSelectClip: (id: string | null) => void;
  onUpdateClips: (clips: AudioClip[]) => void;
  onAddTrack: () => void;
  onUpdateTrack?: (trackId: string, updates: Partial<Track>) => void;
  selectedTrackId: string | null;
  onSelectTrack: (id: string | null) => void;
  onAddActivity: (type: string, message: string) => void;
  currentUser: string;
  onImportTrack: (trackName: string, clipName: string, duration: number, color: string, targetTrackId?: string, startTime?: number, audioUrl?: string) => void;
  isPlaying?: boolean;
  setIsPlaying?: (playing: boolean) => void;
  currentTime?: number;
  setCurrentTime?: (time: number | ((prev: number) => number)) => void;
  currentUserRole?: ProjectRole;
  currentUserAssignedTracks?: string[];
  currentUserCanAddTracks?: boolean;
  currentUserEmail?: string;
  tempo?: number;
  onUpdateTempo?: (tempo: number) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  undoActionName?: string;
  redoActionName?: string;
}

export default function DAWTimeline({
  tracks,
  clips,
  comments,
  selectedClipId,
  onSelectClip,
  onUpdateClips,
  onAddTrack,
  onUpdateTrack,
  selectedTrackId,
  onSelectTrack,
  onAddActivity,
  currentUser,
  onImportTrack,
  isPlaying: isPlayingProp,
  setIsPlaying: setIsPlayingProp,
  currentTime: currentTimeProp,
  setCurrentTime: setCurrentTimeProp,
  currentUserRole = 'Producer',
  currentUserAssignedTracks = [],
  currentUserCanAddTracks = true,
  currentUserEmail,
  tempo: tempoProp = 120,
  onUpdateTempo,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  undoActionName,
  redoActionName
}: DAWTimelineProps) {
  const canEditTrack = (trackId?: string | null): boolean => {
    if (!trackId) return false;
    // User requirement: When a person adds a new track, irrespective of his role, he should be able to work on it
    const targetTrack = tracks.find(t => t.id === trackId);
    if (targetTrack?.createdBy) {
      if (currentUserEmail && targetTrack.createdBy.toLowerCase() === currentUserEmail.toLowerCase()) return true;
      if (targetTrack.createdBy === currentUser) return true;
    }
    if (currentUserRole === 'Owner' || currentUserRole === 'Producer' || currentUserRole === 'Editor') return true;
    if (currentUserAssignedTracks && currentUserAssignedTracks.includes(trackId)) return true;
    if (currentUserRole === 'Viewer') return false;
    if (currentUserRole === 'Track Editor') {
      return Boolean(currentUserAssignedTracks && currentUserAssignedTracks.includes(trackId));
    }
    if (!currentUserAssignedTracks || currentUserAssignedTracks.length === 0) return true;
    return currentUserAssignedTracks.includes(trackId);
  };

  // Irrespective of role, any collaborator can add their track to work on it
  const canAddTracks = true;
  const [localIsPlaying, setLocalIsPlaying] = useState(false);
  const [localCurrentTime, setLocalCurrentTime] = useState(0);

  // Track automation lane visibility state
  const [expandedAutomationTrackIds, setExpandedAutomationTrackIds] = useState<Record<string, boolean>>({
    't-1': true // Expand Drums track by default so user immediately sees the automation lane
  });

  const toggleAutomationLane = (trackId: string) => {
    setExpandedAutomationTrackIds(prev => ({
      ...prev,
      [trackId]: !prev[trackId]
    }));
  };

  const isAnyAutomationExpanded = tracks.some(t => expandedAutomationTrackIds[t.id]);

  const handleToggleAllAutomation = () => {
    const nextState = !isAnyAutomationExpanded;
    const newMap: Record<string, boolean> = {};
    tracks.forEach(t => {
      newMap[t.id] = nextState;
    });
    setExpandedAutomationTrackIds(newMap);
  };

  const handleTrackUpdate = (trackId: string, updates: Partial<Track>) => {
    if (onUpdateTrack) {
      onUpdateTrack(trackId, updates);
    }
  };

  const isPlaying = isPlayingProp !== undefined ? isPlayingProp : localIsPlaying;
  const setIsPlaying = setIsPlayingProp !== undefined ? setIsPlayingProp : setLocalIsPlaying;
  const currentTime = currentTimeProp !== undefined ? currentTimeProp : localCurrentTime;
  const setCurrentTime = setCurrentTimeProp !== undefined ? setCurrentTimeProp : setLocalCurrentTime;

  const [zoomLevel, setZoomLevel] = useState(12); // pixels per second
  const [isRecording, setIsRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);

  // Producer Looping States - defaults to false so track plays continuously to the end
  const [isLooping, setIsLooping] = useState(false);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(32);

  // Dynamically calculate the total track duration across all audio components added
  const totalProjectDuration = React.useMemo(() => {
    if (clips.length === 0) return 32;
    const maxClipEnd = Math.max(...clips.map(c => c.startTime + c.duration));
    return Math.max(16, parseFloat(maxClipEnd.toFixed(2)));
  }, [clips]);

  // Tempo & Metronome States
  const [localTempo, setLocalTempo] = useState<number>(tempoProp || 120);
  const currentTempo = tempoProp !== undefined ? tempoProp : localTempo;

  const handleUpdateTempo = (newTempo: number) => {
    const clamped = Math.max(40, Math.min(260, newTempo));
    if (onUpdateTempo) {
      onUpdateTempo(clamped);
    } else {
      setLocalTempo(clamped);
    }
  };

  const [isMetronomeActive, setIsMetronomeActive] = useState<boolean>(false);
  const [activeBeat, setActiveBeat] = useState<number>(0);
  const lastScheduledBeatRef = useRef<number>(-1);
  const tapTimesRef = useRef<number[]>([]);

  const handleTapTempo = () => {
    const now = performance.now();
    const recentTaps = tapTimesRef.current.filter(t => now - t < 3000);
    recentTaps.push(now);
    tapTimesRef.current = recentTaps;

    if (recentTaps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < recentTaps.length; i++) {
        intervals.push(recentTaps[i] - recentTaps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      handleUpdateTempo(calculatedBpm);
    }
  };

  // Clip Fade In / Fade Out Dragging Handlers
  const fadeClipRef = useRef<AudioClip | null>(null);
  const fadeDirection = useRef<'in' | 'out'>('in');
  const fadeStartMouseX = useRef<number>(0);
  const fadeStartVal = useRef<number>(0);

  const handleFadeMouseDown = (e: React.MouseEvent, clip: AudioClip, dir: 'in' | 'out') => {
    if (!canEditTrack(clip.trackId)) return;
    e.stopPropagation();
    fadeClipRef.current = clip;
    fadeDirection.current = dir;
    fadeStartMouseX.current = e.clientX;
    fadeStartVal.current = dir === 'in' ? (clip.fadeIn || 0) : (clip.fadeOut || 0);

    document.addEventListener('mousemove', handleFadeMouseMove);
    document.addEventListener('mouseup', handleFadeMouseUp);
  };

  const handleFadeMouseMove = (e: MouseEvent) => {
    if (!fadeClipRef.current) return;
    const deltaX = e.clientX - fadeStartMouseX.current;
    const deltaTime = deltaX / zoomLevel;
    const maxFade = fadeClipRef.current.duration * 0.5;

    onUpdateClips(clips.map(c => {
      if (c.id === fadeClipRef.current?.id) {
        if (fadeDirection.current === 'in') {
          const newFadeIn = Math.max(0, Math.min(maxFade, fadeStartVal.current + deltaTime));
          return { ...c, fadeIn: parseFloat(newFadeIn.toFixed(2)) };
        } else {
          const newFadeOut = Math.max(0, Math.min(maxFade, fadeStartVal.current - deltaTime));
          return { ...c, fadeOut: parseFloat(newFadeOut.toFixed(2)) };
        }
      }
      return c;
    }));
  };

  const handleFadeMouseUp = () => {
    if (fadeClipRef.current) {
      const updated = clips.find(c => c.id === fadeClipRef.current?.id);
      if (updated) {
        const val = fadeDirection.current === 'in' ? updated.fadeIn : updated.fadeOut;
        onAddActivity('FADE_CLIP', `Adjusted fade-${fadeDirection.current} on "${updated.name}" to ${val?.toFixed(2)}s`);
      }
    }
    fadeClipRef.current = null;
    document.removeEventListener('mousemove', handleFadeMouseMove);
    document.removeEventListener('mouseup', handleFadeMouseUp);
  };

  const [showImportModal, setShowImportModal] = useState(false);
  const [importDestination, setImportDestination] = useState<'new' | 'existing'>('new');
  const [importTargetTrackId, setImportTargetTrackId] = useState<string>('');
  const [importStartTime, setImportStartTime] = useState<number>(0);
  const [importTrackName, setImportTrackName] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [importDuration, setImportDuration] = useState(16);
  const [importColor, setImportColor] = useState('#ec4899');
  const [importFileUrl, setImportFileUrl] = useState<string>('#');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio Buffers Cache for playing imported file waveforms directly
  const audioBufferCacheRef = useRef<Record<string, AudioBuffer>>({});
  const playingClipsRef = useRef<Record<string, { source: AudioBufferSourceNode, gainNode: GainNode }>>({});
  
  // Microphone / Live Recording States and Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordStartTimeRef = useRef<number>(0);
  const [recordStartPlayheadTime, setRecordStartPlayheadTime] = useState<number>(0);

  const decodeAudioUrl = async (url: string) => {
    if (audioBufferCacheRef.current[url]) return audioBufferCacheRef.current[url];
    try {
      const response = await fetch(url);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const ctx = getAudioContext();
        if (ctx) {
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          audioBufferCacheRef.current[url] = audioBuffer;
          return audioBuffer;
        }
      }
    } catch (err) {
      console.warn("Could not decode audio file buffer directly, generating mock high-quality synthesizer loop:", err);
    }

    // Fallback: Generate high-quality synchronized audio buffer so ALL tracks play in sync
    const ctx = getAudioContext();
    if (ctx) {
      const clip = clips.find(c => c.audioUrl === url);
      const track = clip ? tracks.find(t => t.id === clip.trackId) : null;
      const trackName = track ? track.name : 'Ambient Pad';
      const trackColor = track ? track.color : '#8b5cf6';
      const duration = clip ? clip.duration : 16;

      const sampleRate = ctx.sampleRate || 44100;
      const length = Math.ceil(sampleRate * duration);
      const audioBuffer = ctx.createBuffer(1, length, sampleRate);
      const data = audioBuffer.getChannelData(0);

      const nameLower = trackName.toLowerCase();
      
      // Drum track
      if (nameLower.includes('drum') || nameLower.includes('kick') || nameLower.includes('snare') || nameLower.includes('beat') || trackColor === '#f43f5e') {
        for (let i = 0; i < length; i++) {
          const time = i / sampleRate;
          const beatTime = time % 2.0; // 2s per bar at 120BPM
          const stepTime = time % 0.25;

          let value = 0;
          if (beatTime < 0.2 || (beatTime >= 1.0 && beatTime < 1.2)) {
            const tKick = beatTime % 1.0;
            if (tKick < 0.15) {
              const freq = 40 + (130 - 40) * Math.exp(-tKick * 40);
              value += Math.sin(2 * Math.PI * freq * tKick) * Math.exp(-tKick * 15) * 0.7;
            }
          }
          if ((beatTime >= 0.5 && beatTime < 0.7) || (beatTime >= 1.5 && beatTime < 1.7)) {
            const tSnare = beatTime % 0.5;
            if (tSnare < 0.15) {
              const noise = Math.random() * 2 - 1;
              const snap = Math.sin(2 * Math.PI * 180 * tSnare) * Math.exp(-tSnare * 20);
              value += (noise * 0.15 + snap * 0.25) * Math.exp(-tSnare * 8) * 0.5;
            }
          }
          if (stepTime < 0.03) {
            const tHat = stepTime;
            const noise = Math.random() * 2 - 1;
            value += noise * Math.exp(-tHat * 70) * 0.08;
          }
          data[i] = Math.max(-1, Math.min(1, value));
        }
      } 
      // Bass track
      else if (nameLower.includes('bass') || nameLower.includes('sub') || trackColor === '#06b6d4') {
        const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
        const rootNotes = [36, 43, 40, 41]; // C2, G2, E2, F2

        for (let i = 0; i < length; i++) {
          const time = i / sampleRate;
          const measureIndex = Math.floor(time / 2.0) % 4;
          const freq = midiToFreq(rootNotes[measureIndex]);

          const phase = (time * freq) % 1.0;
          const saw = (2.0 * phase - 1.0) * 0.15;

          const beatTime = time % 0.5;
          const env = Math.exp(-beatTime * 3.0);
          data[i] = saw * env;
        }
      } 
      // Piano/Keys track
      else if (nameLower.includes('keys') || nameLower.includes('piano') || nameLower.includes('synth') || trackColor === '#8b5cf6' || trackColor === '#a855f7') {
        const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
        const chordNotes = [
          [60, 64, 67, 72],
          [55, 59, 62, 67],
          [57, 60, 64, 69],
          [53, 57, 60, 65]
        ];

        for (let i = 0; i < length; i++) {
          const time = i / sampleRate;
          const measureIndex = Math.floor(time / 2.0) % 4;
          const currentChord = chordNotes[measureIndex];
          
          const noteIndex = Math.floor(time / 0.25) % currentChord.length;
          const freq = midiToFreq(currentChord[noteIndex]);

          const phase = (time * freq) % 1.0;
          const tri = (phase < 0.5) ? (4.0 * phase - 1.0) : (3.0 - 4.0 * phase);
          
          const noteTime = time % 0.25;
          const env = Math.exp(-noteTime * 5.0);

          data[i] = tri * env * 0.12;
        }
      } 
      // Vocal/Lead track
      else if (nameLower.includes('lead') || nameLower.includes('vocal') || nameLower.includes('harmony') || trackColor === '#10b981') {
        const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
        const pentatonic = [60, 62, 64, 67, 69, 72, 74, 76];
        const melodyPattern = [0, 2, 4, 3, 5, 4, 7, 2];

        for (let i = 0; i < length; i++) {
          const time = i / sampleRate;
          const patternIndex = Math.floor(time / 0.5) % melodyPattern.length;
          const scaleDegree = melodyPattern[patternIndex];
          const freq = midiToFreq(pentatonic[scaleDegree % pentatonic.length] + 12);

          const vibrato = Math.sin(2 * Math.PI * 6.0 * time) * 0.008;
          const val = Math.sin(2 * Math.PI * freq * (1.0 + vibrato) * time);

          const noteTime = time % 0.5;
          const env = Math.exp(-noteTime * 2.0);

          data[i] = val * env * 0.15;
        }
      } 
      // Guitar track
      else if (nameLower.includes('guitar') || trackColor === '#f59e0b') {
        const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
        const strumChords = [
          [48, 52, 55, 60],
          [43, 47, 50, 55],
          [45, 48, 52, 57],
          [41, 45, 48, 53]
        ];

        for (let i = 0; i < length; i++) {
          const time = i / sampleRate;
          const measureIndex = Math.floor(time / 2.0) % 4;
          const currentChord = strumChords[measureIndex];

          const intervalTime = time % 1.0;
          let value = 0;

          currentChord.forEach((noteMidi, idx) => {
            const noteDelay = idx * 0.04;
            if (intervalTime >= noteDelay) {
              const noteTime = intervalTime - noteDelay;
              const freq = midiToFreq(noteMidi + 12);
              const sin = Math.sin(2 * Math.PI * freq * noteTime);
              value += sin * Math.exp(-noteTime * 3.5) * 0.1;
            }
          });

          data[i] = Math.max(-1, Math.min(1, value));
        }
      } 
      // Detuned pad
      else {
        const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
        const chordRoots = [48, 55, 45, 41];

        for (let i = 0; i < length; i++) {
          const time = i / sampleRate;
          const measureIndex = Math.floor(time / 2.0) % 4;
          const rootMidi = chordRoots[measureIndex];
          
          let value = 0;
          const freq1 = midiToFreq(rootMidi + 12);
          const freq2 = midiToFreq(rootMidi + 19);
          const freq3 = midiToFreq(rootMidi + 24);

          value += Math.sin(2 * Math.PI * freq1 * time) * 0.06;
          value += Math.sin(2 * Math.PI * freq2 * time) * 0.05;
          value += Math.sin(2 * Math.PI * freq3 * time) * 0.04;

          const sweep = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.25 * time);
          data[i] = value * sweep;
        }
      }

      audioBufferCacheRef.current[url] = audioBuffer;
      return audioBuffer;
    }
    return null;
  };

  // Pre-load/decode any clips with valid custom audio URLs on mount or edit
  useEffect(() => {
    clips.forEach(clip => {
      if (clip.audioUrl && clip.audioUrl !== '#' && !audioBufferCacheRef.current[clip.audioUrl]) {
        decodeAudioUrl(clip.audioUrl);
      }
    });
  }, [clips]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file: File) => {
    setImportFileName(file.name);
    // Create direct local URL pointing to uploaded file
    let blobUrl = '#';
    try {
      blobUrl = URL.createObjectURL(file);
      setImportFileUrl(blobUrl);
    } catch (err) {
      setImportFileUrl('#');
    }
    const cleanName = file.name
      .replace(/\.[^/.]+$/, "") // remove extension
      .replace(/[_-]/g, " ")     // replace dashes/underscores with spaces
      .replace(/\b\w/g, c => c.toUpperCase());
    setImportTrackName(cleanName);

    // Accurately detect true audio duration of the imported file
    let detectedDuration = 16;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const ctx = getAudioContext();
      if (ctx) {
        const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
        detectedDuration = Math.round(decodedBuffer.duration * 100) / 100;
        if (blobUrl !== '#') {
          audioBufferCacheRef.current[blobUrl] = decodedBuffer;
        }
      }
    } catch (_) {
      try {
        if (blobUrl !== '#') {
          const tempAudio = new Audio(blobUrl);
          await new Promise<void>((resolve) => {
            tempAudio.onloadedmetadata = () => {
              if (tempAudio.duration && isFinite(tempAudio.duration)) {
                detectedDuration = Math.round(tempAudio.duration * 100) / 100;
              }
              resolve();
            };
            tempAudio.onerror = () => resolve();
            setTimeout(() => resolve(), 1500);
          });
        }
      } catch (_) {}
    }

    setImportDuration(detectedDuration);
    // Auto-expand timeline length so all components fit
    if (detectedDuration + importStartTime > maxTimelineDuration - 5) {
      setMaxTimelineDuration(Math.max(60, Math.ceil(detectedDuration + importStartTime + 15)));
    }

    // Auto-select first track as default target if we are importing to existing
    if (tracks.length > 0 && !importTargetTrackId) {
      setImportTargetTrackId(tracks[0].id);
    }
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFileName) {
      alert('Please upload or select an audio file first.');
      return;
    }
    if (importDestination === 'new' && !importTrackName) {
      alert('Please provide a track name.');
      return;
    }

    if (importDestination === 'existing') {
      const selectedTrack = importTargetTrackId || (tracks[0] ? tracks[0].id : '');
      if (!selectedTrack) {
        alert('No track available to import into.');
        return;
      }
      onImportTrack('', importFileName, importDuration, importColor, selectedTrack, importStartTime, importFileUrl);
    } else {
      onImportTrack(importTrackName, importFileName, importDuration, importColor, undefined, importStartTime, importFileUrl);
    }
    
    setShowImportModal(false);
    // Reset form
    setImportTrackName('');
    setImportFileName('');
    setImportDuration(16);
    setImportDestination('new');
    setImportTargetTrackId('');
    setImportStartTime(0);
    setImportFileUrl('#');
  };

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const masterLimiterRef = useRef<DynamicsCompressorNode | null>(null);
  const masterAnalyserRef = useRef<AnalyserNode | null>(null);
  const lastScheduledStepRef = useRef<number>(-1);
  const lastScrubbedStepRef = useRef<number>(-1);

  const getAudioContext = (): AudioContext | null => {
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AudioContextClass) return null;
    if (!audioCtxRef.current) {
      try {
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        // Dedicated Master Bus with Headroom Limiting and Dynamic Analysis
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.85, ctx.currentTime);

        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.setValueAtTime(-1.0, ctx.currentTime); // Prevent digital clipping on sum
        limiter.knee.setValueAtTime(8, ctx.currentTime);
        limiter.ratio.setValueAtTime(16, ctx.currentTime);
        limiter.attack.setValueAtTime(0.003, ctx.currentTime);
        limiter.release.setValueAtTime(0.2, ctx.currentTime);

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;

        masterGain.connect(limiter);
        limiter.connect(analyser);
        analyser.connect(ctx.destination);

        masterGainRef.current = masterGain;
        masterLimiterRef.current = limiter;
        masterAnalyserRef.current = analyser;
      } catch (e) {
        console.error('AudioContext failed to initialize:', e);
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(err => console.warn('Could not resume AudioContext:', err));
    }
    return audioCtxRef.current;
  };

  const initAudioCtxOnGesture = () => {
    getAudioContext();
  };

  const createTrackChannelStrip = (ctx: AudioContext, track: Track, time: number, customVolume?: number) => {
    // Respect track mute/solo constraints across the mixer
    const isAnyTrackSoloed = tracks.some(t => t.isSoloed);
    const isAudible = !track.isMuted && (!isAnyTrackSoloed || track.isSoloed);

    // Calculate effective automated volume if envelope is active
    let effectiveVolume = track.volume;
    if (customVolume !== undefined) {
      effectiveVolume = customVolume;
    } else if (
      track.automation &&
      track.automation.enabled &&
      track.automation.mode !== 'off' &&
      track.automation.points &&
      track.automation.points.length > 0
    ) {
      effectiveVolume = getAutomatedValueAtTime(track.automation.points, currentTime, track.volume);
    }

    // Track Volume Gain Stage (Channel Fader)
    const gainNode = ctx.createGain();
    const trackVolumeFactor = effectiveVolume / 100;
    const baseGain = isAudible ? (trackVolumeFactor * 0.45) : 0.00001; 
    gainNode.gain.setValueAtTime(baseGain, time);

    // Stereo Panner
    let panner: StereoPannerNode | null = null;
    try {
      if (ctx.createStereoPanner) {
        panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(Math.max(-1, Math.min(1, track.pan / 50)), time);
      }
    } catch (e) {
      console.warn('StereoPannerNode is not supported in this browser:', e);
    }

    // 3-Band Channel Strip Equalizer
    const eqLowNode = ctx.createBiquadFilter();
    eqLowNode.type = 'lowshelf';
    eqLowNode.frequency.setValueAtTime(150, time);
    const eqLowValue = track.eqLow !== undefined ? track.eqLow : 50;
    eqLowNode.gain.setValueAtTime(((eqLowValue - 50) / 50) * 12, time);

    const eqMidNode = ctx.createBiquadFilter();
    eqMidNode.type = 'peaking';
    eqMidNode.frequency.setValueAtTime(1500, time);
    eqMidNode.Q.setValueAtTime(1.0, time);
    const eqMidValue = track.eqMid !== undefined ? track.eqMid : 50;
    eqMidNode.gain.setValueAtTime(((eqMidValue - 50) / 50) * 12, time);

    const eqHighNode = ctx.createBiquadFilter();
    eqHighNode.type = 'highshelf';
    eqHighNode.frequency.setValueAtTime(8000, time);
    const eqHighValue = track.eqHigh !== undefined ? track.eqHigh : 50;
    eqHighNode.gain.setValueAtTime(((eqHighValue - 50) / 50) * 12, time);

    // Chain: Gain -> Distortion -> Compressor -> EQ Low -> EQ Mid -> EQ High
    let currentHead: AudioNode = gainNode;

    if (track.distortion && track.distortion > 0) {
      try {
        const shaper = ctx.createWaveShaper();
        shaper.curve = makeDistortionCurve(track.distortion) as any;
        shaper.oversample = '4x';
        const toneFilter = ctx.createBiquadFilter();
        toneFilter.type = 'lowpass';
        const tone = track.distortionTone !== undefined ? track.distortionTone : 50;
        toneFilter.frequency.setValueAtTime(2000 + (tone / 100) * 14000, time);
        currentHead.connect(shaper);
        shaper.connect(toneFilter);
        currentHead = toneFilter;
      } catch (e) {}
    }

    if (track.compressorEnabled) {
      try {
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.setValueAtTime(track.compressorThreshold ?? -24, time);
        comp.ratio.setValueAtTime(track.compressorRatio ?? 4, time);
        comp.attack.setValueAtTime(track.compressorAttack ?? 0.01, time);
        comp.release.setValueAtTime(track.compressorRelease ?? 0.25, time);
        comp.knee.setValueAtTime(track.compressorKnee ?? 5, time);
        const makeup = ctx.createGain();
        makeup.gain.setValueAtTime(Math.pow(10, (track.compressorGain ?? 0) / 20), time);
        currentHead.connect(comp);
        comp.connect(makeup);
        currentHead = makeup;
      } catch (e) {}
    }

    currentHead.connect(eqLowNode);
    eqLowNode.connect(eqMidNode);
    eqMidNode.connect(eqHighNode);

    // Final output gain stage for this track's strip
    const trackOutput = ctx.createGain();
    trackOutput.gain.setValueAtTime(1.0, time);
    eqHighNode.connect(trackOutput);

    // Destination target is the unified Master Bus (limiter + master gain)
    const masterTarget = masterGainRef.current || ctx.destination;

    // Route Stereo Panner to Master Bus
    if (panner) {
      trackOutput.connect(panner);
      panner.connect(masterTarget);
    } else {
      trackOutput.connect(masterTarget);
    }

    // Delay FX Send
    const delayVal = track.delay !== undefined ? track.delay : 10;
    if (delayVal > 1) {
      const delayNode = ctx.createDelay();
      delayNode.delayTime.setValueAtTime(0.3, time);
      
      const delayFeedbackNode = ctx.createGain();
      delayFeedbackNode.gain.setValueAtTime((delayVal / 100) * 0.7, time);

      trackOutput.connect(delayNode);
      delayNode.connect(delayFeedbackNode);
      delayFeedbackNode.connect(delayNode);
      delayNode.connect(panner ? panner : masterTarget);
    }

    // Reverb FX Send
    const reverbVal = track.reverb !== undefined ? track.reverb : 15;
    if (reverbVal > 1) {
      const reverbNode = ctx.createDelay();
      reverbNode.delayTime.setValueAtTime(0.06, time);
      
      const reverbFeedbackNode = ctx.createGain();
      reverbFeedbackNode.gain.setValueAtTime((reverbVal / 100) * 0.75, time);

      const reverbFilter = ctx.createBiquadFilter();
      reverbFilter.type = 'lowpass';
      reverbFilter.frequency.setValueAtTime(2000, time);

      trackOutput.connect(reverbNode);
      reverbNode.connect(reverbFilter);
      reverbFilter.connect(reverbFeedbackNode);
      reverbFeedbackNode.connect(reverbNode);
      reverbFeedbackNode.connect(panner ? panner : masterTarget);
    }

    return gainNode;
  };

  const stopAllAudioClips = () => {
    Object.keys(playingClipsRef.current).forEach(clipId => {
      try {
        const item = playingClipsRef.current[clipId];
        if (item && item.source) {
          item.source.onended = null;
          item.source.stop();
          item.source.disconnect();
        }
      } catch (e) {}
    });
    playingClipsRef.current = {};
  };

  const syncAudioClips = (targetTime: number) => {
    if (!isPlaying) {
      stopAllAudioClips();
      return;
    }

    const ctx = getAudioContext();
    if (!ctx) return;

    // Check all clips to see which ones should be playing
    clips.forEach(clip => {
      if (!clip.audioUrl || clip.audioUrl === '#') return;

      const cachedBuffer = audioBufferCacheRef.current[clip.audioUrl];
      if (!cachedBuffer) return;

      const clipEndTime = clip.startTime + clip.duration;
      const shouldBePlaying = targetTime >= clip.startTime && targetTime < clipEndTime;

      const activePlaying = playingClipsRef.current[clip.id];

      if (shouldBePlaying) {
        if (!activePlaying) {
          const track = tracks.find(t => t.id === clip.trackId);
          if (!track) return;

          try {
            const bufferSource = ctx.createBufferSource();
            bufferSource.buffer = cachedBuffer;

            const channelStripNode = createTrackChannelStrip(ctx, track, ctx.currentTime);
            bufferSource.connect(channelStripNode);

            const offset = targetTime - clip.startTime;
            const durationLeft = clipEndTime - targetTime;

            if (offset < cachedBuffer.duration) {
              bufferSource.start(ctx.currentTime, offset, Math.min(durationLeft, cachedBuffer.duration - offset));
            } else {
              bufferSource.start(ctx.currentTime, offset % cachedBuffer.duration, durationLeft);
            }

            bufferSource.onended = () => {
              delete playingClipsRef.current[clip.id];
            };

            playingClipsRef.current[clip.id] = { source: bufferSource, gainNode: channelStripNode };
          } catch (err) {
            console.error("Failed to start continuous audio clip playback:", err);
          }
        } else {
          const track = tracks.find(t => t.id === clip.trackId);
          if (track) {
            const isAnyTrackSoloed = tracks.some(t => t.isSoloed);
            const isAudible = !track.isMuted && (!isAnyTrackSoloed || track.isSoloed);
            const effectiveVol = (track.automation && track.automation.enabled && track.automation.mode !== 'off' && track.automation.points?.length > 0)
              ? getAutomatedValueAtTime(track.automation.points, targetTime, track.volume)
              : track.volume;
            const trackVolumeFactor = effectiveVol / 100;
            const baseGain = isAudible ? (trackVolumeFactor * 0.45) : 0.00001;
            try {
              activePlaying.gainNode.gain.setValueAtTime(baseGain, ctx.currentTime);
            } catch (e) {}
          }
        }
      } else {
        if (activePlaying) {
          try {
            activePlaying.source.stop();
          } catch (e) {}
          delete playingClipsRef.current[clip.id];
        }
      }
    });

    Object.keys(playingClipsRef.current).forEach(clipId => {
      if (!clips.some(c => c.id === clipId)) {
        try {
          playingClipsRef.current[clipId].source.stop();
        } catch (e) {}
        delete playingClipsRef.current[clipId];
      }
    });
  };

  useEffect(() => {
    syncAudioClips(currentTime);
  }, [currentTime, isPlaying, clips, tracks]);

  useEffect(() => {
    return () => {
      stopAllAudioClips();
    };
  }, []);

  // Handle AudioContext state based on playback state
  useEffect(() => {
    if (!isPlaying) {
      if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
        audioCtxRef.current.suspend().catch(err => console.warn('Could not suspend AudioContext:', err));
      }
    } else {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(err => console.warn('Could not resume AudioContext:', err));
      }
    }
  }, [isPlaying]);

  // Clean up AudioContext when component unmounts
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(err => console.warn('Could not close AudioContext:', err));
      }
    };
  }, []);

  // Professional real-time Web Audio synthesizer player for simultaneous multitrack mixing
  const playSynthesizedStep = (ctx: AudioContext, time: number, track: Track, stepNumber: number) => {
    try {
      // Respect track mute/solo constraints across the entire project
      const isAnyTrackSoloed = tracks.some(t => t.isSoloed);
      if (track.isMuted) return;
      if (isAnyTrackSoloed && !track.isSoloed) return;

      const stepInterval = Math.max(0.05, (60 / currentTempo) / 2);
      const stepTimeInTimeline = stepNumber * stepInterval;
      const activeClip = clips.find(c => 
        c.trackId === track.id && 
        stepTimeInTimeline >= c.startTime && 
        stepTimeInTimeline < (c.startTime + c.duration)
      );

      // If no clip exists on this track at this timeline coordinate, produce no sound
      if (!activeClip) {
        return;
      }

      if (activeClip.audioUrl && (activeClip.audioUrl.startsWith('blob:') || activeClip.audioUrl.startsWith('data:'))) {
        const cachedBuffer = audioBufferCacheRef.current[activeClip.audioUrl];
        if (cachedBuffer) {
          // Real recorded/imported audio buffer is handled continuously by syncAudioClips!
          return;
        }
      }

      // Calculate dynamic automated volume at this step time
      const rawEffectiveVol = (track.automation && track.automation.enabled && track.automation.mode !== 'off' && track.automation.points && track.automation.points.length > 0)
        ? getAutomatedValueAtTime(track.automation.points, stepTimeInTimeline, track.volume)
        : track.volume;

      // Apply clip fade-in / fade-out envelope
      let fadeMultiplier = 1.0;
      const fadeIn = activeClip.fadeIn || 0;
      const fadeOut = activeClip.fadeOut || 0;
      if (fadeIn > 0 && stepTimeInTimeline < (activeClip.startTime + fadeIn)) {
        fadeMultiplier = Math.max(0, (stepTimeInTimeline - activeClip.startTime) / fadeIn);
      } else if (fadeOut > 0 && stepTimeInTimeline > (activeClip.startTime + activeClip.duration - fadeOut)) {
        fadeMultiplier = Math.max(0, (activeClip.startTime + activeClip.duration - stepTimeInTimeline) / fadeOut);
      }
      const effectiveVol = rawEffectiveVol * fadeMultiplier;

      // Connect into this track's dedicated channel strip (Volume, Pan, 3-Band EQ, Delay, Reverb, Master Bus Limiter)
      const channelStripInput = createTrackChannelStrip(ctx, track, time, effectiveVol);

      try {
        synthesizeStepNote(ctx, track, time, stepNumber, channelStripInput);
      } catch (err) {
        console.warn('Playback step synthesize skipped:', err);
      }
    } catch (err) {
      console.warn('Playback step synthesize skipped:', err);
    }
  };

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isScrubbingRef = useRef<boolean>(false);

  const [maxTimelineDuration, setMaxTimelineDuration] = useState(60); // Dynamic expandable timeline length

  // Dynamically ensure timeline length is always large enough to fit all audio components
  useEffect(() => {
    if (totalProjectDuration > maxTimelineDuration - 5) {
      setMaxTimelineDuration(Math.max(60, Math.ceil(totalProjectDuration + 15)));
    }
  }, [totalProjectDuration, maxTimelineDuration]);

  // Playback engine loop
  useEffect(() => {
    const stepInterval = Math.max(0.05, (60 / currentTempo) / 2);
    const beatInterval = 60 / currentTempo;

    if (isPlaying) {
      lastTimeRef.current = performance.now();
      lastScheduledStepRef.current = Math.floor(currentTime / stepInterval) - 1;
      lastScheduledBeatRef.current = Math.floor(currentTime / beatInterval) - 1;
      const loop = () => {
        // If user is currently dragging/scrubbing the playhead, do not advance time via RAF
        if (isScrubbingRef.current) {
          lastTimeRef.current = performance.now();
          animationFrameRef.current = requestAnimationFrame(loop);
          return;
        }

        const now = performance.now();
        const delta = (now - lastTimeRef.current) / 1000;
        lastTimeRef.current = now;

        setCurrentTime((prev) => {
          let nextTime = prev + delta;
          const actualLoopEnd = Math.max(loopStart + 0.5, loopEnd);
          
          // 1. If Looping is active, wrap around
          if (isLooping && nextTime >= actualLoopEnd) {
            nextTime = loopStart;
            lastScheduledStepRef.current = Math.floor(loopStart / stepInterval) - 1;
            lastScheduledBeatRef.current = Math.floor(loopStart / beatInterval) - 1;
            stopAllAudioClips();
            syncAudioClips(loopStart);
          } 
          // 2. If Looping is false, play all audio components added till the end!
          else if (!isLooping && nextTime >= totalProjectDuration) {
            setIsPlaying(false);
            stopAllAudioClips();
            lastScheduledStepRef.current = -1;
            lastScheduledBeatRef.current = -1;
            setActiveBeat(0);
            return totalProjectDuration;
          } 
          // 3. Fallback max boundary
          else if (nextTime >= maxTimelineDuration) {
            setIsPlaying(false);
            stopAllAudioClips();
            lastScheduledStepRef.current = -1;
            lastScheduledBeatRef.current = -1;
            setActiveBeat(0);
            return 0;
          }

          // Calculate sequencer step
          const currentStep = Math.floor(nextTime / stepInterval);
          if (currentStep > lastScheduledStepRef.current) {
            const ctx = getAudioContext();
            if (ctx) {
              // Catch-up schedule notes up to current playhead step
              for (let step = lastScheduledStepRef.current + 1; step <= currentStep; step++) {
                const stepTimeInTimeline = step * stepInterval;
                // Map timeline seconds to future Web Audio API clock time
                const timeInAudioCtx = ctx.currentTime + (stepTimeInTimeline - nextTime);

                // Play active sound for all tracks simultaneously that have clips covering this timeline coordinate
                tracks.forEach(track => {
                  const hasActiveClip = clips.some(clip =>
                    clip.trackId === track.id &&
                    stepTimeInTimeline >= clip.startTime &&
                    stepTimeInTimeline < (clip.startTime + clip.duration)
                  );
                  // Play all active tracks with clips, or all unmuted tracks if no clips are placed yet
                  if (hasActiveClip || clips.length === 0) {
                    playSynthesizedStep(ctx, Math.max(ctx.currentTime, timeInAudioCtx), track, step);
                  }
                });
              }
            }
            lastScheduledStepRef.current = currentStep;
          }

          // Schedule Metronome click when active
          const currentBeat = Math.floor(nextTime / beatInterval);
          if (isMetronomeActive && currentBeat > lastScheduledBeatRef.current) {
            const ctx = getAudioContext();
            if (ctx) {
              for (let b = lastScheduledBeatRef.current + 1; b <= currentBeat; b++) {
                const beatTime = b * beatInterval;
                const timeInCtx = ctx.currentTime + (beatTime - nextTime);
                const isAccent = (b % 4 === 0);
                playMetronomeClick(ctx, Math.max(ctx.currentTime, timeInCtx), isAccent);
              }
              setActiveBeat((currentBeat % 4) + 1);
            }
            lastScheduledBeatRef.current = currentBeat;
          }

          return nextTime;
        });
        animationFrameRef.current = requestAnimationFrame(loop);
      };
      animationFrameRef.current = requestAnimationFrame(loop);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setActiveBeat(0);
      lastScheduledBeatRef.current = -1;
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, tracks, clips, isLooping, loopStart, loopEnd, currentTempo, isMetronomeActive, totalProjectDuration, maxTimelineDuration]);

  // Global spacebar transport shortcut for Play/Pause and Ctrl+Z/Ctrl+Y for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.hasAttribute('contenteditable'))) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          if (onRedo) {
            e.preventDefault();
            onRedo();
          }
        } else {
          if (onUndo) {
            e.preventDefault();
            onUndo();
          }
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (onRedo) {
          e.preventDefault();
          onRedo();
        }
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        initAudioCtxOnGesture();
        setIsPlaying(!isPlaying);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlaying, setIsPlaying, onUndo, onRedo]);

  // Recording handler
  const handleToggleRecord = async () => {
    if (isRecording) {
      // Stop recording
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      setIsRecording(false);

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    } else {
      // Start recording
      if (!selectedTrackId) {
        alert('Please select a track first to record into.');
        return;
      }
      if (!canEditTrack(selectedTrackId)) {
        alert('You do not have permission to record audio onto this track.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          // Clean up stream tracks
          stream.getTracks().forEach(track => track.stop());

          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(audioBlob);
          const duration = Math.max(1.0, (Date.now() - recordStartTimeRef.current) / 1000);

          try {
            const arrayBuffer = await audioBlob.arrayBuffer();
            const ctx = getAudioContext();
            if (ctx) {
              const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
              audioBufferCacheRef.current[url] = audioBuffer;
            }
          } catch (err) {
            console.error("Failed to decode recorded audio buffer:", err);
          }

          const newClipId = `clip-rec-${Date.now()}`;
          const newClip: AudioClip = {
            id: newClipId,
            trackId: selectedTrackId,
            name: `Microphone_Take_${Math.floor(Math.random() * 90 + 10)}.wav`,
            startTime: recordStartPlayheadTime,
            duration: duration,
            audioUrl: url,
            lockedBy: null,
            color: tracks.find(t => t.id === selectedTrackId)?.color || '#ef4444'
          };

          onUpdateClips([...clips, newClip]);
          onAddActivity('RECORD_CLIP', `Recorded a ${duration.toFixed(1)}s audio clip onto Track: "${tracks.find(t => t.id === selectedTrackId)?.name}"`);
        };

        // Record at current playhead position
        setRecordStartPlayheadTime(currentTime);
        recordStartTimeRef.current = Date.now();

        setIsPlaying(true);
        setIsRecording(true);
        setRecordTimer(0);

        mediaRecorder.start();

        const interval = setInterval(() => {
          setRecordTimer(prev => prev + 1);
        }, 1000);
        recordingIntervalRef.current = interval;
      } catch (err) {
        console.error("Failed to access microphone or start recording:", err);
        alert("Failed to start audio recording. Please make sure microphone permission is allowed.");
      }
    }
  };

  // Master seek function allowing the user to move the playback bar to any desired location
  const seekTo = (targetSec: number, shouldPreview: boolean = true) => {
    const clamped = Math.max(0, Math.min(maxTimelineDuration, targetSec));
    setCurrentTime(clamped);

    const stepInterval = Math.max(0.05, (60 / currentTempo) / 2);
    const beatInterval = 60 / currentTempo;

    lastTimeRef.current = performance.now();
    lastScheduledStepRef.current = Math.floor(clamped / stepInterval) - 1;
    lastScheduledBeatRef.current = Math.floor(clamped / beatInterval) - 1;

    // Stop currently running audio sources so they re-trigger from the new position
    stopAllAudioClips();

    if (isPlaying) {
      // Immediately start continuous audio clips from the new offset
      syncAudioClips(clamped);
    } else if (shouldPreview) {
      // Trigger acoustic preview step at scrub location
      const currentStep = Math.floor(clamped / stepInterval);
      if (currentStep !== lastScrubbedStepRef.current) {
        lastScrubbedStepRef.current = currentStep;
        const ctx = getAudioContext();
        if (ctx) {
          tracks.forEach(track => {
            const hasActiveClip = clips.some(clip =>
              clip.trackId === track.id &&
              clamped >= clip.startTime &&
              clamped < (clip.startTime + clip.duration)
            );
            if (hasActiveClip || clips.length === 0) {
              playSynthesizedStep(ctx, ctx.currentTime, track, currentStep);
            }
          });
        }
      }
    }
  };

  // Click or drag on ruler or timeline to seek
  const updatePlayheadPosition = (clientX: number, isFinal: boolean = false) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = timelineRef.current.scrollLeft;
    // Calculate relative x coordinate inside scroll container (subtracting 180px track label column)
    const x = clientX - rect.left + scrollLeft - 180;
    if (x < 0) {
      seekTo(0, !isFinal);
      return;
    }

    const targetSec = x / zoomLevel;
    seekTo(targetSec, !isFinal);
  };

  const handleRulerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only handle primary mouse button
    e.preventDefault();
    initAudioCtxOnGesture();
    isScrubbingRef.current = true;
    updatePlayheadPosition(e.clientX, false);

    const onMouseMove = (moveEvent: MouseEvent) => {
      updatePlayheadPosition(moveEvent.clientX, false);
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      isScrubbingRef.current = false;
      lastTimeRef.current = performance.now();
      updatePlayheadPosition(upEvent.clientX, true);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handlePlayheadMouseMove = (e: MouseEvent) => {
    updatePlayheadPosition(e.clientX, false);
  };

  const handlePlayheadMouseUp = (e: MouseEvent) => {
    isScrubbingRef.current = false;
    lastTimeRef.current = performance.now();
    updatePlayheadPosition(e.clientX, true);
    document.removeEventListener('mousemove', handlePlayheadMouseMove);
    document.removeEventListener('mouseup', handlePlayheadMouseUp);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    initAudioCtxOnGesture();
    updatePlayheadPosition(e.clientX, true);
  };

  // Dragging states
  const dragClipRef = useRef<AudioClip | null>(null);
  const dragStartMouseX = useRef<number>(0);
  const dragStartClipTime = useRef<number>(0);

  const handleClipMouseDown = (e: React.MouseEvent, clip: AudioClip) => {
    if (clip.lockedBy && clip.lockedBy !== currentUser) {
      // Locked by someone else
      return;
    }
    if (!canEditTrack(clip.trackId)) {
      // Track is locked for this collaborator
      return;
    }
    e.stopPropagation();
    onSelectClip(clip.id);
    onSelectTrack(clip.trackId);
    dragClipRef.current = clip;
    dragStartMouseX.current = e.clientX;
    dragStartClipTime.current = clip.startTime;

    document.addEventListener('mousemove', handleClipMouseMove);
    document.addEventListener('mouseup', handleClipMouseUp);
  };

  const handleClipMouseMove = (e: MouseEvent) => {
    if (!dragClipRef.current) return;
    const deltaX = e.clientX - dragStartMouseX.current;
    const deltaTime = deltaX / zoomLevel;
    const newStartTime = Math.max(0, Math.min(maxTimelineDuration - dragClipRef.current.duration, dragStartClipTime.current + deltaTime));

    onUpdateClips(clips.map(c => {
      if (c.id === dragClipRef.current?.id) {
        return { ...c, startTime: parseFloat(newStartTime.toFixed(2)) };
      }
      return c;
    }));
  };

  const handleClipMouseUp = () => {
    if (dragClipRef.current) {
      const updated = clips.find(c => c.id === dragClipRef.current?.id);
      if (updated && updated.startTime !== dragStartClipTime.current) {
        onAddActivity('MOVE_CLIP', `Moved clip "${updated.name}" from ${dragStartClipTime.current.toFixed(1)}s to ${updated.startTime.toFixed(1)}s`);
      }
    }
    dragClipRef.current = null;
    document.removeEventListener('mousemove', handleClipMouseMove);
    document.removeEventListener('mouseup', handleClipMouseUp);
  };

  // Trim resizing
  const resizeClipRef = useRef<AudioClip | null>(null);
  const resizeDirection = useRef<'left' | 'right'>('right');
  const resizeStartMouseX = useRef<number>(0);
  const resizeStartStartTime = useRef<number>(0);
  const resizeStartDuration = useRef<number>(0);

  const handleResizeMouseDown = (e: React.MouseEvent, clip: AudioClip, dir: 'left' | 'right') => {
    if (!canEditTrack(clip.trackId)) return;
    e.stopPropagation();
    resizeClipRef.current = clip;
    resizeDirection.current = dir;
    resizeStartMouseX.current = e.clientX;
    resizeStartStartTime.current = clip.startTime;
    resizeStartDuration.current = clip.duration;

    document.addEventListener('mousemove', handleResizeMouseMove);
    document.addEventListener('mouseup', handleResizeMouseUp);
  };

  const handleResizeMouseMove = (e: MouseEvent) => {
    if (!resizeClipRef.current) return;
    const deltaX = e.clientX - resizeStartMouseX.current;
    const deltaTime = deltaX / zoomLevel;

    onUpdateClips(clips.map(c => {
      if (c.id === resizeClipRef.current?.id) {
        if (resizeDirection.current === 'right') {
          const newDuration = Math.max(0.5, resizeStartDuration.current + deltaTime);
          return { ...c, duration: parseFloat(newDuration.toFixed(2)) };
        } else {
          // resizing left edge
          const newStartTime = Math.max(0, resizeStartStartTime.current + deltaTime);
          const timeDiff = resizeStartStartTime.current - newStartTime;
          const newDuration = Math.max(0.5, resizeStartDuration.current + timeDiff);
          if (newStartTime + newDuration <= maxTimelineDuration) {
            return {
              ...c,
              startTime: parseFloat(newStartTime.toFixed(2)),
              duration: parseFloat(newDuration.toFixed(2))
            };
          }
        }
      }
      return c;
    }));
  };

  const handleResizeMouseUp = () => {
    if (resizeClipRef.current) {
      const updated = clips.find(c => c.id === resizeClipRef.current?.id);
      if (updated) {
        onAddActivity('TRIM_CLIP', `Trimmed clip "${updated.name}" to length ${updated.duration.toFixed(1)}s`);
      }
    }
    resizeClipRef.current = null;
    document.removeEventListener('mousemove', handleResizeMouseMove);
    document.removeEventListener('mouseup', handleResizeMouseUp);
  };

  // Split Clip
  const handleSplitClip = () => {
    if (!selectedClipId) return;
    const clip = clips.find(c => c.id === selectedClipId);
    if (!clip) return;
    if (!canEditTrack(clip.trackId)) {
      alert('You do not have permission to edit clips on this track.');
      return;
    }

    if (currentTime > clip.startTime && currentTime < clip.startTime + clip.duration) {
      const leftDuration = currentTime - clip.startTime;
      const rightDuration = clip.startTime + clip.duration - currentTime;

      const leftClip: AudioClip = {
        ...clip,
        id: `${clip.id}-split-L`,
        name: `${clip.name.split('.')[0]}_part1.${clip.name.split('.')[1] || 'wav'}`,
        duration: parseFloat(leftDuration.toFixed(2))
      };

      const rightClip: AudioClip = {
        ...clip,
        id: `${clip.id}-split-R`,
        name: `${clip.name.split('.')[0]}_part2.${clip.name.split('.')[1] || 'wav'}`,
        startTime: parseFloat(currentTime.toFixed(2)),
        duration: parseFloat(rightDuration.toFixed(2))
      };

      onUpdateClips([...clips.filter(c => c.id !== selectedClipId), leftClip, rightClip]);
      onSelectClip(leftClip.id);
      onAddActivity('SPLIT_CLIP', `Split audio clip "${clip.name}" at timeline position ${currentTime.toFixed(1)}s`);
    } else {
      alert('The playback playhead must be positioned in the middle of the selected clip to split it.');
    }
  };

  // Duplicate Clip
  const handleDuplicateClip = () => {
    if (!selectedClipId) return;
    const clip = clips.find(c => c.id === selectedClipId);
    if (!clip) return;
    if (!canEditTrack(clip.trackId)) {
      alert('You do not have permission to edit clips on this track.');
      return;
    }

    const duplicated: AudioClip = {
      ...clip,
      id: `clip-dup-${Date.now()}`,
      name: `${clip.name.split('.')[0]}_copy.${clip.name.split('.')[1] || 'wav'}`,
      startTime: parseFloat((clip.startTime + clip.duration).toFixed(2)),
      lockedBy: null
    };

    onUpdateClips([...clips, duplicated]);
    onSelectClip(duplicated.id);
    onAddActivity('DUPLICATE_CLIP', `Duplicated audio clip "${clip.name}" directly after itself`);
  };

  // Delete Clip
  const handleDeleteClip = () => {
    if (!selectedClipId) return;
    const clip = clips.find(c => c.id === selectedClipId);
    if (clip) {
      if (!canEditTrack(clip.trackId)) {
        alert('You do not have permission to edit clips on this track.');
        return;
      }
      onUpdateClips(clips.filter(c => c.id !== selectedClipId));
      onSelectClip(null);
      onAddActivity('DELETE_CLIP', `Deleted audio clip "${clip.name}" from the session`);
    }
  };

  // Lock/Unlock Clip simulation
  const handleToggleLockClip = () => {
    if (!selectedClipId) return;
    const clip = clips.find(c => c.id === selectedClipId);
    if (clip && !canEditTrack(clip.trackId)) {
      alert('You do not have permission to modify clips on this track.');
      return;
    }
    onUpdateClips(clips.map(c => {
      if (c.id === selectedClipId) {
        const nextLock = c.lockedBy ? null : currentUser;
        onAddActivity(nextLock ? 'LOCK_CLIP' : 'UNLOCK_CLIP', `${nextLock ? 'Locked' : 'Unlocked'} clip "${c.name}" for exclusive editing`);
        return { ...c, lockedBy: nextLock };
      }
      return c;
    }));
  };

  // Dynamic timeline tick calculation & ruler formatting based on zoomLevel and maxTimelineDuration
  const candidateIntervals = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
  const tickInterval = candidateIntervals.find(inv => inv * zoomLevel >= 48) || (
    Math.ceil(48 / Math.max(0.5, zoomLevel) / 60) * 60
  );

  const timelineTicks: number[] = [];
  for (let i = 0; i <= maxTimelineDuration; i += tickInterval) {
    timelineTicks.push(i);
  }

  const formatRulerTick = (sec: number) => {
    if (sec >= 60) {
      const mins = Math.floor(sec / 60);
      const rem = sec % 60;
      return `${mins}:${rem.toString().padStart(2, '0')}`;
    }
    return `${sec}s`;
  };

  const handleFitToView = () => {
    if (timelineRef.current) {
      const availableWidth = timelineRef.current.clientWidth - 180 - 32;
      if (availableWidth > 0 && maxTimelineDuration > 0) {
        const fitZoom = Math.max(1, Math.min(40, parseFloat((availableWidth / maxTimelineDuration).toFixed(2))));
        setZoomLevel(fitZoom);
      }
    }
  };

  // Wheel zoom with Alt / Ctrl / Meta key for pro DAW ergonomics
  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 1 : -1;
        setZoomLevel(prev => {
          const step = prev >= 12 ? 2 : prev >= 4 ? 1 : 0.5;
          return Math.max(1, Math.min(40, parseFloat((prev + delta * step).toFixed(1))));
        });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const selectedClip = clips.find(c => c.id === selectedClipId);

  return (
    <div className="flex flex-col flex-1 bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden h-full" id="daw-timeline-container">
      {/* DAW Timeline Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Jump to Beginning */}
          <button
            onClick={() => seekTo(0)}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer border border-zinc-800/80"
            title="Jump to Start of Project (|<<)"
            id="timeline-btn-jump-start"
          >
            <SkipBack size={15} />
          </button>

          {/* Rewind 5 seconds */}
          <button
            onClick={() => seekTo(Math.max(0, currentTime - 5))}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer border border-zinc-800/80"
            title="Rewind 5 Seconds (<<)"
            id="timeline-btn-rewind"
          >
            <Rewind size={15} />
          </button>

          {/* Play / Pause Toggle */}
          <button
            onClick={() => {
              initAudioCtxOnGesture();
              if (!isPlaying) {
                // If user is at or near the end of all audio components, rewind to start
                if (currentTime >= totalProjectDuration - 0.2) {
                  seekTo(0);
                }
                setIsPlaying(true);
              } else {
                setIsPlaying(false);
              }
              if (isRecording) handleToggleRecord();
            }}
            className={`px-3 py-1.5 rounded-lg text-white font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              isPlaying && !isRecording 
                ? 'bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/30 ring-1 ring-blue-400/50' 
                : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700'
            }`}
            title={isPlaying ? 'Pause Playback (Space)' : 'Start Playback through full track (Space)'}
            id="timeline-btn-play"
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
            <span className="text-xs font-bold">{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          {/* Stop and Reset to 0 */}
          <button
            onClick={() => {
              setIsPlaying(false);
              stopAllAudioClips();
              seekTo(0);
              if (isRecording) {
                if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
                setIsRecording(false);
                setRecordTimer(0);
              }
            }}
            className="p-1.5 bg-zinc-800 text-zinc-300 hover:text-white rounded-lg hover:bg-zinc-700 transition cursor-pointer border border-zinc-750"
            title="Stop & Reset Playhead to 0s"
            id="timeline-btn-stop"
          >
            <Square size={14} />
          </button>

          {/* Fast-Forward 5 seconds */}
          <button
            onClick={() => seekTo(Math.min(maxTimelineDuration, currentTime + 5))}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer border border-zinc-800/80"
            title="Forward 5 Seconds (>>)"
            id="timeline-btn-forward"
          >
            <FastForward size={15} />
          </button>

          {/* Jump to End of all audio components */}
          <button
            onClick={() => seekTo(totalProjectDuration)}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer border border-zinc-800/80"
            title="Jump to End of Audio Components (>>|)"
            id="timeline-btn-jump-end"
          >
            <SkipForward size={15} />
          </button>

          <div className="h-6 w-px bg-zinc-850 mx-1"></div>

          {/* Record Section */}
          <button
            onClick={() => {
              initAudioCtxOnGesture();
              handleToggleRecord();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              isRecording
                ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                : 'bg-zinc-800 hover:bg-zinc-700 text-red-500'
            }`}
            title="Record Microphone / Input"
            id="timeline-btn-record"
          >
            <Mic size={14} />
            <span>{isRecording ? `REC (${recordTimer}s)` : 'Record'}</span>
          </button>

          <button
            onClick={() => {
              setImportDestination('new');
              setImportStartTime(Math.round(currentTime * 100) / 100);
              setShowImportModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
            title="Import Audio Track File"
            id="timeline-btn-import"
          >
            <Upload size={14} />
            <span>Import Track</span>
          </button>

          <div className="h-6 w-px bg-zinc-850 mx-1"></div>

          {/* History Undo / Redo Controls */}
          {onUndo && onRedo && (
            <div className="flex items-center gap-1">
              <button
                disabled={!canUndo}
                onClick={onUndo}
                className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition ${
                  canUndo
                    ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 cursor-pointer'
                    : 'bg-zinc-900/50 text-zinc-600 cursor-not-allowed'
                }`}
                title={`Undo ${undoActionName ? `"${undoActionName}"` : ''} (Ctrl+Z)`}
                id="btn-timeline-undo"
              >
                <RotateCcw size={14} />
                <span className="hidden xl:inline">Undo</span>
              </button>
              <button
                disabled={!canRedo}
                onClick={onRedo}
                className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition ${
                  canRedo
                    ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 cursor-pointer'
                    : 'bg-zinc-900/50 text-zinc-600 cursor-not-allowed'
                }`}
                title={`Redo ${redoActionName ? `"${redoActionName}"` : ''} (Ctrl+Y)`}
                id="btn-timeline-redo"
              >
                <RotateCw size={14} />
                <span className="hidden xl:inline">Redo</span>
              </button>
            </div>
          )}

          <div className="h-6 w-px bg-zinc-850 mx-1"></div>

          {/* Edit Actions */}
          <button
            disabled={!selectedClipId}
            onClick={handleSplitClip}
            className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition ${
              selectedClipId
                ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                : 'bg-zinc-900/50 text-zinc-600 cursor-not-allowed'
            }`}
            title="Split selected clip at current playhead"
          >
            <Scissors size={14} />
            <span className="hidden sm:inline">Split</span>
          </button>

          <button
            disabled={!selectedClipId}
            onClick={handleDuplicateClip}
            className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition ${
              selectedClipId
                ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                : 'bg-zinc-900/50 text-zinc-600 cursor-not-allowed'
            }`}
            title="Duplicate selected clip"
          >
            <Copy size={14} />
            <span className="hidden sm:inline">Duplicate</span>
          </button>

          <button
            disabled={!selectedClipId}
            onClick={handleDeleteClip}
            className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition ${
              selectedClipId
                ? 'bg-red-950/40 text-red-400 hover:bg-red-900/30'
                : 'bg-zinc-900/50 text-zinc-600 cursor-not-allowed'
            }`}
            title="Delete selected clip"
          >
            <Trash size={14} />
            <span className="hidden sm:inline">Delete</span>
          </button>

          <div className="h-6 w-px bg-zinc-850 mx-1"></div>

          {/* Lock Clip Button */}
          <button
            disabled={!selectedClipId}
            onClick={handleToggleLockClip}
            className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition ${
              selectedClipId
                ? selectedClip?.lockedBy
                  ? 'bg-amber-900/40 text-amber-300 hover:bg-amber-800/30'
                  : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                : 'bg-zinc-900/50 text-zinc-600 cursor-not-allowed'
            }`}
            title={selectedClip?.lockedBy ? 'Unlock clip for everyone' : 'Lock clip for collaborative safety'}
          >
            <Lock size={14} />
            <span className="hidden sm:inline">{selectedClip?.lockedBy ? 'Unlock' : 'Lock'}</span>
          </button>

          <div className="h-6 w-px bg-zinc-850 mx-1"></div>

          {/* Interactive BPM & Tempo Stepper */}
          <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">BPM</span>
            <button
              onClick={() => handleUpdateTempo(currentTempo - 1)}
              className="w-5 h-5 flex items-center justify-center text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 rounded hover:bg-zinc-800 transition cursor-pointer"
              title="Decrease Tempo by 1 BPM"
            >
              -
            </button>
            <input
              type="number"
              min={40}
              max={260}
              value={currentTempo}
              onChange={(e) => handleUpdateTempo(parseInt(e.target.value) || 120)}
              className="w-12 text-center text-xs font-bold text-blue-400 bg-zinc-900 rounded px-1 py-0.5 border border-zinc-800 font-mono focus:outline-none focus:border-blue-500"
              title="Project Tempo (BPM)"
            />
            <button
              onClick={() => handleUpdateTempo(currentTempo + 1)}
              className="w-5 h-5 flex items-center justify-center text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 rounded hover:bg-zinc-800 transition cursor-pointer"
              title="Increase Tempo by 1 BPM"
            >
              +
            </button>
            <button
              onClick={handleTapTempo}
              className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-zinc-900 hover:bg-blue-600 hover:text-white text-zinc-400 border border-zinc-800 rounded transition active:scale-95 cursor-pointer"
              title="Tap repeatedly in rhythm to calculate BPM"
            >
              TAP
            </button>
          </div>

          {/* Metronome Click Toggle */}
          <button
            onClick={() => {
              initAudioCtxOnGesture();
              setIsMetronomeActive(!isMetronomeActive);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border cursor-pointer ${
              isMetronomeActive
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
            title={isMetronomeActive ? "Metronome Click Enabled" : "Metronome Click Disabled"}
            id="btn-timeline-metronome"
          >
            <Timer size={13} className={isMetronomeActive ? "text-amber-400 animate-spin-slow" : "text-zinc-500"} />
            <span className="text-[10px] font-mono font-bold">CLICK</span>
            {isMetronomeActive && isPlaying && (
              <span className={`w-2 h-2 rounded-full transition-all duration-75 ${
                activeBeat === 1 ? 'bg-amber-400 scale-125 ring-2 ring-amber-300' : activeBeat > 1 ? 'bg-zinc-300 scale-100' : 'bg-zinc-700'
              }`}></span>
            )}
          </button>

          <div className="h-6 w-px bg-zinc-850 mx-1"></div>

          {/* Producer Looping Controls */}
          <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => {
                const nextLoop = !isLooping;
                setIsLooping(nextLoop);
                if (nextLoop && loopEnd <= loopStart) {
                  setLoopEnd(Math.max(16, totalProjectDuration));
                }
              }}
              className={`p-1 rounded transition flex items-center gap-1 cursor-pointer ${
                isLooping 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white font-bold px-2 py-1 shadow-md' 
                  : 'text-zinc-500 hover:text-zinc-300 px-2 py-1'
              }`}
              title={isLooping ? "Looping Active (Loops between Start and End)" : "Looping Off (Plays through all audio components till end of track)"}
              id="btn-toggle-daw-loop"
            >
              <Repeat size={13} className={isLooping ? "animate-spin-once" : ""} />
              <span className="text-[10px] uppercase tracking-wider font-bold">Loop</span>
            </button>
            <div className="flex items-center gap-1 px-1 text-[10px] text-zinc-450 font-mono">
              <input
                type="number"
                min={0}
                max={loopEnd - 0.5}
                step={0.5}
                value={loopStart}
                onChange={(e) => setLoopStart(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-10 bg-zinc-900 border border-zinc-800 rounded px-1 py-0.5 text-center text-blue-400 font-bold focus:outline-none focus:border-blue-500"
                title="Loop Start Position"
              />
              <span className="text-[9px] text-zinc-600">to</span>
              <input
                type="number"
                min={loopStart + 0.5}
                max={maxTimelineDuration}
                step={0.5}
                value={loopEnd}
                onChange={(e) => setLoopEnd(Math.min(maxTimelineDuration, Math.max(loopStart + 0.5, parseFloat(e.target.value) || 0)))}
                className="w-10 bg-zinc-900 border border-zinc-800 rounded px-1 py-0.5 text-center text-blue-400 font-bold focus:outline-none focus:border-blue-500"
                title="Loop End Position"
              />
              <span className="text-[9px] text-zinc-600">sec</span>
            </div>
          </div>
        </div>

        {/* Playhead and Zoom Info */}
        <div className="flex items-center gap-4">
          {/* Time Counter with current position and total track length */}
          <div 
            className="flex items-center gap-1.5 font-mono text-xs bg-zinc-950 px-3 py-1 rounded-md border border-zinc-800 shadow-inner"
            title={`Playhead: ${currentTime.toFixed(2)}s / Total Track: ${totalProjectDuration.toFixed(1)}s`}
          >
            <span className="text-[10px] text-zinc-500 font-semibold uppercase">Time:</span>
            <span className="text-blue-400 font-bold text-sm">
              {Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(2).padStart(5, '0')}
            </span>
            <span className="text-zinc-600 text-[10px]">
              / {Math.floor(totalProjectDuration / 60)}:{(totalProjectDuration % 60).toFixed(1).padStart(4, '0')}
            </span>
          </div>

          {/* Project Length Controller */}
          <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-md border border-zinc-800">
            <span className="text-zinc-500 text-[10px] uppercase font-semibold">Max:</span>
            <input
              type="number"
              min={10}
              max={3600}
              step={10}
              value={maxTimelineDuration}
              onChange={(e) => {
                const val = Math.max(10, Math.min(3600, parseInt(e.target.value) || 60));
                setMaxTimelineDuration(val);
                if (loopEnd > val) setLoopEnd(val);
                if (loopStart >= val) setLoopStart(0);
              }}
              className="w-12 bg-zinc-900 border border-zinc-800 rounded px-1 py-0.5 text-center text-blue-400 font-bold focus:outline-none focus:border-blue-550 text-[11px]"
              title="Set maximum timeline duration (seconds)"
            />
            <span className="text-[9px] text-zinc-600">sec</span>
          </div>

          {/* Horizontal Zoom Slider & Scaling Controls */}
          <div className="flex items-center gap-2 bg-zinc-950 px-2.5 py-1 rounded-md border border-zinc-800">
            <button
              onClick={() => setZoomLevel(prev => Math.max(1, parseFloat((prev - (prev > 10 ? 2 : prev > 3 ? 1 : 0.5)).toFixed(1))))}
              className="text-zinc-400 hover:text-white p-0.5 rounded transition cursor-pointer"
              title="Zoom Out (Alt + Scroll Down)"
            >
              <ZoomOut size={13} />
            </button>

            <div className="flex items-center gap-1.5" title={`Horizontal Zoom: ${zoomLevel.toFixed(1)}px/s (${Math.round((zoomLevel / 12) * 100)}%)`}>
              <input
                type="range"
                min="1"
                max="40"
                step="0.5"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                className="w-16 sm:w-24 md:w-28 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-ew-resize accent-blue-500 hover:accent-blue-400 transition"
                aria-label="Timeline horizontal zoom scale"
              />
              <button
                type="button"
                onClick={() => setZoomLevel(12)}
                className="text-[10px] text-zinc-400 hover:text-blue-400 font-mono w-9 text-right select-none transition cursor-pointer"
                title="Reset zoom to 100% (12px/s)"
              >
                {Math.round((zoomLevel / 12) * 100)}%
              </button>
            </div>

            <button
              onClick={() => setZoomLevel(prev => Math.min(40, parseFloat((prev + (prev >= 10 ? 2 : prev >= 3 ? 1 : 0.5)).toFixed(1))))}
              className="text-zinc-400 hover:text-white p-0.5 rounded transition cursor-pointer"
              title="Zoom In (Alt + Scroll Up)"
            >
              <ZoomIn size={13} />
            </button>

            <button
              type="button"
              onClick={handleFitToView}
              className="px-1.5 py-0.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-[10px] font-semibold rounded border border-zinc-800 hover:border-zinc-700 transition cursor-pointer ml-0.5"
              title="Scale zoom so entire project duration fits in window"
            >
              Fit
            </button>
          </div>

          {/* Global Track Automation Envelopes Toggle */}
          <button
            onClick={handleToggleAllAutomation}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold transition cursor-pointer ${
              isAnyAutomationExpanded
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
            }`}
            title="Toggle Track Volume Automation Lanes across project"
            id="btn-toggle-all-automation"
          >
            <Sliders size={13} className={isAnyAutomationExpanded ? "text-cyan-400" : "text-zinc-500"} />
            <span className="text-[11px]">Automation</span>
            <span className={`text-[9px] px-1 rounded font-mono ${isAnyAutomationExpanded ? 'bg-cyan-950 text-cyan-400' : 'bg-zinc-900 text-zinc-500'}`}>
              {tracks.filter(t => expandedAutomationTrackIds[t.id]).length}/{tracks.length}
            </span>
          </button>
        </div>
      </div>

      {/* Timeline Sandbox Scroll Container */}
      <div
        ref={timelineRef}
        className="flex-1 overflow-x-auto overflow-y-auto select-none relative"
        style={{ minHeight: '300px' }}
      >
        {/* Timeline Grid Space */}
        <div
          className="flex flex-col relative min-w-full"
          style={{ width: `${180 + (maxTimelineDuration * zoomLevel)}px` }}
        >
          {/* Ruler Header Row */}
          <div
            onMouseDown={handleRulerMouseDown}
            className="h-8 bg-zinc-900 border-b border-zinc-800 flex relative cursor-ew-resize sticky top-0 z-20"
          >
            {/* Corner Cell Label Column Placeholder */}
            <div className="w-[180px] bg-zinc-900 border-r border-zinc-800 flex items-center px-4 sticky left-0 z-30 font-semibold text-xs text-zinc-500">
              TRACK NAME
            </div>

            {/* Time Ticks */}
            <div className="flex-1 relative h-full">
              {/* Visual Loop Range Overlay on Ruler */}
              {isLooping && (
                <div
                  className="absolute top-0 bottom-0 bg-blue-500/20 border-x-2 border-blue-400 h-1.5 mt-auto rounded-t-md pointer-events-none"
                  style={{
                    left: `${loopStart * zoomLevel}px`,
                    width: `${(loopEnd - loopStart) * zoomLevel}px`
                  }}
                  title={`Looping range: ${loopStart}s - ${loopEnd}s`}
                />
              )}

              {timelineTicks.map(tick => (
                <div
                  key={tick}
                  className="absolute border-l border-zinc-800 h-3 bottom-0 text-[10px] text-zinc-500 font-mono"
                  style={{ left: `${tick * zoomLevel}px` }}
                >
                  <span className="pl-1 relative -top-4 select-none">{formatRulerTick(tick)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tracks Content Rows */}
          <div className="flex flex-col divide-y divide-zinc-900 bg-zinc-950/80">
            {tracks.map(track => {
              const trackClips = clips.filter(c => c.trackId === track.id);
              const isSelected = selectedTrackId === track.id;

              return (
                <React.Fragment key={track.id}>
                  <div
                    onClick={() => onSelectTrack(track.id)}
                    className={`flex h-16 group transition relative ${
                      isSelected ? 'bg-zinc-900/30' : 'hover:bg-zinc-900/10'
                    }`}
                  >
                    {/* Track Info Card Sidebar (Sticky left) */}
                    <div
                      className={`w-[180px] border-r border-zinc-800 flex flex-col justify-between p-2.5 sticky left-0 z-10 transition ${
                        isSelected ? 'bg-zinc-900/80 border-l-2' : 'bg-zinc-950'
                      }`}
                      style={{ borderLeftColor: track.color }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate pr-1">
                          <span className="text-xs font-medium text-zinc-200 truncate" title={track.name}>
                            {track.name}
                          </span>
                          {!canEditTrack(track.id) && (
                            <Lock size={11} className="text-amber-400 shrink-0" title="Locked - No edit permission for this track" />
                          )}
                        </div>
                        {canEditTrack(track.id) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setImportDestination('existing');
                              setImportTargetTrackId(track.id);
                              setImportColor(track.color);
                              setImportStartTime(Math.round(currentTime * 100) / 100);
                              setShowImportModal(true);
                            }}
                            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-blue-400 transition cursor-pointer flex items-center justify-center shrink-0"
                            title={`Import audio clip into track "${track.name}"`}
                            id={`btn-import-into-track-${track.id}`}
                          >
                            <Upload size={11} />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          {track.isMuted && (
                            <span className="text-[9px] bg-red-950 text-red-400 border border-red-900 px-1 rounded">MUTE</span>
                          )}
                          {track.isSoloed && (
                            <span className="text-[9px] bg-amber-950 text-amber-400 border border-amber-900 px-1 rounded">SOLO</span>
                          )}
                          <span className="text-[10px] text-zinc-500 font-mono">Vol: {track.volume}</span>
                        </div>

                        {/* Automation Lane Toggle Button [A] */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAutomationLane(track.id);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center gap-0.5 transition cursor-pointer border ${
                            expandedAutomationTrackIds[track.id]
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-xs'
                              : (track.automation && track.automation.enabled && track.automation.mode !== 'off')
                                ? 'bg-zinc-800 text-emerald-400 border-emerald-500/30 hover:border-emerald-500/60'
                                : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700'
                          }`}
                          title="Toggle volume envelope automation lane"
                          id={`btn-toggle-auto-${track.id}`}
                        >
                          <Sliders size={9} />
                          <span>A</span>
                        </button>
                      </div>
                    </div>

                  {/* Audio Clip Track Lane - click or drag empty space to move playback bar */}
                  <div 
                    className="flex-1 relative h-full overflow-hidden cursor-crosshair timeline-lane-bg"
                    onMouseDown={(e) => {
                      if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('timeline-lane-bg') || (e.target as HTMLElement).classList.contains('pointer-events-none')) {
                        handleRulerMouseDown(e);
                      }
                    }}
                  >
                    {/* Background Beat Lines */}
                    {timelineTicks.map(tick => (
                      <div
                        key={`line-${tick}`}
                        className="absolute h-full border-l border-zinc-900 pointer-events-none"
                        style={{ left: `${tick * zoomLevel}px` }}
                      ></div>
                    ))}

                    {/* Timeline Comments visual indicators */}
                    {comments
                      .filter(com => com.timestamp <= maxTimelineDuration)
                      .map(com => (
                        <div
                          key={`com-tick-${com.id}`}
                          className="absolute bottom-1 w-2.5 h-2.5 bg-amber-500 border border-white rounded-full cursor-pointer z-10 group/comment flex items-center justify-center shadow-lg"
                          style={{ left: `${com.timestamp * zoomLevel}px` }}
                          title={`${com.author}: "${com.text}" at ${com.timestamp}s`}
                        >
                          <div className="hidden group-hover/comment:block absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-[10px] p-2 rounded shadow-2xl border border-slate-700 whitespace-nowrap z-50">
                            <strong>{com.author}</strong>: {com.text}
                          </div>
                        </div>
                      ))}

                    {/* Clip Elements */}
                    {trackClips.map(clip => {
                      const isClipSelected = selectedClipId === clip.id;
                      const isLocked = clip.lockedBy !== null;
                      const isLockedByOthers = isLocked && clip.lockedBy !== currentUser;
                      const trackEditable = canEditTrack(clip.trackId);
                      const isLockedToUser = isLockedByOthers || !trackEditable;

                      return (
                        <div
                          key={clip.id}
                          onMouseDown={(e) => handleClipMouseDown(e, clip)}
                          className={`absolute top-2 h-12 rounded-md flex items-center justify-between border select-none overflow-hidden transition-shadow ${
                            isClipSelected
                              ? 'ring-2 ring-emerald-500 border-white shadow-lg z-10'
                              : 'border-slate-700/50 shadow-md hover:border-slate-600'
                          } ${
                            isLockedToUser ? 'opacity-65 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
                          }`}
                          style={{
                            left: `${clip.startTime * zoomLevel}px`,
                            width: `${clip.duration * zoomLevel}px`,
                            backgroundColor: `${clip.color}20`,
                            borderColor: clip.color
                          }}
                        >
                          {/* Resize Left Handle */}
                          {!isLockedToUser && (
                            <div
                              onMouseDown={(e) => handleResizeMouseDown(e, clip, 'left')}
                              className="absolute left-0 top-0 bottom-0 w-2 bg-slate-400/20 hover:bg-slate-400/60 cursor-ew-resize z-20 flex items-center justify-center text-[8px] font-mono text-slate-300"
                            >
                              :
                            </div>
                          )}

                          {/* Fade In Handle */}
                          {!isLockedToUser && (
                            <div
                              onMouseDown={(e) => handleFadeMouseDown(e, clip, 'in')}
                              title={`Drag Fade In (${(clip.fadeIn || 0).toFixed(2)}s)`}
                              className="absolute top-0 w-3 h-3 bg-white/70 hover:bg-white cursor-ew-resize z-30 rounded-br shadow flex items-center justify-center transition border border-black/40"
                              style={{ left: `${Math.max(0, (clip.fadeIn || 0) * zoomLevel - 4)}px` }}
                            >
                              <div className="w-1 h-1 bg-black rounded-full pointer-events-none"></div>
                            </div>
                          )}

                          {/* Fade Out Handle */}
                          {!isLockedToUser && (
                            <div
                              onMouseDown={(e) => handleFadeMouseDown(e, clip, 'out')}
                              title={`Drag Fade Out (${(clip.fadeOut || 0).toFixed(2)}s)`}
                              className="absolute top-0 w-3 h-3 bg-white/70 hover:bg-white cursor-ew-resize z-30 rounded-bl shadow flex items-center justify-center transition border border-black/40"
                              style={{ right: `${Math.max(0, (clip.fadeOut || 0) * zoomLevel - 4)}px` }}
                            >
                              <div className="w-1 h-1 bg-black rounded-full pointer-events-none"></div>
                            </div>
                          )}

                          {/* Fade In & Out visual overlay curves */}
                          <svg className="absolute inset-0 w-full h-full pointer-events-none z-15 overflow-hidden">
                            {(clip.fadeIn || 0) > 0 && (
                              <polygon
                                points={`0,0 ${(clip.fadeIn || 0) * zoomLevel},0 0,48`}
                                fill="rgba(0, 0, 0, 0.45)"
                              />
                            )}
                            {(clip.fadeIn || 0) > 0 && (
                              <line
                                x1="0"
                                y1="48"
                                x2={(clip.fadeIn || 0) * zoomLevel}
                                y2="0"
                                stroke="rgba(255, 255, 255, 0.85)"
                                strokeWidth="1.5"
                                strokeDasharray="2,2"
                              />
                            )}
                            {(clip.fadeOut || 0) > 0 && (
                              <polygon
                                points={`${clip.duration * zoomLevel - (clip.fadeOut || 0) * zoomLevel},0 ${clip.duration * zoomLevel},0 ${clip.duration * zoomLevel},48`}
                                fill="rgba(0, 0, 0, 0.45)"
                              />
                            )}
                            {(clip.fadeOut || 0) > 0 && (
                              <line
                                x1={clip.duration * zoomLevel - (clip.fadeOut || 0) * zoomLevel}
                                y1="0"
                                x2={clip.duration * zoomLevel}
                                y2="48"
                                stroke="rgba(255, 255, 255, 0.85)"
                                strokeWidth="1.5"
                                strokeDasharray="2,2"
                              />
                            )}
                          </svg>

                          {/* Inner wave simulation */}
                          <div className="flex-1 px-3 flex flex-col justify-center h-full pointer-events-none relative overflow-hidden truncate">
                            <span className="text-[10px] font-medium text-slate-100 truncate flex items-center gap-1 select-none">
                              {(!trackEditable || isLocked) && <Lock size={10} className="text-amber-400 shrink-0" />}
                              {clip.name}
                            </span>
                            {/* Wave bar shapes */}
                            <div className="flex items-end gap-[1.5px] h-4 mt-0.5 opacity-40">
                              {Array.from({ length: Math.ceil(clip.duration * 1.5) }).map((_, waveIdx) => {
                                const height = Math.abs(Math.sin((waveIdx + parseInt(clip.id.substring(3) || '0')) * 0.5)) * 100;
                                return (
                                  <div
                                    key={waveIdx}
                                    className="w-[2px] rounded-full"
                                    style={{
                                      height: `${Math.max(20, height)}%`,
                                      backgroundColor: clip.color
                                    }}
                                  ></div>
                                );
                              })}
                            </div>
                            {isLocked && (
                              <div className="absolute right-2 top-1 text-[8px] font-semibold text-amber-400 uppercase bg-slate-950/80 px-1 py-0.5 rounded border border-amber-500/20">
                                Lock: {clip.lockedBy}
                              </div>
                            )}
                            {!trackEditable && !isLocked && (
                              <div className="absolute right-2 top-1 text-[8px] font-semibold text-amber-400 uppercase bg-slate-950/80 px-1 py-0.5 rounded border border-amber-500/20">
                                No Permission
                              </div>
                            )}
                          </div>

                          {/* Resize Right Handle */}
                          {!isLockedToUser && (
                            <div
                              onMouseDown={(e) => handleResizeMouseDown(e, clip, 'right')}
                              className="absolute right-0 top-0 bottom-0 w-2 bg-slate-400/20 hover:bg-slate-400/60 cursor-ew-resize z-20 flex items-center justify-center text-[8px] font-mono text-slate-300"
                            >
                              :
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Collapsible Track Volume Automation Lane */}
                {expandedAutomationTrackIds[track.id] && (
                  <AutomationLane
                    track={track}
                    zoomLevel={zoomLevel}
                    maxTimelineDuration={maxTimelineDuration}
                    currentTime={currentTime}
                    timelineTicks={timelineTicks}
                    isPlaying={isPlaying}
                    onUpdateTrack={handleTrackUpdate}
                    onClose={() => toggleAutomationLane(track.id)}
                  />
                )}
              </React.Fragment>
            );
          })}

            {/* Empty Add Track CTA button inside the list */}
            <div className="h-16 flex items-center px-4 bg-slate-950/40">
              {canAddTracks ? (
                <button
                  onClick={onAddTrack}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 hover:border-slate-700 transition cursor-pointer"
                  id="btn-add-track-lane"
                >
                  <Plus size={14} />
                  <span>Add Track</span>
                </button>
              ) : (
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/50 border border-zinc-800/60 text-xs font-semibold text-zinc-500 rounded-lg cursor-not-allowed select-none"
                  title="Your role does not have permission to add new tracks to this project."
                >
                  <Lock size={12} className="text-zinc-600" />
                  <span>Add Track (Restricted)</span>
                </div>
              )}
            </div>
          </div>

          {/* Draggable Red Playhead Line with prominent grab handle and position badge */}
          <div
            className="absolute top-0 bottom-0 w-[24px] -ml-[12px] group/playhead z-40 cursor-ew-resize select-none"
            style={{
              left: `${180 + (currentTime * zoomLevel)}px`,
            }}
            onMouseDown={handleRulerMouseDown}
            title={`Playback position: ${currentTime.toFixed(2)}s (Click or drag to move playback bar)`}
            id="daw-playhead-handle"
          >
            {/* Playhead Head Marker & Time Badge on Ruler */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
              <div className="bg-red-500 group-hover/playhead:bg-red-400 text-[9px] font-mono font-bold text-white px-1.5 py-0.5 rounded shadow-lg border border-red-300/50 flex items-center justify-center whitespace-nowrap">
                {currentTime.toFixed(1)}s
              </div>
              <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-red-500 -mt-[1px]"></div>
            </div>

            {/* Glowing Red Vertical Playhead Laser Line */}
            <div 
              className="absolute top-6 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-red-500 pointer-events-none group-hover/playhead:w-[3px] transition-all" 
              style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.95)' }}
            />
          </div>
        </div>
      </div>

      {/* Selected Clip Bottom Settings Row */}
      {selectedClip && (
        <div className="px-4 py-2.5 bg-slate-900/50 border-t border-slate-850 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">Selected Clip:</span>
            <span className="bg-slate-950 text-slate-300 font-mono px-2 py-0.5 rounded border border-slate-800">{selectedClip.name}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
            <div>Start: <span className="text-emerald-400">{selectedClip.startTime.toFixed(2)}s</span></div>
            <div>End: <span className="text-emerald-400">{(selectedClip.startTime + selectedClip.duration).toFixed(2)}s</span></div>
            <div>Duration: <span className="text-emerald-400">{selectedClip.duration.toFixed(2)}s</span></div>

            <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
              <span className="text-zinc-400">Fade In:</span>
              <input
                type="number"
                min="0"
                max={parseFloat((selectedClip.duration * 0.5).toFixed(2))}
                step="0.1"
                disabled={!canEditTrack(selectedClip.trackId) || Boolean(selectedClip.lockedBy && selectedClip.lockedBy !== currentUser)}
                value={selectedClip.fadeIn || 0}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(selectedClip.duration * 0.5, parseFloat(e.target.value) || 0));
                  onUpdateClips(clips.map(c => c.id === selectedClip.id ? { ...c, fadeIn: parseFloat(val.toFixed(2)) } : c));
                }}
                className="w-12 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-blue-400 font-mono text-center focus:outline-none focus:border-blue-500"
              />
              <span className="text-zinc-600">s</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400">Fade Out:</span>
              <input
                type="number"
                min="0"
                max={parseFloat((selectedClip.duration * 0.5).toFixed(2))}
                step="0.1"
                disabled={!canEditTrack(selectedClip.trackId) || Boolean(selectedClip.lockedBy && selectedClip.lockedBy !== currentUser)}
                value={selectedClip.fadeOut || 0}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(selectedClip.duration * 0.5, parseFloat(e.target.value) || 0));
                  onUpdateClips(clips.map(c => c.id === selectedClip.id ? { ...c, fadeOut: parseFloat(val.toFixed(2)) } : c));
                }}
                className="w-12 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-blue-400 font-mono text-center focus:outline-none focus:border-blue-500"
              />
              <span className="text-zinc-600">s</span>
            </div>

            {selectedClip.lockedBy && (
              <div className="text-amber-400 flex items-center gap-1 font-sans">
                <Lock size={10} />
                <span>Locked by {selectedClip.lockedBy}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import Track Modal Overlay */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" id="import-track-modal">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload size={16} className="text-blue-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Import Track to Studio</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-zinc-400 hover:text-white text-xs p-1"
              >
                <X size={15} />
              </button>
            </div>

            {/* Body Form */}
            <form onSubmit={handleImportSubmit} className="p-5 space-y-4">
              {/* Drag and Drop Upload Box */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                  isDraggingFile
                    ? 'border-blue-500 bg-blue-500/10'
                    : importFileName
                    ? 'border-emerald-500 bg-emerald-500/5'
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/60'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".mp3,.wav,.ogg,.m4a"
                  className="hidden"
                />
                <div className={`p-2.5 rounded-full ${importFileName ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-900 text-zinc-400'}`}>
                  <Upload size={20} />
                </div>
                {importFileName ? (
                  <div className="space-y-1 text-center">
                    <p className="text-xs font-semibold text-emerald-400 truncate max-w-[300px]">{importFileName}</p>
                    <p className="text-[10px] text-zinc-500 font-mono">Audio file detected & staged successfully</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-zinc-200">Drag & drop your audio file, or <span className="text-blue-400">browse</span></p>
                    <p className="text-[10px] text-zinc-500 font-mono">Supports WAV, MP3, OGG (Max 25MB)</p>
                  </div>
                )}
              </div>

              {/* Import Destination Selection */}
              {tracks.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Import Destination</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setImportDestination('new')}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                        importDestination === 'new'
                          ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      New Track Lane
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImportDestination('existing');
                        if (tracks.length > 0 && !importTargetTrackId) {
                          setImportTargetTrackId(tracks[0].id);
                        }
                      }}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                        importDestination === 'existing'
                          ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Existing Track Lane
                    </button>
                  </div>
                </div>
              )}

              {/* Select Target Track Dropdown */}
              {importDestination === 'existing' && tracks.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Select Target Track</label>
                  <select
                    value={importTargetTrackId}
                    onChange={(e) => {
                      setImportTargetTrackId(e.target.value);
                      const t = tracks.find(track => track.id === e.target.value);
                      if (t) setImportColor(t.color);
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {tracks.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Clip Title or Track Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  {importDestination === 'existing' ? 'Audio Clip Label / Name' : 'Track Name'}
                </label>
                <input
                  type="text"
                  required
                  value={importTrackName}
                  onChange={(e) => setImportTrackName(e.target.value)}
                  placeholder={importDestination === 'existing' ? 'e.g. Vocal Adlib 1, Main Hook Loop' : 'e.g. Backing Vocals Double, Synth Harmony, Bass Line'}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Grid: Color & Duration / Start Time */}
              <div className="grid grid-cols-2 gap-4">
                {importDestination === 'new' ? (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Track Color</label>
                    <div className="flex flex-wrap gap-2 pt-1.5">
                      {['#ec4899', '#ef4444', '#3b82f6', '#10b981', '#a855f7', '#f59e0b'].map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setImportColor(col)}
                          className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${
                            importColor === col ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: col, borderColor: `${col}80` }}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Start Position (seconds)</label>
                    <input
                      type="number"
                      min="0"
                      max={maxTimelineDuration}
                      step="0.1"
                      required
                      value={importStartTime}
                      onChange={(e) => setImportStartTime(parseFloat(e.target.value) || 0)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Duration (seconds)</label>
                  <input
                    type="number"
                    min="1"
                    max={maxTimelineDuration}
                    required
                    value={importDuration}
                    onChange={(e) => setImportDuration(parseInt(e.target.value) || 16)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-xs font-semibold text-zinc-300 py-2.5 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-550 text-xs font-bold text-white py-2.5 rounded-lg shadow-lg hover:shadow-blue-500/20 transition cursor-pointer"
                >
                  Process & Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
