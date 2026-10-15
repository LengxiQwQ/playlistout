# -*- coding: utf-8 -*-
"""
PlaylistOut Kugou Music Platform Adapter
========================================
Integrates Kugou Music (kugou.com) into the unified CLI.
Supports official special playlists, collection playlists, H5 share pages, and Cloudlists (with QR code auth).
"""

import os
import sys
import json
import time
import hashlib
from typing import Optional, List, Tuple
import requests

from .base import BasePlatformAdapter
from .registry import register_platform
from ..core.models import (
    NormalizedPlaylist,
    NormalizedTrack,
    UserPlaylistSummary,
    NormalizedUserPlaylists,
)
from ..core.ui import (
    print_title,
    prompt_input,
)

from cli.kugou.kugou_playlist_export import (
    extract_kugou_target,
    _fetch_kugou_playlist_by_target,
    run_qr_login_flow,
)

# ----------------- 常量与加解密参数 -----------------
KUGOU_LITE_APPID = "3116"
KUGOU_LITE_CLIENTVER = "11440"
KUGOU_LITE_SALT = "LnT6xpN3khm36zse0QzvmgTZ3waWdRSA"

# 酷狗 RSA 模数 (1024-bit) 与公钥指数，用于加密 usercenter token
KUGOU_LITE_RSA_MODULUS = int(
    "0xc40a2d0da76511f3bb1cc2bbd3afbd8bea83b4d6b05b6c13eb8920c53f1af767"
    "9b32ba0d0edb843240ef1b836efed3ee240734c14c1399fd6594d16af22f52525d"
    "14d72e0155c6dcc8638d4f7bb94f3a0b1f4c29f991972f2a160a25eb0a9e724336"
    "be7f69bbd319ffab1c6dd8470b021dc434f3faba89f4a2a01b33bdbdd08b",
    16,
)
KUGOU_RSA_EXPONENT = 65537

DEFAULT_AUTH_DIR = os.path.expanduser("~/.playlistout")
DEFAULT_AUTH_FILE = os.path.join(DEFAULT_AUTH_DIR, "kugou_auth.json")
LOCAL_AUTH_FILE = os.path.abspath(".kugou_auth.json")


def sign_kugou_gateway(params: dict, data_str: str = "", salt: str = KUGOU_LITE_SALT) -> str:
    """酷狗网关（Cloudlist / UserCenter 等）接口签名算法"""
    pairs = "".join(f"{k}={params[k]}" for k in sorted(params.keys()))
    return hashlib.md5((salt + pairs + data_str + salt).encode("utf-8")).hexdigest()


def encrypt_kugou_lite_rsa(payload: dict) -> str:
    """使用酷狗 Android Lite 公钥加密 JSON payload (纯原生 1024-bit raw RSA，零外部依赖)"""
    text = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    padded = text.ljust(128, b"\x00")
    val = int.from_bytes(padded, byteorder="big")
    enc = pow(val, KUGOU_RSA_EXPONENT, KUGOU_LITE_RSA_MODULUS)
    return f"{enc:0256x}".upper()


# ----------------- 凭证存储与管理 -----------------

def get_auth_file_path() -> str:
    """获取凭证存储路径，优先本地，否则默认用户主目录"""
    if os.path.exists(LOCAL_AUTH_FILE):
        return LOCAL_AUTH_FILE
    return DEFAULT_AUTH_FILE


def load_auth_credentials() -> Tuple[Optional[str], Optional[str], dict]:
    """读取已保存的酷狗凭证，返回 (token, userid, data)"""
    for p in [LOCAL_AUTH_FILE, DEFAULT_AUTH_FILE]:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    token = (data.get("token") or "").strip()
                    userid = str(data.get("userid") or "").strip()
                    if token and userid:
                        return token, userid, data
            except Exception:
                pass
    return None, None, {}


