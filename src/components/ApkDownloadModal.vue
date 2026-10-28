<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none">
      <div class="w-full max-w-md rounded-3xl bg-[#1C1815] border border-amber-500/40 p-5 shadow-2xl overflow-hidden text-[#F5EFE6]">
      <!-- Header -->
      <div class="flex items-center justify-between pb-3 border-b border-[#2E2722] mb-3">
        <div class="flex items-center gap-2">
          <span class="text-xl p-1.5 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300">📲</span>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-base font-bold text-white font-serif-title">Android 正式版 APK 下载</h3>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
                正式发布版
              </span>
            </div>
            <p class="text-[11px] text-[#A89887] mt-0.5">
              已修复调试包问题，当前提供已签名的正式 Release 安装包
            </p>
          </div>
        </div>
        <button type="button" @click="$emit('close')" class="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs text-[#B8A99A] hover:text-white transition-colors">
          ✕
        </button>
      </div>

      <!-- File info badge -->
      <div class="p-2.5 rounded-xl bg-[#241D17] border border-amber-500/20 mb-3 flex items-center justify-between text-xs">
        <div class="flex items-center gap-1.5">
          <span class="text-amber-400 font-mono">📦 文件名:</span>
          <span class="font-mono text-emerald-400 font-bold">chess-game-release.apk</span>
        </div>
        <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-200 border border-emerald-600/40">
          Release 正式版
        </span>
      </div>

      <!-- Download Links -->
      <div class="space-y-2 mb-4">
        <!-- 线路 1：本站同源极速直链下载 (推荐首选 · 100% 免代理直下) -->
        <a 
          :href="sameOriginReleaseApkUrl" 
          download="chess-game-release.apk"
          class="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-emerald-600 via-amber-600 to-amber-500 hover:from-emerald-500 hover:to-amber-400 text-white shadow-lg active:scale-[0.99] transition-all border border-amber-400/50 group"
        >
          <div class="flex items-center gap-2.5">
            <span class="text-base">🚀</span>
            <div class="text-left">
              <div class="text-xs font-bold flex items-center gap-1.5">
                <span>线路 1：本站同源极速直链</span>
                <span class="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/80 text-white font-mono font-bold">100% 免代理</span>
              </div>
              <div class="text-[10px] text-amber-100/90 mt-0.5">当前茶楼服务器高带宽专线 · 国内直连即点即下</div>
            </div>
          </div>
          <span class="text-xs font-bold text-white group-hover:translate-x-0.5 transition-transform">立即下载 ↓</span>
        </a>

        <!-- 线路 2：国内 GHProxy 节点专线 (备用) -->
        <a 
          :href="rawReleaseApkUrl" 
          download="chess-game-release.apk"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center justify-between p-2.5 rounded-xl bg-[#26201B] hover:bg-[#342A24] border border-amber-500/30 text-xs text-[#E6DEC8] transition-colors group"
        >
          <div class="flex items-center gap-2">
            <span class="text-sm">⚡</span>
            <div class="text-left">
              <div class="font-bold text-white">线路 2：国内 GHProxy 节点专线 (备用)</div>
              <div class="text-[10px] text-[#A89887]">备用加速通道 · 适合各省公网节点</div>
            </div>
          </div>
          <span class="text-[11px] text-amber-400 group-hover:text-amber-300">备选下载 →</span>
        </a>

        <!-- 线路 3：KKGitHub 专线镜像 (备用) -->
        <a 
          :href="kkgithubReleaseUrl" 
          download="chess-game-release.apk"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center justify-between p-2.5 rounded-xl bg-[#26201B] hover:bg-[#342A24] border border-amber-500/30 text-xs text-[#E6DEC8] transition-colors group"
        >
          <div class="flex items-center gap-2">
            <span class="text-sm">🌐</span>
            <div class="text-left">
              <div class="font-bold text-white">线路 3：KKGitHub 镜像专线 (备选)</div>
              <div class="text-[10px] text-[#A89887]">第三方开源反向代理分发通道</div>
            </div>
          </div>
          <span class="text-[11px] text-amber-400 group-hover:text-amber-300">备选下载 →</span>
        </a>

        <!-- 线路 4：GitHub 官方 Release 发布页 -->
        <a 
          :href="releasePageUrl" 
          target="_blank" 
          rel="noopener noreferrer"
          class="flex items-center justify-between p-2.5 rounded-xl bg-[#1C1713] hover:bg-[#2A221C] border border-white/10 text-xs text-[#B8A99A] transition-colors group"
        >
          <div class="flex items-center gap-2">
            <span class="text-sm">🐙</span>
            <div class="text-left">
              <div class="font-bold text-white">线路 4：GitHub 官方 Release 发布页</div>
              <div class="text-[10px] text-[#8C7A6B]">查看官方 Releases 全部历史版本与资产清单</div>
            </div>
          </div>
          <span class="text-[11px] text-[#A89887] group-hover:text-white">访问发布页 ↗</span>
        </a>
      </div>

      <!-- Installation Tips -->
      <div class="p-2.5 rounded-xl bg-[#14100E] border border-white/10 mb-3 text-[11px] text-[#A89887] leading-relaxed">
        💡 <strong class="text-emerald-400">国内免代理下载首选线路 1：</strong>
        线路 1 与当前茶楼网页采用同源直连专线，<strong class="text-amber-300">完全无需开启 VPN 或代理</strong>即可满速直接下载。安装时如系统弹出“允许未知应用来源”或“安全检测”，直接选择信任或继续安装即可。
      </div>

      <!-- Collapsible Debug Version (Only for dev/debug needs) -->
      <div class="mb-3">
        <button
          type="button"
          @click="showDebugSection = !showDebugSection"
          class="text-[10px] text-[#8C7A6B] hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>{{ showDebugSection ? '▼ 收起' : '▶ 需要开发调试？点击查看测试版 (Debug APK)' }}</span>
        </button>
        <div v-if="showDebugSection" class="mt-2 p-2.5 rounded-lg bg-[#14100E] border border-red-900/40 text-[10px] space-y-1.5">
          <div class="text-red-300 font-bold mb-1 flex items-center justify-between">
            <span>🛠️ 调试测试包 (Debug 版):</span>
            <span class="font-mono text-[#B8A99A]">chess-game-debug.apk</span>
          </div>
          <div class="flex items-center justify-between gap-2">
            <a
              :href="sameOriginDebugApkUrl"
              download="chess-game-debug.apk"
              class="px-3 py-1 rounded bg-amber-600/80 hover:bg-amber-600 text-white font-bold text-[10px]"
            >
              本站同源直下 (免代理) ↓
            </a>
            <a
              :href="rawDebugApkUrl"
              target="_blank"
              class="text-amber-400 hover:underline text-[10px]"
            >
              备用节点下载 →
            </a>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <button
        type="button"
        @click="$emit('close')"
        class="w-full py-2.5 text-xs rounded-xl bg-[#26201B] hover:bg-[#342A24] text-white font-bold transition-colors border border-white/15"
      >
        返回茶楼大厅
      </button>
    </div>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// 仓库配置
const repoPath = 'wen95266/ee';

// 正式版与测试版 APK 文件名
const releaseApkFileName = 'chess-game-release.apk';
const debugApkFileName = 'chess-game-debug.apk';

// 1. 本站同源极速直链 (首选 · 100% 免代理 · 同源直接下)
const sameOriginReleaseApkUrl = '/api/download/apk?variant=release';
const sameOriginDebugApkUrl = '/api/download/apk?variant=debug';

// 2. GitHub 官方原始直链
const githubReleaseApkUrl = `https://github.com/${repoPath}/releases/download/latest-apk/${releaseApkFileName}`;
const githubDebugApkUrl = `https://github.com/${repoPath}/releases/download/latest-apk/${debugApkFileName}`;

// 3. GHProxy 镜像直链 (备用)
const rawReleaseApkUrl = `https://ghproxy.net/${githubReleaseApkUrl}`;
const rawDebugApkUrl = `https://ghproxy.net/${githubDebugApkUrl}`;

// 4. KKGitHub 专线镜像 (备用)
const kkgithubReleaseUrl = `https://kkgithub.com/${repoPath}/releases/download/latest-apk/${releaseApkFileName}`;

// 5. GitHub Release 官方发布页面
const releasePageUrl = `https://github.com/${repoPath}/releases/tag/latest-apk`;

const showDebugSection = ref(false);

defineEmits<{ (e: 'close'): void }>();
</script>
