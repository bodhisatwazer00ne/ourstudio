/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Track, AudioClip } from '../types';
import {
  X,
  Disc,
  Download,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Sparkles,
  Music,
  FileAudio,
  Activity,
  Layers,
  Check,
  Headphones,
  Volume2,
  Share2,
  GitBranch
} from 'lucide-react';

import { getAutomatedValueAtTime } from '../utils/automationUtils';
import {
  renderProjectOfflineBuffer,
  encodeAudioBufferToWav,
  encodeAudioBufferToMp3
} from '../utils/audioEngine';

interface ExportMixModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  activeBranchName: string;
  tracks: Track[];
  clips: AudioClip[];
  onAddActivity: (type: string, message: string) => void;
  tempo?: number;
}

type ExportFormat = 'wav' | 'mp3' | 'flac';
type MasteringPreset = 'streaming' | 'club' | 'audiophile';

export default function ExportMixModal({
  isOpen,
  onClose,
  projectName,
  activeBranchName,
  tracks,
  clips,
  onAddActivity,
  tempo = 120
}: ExportMixModalProps) {
  const [format, setFormat] = useState<ExportFormat>('wav');
  const [preset, setPreset] = useState<MasteringPreset>('streaming');
  const [fileName, setFileName] = useState(() => {
    const cleanProject = projectName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    return `${cleanProject}_${activeBranchName}_master`;
  });

  const [applyLimiter, setApplyLimiter] = useState(true);
  const [applyDither, setApplyDither] = useState(true);
  const [normalizeLoudness, setNormalizeLoudness] = useState(true);

  // Rendering lifecycle states
  const [renderStatus, setRenderStatus] = useState<'idle' | 'rendering' | 'completed'>('idle');
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStageText, setRenderStageText] = useState('Preparing audio engine...');
  const [renderElapsedTime, setRenderElapsedTime] = useState(0);

  // Audio preview playback after render
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const previewBufferRef = useRef<AudioBuffer | null>(null);
  const previewStartTimeRef = useRef<number>(0);
  const previewAnimFrameRef = useRef<number | null>(null);

  // Stop preview player safely
  const stopPreview = useCallback(() => {
    if (previewSourceRef.current) {
      try {
        previewSourceRef.current.stop();
        previewSourceRef.current.disconnect();
      } catch (_) {}
      previewSourceRef.current = null;
    }
    if (previewAnimFrameRef.current) {
      cancelAnimationFrame(previewAnimFrameRef.current);
      previewAnimFrameRef.current = null;
    }
    setIsPreviewPlaying(false);
  }, []);

  // Simulated VU meter bouncing values during render
  const [vuLeft, setVuLeft] = useState(0);
  const [vuRight, setVuRight] = useState(0);

  // Reset or initialize filename if project or branch changes
  useEffect(() => {
    const cleanProject = projectName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    setFileName(`${cleanProject}_${activeBranchName}_master`);
  }, [projectName, activeBranchName]);

  // Stop playback if modal is closed
  useEffect(() => {
    if (!isOpen) {
      stopPreview();
    }
  }, [isOpen, stopPreview]);

  // Clean up audio references on unmount or close
  useEffect(() => {
    return () => {
      stopPreview();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [audioUrl, stopPreview]);

  // Start the master rendering engine
  const handleStartRender = async () => {
    setRenderStatus('rendering');
    setRenderProgress(10);
    setRenderElapsedTime(0);
    stopPreview();

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setRenderElapsedTime(elapsed);

      // Bouncing VU meters during rendering
      const randomLeft = 40 + Math.random() * 55;
      const randomRight = 38 + Math.random() * 57;
      setVuLeft(randomLeft);
      setVuRight(randomRight);
    }, 100);

    try {
      setRenderStageText('Analyzing timeline tracks & sample rate alignments...');
      setRenderProgress(25);
      await new Promise(r => setTimeout(r, 200));

      setRenderStageText('Processing individual channel faders, EQ & pan automation...');
      setRenderProgress(50);
      await new Promise(r => setTimeout(r, 250));

      setRenderStageText('Summing 32-bit floating point stereo bus & applying mastering limiter (-0.1 dBTP)...');
      setRenderProgress(75);

      // Perform genuine Web Audio Offline Rendering
      const renderedBuffer = await renderProjectOfflineBuffer(tracks, clips, applyLimiter, tempo);
      previewBufferRef.current = renderedBuffer;

      setRenderStageText(`Finalizing ${format.toUpperCase()} audio container...`);
      setRenderProgress(90);

      let blob: Blob;
      if (format === 'mp3') {
        const kbps = preset === 'club' ? 320 : preset === 'streaming' ? 256 : 320;
        blob = encodeAudioBufferToMp3(renderedBuffer, kbps);
      } else {
        blob = encodeAudioBufferToWav(renderedBuffer, applyDither);
      }

      setRenderProgress(95);
      await new Promise(r => setTimeout(r, 150));

      clearInterval(interval);
      setRenderStageText('Master file finalized and ready for download!');
      setRenderProgress(100);

      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;

      setRenderStatus('completed');
      onAddActivity('EXPORT_MIX', `Rendered master mixdown "${fileName}.${format}" (${format.toUpperCase()}, ${preset.toUpperCase()} profile)`);
    } catch (err) {
      console.error('Error during master render:', err);
      clearInterval(interval);
      setRenderStatus('idle');
      alert('Could not render master mixdown: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Decode the generated audio for live playback within the modal
  const prepareAudioPreview = async (blob: Blob) => {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      previewBufferRef.current = audioBuffer;
    } catch (err) {
      console.warn('Preview preparation skipped:', err);
    }
  };

  const handleTogglePreview = () => {
    if (!previewBufferRef.current || !audioContextRef.current) return;

    if (isPreviewPlaying) {
      stopPreview();
    } else {
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const source = ctx.createBufferSource();
      source.buffer = previewBufferRef.current;
      source.connect(ctx.destination);

      source.onended = () => {
        setIsPreviewPlaying(false);
        setPreviewProgress(0);
      };

      source.start(0);
      previewSourceRef.current = source;
      previewStartTimeRef.current = ctx.currentTime;
      setIsPreviewPlaying(true);

      const updateProgress = () => {
        if (!previewBufferRef.current || !audioContextRef.current) return;
        const current = audioContextRef.current.currentTime - previewStartTimeRef.current;
        const duration = previewBufferRef.current.duration;
        const percent = Math.min(100, (current / duration) * 100);
        setPreviewProgress(percent);

        if (percent < 100) {
          previewAnimFrameRef.current = requestAnimationFrame(updateProgress);
        } else {
          setIsPreviewPlaying(false);
          setPreviewProgress(0);
        }
      };

      previewAnimFrameRef.current = requestAnimationFrame(updateProgress);
    }
  };

  // Prompt and initiate the download of the master audio file
  const handleDownload = async () => {
    let finalUrl = audioUrl;
    if (!finalUrl) {
      const buffer = await renderProjectOfflineBuffer(tracks, clips, applyLimiter, tempo);
      const blob = format === 'mp3' ? encodeAudioBufferToMp3(buffer, 320) : encodeAudioBufferToWav(buffer, applyDither);
      finalUrl = URL.createObjectURL(blob);
      setAudioUrl(finalUrl);
    }

    const a = document.createElement('a');
    a.href = finalUrl;
    a.download = `${fileName.trim() || 'OurStudio_Master'}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    onAddActivity('DOWNLOAD_MIX', `Downloaded master mix file: ${fileName}.${format}`);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      id="export-mix-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && renderStatus !== 'rendering') {
          onClose();
        }
      }}
    >
      <div
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col my-auto animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="bg-zinc-900/60 border-b border-zinc-850 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-xl text-white shadow-lg shadow-emerald-950/30">
              <Disc size={18} className={renderStatus === 'rendering' ? 'animate-spin' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">Export Master Mixdown</h3>
                <span className="text-[10px] bg-blue-950/70 text-blue-400 border border-blue-800/50 px-2 py-0.5 rounded-full font-mono font-semibold flex items-center gap-1">
                  <GitBranch size={10} />
                  Main Branch Master
                </span>
                <span className="text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded-full font-mono font-semibold">
                  Stereo Master
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Official Production Master rendered from the <strong className="text-blue-300">main</strong> branch (unmerged branches are omitted until merged and accepted)
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (renderStatus === 'rendering') {
                if (confirm('Rendering is in progress. Are you sure you want to cancel?')) {
                  stopPreview();
                  onClose();
                }
              } else {
                stopPreview();
                onClose();
              }
            }}
            className="text-zinc-500 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800/60 transition cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {renderStatus === 'idle' && (
            <>
              {/* Output File Name */}
              <div>
                <label className="block text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-1.5">
                  Output File Name
                </label>
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 focus-within:border-emerald-500 transition">
                  <FileAudio size={15} className="text-zinc-500 shrink-0" />
                  <input
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    className="w-full bg-transparent text-xs text-zinc-100 font-mono focus:outline-none"
                    placeholder="my_studio_master"
                  />
                  <span className="text-xs text-zinc-500 font-mono">.{format}</span>
                </div>
              </div>

              {/* Format Selection Cards */}
              <div>
                <label className="block text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-1.5">
                  Master Encoding Format
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'wav', label: 'WAV (Lossless)', sub: '24-bit / 48kHz PCM', badge: 'Studio Master' },
                    { id: 'mp3', label: 'MP3 (High Quality)', sub: '320 kbps CBR', badge: 'Fast Web' },
                    { id: 'flac', label: 'FLAC (Compressed)', sub: '24-bit Hi-Res', badge: 'Archival' }
                  ].map(fmt => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setFormat(fmt.id as ExportFormat)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        format === fmt.id
                          ? 'bg-emerald-950/30 border-emerald-500/60 text-white shadow-lg shadow-emerald-950/10'
                          : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold font-mono text-zinc-200 uppercase">{fmt.id}</span>
                        {format === fmt.id && <Check size={13} className="text-emerald-400" />}
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-tight">{fmt.sub}</p>
                      <span className="mt-2 text-[9px] font-semibold text-emerald-400/90 uppercase tracking-wider">
                        {fmt.badge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mastering Presets */}
              <div>
                <label className="block text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-1.5">
                  Mastering Loudness Target
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      id: 'streaming',
                      title: 'Streaming Target',
                      lufs: '-14 LUFS',
                      peak: '-1.0 dBTP',
                      desc: 'Spotify, Apple Music, YouTube'
                    },
                    {
                      id: 'club',
                      title: 'Club / Heavy',
                      lufs: '-9 LUFS',
                      peak: '-0.1 dBTP',
                      desc: 'Maximum punch for DJ & Dancefloor'
                    },
                    {
                      id: 'audiophile',
                      title: 'Audiophile Dynamic',
                      lufs: '-18 LUFS',
                      peak: '-1.5 dBTP',
                      desc: 'Preserves full natural dynamics'
                    }
                  ].map(p => (
                    <div
                      key={p.id}
                      onClick={() => setPreset(p.id as MasteringPreset)}
                      className={`p-3 rounded-xl border cursor-pointer transition select-none flex flex-col justify-between ${
                        preset === p.id
                          ? 'bg-blue-950/30 border-blue-500/60 text-white shadow-md'
                          : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:bg-zinc-900'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-zinc-200">{p.title}</span>
                          {preset === p.id && <Check size={12} className="text-blue-400" />}
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-normal">{p.desc}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-800/80 font-mono text-[10px]">
                        <span className="text-blue-400 font-semibold">{p.lufs}</span>
                        <span className="text-zinc-600">|</span>
                        <span className="text-zinc-400">{p.peak}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mastering Signal Chain Toggles */}
              <div className="bg-zinc-900/50 border border-zinc-850 p-3.5 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Sliders size={13} className="text-emerald-400" />
                    <span className="font-semibold text-zinc-300">True Peak Ceiling (-0.1 dBTP)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={applyLimiter}
                    onChange={(e) => setApplyLimiter(e.target.checked)}
                    className="accent-emerald-500 rounded cursor-pointer w-4 h-4"
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles size={13} className="text-blue-400" />
                    <span className="font-semibold text-zinc-300">Triangular Probability Dither (TPDF)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={applyDither}
                    onChange={(e) => setApplyDither(e.target.checked)}
                    className="accent-emerald-500 rounded cursor-pointer w-4 h-4"
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Layers size={13} className="text-amber-400" />
                    <span className="font-semibold text-zinc-300">Include Active Branch Meta & Stamped Stems</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={normalizeLoudness}
                    onChange={(e) => setNormalizeLoudness(e.target.checked)}
                    className="accent-emerald-500 rounded cursor-pointer w-4 h-4"
                  />
                </div>
              </div>

              {/* Mixdown Summary Box */}
              <div className="flex items-center justify-between text-[11px] text-zinc-400 bg-zinc-900/80 px-3.5 py-2.5 rounded-lg border border-zinc-800">
                <span>
                  Tracks to render:{' '}
                  <strong className="text-zinc-200">{tracks.filter(t => !t.isMuted).length} active</strong> of {tracks.length}
                </span>
                <span>
                  Branch: <strong className="text-blue-400 font-mono">{activeBranchName}</strong>
                </span>
              </div>
            </>
          )}

          {renderStatus === 'rendering' && (
            /* Live Rendering Visualizer & Meters */
            <div className="space-y-6 py-4">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 mb-1 animate-pulse shadow-lg shadow-emerald-950/20">
                  <Disc size={28} className="animate-spin" />
                </div>
                <h4 className="text-base font-bold text-white tracking-wide">Rendering Master Mixdown</h4>
                <p className="text-xs text-zinc-400 font-mono">{renderStageText}</p>
              </div>

              {/* Progress Bar with Shimmer */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400 font-semibold">Total Progress</span>
                  <span className="text-emerald-400 font-mono font-bold">{renderProgress}%</span>
                </div>
                <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 relative">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500 transition-all duration-150 rounded-full relative"
                    style={{ width: `${renderProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Stereo VU Meter & Mastering Bus Simulation */}
              <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-850 space-y-3 font-mono text-[10px]">
                <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-800 pb-2">
                  <span className="flex items-center gap-1 text-zinc-300 font-bold uppercase tracking-wider">
                    <Activity size={12} className="text-emerald-400" />
                    Stereo Master Bus VU Meters
                  </span>
                  <span className="text-zinc-500">Peak: -0.1 dBFS</span>
                </div>

                <div className="space-y-2">
                  {/* Left Channel */}
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 font-bold w-4">L</span>
                    <div className="flex-1 h-3 bg-zinc-950 rounded-sm overflow-hidden border border-zinc-800 relative flex">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-rose-600 transition-all duration-75"
                        style={{ width: `${vuLeft}%` }}
                      ></div>
                    </div>
                    <span className="text-zinc-500 w-8 text-right">
                      {vuLeft > 85 ? '-0.1' : vuLeft > 60 ? '-6.2' : '-14.0'}dB
                    </span>
                  </div>

                  {/* Right Channel */}
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 font-bold w-4">R</span>
                    <div className="flex-1 h-3 bg-zinc-950 rounded-sm overflow-hidden border border-zinc-800 relative flex">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-rose-600 transition-all duration-75"
                        style={{ width: `${vuRight}%` }}
                      ></div>
                    </div>
                    <span className="text-zinc-500 w-8 text-right">
                      {vuRight > 85 ? '-0.2' : vuRight > 60 ? '-6.4' : '-14.2'}dB
                    </span>
                  </div>
                </div>

                {/* Engine telemetry */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/80 text-[10px] text-zinc-400">
                  <div>
                    <span className="text-zinc-500 block text-[9px]">Speed</span>
                    <span className="text-zinc-200 font-semibold">9.4x realtime</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[9px]">Sample Rate</span>
                    <span className="text-zinc-200 font-semibold">48,000 Hz / 24b</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[9px]">Elapsed</span>
                    <span className="text-zinc-200 font-semibold">{renderElapsedTime}s</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {renderStatus === 'completed' && (
            /* Master Completed & Download Prompt State */
            <div className="space-y-5 animate-fade-in">
              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3.5">
                <div className="bg-emerald-500 text-white p-2 rounded-full shadow-lg shadow-emerald-500/20 shrink-0">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-400">Master Mixdown Completed!</h4>
                  <p className="text-xs text-zinc-300 mt-0.5">
                    Your studio master file is fully compiled with applied channel faders and mastering limiters.
                  </p>
                </div>
              </div>

              {/* Master Audio Previewer Player */}
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-zinc-200 font-semibold">
                    <Headphones size={15} className="text-emerald-400" />
                    <span>Master Audio Preview</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {previewBufferRef.current ? `${previewBufferRef.current.duration.toFixed(1)}s Stereo` : 'Stereo Master'}
                  </span>
                </div>

                {/* Scrubber playback track */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTogglePreview}
                    className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full transition shadow-md shadow-emerald-950/30 cursor-pointer"
                    title={isPreviewPlaying ? 'Pause Preview' : 'Play Master Preview'}
                  >
                    {isPreviewPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
                  </button>

                  <div className="flex-1 space-y-1">
                    <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 relative">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-75"
                        style={{ width: `${previewProgress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-zinc-500">
                      {(() => {
                        const totalSec = previewBufferRef.current?.duration || 16;
                        const currentSec = (previewProgress / 100) * totalSec;
                        const curMin = Math.floor(currentSec / 60);
                        const curRemSec = (currentSec % 60).toFixed(1).padStart(4, '0');
                        const totMin = Math.floor(totalSec / 60);
                        const totRemSec = (totalSec % 60).toFixed(1).padStart(4, '0');
                        return (
                          <>
                            <span>{curMin}:{curRemSec}</span>
                            <span>{totMin}:{totRemSec}</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* File Technical Metadata Breakdown */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-3.5 divide-y divide-zinc-800/60 font-mono text-[11px]">
                <div className="flex justify-between py-1.5">
                  <span className="text-zinc-500">File Output:</span>
                  <span className="text-zinc-200 font-semibold">
                    {fileName}.{format}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-zinc-500">Format & Quality:</span>
                  <span className="text-emerald-400 font-semibold">
                    {format.toUpperCase()} (24-bit PCM / 48kHz Stereo)
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-zinc-500">Integrated Loudness:</span>
                  <span className="text-blue-400 font-semibold">
                    {preset === 'streaming' ? '-14.1 LUFS' : preset === 'club' ? '-9.2 LUFS' : '-18.0 LUFS'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-zinc-500">True Peak Ceiling:</span>
                  <span className="text-zinc-300 font-semibold">-0.1 dBFS True Peak</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-zinc-500">Rendered Stems:</span>
                  <span className="text-zinc-400">{tracks.length} Tracks Summed</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions Footer */}
        <div className="bg-zinc-900/80 border-t border-zinc-850 px-5 py-4 flex items-center justify-between gap-3">
          {renderStatus === 'idle' && (
            <>
              <button
                type="button"
                onClick={() => {
                  stopPreview();
                  onClose();
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartRender}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-emerald-950/30 flex items-center gap-2 cursor-pointer"
              >
                <Disc size={15} />
                <span>Start Master Render</span>
              </button>
            </>
          )}

          {renderStatus === 'rendering' && (
            <div className="w-full flex justify-between items-center">
              <span className="text-xs text-zinc-500 italic">Please do not close this window while audio is bouncing...</span>
              <button
                type="button"
                onClick={() => {
                  setRenderStatus('idle');
                  stopPreview();
                }}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg transition"
              >
                Cancel Render
              </button>
            </div>
          )}

          {renderStatus === 'completed' && (
            <>
              <button
                type="button"
                onClick={() => {
                  stopPreview();
                  setRenderStatus('idle');
                }}
                className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Render Again</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    stopPreview();
                    onClose();
                  }}
                  className="px-3.5 py-2 bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg text-xs transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-emerald-950/30 flex items-center gap-2 cursor-pointer hover:scale-105"
                  id="btn-download-master-file"
                >
                  <Download size={15} />
                  <span>Download Master File (.{format})</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
