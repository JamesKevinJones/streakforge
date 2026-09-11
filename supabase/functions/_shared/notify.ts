// Push (Web Push / VAPID) and email (Resend) senders shared by
// daily-streak-check. Both are best-effort per-recipient: one failed
// subscription or email must never abort the rest of the run.
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "StreakForge <reminders@streakforge.app>";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth_key: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  tag: string; // notification_log `kind`, also used as the browser notification tag
}

/** Sends one push notification. Returns false (never throws) on failure. */
export async function sendPush(sub: PushSubscriptionRow, payload: NotificationPayload): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
      JSON.stringify(payload),
    );
    return true;
  } catch (err) {
    console.error(`push failed for ${sub.endpoint.slice(0, 40)}...`, err);
    return false;
  }
}

/** Sends one transactional email via Resend. Returns false (never throws) on failure. */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY || !to) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
    });
    if (!res.ok) {
      console.error(`resend send failed: ${res.status} ${await res.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("resend send threw", err);
    return false;
  }
}

export const EMAIL_TEMPLATES = {
  evening_warning: (streak: number) => ({
    subject: `Don't lose your ${streak}-day streak tonight`,
    html: `<p>You haven't logged a contribution yet today. Your <strong>${streak}-day streak</strong> is still alive — a quick commit or a LeetCode problem keeps it that way.</p>`,
  }),
  freeze_applied: (streak: number) => ({
    subject: "We froze your streak for you",
    html: `<p>No worries — you missed yesterday, so we auto-applied a freeze. Your streak is holding at <strong>${streak} days</strong>.</p>`,
  }),
  repair_window_opened: () => ({
    subject: "Your streak needs a repair",
    html: `<p>You missed a day and you're out of freezes. You have <strong>24 hours</strong> to log a real contribution, or spend a Repair Credit in the app, before the streak resets.</p>`,
  }),
  repair_reminder: () => ({
    subject: "Reminder: your streak repair window is closing",
    html: `<p>Your streak is still in its repair window. Log a contribution soon, or spend a Repair Credit, to keep it alive.</p>`,
  }),
  streak_broken: () => ({
    subject: "Your streak reset — let's start a new one",
    html: `<p>The repair window closed without a contribution, so the streak reset to 0. That's alright — the next one starts today.</p>`,
  }),
  milestone: (streak: number) => ({
    subject: `${streak} days! 🔥`,
    html: `<p>You just hit a <strong>${streak}-day streak</strong>. Nice work — you also earned a bonus freeze credit.</p>`,
  }),
} as const;
