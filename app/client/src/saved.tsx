// Auto-saving of work in progress.
//
// Anything the learner types is written to the local database a moment after they stop typing,
// so closing the tab, refreshing or restarting the app never loses it. Nothing is kept only in
// the browser: the server's copy is the one that gets restored. The small indicator in the
// header is the only thing this shows on screen.
import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const SaveCtx = createContext<{ status: SaveStatus; note: (s: SaveStatus) => void }>({ status: 'idle', note: () => {} });

export function SaveProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const clear = useRef<any>(null);
  const note = useCallback((s: SaveStatus) => {
    setStatus(s);
    clearTimeout(clear.current);
    if (s === 'saved') clear.current = setTimeout(() => setStatus('idle'), 2500);
  }, []);
  return <SaveCtx.Provider value={{ status, note }}>{children}</SaveCtx.Provider>;
}

/** "Saving... / Saved" - quiet, and only while something is happening. */
export function SaveIndicator() {
  const { status } = useContext(SaveCtx);
  if (status === 'idle') return null;
  return (
    <span className={`saveflag saveflag-${status}`} aria-live="polite">
      {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved ✓' : 'Not saved yet - retrying'}
    </span>
  );
}

// Changes not yet confirmed by the server, across every piece of work on the page.
const pending = new Map<string, any>();
const stateUrl = (key: string) => `/api/state/${encodeURIComponent(key)}`;

/**
 * Write everything still pending, right now. Used when the page is being hidden or closed,
 * where a normal request may be cut off: sendBeacon first, a keep-alive request otherwise.
 */
export function flushSaves() {
  for (const [key, state] of pending) {
    const body = JSON.stringify({ state });
    let sent = false;
    try { sent = !!navigator.sendBeacon?.(`${stateUrl(key)}?beacon=1`, new Blob([body], { type: 'application/json' })); } catch { /* fall through */ }
    if (!sent) {
      try { fetch(stateUrl(key), { method: 'PUT', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {}); } catch { /* best effort */ }
    }
  }
  pending.clear();
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushSaves);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSaves(); });
}

/**
 * Keeps one piece of work saved.
 *
 * Returns the state saved last time (`loaded` is null until it has been fetched) and a `save`
 * function to call whenever the work changes. If the learner starts typing before the saved
 * copy has arrived, the saved copy is not put back over their new work (`loaded.state` is null).
 */
export function useSavedWork<T extends object>(key: string | null) {
  const { note } = useContext(SaveCtx);
  const [loaded, setLoaded] = useState<{ state: T | null; updatedAt: string | null } | null>(null);
  const timer = useRef<any>(null);
  const latest = useRef<T | null>(null);
  const failed = useRef(0);
  const touched = useRef(false);

  useEffect(() => {
    let live = true;
    touched.current = false;
    setLoaded(null);
    if (!key) { setLoaded({ state: null, updatedAt: null }); return; }
    api(stateUrl(key))
      .then((r) => live && setLoaded({ state: touched.current ? null : (r.state ?? null), updatedAt: r.updatedAt ?? null }))
      .catch(() => live && setLoaded({ state: null, updatedAt: null }));
    return () => { live = false; };
  }, [key]);

  const write = useCallback(async () => {
    if (!key || latest.current === null) return;
    const state = latest.current;
    note('saving');
    try {
      await api(stateUrl(key), { state }, 'PUT');
      if (latest.current === state) pending.delete(key);
      failed.current = 0;
      note('saved');
    } catch {
      // the app may be restarting: keep trying while the change is still pending
      failed.current += 1;
      note('error');
      clearTimeout(timer.current);
      timer.current = setTimeout(write, Math.min(10000, 1000 * failed.current));
    }
  }, [key, note]);

  const save = useCallback((state: T, immediate = false) => {
    if (!key) return;
    touched.current = true;
    latest.current = state;
    pending.set(key, state);
    clearTimeout(timer.current);
    if (immediate) return write();
    timer.current = setTimeout(write, 600);
    return undefined;
  }, [key, write]);

  // leaving this piece of work (navigating away): write what is still pending
  useEffect(() => () => {
    clearTimeout(timer.current);
    if (key && pending.has(key)) {
      const state = pending.get(key);
      pending.delete(key);
      api(stateUrl(key), { state }, 'PUT').catch(() => { pending.set(key, state); });
    }
  }, [key]);

  const clear = useCallback(() => {
    if (!key) return;
    pending.delete(key);
    clearTimeout(timer.current);
    latest.current = null;
    touched.current = true;
    api(stateUrl(key), undefined, 'DELETE').catch(() => {});
  }, [key]);

  return { loaded, save, clear };
}
