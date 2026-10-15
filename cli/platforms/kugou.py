# -*- coding: utf-8 -*-
"""
PlaylistOut Kugou Music Platform Adapter
========================================
Integrates Kugou Music (kugou.com) into the unified CLI.
Supports official special playlists, collection playlists, H5 share pages, and Cloudlists (with QR code auth).
"""

import sys
import json
import time
import hashlib
from typing import Optional, List
import requests

from .base import BasePlatformAdapter
from .registry import register_platform
from ..core.models import (
    NormalizedPlaylist,
    NormalizedTrack,
    UserPlaylistSummary,
    NormalizedUserPlaylists,
)

from cli.kugou.kugou_playlist_export import (
    extract_kugou_target,
    _fetch_kugou_playlist_by_target,
    interactive_login_menu,
    clear_auth_credentials,
    save_auth_credentials,
    load_auth_credentials,
    sign_kugou_gateway,
    KUGOU_LITE_APPID,
    KUGOU_LITE_CLIENTVER,
    KUGOU_LITE_SALT,
)


@register_platform
class KugouAdapter(BasePlatformAdapter):
    platform_id = "kugou"
    display_name = "酷狗音乐"
    description = "歌单链接 / 分享链接 / 登录后获取更多"
    aliases = ["kugou", "kg"]
    supports_user_playlists = True
    requires_user_auth = True

    def can_handle(self, text: str) -> bool:
        if not text:
            return False
        lower = text.lower()
        if "kugou.com" in lower:
            return True
        if "global_specialid=collection_" in lower or "gcid_" in lower or "src_cid=" in lower:
            return True
        return False

    def fetch_playlist(self, raw_input: str, **options) -> Optional[NormalizedPlaylist]:
        text = (raw_input or "").strip()
        target = extract_kugou_target(text)
        if not target:
            return None

        cli_token = options.get("token")
        cli_userid = options.get("userid")

        playlist_data = _fetch_kugou_playlist_by_target(
            target,
            cli_token=cli_token,
            cli_userid=cli_userid
        )
        if not playlist_data or not playlist_data.get("tracks"):
            return None

        tracks = []
        for i, t in enumerate(playlist_data.get("tracks", []), 1):
            is_avail = bool(t.get("is_available", True))
            is_vip = bool(t.get("is_vip", False))
            status_text = t.get("status_text", "正常")

            tracks.append(
                NormalizedTrack(
                    index=i,
                    title=t.get("title") or "未知歌曲",
                    artist=t.get("artist") or "未知歌手",
                    album=t.get("album") or "",
                    id=str(t.get("id") or ""),
                    cover_url=t.get("cover_url") or "",
                    duration_ms=t.get("duration_ms"),
                    duration_str=t.get("duration_str") or "",
                    release_date=t.get("release_date"),
                    is_available=is_avail,
                    is_vip=is_vip,
                    status="unplayable" if not is_avail else ("vip" if is_vip else "playable"),
                    status_text=status_text,
                    max_quality=t.get("max_quality"),
                    source_url=t.get("source_url"),
                )
            )

        return NormalizedPlaylist(
            platform=self.platform_id,
            id=str(playlist_data.get("id") or target.get("id") or ""),
            name=playlist_data.get("name") or "酷狗歌单",
            creator=playlist_data.get("creator") or "酷狗用户",
            cover_url=playlist_data.get("cover_url") or "",
            description=playlist_data.get("description") or "",
            source_url=playlist_data.get("source_url") or target.get("original_url") or "",
            tracks=tracks,
        )

    def fetch_user_playlists(self, user_target: str, **options) -> Optional[NormalizedUserPlaylists]:
        """抓取酷狗登录用户的自建云端歌单列表 (需要登录凭证)"""
        token = options.get("token")
        userid = options.get("userid")

        if not token or not userid:
            saved_token, saved_userid, _ = load_auth_credentials()
            if saved_token and saved_userid:
                token = token or saved_token
                userid = userid or saved_userid

        # 若外部指定了纯数字 UID，优先校对或使用
        target_uid = "".join(filter(str.isdigit, (user_target or "").strip()))
        if target_uid:
            if userid and str(userid) != str(target_uid):
                print(f"! 提示：当前登录凭证 (UserID: {userid}) 与目标输入 ({target_uid}) 不同，使用已登录凭证账号。", file=sys.stderr)
            elif not userid:
                userid = target_uid

        if not token or not userid:
            print("× 酷狗用户歌单需要登录凭证。请先运行 `python cli/main.py -p kugou --login` 或通过 `--token` 与 `--userid` 传入凭证。", file=sys.stderr)
            return None

        summaries = self._fetch_kugou_user_playlist_list(token=token, userid=str(userid))
        if summaries is None:
            return None

        uid_str = str(userid)
        nickname = f"酷狗用户_{uid_str[-4:]}" if len(uid_str) >= 4 else f"酷狗用户_{uid_str}"
        return NormalizedUserPlaylists(
            platform=self.platform_id,
            user_id=uid_str,
            nickname=nickname,
            playlists=summaries,
        )

    def _fetch_kugou_user_playlist_list(self, token: str, userid: str) -> Optional[List[UserPlaylistSummary]]:
        """调用酷狗网关 /v7/get_all_list 分页获取自建歌单列表"""
        page_size = 100
        page = 1
        raw_lists = []
        total_reported = None

        while page <= 10:
            clienttime = str(int(time.time()))
            mid = hashlib.md5(f"userlist_{clienttime}_{userid}_{page}".encode("utf-8")).hexdigest()

            post_data = {
                "userid": str(userid),
                "token": token,
                "total_ver": 979,
                "type": 2,
                "page": page,
                "pagesize": page_size,
            }
            data_str = json.dumps(post_data, separators=(",", ":"))

            query_params = {
                "dfid": "-",
                "mid": mid,
                "uuid": "-",
                "appid": KUGOU_LITE_APPID,
                "clientver": KUGOU_LITE_CLIENTVER,
                "clienttime": clienttime,
                "token": token,
                "userid": str(userid),
                "plat": "1",
            }
            query_params["signature"] = sign_kugou_gateway(query_params, data_str, salt=KUGOU_LITE_SALT)

            headers = {
                "User-Agent": "Android15-1070-11083-46-0-DiscoveryDRADProtocol-wifi",
                "Content-Type": "application/json",
                "x-router": "cloudlist.service.kugou.com",
                "dfid": "-",
                "clienttime": clienttime,
                "mid": mid,
                "kg-rc": "1",
                "kg-thash": "5d816a0",
                "kg-rec": "1",
                "kg-rf": "B9EDA08A64250DEFFBCADDEE00F8F25F",
            }

            try:
                resp = requests.post(
                    "https://gateway.kugou.com/v7/get_all_list",
                    params=query_params,
                    headers=headers,
                    data=data_str,
                    timeout=15,
                )
                if resp.status_code != 200:
                    break
                j = resp.json()
                if j.get("status") != 1:
                    break
                data = j.get("data") or {}
                info = data.get("info") or []
                if total_reported is None and data.get("total") is not None:
                    total_reported = int(data["total"])
                if not info:
                    break
                raw_lists.extend(info)
                if total_reported and len(raw_lists) >= total_reported:
                    break
                if len(info) < page_size:
                    break
                page += 1
            except Exception:
                break

        if not raw_lists and page == 1:
            return None

        # 过滤仅自建歌单（排查收藏歌单 type === 1）
        created_lists = []
        for item in raw_lists:
            if item.get("type") == 1:
                continue
            cid = item.get("list_create_userid")
            if cid is not None and str(cid) not in ("", "0") and str(cid) != str(userid):
                continue
            created_lists.append(item)

        summaries = []
        for item in created_lists:
            lid = str(item.get("listid") or "")
            if not lid:
                continue
            name = item.get("name") or ("我喜欢" if lid == "4" else f"酷狗歌单_{lid}")
            count = int(item.get("count") or item.get("total") or 0)
            summaries.append(
                UserPlaylistSummary(
                    id=lid,
                    name=name,
                    track_count=count,
                    source_url=f"https://m.kugou.com/songlist/?listid={lid}",
                    is_created=True,
                )
            )

        return summaries

    def handle_interactive(self, initial_input: Optional[str] = None, **options) -> bool:
        """支持酷狗独有的 login / logout 命令行与终端指令"""
        if initial_input and initial_input.lower() in ("login", "--login"):
            interactive_login_menu()
            return True
        if initial_input and initial_input.lower() in ("logout", "--logout"):
            clear_auth_credentials()
            print("✓ 酷狗登录凭证已清除。")
            return True
        return False
