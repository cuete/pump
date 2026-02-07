import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

interface Props {
  exerciseId: number;
}

async function compressImage(file: File, maxWidth = 1024, quality = 0.7): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => resolve(blob!),
        'image/jpeg',
        quality,
      );
    };
    img.src = url;
  });
}

export function PhotoManager({ exerciseId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);

  const photos = useLiveQuery(
    () => db.exercisePhotos.where('exerciseId').equals(exerciseId).toArray(),
    [exerciseId],
  );

  async function handleCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const blob = await compressImage(file);
    await db.exercisePhotos.add({ exerciseId, blob, timestamp: Date.now() });
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleDelete(id: number) {
    await db.exercisePhotos.delete(id);
  }

  return (
    <div className="photo-manager">
      <div className="photo-thumbnails">
        {photos?.map((p) => {
          const url = URL.createObjectURL(p.blob);
          return (
            <div key={p.id} className="photo-thumb-wrap">
              <img
                src={url}
                className="photo-thumb"
                onClick={() => setViewPhoto(url)}
                alt="Exercise"
              />
              <button className="photo-delete" onClick={() => handleDelete(p.id!)}>
                &times;
              </button>
            </div>
          );
        })}
      </div>
      <button className="btn btn-small" onClick={() => inputRef.current?.click()}>
        📷 Photo
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        hidden
      />
      {viewPhoto && (
        <div className="photo-modal" onClick={() => setViewPhoto(null)}>
          <img src={viewPhoto} alt="Full size" />
        </div>
      )}
    </div>
  );
}
