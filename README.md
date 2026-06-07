# 优花璃点歌台

基于 **腾讯 EdgeOne Pages** 的 VTuber 点歌台，面向直播观众，支持歌曲查询与后台管理。

## 功能

**公开页面**
- 歌曲列表每次打开随机排布，增加点歌多样性
- 按标题 / 歌手关键词搜索（搜索时恢复固定排序）
- 按语言分类筛选（中文、日语、英语、其他）
- 分页浏览
- 随机抽一首歌

**管理后台**（需登录）
- 歌曲列表：紧凑表格布局，语言/状态彩色标签，支持每页 20 / 50 / 100 条切换
- 新增 / 编辑 / 删除歌曲
- 勾选批量删除（支持全选当前页）
- CSV 文件导入（兼容标准格式与旧版多列格式，符合 RFC 4180 引号规范）
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
│   │   ├── songs.js        # GET /api/songs（列表 + 搜索 + 分页 + 随机排序）
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
│           ├── batch-delete.js # POST /admin/api/batch-delete（批量删除）
│           └── init.js         # GET /admin/api/init（初始化 KV）
└── migrate.js              # 本地数据迁移脚本
```

## API 参考

### 公开接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/songs` | 获取歌曲列表，支持 `page` `limit` `search` `language` `seed` 参数 |
| GET | `/api/songs/random` | 随机返回一首歌 |
| POST | `/api/auth/login` | 登录，body: `{ username, password }` |
| POST | `/api/auth/logout` | 登出，清除 Session Cookie |

> `seed` 参数为整数，非零时对歌单做确定性随机排序（LCG + Fisher-Yates）；为 0 时按 ID 降序。

### 管理接口（需携带 `yukari_admin_session` Cookie）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/admin/api/songs` | 新增歌曲，body: `{ title, artist, language, status }` |
| PUT | `/admin/api/songs/:id` | 编辑歌曲 |
| DELETE | `/admin/api/songs/:id` | 删除单首歌曲 |
| POST | `/admin/api/batch-delete` | 批量删除，body: `{ ids: number[] }` |
| POST | `/admin/api/import` | 批量导入，body: 歌曲对象数组 |
| GET | `/admin/api/init` | 初始化 KV 存储（首次部署后执行一次）|

## 部署到 EdgeOne Pages

1. 在 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone) 创建 Pages 项目，关联本仓库。
2. 创建 **KV 命名空间**，并在项目设置中完成绑定，变量名须与代码一致。
3. 在项目设置中配置环境变量：

   | 变量名 | 说明 |
   |--------|------|
   | `ADMIN_USER` | 管理员用户名（默认 `Yukari`）|
   | `ADMIN_PASSWORD` | 管理员密码（**请务必修改默认值**）|

4. 触发部署，EdgeOne 会自动构建并将 Functions 分发至边缘节点。
5. 首次部署完成后访问 `/admin/api/init` 初始化 KV 存储，之后可通过管理后台导入数据。

## 数据结构

歌曲对象存储于 KV 键 `songs_all`，值为 JSON 数组：

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

`language` 可选值：`中文` `日语` `英语` `其他`；`status` 可选值：`normal`（可点）`need_sc`（需SC）`banned`（禁止点歌）。

## CSV 导入格式

管理后台支持两种 CSV 格式：

**标准格式**（推荐，首行为表头）：
```
title,artist,language,status
东风志,Aki阿杰,中文,normal
Lemon,米津玄師,日语,normal
```

**旧版多列格式**（首行含 `中文歌曲` / `日语歌曲` 等列名）：自动识别并按列分语言导入。

`language` 合法值：`中文` `日语` `英语` `其他`；`status` 合法值：`normal` `need_sc` `banned`，其他值自动回退为 `normal`。

## 本地开发

项目无需构建步骤，所有前端代码在浏览器内由 Babel 实时编译。  
本地调试 Functions 需安装 [EdgeOne CLI](https://edgeone.ai/document/162227799538561024) 并执行：

```bash
npm install
npx edgeone pages dev
```
