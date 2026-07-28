import { Bell, BellOff, Plus } from 'lucide-react';
import { useState } from 'react';
import { uid } from '../lib/items';
import {
  notificationPermission,
  notificationsSupported,
  requestNotificationPermission,
} from '../lib/reminders';
import type { Reminder } from '../lib/types';
import PromptBanner from './PromptBanner';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Props {
  reminders: Reminder[];
  onUpsert: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
}

export default function RemindersEditor({ reminders, onUpsert, onDelete }: Props) {
  const [permission, setPermission] = useState(notificationPermission());
  const supported = notificationsSupported();

  function toggleDay(reminder: Reminder, day: number) {
    const days = reminder.days.includes(day)
      ? reminder.days.filter((d) => d !== day)
      : [...reminder.days, day].sort();
    onUpsert({ ...reminder, days });
  }

  return (
    <div>
      <p className="hint">
        A nudge to log your food while the app is open in a tab. It cannot alert you after the app
        is closed, so treat these as reminders for when you're already on your phone.
      </p>

      {!supported && (
        <PromptBanner icon={BellOff}>Notifications aren't supported in this browser.</PromptBanner>
      )}

      {supported && permission !== 'granted' && (
        <PromptBanner
          icon={Bell}
          title={permission === 'denied' ? 'Notifications are blocked' : 'Notifications are off'}
          actionLabel={permission === 'denied' ? undefined : 'Turn on'}
          onAction={
            permission === 'denied'
              ? undefined
              : async () => setPermission(await requestNotificationPermission())
          }
        >
          {permission === 'denied'
            ? 'Re-allow them for this site in your browser settings.'
            : 'Allow notifications so reminders can appear.'}
        </PromptBanner>
      )}

      {reminders.map((reminder) => (
        <div key={reminder.id} style={{ paddingBottom: 'var(--space-2)' }}>
          <div className="switch-row">
            <div className="switch-body">
              <div className="switch-title">{reminder.label}</div>
              <div className="switch-sub">
                {reminder.time} ·{' '}
                {reminder.days.length === 7
                  ? 'every day'
                  : reminder.days.length === 0
                    ? 'no days picked'
                    : reminder.days.map((d) => DAY_NAMES[d].slice(0, 3)).join(', ')}
              </div>
            </div>
            <input
              type="time"
              value={reminder.time}
              aria-label={`Time for ${reminder.label}`}
              style={{ width: 110 }}
              onChange={(e) => onUpsert({ ...reminder, time: e.target.value })}
            />
            <button
              className="switch"
              role="switch"
              aria-checked={reminder.enabled}
              aria-label={`Enable ${reminder.label}`}
              onClick={() => onUpsert({ ...reminder, enabled: !reminder.enabled })}
            />
          </div>
          {reminder.enabled && (
            <div className="daypicker">
              {DAY_LABELS.map((label, day) => (
                <button
                  key={day}
                  aria-pressed={reminder.days.includes(day)}
                  aria-label={DAY_NAMES[day]}
                  onClick={() => toggleDay(reminder, day)}
                >
                  {label}
                </button>
              ))}
              <button
                className="btn btn-sm btn-ghost"
                style={{ marginLeft: 'auto' }}
                onClick={() => onDelete(reminder.id)}
              >
                Remove
              </button>
            </div>
          )}
        </div>
      ))}

      <div className="preview-actions">
        <button
          className="btn btn-sm"
          onClick={() =>
            onUpsert({
              id: `r-${uid().slice(0, 6)}`,
              label: 'Log a meal',
              time: '12:00',
              days: [0, 1, 2, 3, 4, 5, 6],
              enabled: true,
            })
          }
        >
          <Plus aria-hidden="true" />
          Add reminder
        </button>
      </div>
    </div>
  );
}
