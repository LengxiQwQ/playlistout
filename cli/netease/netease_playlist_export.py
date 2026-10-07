# --- 网易云音乐歌单导出工具 ---
# -*- coding: utf-8 -*-

"""
依赖（自行安装）：
    pip install requests
    pip install openpyxl
"""

__author__ = "lengxiQwQ"

import os
import re
import sys
import json
import csv
import platform
import subprocess
import requests
import socket
from datetime import datetime, timezone

# 强制优先使用 IPv4 避免国内部分运营商 IPv6 握手超时
try:
    import urllib3.util.connection as urllib3_cn
    urllib3_cn.allowed_gai_family = lambda: socket.AF_INET
except Exception:
    pass

HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ),
    'Referer': 'https://music.163.com/',
    'Origin': 'https://music.163.com',
    'Cookie': 'os=pc; appver=2.9.7',
}

def sanitize_filename(name):
    if not name:
        return ""
    name = re.sub(r'[\x00-\x1f]', ' ', name)
    name = re.sub(r'[<>:"/\\|?*]', ' ', name)
    name = re.sub(r'\s+', ' ', name).strip()
    return name or "playlist"

def resolve_shortlink(text):
    if not text:
        return text
    m = re.search(r'https?://163cn\.tv/[a-zA-Z0-9]+', text)
    if not m:
        m2 = re.search(r'(?:^|[^\w.-])(163cn\.tv/[a-zA-Z0-9]+)', text)
        if m2:
            url = f"https://{m2.group(1)}"
        else:
            url = None
    else:
        url = m.group(0)

    if url:
        try:
            resp = requests.get(url, headers=HEADERS, allow_redirects=False, timeout=8)
            if resp.status_code in (301, 302, 303, 307, 308) and "Location" in resp.headers:
                return resp.headers["Location"]
            elif resp.status_code == 200:
                return resp.url
        except Exception:
            pass
    return text

def extract_playlist_id(text):
    if not text:
        return None
    resolved = resolve_shortlink(text.strip())
    # Try query param id=...
    m = re.search(r'(?:[?&]id=|\/playlist\/)(\d{4,18})', resolved)
    if m:
        return m.group(1)
    if re.fullmatch(r'\d{4,18}', text.strip()):
        return text.strip()
    return None

def extract_user_id(text):
    if not text:
        return None
    resolved = resolve_shortlink(text.strip())
    if '/playlist' in resolved:
        return None
    if '/user' in resolved or 'user/home' in resolved or 'user?id=' in resolved:
        m = re.search(r'(?:[?&]id=|\/user\/)(\d{4,18})', resolved)
        if m:
            return m.group(1)
    if re.fullmatch(r'\d{4,18}', text.strip()):
        return text.strip()
    return None

def determine_track_status(song, priv):
    st = priv.get('st') if priv else None
    pl = priv.get('pl') if priv else None
    fee = song.get('fee', priv.get('fee', 0) if priv else 0)

    rcmd = song.get('noCopyrightRcmd') or {}
    is_geo = st == -200 or rcmd.get('type') == 1 or '地区' in str(rcmd.get('typeDesc', '')) or '国家' in str(rcmd.get('typeDesc', ''))
    if is_geo:
        return '仅海外受限'
    if st is not None and st < 0:
        return '下架/无版权'
    if song.get('noCopyrightRcmd'):
        return '下架/无版权'
    if pl == 0 and fee not in (1, 4):
        return '下架/无版权'
    if fee == 1:
        return 'VIP专享'
    if fee == 4:
        return '付费专辑'
    return '正常'

