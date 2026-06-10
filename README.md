# 优花璃点歌台

基于 **腾讯 EdgeOne Pages** 的 VTuber 点歌台，面向直播观众，支持歌曲查询与后台管理。

## 功能

**公开页面**
- 歌单每次打开随机排布，增加点歌多样性（同一标签页内翻页顺序稳定）
- 按标题 / 歌手关键词搜索（搜索时恢复固定排序）
- 按语言分类筛选（中文、日语、英语、其他）
- 分页浏览（Semi Design 风格页码导航，翻页时保持滚动位置）
- 随机抽取一首歌并一键复制点歌弹幕

**管理后台**（需登录）
- 歌曲列表：紧凑表格，语言 / 状态彩色标签，分页栏集成 Semi Design 风格页码导航与每页条数下拉选择（20 / 50 / 100）
- 新增 / 编辑 / 删除歌曲
- 勾选批量删除（支持全选当前页）
- CSV 文件导入（兼容标准格式与旧版多列格式，符合 RFC 4180 引号规范）

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 15 (App Router) + React 19 + TypeScript |
| 样式 | Tailwind CSS v4（CSS-first 配置） |
| 后端 | EdgeOne Pages Functions（边缘 Serverless） |
| 存储 | EdgeOne KV |
| 鉴权 | Next.js Middleware + Session Cookie |

## 目录结构

```
├── app/
│   ├── layout.tsx          # 全局布局（meta、全局 CSS）
│   ├── globals.css         # 全局样式（背景图、动画关键帧）
│   ├── page.tsx            # 公开点歌台首页
│   ├── login/
│   │   └── page.tsx        # 登录页
│   └── admin/
│       └── page.tsx        # 管理后台（需登录）
├── functions/
│   ├── _middleware.js      # EdgeOne 边缘鉴权中间件（/admin/* 路由）
│   ├── api/
│   │   ├── songs.js        # GET /api/songs（列表 + 搜索 + 分页 + 随机排序）
│   │   ├── songs/
│   │   │   └── random.js   # GET /api/songs/random
│   │   └── auth/
│   │       ├── login.js    # POST /api/auth/login
│   │       └── logout.js   # POST /api/auth/logout
│   └── admin/
│       └── api/
│           ├── verify.js       # GET /admin/api/verify（Session 验证）
│           ├── songs.js        # POST /admin/api/songs（新增）
│           ├── songs/
│           │   └── [id].js     # PUT / DELETE /admin/api/songs/:id
│           ├── import.js       # POST /admin/api/import（批量导入）
│           ├── batch-delete.js # POST /admin/api/batch-delete
│           └── init.js         # GET /admin/api/init（首次部署初始化 KV）
├── middleware.ts           # Next.js 路由鉴权（未登录访问 /admin 重定向至 /login）
├── next.config.ts          # Next.js 配置（Referrer-Policy 响应头）
├── postcss.config.mjs      # PostCSS 配置（Tailwind CSS v4）
└── tsconfig.json
```

## API 参考

### 公开接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/songs` | 获取歌曲列表，支持 `page` `limit` `search` `language` `seed` 参数 |
| GET | `/api/songs/random` | 随机返回一首歌 |
| POST | `/api/auth/login` | 登录，body: `{ username, password }` |
| POST | `/api/auth/logout` | 登出，清除 Session Cookie |

> `seed` 为非零整数时对歌单做确定性随机排序（LCG + Fisher-Yates）；为 0 时按 ID 降序。

### 管理接口（需携带 `yukari_admin_session` Cookie）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/api/verify` | 验证 Session 有效性 |
| POST | `/admin/api/songs` | 新增歌曲，body: `{ title, artist, language, status }` |
| PUT | `/admin/api/songs/:id` | 编辑歌曲 |
| DELETE | `/admin/api/songs/:id` | 删除单首歌曲 |
| POST | `/admin/api/batch-delete` | 批量删除，body: `{ ids: number[] }` |
| POST | `/admin/api/import` | 批量导入，body: 歌曲对象数组 |
| GET | `/admin/api/init` | 初始化 KV 存储（首次部署后执行一次）|

## 部署到 EdgeOne Pages

1. 在 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone) 创建 Pages 项目，关联本仓库。
2. 创建 **KV 命名空间**，绑定变量名设为 `Yukari_Songs`（与代码中的全局变量名一致）。
3. 配置以下环境变量（**必填，未配置则登录接口返回 500**）：

   | 变量名 | 说明 |
   |--------|------|
   | `ADMIN_USER` | 管理员用户名 |
   | `ADMIN_PASSWORD` | 管理员密码 |

4. 触发部署，EdgeOne 会自动识别 Next.js 框架并完成构建。
5. 首次部署后访问 `/admin/api/init` 初始化 KV，之后通过管理后台导入歌曲数据。

## 数据结构

歌曲存储于 KV 键 `songs_all`，值为 JSON 数组：

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

`language` 可选值：`中文` `日语` `英语` `其他`  
`status` 可选值：`normal`（可点）`need_sc`（需SC）`banned`（禁止点歌）

## CSV 导入格式

**标准格式**（推荐，首行为表头）：
```
title,artist,language,status
东风志,Aki阿杰,中文,normal
Lemon,米津玄師,日语,normal
```

**旧版多列格式**（首行含 `中文歌曲` / `日语歌曲` 等列名）：自动识别并按列分语言导入。

`language` 和 `status` 非法值自动回退为 `中文` / `normal`。

## 本地开发

```bash
npm install
npm run dev        # 启动开发服务器（Turbopack），访问 http://localhost:3000
npm run build      # 生产构建
```
