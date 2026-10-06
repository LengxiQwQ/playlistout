#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""PlaylistOut Analytics V2 local dashboard.

The browser talks only to a loopback Python proxy. INSIGHTS_ADMIN_TOKEN remains
inside the Python process and is never written into HTML or JavaScript.
"""
from __future__ import annotations

import argparse
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

REMOTE_BASE = os.environ.get(
    "PLAYLISTOUT_API_BASE", "https://playlistout-api.lengxiqwq.com"
).rstrip("/")
ANALYTICS_PARAMS = {"from", "to", "channel", "client", "platform", "country", "region"}
FEEDBACK_PARAMS = {"status", "limit", "offset", "id"}


def get_admin_token(repo_root: Path | None = None) -> str | None:
    token = os.environ.get("INSIGHTS_ADMIN_TOKEN", "").strip()
    if token:
        return token
    if repo_root is None:
        repo_root = Path(__file__).resolve().parents[2]
    for path in (
        repo_root / ".dev.vars",
        repo_root / ".env.local",
        repo_root / "worker" / ".dev.vars",
        repo_root / "worker" / ".env.local",
    ):
        if not path.exists():
            continue
        try:
            for raw in path.read_text(encoding="utf-8").splitlines():
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                if key.strip() == "INSIGHTS_ADMIN_TOKEN":
                    value = value.strip().strip('"').strip("'")
                    if value:
                        return value
        except OSError:
            pass
    return None


def remote_request(
    token: str,
    path: str,
    method: str = "GET",
    query: dict[str, str] | None = None,
):
    url = REMOTE_BASE + path
    if query:
        url += "?" + urllib.parse.urlencode(query)
    request = urllib.request.Request(
        url,
        method=method,
        headers={
            "Accept": "application/json",
            "Authorization": "Bearer " + token,
            "User-Agent": "PlaylistOut-Dashboard/3.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return (
                int(response.status),
                response.read(),
                response.headers.get("Content-Type", "application/json"),
            )
    except urllib.error.HTTPError as exc:
        return (
            int(exc.code),
            exc.read(),
            exc.headers.get("Content-Type", "application/json"),
        )


HTML = r'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PlaylistOut Analytics</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
<style>
:root{color-scheme:light dark;--bg:#f6f8fb;--p:#fff;--t:#172033;--m:#6b7585;--l:#e5e9f0;--a:#2563eb;--g:#18853b;--r:#c83434;--s:0 8px 26px rgba(30,45,70,.06)}
@media(prefers-color-scheme:dark){:root{--bg:#0d1117;--p:#151b23;--t:#e6edf3;--m:#8b949e;--l:#29313c;--a:#6ea8fe;--g:#4ac26b;--r:#ff7b72;--s:none}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--t);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}button,select{font:inherit;color:inherit}.wrap{max-width:1440px;margin:auto;padding:18px 24px}.top{position:sticky;top:0;z-index:10;background:color-mix(in srgb,var(--bg) 94%,transparent);backdrop-filter:blur(14px);border-bottom:1px solid var(--l)}.head{display:flex;justify-content:space-between;gap:16px;align-items:center}h1{margin:0;font-size:23px}.muted{font-size:12px;color:var(--m)}.health{padding:7px 11px;border:1px solid var(--l);background:var(--p);border-radius:999px;font-size:12px}.health.good{color:var(--g)}.health.bad{color:var(--r)}.filters{display:grid;grid-template-columns:1.6fr repeat(5,1fr) auto;gap:9px;margin-top:14px}.field label{display:block;font-size:11px;color:var(--m);margin:0 0 5px 2px}.field select,.ghost{height:38px;width:100%;padding:0 9px;border:1px solid var(--l);border-radius:9px;background:var(--p)}.range{display:flex;gap:5px}.range button{height:38px;padding:0 10px;border:1px solid var(--l);border-radius:9px;background:var(--p);cursor:pointer}.range button.active{background:var(--a);color:#fff;border-color:var(--a)}.tabs{display:flex;gap:4px;overflow:auto;padding-top:13px}.tab{border:0;border-radius:8px;padding:9px 12px;background:transparent;color:var(--m);cursor:pointer;white-space:nowrap}.tab.active{background:var(--p);color:var(--t);box-shadow:var(--s)}.page{display:none}.page.active{display:block}.section{display:flex;justify-content:space-between;align-items:end;margin:24px 0 12px}.section h2{margin:0;font-size:18px}.kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}.card,.panel{background:var(--p);border:1px solid var(--l);border-radius:13px;box-shadow:var(--s)}.card{padding:15px}.label{font-size:12px;color:var(--m)}.value{font-size:25px;font-weight:700;margin-top:7px}.grid2{display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-top:12px}.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px}.panel{padding:16px;min-width:0}.panel h3{font-size:14px;margin:0 0 12px}.chart{height:300px}.bars{display:flex;flex-direction:column;gap:9px}.bar{display:grid;grid-template-columns:135px 1fr 62px;gap:8px;align-items:center;font-size:12px}.bn{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.track{height:8px;background:var(--l);border-radius:8px;overflow:hidden}.fill{height:100%;background:var(--a)}.num{text-align:right;color:var(--m);font-variant-numeric:tabular-nums}.notice{padding:10px 12px;border:1px solid var(--l);border-radius:10px;margin:8px 0;font-size:12px}.notice.bad{border-color:var(--r);color:var(--r)}.chips{display:flex;flex-wrap:wrap;gap:6px}.chip{padding:5px 8px;border:1px solid var(--l);border-radius:999px;background:var(--p);font-size:11px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:9px 8px;border-bottom:1px solid var(--l);text-align:left}th{color:var(--m)}.scroll{overflow:auto;max-height:520px}.status{border:1px solid var(--l);border-radius:7px;background:var(--bg);padding:4px 6px;cursor:pointer}.footer{text-align:center;color:var(--m);font-size:11px;padding:30px}.ghost{cursor:pointer}
@media(max-width:1100px){.filters{grid-template-columns:repeat(3,1fr)}.kpis{grid-template-columns:repeat(3,1fr)}}@media(max-width:760px){.wrap{padding:14px}.filters{grid-template-columns:1fr 1fr}.kpis{grid-template-columns:1fr 1fr}.grid2,.grid3{grid-template-columns:1fr}.bar{grid-template-columns:100px 1fr 52px}}
</style></head><body>
<div class="top"><div class="wrap"><div class="head"><div><h1>PlaylistOut Analytics</h1><div class="muted">Analytics V2 · 聚合统计 · Token 不进入浏览器</div></div><div id="health" class="health">● Loading</div></div>
<div class="filters"><div class="field"><label>日期范围（UTC 日桶）</label><div class="range"><button data-range="today">今天</button><button data-range="yesterday">昨天</button><button data-range="7" class="active">7天</button><button data-range="30">30天</button></div></div><div class="field"><label>Channel</label><select id="channel"><option value="">全部</option><option>web</option><option>plugin</option><option>api</option><option>legacy_mixed</option></select></div><div class="field"><label>Client</label><select id="client"><option value="">全部</option></select></div><div class="field"><label>Platform</label><select id="platform"><option value="">全部</option><option>qqmusic</option><option>netease</option><option>kugou</option><option>qishui</option></select></div><div class="field"><label>Country</label><select id="country"><option value="">全部</option></select></div><div class="field"><label>Region</label><select id="region"><option value="">全部</option></select></div><div class="field"><label>&nbsp;</label><button id="reset" class="ghost">重置</button></div></div>
<div class="tabs"><button class="tab active" data-page="overview">Overview</button><button class="tab" data-page="web">Web</button><button class="tab" data-page="integrations">Integrations</button><button class="tab" data-page="reliability">Reliability</button><button class="tab" data-page="security">Security</button><button class="tab" data-page="feedback">Feedback</button></div></div></div>
<main class="wrap"><div id="error"></div>
<section class="page active" id="page-overview"><div class="section"><div><h2>整体情况</h2><div class="muted">先看结果，再下钻原因。</div></div><div id="chips" class="chips"></div></div><div id="overviewKpis" class="kpis"></div><div class="grid2"><div class="panel"><h3>请求趋势</h3><div class="chart"><canvas id="trend"></canvas></div></div><div class="panel"><h3>平台分布</h3><div id="platformBars" class="bars"></div></div></div><div class="grid3"><div class="panel"><h3>Clients</h3><div id="clientBars" class="bars"></div></div><div class="panel"><h3>国家 / 地区</h3><div id="countryBars" class="bars"></div></div><div class="panel"><h3>Data Quality</h3><div id="quality"></div></div></div></section>
<section class="page" id="page-web"><div class="section"><div><h2>Web</h2><div class="muted">官网访问、来源与客户端环境。</div></div></div><div id="webKpis" class="kpis"></div><div class="grid3"><div class="panel"><h3>Referrer</h3><div id="referrerBars" class="bars"></div></div><div class="panel"><h3>Browser</h3><div id="browserBars" class="bars"></div></div><div class="panel"><h3>Device / OS</h3><div id="deviceBars" class="bars"></div><hr><div id="osBars" class="bars"></div></div></div></section>
<section class="page" id="page-integrations"><div class="section"><div><h2>Integrations</h2><div class="muted">MusicFree、Public API 与未来集成。</div></div></div><div id="integrationKpis" class="kpis"></div><div class="grid3"><div class="panel"><h3>Clients</h3><div id="integrationClients" class="bars"></div></div><div class="panel"><h3>Versions</h3><div id="versionBars" class="bars"></div></div><div class="panel"><h3>Host Platforms</h3><div id="hostBars" class="bars"></div></div><div class="panel"><h3>Migration Destinations</h3><div id="migrationBars" class="bars"></div></div></div></section>
<section class="page" id="page-reliability"><div class="section"><div><h2>Reliability</h2><div class="muted">失败原因、阶段与延迟；可靠性 cube 不伪造地理关联。</div></div></div><div id="reliabilityKpis" class="kpis"></div><div class="grid3"><div class="panel"><h3>Failure Code</h3><div id="failureCodeBars" class="bars"></div></div><div class="panel"><h3>Failure Stage</h3><div id="failureStageBars" class="bars"></div></div><div class="panel"><h3>Latency</h3><div id="latencyBars" class="bars"></div></div></div><div class="grid3"><div class="panel"><h3>Requested Type</h3><div id="requestedTypeBars" class="bars"></div></div><div class="panel"><h3>Provider Failure Path</h3><div id="providerBars" class="bars"></div></div><div class="panel"><h3>Endpoint</h3><div id="endpointBars" class="bars"></div></div></div></section>
<section class="page" id="page-security"><div class="section"><div><h2>Security</h2><div class="muted">API 是产品流量；Bot、429、Quarantine 才是安全层。</div></div></div><div id="securityKpis" class="kpis"></div><div class="grid2"><div class="panel"><h3>Rate-limit Endpoints</h3><div id="rateBars" class="bars"></div></div><div class="panel"><h3>Quarantine Summary</h3><div id="quarantineSummary" class="bars"></div></div></div><div class="panel" style="margin-top:12px"><h3>最近隔离记录</h3><div class="scroll"><table><thead><tr><th>Date</th><th>Reason</th><th>Platform</th><th>Dimension</th><th>Region</th><th>Count</th></tr></thead><tbody id="quarantineRows"></tbody></table></div></div></section>
<section class="page" id="page-feedback"><div class="section"><div><h2>Feedback</h2><div class="muted">解析失败反馈工作流。</div></div><button id="reloadFeedback" class="ghost" style="width:auto">刷新</button></div><div class="panel"><div class="scroll"><table><thead><tr><th>ID</th><th>时间</th><th>Platform</th><th>Error</th><th>Reports</th><th>Status</th><th>操作</th></tr></thead><tbody id="feedbackRows"></tbody></table></div></div></section>
<div class="footer">PlaylistOut Analytics V2 · Local loopback proxy</div></main>
<script>
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));let A=null,chart=null,range="7";
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));const fmt=n=>Number(n||0).toLocaleString();const pct=n=>Number(n||0).toFixed(1)+"%";
function dates(){let e=new Date();e.setUTCHours(0,0,0,0);let s=new Date(e);if(range==="yesterday"){e.setUTCDate(e.getUTCDate()-1);s=new Date(e)}else if(range!=="today")s.setUTCDate(s.getUTCDate()-(Number(range)-1));return{from:s.toISOString().slice(0,10),to:e.toISOString().slice(0,10)}}
function params(){let p=new URLSearchParams(dates());["channel","client","platform","country","region"].forEach(id=>{let v=$("#"+id).value;if(v)p.set(id,v)});return p}
async function api(url,opts){let r=await fetch(url,opts),j={};try{j=await r.json()}catch(e){}if(!r.ok||j.success===false)throw new Error(j?.error?.message||("HTTP "+r.status));return j.data??j}
function bars(id,arr,limit=10){let el=$(id),a=(arr||[]).slice(0,limit);if(!a.length){el.innerHTML='<div class="muted">暂无数据</div>';return}let max=Math.max(...a.map(x=>Number(x.count||0)),1);el.innerHTML=a.map(x=>'<div class="bar"><div class="bn" title="'+esc(x.name)+'">'+esc(x.name)+'</div><div class="track"><div class="fill" style="width:'+Math.max(1,Number(x.count||0)/max*100)+'%"></div></div><div class="num">'+fmt(x.count)+'</div></div>').join("")}
function kpis(id,rows){$(id).innerHTML=rows.map(x=>'<div class="card"><div class="label">'+esc(x[0])+'</div><div class="value">'+esc(x[1])+'</div><div class="muted">'+esc(x[2]||"")+'</div></div>').join("")}
function options(id,arr){let s=$(id),old=s.value;s.innerHTML='<option value="">全部</option>'+(arr||[]).map(x=>'<option value="'+esc(x.name)+'">'+esc(x.name)+' · '+fmt(x.count)+'</option>').join("");if(Array.from(s.options).some(o=>o.value===old))s.value=old}
function render(){let o=A.overview||{},b=A.breakdowns||{},e=A.environment||{},f=A.availableFilters||{},succ=Number(o.playlist_success||0)+Number(o.user_success||0);kpis("#overviewKpis",[["Requests",fmt(o.resolve_request),"统一请求口径"],["Success",fmt(succ),pct(o.success_rate)+" 成功率"],["Tracks",fmt(o.tracks_processed),"处理歌曲"],["Exports",fmt(o.export),"文件导出"],["Failures",fmt(o.resolve_failure),"最终失败"],["Active Clients",fmt(o.active_clients),"当前范围"]]);let labels=(A.timeseries||[]).map(x=>x.date),ok=(A.timeseries||[]).map(x=>Number(x.playlist_success||0)+Number(x.user_success||0)),fail=(A.timeseries||[]).map(x=>Number(x.resolve_failure||0));if(chart)chart.destroy();chart=new Chart($("#trend"),{type:"line",data:{labels,datasets:[{label:"Success",data:ok,tension:.28,borderWidth:2,pointRadius:2},{label:"Failure",data:fail,tension:.28,borderWidth:2,pointRadius:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom"}},scales:{y:{beginAtZero:true}}}});bars("#platformBars",f.platforms);bars("#clientBars",f.clients);bars("#countryBars",A.geo?.countries);let q=A.dataQuality||{},checks=q.checks||[];$("#health").className="health "+(q.status==="healthy"?"good":"bad");$("#health").textContent=q.status==="healthy"?"● Data Healthy":"● Data Integrity Error";$("#quality").innerHTML=checks.map(x=>'<div class="notice '+(x.ok?"":"bad")+'">'+(x.ok?"✓ ":"✕ ")+esc(x.id)+'<br><span class="muted">'+esc(x.note)+'</span></div>').join("")+'<div class="muted">Latest: '+esc(q.latestDate||"—")+' · Legacy mixed: '+pct(q.legacyMixedShare)+'</div>';let chips=[];["channel","client","platform","country","region"].forEach(id=>{let v=$("#"+id).value;if(v)chips.push('<span class="chip">'+esc(v)+'</span>')});$("#chips").innerHTML=chips.join("");kpis("#webKpis",[["Page Views",fmt(o.page_view),"官网访问"],["Daily Uniques",fmt(o.visitor_unique),"每日匿名去重"],["Exports",fmt(o.export),"当前范围"],["Clipboard",fmt(o.clipboard),"复制"],["Top Browser",e.browsers?.[0]?.name||"—",""],["Top Country",A.geo?.countries?.[0]?.name||"—",""]]);bars("#referrerBars",b.referrer_source);bars("#browserBars",e.browsers);bars("#deviceBars",e.devices,6);bars("#osBars",e.operatingSystems,6);kpis("#integrationKpis",[["Requests",fmt(o.resolve_request),"API / Plugin"],["Success",fmt(succ),pct(o.success_rate)],["Failures",fmt(o.resolve_failure),""],["Tracks",fmt(o.tracks_processed),""],["Clients",fmt(o.active_clients),""],["Migration Handoffs",fmt(o.migration_handoff),"Soundiiz 等迁移跳转"]]);bars("#integrationClients",f.clients);bars("#versionBars",b.client_version);bars("#hostBars",b.host_platform);bars("#migrationBars",b.migration_destination);kpis("#reliabilityKpis",[["Success Rate",pct(o.success_rate),""],["Failures",fmt(o.resolve_failure),""],["Requests",fmt(o.resolve_request),""],["Rate Limited",fmt(o.rate_limited),""],["Top Failure",b.failure_code?.[0]?.name||"—",""],["Top Latency",b.latency_bucket?.[0]?.name||"—",""]]);bars("#failureCodeBars",b.failure_code);bars("#failureStageBars",b.failure_stage);bars("#latencyBars",b.latency_bucket);bars("#requestedTypeBars",b.requested_type);bars("#providerBars",b.provider_failure_path);bars("#endpointBars",b.endpoint);kpis("#securityKpis",[["Rate Limited",fmt(o.rate_limited),"HTTP 429"],["API Channel",fmt((f.channels||[]).find(x=>x.name==="api")?.count||0),"正常产品流量"],["Plugin Channel",fmt((f.channels||[]).find(x=>x.name==="plugin")?.count||0),"正常产品流量"],["Quarantine","见下方","安全取证"],["Legacy Mixed",pct(q.legacyMixedShare),"历史未知来源"],["Data Health",q.status==="healthy"?"Healthy":"Error",""]]);bars("#rateBars",b.rate_limit_endpoint);options("client",f.clients);options("country",A.geo?.countries);options("region",A.geo?.regions)}
async function load(){try{$("#error").innerHTML="";A=await api("/api/analytics?"+params().toString());render()}catch(e){$("#health").className="health bad";$("#health").textContent="● Load Failed";$("#error").innerHTML='<div class="notice bad">'+esc(e.message)+'</div>'}}
async function quarantine(){try{let d=await api("/api/quarantine?limit=100"),rows=d.quarantine||[],m=new Map();rows.forEach(x=>m.set(x.reason||"unknown",(m.get(x.reason||"unknown")||0)+Number(x.count||0)));bars("#quarantineSummary",Array.from(m,([name,count])=>({name,count})));$("#quarantineRows").innerHTML=rows.map(x=>'<tr><td>'+esc(x.incident_date)+'</td><td>'+esc(x.reason)+'</td><td>'+esc(x.platform)+'</td><td>'+esc(x.metric_or_dimension)+'</td><td>'+esc([x.country,x.region,x.city].filter(Boolean).join(" / "))+'</td><td>'+fmt(x.count)+'</td></tr>').join("")||'<tr><td colspan="6">暂无隔离记录</td></tr>'}catch(e){$("#quarantineRows").innerHTML='<tr><td colspan="6">'+esc(e.message)+'</td></tr>'}}
async function feedback(){try{let d=await api("/api/feedback?limit=100"),rows=d.entries||[];$("#feedbackRows").innerHTML=rows.map(x=>'<tr><td>'+esc(x.id)+'</td><td>'+esc(x.last_reported_at||x.created_at||"")+'</td><td>'+esc(x.platform||"unknown")+'</td><td>'+esc(x.error_code||"")+'</td><td>'+fmt(x.report_count)+'</td><td>'+esc(x.status)+'</td><td>'+["pending","resolved","ignored"].map(s=>'<button class="status" data-id="'+x.id+'" data-status="'+s+'">'+s+'</button>').join(" ")+'</td></tr>').join("")||'<tr><td colspan="7">暂无反馈</td></tr>';$$('#feedbackRows .status').forEach(b=>b.onclick=async()=>{await api('/api/feedback?id='+encodeURIComponent(b.dataset.id)+'&status='+encodeURIComponent(b.dataset.status),{method:'PUT'});feedback()})}catch(e){$("#feedbackRows").innerHTML='<tr><td colspan="7">'+esc(e.message)+'</td></tr>'}}
$$(".tab").forEach(b=>b.onclick=()=>{$$(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");$$(".page").forEach(x=>x.classList.remove("active"));$("#page-"+b.dataset.page).classList.add("active");if(b.dataset.page==="security")quarantine();if(b.dataset.page==="feedback")feedback()});$$(".range button").forEach(b=>b.onclick=()=>{$$(".range button").forEach(x=>x.classList.remove("active"));b.classList.add("active");range=b.dataset.range;load()});["channel","client","platform","country","region"].forEach(id=>$("#"+id).onchange=load);$("#reset").onclick=()=>{["channel","client","platform","country","region"].forEach(id=>$("#"+id).value="");range="7";$$(".range button").forEach(x=>x.classList.toggle("active",x.dataset.range==="7"));load()};$("#reloadFeedback").onclick=feedback;load();
</script></body></html>'''


class Handler(BaseHTTPRequestHandler):
    token = ""

    def log_message(self, fmt: str, *args: object) -> None:
        print("[Dashboard] " + (fmt % args))

    def send_bytes(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.end_headers()
        self.wfile.write(body)

    def proxy(self, path: str, allowed: set[str], method: str = "GET") -> None:
        parsed = urllib.parse.urlparse(self.path)
        raw = urllib.parse.parse_qs(parsed.query, keep_blank_values=False)
        query = {key: values[-1] for key, values in raw.items() if key in allowed and values}
        status, body, content_type = remote_request(self.token, path, method, query)
        self.send_bytes(status, body, content_type)

    def do_GET(self) -> None:  # noqa: N802
        path = urllib.parse.urlparse(self.path).path
        if path in {"/", "/index.html"}:
            self.send_bytes(200, HTML.encode("utf-8"), "text/html; charset=utf-8")
        elif path == "/api/analytics":
            self.proxy("/api/internal/analytics/v2", ANALYTICS_PARAMS)
        elif path == "/api/feedback":
            self.proxy("/api/internal/feedback", FEEDBACK_PARAMS)
        elif path == "/api/quarantine":
            self.proxy("/api/internal/quarantine", {"limit", "offset", "reason", "date"})
        elif path == "/health":
            self.send_bytes(200, b'{"ok":true}', "application/json")
        else:
            self.send_bytes(404, b'{"error":"not_found"}', "application/json")

    def do_PUT(self) -> None:  # noqa: N802
        if urllib.parse.urlparse(self.path).path == "/api/feedback":
            self.proxy("/api/internal/feedback", FEEDBACK_PARAMS, "PUT")
        else:
            self.send_bytes(405, b'{"error":"method_not_allowed"}', "application/json")


def main() -> None:
    parser = argparse.ArgumentParser(description="PlaylistOut Analytics V2 本地仪表板")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=4178)
    parser.add_argument("--no-open", action="store_true")
    args = parser.parse_args()
    if args.host not in {"127.0.0.1", "localhost", "::1"}:
        print("[Dashboard] 拒绝监听非 loopback 地址。")
        sys.exit(2)
    repo_root = Path(__file__).resolve().parents[2]
    token = get_admin_token(repo_root)
    if not token:
        print("[Dashboard] 缺少 INSIGHTS_ADMIN_TOKEN。")
        sys.exit(1)
    Handler.token = token
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    url = "http://127.0.0.1:" + str(args.port) + "/"
    print("[Dashboard] PlaylistOut Analytics V2")
    print("[Dashboard] " + url)
    print("[Dashboard] Token 仅存在本地 Python 进程中。")
    if not args.no_open:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[Dashboard] 已停止。")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
