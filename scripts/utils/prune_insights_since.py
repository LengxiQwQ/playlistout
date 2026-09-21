#!/usr/bin/env python3
"""清理 insights/traffic.json 中截止日期之前的按日 views/clones 数据。

用法:
    python scripts/utils/prune_insights_since.py --since 2026-09-19 [--traffic <path>]

规则:
  - 仅删除 views / clones 中 date < --since 的按日键；
  - referrer_snapshots / path_snapshots / repo_meta_snapshots /
    website_snapshots / website_latest / updated_at 等历史快照一律保留；
  - 写入格式与 collect.py 保持一致（indent=2, ensure_ascii=False）。

注意: insights/raw/ 永久归档不做任何改动。
"""
import argparse
import json
import sys
from pathlib import Path


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--since", required=True, help="保留该日期（含）之后的按日数据，如 2026-09-19")
    ap.add_argument("--traffic", default=None, help="traffic.json 路径（默认定位到仓库 insights/traffic.json）")
    args = ap.parse_args()

    since = args.since.strip()
    if len(since) != 10 or since[4] != "-" or since[7] != "-":
        print(f"[prune] [ERROR] --since 需为 YYYY-MM-DD 格式，收到: {args.since}")
        return 1

    if args.traffic:
        path = Path(args.traffic).resolve()
    else:
        path = Path(__file__).resolve().parent.parent.parent / "insights" / "traffic.json"

    if not path.exists():
        print(f"[prune] [ERROR] 找不到 traffic.json: {path}")
        return 1

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"[prune] [ERROR] 读取 {path} 失败: {e}")
        return 1

    removed = {}
    for key in ("views", "clones"):
        bucket = data.get(key)
        if not isinstance(bucket, dict):
            removed[key] = 0
            continue
        to_delete = [d for d in bucket if d < since]
        for d in to_delete:
            del bucket[d]
        removed[key] = len(to_delete)

    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"[prune] removed views day-keys(< {since}): {removed.get('views', 0)}")
    print(f"[prune] removed clones day-keys(< {since}): {removed.get('clones', 0)}")
    print(f"[prune] remaining view days: {sorted(data.get('views', {}))}")
    print(f"[prune] remaining clone days: {sorted(data.get('clones', {}))}")
    print(f"[prune] snapshots kept: referrer={len(data.get('referrer_snapshots', []))} "
          f"path={len(data.get('path_snapshots', []))} repo_meta={len(data.get('repo_meta_snapshots', []))} "
          f"website={len(data.get('website_snapshots', []))}")
    print(f"[prune] OK -> {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
