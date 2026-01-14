'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlayCircle, 
  Pause, 
  Volume2, 
  VolumeX,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Download,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FeedPost } from '@/store/slices/feedSlice';

interface PostDetailMediaProps {
  post: FeedPost;
  onMediaClick: (mediaIndex: number) => void;
}

// Animation variants
const mediaVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.2 }
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

// Image component
const ImageViewer: React.FC<{
  media: { url: string; type: string };
  onFullscreen: () => void;
}> = ({ media, onFullscreen }) => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="relative w-full h-full bg-muted flex items-center justify-center">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-neutral-600 border-t-white rounded-full animate-spin" />
        </div>
      )}
      
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={media.url}
        alt="Post media"
        className="w-full h-full object-contain"
        onLoad={() => setIsLoading(false)}
        onError={() => setIsLoading(false)}
      />
      
      {/* Fullscreen button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onFullscreen}
        className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white"
      >
        <Maximize2 className="w-5 h-5" />
      </Button>
    </div>
  );
};

// PDF component
const PDFViewer: React.FC<{
  media: { url: string; type: string };
  onFullscreen: () => void;
}> = ({ media, onFullscreen }) => {
  const [isLoading] = useState(true);

  return (
    <div className="relative w-full h-full bg-muted flex items-center justify-center">
      {isLoading && (
        <Loader2 className="h-8 w-8 animate-spin text-neutral-600 absolute" />
      )}
      <div className="w-full h-full flex flex-col items-center justify-center">
        <FileText className="w-16 h-16 text-neutral-500 mb-4" />
        <p className="text-neutral-400 text-sm mb-4">PDF Document</p>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(media.url, '_blank')}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onFullscreen}
            className="flex items-center gap-2"
          >
            <Maximize2 className="w-4 h-4" />
            View Fullscreen
          </Button>
        </div>
      </div>
    </div>
  );
};

// Video component
const VideoViewer: React.FC<{
  media: { url: string; type: string };
  onFullscreen: () => void;
}> = ({ media, onFullscreen }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
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

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-neutral-600 border-t-white rounded-full animate-spin" />
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
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePlay}
          className="w-16 h-16 bg-black/50 hover:bg-black/70 text-white rounded-full"
        >
          {isPlaying ? (
            <Pause className="w-8 h-8" />
          ) : (
            <PlayCircle className="w-8 h-8" />
          )}
        </Button>
      </div>
      
      {/* Video controls */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMute}
          className="bg-black/50 hover:bg-black/70 text-white"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onFullscreen}
          className="bg-black/50 hover:bg-black/70 text-white"
        >
          <Maximize2 className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

// Media carousel component
const MediaCarousel: React.FC<{
  media: { url: string; type: string }[];
  onFullscreen: (index: number) => void;
}> = ({ media, onFullscreen }) => {
  const [[page, direction], setPage] = useState([0, 0]);

  const mediaIndex = page % media.length;
  const currentMedia = media[mediaIndex >= 0 ? mediaIndex : media.length + mediaIndex];

  const paginate = (newDirection: number) => {
    setPage([page + newDirection, newDirection]);
  };

  const handleFullscreen = () => {
    onFullscreen(mediaIndex);
  };

  return (
    <div className="relative w-full h-full bg-muted">
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
            <ImageViewer media={currentMedia} onFullscreen={handleFullscreen} />
          ) : currentMedia.type === 'video' ? (
            <VideoViewer media={currentMedia} onFullscreen={handleFullscreen} />
          ) : currentMedia.type === 'pdf' ? (
            <PDFViewer media={currentMedia} onFullscreen={handleFullscreen} />
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full text-neutral-500">
              <FileText className="w-12 h-12 mb-2" />
              <p className="text-sm">Unsupported file type</p>
            </div>
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
            className="absolute top-1/2 left-4 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => paginate(1)}
            className="absolute top-1/2 right-4 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
          >
            <ChevronRight className="w-6 h-6" />
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
    </div>
  );
};

export const PostDetailMedia: React.FC<PostDetailMediaProps> = ({
  post,
  onMediaClick
}) => {
  const media = post.media || [];

  if (media.length === 0) {
    return (
      <motion.div
        variants={mediaVariants}
        initial="hidden"
        animate="visible"
        className="w-full h-48 bg-muted rounded-lg flex items-center justify-center"
      >
        <div className="text-center text-neutral-500">
          <div className="w-12 h-12 bg-muted/70 rounded-full flex items-center justify-center mx-auto mb-2">
            <div className="w-6 h-6 bg-neutral-700 rounded" />
          </div>
          <p className="text-sm">No media content</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={mediaVariants}
      initial="hidden"
      animate="visible"
        className="w-full h-64 rounded-lg overflow-hidden bg-muted"
    >
      <MediaCarousel 
        media={media} 
        onFullscreen={onMediaClick}
      />
    </motion.div>
  );
};
