'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlayCircle, 
  Pause, 
  Volume2, 
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FeedPost } from '@/store/slices/feedSlice';

interface MediaFullscreenProps {
  post: FeedPost;
  initialIndex: number;
  onClose: () => void;
}

// Animation variants
const fullscreenVariants = {
  hidden: { 
    opacity: 0,
    scale: 0.9,
    y: 20
  },
  visible: { 
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
      duration: 0.4
    }
  },
  exit: { 
    opacity: 0,
    scale: 0.9,
    y: 20,
    transition: {
      duration: 0.3
    }
  }
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0
  })
};

// Fullscreen image component
const FullscreenImage: React.FC<{
  media: { url: string; type: string };
  onClose: () => void;
}> = ({ media }) => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 border-2 border-neutral-600 border-t-white rounded-full animate-spin" />
        </div>
      )}
      
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={media.url}
        alt="Post media"
        className="max-w-full max-h-full object-contain"
        onLoad={() => setIsLoading(false)}
        onError={() => setIsLoading(false)}
      />
      
    </div>
  );
};

// Fullscreen video component
const FullscreenVideo: React.FC<{
  media: { url: string; type: string };
  onClose: () => void;
}> = ({ media }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  // Auto-hide controls
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isPlaying]);

  return (
    <div 
      className="relative w-full h-full bg-black flex items-center justify-center"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 border-2 border-neutral-600 border-t-white rounded-full animate-spin" />
        </div>
      )}
      
      <video
        ref={videoRef}
        src={media.url}
        className="w-full h-full object-contain"
        onLoadedData={() => setIsLoading(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        muted={isMuted}
        playsInline
        preload="metadata"
      />
      
      {/* Video controls overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/20"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              className="w-20 h-20 bg-black/50 hover:bg-black/70 text-white rounded-full"
            >
              {isPlaying ? (
                <Pause className="w-10 h-10" />
              ) : (
                <PlayCircle className="w-10 h-10" />
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Video controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 right-4 flex gap-2"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="bg-black/50 hover:bg-black/70 text-white"
            >
              {isMuted ? (
                <VolumeX className="w-6 h-6" />
              ) : (
                <Volume2 className="w-6 h-6" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFullscreen}
              className="bg-black/50 hover:bg-black/70 text-white"
            >
              <Maximize2 className="w-6 h-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
};

export const MediaFullscreen: React.FC<MediaFullscreenProps> = ({
  post,
  initialIndex,
  onClose
}) => {
  const media = post.media || [];
  const [[page, direction], setPage] = useState([initialIndex, 0]);

  const mediaIndex = page % media.length;
  const currentMedia = media[mediaIndex >= 0 ? mediaIndex : media.length + mediaIndex];

  const paginate = useCallback((newDirection: number) => {
    setPage([page + newDirection, newDirection]);
  }, [page]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (media.length > 1) paginate(-1);
          break;
        case 'ArrowRight':
          if (media.length > 1) paginate(1);
          break;
        case ' ':
          event.preventDefault();
          // Toggle play/pause for videos
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [media.length, onClose, paginate]);

  if (media.length === 0) {
    return (
      <motion.div
        variants={fullscreenVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="w-full h-full bg-black flex items-center justify-center"
      >
        <div className="text-center text-neutral-500">
          <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 bg-neutral-700 rounded" />
          </div>
          <p className="text-sm">No media content</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={fullscreenVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="w-full h-full bg-black"
    >
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={page}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 }
          }}
          className="absolute inset-0"
        >
          {currentMedia.type === 'image' ? (
            <FullscreenImage media={currentMedia} onClose={onClose} />
          ) : (
            <FullscreenVideo media={currentMedia} onClose={onClose} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows */}
      {media.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => paginate(-1)}
            className="absolute top-1/2 left-4 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white z-10"
          >
            <ChevronLeft className="w-8 h-8" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => paginate(1)}
            className="absolute top-1/2 right-4 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white z-10"
          >
            <ChevronRight className="w-8 h-8" />
          </Button>
        </>
      )}

      {/* Media indicators */}
      {media.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {media.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                (i === mediaIndex || (mediaIndex < 0 && i === media.length + mediaIndex))
                  ? 'bg-white' 
                  : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}

      {/* Media counter */}
      <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
        {mediaIndex + 1} / {media.length}
      </div>
    </motion.div>
  );
};
