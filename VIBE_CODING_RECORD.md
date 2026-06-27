# Vibe Coding 记录

## 项目信息

- **项目名称**: Webtoon Media Browser
- **开发日期**: 2026-06-27
- **当前版本**: 0.2.6
- **技术栈**: Electron + React + TypeScript + Vite

## 项目概述

一个本地图片视频浏览器，支持类似 Webtoon 的纵向滚动浏览体验，具有平行眼 3D 模式、FFmpeg 集成播放、右键菜单集成和可缩放界面。

---

## 开发历程

### 阶段 1: 项目初始化与基础架构

**完成内容**:
- 创建 Electron + React + TypeScript 项目结构
- 配置 package.json 和依赖项
- 设置 Electron 主进程和渲染进程通信
- 配置构建脚本和开发环境
- 创建菜单栏组件（文件、视图、设置、帮助）

### 阶段 2: 核心媒体查看器

**完成内容**:
- 实现文件夹选择对话框（通过菜单栏打开）
- 实现 Webtoon 风格纵向滚动布局组件
- 实现图片加载和显示组件（支持 JPG/PNG/GIF/WebP）
- 实现图片自适应宽度显示
- 实现媒体文件信息显示（文件名、尺寸、大小）

### 阶段 3: 视频缩略图与播放入口

**完成内容**:
- 集成 FFmpeg 用于视频缩略图提取
- 实现视频缩略图生成组件
- 实现大缩略图+播放按钮叠加显示
- 实现点击缩略图触发播放事件

### 阶段 4: 独立视频播放窗口

**完成内容**:
- 创建独立播放窗口组件（BrowserWindow）
- 实现视频播放核心逻辑（FFmpeg 解码）
- 实现播放控制组件（播放/暂停/进度条/音量）
- 实现全屏切换功能
- 实现视频元数据解析和显示
- 实现播放窗口关闭时资源释放

### 阶段 5: 平行眼 3D 模式

**完成内容**:
- 在播放窗口添加 3D 模式切换按钮
- 实现并排立体视频检测和渲染
- 实现 3D 视图参数调整（眼距/对齐）
- 在主窗口实现立体图片的 3D 模式支持

**技术方案**:
- 使用 Canvas 绘制两个相同的视频画面
- 一个视频源 → 两个 Canvas（左眼/右眼）
- 使用 `requestAnimationFrame` 持续同步绘制
- 只有一个音频源，避免声音重复

### 阶段 6: 窗口缩放与视图控制

**完成内容**:
- 实现自定义窗口边框和角落拖拽
- 实现长宽比锁定缩放逻辑
- 实现鼠标滚轮缩放内容（Ctrl+滚轮）
- 实现缩放按钮和快捷键
- 实现视图适应功能（适应宽度/适应窗口/实际大小）
- 实现缩放状态显示

### 阶段 7: Windows Shell 集成

**完成内容**:
- 实现设置对话框（菜单栏 → 设置）
- 添加"集成到文件夹右键菜单"勾选框
- 实现右键菜单注册逻辑（文件夹和文件）
- 实现应用启动参数处理（接收文件夹路径）
- 实现卸载清理逻辑

### 阶段 8: 打包与发布

**完成内容**:
- 配置 electron-builder 打包设置
- 创建 Windows 安装程序
- 测试安装和卸载流程
- 测试右键菜单集成和取消集成
- 编写用户文档

---

## 关键问题与解决方案

### 1. Windows 路径编码问题

**问题**: 路径中的中文、emoji、方括号等特殊字符导致文件无法加载

