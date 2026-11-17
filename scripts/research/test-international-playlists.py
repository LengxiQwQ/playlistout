#!/usr/bin/env python3
"""独立上游能力实验；不注册 provider、不读取账号、不下载媒体。

python scripts/research/test-international-playlists.py --setup
python scripts/research/test-international-playlists.py --samples
python scripts/research/test-international-playlists.py --spotify URL --apple URL
"""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / "scratch" / "international-playlists"
SOURCES = {
    "spotify": ("AliAkhtari78/SpotifyScraper", "9cbf05aa4963bac3684bb941270dcb62fc851ab7"),
    "apple": ("omkarcloud/apple-music-scraper", "f7606f84e63b4d07249c8531eb2b68fe20ca23c3"),
}
SAMPLES = {
    "spotify": [
        "https://open.spotify.com/playlist/37i9dQZEVXbMDoHDwVN2tF",
        "https://open.spotify.com/playlist/37i9dQZF1DX5Ejj0EkURtP",
    ],
    "apple": [
        "https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb",
        "https://music.apple.com/us/playlist/top-100-global/pl.d25f5d1181894928af76c85c967f8f31",
    ],
}


def python_path():
    return WORK / ".venv" / ("Scripts/python.exe" if sys.platform == "win32" else "bin/python")


def command(args, **kwargs):
    subprocess.run([str(x) for x in args], check=True, timeout=300, **kwargs)


def setup():
    WORK.mkdir(parents=True, exist_ok=True)
    for key, (repo, sha) in SOURCES.items():
        dest = WORK / "sources" / key
        if not dest.exists():
            dest.mkdir(parents=True)
            command(["git", "init", dest])
            command(["git", "-C", dest, "remote", "add", "origin", f"https://github.com/{repo}.git"])
        head = subprocess.run(["git", "-C", str(dest), "rev-parse", "HEAD"],
                              capture_output=True, text=True).stdout.strip()
        if head != sha:
            command(["git", "-C", dest, "fetch", "--depth", "1", "origin", sha])
            command(["git", "-C", dest, "checkout", "--detach", sha])
    if not python_path().exists():
        command([sys.executable, "-m", "venv", WORK / ".venv"])
    command([python_path(), "-m", "pip", "install", "-e", WORK / "sources" / "spotify",
             "httpx==0.28.1", "curl_cffi==0.14.0"])
    with (WORK / "dependencies.txt").open("w", encoding="utf-8") as stream:
        command([python_path(), "-m", "pip", "freeze"], stdout=stream)
    print("实验环境已准备：", WORK)


def present(value):
    return value is not None and value != "" and value != [] and value != {}


def image(value):
    if isinstance(value, list):
        return next((v.get("url") for v in value if isinstance(v, dict) and v.get("url")), None)
    return (value or {}).get("link") if isinstance(value, dict) else None


def prune(data):
    return {k: v for k, v in data.items() if present(v)}


def normalize_spotify(raw):
    tracks = []
    for i, entry in enumerate(raw.get("tracks") or [], 1):
        t = entry.get("track") or {}
        album = t.get("album") or {}
        tracks.append(prune({
            "index": i, "title": t.get("name"),
            "artist": ", ".join(a.get("name", "") for a in t.get("artists") or []),
            "album": album.get("name"), "id": t.get("id"), "isrc": t.get("isrc"),
            "durationMs": t.get("duration_ms"), "releaseDate": t.get("release_date"),
            "trackNumber": t.get("track_number"), "discNumber": t.get("disc_number"),
            "sourceUrl": t.get("share_url") or (f"https://open.spotify.com/track/{t['id']}" if t.get("id") else None),
            "coverUrl": image(t.get("images")) or image(album.get("images")),
        }))
    owner = raw.get("owner") or {}
    return prune({"platform": "spotify", "id": raw.get("id"), "name": raw.get("name"),
                  "creator": owner.get("display_name") or owner.get("name"),
                  "coverUrl": image(raw.get("images")), "trackCount": raw.get("total_tracks"),
                  "description": raw.get("description"),
                  "sourceUrl": raw.get("share_url") or (f"https://open.spotify.com/playlist/{raw['id']}" if raw.get("id") else None),
                  "tracks": tracks})


