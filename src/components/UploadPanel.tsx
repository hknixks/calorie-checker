import { ImagePlus } from 'lucide-react';
import { useRef, useState } from 'react';
import type { PreparedImage } from '../lib/image';

interface Props {
  image: PreparedImage | null;
  busy: boolean;
  busyLabel: string;
  canAnalyse: boolean;
  onPick: (file: File) => void;
  onAnalyse: () => void;
  onClear: () => void;
}

/**
 * Upload only — a file input and a drop target. Nothing here touches
 * getUserMedia, so the browser never asks for camera permission.
 */
export default function UploadPanel({
  image,
  busy,
  busyLabel,
  canAnalyse,
  onPick,
  onAnalyse,
  onClear,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) onPick(file);
  }

  if (!image) {
    return (
      <div
        className={`dropzone${over ? ' over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="big-icon">
          <ImagePlus aria-hidden="true" />
        </div>
        <p>
          Choose a photo of your food, or drag one in.
          <br />
          The picture stays on your device until you press Analyse.
        </p>
        <button className="btn btn-primary" onClick={() => inputRef.current?.click()}>
          Choose photo
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="preview-wrap">
        <img src={image.previewUrl} alt="The meal you uploaded" />
      </div>
      <div className="preview-actions">
        <button
          className="btn btn-primary"
          onClick={onAnalyse}
          disabled={busy || !canAnalyse}
        >
          {busy ? (
            <>
              <span className="spinner" />
              {busyLabel}
            </>
          ) : (
            'Analyse photo'
          )}
        </button>
        <button className="btn btn-ghost" onClick={() => inputRef.current?.click()} disabled={busy}>
          Change photo
        </button>
        <button className="btn btn-ghost" onClick={onClear} disabled={busy}>
          Remove
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
