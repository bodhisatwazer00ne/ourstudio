/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Track, AudioClip } from '../types';
import { getAutomatedValueAtTime } from './automationUtils';
import lamejs from 'lamejs';

/**
 * Generates an audio waveshaper curve for warm analog tube / transistor distortion.
 */
export function makeDistortionCurve(amount: number): Float32Array {
  const k = Math.max(0, Math.min(100, amount)) * 2.5;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

/**
 * Synthesizes a crisp metronome click (high-pitched woodblock accent on beat 1, normal click on beats 2-4).
 */
export function playMetronomeClick(
  ctx: BaseAudioContext,
  time: number,
  isAccent: boolean,
  destination?: AudioNode
): void {
  try {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = isAccent ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isAccent ? 1760 : 880, time);
    osc.frequency.exponentialRampToValueAtTime(120, time + 0.03);

    const baseGain = isAccent ? 0.65 : 0.35;
    gainNode.gain.setValueAtTime(baseGain, time);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + (isAccent ? 0.04 : 0.025));

    osc.connect(gainNode);
    gainNode.connect(destination || ctx.destination);

    osc.start(time);
    osc.stop(time + 0.045);
  } catch (err) {
    console.warn('Metronome click synthesis error:', err);
  }
}

/**
 * Synthesizes a step note for a given track, identical in both live DAW playback
 * and offline master mix rendering.
 */
export function synthesizeStepNote(
  ctx: BaseAudioContext,
  track: Track,
  time: number,
  stepNumber: number,
  destination: AudioNode
): void {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.connect(gainNode);
  gainNode.connect(destination);

  const baseGain = 0.85;
  const nameLower = track.name.toLowerCase();

  // 1. Drum / Percussion Patch
  if (
    nameLower.includes('drum') ||
    nameLower.includes('kick') ||
    nameLower.includes('snare') ||
    nameLower.includes('beat') ||
    nameLower.includes('percussion') ||
    track.color === '#f43f5e'
  ) {
    if (stepNumber % 4 === 0) {
      // Kick Drum: fast pitch swoop from 140Hz downwards + exponential decay
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.12);

      gainNode.gain.setValueAtTime(baseGain * 1.5, time);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);

      osc.start(time);
      osc.stop(time + 0.13);
    } else if (stepNumber % 4 === 2) {
      // Snare Drum: snappy mid-high tone with snap decay
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, time);
      osc.frequency.exponentialRampToValueAtTime(70, time + 0.1);

      gainNode.gain.setValueAtTime(baseGain * 1.1, time);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);

      osc.start(time);
      osc.stop(time + 0.11);
    } else if (stepNumber % 2 === 1) {
      // Hi-Hat: crisp high frequency tick
      osc.type = 'sine';
      osc.frequency.setValueAtTime(9000, time);

      gainNode.gain.setValueAtTime(baseGain * 0.35, time);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);

      osc.start(time);
      osc.stop(time + 0.04);
    }
    return;
  }

  // 2. Bass / Sub Patch
  if (
    nameLower.includes('bass') ||
    nameLower.includes('sub') ||
    track.color === '#06b6d4'
  ) {
    osc.type = 'sawtooth';

    const chordProgressionIndex = Math.floor(stepNumber / 8) % 4;
    const midiRootNotes = [36, 43, 40, 41]; // C2, G2, E2, F2 root bass frequencies
    const midiToFrequency = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

    let activeMidi = midiRootNotes[chordProgressionIndex];
    if (stepNumber % 4 === 2) activeMidi += 7; // fifth interval
    else if (stepNumber % 4 === 3) activeMidi += 12; // octave up

    osc.frequency.setValueAtTime(midiToFrequency(activeMidi), time);

    gainNode.gain.setValueAtTime(baseGain * 0.75, time);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.25);

    osc.start(time);
    osc.stop(time + 0.26);
    return;
  }

  // 3. Bright Keys / Piano / Synthesizer Arpeggiator
  if (
    nameLower.includes('keys') ||
    nameLower.includes('piano') ||
    nameLower.includes('synth') ||
    track.color === '#8b5cf6' ||
    track.color === '#a855f7'
  ) {
    osc.type = 'triangle';

    const chordProgressionIndex = Math.floor(stepNumber / 8) % 4;
    const keysScale = [60, 64, 67, 72, 76, 79]; // C Major Arp
    const midiToFrequency = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

    const currentNote = keysScale[stepNumber % keysScale.length] + (chordProgressionIndex * 2);
    osc.frequency.setValueAtTime(midiToFrequency(currentNote), time);

    gainNode.gain.setValueAtTime(baseGain * 0.8, time);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);

    osc.start(time);
    osc.stop(time + 0.21);
    return;
  }

  // 4. Lead Vocals / Melodic Hook
  if (
    nameLower.includes('lead') ||
    nameLower.includes('vocal') ||
    nameLower.includes('harmony') ||
    track.color === '#10b981'
  ) {
    osc.type = 'triangle';

    const chordProgressionIndex = Math.floor(stepNumber / 8) % 4;
    const pentatonicMelodyScale = [60, 62, 64, 67, 69, 72, 74, 76]; // MIDI notes C4 through E5
    const midiToFrequency = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

    const patternOffsets = [0, 2, 4, 3, 5, 4, 7, 2];
    const stepOffset = patternOffsets[stepNumber % 8];
    let melodyMidi = pentatonicMelodyScale[stepOffset % pentatonicMelodyScale.length];

    if (chordProgressionIndex === 1) melodyMidi += 2;
    else if (chordProgressionIndex === 2) melodyMidi -= 1;

    osc.frequency.setValueAtTime(midiToFrequency(melodyMidi), time);
    osc.frequency.linearRampToValueAtTime(midiToFrequency(melodyMidi) * 1.008, time + 0.16);

    gainNode.gain.setValueAtTime(baseGain * 0.65, time);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.25);

    osc.start(time);
    osc.stop(time + 0.26);
    return;
  }

  // 5. Acoustic / Electric Guitar
  if (
    nameLower.includes('guitar') ||
    track.color === '#f59e0b'
  ) {
    osc.type = 'sine';

    const chordProgressionIndex = Math.floor(stepNumber / 8) % 4;
    const strumChords = [
      [60, 64, 67], // C Major
      [55, 59, 62], // G Major
      [57, 60, 64], // A Minor
      [53, 57, 60]  // F Major
    ];
    const currentChord = strumChords[chordProgressionIndex];
    const arpeggioNote = currentChord[stepNumber % currentChord.length] + 12;
    const midiToFrequency = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

    osc.frequency.setValueAtTime(midiToFrequency(arpeggioNote), time);

    gainNode.gain.setValueAtTime(baseGain * 0.55, time);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);

    osc.start(time);
    osc.stop(time + 0.31);
    return;
  }

  // 6. Ambient Pad / Default Synth
  osc.type = 'triangle';
  const chordProgressionIndex = Math.floor(stepNumber / 8) % 4;
  const padChordRoots = [48, 55, 45, 41]; // C3, G3, A2, F2 pad roots
  const midiToFrequency = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

  const padRootMidi = padChordRoots[chordProgressionIndex] + 12; // C4 chord pad root
  osc.frequency.setValueAtTime(midiToFrequency(padRootMidi), time);

  gainNode.gain.setValueAtTime(baseGain * 0.45, time);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.4);

  osc.start(time);
  osc.stop(time + 0.41);
}