def save_auth_credentials(token: str, userid: str, source: str = "manual", nickname: str = "") -> Optional[str]:
    """持久化保存酷狗凭证到本地配置文件"""
    target_path = DEFAULT_AUTH_FILE
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    payload = {
        "token": str(token).strip(),
        "userid": str(userid).strip(),
        "nickname": str(nickname).strip() if nickname else "",
        "source": source,
        "updated_at": int(time.time()),
    }
    try:
        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        return target_path
    except Exception as e:
        print(f"⚠️ 保存凭证文件失败: {e}", file=sys.stderr)
        return None


def clear_auth_credentials() -> bool:
    """清除本地保存的凭证文件"""
    removed = False
    for p in [LOCAL_AUTH_FILE, DEFAULT_AUTH_FILE]:
        if os.path.exists(p):
            try:
                os.remove(p)
                removed = True
            except Exception:
                pass
    return removed


def verify_kugou_credentials(token: str, userid: str, timeout: int = 10) -> Tuple[bool, str, dict]:
    """
    向酷狗官方接口在线校验凭据有效性，并获取用户的真实昵称与自建歌单统计。

    返回: (is_valid: bool, error_msg: str, user_info: dict)
    user_info 包含:
      - "userid": str
      - "nickname": str
      - "playlist_count": Optional[int]
    """
    token = (token or "").strip()
    userid = (userid or "").strip()

    if not userid:
        return False, "UserID 不能为空", {}
    if not userid.isdigit():
        return False, "UserID 必须为纯数字（例如: 12345678）", {}
    if not token:
        return False, "Token 不能为空", {}
    if len(token) != 32 or not all(c in "0123456789abcdefABCDEF" for c in token):
        return False, "Token 格式不正确（应为 32 位十六进制字符串）", {}

    clienttime = str(int(time.time()))
    mid = hashlib.md5(f"verify_profile_{clienttime}_{userid}".encode("utf-8")).hexdigest()

    # 1. 向官方个人中心发起探测获取资料与名字 (带原生 RSA 加密)
    rsa_payload = {"token": token, "clienttime": int(clienttime)}
    post_data = {
        "visit_time": int(clienttime),
        "usertype": 1,
        "p": encrypt_kugou_lite_rsa(rsa_payload),
        "userid": int(userid),
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
        "userid": userid,
        "plat": "1",
    }
    query_params["signature"] = sign_kugou_gateway(query_params, data_str, salt=KUGOU_LITE_SALT)

    headers = {
        "User-Agent": "Android15-1070-11083-46-0-DiscoveryDRADProtocol-wifi",
        "Content-Type": "application/json",
        "x-router": "usercenter.kugou.com",
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
            "https://gateway.kugou.com/v3/get_my_info",
            params=query_params,
            headers=headers,
            data=data_str,
            timeout=timeout,
        )
        if resp.status_code != 200:
            return False, f"酷狗网关响应异常 (HTTP {resp.status_code})", {}

        res_json = resp.json()
        if res_json.get("status") != 1:
            code = res_json.get("error_code")
            msg = res_json.get("error") or res_json.get("msg") or "Token 无效或已过期"
            return False, f"{msg} (错误码: {code})", {}

        raw_info = (res_json.get("data") or {}).get("info") or {}
        nickname = (
            raw_info.get("nickname")
            or raw_info.get("username")
            or (f"酷狗用户_{userid[-4:]}" if len(userid) >= 4 else f"酷狗用户_{userid}")
        )

        # 2. 轻量探测歌单数量 (获取自建歌单数量)
        playlist_count = None
        try:
            mid_list = hashlib.md5(f"verify_list_{clienttime}_{userid}".encode("utf-8")).hexdigest()
            pl_post = {"userid": userid, "token": token, "total_ver": 979, "type": 2, "page": 1, "pagesize": 1}
            pl_data = json.dumps(pl_post, separators=(",", ":"))
            pl_query = dict(query_params)
            pl_query["mid"] = mid_list
            pl_query["signature"] = sign_kugou_gateway(pl_query, pl_data, salt=KUGOU_LITE_SALT)
            pl_headers = dict(headers)
            pl_headers["x-router"] = "cloudlist.service.kugou.com"
            pl_headers["mid"] = mid_list

            pl_resp = requests.post(
                "https://gateway.kugou.com/v7/get_all_list",
                params=pl_query,
                headers=pl_headers,
                data=pl_data,
                timeout=5,
            )
            if pl_resp.status_code == 200:
                pl_json = pl_resp.json()
                if pl_json.get("status") == 1:
                    total_val = (pl_json.get("data") or {}).get("total")
                    if total_val is not None:
                        playlist_count = int(total_val)
        except Exception:
            pass  # 歌单数量仅为附属信息，不影响核心验活结论

        return True, "", {
            "userid": userid,
            "nickname": nickname,
            "playlist_count": playlist_count,
        }

    except requests.exceptions.Timeout:
        return False, "连接酷狗服务器超时，未能完成在线验活", {}
    except Exception as e:
        return False, f"网络请求异常: {e}", {}


