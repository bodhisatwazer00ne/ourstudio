/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DATABASE_SCHEMA, REST_API_ENDPOINTS, WEBSOCKET_EVENTS } from '../mockData';
import { Database, FileCode, Network, Radio, HelpCircle, Terminal, Layers, ArrowRight } from 'lucide-react';

export default function ArchitectureDocs() {
  const [activeSubTab, setActiveSubTab] = useState<'system' | 'database' | 'api' | 'websocket'>('system');
  const [selectedTable, setSelectedTable] = useState<string>(DATABASE_SCHEMA[0].name);
  const [selectedEndpointPath, setSelectedEndpointPath] = useState<string>(REST_API_ENDPOINTS[0].path);
  const [selectedWsEvent, setSelectedWsEvent] = useState<string>(WEBSOCKET_EVENTS[0].event);

  const currentTable = DATABASE_SCHEMA.find(t => t.name === selectedTable) || DATABASE_SCHEMA[0];
  const currentEndpoint = REST_API_ENDPOINTS.find(e => e.path === selectedEndpointPath) || REST_API_ENDPOINTS[0];
  const currentWsEvent = WEBSOCKET_EVENTS.find(w => w.event === selectedWsEvent) || WEBSOCKET_EVENTS[0];

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-5 flex flex-col h-full gap-5" id="architecture-docs-container">
      {/* Tab Header with Sub-Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-900 pb-3">
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-blue-400" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-350">Phase 1 Blueprint Specifications</h3>
            <p className="text-[10px] text-zinc-550">System architecture, DDL migrations, API schemas, and WebSocket events.</p>
          </div>
        </div>

        {/* Navigation toggles */}
        <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-805">
          <button
            onClick={() => setActiveSubTab('system')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
              activeSubTab === 'system' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            System & ERD
          </button>
          <button
            onClick={() => setActiveSubTab('database')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
              activeSubTab === 'database' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Postgres Schema
          </button>
          <button
            onClick={() => setActiveSubTab('api')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
              activeSubTab === 'api' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            REST API Spec
          </button>
          <button
            onClick={() => setActiveSubTab('websocket')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
              activeSubTab === 'websocket' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            WebSockets STOMP
          </button>
        </div>
      </div>

      {/* SUB-TAB PANELS */}

      {/* 1. System Topology and ERD */}
      {activeSubTab === 'system' && (
        <div className="space-y-6 animate-fade-in overflow-y-auto">
          {/* Conceptual Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-zinc-900/30 p-4 rounded-lg border border-zinc-800">
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-blue-400 flex items-center gap-1">
                <Network size={12} />
                SYSTEM ARCHITECTURE DESIGN
              </span>
              <h4 className="text-sm font-semibold text-zinc-200">The "OurStudio" Git-for-Music Core</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Rather than treating audio tracks as monolithic blocks that are duplicated on every edit, OurStudio separates
                <strong> immutable raw audio binaries</strong> from <strong>reactive versioned metadata sheets</strong>.
              </p>
              <ul className="text-xs text-zinc-500 list-disc list-inside space-y-1">
                <li>Binary assets are written once and stored in distributed Object Storage (MinIO/S3).</li>
                <li>Version control, fader adjustments, and branching execute strictly on lightweight JSON schemas.</li>
                <li>Conflicts are resolved using a <em>last-write-wins</em> state policy with full snapshot history allowing instant rollback.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-blue-400 flex items-center gap-1">
                <Terminal size={12} />
                PRODUCTION TECH STACK METRIC
              </span>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div className="bg-zinc-950 p-2 rounded border border-zinc-900">
                  <div className="text-zinc-550">API/Websocket</div>
                  <div className="text-zinc-300 font-semibold">Java 21 / Spring Boot 3</div>
                </div>
                <div className="bg-zinc-950 p-2 rounded border border-zinc-900">
                  <div className="text-zinc-550">RDBMS Storage</div>
                  <div className="text-zinc-300 font-semibold">PostgreSQL (Normalized)</div>
                </div>
                <div className="bg-zinc-950 p-2 rounded border border-zinc-900">
                  <div className="text-zinc-550">Pub/Sub & Cache</div>
                  <div className="text-zinc-300 font-semibold">Redis (STOMP broker)</div>
                </div>
                <div className="bg-zinc-950 p-2 rounded border border-zinc-900">
                  <div className="text-zinc-550">Object Storage</div>
                  <div className="text-zinc-300 font-semibold">MinIO S3 Compatible</div>
                </div>
              </div>
              <div className="text-[10px] text-zinc-550 leading-normal pt-1.5 flex items-center gap-1.5">
                <HelpCircle size={12} />
                <span>WebSocket payloads convey single operations (e.g. <code>MOVE_CLIP</code>) avoiding network bottlenecks.</span>
              </div>
            </div>
          </div>

          {/* ASCII ERD / System topology visualization */}
          <div className="space-y-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Relational Database ER-Diagram</span>
            <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800 font-mono text-xs text-blue-400 overflow-x-auto whitespace-pre">
{` +------------+          +---------------+          +------------+
 |   USERS    |          |   PROJECTS    |          |   SONGS    |
 |------------|          |---------------|          |------------|
 | id (PK)    |<----+    | id (PK)       |<----+    | id (PK)    |
 | email      |     |    | name          |     |    | project_id |o--+
 | pass_hash  |     +---o| owner_id      |     +---o| title      |   |
 +------------+          +---------------+          | tempo_bpm  |   |
       |                         |                  +------------+   |
       |                         |                        |          |
       |                         |                        o          |
       |                         |                 +------------+    |
       |  +----------------------+                 |  BRANCHES  |    |
       |  |                                        |------------|    |
       |  o                                        | id (PK)    |    |
 +---------------+                                 | song_id    |o---+
 | AUDIO_ASSETS  |                                 | name       |
 |---------------|                                 | metadata   |
 | id (PK)       |                                 +------------+
 | project_id    |                                       |
 | file_key (S3) |                                       o
 | size_bytes    |                                 +-----------------+
 +---------------+                                 | VERSION_COMMITS |
                                                   |-----------------|
                                                   | id (PK)         |
                                                   | branch_id       |o--+
                                                   | author_id       |o--+
                                                   | version_number  |
                                                   | snapshot_json   |
                                                   +-----------------+`}
            </div>
          </div>
        </div>
      )}

      {/* 2. PostgreSQL DDL Migrations */}
      {activeSubTab === 'database' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 animate-fade-in flex-1 overflow-hidden">
          {/* Left table sidebar */}
          <div className="md:col-span-4 flex flex-col gap-2 overflow-y-auto pr-1 h-[320px] md:h-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1 block">PostgreSQL Tables</span>
            {DATABASE_SCHEMA.map(table => (
              <div
                key={table.name}
                onClick={() => setSelectedTable(table.name)}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition select-none ${
                  selectedTable === table.name
                    ? 'bg-zinc-900 border-blue-500/40 text-white'
                    : 'bg-zinc-950 hover:bg-zinc-900/40 border-zinc-900 text-zinc-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Database size={12} className={selectedTable === table.name ? 'text-blue-400' : 'text-zinc-600'} />
                  <span className="text-xs font-bold font-mono">{table.name}</span>
                </div>
                <p className="text-[10px] text-zinc-550 line-clamp-1 mt-1 leading-normal">{table.description}</p>
              </div>
            ))}
          </div>

          {/* Right schema columns + DDL view */}
          <div className="md:col-span-8 bg-zinc-900/30 border border-zinc-800 rounded-lg p-4 flex flex-col justify-between overflow-y-auto h-[320px] md:h-auto">
            <div className="space-y-4">
              <div className="border-b border-zinc-800 pb-2 flex justify-between items-center flex-wrap gap-2">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wide text-blue-400 font-mono">schema audit</span>
                  <h4 className="text-xs font-bold text-zinc-200">Table: <span className="text-blue-400 font-mono">{currentTable.name}</span></h4>
                </div>
                <span className="text-[10px] text-zinc-500 leading-normal">{currentTable.columns.length} Fields Defined</span>
              </div>

              {/* Columns Table */}
              <div className="overflow-x-auto border border-zinc-900 rounded-lg">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-zinc-950 border-b border-zinc-900 text-zinc-400 uppercase font-bold text-[9px] tracking-wider">
                      <th className="p-2.5">Column Name</th>
                      <th className="p-2.5">DataType</th>
                      <th className="p-2.5">Constraints</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/50">
                    {currentTable.columns.map((col, idx) => (
                      <tr key={idx} className="hover:bg-zinc-950/40">
                        <td className="p-2.5 font-semibold font-mono text-blue-400">{col.name}</td>
                        <td className="p-2.5 font-mono text-zinc-300">{col.type}</td>
                        <td className="p-2.5 text-zinc-500 text-[10px] font-mono whitespace-nowrap">{col.constraints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Live DDL generator mockup */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                  <FileCode size={10} />
                  DDL Schema Migration Statement
                </span>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 font-mono text-[10px] text-blue-400 overflow-x-auto">
{`CREATE TABLE ${currentTable.name} (
${currentTable.columns.map(col => `  ${col.name.padEnd(16)} ${col.type.padEnd(12)} ${col.constraints}`).join(',\n')}
);`}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. REST API Specifications */}
      {activeSubTab === 'api' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 animate-fade-in flex-1 overflow-hidden">
          {/* Sidebar List of endpoints */}
          <div className="md:col-span-4 flex flex-col gap-2 overflow-y-auto pr-1 h-[320px] md:h-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1 block">Routes Spec</span>
            {REST_API_ENDPOINTS.map(ep => (
              <div
                key={ep.path}
                onClick={() => setSelectedEndpointPath(ep.path)}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition select-none ${
                  selectedEndpointPath === ep.path
                    ? 'bg-zinc-900 border-blue-500/40 text-white'
                    : 'bg-zinc-950 hover:bg-zinc-900/40 border-zinc-900 text-zinc-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded font-mono ${
                    ep.method === 'GET'
                      ? 'bg-blue-950/40 text-blue-400 border border-blue-900/30'
                      : 'bg-blue-950/40 text-blue-400 border border-blue-900/30'
                  }`}>
                    {ep.method}
                  </span>
                  <span className="text-[11px] font-semibold font-mono truncate" title={ep.path}>{ep.path}</span>
                </div>
                <p className="text-[10px] text-zinc-550 line-clamp-1 mt-1 leading-normal">{ep.description}</p>
              </div>
            ))}
          </div>

          {/* API Sandbox Request/Response details */}
          <div className="md:col-span-8 bg-zinc-900/30 border border-zinc-800 rounded-lg p-4 flex flex-col justify-between overflow-y-auto h-[320px] md:h-auto">
            <div className="space-y-4">
              <div className="border-b border-zinc-800 pb-2">
                <span className="text-[9px] font-bold uppercase tracking-wide text-blue-400 font-mono">Swagger API Spec</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono bg-blue-950 text-blue-400`}>
                    {currentEndpoint.method}
                  </span>
                  <h4 className="text-xs font-bold font-mono text-zinc-200">{currentEndpoint.path}</h4>
                </div>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{currentEndpoint.description}</p>
              </div>

              {/* Request Body (if any) */}
              {currentEndpoint.requestBody && (
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Request Body Schema (JSON)</span>
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 font-mono text-[9.5px] text-zinc-300 overflow-x-auto whitespace-pre">
                    {currentEndpoint.requestBody}
                  </div>
                </div>
              )}

              {/* Response Body */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">HTTP 200 Success Response</span>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 font-mono text-[9.5px] text-blue-400 overflow-x-auto whitespace-pre">
                  {currentEndpoint.responseBody}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. WebSockets STOMP Protocol Events */}
      {activeSubTab === 'websocket' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 animate-fade-in flex-1 overflow-hidden">
          {/* Left operations list */}
          <div className="md:col-span-4 flex flex-col gap-2 overflow-y-auto pr-1 h-[320px] md:h-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1 block">Socket Messages</span>
            {WEBSOCKET_EVENTS.map(ws => (
              <div
                key={ws.event}
                onClick={() => setSelectedWsEvent(ws.event)}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition select-none ${
                  selectedWsEvent === ws.event
                    ? 'bg-zinc-900 border-blue-500/40 text-white'
                    : 'bg-zinc-950 hover:bg-zinc-900/40 border-zinc-900 text-zinc-400'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Radio size={11} className={selectedWsEvent === ws.event ? 'text-rose-500' : 'text-zinc-650'} />
                  <span className="text-xs font-bold font-mono truncate">{ws.event}</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[8.5px] text-zinc-550">
                  <span>{ws.direction.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Right payload details */}
          <div className="md:col-span-8 bg-zinc-900/30 border border-zinc-800 rounded-lg p-4 flex flex-col justify-between overflow-y-auto h-[320px] md:h-auto">
            <div className="space-y-4">
              <div className="border-b border-zinc-800 pb-2">
                <span className="text-[9px] font-bold uppercase tracking-wide text-rose-500 font-mono">Real-time WebSocket event</span>
                <h4 className="text-xs font-bold font-mono text-zinc-200 mt-1">Event Type: <span className="text-rose-400">{currentWsEvent.event}</span></h4>
                <div className="flex gap-2 items-center text-[10px] text-zinc-550 mt-1.5">
                  <span className="bg-zinc-950 border border-zinc-900 px-1.5 py-0.5 rounded uppercase font-semibold font-mono text-zinc-400">
                    {currentWsEvent.direction.replace(/_/g, ' ')}
                  </span>
                  <span>|</span>
                  <span>Payload distributed automatically via STOMP Brokers</span>
                </div>
                <p className="text-xs text-zinc-450 mt-3.5 leading-relaxed">{currentWsEvent.description}</p>
              </div>

              {/* Event Payload Example */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">WebSocket STOMP Msg Payload</span>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 font-mono text-[9.5px] text-blue-400 overflow-x-auto whitespace-pre">
                  {currentWsEvent.payloadExample}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
