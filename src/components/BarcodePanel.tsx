import { Camera, ScanBarcode } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  BarcodeError,
  barcodeDecodingSupported,
  decodeBarcodeFromFile,
  lookupBarcode,
} from '../lib/barcode';
import type { Food } from '../lib/types';

/**
 * Barcodes without a camera: type the digits, or pick a photo of the pack and let
 * the browser's image barcode reader do it. Nothing here requests camera access.
 */
export default function BarcodePanel({ onFound }: { onFound: (food: Food) => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'idle' | 'decoding' | 'looking-up'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<Food | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canDecode = barcodeDecodingSupported();

  async function runLookup(value: string) {
    setError(null);
    setFound(null);
    setBusy('looking-up');
    try {
      const food = await lookupBarcode(value);
      setFound(food);
      onFound(food);
    } catch (err) {
      setError(
        err instanceof BarcodeError ? err.message : 'Could not look that barcode up.',
      );
    } finally {
      setBusy('idle');
    }
  }

  async function handleImage(file: File) {
    setError(null);
    setFound(null);
    setBusy('decoding');
    try {
      const decoded = await decodeBarcodeFromFile(file);
      if (!decoded) {
        setError(
          'No barcode found in that image. Get closer to the barcode, or type the number instead.',
        );
        setBusy('idle');
        return;
      }
      setCode(decoded);
      await runLookup(decoded);
    } catch (err) {
      setError(err instanceof BarcodeError ? err.message : 'Could not read that image.');
      setBusy('idle');
    }
  }

  return (
    <div className="card">
      <h2 className="with-hint">Barcode</h2>
      <p className="hint">
        For packaged food: Indomie, Peak milk, biscuits. Looked up in Open Food Facts, which is
        crowd-sourced, so plenty of Nigerian products are missing.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {found && (
        <div className="alert alert-ok">
          <strong>Added {found.name}</strong>
          {found.per100g.kcal} kcal per 100 g · saved to your foods so you can reuse it.
        </div>
      )}

      <div className="stack">
        <div>
          <label className="lbl" htmlFor="barcode-input">
            Barcode number
          </label>
          <div className="btn-row" style={{ flexWrap: 'nowrap' }}>
            <input
              id="barcode-input"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 6009510800021"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && code.trim()) void runLookup(code);
              }}
              style={{ flex: 1, minWidth: 0 }}
            />
            <button
              className="btn btn-primary"
              disabled={busy !== 'idle' || !code.trim()}
              onClick={() => void runLookup(code)}
            >
              {busy === 'looking-up' ? <span className="spinner" /> : <ScanBarcode aria-hidden="true" />}
              Look up
            </button>
          </div>
          <p className="sub">The digits printed under the bars.</p>
        </div>

        <div>
          <button
            className="btn btn-block"
            disabled={!canDecode || busy !== 'idle'}
            onClick={() => inputRef.current?.click()}
          >
            {busy === 'decoding' ? <span className="spinner" /> : <Camera aria-hidden="true" />}
            Read barcode from a photo
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void handleImage(file);
            }}
          />
          <p className="sub">
            {canDecode
              ? 'Pick a clear photo of the barcode. Decoded on your device, so no camera access and no upload.'
              : 'This browser has no built-in barcode reader (Chrome and Edge do). Type the number instead.'}
          </p>
        </div>
      </div>
    </div>
  );
}