def normalize_apple(raw):
    tracks = []
    for i, t in enumerate(raw.get("tracks") or [], 1):
        tracks.append(prune({
            "index": t.get("position", i), "title": t.get("name"), "artist": t.get("artist_name"),
            "album": t.get("album_name"), "id": t.get("id"), "isrc": t.get("isrc"),
            "durationMs": t.get("duration_ms"), "releaseDate": t.get("release_date"),
            "trackNumber": t.get("track_number"), "discNumber": t.get("disc_number"),
            "sourceUrl": t.get("link"), "coverUrl": image(t.get("artwork")),
        }))
    description = raw.get("description") or {}
    return prune({"platform": "apple", "id": raw.get("id"), "name": raw.get("name"),
                  "creator": raw.get("curator_name"), "coverUrl": image(raw.get("artwork")),
                  "trackCount": raw.get("track_count"), "description": description.get("full") or description.get("short"),
                  "sourceUrl": raw.get("link"),
                  "updateTime": int(datetime.fromisoformat(raw["last_modified_at"].replace("Z", "+00:00")).timestamp() * 1000) if raw.get("last_modified_at") else None,
                  "tracks": tracks})


def contract_fields(interface):
    text = (ROOT / "worker/src/models/playlist.ts").read_text(encoding="utf-8")
    body = re.search(r"export interface " + interface + r" \{(.*?)\n\}", text, re.S).group(1)
    return re.findall(r"^\s*(\w+)\??:", body, re.M)


def coverage(normalized):
    tracks = normalized.get("tracks", [])
    return {
        "playlist": {f: present(normalized.get(f)) for f in contract_fields("Playlist") if f != "tracks"},
        "tracks": {f: {"present": sum(present(t.get(f)) for t in tracks), "total": len(tracks)}
                   for f in contract_fields("Track")},
    }


def spotify_probe(url, detail_samples):
    from spotify_scraper import SpotifyClient
    with SpotifyClient() as client:
        raw = client.get_playlist(url, max_tracks=None).to_dict()
        details = []
        for entry in (raw.get("tracks") or [])[:detail_samples]:
            t = entry.get("track") or {}
            try:
                details.append({"id": t["id"], "data": client.get_track(t["id"]).to_dict()})
            except Exception as exc:
                details.append({"id": t.get("id"), "error_type": type(exc).__name__})
    return raw, details, None


def apple_probe(url, detail_samples, page_size, max_pages):
    sys.path.insert(0, str(WORK / "sources" / "apple"))
    from apple_music import playlists, refs, songs
    ref = refs.resolve_playlist(url)
    raw = playlists.details(ref)
    collected, pages, exhausted = [], [], False
    # Always read the dedicated tracks endpoint: even a small sample exercises paging.
    for page in range(1, max_pages + 1):
        result = playlists.tracks(ref, page=page, limit=page_size)
        batch = result.get("tracks") or []
        pages.append({"page": page, "count": len(batch), "pagination": result.get("pagination")})
        collected.extend(batch)
        pagination = result.get("pagination") or {}
        # Upstream exposes total_pages=this page+1 while a next link exists.
        if pagination.get("total_pages", page + 1) <= page:
            exhausted = True
            break
        if not batch:
            break
    raw["tracks"] = collected
    raw["probe_pages"] = pages
    details = []
    for t in collected[:detail_samples]:
        try:
            details.append({"id": t["id"], "data": songs.details({"id": t["id"], "country": ref.get("country")})})
        except Exception as exc:
            details.append({"id": t.get("id"), "error_type": type(exc).__name__})
    return raw, details, exhausted


def validate_url(platform, url):
    parsed = urlparse(url)
    if parsed.scheme != "https":
        raise ValueError("请使用 HTTPS 歌单长链接")
    if platform == "spotify":
        valid = parsed.hostname == "open.spotify.com" and re.fullmatch(r"/(?:intl-[^/]+/)?playlist/[A-Za-z0-9]{22}/?", parsed.path)
    else:
        valid = parsed.hostname == "music.apple.com" and re.fullmatch(r"/[a-zA-Z]{2}/playlist/(?:[^/]+/)?pl\.[A-Za-z0-9.-]+/?", parsed.path)
    if not valid:
        raise ValueError("需要公开歌单长链接；短链请先在浏览器打开并复制最终地址，不能使用歌曲/专辑/个人主页链接")