# ----------------- 交互式登录流程 -----------------

def run_manual_login_flow() -> Tuple[Optional[str], Optional[str]]:
    """手动输入凭证流程：格式初筛、官方验活、获取真实名字并持久化"""
    print_title("手动输入凭证", "请输入酷狗账号的 UserID 与 Token（输入 0 返回）：", emoji="🔑")
    print("")

    try:
        userid_raw = prompt_input("请输入酷狗 UserID (纯数字)")
        if not userid_raw or userid_raw.lower() in ("0", "q", "quit", "exit"):
            print("已取消输入。\n")
            return None, None

        token_raw = prompt_input("请输入酷狗 Token (32位十六进制字符串)")
        if not token_raw or token_raw.lower() in ("0", "q", "quit", "exit"):
            print("已取消输入。\n")
            return None, None

        userid = userid_raw.strip()
        token = token_raw.strip()

        # 格式预检
        if not userid.isdigit():
            print("❌ UserID 格式错误：必须为纯数字（例如: 12345678）。\n")
            return None, None
        if len(token) != 32 or not all(c in "0123456789abcdefABCDEF" for c in token):
            print("❌ Token 格式错误：必须为 32 位十六进制字符串。\n")
            return None, None

        print("🚀 正在向酷狗官方接口验证凭证有效性，请稍候...")
        is_valid, err_msg, user_info = verify_kugou_credentials(token, userid)

        if is_valid:
            nickname = user_info.get("nickname") or f"酷狗用户_{userid}"
            pl_cnt = user_info.get("playlist_count")

            print(f"\n✅ 凭证校验成功！已连接账号：{nickname} (UserID: {userid})")
            if pl_cnt is not None:
                print(f"   检测到该账号下共有 {pl_cnt} 个自建歌单")

            auth_path = save_auth_credentials(token, userid, source="manual", nickname=nickname)
            if auth_path:
                print(f"📁 登录凭证已安全保存至: {auth_path}\n")
            return token, userid
        else:
            print(f"\n❌ 凭证校验失败：{err_msg}")
            print("💡 提示：凭证未保存。请检查输入的 UserID 与 Token 是否匹配且为最新凭证。\n")
            return None, None

    except (KeyboardInterrupt, EOFError):
        print("\n已取消输入。\n")
        return None, None


