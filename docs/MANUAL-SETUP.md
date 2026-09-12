# PlaylistOut Deployment & Operations Guide

本文档记录 PlaylistOut 当前生产环境的部署结构、恢复方式和需要维护者掌握的外部配置。它不再是 MVP 待办清单；QQ Music Web MVP 已在 `v2.0.0` 完成并上线。

---

## 1. 当前生产结构

| 部分 | 生产配置 |
|---|---|
| Web | GitHub Pages |
| 主域名 | `https://playlistout.com` |
| API | Cloudflare Worker `playlistout-api` |
| API 域名 | `https://api.playlistout.com` |
| 匿名统计 | Cloudflare D1 `playlistout-stats` |
| Web 自动部署 | `.github/workflows/deploy-pages.yml` |
| Worker 自动部署 | `.github/workflows/deploy-worker.yml` |
| CI | `.github/workflows/ci.yml` |

生产部署已经完成。正常开发不需要重新执行首次初始化步骤。

---

## 2. GitHub Pages

GitHub Pages 应使用 **GitHub Actions** 作为部署源。

仓库：`https://github.com/LengxiQwQ/playlistout`

如需从零恢复：

1. Settings → Pages。
2. Build and deployment → Source 选择 **GitHub Actions**。
3. Custom domain 设置为 `playlistout.com`。
4. 启用 **Enforce HTTPS**。
5. push 到 `main` 后由 `.github/workflows/deploy-pages.yml` 自动构建和部署 `web/`。

---

## 3. DNS 与域名

### 前端

`playlistout.com` 指向 GitHub Pages。标准 GitHub Pages IPv4 地址为：

```text
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

`www.playlistout.com` 应重定向到主域名。

### API

`api.playlistout.com` 绑定 Cloudflare Worker `playlistout-api`。

Cloudflare Dashboard → Workers & Pages → `playlistout-api` → Settings → Domains & Routes 可检查或恢复绑定。

---

## 4. Cloudflare Worker

Worker 配置位于：

```text
worker/wrangler.jsonc
```

本地手动部署仅用于调试或自动部署不可用时：

```bash
cd worker
npx wrangler login
npx wrangler deploy
```

正常生产发布应由 GitHub Actions 自动完成。

---

## 5. D1 数据库

生产数据库：

```text
playlistout-stats
```

D1 仅用于匿名聚合统计，不保存歌单 URL、歌单 ID、歌曲列表、用户身份或导出文件。

迁移文件位于：

```text
worker/migrations/
```

如需恢复新环境，可创建数据库并执行迁移：

```bash
npx wrangler d1 create playlistout-stats
npx wrangler d1 execute playlistout-stats --remote --file=./migrations/0001_initial_stats.sql
```

随后将 Cloudflare 返回的真实 `database_id` 写入 `worker/wrangler.jsonc`。

当前生产环境已完成 D1 创建、绑定和 migration，不要重复创建同名生产数据库。

---

## 6. GitHub Actions Secrets

Worker 自动部署依赖以下 Repository Secrets：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

不要把它们写进仓库、日志、README、测试 fixture 或任何客户端代码。

如果 Worker workflow 出现 credentials missing / deploy skipped，优先检查这两项 secret 是否仍然有效。

---

## 7. 正常发布流程

普通代码更新：

1. 修改代码并运行相关本地测试。
2. push 到 `main`。
3. 确认 `CI` workflow 成功。
4. Web 相关修改确认 `Deploy Web to GitHub Pages` 成功。
5. Worker 相关修改确认 `Deploy Worker to Cloudflare` 成功。
6. 对生产环境执行必要 smoke test。

不要因为 GitHub Actions 总体显示绿色，就默认 Worker 一定部署过；需要确认真正的 `Deploy to Cloudflare Workers` step 没有被 skip。

---

## 8. 生产验证清单

当前 v2.0.0 基线：

- [x] `https://playlistout.com` 可由 GitHub Pages 部署
- [x] `https://www.playlistout.com` 重定向至主域名
- [x] `robots.txt` / `sitemap.xml` 已部署
- [x] `https://api.playlistout.com/health` 为生产 API 健康检查入口
- [x] GitHub Actions 可检测 Cloudflare credentials
- [x] D1 `playlistout-stats` 已创建并绑定
- [x] D1 migration 已在生产环境执行
- [x] Worker 自动部署 step 已真实执行成功
- [x] QQ Music MVP 已发布为 `v2.0.0`

如果未来生产环境变化，以最新 workflow 日志、Cloudflare Dashboard 和实际 HTTP 行为为准，而不是长期依赖此处的历史勾选状态。

---

## 9. 故障排查优先级

生产问题建议按以下顺序排查：

1. GitHub Actions 最近一次 CI / deployment 是否成功。
2. Pages 与 Worker 是否部署的是预期 commit。
3. Cloudflare Worker 自定义域名是否仍绑定。
4. D1 binding / migration 是否正常。
5. QQ Music 上游接口是否发生兼容性变化。
6. 最后再检查前端展示或浏览器兼容问题。

不要通过放宽 SSRF/CORS/完整性校验来临时“修好”上游兼容问题。
