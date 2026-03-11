import React, { useEffect, useRef } from 'react';

interface VideoPlayerProps {
  stream: MediaStream | null;
  muted?: boolean;
  label: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ stream, muted = false, label }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative w-full h-full bg-black rounded overflow-hidden border border-zinc-300 shadow-sm group">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className="w-full h-full object-contain"
      />
      <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-white/80 backdrop-blur rounded text-[10px] font-bold text-zinc-800 border border-zinc-300 uppercase tracking-wider">
        {label}
      </div>
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-100">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-zinc-300 border-t-[#0055ff] animate-spin" />
            <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Waiting...</p>
          </div>
        </div>
      )}
    </div>
  );
};
