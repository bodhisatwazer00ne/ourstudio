/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Palette, AlertCircle } from 'lucide-react';

interface AddTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTrack: (name: string, color: string) => void;
  defaultIndex: number;
}

const TRACK_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Zinc', value: '#71717a' }
];

export default function AddTrackModal({
  isOpen,
  onClose,
  onAddTrack,
  defaultIndex
}: AddTrackModalProps) {
  // Start with empty string so the user provides their own custom name
  const [trackName, setTrackName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedColor, setSelectedColor] = useState(TRACK_COLORS[0].value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Do NOT auto-populate with preset or automatic names
      setTrackName('');
      setErrorMessage('');
      const defaultColor = TRACK_COLORS[(defaultIndex - 1) % TRACK_COLORS.length]?.value || TRACK_COLORS[0].value;
      setSelectedColor(defaultColor);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen, defaultIndex]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = trackName.trim();
    if (!trimmed) {
      setErrorMessage('Please enter a name for the track.');
      inputRef.current?.focus();
      return;
    }
    onAddTrack(trimmed, selectedColor);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-900 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-3 h-8 rounded-full transition-colors"
              style={{ backgroundColor: selectedColor }}
            />
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Add New Track</h3>
              <p className="text-[11px] text-zinc-400">Name your track and choose a color</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Track Name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={trackName}
              onChange={(e) => {
                setTrackName(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="Enter track name..."
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-lg px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              maxLength={40}
              autoFocus
            />
            {errorMessage && (
              <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1 font-medium">
                <AlertCircle size={13} />
                <span>{errorMessage}</span>
              </p>
            )}
          </div>

          {/* Color Selection Palette */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
              <Palette size={13} className="text-zinc-400" />
              <span>Track Color</span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              {TRACK_COLORS.map(c => {
                const isSelected = selectedColor === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setSelectedColor(c.value)}
                    className={`h-8 rounded-lg flex items-center justify-center transition border cursor-pointer relative ${
                      isSelected ? 'border-white scale-105 shadow-md' : 'border-transparent hover:scale-102 opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  >
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-white shadow-xs" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-900">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer shadow-md"
            >
              <Plus size={14} />
              <span>Create Track</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