**解决方案**:
```typescript
function pathToFileURL(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const segments = normalized.split('/');
  const encodedSegments = segments.map((segment, i) => {
    if (i === 0 && segment.endsWith(':')) {
      return segment; // 驱动器号不编码
    }
    return segment.replace(/[^a-zA-Z0-9._~:\/\[\]()一-鿿㐀-䶿豈-﫿-]/g, (char) => {
      return encodeURIComponent(char);
    });
  });
  return `file:///${encodedSegments.join('/')}`;
}
```

### 2. 3D 模式同步问题

**问题**: 两个视频元素不同步，声音重复

**解决方案**:
- 使用一个隐藏的 `<video>` 元素播放音频
- 使用两个 `<canvas>` 元素显示画面
- 通过 `requestAnimationFrame` 持续绘制视频到 Canvas
- 完美同步，只有一个音频源

### 3. FFmpeg 路径问题

**问题**: FFmpeg 无法处理包含特殊字符的路径

**解决方案**:
- 检测路径中的特殊字符
- 自动复制文件到临时目录（无特殊字符）
- 使用 `execFile` 代替 `exec` 避免 shell 转义问题

### 4. 缩略图路径过长

**问题**: Base64 编码的缩略图路径超过 Windows 260 字符限制

**解决方案**:
```typescript
// 使用 HEX 编码，只取前 32 个字符
const videoHash = Buffer.from(videoPath).toString('hex').substring(0, 32);
const thumbnailPath = path.join(THUMBNAIL_DIR, `${videoHash}.jpg`);
```

### 5. 控制台自动打开

**问题**: 打包后的程序自动打开 DevTools

**解决方案**:
```typescript
// 使用 app.isPackaged 检测是否为打包后的程序
if (!app.isPackaged) {
  mainWindow.webContents.openDevTools();
}
```

---

## 项目结构

```
webtoon-media-browser/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── main.ts             # 主进程入口，窗口管理，菜单栏
│   │   ├── ipc/
│   │   │   ├── ffmpeg.ts       # FFmpeg 视频缩略图提取
│   │   │   └── shell.ts        # Windows 右键菜单集成
│   │   └── utils/
│   │       └── env.ts          # 环境检测工具
│   ├── preload/
│   │   └── preload.ts          # 安全 IPC 桥接
│   └── renderer/               # React 渲染进程
│       ├── components/
│       │   ├── MainView.tsx    # Webtoon 风格浏览主界面
│       │   ├── MainView.css
│       │   ├── PlayerView.tsx  # 独立视频播放窗口
│       │   └── PlayerView.css
│       ├── App.tsx             # 路由配置
│       ├── main.tsx            # 渲染进程入口
│       └── styles/
│           └── global.css      # 全局样式
├── versions/                    # 版本输出目录
├── electron-builder.yml        # 打包配置
├── package.json
├── tsconfig.json
├── tsconfig.main.json
├── tsconfig.preload.json
├── vite.config.ts
├── build-version.bat           # 版本构建脚本
├── test-open.bat               # 测试脚本
└── README.md
```

---

## 快捷键

### 主界面

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+O` | 打开文件夹 |
| `Ctrl+=` | 放大 |
| `Ctrl+-` | 缩小 |
| `Ctrl+0` | 实际大小 |
| `Ctrl+1` | 适应宽度 |
| `Ctrl+2` | 适应窗口 |

### 播放器

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

---

## 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 0.1.0 | 2026-06-27 | 初始版本，基础功能完成 |
| 0.1.1 | 2026-06-27 | 修复 Windows 路径问题 |
| 0.1.2 | 2026-06-27 | 修复 preload 脚本路径 |
| 0.1.3 | 2026-06-27 | 修复 CSS 导入问题 |
| 0.1.4 | 2026-06-27 | 修复 preload 编译问题 |
| 0.1.5 | 2026-06-27 | 3D 模式初步实现 |
| 0.1.6 | 2026-06-27 | 文件夹导航、懒加载 |
| 0.1.7 | 2026-06-27 | 3D 模式使用 Canvas 重写 |
| 0.1.8 | 2026-06-27 | 3D 模式完善 |
| 0.1.9 | 2026-06-27 | 间距滑块、FFmpeg 路径修复 |
| 0.2.0 | 2026-06-27 | 间距滑块改进、路径编码修复 |
| 0.2.1 | 2026-06-27 | URI 编码修复 |
| 0.2.2 | 2026-06-27 | 缩略图路径修复 |
| 0.2.3 | 2026-06-27 | 缩略图路径长度修复 |
| 0.2.4 | 2026-06-27 | 中文路径支持、控制台修复 |
| 0.2.5 | 2026-06-27 | 控制台问题彻底修复 |
| 0.2.6 | 2026-06-27 | 当前版本 |

---

## 待优化功能

1. **性能优化**: 大量文件时的加载性能
2. **更多格式支持**: 添加更多图片和视频格式支持
3. **快捷键自定义**: 允许用户自定义快捷键
4. **主题切换**: 支持明暗主题切换
5. **文件预览**: 鼠标悬停预览功能
6. **批量操作**: 批量重命名、移动等操作

---

## 构建说明

### 开发模式

```bash
npm run dev
```

### 打包构建

```bash
# 使用版本构建脚本（自动递增版本号）
build-version.bat

# 或手动打包
npm run build
npx @electron/packager . "Webtoon Media Browser" --platform=win32 --arch=x64 --out=versions --overwrite --asar --ignore="versions"
```

### 代理配置

如果遇到网络问题，使用局域网代理：

```bash
set http_proxy=http://192.168.5.4:7893
set https_proxy=http://192.168.5.4:7893
```

---

## 日志位置

```
%APPDATA%\webtoon-media-browser\logs\
```

---

**开发完成时间**: 2026-06-27
**开发者**: Claude AI Assistant
**记录人**: Claude
