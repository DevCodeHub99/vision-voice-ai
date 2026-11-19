
import { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback, memo } from 'react';
import { calculateTargetDimensions } from '../utils/imageProcessor';

interface CameraCaptureProps {
  onCapture: (imageDataUrl: string) => void;
  isActive: boolean;
}

export interface CameraHandle {
  capture: () => void;
}

const CameraCapture = forwardRef<CameraHandle, CameraCaptureProps>(({ onCapture, isActive }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [retryKey, setRetryKey] = useState(0);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const initCamera = async () => {
      stopCamera();
      if (!isActive) return;

      try {
        let newStream: MediaStream;
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'environment', // Prefer back camera on mobile
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }
          });
        } catch {
          // Fallback for laptops/desktops with standard webcams
          newStream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        if (isCancelled || !videoRef.current) {
          newStream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = newStream;
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
        setError(null);
      } catch (err) {
        if (!isCancelled) {
          console.error("Error accessing camera:", err);
          setError("Camera access denied. Please enable camera permissions.");
        }
      }
    };

    initCamera();

    return () => {
      isCancelled = true;
      stopCamera();
    };
  }, [isActive, stopCamera, retryKey]);

  const handleCapture = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Check if video is ready
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const { width, height } = calculateTargetDimensions(video.videoWidth, video.videoHeight);
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (context) {
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = 'high';
          context.drawImage(video, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8); // Compress quality to 0.8
          // Explicitly release backing store to prevent WebKit GPU memory retention
          canvas.width = 0;
          canvas.height = 0;
          onCapture(dataUrl);
        }
      }
    }
  }, [onCapture]);

  useImperativeHandle(ref, () => ({
    capture: handleCapture
  }));

  return (
    <div className="absolute inset-0 z-0 bg-black overflow-hidden" role="region" aria-label="Camera view">
      {error ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
          <i className="fa-solid fa-triangle-exclamation text-4xl text-red-500 mb-4"></i>
          <p className="text-red-100 font-medium">{error}</p>
          <button onClick={() => setRetryKey(k => k + 1)} className="mt-4 px-4 py-2 bg-slate-800 rounded text-white active:scale-95 transition-transform">Retry</button>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          aria-label="Live camera viewfinder"
          className="w-full h-full object-cover opacity-80"
        />
      )}
      <canvas ref={canvasRef} className="hidden" />
      {/* Dark Gradient Overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-transparent to-slate-900/90 pointer-events-none"></div>
    </div>
  );
});

export default memo(CameraCapture);
