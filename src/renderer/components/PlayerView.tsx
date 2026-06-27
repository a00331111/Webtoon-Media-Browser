import React, { useState, useEffect, useRef, useCallback } from 'react';
import './PlayerView.css';

// Convert Windows path to file:// URL
function pathToFileURL(filePath: string): string {
  try {
    // Replace backslashes with forward slashes
    const normalized = filePath.replace(/\\/g, '/');

    // Split by segments and encode each one to handle Chinese chars and brackets
    const segments = normalized.split('/');
    const encodedSegments = segments.map((segment, i) => {
      if (i === 0 && segment.endsWith(':')) {
        // Drive letter - don't encode
        return segment;
      }
      // Encode each segment, preserving special chars that encodeURI handles
      return segment.replace(/[^a-zA-Z0-9._~:\/\[\]()一-鿿㐀-䶿豈-﫿-]/g, (char) => {
        return encodeURIComponent(char);
      });
    });

    return `file:///${encodedSegments.join('/')}`;
  } catch (e) {
    // Fallback: just return the path as-is with file:// prefix
    console.warn('pathToFileURL encoding failed, using raw path:', e);
    const normalized = filePath.replace(/\\/g, '/');
    return `file:///${normalized}`;
  }
}

function PlayerView() {
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [is3DMode, setIs3DMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [stereoGap, setStereoGap] = useState(0); // Gap between left and right eyes (0-100%)
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasLeftRef = useRef<HTMLCanvasElement>(null);
  const canvasRightRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>();
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const cleanup = window.electronAPI.onVideoLoad((path) => {
      setVideoPath(path);
    });
    return cleanup;
  }, []);

  // Load video
  useEffect(() => {
    if (videoRef.current && videoPath) {
      videoRef.current.src = pathToFileURL(videoPath);
      videoRef.current.load();
    }
  }, [videoPath]);

  // Draw video to canvases when in 3D mode
  useEffect(() => {
    if (!is3DMode || !videoRef.current) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      return;
    }

    const video = videoRef.current;
    const canvasLeft = canvasLeftRef.current;
    const canvasRight = canvasRightRef.current;

    if (!canvasLeft || !canvasRight) return;

    const ctxLeft = canvasLeft.getContext('2d');
    const ctxRight = canvasRight.getContext('2d');

    if (!ctxLeft || !ctxRight) return;

    const drawFrame = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        canvasLeft.width = video.videoWidth;
        canvasLeft.height = video.videoHeight;
        canvasRight.width = video.videoWidth;
        canvasRight.height = video.videoHeight;
        ctxLeft.drawImage(video, 0, 0);
        ctxRight.drawImage(video, 0, 0);
      }

      animFrameRef.current = requestAnimationFrame(drawFrame);
    };

    drawFrame();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [is3DMode]);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      setVolume(vol);
      setIsMuted(vol === 0);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const toggle3DMode = useCallback(() => {
    setIs3DMode((prev) => !prev);
  }, []);

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case ' ':
        e.preventDefault();
        togglePlay();
        break;
      case 'f':
      case 'F':
        toggleFullscreen();
        break;
      case 'm':
      case 'M':
        toggleMute();
        break;
      case '3':
        toggle3DMode();
        break;
      case 'ArrowLeft':
        if (videoRef.current) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
        }
        break;
      case 'ArrowRight':
        if (videoRef.current) {
          videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
        }
        break;
      case 'ArrowUp':
        setVolume((prev) => {
          const newVol = Math.min(1, prev + 0.1);
          if (videoRef.current) videoRef.current.volume = newVol;
          return newVol;
        });
        break;
      case 'ArrowDown':
        setVolume((prev) => {
          const newVol = Math.max(0, prev - 0.1);
          if (videoRef.current) videoRef.current.volume = newVol;
          return newVol;
        });
        break;
    }
  }, [togglePlay, toggleFullscreen, toggleMute, toggle3DMode, duration]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className={`player-view ${is3DMode ? 'stereo-3d' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Hidden video source */}
      <video
        ref={videoRef}
        className={`video-source ${is3DMode ? 'hidden' : ''}`}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
      />

      {/* 3D Mode - Two canvases */}
      {is3DMode && (
        <div className="stereo-container" style={{ gap: `${stereoGap * 0.5}%` }}>
          <div className="stereo-eye">
            <canvas
              ref={canvasLeftRef}
              className="stereo-canvas"
              onClick={togglePlay}
              onDoubleClick={toggleFullscreen}
            />
          </div>
          <div className="stereo-eye">
            <canvas
              ref={canvasRightRef}
              className="stereo-canvas"
              onClick={togglePlay}
              onDoubleClick={toggleFullscreen}
            />
          </div>
        </div>
      )}

      <div className={`controls ${showControls ? 'visible' : ''}`}>
        <div className="progress-bar">
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
          />
          <div
            className="progress-fill"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>

        <div className="controls-row">
          <div className="controls-left">
            <button className="btn-control" onClick={togglePlay}>
              {isPlaying ? (
                <svg viewBox="0 0 24 24" fill="white">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="white">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button className="btn-control" onClick={toggleMute}>
              {isMuted ? (
                <svg viewBox="0 0 24 24" fill="white">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="white">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              )}
            </button>

            <div className="volume-control">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
              />
            </div>

            <span className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="controls-right">
            {/* 3D Gap slider - only show in 3D mode */}
            {is3DMode && (
              <div className="stereo-gap-control">
                <span className="gap-label">间距</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={stereoGap}
                  onChange={(e) => setStereoGap(parseInt(e.target.value))}
                  className="gap-slider"
                />
                <span className="gap-value">{stereoGap}%</span>
              </div>
            )}

            <button
              className={`btn-control btn-3d ${is3DMode ? 'active' : ''}`}
              onClick={toggle3DMode}
              title="3D 平行眼模式 (3)"
            >
              <span className="icon-3d">3D</span>
            </button>

            <button className="btn-control" onClick={toggleFullscreen}>
              {isFullscreen ? (
                <svg viewBox="0 0 24 24" fill="white">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="white">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerView;
