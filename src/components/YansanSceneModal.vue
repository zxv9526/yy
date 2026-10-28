<template>
  <div class="w-full h-full flex flex-col justify-between p-2.5 sm:p-4 select-none overflow-hidden bg-[#140808] text-[#F5EFE6]">
    <!-- Top Header Bar -->
    <div class="flex items-center justify-between pb-2 border-b border-[#3D1414] shrink-0">
      <div class="flex items-center gap-3">
        <button
          type="button"
          @click="$emit('close')"
          class="px-3.5 py-1.5 rounded-xl bg-red-600/30 hover:bg-red-600/50 text-xs sm:text-sm font-bold text-red-200 border border-red-500/60 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-md"
          title="返回游戏大厅"
        >
          <span>🏠</span>
          <span>返回大厅</span>
        </button>
        <div>
          <div class="flex items-center gap-2.5">
            <h2 class="text-base sm:text-lg md:text-xl font-black text-[#F5EFE6] font-serif-title flex items-center gap-2">
              <span>🔥 经典烟三 · 玩法分场选择</span>
            </h2>
            <span class="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 font-mono font-bold">
              5--10 · 10--20 · 20--40分场
            </span>
          </div>
          <p class="text-[10px] sm:text-xs text-[#E2B3B3] font-mono mt-0.5">
            严禁人机补位 · 选择分场后进入专属等候室 · 满四人全员入座后自动发牌开局
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="$emit('close')"
          class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm text-[#E2B3B3] hover:text-white transition-colors cursor-pointer"
          title="关闭返回大厅"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- 3 Cards Grid (5--10 / 10--20 / 20--40 分场) -->
    <div class="grid grid-cols-3 gap-3 sm:gap-4 flex-1 min-h-0 my-2.5 items-stretch">
      <div
        v-for="s in SCENES"
        :key="s.id"
        @click="selectedScene = s.id"
        @dblclick="confirmAndEnter(s.id)"
        class="relative rounded-2xl sm:rounded-3xl border-2 transition-all duration-300 flex flex-col justify-between p-3.5 sm:p-5 overflow-hidden cursor-pointer group active:scale-[0.99] select-none shadow-2xl"
        :class="[
          selectedScene === s.id
            ? 'border-amber-400 bg-gradient-to-br from-red-950/90 via-[#2E0B0B] to-[#160404] ring-2 ring-amber-400/80 shadow-[0_0_35px_rgba(239,68,68,0.35)]'
            : 'border-[#3D1414] bg-gradient-to-br from-[#1C0707] via-[#150505] to-[#0D0303] hover:border-red-500/50 hover:bg-[#220909]'
        ]"
      >
        <!-- Active Tag Badge in Corner -->
        <div
          v-if="selectedScene === s.id"
          class="absolute top-0 right-0 text-[10px] sm:text-xs font-black px-3.5 py-0.5 rounded-bl-xl shadow-md z-10 bg-gradient-to-l from-amber-500 to-amber-600 text-black"
        >
          已选中 ✓
        </div>

        <!-- Top Section: Icon, Title & Stake -->
        <div>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 sm:gap-3">
              <span class="text-2xl sm:text-3xl filter drop-shadow">{{ s.icon }}</span>
              <div>
                <h3
                  class="text-lg sm:text-xl md:text-2xl font-black font-serif-title tracking-wide transition-colors"
                  :class="selectedScene === s.id ? 'text-amber-300 drop-shadow' : 'text-white group-hover:text-amber-200'"
                >
                  {{ s.name }}
                </h3>
                <span class="text-[9px] sm:text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 inline-block mt-0.5">
                  {{ s.badge }}
                </span>
              </div>
            </div>

            <!-- Stake Box -->
            <div class="text-right">
              <span class="text-[9px] sm:text-[10px] text-[#E2B3B3] font-mono block">分场倍率</span>
              <span class="text-base sm:text-lg md:text-xl font-mono font-black text-amber-300">
                🪙 {{ s.stakeLabel }}
              </span>
            </div>
          </div>

          <!-- Feature Description Lines -->
          <div class="mt-3 space-y-1.5">
            <div class="flex items-center gap-1.5 text-[11px] sm:text-xs text-[#F5EFE6] font-medium">
              <span class="text-amber-400">●</span>
              <span>{{ s.ruleSummary }}</span>
            </div>
            <div class="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#D1A0A0]">
              <span class="text-red-400">●</span>
              <span>{{ s.specialHighlight }}</span>
            </div>
            <div class="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-emerald-400 font-bold">
              <span>●</span>
              <span>满座 4 人全员自动开牌，严禁任何假人/人机！</span>
            </div>
          </div>
        </div>

        <!-- Bottom Action Bar -->
        <div class="pt-3 border-t border-white/10 flex items-center justify-between">
          <span class="text-[10px] sm:text-xs text-[#E2B3B3] font-mono">
            👥 4人真人席位
          </span>
          <button
            type="button"
            @click.stop="confirmAndEnter(s.id)"
            class="px-3.5 sm:px-5 py-2 text-xs font-black rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer whitespace-nowrap flex items-center gap-1"
            :class="
              selectedScene === s.id
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-amber-500/40 ring-1 ring-amber-300 font-bold'
                : 'bg-white/10 hover:bg-white/20 text-[#E6DEC8]'
            "
          >
            <span>{{ selectedScene === s.id ? '确认入座 ➔' : '入座此场' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Bottom Footer Bar -->
    <div class="flex items-center justify-between pt-2 border-t border-[#3D1414] shrink-0">
      <div class="text-[10px] sm:text-xs text-[#E2B3B3] flex items-center gap-2 font-mono">
        <span class="text-amber-400 font-bold">💡 提示：</span>
        <span>已恢复经典的 5--10分、10--20分、20--40分场。选择后进入该分场等候室，等待牌友加入相同分场，满四人自动发牌开局。</span>
      </div>
      <div class="flex items-center gap-3">
        <button
          type="button"
          @click="confirmAndEnter(selectedScene)"
          class="px-7 py-2 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-black text-xs sm:text-sm shadow-xl shadow-amber-600/40 ring-1 ring-amber-300 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
        >
          <span>确认入座 · 等待牌友</span>
          <span>🔥 ➔</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

export type YansanSceneMode = 'yansan-5-10' | 'yansan-10-20' | 'yansan-20-40';

interface SceneItem {
  id: YansanSceneMode;
  name: string;
  badge: string;
  icon: string;
  baseStake: number;
  stakeLabel: string;
  ruleSummary: string;
  specialHighlight: string;
}

const props = defineProps<{
  initialScene?: YansanSceneMode;
}>();

const emit = defineEmits<{
  (e: 'select', mode: YansanSceneMode): void;
  (e: 'close'): void;
}>();

const selectedScene = ref<YansanSceneMode>(props.initialScene || 'yansan-5-10');

const SCENES: SceneItem[] = [
  {
    id: 'yansan-5-10',
    name: '5--10 分场',
    badge: '底分5分 · 顶格10分',
    icon: '🔥',
    baseStake: 5,
    stakeLabel: '5--10 分',
    ruleSummary: '方块三首出 · 四人各13张 · 底分5分 · 封顶10分',
    specialHighlight: '经典入门体验 · 顺子连环跑牌 · 输赢5至10分',
  },
  {
    id: 'yansan-10-20',
    name: '10--20 分场',
    badge: '底分10分 · 顶格20分',
    icon: '⚡',
    baseStake: 10,
    stakeLabel: '10--20 分',
    ruleSummary: '四人同台争锋 · 炸弹翻倍 · 底分10分 · 封顶20分',
    specialHighlight: '进阶实力对决 · 炸弹顶大出清 · 输赢10至20分',
  },
  {
    id: 'yansan-20-40',
    name: '20--40 分场',
    badge: '底分20分 · 顶格40分',
    icon: '👑',
    baseStake: 20,
    stakeLabel: '20--40 分',
    ruleSummary: '四人巅峰豪客对决 · 炸弹翻番 · 底分20分 · 封顶40分',
    specialHighlight: '高倍巅峰争霸 · 决战云巅先跑赢 · 输赢20至40分',
  },
];

function confirmAndEnter(mode: YansanSceneMode) {
  emit('select', mode);
}
</script>
