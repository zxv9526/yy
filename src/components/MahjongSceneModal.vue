<template>
  <div class="w-full h-full flex flex-col justify-between p-2.5 sm:p-4 select-none overflow-hidden bg-[#100B08] text-[#F5EFE6]">
    <!-- Top Header Bar -->
    <div class="flex items-center justify-between pb-2 border-b border-[#2C211A] shrink-0">
      <div class="flex items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          @click="$emit('close')"
          class="px-3 py-1.5 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-xs sm:text-sm font-bold text-amber-200 border border-amber-500/60 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-md"
          title="返回游戏大厅"
        >
          <span>🏠</span>
          <span>返回大厅</span>
        </button>
        <span class="text-xl sm:text-2xl p-1 rounded-xl bg-gradient-to-br from-purple-900 via-purple-950 to-black border border-purple-400/60 text-amber-300 shadow-md">
          🀄
        </span>
        <div>
          <h2 class="text-sm sm:text-base md:text-lg font-black text-[#F5EFE6] font-serif-title flex items-center gap-2">
            <span>雀神茶社 · 麻将玩法场景选择</span>
            <span class="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
              10分底分 · 准入100分
            </span>
          </h2>
          <p class="text-[9px] sm:text-[10px] text-[#A89887] font-mono mt-0.5 truncate">
            全屏 2+2 四大长方条大格局 · 摸4张红中直接胡牌结算 · 无红中自摸额外奖2码
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="$emit('close')"
          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs sm:text-sm text-[#B8A99A] hover:text-white transition-colors cursor-pointer"
          title="关闭返回大厅"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- 2+2 Four Elongated Horizontal Bars (Full Screen, No Overflow, Zero Scroll) -->
    <div class="grid grid-cols-2 grid-rows-2 gap-3 sm:gap-4 flex-1 min-h-0 my-2.5 items-stretch">
      <div
        v-for="s in SCENES"
        :key="s.id"
        @click="selectedScene = s.id"
        @dblclick="confirmAndEnter(s.id)"
        class="relative rounded-2xl sm:rounded-3xl border-2 transition-all duration-300 flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3.5 overflow-hidden cursor-pointer group active:scale-[0.99] select-none shadow-lg"
        :class="[
          selectedScene === s.id
            ? 'border-amber-400 bg-gradient-to-r from-amber-950/85 via-[#2C211A] to-[#18110D] ring-2 ring-amber-400/80 shadow-[0_0_35px_rgba(245,158,11,0.3)]'
            : 'border-[#382C24] bg-gradient-to-r from-[#1C1511] via-[#16100D] to-[#110C09] hover:border-amber-600/60 hover:bg-[#221A15]'
        ]"
      >
        <!-- Active Corner Tag -->
        <div
          v-if="selectedScene === s.id"
          class="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-black text-[10px] font-black px-3 py-0.5 rounded-bl-xl shadow-md"
        >
          已选中 ✓
        </div>

        <!-- 1. Left Section: Icon & Title -->
        <div class="flex items-center gap-3 sm:gap-4 min-w-0 shrink-0">
          <div
            class="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl border shadow-inner shrink-0"
            :class="s.iconBg"
          >
            {{ s.icon }}
          </div>
          <div class="min-w-0">
            <h3 class="text-base sm:text-lg font-black text-white font-serif-title truncate group-hover:text-amber-300 transition-colors">
              {{ s.name }}
            </h3>
            <div class="text-[10px] sm:text-xs font-mono font-bold mt-0.5 truncate" :class="s.badgeColor">
              {{ s.badge }}
            </div>
            <div class="text-[10px] text-[#A89887] font-mono mt-1 hidden sm:block">
              {{ s.subHighlight }}
            </div>
          </div>
        </div>

        <!-- 2. Middle Section: Giant Number Highlight -->
        <div class="flex flex-col items-center justify-center px-2 sm:px-4 shrink-0">
          <div class="text-[10px] text-[#A89887] font-mono">自摸开奖</div>
          <div class="text-2xl sm:text-3xl md:text-4xl font-black font-mono leading-none tracking-tight my-0.5" :class="s.maCountColor">
            {{ s.maCount }} <span class="text-xs sm:text-sm font-bold font-sans">码</span>
          </div>
          <div class="text-[9px] sm:text-[10px] text-[#C4B5A5] font-mono">
            底分 10 分
          </div>
        </div>

        <!-- 3. Right Rules Summary Box (Always visible, crystal clear) -->
        <div class="flex flex-col justify-center space-y-0.5 sm:space-y-1 p-1.5 sm:p-2.5 rounded-xl border border-white/5 text-[9px] sm:text-[10px] font-mono w-36 sm:w-44 lg:w-52 shrink-0" :class="s.ruleBoxBg">
          <div class="flex items-center justify-between font-bold" :class="s.specialRuleColor">
            <span class="truncate">{{ s.specialRuleTitle }}</span>
            <span class="shrink-0 ml-1">{{ s.specialRuleValue }}</span>
          </div>
          <div v-if="s.secondRuleTitle" class="flex items-center justify-between text-emerald-300 font-bold">
            <span class="truncate">{{ s.secondRuleTitle }}</span>
            <span class="shrink-0 ml-1">{{ s.secondRuleValue }}</span>
          </div>
        </div>

        <!-- 4. Far Right: Button & Action -->
        <div class="flex flex-col items-end justify-center gap-1.5 shrink-0 pl-2">
          <span class="text-[10px] sm:text-xs font-mono font-bold text-amber-300">
            🪙 100 分
          </span>
          <button
            type="button"
            @click.stop="confirmAndEnter(s.id)"
            class="px-3.5 sm:px-5 py-1.5 text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1 active:scale-95 cursor-pointer whitespace-nowrap"
            :class="
              selectedScene === s.id
                ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white shadow-amber-600/40 ring-1 ring-amber-300'
                : 'bg-white/10 hover:bg-white/20 text-[#E6DEC8]'
            "
          >
            <span>{{ selectedScene === s.id ? '确认入座 · 等待牌友 ➔' : '入座此场' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Bottom Footer Bar -->
    <div class="flex items-center justify-between pt-2.5 border-t border-[#2C211A] shrink-0">
      <div class="text-[10px] sm:text-xs text-[#A89887] flex items-center gap-2 font-mono">
        <span class="text-amber-400">💡 提示：</span>
        <span>已彻底移除人机补位。点击「确认入座 · 等待牌友」进入专属等候室，等待牌友加入相同场景，满四人自动发牌开局。</span>
      </div>
      <div class="flex items-center gap-3">
        <button
          type="button"
          @click="confirmAndEnter(selectedScene)"
          class="px-7 py-2 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-black text-xs sm:text-sm shadow-xl shadow-amber-600/40 ring-1 ring-amber-300 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
        >
          <span>确认入座 · 等待牌友</span>
          <span>🀄 ➔</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

export type MahjongSceneMode = 'standard-6' | 'standard-10' | 'hongzhong-6' | 'hongzhong-10';

interface SceneItem {
  id: MahjongSceneMode;
  name: string;
  badge: string;
  badgeColor: string;
  icon: string;
  iconBg: string;
  maCount: number;
  maCountColor: string;
  subHighlight: string;
  ruleBoxBg: string;
  specialRuleTitle: string;
  specialRuleValue: string;
  specialRuleColor: string;
  secondRuleTitle?: string;
  secondRuleValue?: string;
}

const props = defineProps<{
  initialScene?: MahjongSceneMode;
}>();

const emit = defineEmits<{
  (e: 'select', mode: MahjongSceneMode): void;
  (e: 'close'): void;
}>();

const selectedScene = ref<MahjongSceneMode>(props.initialScene || 'hongzhong-6');

const SCENES: SceneItem[] = [
  {
    id: 'standard-6',
    name: '普通场 · 六码',
    badge: '经典国标 · 136张经典牌库',
    badgeColor: 'text-amber-400',
    icon: '🀄',
    iconBg: 'bg-amber-900/40 border-amber-500/40 text-amber-300',
    maCount: 6,
    maCountColor: 'text-amber-400',
    subHighlight: '一五九/红中东风中码',
    ruleBoxBg: 'bg-black/30',
    specialRuleTitle: '中码奖励',
    specialRuleValue: '+10分/每码',
    specialRuleColor: 'text-amber-300',
    secondRuleTitle: '算分模式',
    secondRuleValue: '底分+中码数×10',
  },
  {
    id: 'standard-10',
    name: '普通场 · 十码',
    badge: '十码连开 · 刺激高奖池',
    badgeColor: 'text-emerald-400',
    icon: '🏆',
    iconBg: 'bg-emerald-900/40 border-emerald-500/40 text-emerald-300',
    maCount: 10,
    maCountColor: 'text-emerald-400',
    subHighlight: '连开十码大赏',
    ruleBoxBg: 'bg-black/30',
    specialRuleTitle: '十码连开',
    specialRuleValue: '+10分/每码',
    specialRuleColor: 'text-emerald-300',
    secondRuleTitle: '算分模式',
    secondRuleValue: '最高赢110分/家',
  },
  {
    id: 'hongzhong-6',
    name: '红中场 · 六码',
    badge: '红中万能百搭 · 爽快自摸',
    badgeColor: 'text-rose-400',
    icon: '🧧',
    iconBg: 'bg-rose-900/40 border-rose-500/40 text-rose-300',
    maCount: 6,
    maCountColor: 'text-rose-400',
    subHighlight: '无红中自摸奖8码',
    ruleBoxBg: 'bg-rose-950/20',
    specialRuleTitle: '摸4张红中胡牌',
    specialRuleValue: '各得70分(共210分)',
    specialRuleColor: 'text-rose-300',
    secondRuleTitle: '手牌无红中自摸',
    secondRuleValue: '奖励额外+2码(共8码)',
  },
  {
    id: 'hongzhong-10',
    name: '红中场 · 十码',
    badge: '红中至尊 · 巅峰大赏',
    badgeColor: 'text-purple-400',
    icon: '👑',
    iconBg: 'bg-purple-900/40 border-purple-500/40 text-purple-300',
    maCount: 10,
    maCountColor: 'text-purple-300',
    subHighlight: '无红中自摸奖12码',
    ruleBoxBg: 'bg-purple-950/20',
    specialRuleTitle: '摸4张红中胡牌',
    specialRuleValue: '各得110分(共330分)',
    specialRuleColor: 'text-purple-300',
    secondRuleTitle: '手牌无红中自摸',
    secondRuleValue: '奖励额外+2码(共12码)',
  },
];

function confirmAndEnter(mode: MahjongSceneMode) {
  emit('select', mode);
}
</script>
