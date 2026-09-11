import { createClient, type RealtimeChannel } from "@supabase/supabase-js";

import type { DropView } from "@/lib/data/drops";

/**
 * The dig is alive through one Supabase Realtime channel:
 *  - postgres_changes on `drops`: a token dropped anywhere is inserted, then
 *    updated with its rest pose — both events reach every open page;
 *  - broadcast `release`: the dropper announces where it let go, so viewers
 *    can watch it fall before the authoritative pose arrives;
 *  - presence: who is here now, and where their cursor is.
 *
 * Read-only from the browser's point of view: the anon key can subscribe but
 * cannot write a row (see lib/db/policies.sql).
 */

export type PresenceState = { key: string; x: number; y: number; emoji: string | null };

export type LiveHandlers = {
  onInsert: (drop: DropView) => void;
  onUpdate: (drop: DropView) => void;
  onRelease: (payload: { id: string; x: number }) => void;
  onPresence: (others: PresenceState[]) => void;
};

type Row = {
  id: string;
  emoji: string;
  word: string;
  x: number;
  y: number;
  angle: number;
  settled: boolean;
  created_at: string;
  deleted_at: string | null;
};

const toView = (r: Row): DropView => ({
  id: r.id,
  emoji: r.emoji,
  word: r.word,
  x: r.x,
  y: r.y,
  angle: r.angle,
  settled: r.settled,
  createdAt: r.created_at,
});

let client: ReturnType<typeof createClient> | null = null;

/** One client per page. React StrictMode mounts twice; the socket should not. */
function getClient() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, {
    realtime: { params: { eventsPerSecond: 20 } },
    // No auth here, ever: the browser only listens.
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

export function connectLive(handlers: LiveHandlers) {
  const client = getClient();
  if (!client) return null;
  const me = Math.random().toString(36).slice(2, 10);

  const channel: RealtimeChannel = client
    .channel("dig", { config: { presence: { key: me }, broadcast: { self: false } } })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "drops" }, (payload) => {
      handlers.onInsert(toView(payload.new as Row));
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "drops" }, (payload) => {
      handlers.onUpdate(toView(payload.new as Row));
    })
    .on("broadcast", { event: "release" }, ({ payload }) => {
      handlers.onRelease(payload as { id: string; x: number });
    })
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<{ x: number; y: number; emoji: string | null }>();
      const others: PresenceState[] = [];
      for (const [k, entries] of Object.entries(state)) {
        if (k === me) continue;
        const latest = entries[entries.length - 1];
        if (latest) others.push({ key: k, x: latest.x, y: latest.y, emoji: latest.emoji });
      }
      handlers.onPresence(others);
    })
    .subscribe();

  let lastTrack = 0;
  return {
    me,
    /** Throttled: presence is not a pointer stream. */
    track(state: { x: number; y: number; emoji: string | null }) {
      const now = performance.now();
      if (now - lastTrack < 120) return;
      lastTrack = now;
      void channel.track(state);
    },
    release(id: string, x: number) {
      void channel.send({ type: "broadcast", event: "release", payload: { id, x } });
    },
    leave() {
      void client.removeChannel(channel);
    },
  };
}
