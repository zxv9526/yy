<template>
  <div class="w-full h-full flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden bg-[#0A0D14] text-[#F5EFE6]">
    <!-- Top Header Bar -->
    <div class="flex items-center justify-between pb-2.5 border-b border-[#1E293B] shrink-0">
      <div class="flex items-center gap-3">
        <button
          type="button"
          @click="$emit('close')"
          class="px-3.5 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-xs sm:text-sm font-bold text-blue-200 border border-blue-500/60 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-md"
          title="返回游戏大厅"
        >
          <span>🏠</span>
          <span>返回大厅</span>
        </button>
        <div>
          <div class="flex items-center gap-2.5">
            <h2 class="text-base sm:text-lg md:text-xl font-black text-[#F5EFE6] font-serif-title">
              水镜楼 · 十三张（十三水）场景选择
            </h2>
            <span class="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-mono font-bold">
              头中尾三道比水 · 严防倒水
            </span>
          </div>
          <p class="text-[10px] sm:text-xs text-[#94A3B8] font-mono mt-0.5">
            四人场（1副牌52张全发） · 八人场（2副扑克104张全发）
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="$emit('close')"
          class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
          title="关闭返回大厅"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- 2+2 Four Cards (No Icons, Clear Typography, Spacious Layout) -->
    <div class="grid grid-cols-2 grid-rows-2 gap-3 sm:gap-4 flex-1 min-h-0 my-3 items-stretch">
      <div
        v-for="s in SCENES"
        :key="s.id"
        @click="selectedScene = s.id"
        @dblclick="confirmAndEnter(s.id)"
        class="relative rounded-2xl sm:rounded-3xl border-2 transition-all duration-300 flex items-center justify-between px-5 sm:px-8 py-3.5 sm:py-5 overflow-hidden cursor-pointer group active:scale-[0.99] select-none shadow-xl"
        :class="[
          selectedScene === s.id
            ? s.isEight
              ? 'border-amber-400 bg-gradient-to-r from-amber-950/85 via-[#22180F] to-[#120E0A] ring-2 ring-amber-400/80 shadow-[0_0_35px_rgba(245,158,11,0.3)]'
              : 'border-blue-400 bg-gradient-to-r from-blue-950/90 via-[#131E33] to-[#0D1424] ring-2 ring-blue-400/80 shadow-[0_0_35px_rgba(59,130,246,0.35)]'
            : 'border-[#1E293B] bg-gradient-to-r from-[#0F172A] via-[#0E1526] to-[#0A0E1A] hover:border-blue-500/40 hover:bg-[#131C31]'
        ]"
      >
        <!-- Active Tag Badge in Corner -->
        <div
          v-if="selectedScene === s.id"
          class="absolute top-0 right-0 text-[10px] sm:text-xs font-black px-4 py-0.5 rounded-bl-xl shadow-md z-10"
          :class="s.isEight ? 'bg-gradient-to-l from-amber-500 to-amber-600 text-black' : 'bg-gradient-to-l from-blue-500 to-indigo-600 text-white'"
        >
          已选中 ✓
        </div>

        <!-- Left Content Area (Pure text hierarchy, no icons) -->
        <div class="min-w-0 flex-1 pr-3">
          <!-- Title Row + Tag -->
          <div class="flex items-center gap-3 flex-nowrap">
            <h3
              class="text-2xl sm:text-3xl md:text-4xl font-black font-serif-title tracking-wide whitespace-nowrap leading-none transition-colors"
              :class="
                selectedScene === s.id
                  ? s.isEight
                    ? 'text-amber-300 drop-shadow-[0_2px_12px_rgba(245,158,11,0.5)]'
                    : 'text-blue-300 drop-shadow-[0_2px_12px_rgba(96,165,250,0.5)]'
                  : s.isEight
                    ? 'text-amber-100 group-hover:text-amber-300'
                    : 'text-slate-100 group-hover:text-blue-200'
              "
            >
              {{ s.name }}
            </h3>

            <span
              class="px-2.5 py-1 rounded-lg text-xs sm:text-sm font-black font-mono shadow-sm shrink-0 whitespace-nowrap"
              :class="s.isEight ? 'bg-amber-500/25 text-amber-300 border border-amber-400/50' : 'bg-blue-500/25 text-blue-300 border border-blue-400/50'"
            >
              {{ s.deckCountText }}
            </span>
          </div>

          <!-- Feature Description Lines -->
          <div class="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-3 flex-wrap">
            <span class="text-xs sm:text-sm font-bold text-[#E2E8F0] whitespace-nowrap">
              {{ s.modeDesc }}
            </span>
            <span class="text-xs sm:text-sm text-[#475569] hidden sm:inline">|</span>
            <span class="text-xs sm:text-sm font-medium text-[#94A3B8] whitespace-nowrap">
              {{ s.ruleDesc }}
            </span>
          </div>
        </div>

        <!-- Right Content Area: Base Stake + Action Button -->
        <div class="flex items-center shrink-0 pl-4 sm:pl-6 border-l border-white/10 gap-4 sm:gap-5">
          <div class="flex flex-col items-end justify-center">
            <span class="text-[10px] sm:text-xs text-[#94A3B8] font-mono whitespace-nowrap">
              底分准入
            </span>
            <span class="text-base sm:text-xl md:text-2xl font-mono font-black text-amber-300 whitespace-nowrap mt-0.5">
              {{ s.baseStake }} 分
            </span>
          </div>

          <button
            type="button"
            @click.stop="confirmAndEnter(s.id)"
            class="px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-black rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
            :class="
              selectedScene === s.id
                ? s.isEight
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-amber-500/40 ring-1 ring-amber-300 font-bold'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/40 ring-1 ring-blue-300'
                : 'bg-white/10 hover:bg-white/20 text-[#E6DEC8]'
            "
          >
            <span>{{ selectedScene === s.id ? '确认入座 · 等待牌友 ➔' : '入座此场' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Bottom Footer Bar -->
    <div class="flex items-center justify-between pt-2.5 border-t border-[#1E293B] shrink-0">
      <div class="text-[10px] sm:text-xs text-[#94A3B8] flex items-center gap-2 font-mono">
        <span class="text-amber-400 font-bold">规则备忘：</span>
        <span>已彻底移除人机补位。点击「确认入座 · 等待牌友」进入该场景等候室，等待真实玩家入座同一场景，满座自动发牌开局。</span>
      </div>
      <div class="flex items-center gap-3">
        <button
          type="button"
          @click="confirmAndEnter(selectedScene)"
          class="px-7 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-600 hover:from-blue-500 hover:to-amber-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-blue-600/40 ring-1 ring-blue-300 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
        >
          <span>确认入座 · 等待牌友 ➔</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

export type ShisanshuiSceneMode = 'four-realtime' | 'four-booking' | 'eight-realtime' | 'eight-booking';

interface SceneItem {
  id: ShisanshuiSceneMode;
  name: string;
  isEight: boolean;
  deckCountText: string;
  modeDesc: string;
  ruleDesc: string;
  baseStake: number;
}

const props = defineProps<{
  initialScene?: ShisanshuiSceneMode;
}>();

const emit = defineEmits<{
  (e: 'select', mode: ShisanshuiSceneMode): void;
  (e: 'close'): void;
}>();

const selectedScene = ref<ShisanshuiSceneMode>(props.initialScene || 'four-realtime');

const SCENES: SceneItem[] = [
  {
    id: 'four-realtime',
    name: '四人实时场',
    isEight: false,
    deckCountText: '1 副牌 · 52张',
    modeDesc: '快速即配 · 实时竞技',
    ruleDesc: '4人×13张 = 52张全发 · 打枪翻倍 · 全垒打大捷',
    baseStake: 200,
  },
  {
    id: 'four-booking',
    name: '四人预约场',
    isEight: false,
    deckCountText: '1 副牌 · 52张',
    modeDesc: '包厢预约 · 亲友雅聚',
    ruleDesc: '专属房号 · 严防倒水 · 私密对战免打扰',
    baseStake: 200,
  },
  {
    id: 'eight-realtime',
    name: '八人实时场',
    isEight: true,
    deckCountText: '2 副牌 · 104张',
    modeDesc: '双副争霸 · 8人同台',
    ruleDesc: '8人×13张 = 104张全发 · 五同至尊 · 7位对手比水',
    baseStake: 500,
  },
  {
    id: 'eight-booking',
    name: '八人预约场',
    isEight: true,
    deckCountText: '2 副牌 · 104张',
    modeDesc: '豪华包厢 · 八方豪杰',
    ruleDesc: '独立专席 · 8人私密预约 · 两副扑克盛宴',
    baseStake: 500,
  },
];

function confirmAndEnter(mode: ShisanshuiSceneMode) {
  selectedScene.value = mode;
  emit('select', mode);
}
</script>
