# Webtoon Media Browser

一个支持平行眼 3D 模式的本地图片视频浏览器，提供类似 Webtoon 的浏览体验。

## 功能特性

- **Webtoon 风格浏览** - 纵向滚动浏览图片和视频
- **视频缩略图** - 大尺寸缩略图预览，点击播放按钮打开独立播放窗口
- **FFmpeg 集成** - 支持多种视频格式解码播放
- **平行眼 3D 模式** - 一键切换并排立体显示
- **右键菜单集成** - 可集成到 Windows 文件夹右键菜单
- **可缩放界面** - 支持 Ctrl+滚轮 缩放内容

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+O` | 打开文件夹 |
| `Ctrl+=` | 放大 |
| `Ctrl+-` | 缩小 |
| `Ctrl+0` | 实际大小 |
| `Ctrl+1` | 适应宽度 |
| `Ctrl+2` | 适应窗口 |

### 播放器快捷键

| 快捷键 | 功能 |
|--------|------|
| `Space` | 播放/暂停 |
| `F` | 全屏切换 |
| `M` | 静音切换 |
| `3` | 3D 模式切换 |
| `←` | 快退 5 秒 |
| `→` | 快进 5 秒 |
| `↑` | 音量增加 |
| `↓` | 音量减少 |

## 开发

### 环境要求

- Node.js >= 18
- npm >= 9
- FFmpeg（需要添加到系统 PATH 或放置在 assets/ffmpeg 目录）

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建

```bash
npm run build
```

### 打包

```bash
npm run package:win
```

## 项目结构

```
webtoon-media-browser/
├── src/
│   ├── main/           # Electron 主进程
│   │   ├── main.ts     # 主进程入口
│   │   ├── ipc/        # IPC 处理器
│   │   └── utils/      # 工具函数
│   ├── preload/        # 预加载脚本
│   │   └── preload.ts  # 安全 API 桥接
│   └── renderer/       # React 渲染进程
│       ├── components/ # UI 组件
│       ├── styles/     # 样式文件
│       └── main.tsx    # 渲染进程入口
├── assets/             # 静态资源
├── build/              # 构建配置
└── release/            # 打包输出
```

## 技术栈

- Electron
- React
- TypeScript
- Vite
- FFmpeg

## 许可证

MIT
