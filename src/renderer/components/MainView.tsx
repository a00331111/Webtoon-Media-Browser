import React, { useState, useEffect, useCallback, useRef } from 'react';
import './MainView.css';

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

interface MediaItem {
  name: string;
  path: string;
  type: 'image' | 'video';
  thumbnail?: string;
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
const VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'];

// Convert Windows path to file:// URL - handle emojis and special chars
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
      return segment.replace(/[^a-zA-Z0-9._~:\/\[\]()一-鿿㐀-䶿豈-﫿-]/g, (char) => {
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

function MainView() {
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [zoom, setZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [siblingFolders, setSiblingFolders] = useState<FileEntry[]>([]);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get sibling folders for navigation
  const loadSiblingFolders = useCallback(async (folderPath: string) => {
    try {
      const parentPath = folderPath.substring(0, folderPath.lastIndexOf('\\'));
      if (parentPath) {
        const entries: FileEntry[] = await window.electronAPI.readDir(parentPath);
        const folders = entries.filter(e => e.isDirectory);
        setSiblingFolders(folders);
      }
    } catch (error) {
      console.error('Failed to load sibling folders:', error);
    }
  }, []);

  const loadFolder = useCallback(async (folderPath: string) => {
    setIsLoading(true);
    setCurrentFolder(folderPath);
    setMediaItems([]);

    try {
      const files: FileEntry[] = await window.electronAPI.readDir(folderPath);
      const mediaFiles: MediaItem[] = [];

      // Filter media files first
      const mediaFileEntries = files.filter(file => {
        const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        return IMAGE_EXTENSIONS.includes(ext) || VIDEO_EXTENSIONS.includes(ext);
      });

      // Load items one by one (lazy loading)
      for (const file of mediaFileEntries) {
        const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

        if (IMAGE_EXTENSIONS.includes(ext)) {
          const item: MediaItem = {
            name: file.name,
            path: file.path,
            type: 'image',
          };
          mediaFiles.push(item);
          setMediaItems([...mediaFiles]); // Update state to show immediately
        } else if (VIDEO_EXTENSIONS.includes(ext)) {
          const thumbnail = await window.electronAPI.extractThumbnail(file.path);
          const item: MediaItem = {
            name: file.name,
            path: file.path,
            type: 'video',
            thumbnail: thumbnail || undefined,
          };
          mediaFiles.push(item);
          setMediaItems([...mediaFiles]); // Update state to show immediately
        }
      }

      // Load sibling folders for navigation
      await loadSiblingFolders(folderPath);
    } catch (error) {
      console.error('Failed to load folder:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadSiblingFolders]);

  useEffect(() => {
    const cleanup = window.electronAPI.onFolderSelected((path) => {
      loadFolder(path);
    });

    return cleanup;
  }, [loadFolder]);

  useEffect(() => {
    const cleanup = window.electronAPI.onViewCommand((command) => {
      switch (command) {
        case 'fitWidth':
          setZoom(100);
          break;
        case 'fitWindow':
          setZoom(75);
          break;
        case 'actualSize':
          setZoom(100);
          break;
        case 'zoomIn':
          setZoom((prev) => Math.min(prev + 10, 200));
          break;
        case 'zoomOut':
          setZoom((prev) => Math.max(prev - 10, 50));
          break;
      }
    });

    return cleanup;
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowFolderDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenFolder = async () => {
    const folderPath = await window.electronAPI.openFolder();
    if (folderPath) {
      loadFolder(folderPath);
    }
  };

  const handleVideoClick = async (videoPath: string) => {
    await window.electronAPI.openPlayer(videoPath);
  };

  const handleFolderSelect = (folderPath: string) => {
    loadFolder(folderPath);
    setShowFolderDropdown(false);
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      setZoom((prev) => {
        const delta = e.deltaY > 0 ? -10 : 10;
        return Math.max(50, Math.min(200, prev + delta));
      });
    }
  }, []);

  // Get display name for current folder
  const getFolderDisplayName = () => {
    if (!currentFolder) return '';
    const parts = currentFolder.split('\\');
    return parts[parts.length - 1] || currentFolder;
  };

  // Get parent path
  const getParentPath = () => {
    if (!currentFolder) return '';
    return currentFolder.substring(0, currentFolder.lastIndexOf('\\'));
  };

  return (
    <div className="main-view">
      <div className="toolbar">
        <button className="btn-open" onClick={handleOpenFolder}>
          打开文件夹
        </button>

        {currentFolder && (
          <div className="folder-navigation" ref={dropdownRef}>
            <button
              className="btn-nav btn-parent"
              onClick={() => {
                const parent = getParentPath();
                if (parent) handleFolderSelect(parent);
              }}
              title="上级目录"
            >
              ↑
            </button>

            <div className="folder-path-container">
              <button
                className="btn-folder-name"
                onClick={() => setShowFolderDropdown(!showFolderDropdown)}
              >
                <span className="folder-icon">📁</span>
                <span className="folder-name">{getFolderDisplayName()}</span>
                <span className="dropdown-arrow">▼</span>
              </button>

              {showFolderDropdown && siblingFolders.length > 0 && (
                <div className="folder-dropdown">
                  {siblingFolders.map((folder, index) => (
                    <button
                      key={index}
                      className={`dropdown-item ${folder.path === currentFolder ? 'active' : ''}`}
                      onClick={() => handleFolderSelect(folder.path)}
                    >
                      <span className="dropdown-icon">📁</span>
                      <span className="dropdown-name">{folder.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="folder-full-path">{currentFolder}</span>
          </div>
        )}

        <div className="zoom-controls">
          <button onClick={() => setZoom((prev) => Math.max(prev - 10, 50))}>-</button>
          <span className="zoom-value">{zoom}%</span>
          <button onClick={() => setZoom((prev) => Math.min(prev + 10, 200))}>+</button>
        </div>
      </div>

      <div
        className="content-scroll"
        ref={scrollRef}
        onWheel={handleWheel}
      >
        {mediaItems.length === 0 && !isLoading ? (
          <div className="empty-state">
            <div className="icon">📁</div>
            <h2>欢迎使用 Webtoon Media Browser</h2>
            <p>点击上方"打开文件夹"按钮开始浏览</p>
            <p className="shortcut">快捷键: Ctrl+O</p>
          </div>
        ) : (
          <div className="media-grid" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
            {mediaItems.map((item, index) => (
              <div key={index} className="media-item">
                <div className="media-info">
                  <span className="file-name">{item.name}</span>
                </div>
                {item.type === 'image' ? (
                  <div className="image-container">
                    <img
                      src={pathToFileURL(item.path)}
                      alt={item.name}
                      loading="lazy"
                      onError={(e) => {
                        console.error('Image load error:', item.path);
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className="video-container"
                    onClick={() => handleVideoClick(item.path)}
                  >
                    {item.thumbnail ? (
                      <img
                        src={pathToFileURL(item.thumbnail)}
                        alt={item.name}
                        className="video-thumbnail"
                        onError={(e) => {
                          console.error('Thumbnail load error:', item.thumbnail);
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="video-placeholder">
                        <span className="video-icon">🎬</span>
                      </div>
                    )}
                    <div className="play-button">
                      <svg viewBox="0 0 24 24" fill="white">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="loading-indicator">
                <div className="loading-spinner"></div>
                <span>加载中...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MainView;
