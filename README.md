# HTML2Image Pro (极致网页转图片工具)

[![Deployment Status](https://img.shields.io/badge/Deployment-Docker%20Ready-blue)](DEPLOY.md)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**HTML2Image Pro** 是一款现代化的网页转图片工具，专为生成高质量、像素级完美的网页截图而设计。

它基于 **Playwright** 渲染引擎，完美支持现代 CSS 特性、Web Fonts、Flexbox/Grid 布局以及 JavaScript 动态渲染（包括 React/Vue 应用）。

![App Screenshot](assets/screenshot.png)

## ✨ 核心亮点

### 🎨 极致渲染
- **Playwright 引擎**：替代传统的 Puppeteer，提供更佳的兼容性和渲染精度。
- **动态内容支持**：内置 **"完整加载模式" (Dynamic Mode)**，通过智能滚动和网络空闲检测，确保 Lazy Load 图片和动态组件完全加载后再截图。
- **React 组件预览**：支持直接编写/粘贴 React 代码（支持 Lucide 图标库），实时预览并转换为图片。

### 🛠️ 强大的图像处理
- **高达 8x 超清输出**：支持 1x (标准) 到 8x (印刷级) 的 DPI 缩放。
- **智能裁剪 (Smart Crop)**：自动识别内容区域，去除多余留白，支持自定义边缘内边距 (Padding)。
- **水印功能**：一键添加版权水印，支持自定义文字，自动添加阴影和半透明效果，适配深浅背景。
- **多格式支持**：PNG (默认), JPG, WebP。

### 🖥️ 优秀的用户体验
- **现代 UI 设计**：Glassmorphism (毛玻璃) 风格，支持 **深色模式 (Dark Mode)**（自动跟随系统）。
- **历史记录**：自动保存最近转换记录（利用 LocalStorage），方便随时回溯和下载。
- **多端模拟**：内置 iPhone, iPad, MacBook 等多种视口预设，一键模拟不同设备渲染效果。
- **拖拽上传**：支持直接拖拽 .html 文件进行转换。

## 🚀 快速开始

### 方式一：Docker 部署 (推荐)

本项目已针对云原生环境优化，推荐使用 Docker 部署（如 Render, Railway）。

```bash
# 1. 构建镜像
docker build -t html2image-pro .

# 2. 运行容器
docker run -p 3015:3015 html2image-pro
```

详细部署指南请参考 [DEPLOY.md](DEPLOY.md)。

### 方式二：本地运行

需要 Node.js 16+ 环境。

```bash
# 1. 安装依赖
npm install

# 2. 安装浏览器内核
npx playwright install chromium

# 3. 启动服务
npm start
```

访问 `http://localhost:3015` 即可使用。

## 🛠️ 技术栈

- **Core**: Node.js, Express
- **Rendering**: Playwright (Chromium)
- **Image Processing**: Sharp
- **Frontend**: HTML5, Tailwind CSS, Vanilla JS
- **Fonts**: Inter, JetBrains Mono (Code Optimized)

## 📝 API 接口

项目提供 RESTful API，可供第三方调用：

- `POST /convert/url`: 转换在线网页
- `POST /convert/html`: 转换 HTML 代码字符串
- `POST /convert/file`: 转换上传的 HTML 文件

**参数示例 (Body)**:
```json
{
  "url": "https://example.com",
  "settings": {
    "format": "png",
    "scale": 2,
    "width": 1200,
    "smartCrop": true,
    "watermarkEnabled": true,
    "watermarkText": "My Watermark"
  }
}
```

## 📄 License

MIT License
