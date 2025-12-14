# HTML2Image Pro 部署指南

本指南将帮助你最快地将项目部署到互联网上。我们推荐使用 **Render** (有免费层，支持 Docker，配置简单)。

## 准备工作

1. 确保你的代码已经提交到 **GitHub** 仓库。
   - 如果还没有仓库，请在 GitHub 新建一个，并推送当前代码。

## 方案一：部署到 Render (推荐)

Render 是目前部署 Node.js + Playwright 应用最省心的平台之一。

### 步骤：

1. 注册/登录 [Render.com](https://render.com)。
2. 点击右上角 **"New +"**，选择 **"Web Service"**。
3. 连接你的 GitHub 账号，并选择本项目的仓库。
4. 在配置页面：
   - **Name**: 起个名字 (例如 `html2image-pro`)
   - **Region**: 选择离你或是目标用户近的节点 (例如 `Singapore` 或 `Oregon`)
   - **Branch**: `main` (或你的主分支)
   - **Root Directory**: 留空
   - **Runtime**: 选择 **Docker** (⚠️ 重要：不要选 Node，必须选 Docker，因为我们需要安装浏览器环境)
   - **Instance Type**: 选择 **Free** (免费版)
5. 点击 **"Create Web Service"**。

### 等待构建

Render 会自动识别项目根目录下的 `Dockerfile` 并开始构建：
1. 它会下载 Playwright 环境。
2. 安装依赖。
3. 启动服务。

构建通常需要 3-5 分钟。完成后，你会获得一个 `https://xxxx.onrender.com` 的网址，即可直接访问使用！

---

## 方案二：部署到 Railway

如果你更喜欢 Railway：

1. 注册/登录 [Railway.app](https://railway.app)。
2. 点击 **"New Project"** -> **"Deploy from GitHub repo"**。
3. 选择你的仓库。
4. Railway 也会自动识别 `Dockerfile` 并开始构建。
5. 部署完成后，在 Settings -> Networking 中生成一个域名即可访问。

## 注意事项

- **首次启动速度**：并在 Docker 环境中首次启动浏览器可能稍慢，之后会变快。
- **内存限制**：免费实例通常内存有限（512MB）。如果是处理极其复杂的超长网页，可能会遇到内存不足的问题，但这对于大多数普通网页转换足够了。
- **中文字体**：Docker 镜像默认包含基础字体。如果发现生成的图片中文乱码，可能需要在 Dockerfile 中添加安装中文字体的命令（目前的 Dockerfile 使用官方镜像，通常支持较好，若有问题可反馈）。
