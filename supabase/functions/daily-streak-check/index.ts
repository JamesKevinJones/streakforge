// POST /functions/v1/daily-streak-check
// Invoked by pg_cron every 15 minutes (see supabase/setup/schedule-cron.sql).
// Deployed with --no-verify-jwt: pg_net's HTTP call has no Supabase user
// session to present, so platform-level JWT verification is disabled for
// this function and a purpose-built CRON_SECRET (compared below) gates it
// instead — deliberately NOT the platform service-role key, so a leak of
// this one secret can't be used for anything beyond calling this endpoint.
// Database access still goes through the service-role key (auto-injected
// by the platform), which every RPC call below passes an explicit
// p_user_id to, with no caller JWT — the ownership checks inside those
// functions treat a null auth.uid() as this trusted server-side caller.
//
// Per user, on every tick:
//   1. Evening warning, once per local day, if today isn't done yet.
//   2. Midnight rollover for "yesterday" (freeze/repair/complete), once.
//   3. A single reminder partway through an open repair window.
// Then one global sweep expires any repair window past its deadline.
//
// Every per-user step is wrapped so one user's failure (bad timezone
// string, blocked LeetCode fetch, a dead push subscription) never stops
// the rest of the batch.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { tryFetchLeetCodeContributedOn } from "../_shared/leetcode.ts";
import { EMAIL_TEMPLATES, sendEmail, sendPush } from "../_shared/notify.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET")!;
const MILESTONES = [7, 30, 50, 100, 200, 365];
const TICK_WINDOW_MINUTES = 15; // must match the pg_cron schedule

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization");
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("user_id, email, github_username, leetcode_username, timezone, daily_goal_notify_hour, notifications_enabled, email_reminders_enabled")
    .or("notifications_enabled.eq.true,email_reminders_enabled.eq.true");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const results = [];
  for (const profile of profiles ?? []) {
    try {
      results.push(await processUser(profile));
    } catch (err) {
      console.error(`processUser failed for ${profile.user_id}`, err);
      results.push({ user_id: profile.user_id, error: String(err) });
    }
  }

  let broken: string[] = [];
  try {
    broken = await expireOverdueRepairWindows(new Map((profiles ?? []).map((p) => [p.user_id, p])));
  } catch (err) {
    console.error("expire_repair_windows sweep failed", err);
  }

  return new Response(JSON.stringify({ processed: results.length, broken }), {
    headers: { "Content-Type": "application/json" },
  });
});

// deno-lint-ignore no-explicit-any
async function processUser(profile: any) {
  const tz = profile.timezone || "UTC";
  const now = new Date();
  const localParts = localDateAndTime(tz, now);

  await maybeEveningWarning(profile, localParts);
  if (localParts.hour === 0) {
    await maybeMidnightRollover(profile, tz, localParts.date);
  }
  await maybeRepairReminder(profile);

  return { user_id: profile.user_id, local_date: localParts.date, local_hour: localParts.hour };
}

// deno-lint-ignore no-explicit-any
async function maybeEveningWarning(profile: any, local: { date: string; hour: number }) {
  if (local.hour !== profile.daily_goal_notify_hour) return;
  if (await alreadyLogged(profile.user_id, "evening_warning", local.date)) return;

  const { data: record } = await supabase
    .from("daily_records")
    .select("status")
    .eq("user_id", profile.user_id)
    .eq("local_date", local.date)
    .maybeSingle();

  if (record?.status === "completed") return; // goal already hit today

  const { data: streak } = await supabase
    .from("streak_state")
    .select("current_streak")
    .eq("user_id", profile.user_id)
    .single();

  await deliver(profile, "evening_warning", streak?.current_streak ?? 0, {
    title: "Streak at risk tonight",
    body: `You haven't logged a contribution today. Keep your ${streak?.current_streak ?? 0}-day streak alive.`,
  });
  await logSent(profile.user_id, "evening_warning", local.date);
}

