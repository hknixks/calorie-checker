import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react';

type NativeProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'onBlur' | 'onFocus' | 'type' | 'min' | 'max'
>;

interface Props extends NativeProps {
  value: number;
  min: number;
  max: number;
  onCommit: (n: number) => void;
}

/**
 * A number input you can actually clear and retype.
 *
 * A plain `<input type="number" value={n} onChange={...}>` re-renders on every
 * keystroke with whatever the model currently holds. The instant the field
 * goes empty, `Number('')` is `0` — if the handler clamps immediately it jumps
 * to the minimum, and if it bails out on invalid input it never updates state
 * at all, so React snaps the field straight back to the old digits. Either way
 * you can never get the field empty long enough to type a fresh number.
 *
 * This keeps its own text buffer so the field can sit empty, mid-decimal
 * ("7."), or briefly invalid while you type. It commits live whenever the text
 * parses to a finite number, and only clamps to [min, max] on blur — an empty
 * or unparsable field on blur reverts to the last committed value rather than
 * jumping to the minimum.
 */
export default function NumberField({ value, min, max, onCommit, id, ...rest }: Props) {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);

  // Sync from the model when it changes for a reason other than our own typing
  // (e.g. picking a different serving elsewhere on the row) — but never while
  // this field is focused, or we'd fight the keystroke that's in flight.
  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);

  return (
    <input
      {...rest}
      id={id}
      type="number"
      min={min}
      max={max}
      value={text}
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const n = Number(raw);
        if (raw.trim() !== '' && Number.isFinite(n)) onCommit(n);
      }}
      onBlur={() => {
        focused.current = false;
        const n = Number(text.trim());
        const valid = text.trim() !== '' && Number.isFinite(n);
        const clamped = valid ? Math.min(max, Math.max(min, n)) : value;
        setText(String(clamped));
        if (clamped !== value) onCommit(clamped);
      }}
    />
  );
}
