import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from "web-vitals";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "lpb_perf_session";

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

const queue: Array<Record<string, unknown>> = [];
let flushTimer: number | null = null;

function flush() {
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  // Fire-and-forget; never block UI on monitoring
  supabase.from("perf_metrics").insert(batch as never).then(() => {}, () => {});
}

function scheduleFlush() {
  if (flushTimer != null) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    flush();
  }, 1500);
}

async function report(metric: Metric) {
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  queue.push({
    metric: metric.name,
    value: metric.value,
    rating: metric.rating,
    route: window.location.pathname,
    navigation_type: metric.navigationType,
    session_id: getSessionId(),
    user_id: user?.id ?? null,
    user_agent: navigator.userAgent.slice(0, 255),
  });
  scheduleFlush();
}

let started = false;
export function initPerfReporter() {
  if (started || typeof window === "undefined") return;
  started = true;
  try {
    onCLS(report);
    onINP(report);
    onLCP(report);
    onFCP(report);
    onTTFB(report);
    window.addEventListener("pagehide", flush);
  } catch {
    // never break the app on monitoring init
  }
}