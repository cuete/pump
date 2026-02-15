import { useRef, useState } from 'react';
import { usePhotos, useUploadPhoto, useDeletePhoto } from '../hooks/useApi';

interface Props {
  exerciseId: string;
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
  const [uploading, setUploading] = useState(false);

  const { photos, isLoading } = usePhotos(exerciseId);
  const uploadPhotoMutation = useUploadPhoto();
  const deletePhotoMutation = useDeletePhoto();

  async function handleCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const blob = await compressImage(file);
      await uploadPhotoMutation(exerciseId, blob);
      if (inputRef.current) inputRef.current.value = '';
    } catch (error) {
      console.error('Failed to upload photo:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(photoId: string) {
    try {
      await deletePhotoMutation(photoId, exerciseId);
    } catch (error) {
      console.error('Failed to delete photo:', error);
      alert('Failed to delete photo. Please try again.');
    }
  }

  return (
    <div className="photo-manager">
      <div className="photo-thumbnails">
        {isLoading ? (
          <div>Loading photos...</div>
        ) : (
          photos?.map((p) => (
            <div key={p.id} className="photo-thumb-wrap">
              <img
                src={p.url}
                className="photo-thumb"
                onClick={() => setViewPhoto(p.url)}
                alt="Exercise"
              />
              <button className="photo-delete" onClick={() => handleDelete(p.id)}>
                &times;
              </button>
            </div>
          ))
        )}
      </div>
      <button
        className="btn btn-small"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        📷 {uploading ? 'Uploading...' : 'Photo'}
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
