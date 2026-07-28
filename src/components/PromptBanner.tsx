import { X, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  icon: LucideIcon;
  title?: string;
  children: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

/**
 * A single-line setup nudge, not a bordered alert box — for things worth
 * surfacing but not worth interrupting the screen over.
 */
export default function PromptBanner({
  icon: Icon,
  title,
  children,
  actionLabel,
  onAction,
  onDismiss,
}: Props) {
  return (
    <div className="prompt-banner">
      <Icon className="prompt-icon" aria-hidden="true" />
      <div className="prompt-body">
        {title && <strong>{title}</strong>}
        {children}
        {actionLabel && onAction && (
          <>
            {' '}
            <button className="prompt-action" onClick={onAction}>
              {actionLabel}
            </button>
          </>
        )}
      </div>
      {onDismiss && (
        <button className="prompt-dismiss" onClick={onDismiss} aria-label="Dismiss">
          <X />
        </button>
      )}
    </div>
  );
}
