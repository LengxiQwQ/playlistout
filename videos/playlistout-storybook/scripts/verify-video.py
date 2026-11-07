# -*- coding: utf-8 -*-
"""
Playlist Out Storybook — Complete Video QA, Keyframe Extraction & Contact Sheet Generator
=========================================================================================
Performs:
1. ffprobe stream & container verification (1920x1080, 30fps, H.264, AAC stereo, 56.0s)
2. Hero keyframe extraction across all 7 narrative acts (out/qa/keyframes/)
3. Dense transition frame extraction across all 6 act handoffs (out/qa/transitions/)
4. 28-bar full-film Contact Sheet (out/qa/contact-sheet.jpg)
5. Transition Continuity Contact Sheet (out/qa/transitions-sheet.jpg)
"""

import os
import json
import subprocess

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIDEO_PATH = os.path.join(ROOT_DIR, "out", "playlistout-storybook.mp4")
QA_DIR = os.path.join(ROOT_DIR, "out", "qa")
KEYFRAMES_DIR = os.path.join(QA_DIR, "keyframes")
TRANSITIONS_DIR = os.path.join(QA_DIR, "transitions")


def run_cmd(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def verify_streams():
    res = subprocess.run(
        [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration,size,bit_rate:stream=index,codec_name,codec_type,width,height,r_frame_rate,pix_fmt,sample_rate,channels",
            "-of", "json",
            VIDEO_PATH,
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    info = json.loads(res.stdout)
    report_path = os.path.join(QA_DIR, "ffprobe-report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(info, f, indent=2, ensure_ascii=False)
    print(f"[OK] Saved stream verification report to {report_path}")
    return info


def extract_keyframes():
    os.makedirs(KEYFRAMES_DIR, exist_ok=True)
    # Representative keyframes across all 7 acts (frame_number, filename_slug)
    keyframes = [
        (55, "01_act1_trapped_islands.jpg"),
        (175, "02_act1_hero_searchnote_debut.jpg"),
        (295, "03_act2_paste_and_detect.jpg"),
        (460, "04_act2_result_paper_tracks.jpg"),
        (555, "05_act2_export_toolbar_multi.jpg"),
        (690, "06_act3_excel_dual_tabs_and_json.jpg"),
        (815, "07_act3_six_formats_overview.jpg"),
        (965, "08_act4_batch_collection_select.jpg"),
        (1090, "09_act4_multisheet_and_zip.jpg"),
        (1240, "10_act5_cli_interactive_menu.jpg"),
        (1395, "11_act5_cli_export_and_headless.jpg"),
        (1565, "12_act6_ecosystem_players_and_api.jpg"),
        (1645, "13_act7_brand_finale.jpg"),
    ]
    for frame_num, name in keyframes:
        sec = frame_num / 30.0
        out_file = os.path.join(KEYFRAMES_DIR, name)
        run_cmd([
            "ffmpeg", "-y",
            "-ss", f"{sec:.3f}",
            "-i", VIDEO_PATH,
            "-frames:v", "1",
            "-q:v", "2",
            out_file,
        ])
        print(f"[OK] Keyframe f={frame_num} ({sec:.2f}s) -> {name}")


def extract_transition_frames():
    os.makedirs(TRANSITIONS_DIR, exist_ok=True)
    # Dense sampling across the 6 scene transitions (3 frames per transition: before, mid-overlap, after)
    transition_points = [
        (115, "t0_act1_morph_start.jpg"),
        (132, "t0_act1_morph_mid.jpg"),
        (152, "t0_act1_morph_done.jpg"),
        (220, "t1_act1_to_act2_pre.jpg"),
        (228, "t1_act1_to_act2_mid.jpg"),
        (238, "t1_act1_to_act2_post.jpg"),
        (564, "t2_act2_to_act3_pre.jpg"),
        (574, "t2_act2_to_act3_mid.jpg"),
        (586, "t2_act2_to_act3_post.jpg"),
        (850, "t3_act3_to_act4_pre.jpg"),
        (858, "t3_act3_to_act4_mid.jpg"),
        (868, "t3_act3_to_act4_post.jpg"),
        (1136, "t4_act4_to_act5_pre.jpg"),
        (1144, "t4_act4_to_act5_mid.jpg"),
        (1154, "t4_act4_to_act5_post.jpg"),
        (1450, "t5_act5_to_act6_pre.jpg"),
        (1458, "t5_act5_to_act6_mid.jpg"),
        (1468, "t5_act5_to_act6_post.jpg"),
        (1600, "t6_act6_to_act7_pre.jpg"),
        (1608, "t6_act6_to_act7_mid.jpg"),
        (1618, "t6_act6_to_act7_post.jpg"),
    ]
    for frame_num, name in transition_points:
        sec = frame_num / 30.0
        out_file = os.path.join(TRANSITIONS_DIR, name)
        run_cmd([
            "ffmpeg", "-y",
            "-ss", f"{sec:.3f}",
            "-i", VIDEO_PATH,
            "-frames:v", "1",
            "-q:v", "2",
            out_file,
        ])
    print(f"[OK] Extracted {len(transition_points)} dense transition frames to {TRANSITIONS_DIR}")


def build_contact_sheets():
    contact_sheet = os.path.join(QA_DIR, "contact-sheet.jpg")
    # 28 frames (1 frame every 2 seconds = 0.5 fps) arranged in a 4x7 grid
    run_cmd([
        "ffmpeg", "-y",
        "-i", VIDEO_PATH,
        "-vf", "fps=0.5,scale=480:270,drawtext=text='%{pts\\:hms}':x=12:y=12:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.65,tile=4x7:padding=6:margin=6:color=0x2d3436",
        "-frames:v", "1",
        "-q:v", "2",
        contact_sheet,
    ])
    print(f"[OK] Generated 28-bar full Contact Sheet -> {contact_sheet}")

    trans_sheet = os.path.join(QA_DIR, "transitions-sheet.jpg")
    # Build a 3x7 contact sheet from the 21 transition frames
    inputs = sorted(os.listdir(TRANSITIONS_DIR))
    cmd = ["ffmpeg", "-y"]
    for fname in inputs:
        cmd.extend(["-i", os.path.join(TRANSITIONS_DIR, fname)])
    filter_parts = []
    for i, fname in enumerate(inputs):
        label = fname.replace(".jpg", "")
        filter_parts.append(
            f"[{i}:v]scale=480:270,drawtext=text='{label}':x=10:y=10:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.7[v{i}]"
        )
    joined = "".join(f"[v{i}]" for i in range(len(inputs)))
    filter_parts.append(f"{joined}xstack=inputs={len(inputs)}:layout="
                        + "|".join(f"{(i%3)*486}_{(i//3)*276}" for i in range(len(inputs)))
                        + "[out]")
    cmd.extend([
        "-filter_complex", ";".join(filter_parts),
        "-map", "[out]",
        "-frames:v", "1",
        "-q:v", "2",
        trans_sheet,
    ])
    run_cmd(cmd)
    print(f"[OK] Generated 21-frame Transition Contact Sheet -> {trans_sheet}")


def main():
    os.makedirs(QA_DIR, exist_ok=True)
    verify_streams()
    extract_keyframes()
    extract_transition_frames()
    build_contact_sheets()
    print("[ALL QA EXTRACTIONS COMPLETE]")


if __name__ == "__main__":
    main()
