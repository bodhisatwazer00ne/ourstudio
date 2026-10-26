/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AutomationPoint } from '../types';

/**
 * Calculates the interpolated automation value at a specific point in timeline time.
 */
export function getAutomatedValueAtTime(
  points: AutomationPoint[] | undefined,
  time: number,
  fallbackValue: number = 80
): number {
  if (!points || points.length === 0) {
    return fallbackValue;
  }

  // Ensure points are sorted by time
  const sorted = [...points].sort((a, b) => a.time - b.time);

  // If time is before the first point
  if (time <= sorted[0].time) {
    return sorted[0].value;
  }

  // If time is after the last point
  if (time >= sorted[sorted.length - 1].time) {
    return sorted[sorted.length - 1].value;
  }

  // Find surrounding points
  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];

    if (time >= p1.time && time <= p2.time) {
      const dt = p2.time - p1.time;
      if (dt <= 0.0001) return p1.value;

      const progress = (time - p1.time) / dt;
      // Smooth linear interpolation clamped between 0 and 100
      const interpolated = p1.value + (p2.value - p1.value) * progress;
      return Math.max(0, Math.min(100, Math.round(interpolated * 10) / 10));
    }
  }

  return fallbackValue;
}

/**
 * Converts 0-100 linear fader value to standard audio decibel string.
 */
export function formatVolumeDb(val: number): string {
  if (val <= 0.001) return '-inf dB';
  if (val >= 99.5) return '0.0 dB';
  const db = 20 * Math.log10(val / 100);
  return `${db.toFixed(1)} dB`;
}

/**
 * Generates automated Fade-In envelope nodes.
 */
export function generateFadeInPreset(duration: number = 4, targetValue: number = 85): AutomationPoint[] {
  return [
    { id: `ap-${Date.now()}-1`, time: 0, value: 0 },
    { id: `ap-${Date.now()}-2`, time: Math.max(0.5, duration), value: targetValue }
  ];
}

/**
 * Generates automated Fade-Out envelope nodes.
 */
export function generateFadeOutPreset(startTime: number = 24, endTime: number = 32, startValue: number = 85): AutomationPoint[] {
  return [
    { id: `ap-${Date.now()}-1`, time: Math.max(0, startTime), value: startValue },
    { id: `ap-${Date.now()}-2`, time: Math.max(startTime + 0.5, endTime), value: 0 }
  ];
}

/**
 * Generates 4-on-the-floor EDM / dance sidechain pump ducking envelope.
 */
export function generateSidechainPumpPreset(duration: number = 32, beatDuration: number = 0.5, duckVal: number = 20, peakVal: number = 85): AutomationPoint[] {
  const points: AutomationPoint[] = [];
  let t = 0;
  let idCounter = 1;

  while (t < duration) {
    // Duck at on-beat
    points.push({ id: `ap-sc-${Date.now()}-${idCounter++}`, time: Math.round(t * 100) / 100, value: duckVal });
    // Recover by off-beat
    const recoverTime = Math.min(duration, t + beatDuration * 0.7);
    points.push({ id: `ap-sc-${Date.now()}-${idCounter++}`, time: Math.round(recoverTime * 100) / 100, value: peakVal });
    t += beatDuration;
  }

  return points;
}