def fetch_song_details(track_ids):
    if not track_ids:
        return [], []
    all_songs = []
    all_privileges = []
    batch_size = 500
    chunks = [track_ids[i:i + batch_size] for i in range(0, len(track_ids), batch_size)]

    def fetch_batch(chunk):
        c_param = json.dumps([{"id": int(cid)} for cid in chunk])
        url = 'https://music.163.com/api/v3/song/detail'
        try:
            resp = requests.post(
                url,
                headers={**HEADERS, 'Content-Type': 'application/x-www-form-urlencoded'},
                data={'c': c_param},
                timeout=15,
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get('songs', []), data.get('privileges', [])
        except Exception as e:
            print(f"获取歌曲详情批次失败: {e}")
        return [], []

    from concurrent.futures import ThreadPoolExecutor
    workers = min(5, max(1, len(chunks)))
    with ThreadPoolExecutor(max_workers=workers) as executor:
        results = list(executor.map(fetch_batch, chunks))

    for songs, privs in results:
        all_songs.extend(songs)
        all_privileges.extend(privs)

    return all_songs, all_privileges

def get_playlist_data(playlist_id):
    post_headers = {**HEADERS, 'Content-Type': 'application/x-www-form-urlencoded'}
    post_data = {'id': str(playlist_id), 'n': '100000', 's': '8'}
    pl = None

    # 1. Try v6 POST (avoids datacenter GET anti-bot and fetches full trackIds)
    try:
        resp = requests.post('https://music.163.com/api/v6/playlist/detail', headers=post_headers, data=post_data, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('code') == 200 and data.get('playlist'):
                pl = data['playlist']
    except Exception:
        pass

    # 2. Try v3 POST fallback
    if not pl:
        try:
            resp = requests.post('https://music.163.com/api/v3/playlist/detail', headers=post_headers, data=post_data, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                if data.get('code') == 200 and data.get('playlist'):
                    pl = data['playlist']
        except Exception:
            pass

    # 3. Try legacy / v6 GET fallback
    if not pl:
        url = f"https://music.163.com/api/v6/playlist/detail?id={playlist_id}"
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                if data.get('code') == 200 and data.get('playlist'):
                    pl = data['playlist']
        except Exception as e:
            print(f"抓取歌单异常: {e}")
            return None

    if not pl:
        return None

    try:
        title = pl.get('name', '未命名歌单')
        author = pl.get('creator', {}).get('nickname', '未知作者')

        track_ids = [t['id'] for t in pl.get('trackIds', [])]
        if not track_ids and pl.get('tracks'):
            track_ids = [t['id'] for t in pl['tracks']]

        songs, privs = fetch_song_details(track_ids)
        song_map = {str(s['id']): s for s in songs}
        priv_map = {str(p['id']): p for p in privs}

        tracks = []
        for tid in track_ids:
            tid_str = str(tid)
            song = song_map.get(tid_str, {'name': f'歌曲 #{tid_str}'})
            priv = priv_map.get(tid_str, {})
            name = song.get('name', '未知歌曲')
            singers = " / ".join(a.get('name', '') for a in song.get('ar', [])) or "未知歌手"
            album = song.get('al', {}).get('name', '') or "未知专辑"
            duration_s = song.get('dt', 0) // 1000
            duration_str = f"{duration_s // 60:02d}:{duration_s % 60:02d}"
            status_text = determine_track_status(song, priv)
            cover_url = (song.get('al') or {}).get('picUrl') or (song.get('album') or {}).get('picUrl') or ''
            if cover_url and cover_url.startswith('http://'):
                cover_url = 'https://' + cover_url[7:]

            dt_raw = song.get('dt')
            dt_ms = int(dt_raw) if isinstance(dt_raw, (int, float)) and dt_raw > 0 else None
            pub_time = song.get('publishTime')
            release_date = None
            if pub_time and isinstance(pub_time, (int, float)) and pub_time > 0:
                try:
                    pub_seconds = pub_time / 1000 if pub_time > 1e11 else pub_time
                    release_date = datetime.fromtimestamp(pub_seconds, tz=timezone.utc).strftime('%Y-%m-%d')
                except Exception:
                    pass
            track_num = song.get('no')
            disc_num = song.get('cd')
            mv_id = song.get('mv')
            tracks.append((
                name,
                singers,
                album,
                duration_str,
                status_text,
                cover_url,
                tid_str,
                dt_ms,
                release_date,
                track_num if isinstance(track_num, int) and track_num > 0 else None,
                int(disc_num) if isinstance(disc_num, (int, str)) and str(disc_num).isdigit() and int(disc_num) > 0 else None,
                str(mv_id) if mv_id and str(mv_id) != "0" else None,
            ))

        playlist_cover = pl.get('coverImgUrl') or ''
        if playlist_cover and playlist_cover.startswith('http://'):
            playlist_cover = 'https://' + playlist_cover[7:]

        return title, tracks, author, playlist_cover
    except Exception as e:
        print(f"解析歌单异常: {e}")
        return None

def get_user_playlists(uid):
    url = f"https://music.163.com/api/user/playlist/?uid={uid}&limit=100&offset=0"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            return None
        data = resp.json()
        if data.get('code') != 200 or 'playlist' not in data:
            return None
        playlists = data['playlist']
        nickname = f"用户_{uid}"
        for p in playlists:
            if str(p.get('userId')) == str(uid) and p.get('creator', {}).get('nickname'):
                nickname = p['creator']['nickname']
                break

        res = []
        for p in playlists:
            res.append({
                "id": str(p.get('id')),
                "name": p.get('name', '未命名歌单'),
                "track_count": p.get('trackCount', 0),
                "is_created": str(p.get('userId')) == str(uid),
            })
        return nickname, res
    except Exception as e:
        print(f"获取用户歌单异常: {e}")
        return None

def export_xlsx(filename, playlist_title, tracks, author):
    import openpyxl
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "歌单歌曲"

    ws.append(["歌单名称", playlist_title])
    ws.append(["歌单作者", author])
    ws.append(["歌曲总数", f"{len(tracks)} 首"])
    ws.append([])

    headers = ["序号", "歌曲标题", "歌手", "专辑", "时长", "歌曲状态"]
    ws.append(headers)

    for i, t in enumerate(tracks, 1):
        ws.append([i, t[0], t[1], t[2], t[3], t[4]])

    ws.column_dimensions['A'].width = 8
    ws.column_dimensions['B'].width = 30
    ws.column_dimensions['C'].width = 25
    ws.column_dimensions['D'].width = 25
    ws.column_dimensions['E'].width = 12
    ws.column_dimensions['F'].width = 16

    wb.save(filename)

def export_csv(filename, tracks):
    with open(filename, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(["序号", "歌曲标题", "歌手", "专辑", "时长", "歌曲状态"])
        for i, t in enumerate(tracks, 1):
            writer.writerow([i, t[0], t[1], t[2], t[3], t[4]])

def export_json(filename, playlist_title, tracks, author, playlist_cover="", playlist_id=""):
    tracks_out = []
    for i, t in enumerate(tracks, 1):
        if isinstance(t, dict):
            name = t.get("title") or t.get("name") or ""
            singers = t.get("artist") or t.get("artists") or ""
            album = t.get("album") or ""
            duration_str = t.get("duration") or ""
            status_text = t.get("statusText") or t.get("status") or ""
            cover_url = t.get("coverUrl") or t.get("cover") or ""
            tid_str = t.get("id") or ""
            dt_ms = t.get("durationMs")
            release_date = t.get("releaseDate")
            track_num = t.get("trackNumber")
            disc_num = t.get("discNumber")
            mv_id = t.get("mvId")
        else:
            name = t[0] if len(t) > 0 else ""
            singers = t[1] if len(t) > 1 else ""
            album = t[2] if len(t) > 2 else ""
            duration_str = t[3] if len(t) > 3 else ""
            status_text = t[4] if len(t) > 4 else ""
            cover_url = t[5] if len(t) > 5 and t[5] else ""
            tid_str = t[6] if len(t) > 6 and t[6] else ""
            dt_ms = t[7] if len(t) > 7 and isinstance(t[7], (int, float)) and t[7] > 0 else None
            release_date = t[8] if len(t) > 8 and t[8] else None
            track_num = t[9] if len(t) > 9 and isinstance(t[9], int) and t[9] > 0 else None
            disc_num = t[10] if len(t) > 10 and isinstance(t[10], int) and t[10] > 0 else None
            mv_id = t[11] if len(t) > 11 and t[11] else None

        # Parse duration_str if dt_ms is missing
        if dt_ms is None and duration_str and ":" in str(duration_str):
            parts = str(duration_str).split(":")
            try:
                if len(parts) == 2:
                    dt_ms = (int(parts[0]) * 60 + int(parts[1])) * 1000
                elif len(parts) == 3:
                    dt_ms = (int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])) * 1000
            except ValueError:
                pass

        artist_str = str(singers).replace(" / ", ", ").strip() if singers else "未知歌手"
        album_str = str(album).strip() if album else ""

        is_vip = (status_text == "VIP专享")
        is_available = (status_text != "下架/无版权")
        if status_text == "下架/无版权":
            machine_status = "unplayable"
        elif status_text == "VIP专享":
            machine_status = "vip"
        elif status_text == "付费专辑":
            machine_status = "paid"
        else:
            machine_status = "playable"

        track_entry = {
            "index": i,
            "title": str(name).strip() if name else "未知歌曲",
            "artist": artist_str,
        }
        if album_str and album_str != "未知专辑":
            track_entry["album"] = album_str
        if tid_str:
            track_entry["id"] = str(tid_str).strip()
        if dt_ms is not None and dt_ms > 0:
            track_entry["durationMs"] = int(dt_ms)
        if release_date:
            track_entry["releaseDate"] = str(release_date).strip()
        if track_num:
            track_entry["trackNumber"] = int(track_num)
        if disc_num:
            track_entry["discNumber"] = int(disc_num)
        if tid_str:
            track_entry["sourceUrl"] = f"https://music.163.com/#/song?id={tid_str}"
        if cover_url and str(cover_url).strip():
            track_entry["coverUrl"] = str(cover_url).strip()
        track_entry["isVip"] = is_vip
        track_entry["isAvailable"] = is_available
        track_entry["status"] = machine_status
        track_entry["statusText"] = status_text or "正常"
        if mv_id:
            track_entry["mvId"] = str(mv_id).strip()
            track_entry["mvUrl"] = f"https://music.163.com/#/mv?id={mv_id}"

        tracks_out.append(track_entry)

    payload = {
        "name": playlist_title or "网易云音乐歌单",
    }
    if author and str(author).strip():
        payload["creator"] = str(author).strip()
    if playlist_cover and str(playlist_cover).strip():
        payload["coverUrl"] = str(playlist_cover).strip()
    payload["platform"] = "netease"
    if playlist_id and str(playlist_id).strip():
        payload["id"] = str(playlist_id).strip()
        payload["sourceUrl"] = f"https://music.163.com/#/playlist?id={playlist_id}"
    payload["trackCount"] = len(tracks_out)
    payload["tracks"] = tracks_out

    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

def export_txt(filename, playlist_title, tracks, author):
    with open(filename, 'w', encoding='utf-8') as f:
        f.write("==================================================\n")
        f.write(f"  歌单名称: {playlist_title}\n")
        f.write(f"  歌单作者: {author}\n")
        f.write(f"  歌曲总数: {len(tracks)} 首\n")
        f.write("==================================================\n\n")
        for i, t in enumerate(tracks, 1):
            name, singers, album, dur, status = t[:5]
            tag = f" [{status}]" if status != '正常' else ""
            f.write(f"{name} - {singers} - {album}{tag}\n")

def export_m3u8(filename, playlist_title, tracks, author):
    with open(filename, 'w', encoding='utf-8') as f:
        f.write("#EXTM3U\n")
        f.write(f"#PLAYLIST:{playlist_title}\n")
        for i, t in enumerate(tracks, 1):
            name, singers, album, dur, status = t[:5]
            sec = -1
            if dur and ":" in str(dur):
                parts = str(dur).split(":")
                try:
                    if len(parts) == 2:
                        sec = int(parts[0]) * 60 + int(parts[1])
                    elif len(parts) == 3:
                        sec = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
                except ValueError:
                    sec = -1
            disp = f"{singers} - {name}" if singers else name
            fn = sanitize_filename(disp)
            f.write(f"#EXTINF:{sec},{disp}\n")
            f.write(f"{fn}.mp3\n")

def open_folder(filepath):
    abs_path = os.path.abspath(filepath)
    if platform.system() == 'Windows':
        subprocess.run(['explorer', f'/select,{abs_path}'], shell=False)

def main():
    print("============ 网易云音乐歌单导出工具 ============")
    print("支持：歌单链接 / 歌单ID / 个人主页链接 / 用户UID（批量导出）/ 163cn.tv 短链")
    while True:
        user_input = input("\n请输入链接或 ID（输入 0 退出）：").strip()
        if not user_input or user_input in ('0', 'q', 'quit', 'exit'):
            break

        # Check if it's user profile
        user_id = extract_user_id(user_input)
        playlist_id = extract_playlist_id(user_input)

        if user_id and ('user' in user_input or '163cn.tv' in user_input) and not playlist_id:
            # Check user playlists
            user_data = get_user_playlists(user_id)
            if user_data:
                nickname, pls = user_data
                print(f"\n用户【{nickname}】共发现 {len(pls)} 个歌单：")
                created_pls = [p for p in pls if p['is_created']]
                sub_pls = [p for p in pls if not p['is_created']]
                print(f"  创建的歌单 ({len(created_pls)} 个):")
                for idx, p in enumerate(created_pls, 1):
                    print(f"    {idx}. {p['name']} ({p['track_count']}首) [ID: {p['id']}]")
                if sub_pls:
                    print(f"  收藏的歌单 ({len(sub_pls)} 个):")
                    for idx, p in enumerate(sub_pls, len(created_pls) + 1):
                        print(f"    {idx}. {p['name']} ({p['track_count']}首) [ID: {p['id']}]")

                sel = input("\n请选择要导出的歌单序号（或输入 all 导出所有，0 返回）：").strip()
                if sel == '0':
                    continue
                to_export = []
                if sel.lower() == 'all':
                    to_export = created_pls
                elif sel.isdigit() and 1 <= int(sel) <= len(pls):
                    to_export = [pls[int(sel) - 1]]

                for pl in to_export:
                    data = get_playlist_data(pl['id'])
                    if data:
                        t, trks, a = data[:3]
                        fname = f"{sanitize_filename(t)} - {sanitize_filename(a)}.xlsx"
                        export_xlsx(fname, t, trks, a)
                        print(f"✓ 已导出: {fname}")
                continue

        if playlist_id:
            print(f"正在抓取歌单 ID: {playlist_id} ...")
            data = get_playlist_data(playlist_id)
            if not data:
                print("❌ 获取歌单失败，请检查是否公开或 ID 是否正确。")
                continue
            title, tracks, author = data[:3]
            playlist_cover = data[3] if len(data) > 3 else ''
            unavail = sum(1 for t in tracks if t[4] == '下架/无版权')
            vip_cnt = sum(1 for t in tracks if t[4] == 'VIP专享')
            print(f"\n歌单：{title}（作者：{author}，共 {len(tracks)} 首）")
            print(f"状态统计：正常 {len(tracks)-unavail-vip_cnt} 首，下架/无版权 {unavail} 首，VIP专享 {vip_cnt} 首")

            print("\n请选择导出格式：\n 1) .xlsx (默认)\n 2) .json\n 3) .txt\n 4) .csv\n 5) .m3u8 (通用歌单)")
            choice = input("选择 (1-5): ").strip() or "1"
            base = f"{sanitize_filename(title)} - {sanitize_filename(author)}"

            if choice == "2":
                fn = f"{base}.json"
                export_json(fn, title, tracks, author, playlist_cover, playlist_id=str(playlist_id))
            elif choice == "3":
                fn = f"{base}.txt"
                export_txt(fn, title, tracks, author)
            elif choice == "4":
                fn = f"{base}.csv"
                export_csv(fn, tracks)
            elif choice == "5":
                fn = f"{base}.m3u8"
                export_m3u8(fn, title, tracks, author)
            else:
                fn = f"{base}.xlsx"
                export_xlsx(fn, title, tracks, author)

            print(f"✓ 成功保存为: {fn}")
            open_folder(fn)
        else:
            print("❌ 无法识别的输入，请输入网易云歌单链接、短链或 ID。")

if __name__ == '__main__':
    main()