/**
 * Creates the complete DAW channel strip (Volume, Pan, 3-band EQ, Delay FX, Reverb FX)
 * for a track, connecting into a master target node.
 */
export function createTrackChannelStrip(
  ctx: BaseAudioContext,
  track: Track,
  time: number,
  effectiveVolume: number,
  masterTarget: AudioNode
): GainNode {
  // 1. Channel Fader Gain
  const gainNode = ctx.createGain();
  const trackVolumeFactor = effectiveVolume / 100;
  const baseGain = trackVolumeFactor * 0.45;
  gainNode.gain.setValueAtTime(Math.max(0.00001, baseGain), time);

  let currentHead: AudioNode = gainNode;

  // 2. Track Overdrive / Distortion WaveShaper
  const distortionVal = track.distortion !== undefined ? track.distortion : 0;
  if (distortionVal > 0) {
    try {
      const shaper = ctx.createWaveShaper();
      shaper.curve = makeDistortionCurve(distortionVal);
      shaper.oversample = '4x';

      const toneFilter = ctx.createBiquadFilter();
      toneFilter.type = 'lowpass';
      const tone = track.distortionTone !== undefined ? track.distortionTone : 50;
      toneFilter.frequency.setValueAtTime(2000 + (tone / 100) * 14000, time);

      currentHead.connect(shaper);
      shaper.connect(toneFilter);
      currentHead = toneFilter;
    } catch (err) {
      console.warn('Could not initialize track distortion stage:', err);
    }
  }

  // 3. Track Dynamics Compressor Rack
  if (track.compressorEnabled) {
    try {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(track.compressorThreshold ?? -24, time);
      comp.ratio.setValueAtTime(track.compressorRatio ?? 4, time);
      comp.attack.setValueAtTime(track.compressorAttack ?? 0.01, time);
      comp.release.setValueAtTime(track.compressorRelease ?? 0.25, time);
      comp.knee.setValueAtTime(track.compressorKnee ?? 5, time);

      const makeupGain = ctx.createGain();
      const gainDb = track.compressorGain ?? 0;
      makeupGain.gain.setValueAtTime(Math.pow(10, gainDb / 20), time);

      currentHead.connect(comp);
      comp.connect(makeupGain);
      currentHead = makeupGain;
    } catch (err) {
      console.warn('Could not initialize track compressor stage:', err);
    }
  }

  // 4. 3-Band Equalizer (Low, Mid, High)
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

  currentHead.connect(eqLowNode);
  eqLowNode.connect(eqMidNode);
  eqMidNode.connect(eqHighNode);

  // 5. Channel Strip Post-EQ Output
  const trackOutput = ctx.createGain();
  trackOutput.gain.setValueAtTime(1.0, time);
  eqHighNode.connect(trackOutput);

  // 6. Stereo Panning
  let panner: StereoPannerNode | null = null;
  try {
    if (ctx.createStereoPanner) {
      panner = ctx.createStereoPanner();
      const panVal = Math.max(-1, Math.min(1, (track.pan || 0) / 50));
      panner.pan.setValueAtTime(panVal, time);
      trackOutput.connect(panner);
      panner.connect(masterTarget);
    } else {
      trackOutput.connect(masterTarget);
    }
  } catch {
    trackOutput.connect(masterTarget);
  }

  const fxOutput = panner || masterTarget;

  // 7. Delay FX Send
  const delayVal = track.delay !== undefined ? track.delay : 10;
  if (delayVal > 1) {
    try {
      const delayNode = ctx.createDelay();
      delayNode.delayTime.setValueAtTime(0.3, time);

      const delayFeedbackNode = ctx.createGain();
      delayFeedbackNode.gain.setValueAtTime((delayVal / 100) * 0.7, time);

      trackOutput.connect(delayNode);
      delayNode.connect(delayFeedbackNode);
      delayFeedbackNode.connect(delayNode);
      delayNode.connect(fxOutput);
    } catch (_) {}
  }

  // 8. Reverb FX Send
  const reverbVal = track.reverb !== undefined ? track.reverb : 15;
  if (reverbVal > 1) {
    try {
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
      reverbFeedbackNode.connect(fxOutput);
    } catch (_) {}
  }

  return gainNode;
}

