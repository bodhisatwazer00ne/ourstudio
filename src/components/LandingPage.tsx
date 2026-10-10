/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserAccount, DEMO_ACCOUNTS, getStoredUsers, saveUsers } from '../projectStorage';
import { Music, Lock, Mail, User, Sparkles, Shield, ArrowRight, Check } from 'lucide-react';

interface LandingPageProps {
  onLoginSuccess: (user: UserAccount) => void;
}

export default function LandingPage({ onLoginSuccess }: LandingPageProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [preferredRole, setPreferredRole] = useState<'Owner' | 'Producer' | 'Editor' | 'Viewer'>('Producer');
  const [errorMessage, setErrorMessage] = useState('');

  const users = getStoredUsers();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!foundUser) {
      setErrorMessage('Account not found with this email. Please register or use a demo account.');
      return;
    }

    if (foundUser.password && foundUser.password !== password) {
      setErrorMessage('Incorrect password. (Tip: Default password is "password")');
      return;
    }

    // Success
    onLoginSuccess(foundUser);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMessage('All fields are required.');
      return;
    }

    const emailExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (emailExists) {
      setErrorMessage('An account with this email already exists.');
      return;
    }

    // Create avatar from Unsplash or gravatar
    const avatarIndex = Math.floor(Math.random() * 4) + 1;
    const avatars = [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&fit=crop&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&fit=crop&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&fit=crop&q=80'
    ];

    const newUser: UserAccount = {
      id: `u-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      avatar: avatars[avatarIndex - 1],
      preferredRole,
      password: password
    };

    const updatedUsers = [...users, newUser];
    saveUsers(updatedUsers);
    onLoginSuccess(newUser);
  };

  // Quick Demo logins
  const handleQuickDemoLogin = (demoEmail: string) => {
    const found = users.find(u => u.email === demoEmail);
    if (found) {
      onLoginSuccess(found);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-800 flex flex-col justify-between relative" id="landing-page">
      {/* Background Accent Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/50 via-zinc-50/50 to-zinc-50 pointer-events-none z-0" />

      {/* Header */}
      <header className="relative z-10 max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between border-b border-zinc-200/80">
        <div className="flex items-center gap-2.5">
          <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-md flex items-center justify-center">
            <Music size={20} className="animate-pulse" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-zinc-900">
            OurStudio
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
          <span>v1.0.4</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Side: Editorial Pitch */}
        <div className="lg:col-span-7 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full text-[11px] font-mono font-medium text-blue-600">
              <Sparkles size={11} className="animate-spin-[spin_3s_linear_infinite]" />
              <span>Git-Powered Creative Mixer</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-display font-black tracking-tight leading-none text-zinc-900">
              OurStudio
            </h1>
            
            <p className="text-xl md:text-2xl font-medium tracking-tight text-zinc-600 leading-snug max-w-xl">
              Where music branch metadata meets <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent font-bold">real-time</span> collaborative studios.
            </p>
          </div>


        </div>

        {/* Right Side: Auth Forms Panel */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xl relative z-10 space-y-6">
            <div className="space-y-1.5 border-b border-zinc-100 pb-4">
              <h2 className="text-lg font-display font-bold text-zinc-900">
                {isRegistering ? 'Create Artist Account' : 'Sign in to OurStudio'}
              </h2>
              <p className="text-xs text-zinc-500">
                {isRegistering
                  ? 'Join the studio crew to start versioning and recording.'
                  : 'Welcome back! Log in to access your musical repositories.'}
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-start gap-2 leading-relaxed">
                <span className="font-bold">Error:</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Core Form */}
            {isRegistering ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Artist Display Name</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-3.5 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="e.g. Mike Shinoda"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2.5 pl-9 pr-4 text-xs text-zinc-800 placeholder-zinc-400 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Email Address</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-3.5 text-zinc-400" />
                    <input
                      type="email"
                      placeholder="mike@ourstudio.co"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2.5 pl-9 pr-4 text-xs text-zinc-800 placeholder-zinc-400 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Workspace Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-3.5 text-zinc-400" />
                    <input
                      type="password"
                      placeholder="Password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2.5 pl-9 pr-4 text-xs text-zinc-800 placeholder-zinc-400 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Preferred Studio Role</label>
                  <div className="relative">
                    <Shield size={14} className="absolute left-3 top-3.5 text-zinc-400" />
                    <select
                      value={preferredRole}
                      onChange={(e) => setPreferredRole(e.target.value as any)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2.5 pl-9 pr-4 text-xs text-zinc-700 focus:bg-white focus:border-blue-500 focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="Producer">Producer (Mix & Arrange)</option>
                      <option value="Editor">Editor (Write Automation & Audio)</option>
                      <option value="Viewer">Viewer (Read-Only Monitor)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition duration-200 flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/10 cursor-pointer"
                >
                  <span>Sign Up & Open Studio</span>
                  <ArrowRight size={13} />
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Artist Email</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-3.5 text-zinc-400" />
                    <input
                      type="email"
                      placeholder="john@ourstudio.co"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2.5 pl-9 pr-4 text-xs text-zinc-800 placeholder-zinc-400 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Workspace Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-3.5 text-zinc-400" />
                    <input
                      type="password"
                      placeholder="Password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2.5 pl-9 pr-4 text-xs text-zinc-800 placeholder-zinc-400 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition duration-200 flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/10 cursor-pointer"
                >
                  <span>Enter Workshop</span>
                  <ArrowRight size={13} />
                </button>
              </form>
            )}

            {/* Toggle Login/Register */}
            <div className="text-center">
              <button
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setErrorMessage('');
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold transition cursor-pointer"
              >
                {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Register Here"}
              </button>
            </div>

            {/* Quick Demo Access Console */}
            <div className="border-t border-zinc-100 pt-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">
                  Instant Collaboration Demo Accounts
                </span>
                <span className="text-[9px] text-blue-600 font-mono font-medium">1-Click Sign In</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map(demo => (
                  <button
                    key={demo.id}
                    onClick={() => handleQuickDemoLogin(demo.email)}
                    className="p-2 bg-zinc-50 hover:bg-zinc-100/90 border border-zinc-200/80 rounded-lg text-left transition cursor-pointer flex items-center gap-2 group"
                  >
                    <img
                      src={demo.avatar}
                      alt={demo.name}
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full object-cover border border-zinc-300 group-hover:border-blue-400 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-[10.5px] font-bold text-zinc-800 leading-tight truncate">
                        {demo.name}
                      </div>
                      <div className="text-[8.5px] text-zinc-500 font-mono font-semibold uppercase">
                        {demo.preferredRole}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl w-full mx-auto px-6 py-6 border-t border-zinc-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 font-sans">
        <p>&copy; 2026 OurStudio, Inc. All rights reserved.</p>
        <div className="flex gap-4">
          <span className="hover:text-zinc-700 cursor-pointer">Security Protocol</span>
          <span>|</span>
          <span className="hover:text-zinc-700 cursor-pointer">STOMP Specs</span>
          <span>|</span>
          <span className="hover:text-zinc-700 cursor-pointer">RDBMS Schema Docs</span>
        </div>
      </footer>
    </div>
  );
}
