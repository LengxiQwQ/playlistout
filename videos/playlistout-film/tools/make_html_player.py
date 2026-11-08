import subprocess
import base64
from pathlib import Path

brain = Path(r"C:\Users\LengxiQwQ\.gemini\antigravity\brain\d7fbfafb-6315-4dc3-b2c6-d63bbdf76c92")

b64_music = (brain / "b64_music.txt").read_text(encoding="utf-8")
b64_full = (brain / "b64_full.txt").read_text(encoding="utf-8")
b64_curr = (brain / "b64_curr.txt").read_text(encoding="utf-8")

html_content = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PlaylistOut 动感 BGM 选型中心（对标 premiere 原版）</title>
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
  <style>
    .cutout-shadow {{
      box-shadow: 4px 5px 0 0 #2d3436;
    }}
    .cutout-shadow-lg {{
      box-shadow: 6px 8px 0 0 #2d3436;
    }}
    .cutout-shadow-sm {{
      box-shadow: 2px 3px 0 0 #2d3436;
    }}
    audio {{
      width: 100%;
      height: 48px;
      border-radius: 12px;
      outline: none;
    }}
    audio::-webkit-media-controls-panel {{
      background-color: #faf5e8;
    }}
  </style>
</head>
<body class="bg-[#faf6ed] text-[#2d3436] font-sans antialiased p-4 md:p-8 min-h-screen">

  <div class="max-w-5xl mx-auto space-y-6">

    <!-- Header -->
    <header class="bg-[#fffdfa] border-4 border-[#2d3436] rounded-2xl p-6 md:p-8 cutout-shadow-lg relative overflow-hidden">
      <div class="absolute -right-6 -bottom-6 w-36 h-36 bg-[#fff4a3] rounded-full opacity-60 pointer-events-none"></div>
      <div class="absolute right-24 -top-8 w-24 h-24 bg-[#dff6ec] rounded-full opacity-70 pointer-events-none"></div>

      <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fde6ee] border-2 border-[#2d3436] text-xs font-bold text-[#a63e5b] mb-3">
            <span>🔥 动感原声重现 · 内置全量 Base64 纯离线音频</span>
            <span>·</span>
            <span>无需外链 · 100% 保证直接出声</span>
          </div>
          <h1 class="text-2xl md:text-3xl font-black tracking-tight text-[#2d3436] flex items-center gap-3">
            <span>⚡ PlaylistOut 动感 BGM 选型中心</span>
          </h1>
          <p class="text-sm md:text-base text-[#4e585b] font-medium mt-2 max-w-2xl">
            当年 <code class="px-1.5 py-0.5 bg-[#faf5e8] border border-[#dfd5c3] rounded font-mono text-xs font-bold">playlistout-premiere</code> 之所以动感，在于<strong>四踩浩室舞曲大鼓（Four-on-the-Floor）+ 放克贝斯（Slap/Walking Bass）+ 16分音符踩镲 + 多轨击掌</strong>。以下音频已直接转为内嵌 Base64 数据流，点击原生播放器直接出声！
          </p>
        </div>

        <div class="bg-[#fffbe0] border-2 border-dashed border-[#2d3436] rounded-xl p-4 flex flex-col items-center justify-center text-center shrink-0">
          <span class="text-xs font-bold text-[#9e7012]">动感实测数据</span>
          <div class="flex items-center gap-2 mt-1.5 font-mono text-xs font-black">
            <span class="text-[#266b4e] bg-[#dff6ec] px-2 py-0.5 rounded border border-[#266b4e]">原版 RMS: 0.157</span>
            <span class="text-[#a63e5b] bg-[#fde6ee] px-2 py-0.5 rounded border border-[#a63e5b]">当前 RMS: 0.095</span>
          </div>
          <span class="text-[11px] text-[#737d80] mt-1">原版动感能量高出 65%！</span>
        </div>
      </div>
    </header>

    <!-- SECTION 1: 3 REAL EMBEDDED AUDIO PLAYERS -->
    <div class="bg-[#fffdfa] border-4 border-[#2d3436] rounded-2xl p-6 cutout-shadow-lg space-y-5">
      <div class="flex items-center justify-between border-b-2 border-dashed border-[#dfd5c3] pb-3">
        <div>
          <h2 class="text-lg md:text-xl font-black text-[#2d3436] flex items-center gap-2">
            <span>🎧 原声对比试听（点击下方播放条的 ▶ 播放按键直接出声）</span>
          </h2>
          <p class="text-xs text-[#737d80] mt-0.5">音频已 100% 嵌在当前页面内，无网络或沙盒限制</p>
        </div>
      </div>

      <div class="space-y-4">

        <!-- Track 1: 当年 premiere 纯音乐伴奏 (极力推荐试听) -->
        <div class="bg-[#dff6ec] border-3 border-[#2d3436] rounded-xl p-4 cutout-shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="max-w-md">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-black px-2 py-0.5 rounded bg-[#266b4e] text-white">
                ★ 极力推荐
              </span>
              <span class="font-black text-base text-[#2d3436]">① 当年 premiere · 纯放克音乐伴奏</span>
            </div>
            <p class="text-xs text-[#266b4e] font-bold">
              没有音效遮挡，可最清晰感受 120 BPM 四踩大鼓、走底贝斯切分音与手摇铃的动感推力！
            </p>
          </div>

          <div class="w-full md:w-80 flex flex-col gap-1.5 shrink-0">
            <audio id="audio-p-music" controls preload="auto">
              <source src="{b64_music}" type="audio/mpeg">
            </audio>
            <div class="flex items-center justify-between text-[11px] text-[#266b4e] font-mono font-bold px-1">
              <span>56.0秒 · 纯音乐伴奏</span>
              <button onclick="selectPlan('方案01：Premiere Funk Pop 原版动感 58s 重混')" class="hover:underline font-bold text-[#2d3436]">
                ✓ 选用此版混音
              </button>
            </div>
          </div>
        </div>

        <!-- Track 2: 当年 premiere 完整原声带 (带音效) -->
        <div class="bg-[#fff8bd] border-3 border-[#2d3436] rounded-xl p-4 cutout-shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="max-w-md">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-black px-2 py-0.5 rounded bg-[#9e7012] text-white">
                完整版
              </span>
              <span class="font-black text-base text-[#2d3436]">② 当年 premiere · 完整原声带 (带音效)</span>
            </div>
            <p class="text-xs text-[#9e7012] font-bold">
              包含开笼锁、翻页、音符掉落、CLI 终端浩室电音加速脉冲及欢呼声的完整总线混音。
            </p>
          </div>

          <div class="w-full md:w-80 flex flex-col gap-1.5 shrink-0">
            <audio id="audio-p-full" controls preload="auto">
              <source src="{b64_full}" type="audio/mpeg">
            </audio>
            <div class="flex items-center justify-between text-[11px] text-[#9e7012] font-mono font-bold px-1">
              <span>56.0秒 · 完整音效</span>
              <button onclick="selectPlan('方案01：Premiere Funk Pop 原版动感 58s 重混')" class="hover:underline font-bold text-[#2d3436]">
                ✓ 选用此版混音
              </button>
            </div>
          </div>
        </div>

        <!-- Track 3: 当前 film 现用音轨 (对比用) -->
        <div class="bg-[#fde6ee] border-3 border-[#2d3436] rounded-xl p-4 cutout-shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="max-w-md">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-black px-2 py-0.5 rounded bg-[#a63e5b] text-white">
                当前版本
              </span>
              <span class="font-black text-base text-[#2d3436]">③ playlistout-film (当前使用音轨)</span>
            </div>
            <p class="text-xs text-[#a63e5b] font-bold">
              对比即可发现：当前版本底鼓偏软偏轻，缺乏四踩提速，整体听起来较为单调平淡。
            </p>
          </div>

          <div class="w-full md:w-80 flex flex-col gap-1.5 shrink-0">
            <audio id="audio-film-curr" controls preload="auto">
              <source src="{b64_curr}" type="audio/mpeg">
            </audio>
            <div class="flex items-center justify-between text-[11px] text-[#a63e5b] font-mono font-bold px-1">
              <span>58.0秒 · 现用音轨</span>
              <span class="text-[#737d80]">（准备替换）</span>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- SECTION 2: CANDIDATE PLANS -->
    <div class="bg-[#fffdfa] border-4 border-[#2d3436] rounded-2xl p-6 cutout-shadow-lg space-y-4">
      <h2 class="text-lg md:text-xl font-black text-[#2d3436] flex items-center gap-2">
        <span>🎯 解决方案推荐与偏好选型</span>
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

        <!-- Plan 1 -->
        <div class="border-3 border-[#2ED573] bg-[#dff6ec]/40 rounded-xl p-5 flex flex-col justify-between cutout-shadow-sm">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-black px-2.5 py-0.5 rounded bg-[#2ED573] text-[#2d3436] border border-[#2d3436]">
                推荐首选
              </span>
              <span class="text-xs font-black text-[#266b4e]">120 BPM · 原版动感复刻</span>
            </div>
            <h3 class="text-lg font-black text-[#2d3436]">方案 A：移植当年 premiere 原版动感放克音轨</h3>
            <p class="text-xs text-[#4e585b] mt-2 leading-relaxed">
              把当年 <strong>playlistout-premiere</strong> 中你认可的这套<strong>强劲四踩底鼓、放克跳跃低音贝斯、CLI 浩室加速鼓点与清脆立体声击掌</strong>直接移植进当前 film，精确延长对齐 58.0 秒，并将新加入的真实礼花爆炸声、滚动条音效融合重混！
            </p>
          </div>
          <div class="mt-4 pt-3 border-t border-[#2d3436]/20 flex items-center justify-between">
            <span class="text-xs font-bold text-[#266b4e]">✓ 零版权争议 · 节奏完全卡点</span>
            <button onclick="selectPlan('方案 A：立即将当年 premiere 原版动感音轨移植并重混至当前 58 秒')" class="px-4 py-2 rounded-xl bg-[#2ED573] hover:bg-[#26af5f] text-[#2d3436] font-black text-xs border-2 border-[#2d3436] cutout-shadow-sm">
              立即采用方案 A
            </button>
          </div>
        </div>

        <!-- Plan 2 -->
        <div class="border-3 border-[#2d3436] bg-[#fffdfa] rounded-xl p-5 flex flex-col justify-between cutout-shadow-sm">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-black px-2.5 py-0.5 rounded bg-[#fde6ee] text-[#a63e5b] border border-[#2d3436]">
                高能二次元
              </span>
              <span class="text-xs font-black text-[#a63e5b]">128 BPM · 日系萌动放克</span>
            </div>
            <h3 class="text-lg font-black text-[#2d3436]">方案 B：采用日系高能二次元放克（如《野良猫》风格）</h3>
            <p class="text-xs text-[#4e585b] mt-2 leading-relaxed">
              参考 B站/油管 爆款萌宠视频神曲《野良猫は宇宙を目指した》(Sharou)，拥有更密集的十六分音符反拍踩镲与高能电钢琴琶音，动感十足，极度适合粉色云朵与日语动漫歌单。
            </p>
          </div>
          <div class="mt-4 pt-3 border-t border-[#2d3436]/20 flex items-center justify-between">
            <span class="text-xs font-bold text-[#737d80]">需引入外部开源/免版税音源</span>
            <button onclick="selectPlan('方案 B：采用日系高能二次元放克风格')" class="px-4 py-2 rounded-xl bg-[#fff8bd] hover:bg-[#fff4a3] text-[#2d3436] font-black text-xs border-2 border-[#2d3436] cutout-shadow-sm">
              选择方案 B
            </button>
          </div>
        </div>

      </div>
    </div>

  </div>

  <script>
    function selectPlan(plan) {{
      alert('已记录您的偏好选择：\\n\\n【' + plan + '】\\n\\n请在对话框中告诉我确认，我将立即为你把这套动感音轨与所有画面卡点音效无缝混音重合！');
    }}
  </script>
</body>
</html>
"""

(brain / "bgm-selector.html").write_text(html_content, encoding="utf-8")
print("OK! bgm-selector.html written successfully!")