/**
 * Encodes an AudioBuffer into standard 16-bit PCM Stereo WAV binary format.
 */
export function encodeAudioBufferToWav(
  buffer: AudioBuffer,
  applyDither: boolean = true
): Blob {
  const sampleRate = buffer.sampleRate;
  const channels = buffer.numberOfChannels;
  const length = buffer.length;
  const left = buffer.getChannelData(0);
  const right = channels > 1 ? buffer.getChannelData(1) : left;

  const bytesPerSample = 2;
  const blockAlign = 2 * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const wavBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(wavBuffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // Linear PCM
  view.setUint16(22, 2, true); // Stereo
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // 16-bit depth
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < length; i++) {
    let l = left[i];
    let r = right[i];

    if (applyDither) {
      l += (Math.random() - 0.5) * 0.0002;
      r += (Math.random() - 0.5) * 0.0002;
    }

    const clampedL = Math.max(-1, Math.min(1, l));
    const clampedR = Math.max(-1, Math.min(1, r));

    view.setInt16(offset, clampedL < 0 ? clampedL * 0x8000 : clampedL * 0x7FFF, true);
    offset += 2;
    view.setInt16(offset, clampedR < 0 ? clampedR * 0x8000 : clampedR * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([wavBuffer], { type: 'audio/wav' });
}

/**
 * Encodes an AudioBuffer into standard MP3 binary format using lamejs.
 */
export function encodeAudioBufferToMp3(
  buffer: AudioBuffer,
  kbps: number = 320
): Blob {
  try {
    const channels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const Mp3EncoderClass = (lamejs as any).Mp3Encoder || (lamejs as any).default?.Mp3Encoder;

    if (!Mp3EncoderClass) {
      console.warn('lamejs Mp3Encoder not available, falling back to WAV encoding');
      return encodeAudioBufferToWav(buffer);
    }

    const encoder = new Mp3EncoderClass(channels, sampleRate, kbps);
    const leftRaw = buffer.getChannelData(0);
    const rightRaw = channels > 1 ? buffer.getChannelData(1) : leftRaw;

    const convertToInt16 = (f32: Float32Array) => {
      const i16 = new Int16Array(f32.length);
      for (let i = 0; i < f32.length; i++) {
        const s = Math.max(-1, Math.min(1, f32[i]));
        i16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      return i16;
    };

    const left = convertToInt16(leftRaw);
    const right = convertToInt16(rightRaw);

    const sampleBlockSize = 1152;
    const mp3Chunks: Uint8Array[] = [];

    for (let i = 0; i < left.length; i += sampleBlockSize) {
      const leftChunk = left.subarray(i, i + sampleBlockSize);
      const rightChunk = channels > 1 ? right.subarray(i, i + sampleBlockSize) : leftChunk;
      let mp3buf: Int8Array;
      if (channels === 1) {
        mp3buf = encoder.encodeBuffer(leftChunk);
      } else {
        mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
      }
      if (mp3buf && mp3buf.length > 0) {
        mp3Chunks.push(new Uint8Array(mp3buf));
      }
    }

    const endBuf = encoder.flush();
    if (endBuf && endBuf.length > 0) {
      mp3Chunks.push(new Uint8Array(endBuf));
    }

    return new Blob(mp3Chunks, { type: 'audio/mp3' });
  } catch (err) {
    console.error('MP3 encoding failed, falling back to WAV:', err);
    return encodeAudioBufferToWav(buffer);
  }
}

/**
 * True Web Audio Offline Render Engine - Renders the project graph to an AudioBuffer,
 * applying track automation, volume faders, clip fade-in/fade-out envelopes, tempo step alignment, and limiter.
 */
export async function renderProjectOfflineBuffer(
  tracks: Track[],
  clips: AudioClip[],
  applyLimiter: boolean = true,
  tempo: number = 120
): Promise<AudioBuffer> {
  const sampleRate = 44100;

  // Determine total timeline duration based on clips
  let maxTime = 4;
  clips.forEach(c => {
    const end = c.startTime + c.duration;
    if (end > maxTime) maxTime = end;
  });

  // Reverb tail padding (1.5 seconds)
  const renderDuration = Math.min(3600, Math.max(4, Math.ceil(maxTime + 1.5)));
  const numFrames = Math.floor(sampleRate * renderDuration);

  const OfflineCtxClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  const offlineCtx = new OfflineCtxClass(2, numFrames, sampleRate);

  // Master Bus Gain (0.85)
  const masterGain = offlineCtx.createGain();
  masterGain.gain.setValueAtTime(0.85, 0);

  if (applyLimiter) {
    const limiter = offlineCtx.createDynamicsCompressor();
    limiter.threshold.setValueAtTime(-0.8, 0);
    limiter.knee.setValueAtTime(4, 0);
    limiter.ratio.setValueAtTime(20, 0);
    limiter.attack.setValueAtTime(0.002, 0);
    limiter.release.setValueAtTime(0.15, 0);
    masterGain.connect(limiter);
    limiter.connect(offlineCtx.destination);
  } else {
    masterGain.connect(offlineCtx.destination);
  }

  const isAnySoloed = tracks.some(t => t.isSoloed);

  // Pre-decode genuine audio clip buffers (recorded microphone blobs or imported files)
  const bufferCache: Record<string, AudioBuffer> = {};
  for (const clip of clips) {
    if (clip.audioUrl && clip.audioUrl !== '#' && (clip.audioUrl.startsWith('blob:') || clip.audioUrl.startsWith('data:') || clip.audioUrl.startsWith('http'))) {
      if (!bufferCache[clip.audioUrl]) {
        try {
          const res = await fetch(clip.audioUrl);
          const ab = await res.arrayBuffer();
          bufferCache[clip.audioUrl] = await offlineCtx.decodeAudioData(ab);
        } catch (e) {
          console.warn('Could not decode audio buffer for offline render:', clip.name, e);
        }
      }
    }
  }

  // Sequencer step interval dynamically scaled by tempo (8th note step)
  const stepInterval = Math.max(0.05, 60 / tempo / 2);

  // Render each track channel strip
  for (const track of tracks) {
    if (track.isMuted) continue;
    if (isAnySoloed && !track.isSoloed) continue;

    const trackClips = clips.filter(c => c.trackId === track.id);
    if (trackClips.length === 0) continue;

    // Build the exact channel strip matching DAWTimeline
    const channelStripInput = createTrackChannelStrip(
      offlineCtx,
      track,
      0,
      track.volume,
      masterGain
    );

    // Schedule real recorded/imported audio clips
    for (const clip of trackClips) {
      const clipDuration = clip.duration;
      const clipEndTime = clip.startTime + clipDuration;
      const fadeInDuration = clip.fadeIn || 0;
      const fadeOutDuration = clip.fadeOut || 0;

      if (clip.audioUrl && bufferCache[clip.audioUrl]) {
        const buf = bufferCache[clip.audioUrl];
        const srcNode = offlineCtx.createBufferSource();
        srcNode.buffer = buf;

        // Apply track automation fader gain if active
        let effectiveVol = track.volume;
        if (track.automation && track.automation.enabled && track.automation.mode !== 'off' && track.automation.points?.length > 0) {
          effectiveVol = getAutomatedValueAtTime(track.automation.points, clip.startTime, track.volume);
        }
        const clipGain = offlineCtx.createGain();
        const baseGainFactor = (effectiveVol / 100) * 0.45;

        // Apply clip fade-in and fade-out envelope to audio buffer
        if (fadeInDuration > 0) {
          clipGain.gain.setValueAtTime(0.0001, clip.startTime);
          clipGain.gain.linearRampToValueAtTime(baseGainFactor, clip.startTime + fadeInDuration);
        } else {
          clipGain.gain.setValueAtTime(baseGainFactor, clip.startTime);
        }

        if (fadeOutDuration > 0) {
          const fadeStart = Math.max(clip.startTime + fadeInDuration, clipEndTime - fadeOutDuration);
          clipGain.gain.setValueAtTime(baseGainFactor, fadeStart);
          clipGain.gain.linearRampToValueAtTime(0.0001, clipEndTime);
        }

        srcNode.connect(clipGain);
        clipGain.connect(channelStripInput);
        srcNode.start(clip.startTime, 0, Math.min(clipDuration, buf.duration));
      } else {
        // Synthesizer clip steps: sample-accurate interval matching DAW playback
        const clipEnd = clip.startTime + clip.duration;
        let stepTime = clip.startTime;
        let stepNumber = Math.floor(clip.startTime / stepInterval);

        while (stepTime < clipEnd) {
          const effectiveVol = (track.automation && track.automation.enabled && track.automation.mode !== 'off' && track.automation.points && track.automation.points.length > 0)
            ? getAutomatedValueAtTime(track.automation.points, stepTime, track.volume)
            : track.volume;

          // Compute fade multiplier
          let fadeFactor = 1.0;
          if (fadeInDuration > 0 && stepTime < clip.startTime + fadeInDuration) {
            fadeFactor = Math.max(0, (stepTime - clip.startTime) / fadeInDuration);
          }
          if (fadeOutDuration > 0 && stepTime > clipEndTime - fadeOutDuration) {
            fadeFactor = Math.min(fadeFactor, Math.max(0, (clipEndTime - stepTime) / fadeOutDuration));
          }

          // Per-step fader envelope gain
          const stepGainNode = offlineCtx.createGain();
          const volFactor = (effectiveVol / 100) * 0.45 * fadeFactor;
          stepGainNode.gain.setValueAtTime(Math.max(0.00001, volFactor), stepTime);
          stepGainNode.connect(channelStripInput);

          synthesizeStepNote(
            offlineCtx,
            track,
            stepTime,
            stepNumber,
            stepGainNode
          );

          stepTime += stepInterval;
          stepNumber++;
        }
      }
    }
  }

  // Render the audio graph faster than realtime
  return await offlineCtx.startRendering();
}

/**
 * True Web Audio Offline Render Engine - Renders the project so that the exported
 * audio file sounds EXACTLY as made and heard in the DAW timeline.
 */
export async function renderProjectOfflineWav(
  tracks: Track[],
  clips: AudioClip[],
  applyLimiter: boolean = true,
  applyDither: boolean = true,
  tempo: number = 120
): Promise<Blob> {
  const renderedBuffer = await renderProjectOfflineBuffer(tracks, clips, applyLimiter, tempo);
  return encodeAudioBufferToWav(renderedBuffer, applyDither);
}

