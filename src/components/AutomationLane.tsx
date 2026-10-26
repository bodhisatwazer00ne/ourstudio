/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Track, TrackAutomation, AutomationPoint, AutomationMode } from '../types';
import {
  getAutomatedValueAtTime,
  formatVolumeDb,
  generateFadeInPreset,
  generateFadeOutPreset,
  generateSidechainPumpPreset
} from '../utils/automationUtils';
import {
  Sliders,
  Trash2,
  TrendingUp,
  TrendingDown,
  Waves,
  Plus,
  Check,
  ChevronUp,
  X
} from 'lucide-react';

interface AutomationLaneProps {
  track: Track;
  zoomLevel: number;
  maxTimelineDuration: number;
  currentTime: number;
  timelineTicks: number[];
  isPlaying: boolean;
  onUpdateTrack: (trackId: string, updates: Partial<Track>) => void;
  onClose: () => void;
}

export const AutomationLane: React.FC<AutomationLaneProps> = ({
  track,
  zoomLevel,
  maxTimelineDuration,
  currentTime,
  timelineTicks,
  isPlaying,
  onUpdateTrack,
  onClose
}) => {
  const laneHeight = 88;
  const topPadding = 10;
  const bottomPadding = 10;
  const effectiveHeight = laneHeight - topPadding - bottomPadding;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activeDraggingNodeId, setActiveDraggingNodeId] = useState<string | null>(null);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<{ time: number; value: number } | null>(null);
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);

  // Ensure automation configuration exists on track
  const automation: TrackAutomation = track.automation || {
    enabled: true,
    mode: 'read',
    parameter: 'volume',
    points: [
      { id: `ap-${track.id}-init-1`, time: 0, value: track.volume },
      { id: `ap-${track.id}-init-2`, time: Math.min(32, maxTimelineDuration), value: track.volume }
    ]
  };

  const points = [...automation.points].sort((a, b) => a.time - b.time);

  // Coordinate transformations
  const timeToX = useCallback((t: number) => t * zoomLevel, [zoomLevel]);
  const xToTime = useCallback((x: number) => {
    return Math.max(0, Math.min(maxTimelineDuration, Math.round((x / zoomLevel) * 100) / 100));
  }, [zoomLevel, maxTimelineDuration]);

  const valToY = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    return topPadding + (1 - clamped / 100) * effectiveHeight;
  }, [effectiveHeight]);

  const yToVal = useCallback((y: number) => {
    const raw = 1 - (y - topPadding) / effectiveHeight;
    return Math.max(0, Math.min(100, Math.round(raw * 100)));
  }, [effectiveHeight]);

  // Current automated volume at playhead position
  const currentAutomatedVal = getAutomatedValueAtTime(points, currentTime, track.volume);

  // Update automation points helper
  const updatePoints = useCallback((newPoints: AutomationPoint[]) => {
    const sorted = [...newPoints].sort((a, b) => a.time - b.time);
    onUpdateTrack(track.id, {
      automation: {
        ...automation,
        enabled: true,
        points: sorted
      }
    });
  }, [track.id, automation, onUpdateTrack]);

  // Change automation operating mode (Read, Write, Off)
  const setMode = (mode: AutomationMode) => {
    onUpdateTrack(track.id, {
      automation: {
        ...automation,
        enabled: mode !== 'off',
        mode
      }
    });
  };

  // Node drag logic
  const handleNodeMouseDown = (e: React.MouseEvent, pointId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveDraggingNodeId(pointId);

    const targetPoint = points.find(p => p.id === pointId);
    if (targetPoint) {
      setDragPreview({ time: targetPoint.time, value: targetPoint.value });
    }
  };

  // Global mouse listeners during node dragging
  useEffect(() => {
    if (!activeDraggingNodeId) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;

      let newTime = xToTime(rawX);
      // Snap to 0.25s grid if Shift key is not pressed
      if (!e.shiftKey) {
        newTime = Math.round(newTime * 4) / 4;
      }
      const newVal = yToVal(rawY);

      setDragPreview({ time: newTime, value: newVal });

      const updated = points.map(p => {
        if (p.id === activeDraggingNodeId) {
          return { ...p, time: newTime, value: newVal };
        }
        return p;
      });

      updatePoints(updated);
    };

    const handleMouseUp = () => {
      setActiveDraggingNodeId(null);
      setDragPreview(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeDraggingNodeId, points, updatePoints, xToTime, yToVal]);

  // Click on canvas background to create a new automation point
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    // Only handle if clicking SVG directly or path, not if dragging or clicking an existing node
    if (activeDraggingNodeId) return;
    if ((e.target as HTMLElement).tagName === 'circle') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let newTime = xToTime(clickX);
    if (!e.shiftKey) {
      newTime = Math.round(newTime * 4) / 4;
    }
    const newVal = yToVal(clickY);

    const newPoint: AutomationPoint = {
      id: `ap-${track.id}-${Date.now()}`,
      time: newTime,
      value: newVal
    };

    updatePoints([...points, newPoint]);
  };

  // Delete a point (via double click or context menu)
  const handleDeletePoint = (e: React.MouseEvent, pointId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (points.length <= 1) {
      // Don't delete last remaining point, just reset it to track volume
      updatePoints([{ id: `ap-${track.id}-init`, time: 0, value: track.volume }]);
      return;
    }
    updatePoints(points.filter(p => p.id !== pointId));
  };

  // Presets
  const applyFadeIn = () => {
    updatePoints(generateFadeInPreset(4, track.volume));
    setShowPresetsMenu(false);
  };

  const applyFadeOut = () => {
    const endT = Math.min(32, maxTimelineDuration);
    updatePoints(generateFadeOutPreset(Math.max(0, endT - 8), endT, track.volume));
    setShowPresetsMenu(false);
  };

  const applySidechainPump = () => {
    updatePoints(generateSidechainPumpPreset(Math.min(32, maxTimelineDuration), 0.5, 20, track.volume));
    setShowPresetsMenu(false);
  };

  const clearAllPoints = () => {
    updatePoints([
      { id: `ap-${track.id}-reset-1`, time: 0, value: track.volume },
      { id: `ap-${track.id}-reset-2`, time: Math.min(32, maxTimelineDuration), value: track.volume }
    ]);
    setShowPresetsMenu(false);
  };

  // Live Write slider movement recording when playback is running in 'write' mode
  const handleLiveVolumeSlider = (val: number) => {
    if (automation.mode === 'write' && isPlaying) {
      const snapTime = Math.round(currentTime * 10) / 10;
      // Filter out points within 0.1s to avoid point explosion
      const filtered = points.filter(p => Math.abs(p.time - snapTime) > 0.12);
      const newPoint: AutomationPoint = {
        id: `ap-live-${Date.now()}`,
        time: snapTime,
        value: val
      };
      updatePoints([...filtered, newPoint]);
    } else {
      // Fallback update track volume
      onUpdateTrack(track.id, { volume: val });
    }
  };

  // Construct SVG Path data
  const buildSvgPath = () => {
    if (points.length === 0) return '';

    // Start with first point or time 0
    let d = '';
    const firstX = timeToX(points[0].time);
    const firstY = valToY(points[0].value);

    if (points[0].time > 0) {
      // Extend first value back to time 0
      d += `M 0 ${firstY} L ${firstX} ${firstY} `;
    } else {
      d += `M ${firstX} ${firstY} `;
    }

    for (let i = 1; i < points.length; i++) {
      const px = timeToX(points[i].time);
      const py = valToY(points[i].value);
      d += `L ${px} ${py} `;
    }

    // Extend last point out to max timeline duration
    const lastPoint = points[points.length - 1];
    const maxX = timeToX(maxTimelineDuration);
    const lastY = valToY(lastPoint.value);
    d += `L ${maxX} ${lastY} `;

    return d;
  };

  const buildPolygonPath = () => {
    const strokePath = buildSvgPath();
    if (!strokePath) return '';
    const maxX = timeToX(maxTimelineDuration);
    const bottomY = laneHeight;
    return `${strokePath} L ${maxX} ${bottomY} L 0 ${bottomY} Z`;
  };

  const trackColor = track.color || '#3b82f6';

  return (
    <div className="flex h-[88px] border-b border-zinc-900/90 bg-zinc-950/90 relative select-none">
      {/* Sticky Left Automation Control Sidebar */}
      <div
        className="w-[180px] border-r border-zinc-800/80 bg-zinc-950 p-2 flex flex-col justify-between sticky left-0 z-20 border-l-2"
        style={{ borderLeftColor: trackColor }}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sliders size={12} className="text-zinc-400" />
            <span className="text-[11px] font-semibold text-zinc-200">Volume Envelope</span>
          </div>

          <button
            onClick={onClose}
            className="p-0.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition"
            title="Collapse Automation Lane"
          >
            <ChevronUp size={13} />
          </button>
        </div>

        {/* Live Automated Value Readout & Slider */}
        <div className="flex flex-col gap-0.5 my-0.5">
          <div className="flex items-center justify-between text-[9px] font-mono">
            <span className="text-zinc-400">Level:</span>
            <span className="font-bold text-zinc-200" style={{ color: trackColor }}>
              {currentAutomatedVal}% ({formatVolumeDb(currentAutomatedVal)})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="range"
              min="0"
              max="100"
              value={automation.mode === 'write' ? track.volume : currentAutomatedVal}
              onChange={(e) => handleLiveVolumeSlider(parseInt(e.target.value))}
              disabled={automation.mode === 'read' && isPlaying}
              className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-cyan-400 disabled:opacity-60"
              title={
                automation.mode === 'write' && isPlaying
                  ? 'Writing automation live into envelope!'
                  : 'Fader preview'
              }
            />
          </div>
        </div>

        {/* Mode Selector & Presets Menu */}
        <div className="flex items-center justify-between gap-1 pt-1 border-t border-zinc-900">
          {/* Read / Write / Off segmented mode buttons */}
          <div className="flex items-center bg-zinc-900 rounded p-0.5 text-[9px] font-mono">
            <button
              onClick={() => setMode('read')}
              className={`px-1.5 py-0.5 rounded transition ${
                automation.mode === 'read'
                  ? 'bg-emerald-500 text-zinc-950 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Read mode: plays back automated volume envelope"
            >
              READ
            </button>
            <button
              onClick={() => setMode('write')}
              className={`px-1.5 py-0.5 rounded transition ${
                automation.mode === 'write'
                  ? 'bg-rose-500 text-white font-bold animate-pulse'
                  : 'text-zinc-400 hover:text-rose-400'
              }`}
              title="Write mode: moving the volume slider during playback records automation points live!"
            >
              WRITE
            </button>
            <button
              onClick={() => setMode('off')}
              className={`px-1.5 py-0.5 rounded transition ${
                automation.mode === 'off'
                  ? 'bg-zinc-700 text-zinc-200 font-bold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Bypass automation, use static track volume fader"
            >
              OFF
            </button>
          </div>

          {/* Quick Preset Curves Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowPresetsMenu(!showPresetsMenu)}
              className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[9px] text-zinc-300 font-medium transition cursor-pointer"
              title="Automation curve presets"
            >
              Presets
            </button>

            {showPresetsMenu && (
              <div className="absolute bottom-full left-0 mb-1 w-32 bg-zinc-900 border border-zinc-700 rounded-md shadow-2xl py-1 z-50 text-[10px] flex flex-col">
                <button
                  onClick={applyFadeIn}
                  className="px-2.5 py-1 text-left hover:bg-zinc-800 text-zinc-200 flex items-center gap-1.5"
                >
                  <TrendingUp size={11} className="text-emerald-400" />
                  Fade In (4s)
                </button>
                <button
                  onClick={applyFadeOut}
                  className="px-2.5 py-1 text-left hover:bg-zinc-800 text-zinc-200 flex items-center gap-1.5"
                >
                  <TrendingDown size={11} className="text-rose-400" />
                  Fade Out (8s)
                </button>
                <button
                  onClick={applySidechainPump}
                  className="px-2.5 py-1 text-left hover:bg-zinc-800 text-zinc-200 flex items-center gap-1.5"
                >
                  <Waves size={11} className="text-cyan-400" />
                  Sidechain Pump
                </button>
                <div className="border-t border-zinc-800 my-0.5"></div>
                <button
                  onClick={clearAllPoints}
                  className="px-2.5 py-1 text-left hover:bg-zinc-800 text-red-400 flex items-center gap-1.5"
                >
                  <Trash2 size={11} />
                  Reset / Clear
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Interactive Automation Curve Lane */}
      <div className="flex-1 relative h-full overflow-hidden bg-zinc-950/70">
        {/* Subtle Horizontal Reference dB Guide Lines */}
        <div
          className="absolute w-full border-b border-zinc-900/60 pointer-events-none flex justify-end pr-2 text-[8px] font-mono text-zinc-700"
          style={{ top: `${valToY(100)}px` }}
        >
          0 dB (100%)
        </div>
        <div
          className="absolute w-full border-b border-zinc-900/40 pointer-events-none flex justify-end pr-2 text-[8px] font-mono text-zinc-800"
          style={{ top: `${valToY(50)}px` }}
        >
          -6 dB (50%)
        </div>
        <div
          className="absolute w-full border-b border-zinc-900/60 pointer-events-none flex justify-end pr-2 text-[8px] font-mono text-zinc-700"
          style={{ top: `${valToY(0)}px` }}
        >
          -inf dB (0%)
        </div>

        {/* Vertical Sequencer / Beat Lines */}
        {timelineTicks.map(tick => (
          <div
            key={`auto-tick-${tick}`}
            className="absolute h-full border-l border-zinc-900/50 pointer-events-none"
            style={{ left: `${tick * zoomLevel}px` }}
          ></div>
        ))}

        {/* SVG Curve Layer */}
        <svg
          ref={svgRef}
          className="absolute top-0 left-0 w-full h-full cursor-crosshair"
          style={{ width: `${maxTimelineDuration * zoomLevel}px`, height: `${laneHeight}px` }}
          onClick={handleSvgClick}
        >
          <defs>
            <linearGradient id={`grad-auto-${track.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={trackColor} stopOpacity={0.25} />
              <stop offset="100%" stopColor={trackColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {/* Shaded Area Under Automation Curve */}
          <path
            d={buildPolygonPath()}
            fill={`url(#grad-auto-${track.id})`}
            className="pointer-events-none"
          />

          {/* Connecting Envelope Stroke Line */}
          <path
            d={buildSvgPath()}
            fill="none"
            stroke={trackColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-colors pointer-events-none"
          />

          {/* Interactive Automation Nodes */}
          {points.map((pt) => {
            const cx = timeToX(pt.time);
            const cy = valToY(pt.value);
            const isHovered = hoveredPointId === pt.id;
            const isDragging = activeDraggingNodeId === pt.id;

            return (
              <g key={pt.id}>
                {/* Larger invisible touch circle for easy grabbing */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="12"
                  fill="transparent"
                  className="cursor-grab active:cursor-grabbing"
                  onMouseDown={(e) => handleNodeMouseDown(e, pt.id)}
                  onDoubleClick={(e) => handleDeletePoint(e, pt.id)}
                  onContextMenu={(e) => handleDeletePoint(e, pt.id)}
                  onMouseEnter={() => setHoveredPointId(pt.id)}
                  onMouseLeave={() => setHoveredPointId(null)}
                />

                {/* Visible node handle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isDragging ? 6 : isHovered ? 5.5 : 4}
                  fill="#ffffff"
                  stroke={trackColor}
                  strokeWidth={isDragging ? 3 : 2}
                  className="pointer-events-none transition-all duration-75 shadow-md shadow-black"
                />
              </g>
            );
          })}

          {/* Dynamic Playhead Tracking Dot */}
          <circle
            cx={timeToX(currentTime)}
            cy={valToY(currentAutomatedVal)}
            r="4.5"
            fill={automation.mode === 'write' ? '#f43f5e' : '#10b981'}
            stroke="#ffffff"
            strokeWidth="1.5"
            className="pointer-events-none shadow-lg shadow-black/80"
          />
        </svg>

        {/* Drag / Hover Tooltip Indicator */}
        {(dragPreview || hoveredPointId) && (
          <div
            className="absolute z-30 pointer-events-none bg-zinc-900/95 border border-zinc-700 text-zinc-100 text-[9px] font-mono px-1.5 py-0.5 rounded shadow-xl transform -translate-x-1/2 -translate-y-full"
            style={{
              left: `${timeToX(dragPreview ? dragPreview.time : (points.find(p => p.id === hoveredPointId)?.time || 0))}px`,
              top: `${valToY(dragPreview ? dragPreview.value : (points.find(p => p.id === hoveredPointId)?.value || 0)) - 6}px`
            }}
          >
            {dragPreview ? `${dragPreview.time.toFixed(2)}s: ${dragPreview.value}%` : (
              hoveredPointId ? `${points.find(p => p.id === hoveredPointId)?.time.toFixed(2)}s: ${points.find(p => p.id === hoveredPointId)?.value}%` : ''
            )}
          </div>
        )}

        {/* Helpful User Hint (rendered if only default points exist) */}
        {points.length <= 2 && (
          <div className="absolute top-2 right-4 pointer-events-none text-[9px] font-mono text-zinc-600 bg-zinc-950/70 px-2 py-0.5 rounded border border-zinc-900">
            Click anywhere on lane to add volume envelope nodes | Drag to shape | Double-click node to delete
          </div>
        )}
      </div>
    </div>
  );
};