def run_one(platform, url, args, output, index):
    start = time.monotonic()
    result = {"platform": platform, "url": url, "source": dict(zip(("repo", "commit"), SOURCES[platform]))}
    try:
        validate_url(platform, url)
        if platform == "spotify":
            raw, details, exhausted = spotify_probe(url, args.detail_samples)
            normalized = normalize_spotify(raw)
        else:
            raw, details, exhausted = apple_probe(url, args.detail_samples, args.page_size, args.max_pages)
            normalized = normalize_apple(raw)
        count = len(normalized.get("tracks", []))
        expected = normalized.get("trackCount")
        # Count equality is evidence, not proof of upstream completeness/order correctness.
        completeness = ("count_match" if count == expected and count > 0 else "count_mismatch") if isinstance(expected, int) else "unverified"
        if exhausted is False:
            completeness = "page_limit_or_empty_page"
        core_missing = {f: sum(not present(t.get(f)) for t in normalized.get("tracks", [])) for f in ("title", "artist")}
        result.update({"outcome": "parsed", "name": normalized.get("name"), "loaded": count,
                       "reported_total": expected, "completeness": completeness,
                       "paging_exhausted": exhausted, "core_missing": core_missing,
                       "coverage": coverage(normalized),
                       "duplicate_ids": {k: v for k, v in Counter(t.get("id") for t in normalized.get("tracks", []) if t.get("id")).items() if v > 1},
                       "notes": ["index 为返回顺序；未与客户端人工核对。", "Spotify sourceUrl 可由返回 ID 确定性构造。", "未将试听链接写入 playbackUrl。",
                                 "未推断 VIP、可播放状态或音质；缺失保持未知。", "逐曲补查只抽样，不合并进列表字段覆盖率。"]})
        (output / f"{index}-{platform}-raw.json").write_text(json.dumps({"playlist": raw, "detail_samples": details}, ensure_ascii=False, indent=2), encoding="utf-8")
        (output / f"{index}-{platform}-mapped.json").write_text(json.dumps(normalized, ensure_ascii=False, indent=2), encoding="utf-8")
        result["detail_samples"] = details
    except Exception as exc:
        # Exception strings may contain authenticated URLs/headers in third-party code.
        result.update({"outcome": "failed", "error_type": type(exc).__name__,
                       "error": "上游请求或解析失败；未记录异常正文以免泄漏令牌。"})
    result["elapsed_seconds"] = round(time.monotonic() - start, 2)
    return result