def interactive_login_menu():
    """交互式登录菜单：提供状态展示、扫码登录、手动输入、验活与注销"""
    while True:
        token, userid, cred_data = load_auth_credentials()
        has_saved = bool(token and userid)

        if has_saved:
            nick = cred_data.get("nickname") or (f"酷狗用户_{userid[-4:]}" if len(userid) >= 4 else f"酷狗用户_{userid}")
            subtitle = f"当前已连接账号：{nick} (UserID: {userid})"
        else:
            subtitle = "普通公开歌单无需登录，导出个人自建歌单与「我喜欢」需验证账号。"

        print_title("酷狗音乐登录", subtitle, emoji="🔐")
        print("")
        if has_saved:
            print("  1  重新扫码登录")
            print("  2  手动输入 UserID 和 Token")
            print("  3  验证当前凭证有效性")
            print("  4  退出登录并清除凭证")
        else:
            print("  1  扫码登录")
            print("  2  手动输入 UserID 和 Token")
        print("  0  返回")
        print("")

        choice = prompt_input("选择操作" if has_saved else "选择登录方式")
        if not choice or choice in ("0", "q", "quit", "exit"):
            break

        if choice == "1":
            res = run_qr_login_flow()
            if res and isinstance(res, tuple) and len(res) == 2 and res[0] and res[1]:
                qr_token, qr_userid = res
                # 扫码成功后也执行一次资料丰富与真实昵称捕获
                _, _, qr_info = verify_kugou_credentials(qr_token, qr_userid)
                qr_nick = qr_info.get("nickname") or f"酷狗用户_{qr_userid}"
                save_auth_credentials(qr_token, qr_userid, source="qr", nickname=qr_nick)
                print(f"\n✅ 酷狗账号登录成功！已连接账号：{qr_nick} (UserID: {qr_userid})\n")
                break
        elif choice == "2":
            t, u = run_manual_login_flow()
            if t and u:
                break
        elif choice == "3" and has_saved:
            print("🚀 正在验证当前凭证有效性，请稍候...")
            is_valid, err_msg, info = verify_kugou_credentials(token, userid)
            if is_valid:
                nick = info.get("nickname") or f"酷狗用户_{userid}"
                pl_cnt = info.get("playlist_count")
                print(f"\n✅ 凭证有效！当前账号：{nick} (UserID: {userid})")
                if pl_cnt is not None:
                    print(f"   检测到该账号下共有 {pl_cnt} 个自建歌单")
                save_auth_credentials(token, userid, source=cred_data.get("source", "saved"), nickname=nick)
                print("")
            else:
                print(f"\n❌ 当前凭证已失效：{err_msg}")
                print("💡 建议：您可以选择重新扫码或手动输入更新凭证。\n")
        elif choice == "4" and has_saved:
            clear_auth_credentials()
            print("✅ 酷狗登录凭证已清除。\n")
        else:
            print("⚠️ 请输入有效选项。\n")


# ----------------- KugouAdapter -----------------

@register_platform
class KugouAdapter(BasePlatformAdapter):
    platform_id = "kugou"
    display_name = "酷狗音乐"
    description = "歌单链接 / 分享短链 / 歌单 ID (普通版需登录，概念版免登全量)"
    aliases = ["kugou", "kg"]
    supports_playlist = True
    supports_user_playlists = True
    requires_user_auth = True
    supported_channels = ()

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

        track_count = playlist_data.get("track_count")
        loaded_count = len(tracks)
        is_partial = bool(playlist_data.get("is_partial")) or bool(track_count and loaded_count < track_count)

        return NormalizedPlaylist(
            platform=self.platform_id,
            id=str(playlist_data.get("id") or target.get("id") or ""),
            name=playlist_data.get("name") or "酷狗歌单",
            creator=playlist_data.get("creator") or "酷狗用户",
            cover_url=playlist_data.get("cover_url") or "",
            description=playlist_data.get("description") or "",
            source_url=playlist_data.get("source_url") or target.get("original_url") or "",
            track_count=track_count,
            create_time=playlist_data.get("create_time"),
            update_time=playlist_data.get("update_time"),
            play_count=playlist_data.get("play_count"),
            tags=playlist_data.get("tags") or [],
            is_partial=is_partial,
            tracks=tracks,
        )

    def fetch_user_playlists(self, user_target: str, **options) -> Optional[NormalizedUserPlaylists]:
        """抓取酷狗登录用户的自建云端歌单列表 (需要登录凭证)"""
        token = options.get("token")
        userid = options.get("userid")

        saved_nickname = None
        if not token or not userid:
            saved_token, saved_userid, saved_data = load_auth_credentials()
            if saved_token and saved_userid:
                token = token or saved_token
                userid = userid or saved_userid
                saved_nickname = saved_data.get("nickname")

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
        nickname = saved_nickname or (f"酷狗用户_{uid_str[-4:]}" if len(uid_str) >= 4 else f"酷狗用户_{uid_str}")
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
            print("✅ 酷狗登录凭证已清除。\n")
            return True
        return False
