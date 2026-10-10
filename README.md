
Our Studio is proposed as a collaborative, non-destructive Digital Audio Workstation that combines
common audio-production functions with software-development-inspired version control. The
project addresses the difficulty of managing multiple audio versions, avoiding destructive
overwrites, and coordinating feedback when artists work remotely. Instead of treating a song as a
single file, the system represents the project as a repository of audio assets and lightweight projectstate data.
The proposed system allows users to register, create projects, upload or record audio, invite
collaborators, assign role-based permissions, edit tracks, create commits, create experimental
branches, review changes, and merge approved work into the main project. A WebSocket-based
communication layer is intended to support real-time chat and timeline-linked comments. The
design also proposes hashing audio assets so that multiple project states or branches can reference
the same physical audio file rather than duplicating it.
The expected outcome is a more organized collaborative audio workflow with traceable history,
safer experimentation, controlled access, and reduced unnecessary storage duplication. The synopsis
estimates that the asset-hashing and JSON-state approach could reduce server storage requirements
by about 70% compared with traditional duplicated save files; this is an expected estimate and
would need experimental validation during implementation. 
