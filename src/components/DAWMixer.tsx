/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Track, ProjectRole } from '../types';
import { Volume2, VolumeX, Radio, Settings, Sparkles, Activity, Music, Lock, Zap, Gauge } from 'lucide-react';
import { makeDistortionCurve } from '../utils/audioEngine';

interface DAWMixerProps {
  tracks: Track[];
  onUpdateTrack: (id: string, updates: Partial<Track>) => void;
  selectedTrackId: string | null;
  onSelectTrack: (id: string | null) => void;
  isPlaying: boolean;
  onAddActivity: (type: string, message: string) => void;
  currentUserRole?: ProjectRole;
  currentUserAssignedTracks?: string[];
  currentUserEmail?: string;
}

export default function DAWMixer({
  tracks,
  onUpdateTrack,
  selectedTrackId,
  onSelectTrack,
  isPlaying,
  onAddActivity,
  currentUserRole = 'Producer',
  currentUserAssignedTracks = [],
  currentUserEmail
}: DAWMixerProps) {
  const canEditTrack = (trackId: string): boolean => {
    const track = tracks.find(t => t.id === trackId);
    if (track?.createdBy && currentUserEmail && track.createdBy.toLowerCase() === currentUserEmail.toLowerCase()) {
      return true;
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
  // Bouncing VU meters levels state
  const [vuLevels, setVuLevels] = useState<Record<string, number>>({});
  const [masterLevelL, setMasterLevelL] = useState<number>(0);
  const [masterLevelR, setMasterLevelR] = useState<number>(0);
  const [masterVolume, setMasterVolume] = useState<number>(85);

  // Dynamic multitrack bouncing audio levels on simultaneous play
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        const nextLevels: Record<string, number> = {};
        const isAnySoloed = tracks.some(t => t.isSoloed);
        let sumSquared = 0;
        let activeCount = 0;

        tracks.forEach(track => {
          const isAudible = !track.isMuted && (!isAnySoloed || track.isSoloed);
          if (!isAudible) {
            nextLevels[track.id] = 0;
          } else {
            // Realistic dynamic bounce weighted by track volume fader
            const base = track.volume / 100;
            const fluctuation = Math.random() * 0.35 - 0.15;
            const level = Math.max(0, Math.min(1, base + fluctuation));
            nextLevels[track.id] = Math.round(level * 100);
            sumSquared += level * level;
            activeCount++;
          }
        });
        setVuLevels(nextLevels);

        // Calculate stereo master bus levels summing all active tracks
        if (activeCount > 0) {
          const masterFactor = masterVolume / 100;
          const rms = Math.min(1, Math.sqrt(sumSquared / Math.max(1, activeCount)) * masterFactor * 1.25);
          const jitterL = Math.random() * 0.08 - 0.04;
          const jitterR = Math.random() * 0.08 - 0.04;
          setMasterLevelL(Math.round(Math.max(0, Math.min(1, rms + jitterL)) * 100));
          setMasterLevelR(Math.round(Math.max(0, Math.min(1, rms + jitterR)) * 100));
        } else {
          setMasterLevelL(0);
          setMasterLevelR(0);
        }
      }, 100);
    } else {
      // Return to zero when stopped
      const zeroLevels: Record<string, number> = {};
      tracks.forEach(t => { zeroLevels[t.id] = 0; });
      setVuLevels(zeroLevels);
      setMasterLevelL(0);
      setMasterLevelR(0);
    }

    return () => clearInterval(interval);
  }, [isPlaying, tracks, masterVolume]);

  // Track state modifiers
  const handleVolumeChange = (track: Track, vol: number) => {
    onUpdateTrack(track.id, { volume: vol });
  };

  const handlePanChange = (track: Track, pan: number) => {
    onUpdateTrack(track.id, { pan: pan });
  };

  const handleToggleMute = (track: Track) => {
    const nextMute = !track.isMuted;
    onUpdateTrack(track.id, { isMuted: nextMute });
    onAddActivity('CHANGE_VOLUME', `${nextMute ? 'Muted' : 'Unmuted'} track "${track.name}"`);
  };

  const handleToggleSolo = (track: Track) => {
    const nextSolo = !track.isSoloed;
    onUpdateTrack(track.id, { isSoloed: nextSolo });
    onAddActivity('CHANGE_VOLUME', `${nextSolo ? 'Soloed' : 'Unsoloed'} track "${track.name}"`);
  };

  // Live Audio Play Synth for Keyboard Click
  const playLiveNote = (noteMidi: number) => {
    if (!selectedTrack || selectedTrack.isMuted) return;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      
      const ctx = new AudioCtxClass();
      const time = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

      // Connections and spatial panning with professional DSP signal flow
      // Create EQ Nodes in series
      const eqLowNode = ctx.createBiquadFilter();
      eqLowNode.type = 'lowshelf';
      eqLowNode.frequency.setValueAtTime(150, time);
      const eqLowValue = selectedTrack.eqLow !== undefined ? selectedTrack.eqLow : 50;
      eqLowNode.gain.setValueAtTime(((eqLowValue - 50) / 50) * 12, time);

      const eqMidNode = ctx.createBiquadFilter();
      eqMidNode.type = 'peaking';
      eqMidNode.frequency.setValueAtTime(1500, time);
      eqMidNode.Q.setValueAtTime(1.0, time);
      const eqMidValue = selectedTrack.eqMid !== undefined ? selectedTrack.eqMid : 50;
      eqMidNode.gain.setValueAtTime(((eqMidValue - 50) / 50) * 12, time);

      const eqHighNode = ctx.createBiquadFilter();
      eqHighNode.type = 'highshelf';
      eqHighNode.frequency.setValueAtTime(8000, time);
      const eqHighValue = selectedTrack.eqHigh !== undefined ? selectedTrack.eqHigh : 50;
      eqHighNode.gain.setValueAtTime(((eqHighValue - 50) / 50) * 12, time);

      osc.connect(gainNode);

      let currentHead: AudioNode = gainNode;

      if (selectedTrack.distortion && selectedTrack.distortion > 0) {
        try {
          const shaper = ctx.createWaveShaper();
          shaper.curve = makeDistortionCurve(selectedTrack.distortion) as any;
          shaper.oversample = '4x';
          const toneFilter = ctx.createBiquadFilter();
          toneFilter.type = 'lowpass';
          const tone = selectedTrack.distortionTone !== undefined ? selectedTrack.distortionTone : 50;
          toneFilter.frequency.setValueAtTime(2000 + (tone / 100) * 14000, time);
          currentHead.connect(shaper);
          shaper.connect(toneFilter);
          currentHead = toneFilter;
        } catch (e) {}
      }

      if (selectedTrack.compressorEnabled) {
        try {
          const comp = ctx.createDynamicsCompressor();
          comp.threshold.setValueAtTime(selectedTrack.compressorThreshold ?? -24, time);
          comp.ratio.setValueAtTime(selectedTrack.compressorRatio ?? 4, time);
          comp.attack.setValueAtTime(selectedTrack.compressorAttack ?? 0.01, time);
          comp.release.setValueAtTime(selectedTrack.compressorRelease ?? 0.25, time);
          comp.knee.setValueAtTime(selectedTrack.compressorKnee ?? 5, time);
          const makeup = ctx.createGain();
          makeup.gain.setValueAtTime(Math.pow(10, (selectedTrack.compressorGain ?? 0) / 20), time);
          currentHead.connect(comp);
          comp.connect(makeup);
          currentHead = makeup;
        } catch (e) {}
      }

      currentHead.connect(eqLowNode);
      eqLowNode.connect(eqMidNode);
      eqMidNode.connect(eqHighNode);

      const trackOutput = ctx.createGain();
      trackOutput.gain.setValueAtTime(1.0, time);
      eqHighNode.connect(trackOutput);

      if (panner) {
        trackOutput.connect(panner);
        panner.connect(ctx.destination);
        panner.pan.setValueAtTime(selectedTrack.pan / 50, time);
      } else {
        trackOutput.connect(ctx.destination);
      }

      // Route Auxiliary FX Sends
      const delayVal = selectedTrack.delay !== undefined ? selectedTrack.delay : 10;
      if (delayVal > 1) {
        const delayNode = ctx.createDelay();
        delayNode.delayTime.setValueAtTime(0.3, time);
        const delayFeedbackNode = ctx.createGain();
        delayFeedbackNode.gain.setValueAtTime((delayVal / 100) * 0.7, time);

        trackOutput.connect(delayNode);
        delayNode.connect(delayFeedbackNode);
        delayFeedbackNode.connect(delayNode);
        delayNode.connect(panner ? panner : ctx.destination);
      }

      const reverbVal = selectedTrack.reverb !== undefined ? selectedTrack.reverb : 15;
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
        reverbFeedbackNode.connect(panner ? panner : ctx.destination);
      }

      const trackVolumeFactor = selectedTrack.volume / 100;
      const baseGain = trackVolumeFactor * 0.15; // slightly louder for live keyboard feedback

      const nameLower = selectedTrack.name.toLowerCase();
      const midiToFrequency = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

      if (nameLower.includes('drum') || nameLower.includes('kick') || nameLower.includes('snare') || selectedTrack.color === '#f43f5e') {
        if (noteMidi % 3 === 0) {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(140, time);
          osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.12);
          gainNode.gain.setValueAtTime(baseGain * 1.6, time);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
          osc.start(time);
          osc.stop(time + 0.13);
        } else if (noteMidi % 3 === 1) {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(260, time);
          osc.frequency.exponentialRampToValueAtTime(70, time + 0.1);
          gainNode.gain.setValueAtTime(baseGain * 1.2, time);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);
          osc.start(time);
          osc.stop(time + 0.11);
        } else {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(9000, time);
          gainNode.gain.setValueAtTime(baseGain * 0.45, time);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);
          osc.start(time);
          osc.stop(time + 0.04);
        }
      } else if (nameLower.includes('bass') || selectedTrack.color === '#06b6d4') {
        osc.type = 'sawtooth';
        const bassMidi = noteMidi - 24;
        osc.frequency.setValueAtTime(midiToFrequency(bassMidi), time);
        gainNode.gain.setValueAtTime(baseGain * 0.8, time);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.25);
        osc.start(time);
        osc.stop(time + 0.26);
      } else if (nameLower.includes('lead') || nameLower.includes('vocal') || selectedTrack.color === '#10b981') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(midiToFrequency(noteMidi), time);
        osc.frequency.linearRampToValueAtTime(midiToFrequency(noteMidi) * 1.008, time + 0.16);
        gainNode.gain.setValueAtTime(baseGain * 0.7, time);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
        osc.start(time);
        osc.stop(time + 0.21);
      } else if (nameLower.includes('guitar') || selectedTrack.color === '#f59e0b') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(midiToFrequency(noteMidi + 12), time);
        gainNode.gain.setValueAtTime(baseGain * 0.6, time);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);
        osc.start(time);
        osc.stop(time + 0.36);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(midiToFrequency(noteMidi), time);
        gainNode.gain.setValueAtTime(baseGain * 0.55, time);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.5);
        osc.start(time);
        osc.stop(time + 0.55);
      }
    } catch (err) {
      console.warn('Keyboard sound playback skipped:', err);
    }
  };

  // Listen to computer keyboard keys for live play
  useEffect(() => {
    if (!selectedTrack || selectedTrack.isMuted) return;

    const keyMap: Record<string, number> = {
      'a': 60, // C4
      'w': 61, // C#4
      's': 62, // D4
      'e': 63, // D#4
      'd': 64, // E4
      'f': 65, // F4
      't': 66, // F#4
      'g': 67, // G4
      'y': 68, // G#4
      'h': 69, // A4
      'u': 70, // A#4
      'j': 71, // B4
      'k': 72, // C5
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.hasAttribute('contenteditable'))) {
        return;
      }

      const key = e.key.toLowerCase();
      if (keyMap[key] !== undefined) {
        e.preventDefault();
        playLiveNote(keyMap[key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedTrackId, tracks]);

  // Simulated dynamic Gain Reduction (GR) for Compressor UI feedback
  const [gainReduction, setGainReduction] = useState<number>(0);

  useEffect(() => {
    if (!isPlaying) {
      setGainReduction(0);
      return;
    }
    const interval = setInterval(() => {
      if (selectedTrack && selectedTrack.compressorEnabled && !selectedTrack.isMuted) {
        const trackLevel = selectedTrack.volume;
        const thresh = selectedTrack.compressorThreshold ?? -24;
        const inputDb = 20 * Math.log10(Math.max(0.01, trackLevel / 100));
        if (inputDb > thresh) {
          const ratio = selectedTrack.compressorRatio ?? 4;
          const over = inputDb - thresh;
          const targetGr = over * (1 - 1 / ratio);
          const jitter = Math.random() * 1.2;
          setGainReduction(parseFloat(Math.min(18, Math.max(0.5, targetGr + jitter)).toFixed(1)));
        } else {
          setGainReduction(0);
        }
      } else {
        setGainReduction(0);
      }
    }, 120);
    return () => clearInterval(interval);
  }, [isPlaying, selectedTrackId, tracks]);

  const getDsp = (track: Track) => {
    return {
      eqHigh: track.eqHigh !== undefined ? track.eqHigh : 50,
      eqMid: track.eqMid !== undefined ? track.eqMid : 50,
      eqLow: track.eqLow !== undefined ? track.eqLow : 50,
      reverb: track.reverb !== undefined ? track.reverb : 15,
      delay: track.delay !== undefined ? track.delay : 10,
      distortion: track.distortion !== undefined ? track.distortion : 0,
      distortionTone: track.distortionTone !== undefined ? track.distortionTone : 50,
      compressorEnabled: track.compressorEnabled ?? false,
      compressorThreshold: track.compressorThreshold ?? -24,
      compressorRatio: track.compressorRatio ?? 4,
      compressorAttack: track.compressorAttack ?? 0.01,
      compressorRelease: track.compressorRelease ?? 0.25,
      compressorGain: track.compressorGain ?? 0
    };
  };

  const updateDsp = (trackId: string, param: string, value: any) => {
    onUpdateTrack(trackId, { [param]: value });
  };

  const selectedTrack = tracks.find(t => t.id === selectedTrackId);
  const selectedTrackDsp = selectedTrack ? getDsp(selectedTrack) : null;

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden flex flex-col md:flex-row h-full" id="daw-mixer-container">
      {/* Mixer Channel Strips Console */}
      <div className="flex-1 p-4 bg-zinc-950 flex flex-col justify-between min-w-0">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Radio size={16} className="text-rose-500 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-350">Mixer Console</h3>
          </div>
          <span className="text-[10px] bg-zinc-900 px-2 py-0.5 text-zinc-500 rounded font-mono border border-zinc-800">
            Post-Fader Submix
          </span>
        </div>

        {/* Channels scroll container */}
        <div className="flex gap-4 overflow-x-auto pb-2 flex-1 items-stretch">
          {tracks.map(track => {
            const isSelected = selectedTrackId === track.id;
            const level = vuLevels[track.id] || 0;

            return (
              <div
                key={track.id}
                onClick={() => onSelectTrack(track.id)}
                className={`w-32 bg-zinc-900/50 hover:bg-zinc-900/80 border rounded-lg p-2.5 flex flex-col justify-between select-none cursor-pointer transition flex-shrink-0 ${
                  isSelected ? 'border-blue-500/50 ring-1 ring-blue-500/20 bg-zinc-900/90' : 'border-zinc-800'
                }`}
              >
                {/* Track Tag info */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: track.color }}></span>
                      <span className="text-[10px] font-bold text-zinc-300 truncate" title={track.name}>
                        {track.name.split(' (')[0]}
                      </span>
                    </div>
                    {canEditTrack(track.id) ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextLocked = !track.isLocked;
                          onUpdateTrack(track.id, { isLocked: nextLocked });
                          onAddActivity(
                            nextLocked ? 'LOCK_TRACK' : 'UNLOCK_TRACK',
                            `${nextLocked ? 'Locked' : 'Unlocked'} track "${track.name}" in mixer`
                          );
                        }}
                        className={`p-1 rounded transition cursor-pointer flex items-center justify-center border ${
                          track.isLocked
                            ? 'text-amber-300 bg-amber-950/80 border-amber-600/70 hover:bg-amber-900'
                            : 'text-zinc-600 hover:text-amber-400 border-transparent hover:bg-zinc-800'
                        }`}
                        title={track.isLocked ? `Track "${track.name}" is locked. Click to unlock.` : `Lock track "${track.name}"`}
                      >
                        <Lock size={10} />
                      </button>
                    ) : (
                      <span title="Locked - No edit permission for this track">
                        <Lock size={10} className="text-zinc-500 shrink-0" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[9px] text-zinc-500 truncate">{track.name.includes('(') ? `(${track.name.split(' (')[1]}` : ''}</span>
                    {track.isLocked && (
                      <span className="text-[7px] font-bold px-1 py-0.5 rounded bg-amber-950/90 text-amber-400 border border-amber-800">
                        LOCKED
                      </span>
                    )}
                    {track.distortion !== undefined && track.distortion > 0 && (
                      <span className="text-[7px] font-bold px-1 py-0.5 rounded bg-amber-950/90 text-amber-400 border border-amber-800">
                        DRV
                      </span>
                    )}
                    {track.compressorEnabled && (
                      <span className="text-[7px] font-bold px-1 py-0.5 rounded bg-cyan-950/90 text-cyan-400 border border-cyan-800">
                        CMP
                      </span>
                    )}
                  </div>
                </div>

                {/* Pan Fader */}
                <div className="my-3 flex flex-col items-center gap-1">
                  <div className="text-[8px] text-zinc-500 font-mono flex justify-between w-full px-1">
                    <span>L</span>
                    <span className="text-zinc-400 font-bold">
                      {track.pan === 0 ? 'C' : track.pan > 0 ? `R${track.pan}` : `L${Math.abs(track.pan)}`}
                    </span>
                    <span>R</span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    disabled={!canEditTrack(track.id) || Boolean(track.isLocked)}
                    value={track.pan}
                    onChange={(e) => handlePanChange(track, parseInt(e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                    className={`w-full h-1 rounded-lg appearance-none accent-blue-500 ${!canEditTrack(track.id) || track.isLocked ? 'opacity-40 cursor-not-allowed bg-zinc-900' : 'bg-zinc-800 cursor-pointer'}`}
                  />
                </div>

                {/* Vertical Fader & VU Meter Lane */}
                <div className="flex gap-3 justify-center items-stretch h-36 my-2">
                  {/* Volume Slider (Inverted fader look) */}
                  <div className="flex flex-col items-center justify-between w-6 h-full relative">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      disabled={!canEditTrack(track.id) || Boolean(track.isLocked)}
                      value={track.volume}
                      onChange={(e) => handleVolumeChange(track, parseInt(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                      className={`accent-blue-500 ${!canEditTrack(track.id) || track.isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-ns-resize'}`}
                      style={{
                        writingMode: 'bt-lr', // for legacy browser support
                        WebkitAppearance: 'slider-vertical', // standard Webkit vertical slider
                        width: '12px',
                        height: '100%'
                      }}
                      title={track.isLocked ? `Track is locked` : `Volume fader for ${track.name}`}
                    />
                  </div>

                  {/* Visual VU Meter */}
                  <div className="w-2.5 bg-zinc-950 rounded-md overflow-hidden relative border border-zinc-900 flex flex-col justify-end">
                    <div
                      className="w-full transition-all duration-75 rounded-b-sm bg-gradient-to-t from-emerald-500 via-yellow-400 to-rose-600"
                      style={{ height: `${level}%` }}
                    ></div>
                    {/* VU peak marker tick */}
                    {level > 0 && (
                      <div
                        className="absolute left-0 right-0 h-[2px] bg-white opacity-80"
                        style={{ bottom: `${Math.max(0, level - 2)}%` }}
                      ></div>
                    )}
                  </div>
                </div>

                {/* Volume Readout */}
                <div className="text-[10px] font-mono text-center text-zinc-400 mb-2 flex items-center justify-center gap-1">
                  <span>{(track.volume === 0) ? 'MUTE' : `${(20 * Math.log10(track.volume / 100)).toFixed(1)} dB`}</span>
                  {track.automation?.enabled && track.automation.mode !== 'off' && (
                    <span
                      className={`text-[8px] px-1 py-0.2 rounded font-bold uppercase ${
                        track.automation.mode === 'write'
                          ? 'bg-rose-950 text-rose-400 border border-rose-900 animate-pulse'
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-900'
                      }`}
                      title={`Volume Automation: ${track.automation.mode.toUpperCase()}`}
                    >
                      {track.automation.mode}
                    </span>
                  )}
                </div>

                {/* Solo / Mute controls */}
                <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-zinc-800">
                  <button
                    disabled={!canEditTrack(track.id) || Boolean(track.isLocked)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleMute(track);
                    }}
                    className={`py-1 text-[9px] font-bold rounded-md transition ${
                      !canEditTrack(track.id) || track.isLocked
                        ? 'opacity-40 cursor-not-allowed bg-zinc-900 text-zinc-600'
                        : track.isMuted
                        ? 'bg-red-900 text-red-100 border border-red-700 cursor-pointer'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer'
                    }`}
                    title={track.isLocked ? "Track is locked" : "Mute Track"}
                  >
                    M
                  </button>
                  <button
                    disabled={!canEditTrack(track.id) || Boolean(track.isLocked)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSolo(track);
                    }}
                    className={`py-1 text-[9px] font-bold rounded-md transition ${
                      !canEditTrack(track.id) || track.isLocked
                        ? 'opacity-40 cursor-not-allowed bg-zinc-900 text-zinc-600'
                        : track.isSoloed
                        ? 'bg-amber-500 text-zinc-950 border border-amber-400 font-extrabold cursor-pointer'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer'
                    }`}
                    title={track.isLocked ? "Track is locked" : "Solo Track"}
                  >
                    S
                  </button>
                </div>
              </div>
            );
          })}

          {/* Master Stereo Submix Channel Strip */}
          <div className="w-36 bg-zinc-950/90 border border-emerald-500/30 rounded-lg p-2.5 flex flex-col justify-between select-none flex-shrink-0 shadow-lg shadow-black/40 ring-1 ring-emerald-500/10">
            {/* Master Header */}
            <div className="flex flex-col gap-1 border-b border-zinc-800/80 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <Activity size={12} className="text-emerald-400" />
                  MASTER BUS
                </span>
                <span className="text-[8px] bg-emerald-950/80 text-emerald-300 font-mono px-1.5 py-0.5 rounded border border-emerald-800/50">
                  {tracks.filter(t => !t.isMuted && (!tracks.some(tr => tr.isSoloed) || t.isSoloed)).length}/{tracks.length}
                </span>
              </div>
              <span className="text-[8px] text-zinc-500 font-mono truncate">All Tracks Mixed</span>
            </div>

            {/* Master Pan / Balance */}
            <div className="my-2 flex flex-col items-center gap-1">
              <div className="text-[8px] text-zinc-500 font-mono flex justify-between w-full px-1">
                <span>L</span>
                <span className="text-emerald-400 font-bold font-mono">CENTER</span>
                <span>R</span>
              </div>
              <div className="w-full h-1 bg-zinc-800 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-400/50"></div>
              </div>
            </div>

            {/* Vertical Fader & Dual Stereo L/R VU Meter */}
            <div className="flex gap-2 justify-center items-stretch h-36 my-1">
              {/* Master Volume Slider */}
              <div className="flex flex-col items-center justify-between w-6 h-full relative">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={masterVolume}
                  onChange={(e) => setMasterVolume(parseInt(e.target.value))}
                  className="w-28 h-6 -rotate-90 origin-center absolute top-14 left-[-22px] bg-transparent appearance-none cursor-pointer accent-emerald-500 z-10"
                />
                <div className="w-1.5 h-full bg-zinc-900 border border-zinc-700/60 rounded-full flex flex-col justify-end overflow-hidden">
                  <div
                    className="w-full bg-emerald-500/80 transition-all"
                    style={{ height: `${masterVolume}%` }}
                  ></div>
                </div>
              </div>

              {/* Dual Stereo VU Meters L & R */}
              <div className="flex gap-1 items-stretch">
                {/* L Channel */}
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-32 bg-zinc-950 border border-zinc-800 rounded-sm flex flex-col justify-end p-0.5 overflow-hidden">
                    <div
                      className="w-full rounded-xs transition-all duration-75"
                      style={{
                        height: `${masterLevelL}%`,
                        background: masterLevelL > 90 ? '#ef4444' : masterLevelL > 75 ? '#f59e0b' : '#10b981'
                      }}
                    ></div>
                  </div>
                  <span className="text-[7px] font-mono text-zinc-500 mt-0.5">L</span>
                </div>

                {/* R Channel */}
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-32 bg-zinc-950 border border-zinc-800 rounded-sm flex flex-col justify-end p-0.5 overflow-hidden">
                    <div
                      className="w-full rounded-xs transition-all duration-75"
                      style={{
                        height: `${masterLevelR}%`,
                        background: masterLevelR > 90 ? '#ef4444' : masterLevelR > 75 ? '#f59e0b' : '#10b981'
                      }}
                    ></div>
                  </div>
                  <span className="text-[7px] font-mono text-zinc-500 mt-0.5">R</span>
                </div>
              </div>
            </div>

            {/* Readout */}
            <div className="text-[10px] font-mono text-center text-emerald-400 font-bold mb-1">
              {masterVolume === 0 ? 'MUTE' : `${(20 * Math.log10(masterVolume / 100)).toFixed(1)} dB`}
            </div>

            {/* Master Bus Info */}
            <div className="pt-1.5 border-t border-zinc-800 text-center">
              <span className="text-[8px] font-mono uppercase tracking-wider text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                Limiter 0dBFS
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Basic & Advanced DSP Effects Rack (EQ, Distortion, Compressor, Reverb, Delay) */}
      <div className="w-full md:w-88 bg-zinc-900 border-t md:border-t-0 md:border-l border-zinc-800 p-4 flex flex-col justify-between overflow-y-auto max-h-[640px]">
        <div>
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 mb-4">
            <Sparkles size={16} className="text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Track DSP Rack</h3>
          </div>

          {selectedTrack && selectedTrackDsp ? (
            <div className="space-y-4">
              {/* Selected Title */}
              <div className="flex items-center gap-1.5 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 mb-4">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedTrack.color }}></span>
                <span className="text-xs font-semibold text-zinc-200 truncate">{selectedTrack.name}</span>
              </div>

              {/* Three-band EQ */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 flex items-center gap-1">
                  <Settings size={10} />
                  3-Band Equalizer (EQ)
                </span>

                <div className="space-y-2.5 bg-zinc-950/60 p-3 rounded-lg border border-zinc-800">
                  {/* High */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                      <span>EQ High (8kHz)</span>
                      <span className="text-blue-400 font-bold">{selectedTrackDsp.eqHigh - 50 > 0 ? `+${selectedTrackDsp.eqHigh - 50}` : selectedTrackDsp.eqHigh - 50} dB</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedTrackDsp.eqHigh}
                      onChange={(e) => updateDsp(selectedTrack.id, 'eqHigh', parseInt(e.target.value))}
                      className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  {/* Mid */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                      <span>EQ Mid (1.5kHz)</span>
                      <span className="text-blue-400 font-bold">{selectedTrackDsp.eqMid - 50 > 0 ? `+${selectedTrackDsp.eqMid - 50}` : selectedTrackDsp.eqMid - 50} dB</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedTrackDsp.eqMid}
                      onChange={(e) => updateDsp(selectedTrack.id, 'eqMid', parseInt(e.target.value))}
                      className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  {/* Low */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                      <span>EQ Low (150Hz)</span>
                      <span className="text-blue-400 font-bold">{selectedTrackDsp.eqLow - 50 > 0 ? `+${selectedTrackDsp.eqLow - 50}` : selectedTrackDsp.eqLow - 50} dB</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedTrackDsp.eqLow}
                      onChange={(e) => updateDsp(selectedTrack.id, 'eqLow', parseInt(e.target.value))}
                      className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Auxiliary Sends (Reverb, Delay) */}
              <div className="space-y-3 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 flex items-center gap-1">
                  <Activity size={10} />
                  Spatial FX Sends
                </span>

                <div className="space-y-3.5 bg-zinc-950/60 p-3 rounded-lg border border-zinc-800">
                  {/* Reverb Send */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                      <span>Reverb Send (Wet%)</span>
                      <span className="text-blue-400 font-bold">{selectedTrackDsp.reverb}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedTrackDsp.reverb}
                      onChange={(e) => updateDsp(selectedTrack.id, 'reverb', parseInt(e.target.value))}
                      className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  {/* Delay Send */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                      <span>Stereo Delay (Feedback)</span>
                      <span className="text-blue-400 font-bold">{selectedTrackDsp.delay}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedTrackDsp.delay}
                      onChange={(e) => updateDsp(selectedTrack.id, 'delay', parseInt(e.target.value))}
                      className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Tube Distortion / Overdrive Rack */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 flex items-center gap-1">
                    <Zap size={10} className={selectedTrackDsp.distortion > 0 ? "text-amber-400" : "text-zinc-600"} />
                    Tube Overdrive / Distortion
                  </span>
                  {selectedTrackDsp.distortion > 0 && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                      ACTIVE
                    </span>
                  )}
                </div>

                <div className="space-y-2.5 bg-zinc-950/60 p-3 rounded-lg border border-zinc-800">
                  {/* Drive */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                      <span>Drive (Warmth & Saturation)</span>
                      <span className="text-amber-400 font-bold">{selectedTrackDsp.distortion}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedTrackDsp.distortion}
                      onChange={(e) => updateDsp(selectedTrack.id, 'distortion', parseInt(e.target.value))}
                      className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  {/* Tone Filter */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                      <span>Tone Color</span>
                      <span className="text-zinc-300 font-mono">
                        {selectedTrackDsp.distortionTone < 40 ? 'Warm / Dark' : selectedTrackDsp.distortionTone > 70 ? 'Bright / Crisp' : 'Balanced'} ({selectedTrackDsp.distortionTone}%)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedTrackDsp.distortionTone}
                      onChange={(e) => updateDsp(selectedTrack.id, 'distortionTone', parseInt(e.target.value))}
                      className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Compressor Rack */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 flex items-center gap-1">
                    <Gauge size={10} className={selectedTrackDsp.compressorEnabled ? "text-cyan-400" : "text-zinc-600"} />
                    Dynamic Compressor
                  </span>
                  <button
                    type="button"
                    onClick={() => updateDsp(selectedTrack.id, 'compressorEnabled', !selectedTrackDsp.compressorEnabled)}
                    className={`text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer transition flex items-center gap-1 border ${
                      selectedTrackDsp.compressorEnabled
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-xs'
                        : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-300'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedTrackDsp.compressorEnabled ? 'bg-cyan-400 animate-pulse' : 'bg-zinc-600'}`}></span>
                    <span>{selectedTrackDsp.compressorEnabled ? 'ON' : 'BYPASS'}</span>
                  </button>
                </div>

                <div className={`space-y-2.5 bg-zinc-950/60 p-3 rounded-lg border transition ${
                  selectedTrackDsp.compressorEnabled ? 'border-cyan-500/30' : 'border-zinc-800 opacity-60'
                }`}>
                  {/* Gain Reduction (GR) Meter */}
                  <div className="flex items-center justify-between bg-zinc-900/80 px-2.5 py-1.5 rounded border border-zinc-800/80">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono text-zinc-400 font-bold uppercase">GR Meter</span>
                      <span className="text-[8px] font-mono text-cyan-400">
                        {selectedTrackDsp.compressorEnabled && isPlaying ? `-${gainReduction} dB` : '0.0 dB'}
                      </span>
                    </div>
                    {/* Animated GR bar */}
                    <div className="w-24 h-2 bg-zinc-950 rounded overflow-hidden flex justify-end border border-zinc-800">
                      <div
                        className="h-full bg-gradient-to-l from-cyan-400 to-rose-500 transition-all duration-75"
                        style={{
                          width: selectedTrackDsp.compressorEnabled && isPlaying ? `${Math.min(100, (gainReduction / 18) * 100)}%` : '0%'
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Threshold */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                      <span>Threshold</span>
                      <span className="text-cyan-400 font-bold">{selectedTrackDsp.compressorThreshold} dB</span>
                    </div>
                    <input
                      type="range"
                      min="-60"
                      max="0"
                      step="1"
                      disabled={!selectedTrackDsp.compressorEnabled}
                      value={selectedTrackDsp.compressorThreshold}
                      onChange={(e) => updateDsp(selectedTrack.id, 'compressorThreshold', parseInt(e.target.value))}
                      className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:opacity-30"
                    />
                  </div>

                  {/* Ratio */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                      <span>Ratio</span>
                      <span className="text-cyan-400 font-bold">{selectedTrackDsp.compressorRatio}:1</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="1"
                      disabled={!selectedTrackDsp.compressorEnabled}
                      value={selectedTrackDsp.compressorRatio}
                      onChange={(e) => updateDsp(selectedTrack.id, 'compressorRatio', parseInt(e.target.value))}
                      className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:opacity-30"
                    />
                  </div>

                  {/* Attack & Release */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[9px] text-zinc-400 font-mono">
                        <span>Attack</span>
                        <span className="text-cyan-400 font-bold">{Math.round(selectedTrackDsp.compressorAttack * 1000)}ms</span>
                      </div>
                      <input
                        type="range"
                        min="0.001"
                        max="0.1"
                        step="0.001"
                        disabled={!selectedTrackDsp.compressorEnabled}
                        value={selectedTrackDsp.compressorAttack}
                        onChange={(e) => updateDsp(selectedTrack.id, 'compressorAttack', parseFloat(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:opacity-30"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[9px] text-zinc-400 font-mono">
                        <span>Release</span>
                        <span className="text-cyan-400 font-bold">{Math.round(selectedTrackDsp.compressorRelease * 1000)}ms</span>
                      </div>
                      <input
                        type="range"
                        min="0.01"
                        max="1.0"
                        step="0.01"
                        disabled={!selectedTrackDsp.compressorEnabled}
                        value={selectedTrackDsp.compressorRelease}
                        onChange={(e) => updateDsp(selectedTrack.id, 'compressorRelease', parseFloat(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:opacity-30"
                      />
                    </div>
                  </div>

                  {/* Makeup Gain */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                      <span>Make-up Gain</span>
                      <span className="text-cyan-400 font-bold">+{selectedTrackDsp.compressorGain} dB</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="18"
                      step="0.5"
                      disabled={!selectedTrackDsp.compressorEnabled}
                      value={selectedTrackDsp.compressorGain}
                      onChange={(e) => updateDsp(selectedTrack.id, 'compressorGain', parseFloat(e.target.value))}
                      className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:opacity-30"
                    />
                  </div>
                </div>
              </div>

              {/* Virtual Playable Keyboard */}
              <div className="space-y-2 pt-3 border-t border-zinc-800" id="virtual-piano-keyboard-panel">
                <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-zinc-450">
                    <Music size={11} className="text-blue-400" />
                    Live Virtual MIDI Keyboard
                  </span>
                  <span className="text-[9px] text-zinc-500 font-mono">Home Keys [A] - [K]</span>
                </span>

                <div className="relative h-20 bg-zinc-950 rounded-lg p-1 border border-zinc-800/80 flex select-none">
                  {/* White keys */}
                  {[
                    { midi: 60, label: 'C' },
                    { midi: 62, label: 'D' },
                    { midi: 64, label: 'E' },
                    { midi: 65, label: 'F' },
                    { midi: 67, label: 'G' },
                    { midi: 69, label: 'A' },
                    { midi: 71, label: 'B' },
                    { midi: 72, label: 'C\'' }
                  ].map((wk, i) => (
                    <button
                      key={wk.midi}
                      onClick={() => playLiveNote(wk.midi)}
                      className="flex-1 bg-zinc-100 hover:bg-zinc-250 active:bg-blue-200 border-r border-zinc-400 rounded-sm flex flex-col justify-end pb-1 items-center text-zinc-800 text-[8px] font-bold font-mono transition-colors"
                      style={{ borderRightWidth: i === 7 ? '0px' : '1px' }}
                      title={`Play ${wk.label} note`}
                    >
                      {wk.label}
                    </button>
                  ))}

                  {/* Black keys overlay */}
                  {[
                    { midi: 61, leftOffset: '10.5%' }, // C#
                    { midi: 63, leftOffset: '23.0%' }, // D#
                    // skip E-F
                    { midi: 66, leftOffset: '48.0%' }, // F#
                    { midi: 68, leftOffset: '60.5%' }, // G#
                    { midi: 70, leftOffset: '73.0%' }  // A#
                  ].map(bk => (
                    <button
                      key={bk.midi}
                      onClick={() => playLiveNote(bk.midi)}
                      className="absolute top-1 h-12 w-6 bg-zinc-900 hover:bg-zinc-800 active:bg-blue-600 rounded-sm border border-zinc-950 shadow transition-all z-10"
                      style={{ left: bk.leftOffset }}
                    ></button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 px-4 text-zinc-500 bg-zinc-950/40 rounded-lg border border-zinc-800 border-dashed">
              <Settings size={28} className="mx-auto text-zinc-700 mb-2" />
              <p className="text-xs">Select any channel strip on the left to route basic DSP Effects.</p>
            </div>
          )}
        </div>

        {/* Dynamic Warning Indicator */}
        {selectedTrack && selectedTrack.isMuted && (
          <div className="text-[10px] bg-red-950/40 border border-red-900/40 text-red-400 p-2.5 rounded-lg flex items-center gap-2 mt-4">
            <VolumeX size={12} />
            <span>This track is muted. Direct DSP FX routing bypass is active.</span>
          </div>
        )}
      </div>
    </div>
  );
}
