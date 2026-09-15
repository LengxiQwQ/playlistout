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
    m = re.search(r'https?://163cn\.tv/[a-zA-Z0-9]+', text)
    if m:
        try:
            resp = requests.get(m.group(0), headers=HEADERS, allow_redirects=True, timeout=10)
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
    all_songs = []
    all_privileges = []
    batch_size = 500

    for i in range(0, len(track_ids), batch_size):
        chunk = track_ids[i:i + batch_size]
        c_param = json.dumps([{"id": int(cid)} for cid in chunk])
        url = 'https://music.163.com/api/v3/song/detail'
        try:
            resp = requests.post(url, headers=HEADERS, data={'c': c_param}, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                all_songs.extend(data.get('songs', []))
                all_privileges.extend(data.get('privileges', []))
        except Exception as e:
            print(f"获取歌曲详情批次失败: {e}")

    return all_songs, all_privileges

def get_playlist_data(playlist_id):
    url = f"https://music.163.com/api/v6/playlist/detail?id={playlist_id}"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            return None
        data = resp.json()
        if data.get('code') != 200 or not data.get('playlist'):
            return None
        pl = data['playlist']
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
            tracks.append((name, singers, album, duration_str, status_text))

        return title, tracks, author
    except Exception as e:
        print(f"抓取歌单异常: {e}")
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

    for i, (name, singers, album, dur, status) in enumerate(tracks, 1):
        ws.append([i, name, singers, album, dur, status])

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
        for i, (name, singers, album, dur, status) in enumerate(tracks, 1):
            writer.writerow([i, name, singers, album, dur, status])

def export_json(filename, playlist_title, tracks, author):
    payload = {
        "name": playlist_title,
        "author": author,
        "trackCount": len(tracks),
        "tracks": [
            {
                "index": i,
                "title": name,
                "artists": singers,
                "album": album,
                "duration": dur,
                "status": status,
                "isAvailable": status != '下架/无版权',
            }
            for i, (name, singers, album, dur, status) in enumerate(tracks, 1)
        ],
    }
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

def export_txt(filename, playlist_title, tracks, author):
    with open(filename, 'w', encoding='utf-8') as f:
        f.write("==================================================\n")
        f.write(f"  歌单名称: {playlist_title}\n")
        f.write(f"  歌单作者: {author}\n")
        f.write(f"  歌曲总数: {len(tracks)} 首\n")
        f.write("==================================================\n\n")
        for i, (name, singers, album, dur, status) in enumerate(tracks, 1):
            tag = f" [{status}]" if status != '正常' else ""
            f.write(f"{name} - {singers} - {album}{tag}\n")

def open_folder(filepath):
    abs_path = os.path.abspath(filepath)
    if platform.system() == 'Windows':
        subprocess.run(f'explorer /select,"{abs_path}"', shell=True)

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

        if user_id and ('user' in user_input or '163cn.tv' in user_input):
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
                        t, trks, a = data
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
            title, tracks, author = data
            unavail = sum(1 for t in tracks if t[4] == '下架/无版权')
            vip_cnt = sum(1 for t in tracks if t[4] == 'VIP专享')
            print(f"\n歌单：{title}（作者：{author}，共 {len(tracks)} 首）")
            print(f"状态统计：正常 {len(tracks)-unavail-vip_cnt} 首，下架/无版权 {unavail} 首，VIP专享 {vip_cnt} 首")

            print("\n请选择导出格式：\n 1) .xlsx (默认)\n 2) .csv\n 3) .json\n 4) .txt")
            choice = input("选择 (1-4): ").strip() or "1"
            base = f"{sanitize_filename(title)} - {sanitize_filename(author)}"

            if choice == "2":
                fn = f"{base}.csv"
                export_csv(fn, tracks)
            elif choice == "3":
                fn = f"{base}.json"
                export_json(fn, title, tracks, author)
            elif choice == "4":
                fn = f"{base}.txt"
                export_txt(fn, title, tracks, author)
            else:
                fn = f"{base}.xlsx"
                export_xlsx(fn, title, tracks, author)

            print(f"✓ 成功保存为: {fn}")
            open_folder(fn)
        else:
            print("❌ 无法识别的输入，请输入网易云歌单链接、短链或 ID。")

if __name__ == '__main__':
    main()
