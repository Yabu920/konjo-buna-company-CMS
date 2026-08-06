import React, { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { getCsrfToken } from '../auth-client.ts';

interface Props {
  name?: string;
  initialUrl?: string | null;
  maxSizeMB?: number;
  onChange?: (url: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  onUnsupportedFile?: (file: File) => boolean;
  label?: string;
  helpText?: string;
}

type PendingUpload = { file: File; dataUrl: string };

export default function ImageUpload({
  name = 'image_url',
  initialUrl = null,
  maxSizeMB = 5,
  onChange,
  onUploadingChange,
  onUnsupportedFile,
  label = 'Image',
  helpText,
}: Props) {
  const inputId = useId();
  const requestRef = useRef<XMLHttpRequest | null>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl);
  const [uploadedUrl, setUploadedUrl] = useState(initialUrl ?? '');
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPreview(initialUrl);
    setUploadedUrl(initialUrl ?? '');
    setPendingUpload(null);
    setProgress(0);
    setError(null);
  }, [initialUrl]);

  useEffect(() => () => requestRef.current?.abort(), []);

  const setBusy = (busy: boolean) => {
    setUploading(busy);
    onUploadingChange?.(busy);
  };

  const upload = (pending: PendingUpload) => {
    requestRef.current?.abort();
    setPendingUpload(pending);
    setError(null);
    setProgress(0);
    setBusy(true);

    const request = new XMLHttpRequest();
    requestRef.current = request;
    request.open('POST', '/api/admin/upload');
    request.timeout = 60_000;
    request.setRequestHeader('Content-Type', 'application/json');
    request.setRequestHeader('X-CSRF-Token', getCsrfToken());
    request.upload.onprogress = event => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      requestRef.current = null;
      setBusy(false);
      let result: { url?: string; error?: string } = {};
      try { result = JSON.parse(request.responseText); } catch { /* use the safe fallback */ }
      if (request.status >= 200 && request.status < 300 && result.url) {
        setUploadedUrl(result.url);
        setPreview(result.url);
        setPendingUpload(null);
        setProgress(100);
        onChange?.(result.url);
      } else {
        setError(result.error || 'Upload failed. You can retry without choosing the file again.');
      }
    };
    request.onerror = () => {
      requestRef.current = null;
      setBusy(false);
      setError('Upload failed because of a network error. You can retry.');
    };
    request.ontimeout = () => {
      requestRef.current = null;
      setBusy(false);
      setError('Upload timed out after 60 seconds. Check the connection and retry.');
    };
    request.onabort = () => {
      requestRef.current = null;
      setBusy(false);
    };
    request.send(JSON.stringify({ filename: pending.file.name, data: pending.dataUrl }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      if (onUnsupportedFile?.(file)) {
        event.target.value = '';
        return;
      }
      setError('Invalid file type. Allowed: jpg, jpeg, png, webp.');
      event.target.value = '';
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File exceeds ${maxSizeMB}MB limit.`);
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setPreview(dataUrl);
      upload({ file, dataUrl });
    };
    reader.onerror = () => setError('The selected image could not be read. Choose it again.');
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-4">
        <label htmlFor={inputId} className="block text-xs font-bold text-[#2D2A26]/80 uppercase">{label}</label>
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={uploading}
          className="ml-2 max-w-full text-sm"
        />
      </div>
      {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
      {uploading && (
        <div className="space-y-1" aria-live="polite">
          <div className="h-2 overflow-hidden rounded-full bg-gray-200" role="progressbar" aria-label="Image upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div className="h-full bg-[#7E4015] transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs text-[#7E4015]">Uploadingâ€¦ {progress}%</span>
        </div>
      )}
      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-red-700">
          <span>{error}</span>
          {pendingUpload && !uploading && (
            <button type="button" onClick={() => upload(pendingUpload)} className="min-h-11 rounded-lg border border-red-300 px-4 py-2 text-xs font-bold hover:bg-red-50">
              Retry upload
            </button>
          )}
        </div>
      )}
      {preview && (
        <div className="mt-2">
          <img src={preview} width="320" height="160" alt="Selected upload preview" className="max-h-40 max-w-xs object-cover border" />
        </div>
      )}
      <input type="hidden" name={name} value={uploadedUrl} readOnly />
    </div>
  );
}