// deno-lint-ignore no-explicit-any
async function maybeMidnightRollover(profile: any, tz: string, todayLocalDate: string) {
  const yesterday = shiftDate(todayLocalDate, -1);
  if (await alreadyLogged(profile.user_id, "freeze_applied", yesterday) ||
      await alreadyLogged(profile.user_id, "repair_window_opened", yesterday) ||
      await alreadyLogged(profile.user_id, "milestone", yesterday)) {
    return; // this day's rollover already handled on an earlier tick
  }

  // Best-effort LeetCode backfill for anyone who never opened the app
  // yesterday — never blocks or fails the rollover if it comes back null.
  const { data: existing } = await supabase
    .from("daily_records")
    .select("leetcode_synced_at")
    .eq("user_id", profile.user_id)
    .eq("local_date", yesterday)
    .maybeSingle();

  if (!existing?.leetcode_synced_at && profile.leetcode_username) {
    const contributed = await tryFetchLeetCodeContributedOn(profile.leetcode_username, yesterday);
    if (contributed !== null) {
      await supabase.rpc("record_activity", {
        p_user_id: profile.user_id,
        p_local_date: yesterday,
        p_github: false,
        p_leetcode: contributed,
        p_leetcode_synced: true,
      });
    }
  }

  const { data: status, error } = await supabase.rpc("evaluate_daily_status", {
    p_user_id: profile.user_id,
    p_local_date: yesterday,
  });
  if (error) throw error;

  const { data: streak } = await supabase
    .from("streak_state")
    .select("current_streak")
    .eq("user_id", profile.user_id)
    .single();
  const currentStreak = streak?.current_streak ?? 0;

  if (status === "freeze_applied") {
    await deliver(profile, "freeze_applied", currentStreak, {
      title: "Streak frozen, no worries",
      body: `You missed a day — a freeze covered it. Streak holding at ${currentStreak}.`,
    });
    await logSent(profile.user_id, "freeze_applied", yesterday);
  } else if (status === "repair_window") {
    await deliver(profile, "repair_window_opened", currentStreak, {
      title: "Repair your streak",
      body: "You're out of freezes. You have 24 hours to log activity or use a Repair Credit.",
    });
    await logSent(profile.user_id, "repair_window_opened", yesterday);
  } else if (status === "completed" && MILESTONES.includes(currentStreak)) {
    await deliver(profile, "milestone", currentStreak, {
      title: `${currentStreak} days!`,
      body: `You hit a ${currentStreak}-day streak and earned a bonus freeze credit.`,
    });
    await logSent(profile.user_id, "milestone", yesterday);
  }
}

// deno-lint-ignore no-explicit-any
async function maybeRepairReminder(profile: any) {
  const { data: open } = await supabase
    .from("daily_records")
    .select("local_date, repair_deadline")
    .eq("user_id", profile.user_id)
    .eq("status", "repair_window")
    .maybeSingle();

  if (!open?.repair_deadline) return;
  if (await alreadyLogged(profile.user_id, "repair_reminder", open.local_date)) return;

  const deadline = new Date(open.repair_deadline).getTime();
  const now = Date.now();
  const hoursLeft = (deadline - now) / (1000 * 60 * 60);
  // Fire once, when the window is roughly half spent (10-14h remaining of 24h).
  if (hoursLeft > 10 && hoursLeft <= 14) {
    await deliver(profile, "repair_reminder", 0, {
      title: "Repair window closing soon",
      body: "Log a contribution or spend a Repair Credit before your streak resets.",
    });
    await logSent(profile.user_id, "repair_reminder", open.local_date);
  }
}

async function expireOverdueRepairWindows(profileById: Map<string, unknown>): Promise<string[]> {
  const { data, error } = await supabase.rpc("expire_repair_windows");
  if (error) throw error;
  // PostgREST's RPC wrapping for `returns setof uuid` can come back either
  // as plain scalars or as `{ expire_repair_windows: uuid }` rows depending
  // on version — handle both rather than assuming one shape.
  const brokenUserIds: string[] = (data ?? []).map((row: unknown) => {
    if (typeof row === "string") return row;
    const obj = row as Record<string, string | undefined>;
    return obj.user_id ?? obj.expire_repair_windows ?? "";
  }).filter(Boolean);

  for (const userId of brokenUserIds) {
    const profile = profileById.get(userId);
    if (!profile) continue;
    const local = localDateAndTime((profile as { timezone?: string }).timezone || "UTC", new Date());
    if (await alreadyLogged(userId, "streak_broken", local.date)) continue;
    // deno-lint-ignore no-explicit-any
    await deliver(profile as any, "streak_broken", 0, {
      title: "Streak reset",
      body: "The repair window closed. Today's a fresh start.",
    });
    await logSent(userId, "streak_broken", local.date);
  }
  return brokenUserIds;
}

// deno-lint-ignore no-explicit-any
async function deliver(
  profile: any,
  kind: keyof typeof EMAIL_TEMPLATES,
  streak: number,
  push: { title: string; body: string },
) {
  if (profile.notifications_enabled) {
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth_key")
      .eq("user_id", profile.user_id);
    for (const sub of subs ?? []) {
      await sendPush(sub, { ...push, tag: kind });
    }
  }
  if (profile.email_reminders_enabled && profile.email) {
    const tmpl = EMAIL_TEMPLATES[kind](streak);
    await sendEmail(profile.email, tmpl.subject, tmpl.html);
  }
}

async function alreadyLogged(userId: string, kind: string, localDate: string): Promise<boolean> {
  const { data } = await supabase
    .from("notification_log")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("local_date", localDate)
    .maybeSingle();
  return !!data;
}

async function logSent(userId: string, kind: string, localDate: string) {
  // Unique constraint on (user_id, kind, local_date) makes this safe even
  // if two ticks race — the loser's insert just fails and is ignored.
  await supabase.from("notification_log").insert({ user_id: userId, kind, local_date: localDate });
}

function localDateAndTime(timeZone: string, at: Date): { date: string; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: parseInt(get("hour"), 10) % 24,
    minute: parseInt(get("minute"), 10),
  };
}

function shiftDate(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

// Referenced so the constant isn't flagged unused if the tick window ever
// needs to gate the evening-warning check more precisely than "same hour".
void TICK_WINDOW_MINUTES;
