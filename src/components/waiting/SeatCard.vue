<template>
  <div
    class="relative rounded-2xl transition-all duration-300 flex flex-col items-center justify-between shadow-xl select-none"
    :class="[
      compact ? 'w-24 sm:w-28 p-1.5' : 'w-36 sm:w-44 p-2.5 sm:p-3',
      player
        ? isCurrentUser
          ? 'bg-gradient-to-b from-[#3D2514] via-[#2A180C] to-[#1A0E06] border-2 border-amber-400 ring-2 ring-amber-400/50 shadow-[0_0_25px_rgba(245,158,11,0.35)]'
          : 'bg-gradient-to-b from-[#251A14] via-[#1C130D] to-[#120B07] border-2 border-amber-500/60 shadow-lg'
        : 'bg-black/40 border-2 border-dashed border-amber-500/30 backdrop-blur-xs opacity-75'
    ]"
  >
    <!-- Seat Title Corner Tag -->
    <div
      class="text-[9px] sm:text-[10px] font-mono font-bold px-2 py-0.5 rounded-full mb-1"
      :class="
        player
          ? isCurrentUser
            ? 'bg-amber-500 text-black font-black'
            : 'bg-amber-950/80 text-amber-200 border border-amber-500/40'
          : 'bg-white/5 text-[#A89887] border border-white/10'
      "
    >
      {{ seatLabel }}
    </div>

    <!-- Center Avatar / Empty Slot Icon -->
    <div class="relative my-1">
      <template v-if="player">
        <div
          class="rounded-full flex items-center justify-center border-2 shadow-inner"
          :class="[
            compact ? 'w-10 h-10 text-xl' : 'w-13 h-13 sm:w-16 sm:h-16 text-2xl sm:text-3xl',
            isCurrentUser ? 'bg-amber-500/20 border-amber-400' : 'bg-white/10 border-amber-500/60'
          ]"
        >
          <span>{{ player.avatar || '👤' }}</span>
        </div>
        <!-- Status indicator dot -->
        <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-black animate-pulse"></span>
      </template>

      <template v-else>
        <div
          class="rounded-full flex flex-col items-center justify-center border border-dashed border-white/20 bg-black/30"
          :class="compact ? 'w-10 h-10' : 'w-13 h-13 sm:w-16 sm:h-16'"
        >
          <span class="text-lg opacity-40 animate-pulse">🏮</span>
        </div>
      </template>
    </div>

    <!-- Player Details / Waiting Status -->
    <div class="text-center w-full px-1">
      <template v-if="player">
        <div class="font-black text-white font-serif-title truncate text-xs sm:text-sm drop-shadow">
          {{ player.name }}
        </div>
        <div class="text-[9px] sm:text-[10px] text-amber-300 font-mono font-bold mt-0.5">
          🪙 {{ player.coins }} 分
        </div>
        <div class="mt-1 flex items-center justify-center gap-1">
          <span
            class="text-[8px] sm:text-[9px] px-1.5 py-0.2 rounded font-mono font-bold"
            :class="isCurrentUser ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'"
          >
            {{ isCurrentUser ? '👑 本家' : player.isSimulated ? '⚡ 牌友测试' : '👤 真实牌友' }}
          </span>
          <span class="text-[8px] sm:text-[9px] text-emerald-400 font-bold">
            已入座 ✓
          </span>
        </div>
      </template>

      <template v-else>
        <div class="text-[10px] sm:text-xs font-bold text-amber-400/80 font-serif-title">
          虚席以待
        </div>
        <div class="text-[8px] sm:text-[9px] text-[#A89887] font-mono mt-0.5 leading-tight">
          等待玩家入座...
        </div>
        <div class="mt-1 text-[7px] sm:text-[8px] text-emerald-400/80 font-mono">
          🚫 无人机补位
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ScenePlayer } from '../SceneWaitingRoom.vue';

defineProps<{
  seatIndex: number;
  seatLabel: string;
  player: ScenePlayer | null;
  isCurrentUser: boolean;
  compact?: boolean;
}>();
</script>
