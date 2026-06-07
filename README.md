# 优花璃点歌台

基于 **腾讯 EdgeOne Pages** 的 VTuber 点歌台，面向直播观众，支持歌曲查询与后台管理。

## 功能

**公开页面**
- 歌曲列表展示，支持按标题 / 歌手关键词搜索
- 按语言分类筛选（中文、日文、英文……）
- 分页浏览
- 随机抽一首歌

**管理后台**（需登录）
- 新增 / 编辑 / 删除歌曲
- 批量 JSON 导入
- KV 数据初始化

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18（CDN）+ Babel（浏览器端编译）+ Axios |
| 后端 | EdgeOne Pages Functions（边缘 Serverless）|
| 存储 | EdgeOne KV（键值存储）|

## 目录结构

```
├── index.html              # 公开点歌台
├── admin.html              # 管理后台
├── login.html              # 登录页
├── functions/
│   ├── _middleware.js      # /admin/* 路由鉴权中间件
│   ├── api/
│   │   ├── songs.js        # GET /api/songs（列表 + 搜索 + 分页）
│   │   ├── songs/
│   │   │   └── random.js   # GET /api/songs/random
│   │   └── auth/
│   │       ├── login.js    # POST /api/auth/login
│   │       └── logout.js   # POST /api/auth/logout
│   └── admin/
│       └── api/
│           ├── songs.js        # POST /admin/api/songs（新增）
│           ├── songs/
│           │   └── [id].js     # PUT / DELETE /admin/api/songs/:id
│           ├── import.js       # POST /admin/api/import（批量导入）
│           └── init.js         # POST /admin/api/init（初始化 KV）
└── migrate.js              # 本地数据迁移脚本
```

## API 参考

### 公开接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/songs` | 获取歌曲列表，支持 `page` `limit` `search` `language` 参数 |
| GET | `/api/songs/random` | 随机返回一首歌 |
| POST | `/api/auth/login` | 登录，body: `{ username, password }` |
| POST | `/api/auth/logout` | 登出，清除 Session Cookie |

### 管理接口（需携带 `yukari_admin_session` Cookie）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/admin/api/songs` | 新增歌曲，body: `{ title, artist, language, status }` |
| PUT | `/admin/api/songs/:id` | 编辑歌曲 |
| DELETE | `/admin/api/songs/:id` | 删除歌曲 |
| POST | `/admin/api/import` | 批量导入，body: 歌曲对象数组 |
| POST | `/admin/api/init` | 初始化 KV 存储 |

## 部署到 EdgeOne Pages

1. 在 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone) 创建 Pages 项目，关联本仓库。
2. 创建 **KV 命名空间**，并在项目设置中完成绑定。
3. 在项目设置中配置环境变量：

   | 变量名 | 说明 |
   |--------|------|
   | `ADMIN_USER` | 管理员用户名（默认 `Yukari`）|
   | `ADMIN_PASSWORD` | 管理员密码（**请务必修改默认值**）|

4. 触发部署，EdgeOne 会自动构建并将 Functions 分发至边缘节点。

## 数据结构

歌曲对象存储于 KV 键 `songs:all`，值为 JSON 数组：

```json
[
  {
    "id": 1,
    "title": "歌曲标题",
    "artist": "歌手名",
    "language": "中文",
    "status": "normal"
  }
]
```

`language` 可选值：`中文` `日文` `英文` 等；`status` 可选值：`normal` `vip`。

## 本地开发

项目无需构建步骤，所有前端代码在浏览器内由 Babel 实时编译。  
本地调试 Functions 需安装 [EdgeOne CLI](https://edgeone.ai/document/162227799538561024) 并执行：

```bash
npm install
npx edgeone pages dev
```
