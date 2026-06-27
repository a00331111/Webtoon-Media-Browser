import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { execFile } from 'child_process';

const THUMBNAIL_DIR = path.join(app.getPath('temp'), 'webtoon-media-browser', 'thumbnails');
const LOG_DIR = path.join(app.getPath('userData'), 'logs');

// Ensure directories exist
if (!fs.existsSync(THUMBNAIL_DIR)) {
  fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
}
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Log file
const LOG_FILE = path.join(LOG_DIR, `app-${new Date().toISOString().split('T')[0]}.log`);

function log(message: string): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, logMessage);
}

// Check if path contains special characters that FFmpeg can't handle
function hasSpecialChars(filePath: string): boolean {
  return /[^\x00-\x7F]/.test(filePath);
}

// Get safe path for FFmpeg (copy to temp if needed)
function getSafePath(filePath: string): string {
  if (!hasSpecialChars(filePath)) {
    return filePath;
  }

  // Create a safe temp path using hex hash
  const hash = Buffer.from(filePath).toString('hex').substring(0, 32);
  const ext = path.extname(filePath).toLowerCase();
  const safePath = path.join(THUMBNAIL_DIR, `temp_${hash}${ext}`);

  // Copy file if not already copied
  if (!fs.existsSync(safePath)) {
    try {
      fs.copyFileSync(filePath, safePath);
      log(`Copied file to safe path: ${filePath} -> ${safePath}`);
    } catch (error) {
      log(`Failed to copy file: ${error}`);
      return filePath;
    }
  }

  return safePath;
}

// Check if FFmpeg is available
function checkFFmpeg(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile('ffmpeg', ['-version'], (error) => {
      resolve(!error);
    });
  });
}

export async function extractThumbnail(videoPath: string): Promise<string | null> {
  // Use shorter hash to avoid Windows path length limit
  const videoHash = Buffer.from(videoPath).toString('hex').substring(0, 32);
  const thumbnailPath = path.join(THUMBNAIL_DIR, `${videoHash}.jpg`);

  // Return cached thumbnail if exists
  if (fs.existsSync(thumbnailPath)) {
    return thumbnailPath;
  }

  // Check if FFmpeg is available
  const hasFFmpeg = await checkFFmpeg();
  if (!hasFFmpeg) {
    log('FFmpeg not available, skipping thumbnail extraction');
    return null;
  }

  // Get safe path for FFmpeg
  const safePath = getSafePath(videoPath);

  return new Promise((resolve) => {
    const args = [
      '-i', safePath,
      '-ss', '00:00:01',
      '-vframes', '1',
      '-vf', 'scale=320:-1',
      '-y',
      thumbnailPath
    ];

    log(`Extracting thumbnail: ${videoPath}`);

    execFile('ffmpeg', args, { timeout: 10000 }, (error) => {
      if (error) {
        log(`Thumbnail extraction failed: ${error.message}`);
        resolve(null);
      } else if (fs.existsSync(thumbnailPath)) {
        log(`Thumbnail extracted: ${thumbnailPath}`);
        resolve(thumbnailPath);
      } else {
        log('Thumbnail file not created');
        resolve(null);
      }
    });
  });
}

export async function getVideoMetadata(videoPath: string): Promise<VideoMetadata | null> {
  const hasFFmpeg = await checkFFmpeg();
  if (!hasFFmpeg) {
    return null;
  }

  const safePath = getSafePath(videoPath);

  return new Promise((resolve) => {
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      safePath
    ];

    execFile('ffprobe', args, { timeout: 10000 }, (error, stdout) => {
      if (error) {
        log(`Failed to get video metadata: ${error.message}`);
        resolve(null);
        return;
      }

      try {
        const data = JSON.parse(stdout);
        const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
        const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio');

        resolve({
          duration: parseFloat(data.format?.duration || '0'),
          width: videoStream?.width || 0,
          height: videoStream?.height || 0,
          codec: videoStream?.codec_name || 'unknown',
          fps: videoStream?.r_frame_rate ? eval(videoStream.r_frame_rate) : 0,
          bitrate: parseInt(data.format?.bit_rate || '0'),
          hasAudio: !!audioStream,
        });
      } catch {
        resolve(null);
      }
    });
  });
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  codec: string;
  fps: number;
  bitrate: number;
  hasAudio: boolean;
}
