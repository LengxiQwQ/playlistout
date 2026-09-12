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

## 4. 后续阶段预留 (Phase 5+)

以下内容在当前 Phase 0 严禁配置生产硬依赖，待对应阶段开启后再行创建：

### 4.1 Cloudflare D1 统计数据库 (Phase 5)

当进入 Phase 5（匿名统计）时：

```bash
cd worker
npx wrangler d1 create playlistout-stats
```

执行后将输出的 `database_id` 填入 `worker/wrangler.jsonc` 中的 `d1_databases` 预留配置。

### 4.2 GitHub Actions 自动化部署 Worker (Phase 8)

若需要在 GitHub Actions CI/CD 中自动执行 `wrangler deploy`，需在 GitHub 仓库添加以下 Secrets：

- `CLOUDFLARE_API_TOKEN`: 具备 Worker 部署权限的 Cloudflare API Token。
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare 账户 ID。
