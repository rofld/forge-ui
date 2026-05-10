// use-event-stream.ts — Generic SSE hook backed by the browser's native EventSource.
// Distinct from use-sse.ts (which is a chat-session manager) — this hook connects
// directly to an SSE URL, accumulates up to 500 events, and exposes connection state.
'use client';

import { useEffect, useRef, useState } from 'react';

export interface UseEventStreamOpts<T> {
  onEvent?: (data: T) => void;
  onError?: (err: Event) => void;
  /** Custom deserializer — defaults to JSON.parse. */
  parser?: (raw: string) => T;
  /** Max events to retain in memory (FIFO). Default: 500. */
  maxEvents?: number;
}

export interface UseEventStreamReturn<T> {
  events: T[];
  connected: boolean;
}

/**
 * useEventStream — connects to `url` via EventSource, accumulates events and
 * returns them alongside a `connected` flag.
 *
 * Pass `null` as `url` to skip connecting (useful when the URL depends on
 * optional metadata that may not be present).
 *
 * Auto-reconnect is handled natively by EventSource on transient errors.
 * A deliberate close (component unmount) calls `es.close()`.
 */
export function useEventStream<T = unknown>(
  url: string | null,
  opts?: UseEventStreamOpts<T>,
): UseEventStreamReturn<T> {
  const [events, setEvents] = useState<T[]>([]);
  const [connected, setConnected] = useState(false);
  // Keep stable references so the effect body captures current callbacks
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    if (!url) return;
    const maxEvents = optsRef.current?.maxEvents ?? 500;
    const es = new EventSource(url);

    es.onopen = () => setConnected(true);

    es.onmessage = (ev) => {
      let parsed: T;
      try {
        parsed = optsRef.current?.parser
          ? optsRef.current.parser(ev.data)
          : (JSON.parse(ev.data) as T);
      } catch {
        // If parsing fails, skip the event rather than crashing
        return;
      }
      setEvents((prev) =>
        prev.length >= maxEvents
          ? [...prev.slice(-(maxEvents - 1)), parsed]
          : [...prev, parsed],
      );
      optsRef.current?.onEvent?.(parsed);
    };

    es.onerror = (e) => {
      setConnected(false);
      optsRef.current?.onError?.(e);
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, [url]);

  return { events, connected };
}
