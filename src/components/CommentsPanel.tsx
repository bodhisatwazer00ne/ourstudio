/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TimelineComment } from '../types';
import { MessageSquare, Clock, Plus, Trash2, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';

interface CommentsPanelProps {
  comments: TimelineComment[];
  onAddComment: (text: string, timestamp: number) => void;
  onDeleteComment: (id: string) => void;
  currentTime: number;
  onSeek: (seconds: number) => void;
  onAddActivity: (type: string, message: string) => void;
  isCollapsible?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function CommentsPanel({
  comments,
  onAddComment,
  onDeleteComment,
  currentTime,
  onSeek,
  onAddActivity,
  isCollapsible = false,
  isCollapsed = false,
  onToggleCollapse
}: CommentsPanelProps) {
  const [commentText, setCommentText] = useState('');
  const [commentTime, setCommentTime] = useState<string>('');

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    // Default to current playhead time if left blank
    const timestamp = commentTime.trim() === ''
      ? parseFloat(currentTime.toFixed(1))
      : Math.max(0, parseFloat(parseFloat(commentTime).toFixed(1)));

    onAddComment(commentText.trim(), timestamp);
    onAddActivity('NEW_COMMENT', `Posted a timeline comment at ${timestamp.toFixed(1)}s: "${commentText.trim()}"`);
    setCommentText('');
    setCommentTime('');
  };

  const handleSeekToComment = (seconds: number) => {
    onSeek(seconds);
  };

  return (
    <div className={`bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex flex-col gap-4 transition-all duration-200 ${isCollapsed ? 'pb-2 h-auto' : 'h-full'}`} id="timeline-comments-panel">
      {/* Panel Header */}
      <div 
        className={`flex items-center justify-between ${isCollapsed ? '' : 'border-b border-zinc-900 pb-3'} ${isCollapsible ? 'cursor-pointer select-none' : ''}`}
        onClick={() => {
          if (isCollapsible && onToggleCollapse) {
            onToggleCollapse();
          }
        }}
      >
        <div className="flex items-center gap-1.5 text-zinc-350">
          <MessageSquare size={16} className="text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider">Timeline Feedbacks</h3>
        </div>
        <div className="flex items-center gap-2">
          {!isCollapsed && <span className="text-[10px] text-zinc-500 font-mono">Timestamped Notes</span>}
          {isCollapsible && onToggleCollapse && (
            <button
              type="button"
              className="text-zinc-500 hover:text-white transition p-0.5"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse();
              }}
            >
              {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Post a Comment Form */}
          <form onSubmit={handlePostComment} className="space-y-2 bg-zinc-900/40 p-3 rounded-lg border border-zinc-800">
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Feedback message..."
                  required
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full bg-zinc-950 text-zinc-200 text-xs px-2.5 py-1.5 rounded border border-zinc-800 focus:outline-none"
                />
              </div>
              <div className="w-20 relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder={`${currentTime.toFixed(1)}s`}
                  value={commentTime}
                  onChange={(e) => setCommentTime(e.target.value)}
                  className="w-full bg-zinc-950 text-zinc-200 text-xs px-2.5 py-1.5 rounded border border-zinc-800 focus:outline-none pr-6 font-mono"
                  title="Leave empty to use current playhead position"
                />
                <span className="absolute right-1.5 top-2 text-[9px] text-zinc-500">s</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                <Clock size={10} />
                <span>Active playhead is at <strong className="text-blue-400">{currentTime.toFixed(1)}s</strong></span>
              </span>
              <button
                type="submit"
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] rounded transition flex items-center gap-1"
              >
                <Plus size={12} />
                <span>Post Comment</span>
              </button>
            </div>
          </form>

          {/* Scrollable Comments List */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[300px]">
            {comments.length === 0 ? (
              <div className="text-center py-10 text-zinc-600 bg-zinc-900/10 rounded-lg border border-zinc-900 border-dashed">
                <MessageSquare className="mx-auto text-zinc-800 mb-2" size={20} />
                <p className="text-xs">No feedback comments recorded yet. Add notes at timestamp markers.</p>
              </div>
            ) : (
              comments
                    .slice()
                    .sort((a, b) => a.timestamp - b.timestamp) // Sort chronological by timestamp
                    .map(comment => {
                      const isNearCursor = Math.abs(currentTime - comment.timestamp) < 1.0;

                      return (
                        <div
                          key={comment.id}
                          onClick={() => handleSeekToComment(comment.timestamp)}
                          className={`p-3 rounded-lg border cursor-pointer select-none transition relative group ${
                            isNearCursor
                              ? 'bg-blue-950/20 border-blue-500/30'
                              : 'bg-zinc-950 hover:bg-zinc-900/40 border-zinc-900'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-bold font-mono flex items-center justify-center uppercase shrink-0">
                                {comment.author.slice(0, 2)}
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-zinc-200">{comment.author}</span>
                                <span className="text-[9px] text-zinc-550 ml-2">{comment.createdAt}</span>
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteComment(comment.id);
                                onAddActivity('DELETE_COMMENT', `Removed feedback comment at ${comment.timestamp.toFixed(1)}s`);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400 rounded transition absolute right-2 top-2"
                              title="Delete feedback"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          <p className="text-xs text-zinc-300 mt-2 leading-relaxed pl-1 font-sans">
                            {comment.text}
                          </p>

                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-900/40 text-[10px] text-zinc-500">
                            <div className="flex items-center gap-1 font-mono text-blue-400 bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800">
                              <Clock size={10} />
                              <span>{comment.timestamp.toFixed(1)}s</span>
                            </div>
                            <span className="text-[9px] text-zinc-500 group-hover:text-blue-400 flex items-center gap-0.5 transition">
                              Seek Cursor
                              <ArrowRight size={10} />
                            </span>
                          </div>
                        </div>
                      );
                    })
            )}
          </div>
        </>
      )}
    </div>
  );
}
