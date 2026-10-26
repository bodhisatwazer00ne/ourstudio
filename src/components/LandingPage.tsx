/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserAccount, DEMO_ACCOUNTS, getStoredUsers, saveUsers, fetchUsersFromFirestore } from '../projectStorage';
import { ProjectRole } from '../types';
import { Music, Lock, User, Shield, ArrowRight, Check, AtSign } from 'lucide-react';

interface LandingPageProps {
  onLoginSuccess: (user: UserAccount) => void;
}

export default function LandingPage({ onLoginSuccess }: LandingPageProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [preferredRole, setPreferredRole] = useState<ProjectRole>('Producer');
  const [errorMessage, setErrorMessage] = useState('');
  const [users, setUsers] = useState<UserAccount[]>(() => getStoredUsers());

  // Background fetch from Firestore so newly registered cloud accounts sync immediately
  useEffect(() => {
    fetchUsersFromFirestore().then(cloudUsers => {
      if (cloudUsers && cloudUsers.length > 0) {
        setUsers(cloudUsers);
      }
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const query = usernameInput.trim().toLowerCase();
    let currentUsers = users;
    let foundUser = currentUsers.find(u => 
      (u.username && u.username.toLowerCase() === query) ||
      (u.email && u.email.toLowerCase() === query)
    );

    // If not found in local cache, query Firestore directly for any recently registered accounts from other devices
    if (!foundUser) {
      try {
        const freshCloudUsers = await fetchUsersFromFirestore();
        if (freshCloudUsers && freshCloudUsers.length > 0) {
          setUsers(freshCloudUsers);
          currentUsers = freshCloudUsers;
          foundUser = currentUsers.find(u => 
            (u.username && u.username.toLowerCase() === query) ||
            (u.email && u.email.toLowerCase() === query)
          );
        }
      } catch (err) {
        console.warn('Cloud login fetch error:', err);
      }
    }

    if (!foundUser) {
      setErrorMessage(`Account "${usernameInput}" not found. Please register or choose a demo persona below.`);
      return;
    }

    if (foundUser.password && foundUser.password !== password) {
      setErrorMessage('Incorrect password. (Tip: Demo accounts password is "password")');
      return;
    }

    onLoginSuccess(foundUser);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanUsername = usernameInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!cleanUsername) {
      setErrorMessage('Please enter a valid alphanumeric username handle.');
      return;
    }

    if (!name.trim() || !password.trim()) {
      setErrorMessage('Display Name, Username, and Password are all required.');
      return;
    }

    const usernameExists = users.some(u => 
      u.username && u.username.toLowerCase() === cleanUsername
    );

    if (usernameExists) {
      setErrorMessage(`The username "@${cleanUsername}" is already taken. Please choose another.`);
      return;
    }

    const newUser: UserAccount = {
      id: `u-${Date.now()}`,
      username: cleanUsername,
      name: name.trim(),
      email: `${cleanUsername}@ourstudio.co`,
      preferredRole,
      password: password
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    onLoginSuccess(newUser);
  };

  const handleQuickDemoLogin = (username: string) => {
    const found = users.find(u => u.username.toLowerCase() === username.toLowerCase());
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
          <span className="font-display font-bold text-lg tracking-tight text-blue-600">
            OurStudio
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
          <span>Cloud Edition</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Side: Clean minimal title & tagline only */}
        <div className="lg:col-span-7 space-y-4">
          <h1 className="text-5xl md:text-6xl font-display font-black tracking-tight leading-none text-blue-600">
            OurStudio
          </h1>
          <p className="text-xl md:text-2xl font-medium tracking-tight text-zinc-600 leading-snug max-w-xl">
            Collaborative and version controlled DAW
          </p>
        </div>

        {/* Right Side: Authentication Forms Panel */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xl relative z-10 space-y-6">
            <div className="space-y-1.5 border-b border-zinc-100 pb-4">
              <h2 className="text-lg font-display font-bold text-zinc-900">
                {isRegistering ? 'Create Artist Account' : 'Sign in to OurStudio'}
              </h2>
              <p className="text-xs text-zinc-500">
                {isRegistering
                  ? 'Register your unique username to start creating and collaborating.'
                  : 'Enter your credentials to access your audio workspaces.'}
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-start gap-2 leading-relaxed">
                <span className="font-bold">Error:</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Auth Form */}
            {isRegistering ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Username Handle</label>
                  <div className="relative">
                    <AtSign size={14} className="absolute left-3 top-3.5 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="e.g. composer99"
                      required
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2.5 pl-9 pr-4 text-xs text-zinc-800 placeholder-zinc-400 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Artist Full Name</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-3.5 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="e.g. Alexander Wright"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2.5 pl-9 pr-4 text-xs text-zinc-800 placeholder-zinc-400 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-3.5 text-zinc-400" />
                    <input
                      type="password"
                      placeholder="Enter password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2.5 pl-9 pr-4 text-xs text-zinc-800 placeholder-zinc-400 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Default Production Role</label>
                  <div className="relative">
                    <Shield size={14} className="absolute left-3 top-3.5 text-zinc-400" />
                    <select
                      value={preferredRole}
                      onChange={(e) => setPreferredRole(e.target.value as ProjectRole)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2.5 pl-9 pr-4 text-xs text-zinc-700 focus:bg-white focus:border-blue-500 focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="Producer">Producer (Mix & Arrange)</option>
                      <option value="Editor">Editor (Write Automation & Audio)</option>
                      <option value="Track Editor">Track Editor (Scoped Track Lane Access)</option>
                      <option value="Viewer">Viewer (Read-Only Monitor)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition duration-200 flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/10 cursor-pointer"
                >
                  <span>Register & Open Studio</span>
                  <ArrowRight size={13} />
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Username or Email</label>
                  <div className="relative">
                    <AtSign size={14} className="absolute left-3 top-3.5 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="e.g. bodhisatwa or santosh"
                      required
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2.5 pl-9 pr-4 text-xs text-zinc-800 placeholder-zinc-400 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Password</label>
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
                  <span>Sign In</span>
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
                {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Register with Username"}
              </button>
            </div>

            {/* Quick Demo Access Console */}
            <div className="border-t border-zinc-100 pt-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">
                  Quick Demo Accounts
                </span>
                <span className="text-[9px] text-blue-600 font-mono font-medium">1-Click Sign In</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DEMO_ACCOUNTS.map(demo => (
                  <button
                    key={demo.id}
                    onClick={() => handleQuickDemoLogin(demo.username)}
                    className="p-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg text-left transition cursor-pointer flex flex-col justify-center group"
                  >
                    <div className="text-[11px] font-bold text-zinc-800 leading-tight truncate group-hover:text-blue-600">
                      {demo.name}
                    </div>
                    <div className="text-[9px] text-zinc-500 font-mono truncate">
                      @{demo.username}
                    </div>
                    <div className="text-[8px] text-blue-600 font-mono font-semibold uppercase mt-0.5">
                      {demo.preferredRole}
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
        <p>&copy; 2026 OurStudio. Collaborative, version-controlled music production.</p>
      </footer>
    </div>
  );
}
