# PlaylistOut 外部基础设施与手动配置清单 (Manual Setup Checklist)

本文档列出无法（或不应）通过代码仓库自动完成、需要维护者在 **GitHub 控制台** 与 **Cloudflare 控制台** 手动操作的清单。

---

## 1. GitHub 仓库与 GitHub Pages 配置

### 1.1 启用 GitHub Actions 部署 Pages

1. 打开 GitHub 仓库：`https://github.com/LengxiQwQ/playlistout`
2. 进入 **Settings** &rarr; 左侧导航栏 **Pages**。
3. 在 **Build and deployment** 下的 **Source** 下拉菜单中，选择：
   - **GitHub Actions**（不要选择 Deploy from a branch）。
4. 保存后，每次 push 到 `main` 分支时，`.github/workflows/deploy-pages.yml` 将自动构建并发布静态前端。

### 1.2 绑定自定义域名 `playlistout.com`

1. 在 GitHub Pages 页面下的 **Custom domain** 输入框中填写：`playlistout.com`。
2. 点击 **Save**。
3. 等待 DNS 解析生效并由 GitHub 自动签发 Let's Encrypt 证书。
4. 勾选 **Enforce HTTPS** 强制启用全站 HTTPS。

---

## 2. Cloudflare DNS 解析配置

在 Cloudflare Dashboard 管理 `playlistout.com` 区域的 DNS 记录：

### 2.1 前端静态站 (`playlistout.com` & `www.playlistout.com`)

将主域名指向 GitHub Pages：

| 类型 (Type) | 名称 (Name) | 内容 (Content) | 代理状态 (Proxy status) | 备注 |
|---|---|---|---|---|
| `A` | `@` | `185.199.108.153` | 仅 DNS (灰云)* | GitHub Pages IP 1 |
| `A` | `@` | `185.199.109.153` | 仅 DNS (灰云)* | GitHub Pages IP 2 |
| `A` | `@` | `185.199.110.153` | 仅 DNS (灰云)* | GitHub Pages IP 3 |
| `A` | `@` | `185.199.111.153` | 仅 DNS (灰云)* | GitHub Pages IP 4 |
| `CNAME` | `www` | `playlistout.com` | 开启代理 (橙云) | 可选：重定向至主域名 |

*\*建议初次验证 GitHub Pages 自定义域名和证书生成阶段使用「仅 DNS (DNS only / 灰云)」，证书签发成功后可根据需要开启代理。*

---

## 3. Cloudflare Worker 自定义域名配置

目标：将 `api.playlistout.com` 路由至 `playlistout-api` Worker。

### 3.1 本地部署或 Wrangler 登录

首次发布 Worker 时需要登录 Cloudflare 授权：

```bash
cd worker
npx wrangler login
npx wrangler deploy
```

### 3.2 控制台绑定自定义域名

1. 进入 Cloudflare Dashboard &rarr; **Workers & Pages**。
2. 找到并点击进入 **playlistout-api** Worker。
3. 切换至 **Settings** &rarr; **Domains & Routes**。
4. 点击 **Add** &rarr; **Custom Domain**。
5. 输入 `api.playlistout.com`，点击 **Add Custom Domain**。
6. Cloudflare 将自动在 DNS 区域中生成 Worker 绑定的相应 DNS 记录并签发 SSL 证书。

---

## 4. 生产环境部署与持续交付 (Phase 8 运维指南)

### 4.1 生产环境 D1 数据库开通与迁移执行

在 Cloudflare 控制台或通过本地 Wrangler 执行以下命令创建 D1 实例并应用迁移：

```bash
# 1. 登录 Cloudflare（若 Token 过期或未登录）
npx wrangler login

# 2. 创建生产 D1 数据库实例
npx wrangler d1 create playlistout-stats

# 3. 将命令输出的真实 database_id 更新到 worker/wrangler.jsonc 中的 database_id 字段

# 4. 执行 D1 数据库初始迁移
npx wrangler d1 execute playlistout-stats --remote --file=./migrations/0001_initial_stats.sql
```

### 4.2 GitHub Actions 自动化部署 Worker (CI/CD)

项目已配置 `.github/workflows/deploy-worker.yml`。只需在 GitHub 仓库添加以下两项 Secrets，即可在每次合并代码后全自动构建测试并发布 Worker：

1. 进入 GitHub 仓库 **Settings** &rarr; **Secrets and variables** &rarr; **Actions**。
2. 点击 **New repository secret** 分别添加：
   - `CLOUDFLARE_API_TOKEN`: 具备 `Cloudflare Workers: Edit` 和 `Account: Read` 权限的 API Token。
   - `CLOUDFLARE_ACCOUNT_ID`: 您的 Cloudflare 账户 ID（可在 Cloudflare Dashboard 右下角或 Workers 概览页直接复制）。
3. 添加完成后，任何推送至 `main` 分支的 `worker/**` 代码均会自动部署至生产环境。

### 4.3 生产环境现状核对表 (Production Verification Matrix)

- [x] **前端页面访问**：`https://playlistout.com` (已验证，HTTP 200 OK，由 GitHub Pages 托管)
- [x] **根域名重定向**：`https://www.playlistout.com` (已验证，HTTP 301 重定向至 `https://playlistout.com/`)
- [x] **搜索引擎爬虫引导**：`https://playlistout.com/robots.txt` 与 `https://playlistout.com/sitemap.xml` (已验证)
- [x] **API 域名接入点**：`https://api.playlistout.com/health` (已验证，HTTP 200 OK)
- [ ] **最新 API 与 D1 生产发布**：需配置 `CLOUDFLARE_API_TOKEN` 或执行 `wrangler login` 后触发全量部署。
