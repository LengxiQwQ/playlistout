# PlaylistOut Deployment & Operations Guide

本文档记录 PlaylistOut 当前生产环境的部署结构、恢复方式和需要维护者掌握的外部配置。它不再是 MVP 待办清单；QQ Music Web MVP 已在 `v2.0.0` 完成并上线。

---

## 1. 当前生产结构

| 部分 | 生产配置 |
|---|---|
| Web | GitHub Pages |
| 主域名 | `https://playlistout.lengxiqwq.com` |
| 旧域名 301 重定向 | `https://playlistout.com` / `https://www.playlistout.com` |
| API | Cloudflare Worker `playlistout-api` |
| API 域名 | `https://playlistout-api.lengxiqwq.com` |
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
3. Custom domain 设置为 `playlistout.lengxiqwq.com`。
4. 启用 **Enforce HTTPS**。
5. push 到 `main` 后由 `.github/workflows/deploy-pages.yml` 自动构建和部署 `web/`。

---

## 3. DNS 与域名

### 前端

在 Cloudflare 的 `lengxiqwq.com` DNS 中添加记录：

- 类型：`CNAME`
- 名称：`playlistout`
- 内容：`lengxiqwq.github.io`
- 代理状态：已代理 (Proxied 橙色云)

### API

`playlistout-api.lengxiqwq.com` 绑定 Cloudflare Worker `playlistout-api`。

Cloudflare Dashboard → Workers & Pages → `playlistout-api` → Settings → Domains & Routes 可检查或恢复绑定。

### 旧域名 301 重定向 (`playlistout.com`)

在 Cloudflare `playlistout.com` 控制台配置 Redirect Rules（重定向规则）：
- 匹配条件：主机名包含 `playlistout.com` 与 `www.playlistout.com`
- 目标表达式：`concat("https://playlistout.lengxiqwq.com", http.request.uri.path)`
- 状态码：`301 Moved Permanently`
- 保留查询参数：开启

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

如需从零恢复一个**新环境**，必须使用仓库受支持的显式 provisioning / Wrangler Native Migrations 流程，不能手工只执行某一份 SQL 文件：

```bash
# 在仓库根目录，显式创建/绑定新环境并建立受追踪的 migration 历史
node scripts/d1/provision-db.js

# 如数据库已经由受支持流程创建并写入正确 database_id，
# 在 worker/ 下应用所有待执行的 Wrangler migrations
cd worker
npx wrangler d1 migrations apply playlistout-stats --remote
```

生产部署会严格验证 `d1_migrations` 的数量、顺序与文件名。存在业务表但没有可信 migration 历史的数据库会 **fail closed**；不要通过手工插入 migration 记录或单独执行 `0001_*.sql` 绕过验证。

当前生产环境已完成 D1 创建、绑定和全部 migrations，不要重复创建同名生产数据库。灾难恢复优先使用 D1 Time Travel / 可信备份。

---

## 6. GitHub Actions Secrets

Worker 自动部署使用以下 Repository Secrets：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `INSIGHTS_ADMIN_TOKEN`（维护者 Analytics / 内部管理接口，以及 Web session 速率分类信号）

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

当前生产基线（v2.2.0）：

- [x] `https://playlistout.lengxiqwq.com` 可由 GitHub Pages 部署
- [x] `https://playlistout.com` / `https://www.playlistout.com` 301 重定向至主域名
- [x] `robots.txt` / `sitemap.xml` 已部署
- [x] `https://playlistout-api.lengxiqwq.com/health` 为生产 API 健康检查入口
- [x] GitHub Actions 可检测 Cloudflare credentials
- [x] D1 `playlistout-stats` 已创建并绑定
- [x] D1 migration 已在生产环境执行
- [x] Worker 自动部署 step 已真实执行成功
- [x] QQ Music、网易云音乐、酷狗音乐、汽水音乐四个平台均已进入当前生产版本

如果未来生产环境变化，以最新 workflow 日志、Cloudflare Dashboard 和实际 HTTP 行为为准，而不是长期依赖此处的历史勾选状态。

---

## 9. 故障排查优先级

生产问题建议按以下顺序排查：

1. GitHub Actions 最近一次 CI / deployment 是否成功。
2. Pages 与 Worker 是否部署的是预期 commit。
3. Cloudflare Worker 自定义域名是否仍绑定。
4. D1 binding / migration 是否正常。
5. 对应音乐平台（QQ 音乐 / 网易云音乐 / 酷狗音乐 / 汽水音乐）上游接口是否发生兼容性变化。
6. 最后再检查前端展示或浏览器兼容问题。

不要通过放宽 SSRF/CORS/完整性校验来临时“修好”上游兼容问题。
