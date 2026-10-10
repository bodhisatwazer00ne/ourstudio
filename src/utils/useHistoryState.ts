/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Track, AudioClip } from '../types';

export interface HistorySnapshot {
  tracks: Track[];
  clips: AudioClip[];
  description: string;
}

export function useDawHistory(
  initialTracks: Track[],
  initialClips: AudioClip[],
  onStateRestored?: (tracks: Track[], clips: AudioClip[]) => void
) {
  const [past, setPast] = useState<HistorySnapshot[]>([]);
  const [future, setFuture] = useState<HistorySnapshot[]>([]);
  
  // Track current state in a ref to avoid stale closures
  const currentStateRef = useRef<{ tracks: Track[]; clips: AudioClip[] }>({
    tracks: initialTracks,
    clips: initialClips
  });

  // Keep ref updated when incoming initial state changes (e.g. switching projects)
  useEffect(() => {
    currentStateRef.current = { tracks: initialTracks, clips: initialClips };
  }, [initialTracks, initialClips]);

  const resetHistory = useCallback((tracks: Track[], clips: AudioClip[]) => {
    setPast([]);
    setFuture([]);
    currentStateRef.current = { tracks, clips };
  }, []);

  const pushSnapshot = useCallback((newTracks: Track[], newClips: AudioClip[], description: string) => {
    // Only push if there's an actual difference
    const prev = currentStateRef.current;
    setPast(prevPast => {
      const nextPast = [...prevPast, { tracks: prev.tracks, clips: prev.clips, description }];
      // Keep up to 40 steps
      if (nextPast.length > 40) {
        return nextPast.slice(nextPast.length - 40);
      }
      return nextPast;
    });
    setFuture([]);
    currentStateRef.current = { tracks: newTracks, clips: newClips };
  }, []);

  const undo = useCallback((): { tracks: Track[]; clips: AudioClip[] } | null => {
    if (past.length === 0) return null;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    const current = currentStateRef.current;

    setPast(newPast);
    setFuture(prevFuture => [
      { tracks: current.tracks, clips: current.clips, description: previous.description },
      ...prevFuture
    ]);

    currentStateRef.current = { tracks: previous.tracks, clips: previous.clips };
    if (onStateRestored) {
      onStateRestored(previous.tracks, previous.clips);
    }
    return { tracks: previous.tracks, clips: previous.clips };
  }, [past, onStateRestored]);

  const redo = useCallback((): { tracks: Track[]; clips: AudioClip[] } | null => {
    if (future.length === 0) return null;

    const next = future[0];
    const newFuture = future.slice(1);
    const current = currentStateRef.current;

    setPast(prevPast => [
      ...prevPast,
      { tracks: current.tracks, clips: current.clips, description: next.description }
    ]);
    setFuture(newFuture);

    currentStateRef.current = { tracks: next.tracks, clips: next.clips };
    if (onStateRestored) {
      onStateRestored(next.tracks, next.clips);
    }
    return { tracks: next.tracks, clips: next.clips };
  }, [future, onStateRestored]);

  return {
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    undoActionName: past.length > 0 ? past[past.length - 1].description : null,
    redoActionName: future.length > 0 ? future[0].description : null,
    pushSnapshot,
    undo,
    redo,
    resetHistory,
    currentStateRef
  };
}
