import React, { useState, useEffect, ChangeEvent } from 'react';

interface Props {
  name?: string; // form field name to populate (defaults to image_url)
  initialUrl?: string | null;
  token?: string | null; // admin auth token for upload endpoint
  maxSizeMB?: number;
  onChange?: (url: string) => void;
}

export default function ImageUpload({ name = 'image_url', initialUrl = null, token = null, maxSizeMB = 5, onChange }: Props) {
  const [preview, setPreview] = useState<string | null>(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPreview(initialUrl);
  }, [initialUrl]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setError('Invalid file type. Allowed: jpg, jpeg, png, webp.');
      return;
    }

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`File exceeds ${maxSizeMB}MB limit.`);
      return;
    }

    // show local preview
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);

      // Upload as base64 JSON to backend
      setUploading(true);
      try {
        const payload = { filename: file.name, data: dataUrl };
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || 'Upload failed');
          setUploading(false);
          return;
        }

        const uploadedUrl = json.url;
        // set hidden input value in containing form
        const form = (e.target as HTMLElement).closest('form') as HTMLFormElement | null;
        if (form) {
          let hidden = form.querySelector(`input[name="${name}"]`) as HTMLInputElement | null;
          if (!hidden) {
            hidden = document.createElement('input');
            hidden.type = 'hidden';
            hidden.name = name;
            form.appendChild(hidden);
          }
          hidden.value = uploadedUrl;
        }

        setUploading(false);
        setPreview(uploadedUrl);
        if (onChange) onChange(uploadedUrl);
      } catch (err: any) {
        console.error(err);
        setError('Upload failed');
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <label className="block text-xs font-bold text-[#2D2A26]/80 uppercase">Image</label>
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileChange}
          className="ml-2"
        />
        {uploading && <span className="text-sm text-[#7E4015]">Uploading…</span>}
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {preview && (
        <div className="mt-2">
          <img src={preview} alt="preview" className="max-w-xs max-h-40 object-cover border" />
        </div>
      )}
      {/* ensure there's a hidden input for forms that rely on image_url value */}
      <input type="hidden" name={name} value={preview || ''} />
    </div>
  );
}
