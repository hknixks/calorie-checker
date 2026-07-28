import { useEffect } from 'react';
import { dateKey, timeToMinutes } from './dates';
import type { Reminder } from './types';

const FIRED_KEY = 'calorie-checker.reminders.fired';
const CHECK_INTERVAL_MS = 30_000;

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  return notificationsSupported() ? Notification.permission : 'unsupported';
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied';
  return Notification.requestPermission();
}

type FiredMap = Record<string, string>;

function loadFired(): FiredMap {
  try {
    return JSON.parse(localStorage.getItem(FIRED_KEY) ?? '{}') as FiredMap;
  } catch {
    return {};
  }
}

function saveFired(map: FiredMap): void {
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify(map));
  } catch {
    // Not worth interrupting anyone over.
  }
}

async function show(reminder: Reminder): Promise<void> {
  const options: NotificationOptions = {
    body: 'Tap to open Calorie Checker and log it.',
    icon: '/icon.svg',
    tag: reminder.id,
  };
  // Android Chrome only allows notifications through a service worker.
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.showNotification(reminder.label, options);
      return;
    }
  }
  new Notification(reminder.label, options);
}

/**
 * Fires due reminders while the app is open, at most once per slot per day.
 *
 * A web page cannot wake itself up after it is closed — real background alarms
 * need either a push server or a native app. So these arrive when the app is
 * open in a tab, which is why the Settings screen says so plainly.
 */
export function useReminders(reminders: Reminder[]): void {
  useEffect(() => {
    const active = reminders.filter((r) => r.enabled);
    if (!active.length) return;

    function tick() {
      if (notificationPermission() !== 'granted') return;
      const now = new Date();
      const today = dateKey(now);
      const minutesNow = now.getHours() * 60 + now.getMinutes();
      const fired = loadFired();
      let changed = false;

      for (const reminder of active) {
        if (!reminder.days.includes(now.getDay())) continue;
        const due = timeToMinutes(reminder.time);
        // Fire within an hour of the slot so a late open still gets one nudge.
        if (minutesNow < due || minutesNow > due + 60) continue;
        const stamp = `${today}T${reminder.time}`;
        if (fired[reminder.id] === stamp) continue;
        fired[reminder.id] = stamp;
        changed = true;
        void show(reminder);
      }
      if (changed) saveFired(fired);
    }

    tick();
    const timer = window.setInterval(tick, CHECK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [reminders]);
}
