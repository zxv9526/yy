<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none overflow-hidden animate-fade-in">
      <div
        class="w-full max-w-[500px] flex flex-col rounded-3xl bg-gradient-to-br from-[#1C1815] via-[#14100D] to-[#0A0706] border border-amber-500/40 shadow-2xl overflow-hidden relative text-[#F5EFE6]"
      >
        <!-- 1. Header Bar -->
        <header class="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5 border-b border-amber-500/25 shrink-0 bg-[#171310]">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-700/20 border border-amber-400/60 flex items-center justify-center text-lg text-amber-300 shadow-inner shrink-0">
              🪙
            </div>
            <div class="min-w-0">
              <h3 class="text-sm sm:text-base font-bold text-amber-200 font-serif-title leading-tight truncate">
                入座筹码不足提醒
              </h3>
              <p class="text-[10px] sm:text-[11px] text-[#A89887] leading-none mt-0.5 truncate font-mono">
                {{ sceneName }} · 准入校验未通过
              </p>
            </div>
          </div>

          <button
            type="button"
            @click="$emit('close')"
            class="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs text-[#B8A99A] hover:text-white transition-colors cursor-pointer shrink-0"
            title="关闭提示"
          >
            ✕
          </button>
        </header>

        <!-- 2. Body Details -->
        <div class="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          <!-- Points Comparison Box -->
          <div class="grid grid-cols-2 gap-2.5 p-3 sm:p-3.5 rounded-2xl bg-[#0F0B09] border border-white/10 text-center">
            <div class="p-2 rounded-xl bg-[#191310] border border-white/5">
              <div class="text-[10px] sm:text-xs text-[#A89887] font-mono">您当前持有筹码</div>
              <div class="text-lg sm:text-xl font-mono font-black text-rose-400 mt-0.5">
                {{ currentCoins.toLocaleString() }} <span class="text-xs font-normal">分</span>
              </div>
            </div>
            <div class="p-2 rounded-xl bg-[#191310] border border-white/5">
              <div class="text-[10px] sm:text-xs text-[#A89887] font-mono">本场入座准入要求</div>
              <div class="text-lg sm:text-xl font-mono font-black text-amber-300 mt-0.5">
                {{ requiredCoins.toLocaleString() }} <span class="text-xs font-normal">分</span>
              </div>
            </div>
          </div>

          <!-- Explanation Notice -->
          <div class="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-950/25 border border-rose-500/30 text-rose-200 text-xs leading-relaxed">
            <span class="text-lg shrink-0 mt-0.5">🚫</span>
            <div>
              <div class="font-bold text-rose-300 text-xs sm:text-sm font-serif-title">
                积分不足，暂不允许入座真实对战席位
              </div>
              <p class="text-[11px] sm:text-xs text-rose-200/90 mt-1">
                为维护真人对局秩序与胜负结算安全，真实玩家牌桌要求达到本场最低准入筹码。当前尚缺少 <strong class="text-amber-300 font-mono">{{ (requiredCoins - currentCoins).toLocaleString() }} 分</strong>。
              </p>
            </div>
          </div>

          <!-- Human-Machine Practice Mode Recommendation Card -->
          <div class="p-3.5 rounded-2xl bg-gradient-to-br from-[#241910] to-[#17100A] border border-amber-500/40 space-y-2">
            <div class="flex items-center gap-2 text-amber-300 font-bold text-xs sm:text-sm font-serif-title">
              <span>🤖</span>
              <span>推荐选择：进入人机补位模式试玩</span>
              <span class="text-[9px] px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 font-mono">
                零门槛畅玩
              </span>
            </div>
            <ul class="text-[11px] text-[#D8C7B5] space-y-1.5 pl-1">
              <li class="flex items-center gap-1.5">
                <span class="text-emerald-400 font-bold">✓</span>
                <span><strong>一键人机补位开局</strong>：立即生成满席智能对手，无需等待随时开战。</span>
              </li>
              <li class="flex items-center gap-1.5">
                <span class="text-emerald-400 font-bold">✓</span>
                <span><strong>模拟积分演练</strong>：正宗规则与酷炫特效全套开放，输赢纯属演练，<strong>不扣除真实资产</strong>。</span>
              </li>
              <li class="flex items-center gap-1.5">
                <span class="text-emerald-400 font-bold">✓</span>
                <span><strong>轻松磨炼牌技</strong>：熟悉各类场景胡牌、比水及出牌套路，胜券在握。</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- 3. Action Footer Buttons -->
        <footer class="p-3.5 sm:p-5 border-t border-amber-500/20 bg-[#14100D] flex flex-col sm:flex-row items-center justify-end gap-2 sm:gap-2.5 shrink-0">
          <button
            type="button"
            @click="$emit('close')"
            class="w-full sm:w-auto px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-[#C4B5A5] hover:text-white text-xs font-medium transition-colors cursor-pointer text-center order-3 sm:order-1"
          >
            返回更换场次
          </button>

          <button
            type="button"
            @click="$emit('open-points')"
            class="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#221913] hover:bg-[#2C211A] text-amber-200 border border-amber-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer order-2 shadow-xs"
          >
            <span>🪙</span>
            <span>前往钱庄管理</span>
          </button>

          <button
            type="button"
            @click="$emit('enter-practice')"
            class="w-full sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white text-xs font-black transition-all active:scale-95 shadow-lg shadow-amber-600/30 flex items-center justify-center gap-1.5 cursor-pointer ring-1 ring-amber-300 order-1 sm:order-3"
          >
            <span>🤖</span>
            <span>进入人机补位试玩 ➔</span>
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  currentCoins: number;
  requiredCoins: number;
  sceneName: string;
}>();

defineEmits<{
  (e: 'close'): void;
  (e: 'enter-practice'): void;
  (e: 'open-points'): void;
}>();
</script>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.97);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-fade-in {
  animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
