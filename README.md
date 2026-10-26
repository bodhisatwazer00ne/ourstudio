# OurStudio v.4.2

> **Collaborative, Version-Controlled Cloud Digital Audio Workstation (DAW)**

OurStudio is a web-based, multi-user DAW and audio project version control platform designed for remote music producers, mix engineers, vocalists, and arrangers. It combines an interactive multi-track Web Audio timeline and channel mixer with Git-like branching, commit history, merge conflict resolution, and role-based collaboration.

---

## Key Highlights

- **Multi-Track Web Audio DAW**: Low-latency multi-channel audio playback, arrangement timeline, live microphone stem recording, and real-time waveform visualization.
- **Channel Strip & DSP FX**: Per-track Volume faders, Panning, Mute/Solo, 3-Band Parametric EQ, Studio Reverb, Stereo Delay, Harmonic Distortion, and Dynamics Compressor.
- **Envelope Automation**: Visual automation sub-tracks for Volume and Pan with editable curve points and Read / Write / Off automation modes.
- **Clip & Track Permissions**: Lock individual audio clips or entire stem tracks to prevent accidental edits while collaborating.
- **Git-like Audio Version Control**:
  - Fork isolated branches (`main`, stem/instrument branches).
  - Commit & push versions with custom semantic names and descriptions.
  - Branch self-merging to capture direct branch milestones as distinct versions.
  - Merge Requests (MRs) with audio and parameter diff inspection.
  - Interactive track merge conflict resolution dialog ("Which track of which branch should be kept in the version?").
  - Clean 1-to-1 version display without redundant auto-synthesized duplicate commits.
- **Role-Based Collaboration (RBAC)**:
  - Roles: `Owner`, `Producer`, `Editor`, `Track Editor`, and `Viewer`.
  - Invite collaborators by `@username` or registered email with instant verified match cards.
  - Top-right Collaborator Switcher strictly filtered to active project team members for rapid role/persona simulation.
  - Timestamped timeline comments and live project audit log.
- **Mixdown & Stem Export**: Offline Web Audio summing to render stereo master mixes as `.mp3` (via `lamejs`) or lossless `.wav`, plus `.osp` (OurStudio Package) metadata snapshots.
- **Cloud Persistence**: Firebase Firestore integration for synchronized multi-device cloud accounts, project structures, and branch state.

---

## Architecture Overview

```
├── src/
│   ├── components/
│   │   ├── AddTrackModal.tsx         # Modal for adding new audio or instrument tracks
│   │   ├── ArchitectureDocs.tsx      # System architecture and REST/WebSocket schema documentation
│   │   ├── AutomationLane.tsx        # Visual bezier/point automation editor for Volume & Pan
│   │   ├── CollaborationActivity.tsx # Real-time project activity and event audit log
│   │   ├── CollaboratorSwitcher.tsx  # Top-right switcher strictly scoped to project team members
│   │   ├── CommentsPanel.tsx         # Timestamped timeline commentary and feedback
│   │   ├── DAWMixer.tsx              # Multi-channel studio mixer with DSP effects and meters
│   │   ├── DAWTimeline.tsx           # Multi-track arrangement timeline, waveforms & transport controls
│   │   ├── ExportMixModal.tsx        # Audio summing and master mix export (WAV / MP3)
│   │   ├── LandingPage.tsx           # Artist authentication, registration, and quick demo login
│   │   ├── MergeConflictModal.tsx    # Interactive per-track branch conflict resolver
│   │   ├── MergeRequests.tsx         # Pull request management, code/audio diffs, approval controls
│   │   ├── ProjectDirectory.tsx      # Project dashboard, creation, filtering, and management
│   │   ├── ProjectVersionsTab.tsx    # Deduplicated project version packages, lineage, and restores
│   │   ├── TeamManagement.tsx        # Collaborator invitation and track assignment permissions
│   │   └── VersionControl.tsx        # Branching, commits, push, and self-merge controls
│   ├── utils/
│   │   ├── audioEngine.ts            # Web Audio API engine, routing graphs, summing and master bus
│   │   ├── automationUtils.ts         # Automation curve evaluation and parameter interpolation
│   │   └── useHistoryState.ts        # Undo / Redo history state management
│   ├── firebase.ts                   # Firebase Firestore & Auth client configuration
│   ├── projectStorage.ts             # Cloud and local storage repository layer
│   ├── mockData.ts                   # Default projects, stems, audio clips, and demo accounts
│   ├── types.ts                      # Core TypeScript interfaces, project roles, and data schemas
│   ├── App.tsx                       # Root container, active project routing, and state orchestration
│   └── main.tsx                      # React DOM root entry point
├── index.html                        # HTML entry point
├── package.json                      # Project metadata, dependencies, and build scripts
├── vite.config.ts                    # Vite build configuration
└── firestore.rules                   # Security rules for Firestore collections
```

---

## Role-Based Access Control (RBAC) Matrix

| Permission | Owner | Producer | Editor | Track Editor | Viewer |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Manage Project Settings & Team** | Yes | No | No | No | No |
| **Approve / Merge Pull Requests** | Yes | Yes | No | No | No |
| **Create Branches & Open MRs** | Yes | Yes | Yes | No | No |
| **Add / Delete Audio Tracks** | Yes | Yes | Configurable | No | No |
| **Record & Edit Assigned Tracks** | Yes | Yes | Yes | Assigned Only | No |
| **Audition, Comment & Export Mix** | Yes | Yes | Yes | Yes | Yes |

---

## Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm** or **bun** / **yarn**

### Installation

1. Clone or download the repository:
   ```bash
   git clone <repository-url>
   cd ourstudio
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## Scripts

- `npm run dev` - Launches the Vite development server on port 3000 with network host access.
- `npm run build` - Builds the optimized production bundle into the `dist/` folder.
- `npm run preview` - Locally previews the production build.
- `npm run lint` - Validates TypeScript types across the entire codebase (`tsc --noEmit`).
- `npm run clean` - Removes build artifacts and previous bundles.

---

## Tech Stack

- **UI & Framework**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Audio DSP & Synthesis**: Native Web Audio API (`AudioContext`, `GainNode`, `StereoPannerNode`, `BiquadFilterNode`, `ConvolverNode`, `DynamicsCompressorNode`, `WaveShaperNode`)
- **MP3 Encoding**: [lamejs](https://github.com/zhuker/lamejs)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Build Tool**: [Vite 6](https://vitejs.dev/)
- **Backend & Cloud Persistence**: [Firebase Firestore](https://firebase.google.com/products/firestore)

---

## License

This project is licensed under the Apache-2.0 License.
