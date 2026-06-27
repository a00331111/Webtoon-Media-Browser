# Webtoon Media Browser - 构建说明

## 版本信息
- 当前版本: 0.1.0
- 版本目录: `versions/v0.1.0/`

## 开发模式运行

由于网络问题无法下载 Electron 二进制文件，请先运行开发模式：

```bash
# 方法 1: 直接运行批处理文件
run-dev.bat

# 方法 2: 命令行运行
npm run dev
```

开发模式会在 http://localhost:5173 启动 Vite 开发服务器。

## 打包构建（需要网络连接）

当网络连接正常时，可以使用以下命令打包：

```bash
# 方法 1: 使用版本构建脚本（自动递增版本号）
build-version.bat

# 方法 2: 手动打包
npm run build
npx electron-packager . "Webtoon Media Browser" --platform=win32 --arch=x64 --out=versions/v0.1.0 --overwrite --asar
```

## 版本管理

每次运行 `build-version.bat` 脚本时：
1. 读取当前版本号（如 0.1.0）
2. 构建并打包到 `versions/v0.1.0/` 目录
3. 自动将版本号递增（如 0.1.0 → 0.1.1）
4. 更新 package.json 中的版本号

## 目录结构

```
webtoon-media-browser/
├── versions/              # 版本输出目录
│   ├── v0.1.0/           # 版本 0.1.0 的构建输出
│   ├── v0.1.1/           # 版本 0.1.1 的构建输出
│   └── ...
├── src/                   # 源代码
├── dist/                  # 编译输出
└── node_modules/          # 依赖包
```

## 故障排除

### 网络问题

如果遇到 `ETIMEDOUT` 或 `connect failed` 错误：

1. 检查网络连接
2. 尝试使用 VPN 或代理
3. 使用国内镜像：
   ```bash
   npm config set electron_mirror https://npmmirror.com/mirrors/electron/
   npm config set electron_builder_binaries_mirror https://npmmirror.com/mirrors/electron-builder-binaries/
   ```

### Electron 下载失败

如果 Electron 下载失败，可以手动下载：

1. 访问 https://github.com/electron/electron/releases
2. 下载对应版本的 `electron-v{version}-win32-x64.zip`
3. 将文件放到缓存目录：`%LOCALAPPDATA%\electron\Cache\`

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+O` | 打开文件夹 |
| `Ctrl+=` | 放大 |
| `Ctrl+-` | 缩小 |
| `Space` | 播放/暂停（播放器） |
| `F` | 全屏（播放器） |
| `3` | 3D 模式（播放器） |
