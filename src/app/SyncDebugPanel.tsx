/**
 * SyncDebugPanel — P2J Step 1 AgriPulse
 *
 * Collapsible developer/tester panel for verifying all 5 sync test scenarios.
 * Renders only in the home screen at the bottom as a tiny toggle button.
 * Never exposed to farmers in production; kept behind a small unobtrusive toggle.
 */
"use client";

import React, { useState, useCallback } from "react";
import { getSyncQueue, getPendingSyncCount, resetSyncQueue } from "@/services/syncQueueService";
import SyncManager from "@/services/syncManager";
import { MockBackendProvider, getBackendProvider } from "@/services/backendProvider";
import { SyncOperation } from "@/types";

interface SyncDebugPanelProps {
  isOnline: boolean;
  onRefresh?: () => void;
}

export default function SyncDebugPanel({ isOnline, onRefresh }: SyncDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [isSimulatingFailure, setIsSimulatingFailure] = useState(false);
  const [queueSnapshot, setQueueSnapshot] = useState<SyncOperation[]>([]);

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 9)]);
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      setQueueSnapshot(getSyncQueue());
    }
    setIsOpen((v) => !v);
  };

  const handleRefreshSnapshot = () => {
    const q = getSyncQueue();
    setQueueSnapshot(q);
    addLog(`Queue refreshed: ${q.length} ops`);
  };

  const handleRunSync = async () => {
    addLog("Running sync...");
    const result = await SyncManager.runSync(true);
    setQueueSnapshot(getSyncQueue());
    addLog(`Done: synced=${result.syncedCount} failed=${result.failedCount} pending=${result.pendingRemaining}`);
    onRefresh?.();
  };

  const handleClearQueue = () => {
    resetSyncQueue();
    setQueueSnapshot([]);
    addLog("Queue cleared");
  };

  const handleToggleFailure = () => {
    const provider = getBackendProvider() as MockBackendProvider;
    if (typeof provider.setSimulateFailure === "function") {
      const next = !isSimulatingFailure;
      provider.setSimulateFailure(next);
      setIsSimulatingFailure(next);
      addLog(`Backend failure simulation: ${next ? "ON" : "OFF"}`);
    }
  };

  const pending = getPendingSyncCount();

  return (
    <div className="mt-4">
      {/* Toggle button — small, unobtrusive */}
      <button
        id="sync-debug-toggle"
        onClick={handleToggle}
        className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 py-2 flex items-center justify-center gap-1.5 border border-dashed border-slate-300 rounded-xl transition-colors"
        aria-expanded={isOpen}
        aria-controls="sync-debug-panel"
      >
        <span>{isOpen ? "▲" : "▼"}</span>
        <span>🛠 Sync Debug Panel (P2J Step 1 Tests)</span>
        {pending > 0 && (
          <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
            {pending}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id="sync-debug-panel"
          className="mt-2 bg-slate-900 text-white rounded-2xl p-4 space-y-3 text-xs font-mono border border-slate-700 shadow-xl"
        >
          {/* Status */}
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <span className="text-slate-400 font-sans font-bold text-sm">Sync Status</span>
            <span className={`px-2 py-0.5 rounded-full font-bold text-xs font-sans ${
              isOnline ? "bg-emerald-700 text-emerald-100" : "bg-amber-700 text-amber-100"
            }`}>
              {isOnline ? "🟢 Online" : "🟠 Offline"}
            </span>
          </div>

          {/* Queue Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {(["pending", "synced", "failed"] as const).map((status) => {
              const count = queueSnapshot.filter(o => o.syncStatus === status).length;
              const colors = {
                pending: "text-amber-400",
                synced: "text-blue-400",
                failed: "text-red-400",
              };
              return (
                <div key={status} className="bg-slate-800 rounded-lg p-2">
                  <div className={`${colors[status]} font-bold text-lg`}>{count}</div>
                  <div className="text-slate-400 text-[10px] capitalize">{status}</div>
                </div>
              );
            })}
          </div>

          {/* Provider */}
          <div className="text-slate-400">
            Provider: <span className="text-emerald-400">{SyncManager.getProviderName()}</span>
          </div>

          {/* Failure Simulation */}
          <div className="flex items-center justify-between bg-slate-800 rounded-lg p-2">
            <span className="text-slate-300 font-sans text-xs">Simulate Backend Failure</span>
            <button
              id="sync-toggle-failure"
              onClick={handleToggleFailure}
              className={`px-3 py-1 rounded-lg font-bold font-sans text-xs transition-colors ${
                isSimulatingFailure
                  ? "bg-red-700 text-red-100 hover:bg-red-800"
                  : "bg-slate-600 text-slate-200 hover:bg-slate-500"
              }`}
            >
              {isSimulatingFailure ? "🔴 ON — Disable" : "⚪ OFF — Enable"}
            </button>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              id="sync-run-button"
              onClick={handleRunSync}
              className="bg-blue-700 hover:bg-blue-800 text-white py-2 px-3 rounded-lg font-bold font-sans transition-colors"
            >
              ▶ Run Sync
            </button>
            <button
              id="sync-refresh-snapshot"
              onClick={handleRefreshSnapshot}
              className="bg-slate-600 hover:bg-slate-500 text-white py-2 px-3 rounded-lg font-bold font-sans transition-colors"
            >
              🔁 Refresh
            </button>
            <button
              id="sync-clear-queue"
              onClick={handleClearQueue}
              className="bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 px-3 rounded-lg font-bold font-sans transition-colors col-span-2"
            >
              🗑 Clear Queue
            </button>
          </div>

          {/* Activity Log */}
          {log.length > 0 && (
            <div className="bg-black/50 rounded-lg p-2 space-y-0.5 max-h-28 overflow-y-auto">
              {log.map((line, i) => (
                <div key={i} className="text-slate-300 text-[10px] leading-relaxed">{line}</div>
              ))}
            </div>
          )}

          {/* Queue List */}
          {queueSnapshot.length > 0 ? (
            <div className="space-y-1.5">
              <div className="text-slate-400 font-sans font-bold border-b border-slate-700 pb-1">
                Queue ({queueSnapshot.length} ops)
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {queueSnapshot.map((op) => (
                  <div
                    key={op.operationId}
                    className={`rounded-lg p-2 text-[10px] leading-relaxed border ${
                      op.syncStatus === "synced"
                        ? "bg-emerald-950 border-emerald-800 text-emerald-300"
                        : op.syncStatus === "failed"
                        ? "bg-red-950 border-red-800 text-red-300"
                        : op.syncStatus === "syncing"
                        ? "bg-blue-950 border-blue-800 text-blue-300"
                        : "bg-amber-950 border-amber-800 text-amber-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{op.entityType}</span>
                      <span className="uppercase tracking-wide">{op.syncStatus}</span>
                    </div>
                    <div className="text-slate-400 mt-0.5">
                      {op.operationType} · retry={op.retryCount} · {op.entityId.slice(0, 18)}
                    </div>
                    {op.isConflict && (
                      <div className="text-yellow-400 mt-0.5">⚠ Conflict — local version kept</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500 py-2 font-sans text-xs">
              Queue is empty — create a repair request to test
            </div>
          )}
        </div>
      )}
    </div>
  );
}