def markdown(results):
    lines = ["# 国际歌单独立实测", "", f"UTC 时间：{datetime.now(timezone.utc).isoformat()}", "",
             "只测公开元数据；不下载音频/歌词，不注册产品平台。计数吻合不等于真机或 Worker 验收。", "",
             "| 平台 | 名称 | 结果 | 已取 / 上游总数 | 完整性 | 耗时 |", "|---|---|---|---|---|---|"]
    for r in results:
        name = str(r.get("name", r.get("error_type", ""))).replace("|", "\\|").replace("\n", " ")
        lines.append(f"| {r['platform']} | {name} | {r['outcome']} | {r.get('loaded', '?')} / {r.get('reported_total', '?')} | {r.get('completeness', '?')} | {r['elapsed_seconds']}s |")
    for i, r in enumerate(results, 1):
        lines += ["", f"## {i}. {r['platform']}", "", f"输入：{r['url']}", "", f"上游：{r['source']['repo']} @ {r['source']['commit']}", ""]
        if r["outcome"] == "failed":
            lines += [f"失败：{r['error_type']}；当前样本无法据此判断字段是否可取。"]
            continue
        lines += ["### 歌单字段", "", "| 字段 | 本次是否取得 |", "|---|---|"]
        for f, yes in r["coverage"]["playlist"].items():
            lines.append(f"| {f} | {'有' if yes else '无/不适用'} |")
        lines += ["", "### 歌曲字段（列表原始能力，未合并逐曲补查）", "", "| 字段 | 有值 / 歌曲数 |", "|---|---|"]
        for f, counts in r["coverage"]["tracks"].items():
            lines.append(f"| {f} | {counts['present']} / {counts['total']} |")
        lines += ["", "### 逐曲补查", "", "| ID | 结果 | 发行日期 | ISRC | MV 数量 |", "|---|---|---|---|---|"]
        for sample in r.get("detail_samples", []):
            data = sample.get("data") or {}
            lines.append(f"| {sample.get('id')} | {sample.get('error_type', '成功')} | {data.get('release_date') or '无'} | {data.get('isrc') or '无'} | {len(data.get('music_videos') or [])} |")
        lines += ["", "原始逐曲详情见 report.json / raw.json；不将 preview、订阅条件或 audioTraits 推断为完整播放链接、VIP 或最高音质。",
                  "Spotify 原始 playable 仅为匿名请求上下文中的标记，不等于用户账号/地区的可播放结论。index 和部分 Spotify sourceUrl 由返回顺序与 ID 构造。"]
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--setup", action="store_true", help="在 scratch 中获取固定版本上游源码，安装隔离环境")
    parser.add_argument("--samples", action="store_true", help="测试内置公开歌单（每家两个，不能替代用户歌单验收）")
    parser.add_argument("--spotify", action="append", default=[], metavar="URL", help="Spotify 歌单长链接，可重复")
    parser.add_argument("--apple", action="append", default=[], metavar="URL", help="Apple Music 歌单长链接，可重复")
    parser.add_argument("--detail-samples", type=int, default=3, help="逐曲详情补查样本数，默认 3")
    parser.add_argument("--page-size", type=int, default=25, help="Apple 每页条数，默认 25，可测试翻页")
    parser.add_argument("--max-pages", type=int, default=100, help="Apple 分页上限，达到上限明确标记不完整")
    parser.add_argument("--timeout", type=int, default=180, help="每个歌单子进程最大秒数")
    parser.add_argument("--worker-input", help=argparse.SUPPRESS)
    args = parser.parse_args()
    if args.detail_samples < 0 or not 1 <= args.page_size <= 100 or args.max_pages < 1 or args.timeout < 1:
        parser.error("样本数必须非负，每页为 1–100，分页上限和超时必须为正数")
    if args.setup:
        setup()
        return 0
    if args.worker_input:
        job = json.loads(Path(args.worker_input).read_text(encoding="utf-8"))
        result = run_one(job["platform"], job["url"], args, Path(job["output"]), job["index"])
        Path(job["result"]).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        return 0
    if not python_path().exists():
        parser.error("请先运行此脚本 --setup")
    for platform, (_, sha) in SOURCES.items():
        source = WORK / "sources" / platform
        head = subprocess.run(["git", "-C", str(source), "rev-parse", "HEAD"], capture_output=True, text=True)
        dirty = subprocess.run(["git", "-C", str(source), "status", "--porcelain", "--untracked-files=no"], capture_output=True, text=True)
        if head.returncode or dirty.returncode or head.stdout.strip() != sha or dirty.stdout.strip():
            parser.error(f"{platform} 上游源码版本不符或有修改，请检查实验源码目录")
    urls = {"spotify": args.spotify[:], "apple": args.apple[:]}
    if args.samples:
        for key in urls:
            urls[key].extend(SAMPLES[key])
    if not any(urls.values()):
        parser.error("请提供 --samples 或 --spotify URL / --apple URL")
    output = WORK / "results" / datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    output.mkdir(parents=True)
    results = []
    for platform, links in urls.items():
        for url in links:
            i = len(results) + 1
            job = {"platform": platform, "url": url, "output": str(output), "index": i,
                   "result": str(output / f"{i}-result.json")}
            jobfile = output / f"{i}-job.json"
            jobfile.write_text(json.dumps(job), encoding="utf-8")
            print(f"[{i}] 测试 {platform}: {url}", flush=True)
            start = time.monotonic()
            try:
                run = subprocess.run([str(python_path()), "-X", "utf8", str(Path(__file__).resolve()),
                                      "--worker-input", str(jobfile), "--detail-samples", str(args.detail_samples),
                                      "--page-size", str(args.page_size), "--max-pages", str(args.max_pages)],
                                     timeout=args.timeout, capture_output=True,
                                     env={**os.environ, "APPLE_MUSIC_TOKEN": "", "APPLE_MUSIC_PROXY": ""})
                if run.returncode:
                    raise RuntimeError("实验子进程退出异常")
                result = json.loads(Path(job["result"]).read_text(encoding="utf-8"))
            except (subprocess.TimeoutExpired, RuntimeError) as exc:
                result = {"platform": platform, "url": url, "source": dict(zip(("repo", "commit"), SOURCES[platform])),
                          "outcome": "failed", "error_type": type(exc).__name__,
                          "elapsed_seconds": round(time.monotonic() - start, 2)}
            results.append(result)
            print(f"    {result['outcome']}: {result.get('loaded', '?')}/{result.get('reported_total', '?')} {result.get('error_type', '')}", flush=True)
            (output / "report.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
            (output / "REPORT.md").write_text(markdown(results), encoding="utf-8")
    print("报告目录：", output)
    return 0 if all(r["outcome"] == "parsed" and r["completeness"] == "count_match" and not any(r["core_missing"].values()) for r in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
