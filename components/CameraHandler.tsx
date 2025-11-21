
import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';

interface CameraHandlerProps {
  onFrameCapture: (base64: string) => void;
  isActive: boolean;
  isAutoMode: boolean;
  scanIntervalMs?: number;
}

export interface CameraHandlerRef {
  captureOnce: () => void;
}

const CameraHandler = forwardRef<CameraHandlerRef, CameraHandlerProps>(({ 
  onFrameCapture, 
  isActive, 
  isAutoMode, 
  scanIntervalMs = 2000 
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Check for secure context (required for getUserMedia)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      setError("Secure Context Required (HTTPS or localhost)");
      return;
    }

    const startCamera = async () => {
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          } 
        });
        
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setError(null);
      } catch (err) {
        console.error("Camera access error:", err);
        setError("Camera access denied. Please allow permission.");
      }
    };

    if (isActive) {
      startCamera();
    } else {
      // Cleanup if deactivated
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [isActive]);

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // DRAW RAW IMAGE (No Mirroring for AI)
          // The AI needs to see the "viewer's perspective" (what I look like to you).
          // The video element is mirrored via CSS for the user's benefit (mirror metaphor),
          // but the AI should receive the raw sensor data.
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // High quality JPG for AI
          const base64 = canvas.toDataURL('image/jpeg', 0.90);
          onFrameCapture(base64);
        }
      }
    }
  };

  useImperativeHandle(ref, () => ({
    captureOnce: captureFrame
  }));

  useEffect(() => {
    if (isAutoMode && isActive) {
      intervalRef.current = window.setInterval(() => {
        captureFrame();
      }, scanIntervalMs);
    } else {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoMode, isActive, scanIntervalMs]);

  return (
    <div className="relative w-full h-full bg-slate-900 rounded-2xl overflow-hidden">
      {!isActive && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-500 flex-col gap-2">
          <svg className="w-12 h-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          <p>Camera Offline</p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-red-400 p-4 text-center bg-slate-900 z-10">
          <p>{error}</p>
        </div>
      )}
      {/* Video is mirrored via CSS for user comfort, but capture is raw */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className={`w-full h-full object-cover transform scale-x-[-1] ${!isActive ? 'hidden' : ''}`}
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {isActive && isAutoMode && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
           <div className="w-full h-1 bg-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.8)] animate-[scan_2s_linear_infinite]"></div>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
});

CameraHandler.displayName = 'CameraHandler';

export default CameraHandler;
