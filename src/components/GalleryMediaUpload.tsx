import React, { useEffect, useId, useRef, useState } from 'react';
import { FileVideo, Upload, X } from 'lucide-react';
import { getCsrfToken } from '../auth-client.ts';
import ImageUpload from './ImageUpload.tsx';

interface GalleryMediaUploadProps {
  initialMediaType?: 'image' | 'video';
  initialUrl?: string | null;
  initialPosterUrl?: string | null;
  onBusyChange?: (busy: boolean) => void;
}

type UploadStatus = 'idle' | 'selected' | 'uploading' | 'success' | 'error' | 'cancelled';

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function GalleryMediaUpload({
  initialMediaType = 'image',
  initialUrl = null,
  initialPosterUrl = null,
  onBusyChange,
}: GalleryMediaUploadProps) {
  const inputId = useId();
  const typeId = useId();
  const requestRef = useRef<XMLHttpRequest | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>(initialMediaType);
  const [mediaUrl, setMediaUrl] = useState(initialUrl ?? '');
  const [posterUrl, setPosterUrl] = useState(initialPosterUrl ?? '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [maxSizeMB, setMaxSizeMB] = useState(200);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [message, setMessage] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const busy = imageUploading || status === 'uploading';

  useEffect(() => () => requestRef.current?.abort(), []);

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/admin/upload/config', { credentials: 'same-origin', signal: controller.signal })
      .then(async (response) => response.ok ? response.json() : null)
      .then((config) => {
        if (Number.isInteger(config?.max_video_upload_mb)) setMaxSizeMB(config.max_video_upload_mb);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const changeMediaType = (nextType: 'image' | 'video') => {
    requestRef.current?.abort();
    setMediaType(nextType);
    setMediaUrl(nextType === initialMediaType ? (initialUrl ?? '') : '');
    setPosterUrl(nextType === 'video' && initialMediaType === 'video' ? (initialPosterUrl ?? '') : '');
    setSelectedFile(null);
    setImageUploading(false);
    setProgress(0);
    setStatus('idle');
    setMessage('');
  };

  const prepareVideo = (file: File | null, automaticallyDetected = false) => {
    setSelectedFile(file);
    setProgress(0);
    setMessage(automaticallyDetected ? 'Video detected. Media type switched to Video automatically.' : '');
    if (!file) {
      setStatus('idle');
      return;
    }

    const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
    const validPair = (extension === '.mp4' && file.type === 'video/mp4')
      || (extension === '.webm' && file.type === 'video/webm');
    if (!validPair) {
      setStatus('error');
      setMessage('Choose an MP4 or WebM file whose filename and media type match.');
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setStatus('error');
      setMessage(`This video exceeds the ${maxSizeMB} MB limit.`);
      return;
    }
    setStatus('selected');
  };

  const handleUnsupportedImageFile = (file: File): boolean => {
    const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
    const isSupportedVideo = (extension === '.mp4' && file.type === 'video/mp4')
      || (extension === '.webm' && file.type === 'video/webm');
    if (!isSupportedVideo) return false;

    requestRef.current?.abort();
    setMediaType('video');
    setMediaUrl('');
    setPosterUrl('');
    prepareVideo(file, true);
    return true;
  };

  const selectVideo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (file && ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      changeMediaType('image');
      setMessage('Image detected. Media type switched to Image; choose the image again to upload it.');
      event.target.value = '';
      return;
    }
    prepareVideo(file);
  };

  const uploadVideo = () => {
    if (!selectedFile || status === 'error') return;
    setStatus('uploading');
    setProgress(0);
    setMessage('Uploading video…');

    const request = new XMLHttpRequest();
    requestRef.current = request;
    request.open('POST', '/api/admin/upload/video');
    request.setRequestHeader('Content-Type', selectedFile.type);
    request.setRequestHeader('X-File-Name', encodeURIComponent(selectedFile.name));
    request.setRequestHeader('X-CSRF-Token', getCsrfToken());
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      requestRef.current = null;
      let result: { url?: string; error?: string } = {};
      try { result = JSON.parse(request.responseText); } catch { /* handled by the fallback message */ }
      if (request.status >= 200 && request.status < 300 && result.url) {
        setMediaUrl(result.url);
        setProgress(100);
        setStatus('success');
        setMessage('Video uploaded. Save the gallery item to publish it.');
      } else {
        setStatus('error');
        setMessage(result.error || 'Video upload failed.');
      }
    };
    request.onerror = () => {
      requestRef.current = null;
      setStatus('error');
      setMessage('Video upload failed because of a network error.');
    };
    request.onabort = () => {
      requestRef.current = null;
      setStatus('cancelled');
      setMessage('Upload cancelled. The incomplete server file was removed.');
    };
    request.send(selectedFile);
  };

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor={typeId} className="block text-xs font-bold text-[#2D2A26]/80">Media type</label>
        <select
          id={typeId}
          name="media_type"
          value={mediaType}
          onChange={(event) => changeMediaType(event.target.value as 'image' | 'video')}
          disabled={busy}
          className="mt-1 block w-full bg-[#F8F1E7]/20 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
        >
          <option value="image">Image</option>
          <option value="video">Video (MP4 or WebM)</option>
        </select>
      </div>

      {mediaType === 'image' ? (
        <ImageUpload
          name="image_url"
          initialUrl={mediaUrl || null}
          onChange={setMediaUrl}
          onUploadingChange={setImageUploading}
          onUnsupportedFile={handleUnsupportedImageFile}
          label="Image file"
          helpText="JPG, JPEG, PNG, or WebP, up to 5 MB. Selecting an MP4 or WebM switches this form to Video automatically."
        />
      ) : (
        <div className="space-y-4">
          <input type="hidden" name="image_url" value={mediaUrl} readOnly />
          <div className="rounded-xl border border-gray-200 bg-[#F8F1E7]/20 p-4 space-y-3">
            <label htmlFor={inputId} className="block text-xs font-bold text-[#2D2A26]/80">Video file</label>
            <input
              id={inputId}
              type="file"
              accept="video/mp4,video/webm,.mp4,.webm"
              onChange={selectVideo}
              disabled={status === 'uploading'}
              className="block w-full text-sm"
            />
            <p className="text-xs text-gray-500">MP4 or WebM only, up to {maxSizeMB} MB. Selecting a supported image switches this form to Image. Files are streamed directly to storage.</p>
            {selectedFile && (
              <div className="flex items-center gap-3 text-xs text-[#2D2A26]" aria-live="polite">
                <FileVideo className="h-5 w-5 text-[#7E4015] shrink-0" aria-hidden="true" />
                <span className="min-w-0 break-all">{selectedFile.name}</span>
                <span className="shrink-0 text-gray-500">{selectedFile.type} · {formatBytes(selectedFile.size)}</span>
              </div>
            )}
            {status === 'uploading' && (
              <div className="space-y-2">
                <div className="h-2 overflow-hidden rounded-full bg-gray-200" role="progressbar" aria-label="Video upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                  <div className="h-full bg-[#7E4015] transition-[width]" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-xs text-gray-600">{progress}% uploaded</span>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={uploadVideo}
                disabled={!selectedFile || status === 'uploading' || status === 'error'}
                className="min-h-11 inline-flex items-center gap-2 rounded-lg bg-[#7E4015] px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload className="h-4 w-4" aria-hidden="true" /> Upload video
              </button>
              {status === 'uploading' && (
                <button type="button" onClick={() => requestRef.current?.abort()} className="min-h-11 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700">
                  <X className="h-4 w-4" aria-hidden="true" /> Cancel upload
                </button>
              )}
            </div>
          </div>

          {mediaUrl && (
            <video src={mediaUrl} poster={posterUrl || undefined} controls playsInline preload="none" className="max-h-64 w-full rounded-xl bg-black" aria-label="Selected gallery video preview" />
          )}
          <div>
            <p className="mb-2 text-xs font-bold text-[#2D2A26]/80">Optional video poster image</p>
            <ImageUpload name="poster_url" initialUrl={posterUrl || null} onChange={setPosterUrl} />
          </div>
        </div>
      )}

      {message && <p role={status === 'error' ? 'alert' : 'status'} className={`text-xs ${status === 'error' ? 'text-red-700' : 'text-gray-600'}`}>{message}</p>}

      {mediaType === 'image' && <input type="hidden" name="poster_url" value="" readOnly />}
    </div>
  );
}
