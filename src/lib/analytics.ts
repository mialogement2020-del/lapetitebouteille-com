import { supabase } from "@/integrations/supabase/client";

type EventProps = Record<string, unknown>;

interface QueuedEvent {
  event_name: string;
  category: string;
  session_id: string;
  path: string;
  referrer: string | null;
  properties: EventProps;
  revenue?: number | null;
  currency?: string;
  device: string;
  occurred_at: string;
}

const SESSION_KEY = "lpb_analytics_session";
const FLUSH_INTERVAL_MS = 4000;
const MAX_BATCH = 20;

let queue: QueuedEvent[] = [];
let flushTimer: number | null = null;
let initialized = false;

function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "s_anonymous";
  }
}

function detectDevice(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipod/.test(ua)) return "mobile";
  if (/ipad|tablet/.test(ua)) return "tablet";
  return "desktop";
}

async function flush() {
  if (!queue.length) return;
  const batch = queue.splice(0, MAX_BATCH);
  try {
    const { data: auth } = await supabase.auth.getUser();
    const rows = batch.map((e) => ({
      ...e,
      properties: e.properties as never,
      user_id: auth.user?.id ?? null,
    }));
    await supabase.from("analytics_events").insert(rows as never);
  } catch {
    // silent — analytics must never break the app
  }
}

function scheduleFlush() {
  if (flushTimer !== null) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flush();
  }, FLUSH_INTERVAL_MS);
}

export function trackEvent(
  event_name: string,
  properties: EventProps = {},
  opts: { category?: string; revenue?: number; currency?: string } = {}
) {
  try {
    queue.push({
      event_name,
      category: opts.category ?? "general",
      session_id: getSessionId(),
      path: typeof window !== "undefined" ? window.location.pathname + window.location.search : "",
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      properties,
      revenue: opts.revenue ?? null,
      currency: opts.currency ?? "XAF",
      device: detectDevice(),
      occurred_at: new Date().toISOString(),
    });
    if (queue.length >= MAX_BATCH) void flush();
    else scheduleFlush();
  } catch {
    // never throw
  }
}

export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  // Initial page view
  trackEvent("page_view", { title: document.title }, { category: "navigation" });

  // SPA route changes via history API
  const push = history.pushState;
  const replace = history.replaceState;
  const emit = () => trackEvent("page_view", { title: document.title }, { category: "navigation" });
  history.pushState = function (...args) {
    const r = push.apply(this, args as never);
    setTimeout(emit, 0);
    return r;
  };
  history.replaceState = function (...args) {
    const r = replace.apply(this, args as never);
    setTimeout(emit, 0);
    return r;
  };
  window.addEventListener("popstate", emit);

  // Flush before unload
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush();
  });
  window.addEventListener("pagehide", () => void flush());
}