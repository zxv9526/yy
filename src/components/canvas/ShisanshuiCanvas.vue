<template>
  <div
    ref="containerRef"
    class="w-full h-full select-none absolute inset-0 overflow-hidden flex items-center justify-center"
    :style="{
      backgroundColor: props.tableTheme?.feltColor || '#1D4ED8',
      background: `radial-gradient(ellipse at 50% 45%, ${props.tableTheme?.highlightColor || '#3B82F6'} 0%, ${props.tableTheme?.feltColor || '#1D4ED8'} 60%, ${props.tableTheme?.edgeColor || '#1E3A8A'} 100%)`
    }"
  >
    <!-- Fullscreen Card Table Surface with In-Table Action Overlay -->
    <div class="w-full h-full absolute inset-0 overflow-hidden flex items-center justify-center">
      <canvas
        ref="canvasRef"
        @pointerdown="onCanvasPointerDown"
        @pointermove="onCanvasPointerMove"
        @pointerup="onCanvasPointerUp"
        @pointercancel="onCanvasPointerCancel"
        class="w-full h-full absolute inset-0 block cursor-pointer"
      ></canvas>





      <!-- 顶部特殊牌型常驻提醒条 (若摸到特殊牌型，高亮显著提示) -->
      <div
        v-if="mySpecialHand && !hasCompared"
        class="absolute top-2.5 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-950/95 via-amber-900/95 to-yellow-950/95 border-2 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.6)] backdrop-blur-md animate-pulse select-none"
      >
        <span class="text-base sm:text-lg">👑</span>
        <span class="text-xs sm:text-sm font-black text-amber-300 font-serif-title">
          天降特殊牌型【{{ mySpecialHand.name }}】
        </span>
        <span class="text-[10px] sm:text-xs font-mono font-bold text-yellow-200 bg-amber-500/30 px-2 py-0.5 rounded-full border border-amber-400/50">
          +{{ mySpecialHand.bonusWater }}水 · 免比直赢
        </span>
        <button
          type="button"
          @click="showSpecialHandModal = true"
          class="ml-1 px-2.5 py-0.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-black text-[11px] shadow transition-all active:scale-95 cursor-pointer"
        >
          查看 / 直接开牌
        </button>
      </div>

      <!-- 快捷理牌与战术浮动反馈吐司 (Toast) -->
      <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-2 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 -translate-y-2 scale-95"
      >
        <div
          v-if="actionNotification"
          class="absolute top-12 left-1/2 transform -translate-x-1/2 z-30 px-4 py-1.5 rounded-full bg-black/90 border border-amber-400/80 text-amber-200 text-xs sm:text-sm font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 pointer-events-none select-none max-w-[90vw] truncate"
        >
          <span>{{ actionNotification }}</span>
        </div>
      </transition>

      <!-- In-Table Floating Strategy & Compare Controls (Left Sidebar) -->
      <div class="absolute bottom-4 left-4 z-20 flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl bg-black/75 border border-white/10 backdrop-blur-xs shadow-xl">
        <button
          type="button"
          @click="handleCompare"
          :disabled="!isSetComplete || (isWatering && !mySpecialHand) || hasCompared"
          class="w-24 px-2 py-2 text-xs font-extrabold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white disabled:opacity-30 shadow-[0_4px_16px_rgba(59,130,246,0.6)] ring-2 ring-blue-400 transition-all active:scale-95 cursor-pointer"
        >
          ⚔️ 开牌比水
        </button>

        <div
          v-if="mySpecialHand"
          @click="showSpecialHandModal = true"
          class="w-24 px-1.5 py-1 text-[10px] font-bold rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black border border-amber-300 shadow-md text-center leading-tight cursor-pointer animate-pulse active:scale-95 transition-all"
          title="点击查看特殊牌型详情并直接开牌"
        >
          👑 {{ mySpecialHand.name }}
          <div class="text-[9px] font-mono font-black">+{{ mySpecialHand.bonusWater }}水免比</div>
        </div>

        <button
          type="button"
          @click="applyStrategy('solid')"
          class="w-24 px-2 py-1.5 text-xs font-medium rounded-xl bg-[#1C1612] hover:bg-[#2A211B] border border-white/10 text-blue-200 transition-colors cursor-pointer"
        >
          稳健葫芦
        </button>
        <button
          type="button"
          @click="applyStrategy('flush')"
          class="w-24 px-2 py-1.5 text-xs font-medium rounded-xl bg-[#1C1612] hover:bg-[#2A211B] border border-white/10 text-blue-200 transition-colors cursor-pointer"
        >
          同花攻势
        </button>
        <button
          type="button"
          @click="applyStrategy('balanced')"
          class="w-24 px-2 py-1.5 text-xs font-medium rounded-xl bg-[#1C1612] hover:bg-[#2A211B] border border-white/10 text-blue-200 transition-colors cursor-pointer"
        >
          三道均衡
        </button>
        <div class="w-full border-t border-white/10 my-0.5"></div>
        <button
          type="button"
          @click="applyStrategy('optimal')"
          class="w-24 px-2 py-1.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-md transition-all active:scale-95 cursor-pointer"
        >
          ⚡ 一键最优
        </button>
        <button
          type="button"
          @click="undo"
          :disabled="historyStack.length === 0"
          class="w-24 px-2 py-1.5 text-xs font-bold rounded-xl bg-[#26201B] hover:bg-[#322B26] text-amber-300 border border-[#3A3029] transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ↶ 撤销 ({{ historyStack.length }})
        </button>
      </div>

      <!-- Gunshot / Grand Slam Animation Overlay -->
      <div
        v-if="showGunshotAnim"
        class="absolute inset-0 bg-black/60 flex items-center justify-center z-30 pointer-events-none animate-pulse"
      >
        <div class="text-center">
          <div class="text-5xl mb-2">💥 🔫 💥</div>
          <div class="text-2xl sm:text-3xl font-extrabold text-amber-400 font-serif-title">
            {{ isGrandSlam ? '【全垒打！通关所有对手 · 水数翻倍！】' : '【连环打枪！全胜对手！】' }}
          </div>
        </div>
      </div>

      <!-- 特殊牌型弹窗说明与一键通关结算 -->
      <div
        v-if="showSpecialHandModal && mySpecialHand"
        class="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none"
      >
        <div class="max-w-md w-full bg-gradient-to-b from-[#1C1612] via-[#2A1E14] to-[#140E0A] border-2 border-amber-400 rounded-3xl p-6 shadow-[0_0_60px_rgba(245,158,11,0.5)] text-center flex flex-col items-center">
          <div class="text-5xl mb-2">👑 🐉 👑</div>
          <span class="text-xs font-mono font-extrabold text-amber-400 tracking-wider">十三水至尊荣耀 · 特殊牌型</span>
          <h2 class="text-2xl sm:text-3xl font-black text-amber-300 font-serif-title mt-1.5">
            {{ mySpecialHand.name }}
          </h2>
          <div class="mt-2.5 px-3 py-1 rounded-full bg-amber-500/25 border border-amber-400/60 text-amber-200 font-mono font-extrabold text-sm">
            通关胜全场 +{{ mySpecialHand.bonusWater }} 水 · 免比三道
          </div>
          <p class="text-xs sm:text-sm text-[#E5D5C0] mt-3 leading-relaxed px-2 font-medium">
            {{ mySpecialHand.desc }}
          </p>

          <div class="flex items-center gap-3 mt-6 w-full">
            <button
              type="button"
              @click="confirmSpecialHandShowdown"
              class="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs sm:text-sm shadow-xl ring-2 ring-amber-300 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>⚡ 特殊牌直接开牌 (+{{ mySpecialHand.bonusWater }}水)</span>
            </button>
            <button
              type="button"
              @click="showSpecialHandModal = false"
              class="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-[#E5D5C0] font-bold text-xs sm:text-sm border border-white/20 transition-all active:scale-95 cursor-pointer"
            >
              体验常规理牌
            </button>
          </div>
        </div>
      </div>

      <!-- 全新田字型比水全景总谱 (四人场田字四格同屏全展，八人场支持翻页查看后四席) -->
      <div
        v-if="hasCompared"
        class="absolute inset-0 backdrop-blur-md flex flex-col p-2 sm:p-3 z-40 overflow-hidden select-none"
        :style="{
          backgroundColor: props.tableTheme?.feltColor || '#1D4ED8',
          background: `radial-gradient(ellipse at 50% 45%, ${props.tableTheme?.highlightColor || '#3B82F6'}dd 0%, ${props.tableTheme?.feltColor || '#1D4ED8'}f2 60%, ${props.tableTheme?.edgeColor || '#1E3A8A'}fb 100%)`
        }"
      >
        <!-- 顶部控制与结算横幅 -->
        <div class="h-11 shrink-0 flex items-center justify-between border-b border-white/10 px-2 pb-1.5 gap-2">
          <!-- 左侧：标题与场次标识 -->
          <div class="flex items-center gap-2 shrink-0">
            <h3 class="text-xs sm:text-sm font-bold text-amber-300 font-serif-title flex items-center gap-1.5">
              <span>⚔️</span>
              <span>比水总谱</span>
              <span class="text-[10px] text-amber-200/80 font-sans font-normal hidden sm:inline">(田字全景对决)</span>
            </h3>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-mono font-bold">
              {{ isEightPlayer ? (showdownPage === 0 ? '八人场 · 第 1/2 页 (前四席)' : '八人场 · 第 2/2 页 (后四席)') : '四人场 · 四席田字全景' }}
            </span>
          </div>

          <!-- 中间：总净水与战报 -->
          <div class="flex items-center gap-2 sm:gap-3 shrink-0">
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] text-[#A89887] hidden sm:inline">本局总净水:</span>
              <span
                class="text-sm sm:text-base font-black font-mono tracking-tight"
                :class="totalScore >= 0 ? 'text-amber-400' : 'text-red-400'"
              >
                {{ totalScore >= 0 ? `+${totalScore}` : totalScore }}
                <span class="text-[10px] text-amber-200/70 font-sans">水</span>
              </span>
              <span class="text-xs font-mono font-bold text-amber-300 ml-1">
                🪙 {{ totalScore >= 0 ? `+${totalScore * 50}` : `${totalScore * 50}` }} 分
              </span>
            </div>

            <span v-if="isGrandSlam" class="text-[10px] px-2 py-0.5 rounded-full bg-red-600/30 text-amber-300 border border-amber-400/50 font-bold animate-pulse shrink-0 hidden md:inline">
              🔥 全垒打 (翻倍)
            </span>
          </div>

          <!-- 右侧：八人场翻页按钮、退出与继续游戏 -->
          <div class="flex items-center gap-1.5 shrink-0">
            <!-- 八人场翻页按钮 -->
            <button
              v-if="isEightPlayer"
              type="button"
              @click="showdownPage = showdownPage === 0 ? 1 : 0"
              class="px-2.5 py-1 text-xs font-bold rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border border-blue-400 shadow-md flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
            >
              <span>📄</span>
              <span>{{ showdownPage === 0 ? '翻页后四席 (1/2 →)' : '翻页前四席 (← 2/2)' }}</span>
            </button>

            <button
              type="button"
              @click="emit('exit')"
              class="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#26201B] hover:bg-red-950/80 text-[#D6C7B2] hover:text-red-300 border border-white/15 transition-all active:scale-95 cursor-pointer"
              title="返回茶楼大厅"
            >
              <span>🚪 退出</span>
            </button>

            <button
              type="button"
              @click="dealNewMatch"
              class="px-3 py-1 text-xs font-extrabold rounded-lg bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white shadow-md ring-1 ring-amber-400 transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <span>⚡ 再战十三水</span>
            </button>
          </div>
        </div>

        <!-- 8人场处于第2页时的本家信息小横幅 (方便玩家对照自己的牌) -->
        <div
          v-if="isEightPlayer && showdownPage === 1"
          class="shrink-0 px-2.5 py-1 my-1 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-[11px]"
        >
          <span class="font-bold text-amber-300 flex items-center gap-1">
            <span>👑 本家手牌提示:</span>
            <span class="text-white font-normal font-mono">头道 [{{ frontTierLabel }}] · 中道 [{{ midTierLabel }}] · 尾道 [{{ backTierLabel }}]</span>
          </span>
          <span class="font-mono font-bold text-amber-400">总分: {{ totalScore >= 0 ? `+${totalScore}` : totalScore }} 水</span>
        </div>

        <!-- 田字型四格对决核心区 (2列 × 2行) -->
        <div class="flex-1 min-h-0 grid grid-cols-2 grid-rows-2 gap-2 p-0.5 mt-1">
          <div
            v-for="p in displayedShowdownPlayers"
            :key="p.seat"
            class="relative h-full min-h-0 flex flex-col rounded-xl border p-2 sm:p-2.5 overflow-hidden shadow-lg transition-all"
            :class="p.isMe ? 'border-amber-500/70 ring-1 ring-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.25)]' : 'border-white/20 hover:border-white/40'"
            :style="{
              background: p.isMe
                ? `linear-gradient(135deg, ${props.tableTheme?.highlightColor || '#3B82F6'}50 0%, ${props.tableTheme?.feltColor || '#1D4ED8'}f2 100%)`
                : `linear-gradient(135deg, ${props.tableTheme?.edgeColor || '#1E3A8A'}cc 0%, ${props.tableTheme?.feltColor || '#1D4ED8'}cc 100%)`,
              borderColor: p.isMe ? '#F59E0B' : `${props.tableTheme?.highlightColor || '#3B82F6'}66`
            }"
          >
            <!-- 席位玩家标头 -->
            <div class="flex items-center justify-between pb-1 mb-1 border-b border-white/10 shrink-0 text-xs">
              <div class="flex items-center gap-1.5 truncate">
                <span class="text-sm shrink-0">{{ p.avatar }}</span>
                <span :class="p.isMe ? 'text-amber-300 font-extrabold' : 'text-[#D6C7B2] font-bold'" class="truncate text-xs sm:text-sm font-serif-title">
                  {{ p.name }}
                </span>
                <span v-if="p.isMe" class="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold shrink-0">
                  本家
                </span>
                <span v-if="p.specialHand" class="text-[9px] px-1.5 py-0.2 rounded bg-yellow-500/30 text-yellow-300 border border-yellow-400/50 font-bold shrink-0">
                  👑 {{ p.specialHand.name }} (+{{ p.specialHand.bonusWater }}水)
                </span>
                <span v-if="p.isFoul" class="text-[9px] px-1.5 py-0.2 rounded bg-red-600/30 text-red-300 border border-red-500/50 font-bold shrink-0">
                  ⚠️ 倒水
                </span>
              </div>

              <div class="flex items-center gap-1 shrink-0 ml-1">
                <span v-if="p.isShot && !p.isMe" class="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/25 text-amber-300 border border-amber-400/40 font-bold">
                  💥 打枪
                </span>
                <span
                  class="font-mono font-bold text-xs px-2 py-0.5 rounded-full border shadow-xs"
                  :class="p.isMe ? (totalScore >= 0 ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50' : 'bg-red-950/80 text-red-300 border-red-500/50') : (p.netWater >= 0 ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50' : 'bg-red-950/80 text-red-300 border-red-500/50')"
                >
                  {{ p.isMe ? (totalScore >= 0 ? `+${totalScore}` : totalScore) + ' 水 (总分)' : (p.netWater > 0 ? `我胜 +${p.netWater}` : p.netWater < 0 ? `我负 ${p.netWater}` : '打和 0') + ' 水' }}
                </span>
              </div>
            </div>

            <!-- 三道牌型展示区 (头道3张、中道5张、尾道5张) -->
            <div class="flex-1 min-h-0 flex flex-col justify-between gap-1 sm:gap-1.5">
              <!-- 1. 头道 (3张) - 极致聚焦左上角牌面与花色（特大显示，下部与右部裁切） -->
              <div
                class="flex-1 min-h-0 flex items-center justify-between rounded-xl px-2 py-0 border relative overflow-hidden shadow-inner"
                :style="{
                  backgroundColor: `${props.tableTheme?.edgeColor || '#1E3A8A'}88`,
                  borderColor: `${props.tableTheme?.highlightColor || '#3B82F6'}40`
                }"
              >
                <div class="w-12 sm:w-14 shrink-0 flex flex-col justify-center leading-tight z-10 pr-0.5">
                  <span class="text-amber-400 font-black text-[11px] sm:text-xs tracking-tight">头道</span>
                  <span class="text-white/85 font-bold truncate text-[9px] sm:text-[10px] mt-0.5">{{ p.frontLabel }}</span>
                </div>

                <div class="flex-1 min-w-0 h-full relative overflow-hidden flex items-start">
                  <div
                    v-for="(c, cIdx) in p.front"
                    :key="c.id"
                    class="absolute top-0 w-11 sm:w-13 md:w-14.5 h-[195%] sm:h-[225%] md:h-[250%] min-h-[64px] sm:min-h-[76px] bg-white rounded-t-md shadow-xl overflow-hidden border border-neutral-600 ring-1 ring-black/40"
                    :style="{ left: `calc(${cIdx} * 32px)`, zIndex: cIdx + 1 }"
                  >
                    <!-- 聚焦并超大放大左上角：点数与花色占据整个视口 -->
                    <img
                      :src="getCardImagePath(c)"
                      :alt="c.label + c.suit"
                      class="w-full h-full object-contain object-left-top select-none pointer-events-none transform scale-[2.75] -translate-x-[2%] -translate-y-[2%] origin-top-left"
                    />
                  </div>
                </div>

                <div class="shrink-0 text-right ml-1 z-10">
                  <template v-if="p.isMe">
                    <span v-if="myTierBonuses.head" class="text-[9px] font-black text-amber-300 bg-amber-500/25 px-1.5 py-0.5 rounded border border-amber-400/40 shadow-xs">
                      {{ myTierBonuses.head }}
                    </span>
                  </template>
                  <template v-else-if="p.tiersDetail?.[0]">
                    <span
                      class="text-[10px] font-mono font-black px-1.5 py-0.5 rounded border shadow-xs"
                      :class="p.tiersDetail[0].winner === 'me' ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50' : p.tiersDetail[0].winner === 'opp' ? 'bg-red-950/90 text-red-300 border-red-500/50' : 'bg-neutral-900 text-neutral-400 border-white/15'"
                    >
                      {{ p.tiersDetail[0].winner === 'me' ? `+${p.tiersDetail[0].netWater}水` : p.tiersDetail[0].winner === 'opp' ? `${p.tiersDetail[0].netWater}水` : '0水' }}
                    </span>
                  </template>
                </div>
              </div>

              <!-- 2. 中道 (5张) - 极致聚焦左上角牌面与花色（特大显示，下部与右部裁切） -->
              <div
                class="flex-1 min-h-0 flex items-center justify-between rounded-xl px-2 py-0 border relative overflow-hidden shadow-inner"
                :style="{
                  backgroundColor: `${props.tableTheme?.edgeColor || '#1E3A8A'}88`,
                  borderColor: `${props.tableTheme?.highlightColor || '#3B82F6'}40`
                }"
              >
                <div class="w-12 sm:w-14 shrink-0 flex flex-col justify-center leading-tight z-10 pr-0.5">
                  <span class="text-blue-400 font-black text-[11px] sm:text-xs tracking-tight">中道</span>
                  <span class="text-white/85 font-bold truncate text-[9px] sm:text-[10px] mt-0.5">{{ p.midLabel }}</span>
                </div>

                <div class="flex-1 min-w-0 h-full relative overflow-hidden flex items-start">
                  <div
                    v-for="(c, cIdx) in p.mid"
                    :key="c.id"
                    class="absolute top-0 w-10 sm:w-12 md:w-13.5 h-[195%] sm:h-[225%] md:h-[250%] min-h-[64px] sm:min-h-[76px] bg-white rounded-t-md shadow-xl overflow-hidden border border-neutral-600 ring-1 ring-black/40"
                    :style="{ left: `calc(${cIdx} * 23px)`, zIndex: cIdx + 1 }"
                  >
                    <!-- 聚焦并超大放大左上角：点数与花色占据整个视口 -->
                    <img
                      :src="getCardImagePath(c)"
                      :alt="c.label + c.suit"
                      class="w-full h-full object-contain object-left-top select-none pointer-events-none transform scale-[2.75] -translate-x-[2%] -translate-y-[2%] origin-top-left"
                    />
                  </div>
                </div>

                <div class="shrink-0 text-right ml-1 z-10">
                  <template v-if="p.isMe">
                    <span v-if="myTierBonuses.mid" class="text-[9px] font-black text-blue-300 bg-blue-500/25 px-1.5 py-0.5 rounded border border-blue-400/40 shadow-xs">
                      {{ myTierBonuses.mid }}
                    </span>
                  </template>
                  <template v-else-if="p.tiersDetail?.[1]">
                    <span
                      class="text-[10px] font-mono font-black px-1.5 py-0.5 rounded border shadow-xs"
                      :class="p.tiersDetail[1].winner === 'me' ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50' : p.tiersDetail[1].winner === 'opp' ? 'bg-red-950/90 text-red-300 border-red-500/50' : 'bg-neutral-900 text-neutral-400 border-white/15'"
                    >
                      {{ p.tiersDetail[1].winner === 'me' ? `+${p.tiersDetail[1].netWater}水` : p.tiersDetail[1].winner === 'opp' ? `${p.tiersDetail[1].netWater}水` : '0水' }}
                    </span>
                  </template>
                </div>
              </div>

              <!-- 3. 尾道 (5张) - 极致聚焦左上角牌面与花色（特大显示，下部与右部裁切） -->
              <div
                class="flex-1 min-h-0 flex items-center justify-between rounded-xl px-2 py-0 border relative overflow-hidden shadow-inner"
                :style="{
                  backgroundColor: `${props.tableTheme?.edgeColor || '#1E3A8A'}88`,
                  borderColor: `${props.tableTheme?.highlightColor || '#3B82F6'}40`
                }"
              >
                <div class="w-12 sm:w-14 shrink-0 flex flex-col justify-center leading-tight z-10 pr-0.5">
                  <span class="text-purple-400 font-black text-[11px] sm:text-xs tracking-tight">尾道</span>
                  <span class="text-white/85 font-bold truncate text-[9px] sm:text-[10px] mt-0.5">{{ p.backLabel }}</span>
                </div>

                <div class="flex-1 min-w-0 h-full relative overflow-hidden flex items-start">
                  <div
                    v-for="(c, cIdx) in p.back"
                    :key="c.id"
                    class="absolute top-0 w-10 sm:w-12 md:w-13.5 h-[195%] sm:h-[225%] md:h-[250%] min-h-[64px] sm:min-h-[76px] bg-white rounded-t-md shadow-xl overflow-hidden border border-neutral-600 ring-1 ring-black/40"
                    :style="{ left: `calc(${cIdx} * 23px)`, zIndex: cIdx + 1 }"
                  >
                    <!-- 聚焦并超大放大左上角：点数与花色占据整个视口 -->
                    <img
                      :src="getCardImagePath(c)"
                      :alt="c.label + c.suit"
                      class="w-full h-full object-contain object-left-top select-none pointer-events-none transform scale-[2.75] -translate-x-[2%] -translate-y-[2%] origin-top-left"
                    />
                  </div>
                </div>

                <div class="shrink-0 text-right ml-1 z-10">
                  <template v-if="p.isMe">
                    <span v-if="myTierBonuses.tail" class="text-[9px] font-black text-purple-300 bg-purple-500/25 px-1.5 py-0.5 rounded border border-purple-400/40 shadow-xs">
                      {{ myTierBonuses.tail }}
                    </span>
                  </template>
                  <template v-else-if="p.tiersDetail?.[2]">
                    <span
                      class="text-[10px] font-mono font-black px-1.5 py-0.5 rounded border shadow-xs"
                      :class="p.tiersDetail[2].winner === 'me' ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50' : p.tiersDetail[2].winner === 'opp' ? 'bg-red-950/90 text-red-300 border-red-500/50' : 'bg-neutral-900 text-neutral-400 border-white/15'"
                    >
                      {{ p.tiersDetail[2].winner === 'me' ? `+${p.tiersDetail[2].netWater}水` : p.tiersDetail[2].winner === 'opp' ? `${p.tiersDetail[2].netWater}水` : '0水' }}
                    </span>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { soundFX } from '../../utils/sound';
import { haptics } from '../../utils/haptics';
import { TableTheme } from '../../utils/theme';
import { getCanvasEventCoords } from '../../utils/canvasCoords';
import { renderPlayingCard, preloadCardAssets, onCardAssetsLoaded, getCardImagePath } from '../../utils/cardAssets';
import {
  compareTwoPlayers,
  ThirteenVersusResult,
  SSSCard,
  detectSpecialHand,
  SpecialHandResult,
  getTierBonusWater,
  evaluate3CardTier,
  evaluate5CardTier,
  isFoulHand,
  checkWateringDetail,
  TierMatchDetail,
  autoArrangeThirteen,
} from '../../engine/shisanshuiRules';

interface Card {
  id: string;
  rank: number; // 2..14
  suit: '♠' | '♥' | '♣' | '♦';
  label: string;
  isRed: boolean;
}

interface PlayerTiers {
  front: Card[];
  mid: Card[];
  back: Card[];
}

interface HistorySnapshot {
  front: Card[];
  mid: Card[];
  back: Card[];
}

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  draggedCard: Card | null;
  draggedCards: Card[];
  sourceTier: 'front' | 'mid' | 'back' | null;
  hoverTier: 'front' | 'mid' | 'back' | null;
  hoverCardId: string | null;
  pointerDownCard: Card | null;
  pointerDownTier: 'front' | 'mid' | 'back' | null;
  pointerDownTime: number;
}

const props = defineProps<{
  tableTheme?: TableTheme;
  isRotated90?: boolean;
  sceneMode?: string;
  roomPlayers?: any[];
}>();

const emit = defineEmits<{
  (e: 'move', payload: any): void;
  (e: 'restart'): void;
  (e: 'fx', payload: any): void;
  (e: 'exit'): void;
}>();

watch(() => props.tableTheme, () => {
  drawBoard();
});

watch(() => props.sceneMode, () => {
  dealNewMatch();
});

const isEightPlayer = computed(() => {
  return props.sceneMode === 'eight-realtime' || props.sceneMode === 'eight-booking';
});

const isBookingScene = computed(() => {
  return props.sceneMode === 'four-booking' || props.sceneMode === 'eight-booking';
});

const currentSceneLabel = computed(() => {
  if (props.sceneMode === 'eight-realtime') return '八人实时场 · 两副扑克(104张全发)';
  if (props.sceneMode === 'eight-booking') return '八人预约包厢 · 两副扑克(104张全发)';
  if (props.sceneMode === 'four-booking') return '四人预约雅座 · 一副扑克(52张全发)';
  return '四人实时场 · 一副扑克(52张全发)';
});

const containerRef = ref<HTMLDivElement | null>(null);
const tableWidthPx = ref(680);
const tableHeightPx = ref(430);
let resizeObserver: ResizeObserver | null = null;
let rafId: number | null = null;
let cleanupCardLoader: (() => void) | null = null;

function updateDimensions() {
  if (!containerRef.value) return;
  const availW = containerRef.value.clientWidth || 680;
  const availH = containerRef.value.clientHeight || 430;
  const targetAspect = 680 / 430;

  let w = availW;
  let h = w / targetAspect;

  if (h > availH) {
    h = availH;
    w = h * targetAspect;
  }

  tableWidthPx.value = Math.max(280, Math.floor(w));
  tableHeightPx.value = Math.max(180, Math.floor(h));
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(() => drawBoard());
}

const canvasRef = ref<HTMLCanvasElement | null>(null);
const fullHand = ref<Card[]>([]);
const frontTier = ref<Card[]>([]);
const midTier = ref<Card[]>([]);
const backTier = ref<Card[]>([]);
const selectedIds = ref<Set<string>>(new Set<string>());
const hasCompared = ref(false);
const showGunshotAnim = ref(false);
const isGrandSlam = ref(false);
const totalScore = ref(16);
const showdownPage = ref<number>(0);
const showSpecialHandModal = ref(false);
const actionNotification = ref<string | null>(null);
let toastTimer: any = null;

function showToast(msg: string) {
  actionNotification.value = msg;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    actionNotification.value = null;
  }, 3600);
}

function confirmSpecialHandShowdown() {
  showSpecialHandModal.value = false;
  if (!isSetComplete.value) {
    applyStrategy('optimal', false);
  }
  handleCompare();
}

const frontTierLabel = ref('乌龙');
const midTierLabel = ref('顺子');
const backTierLabel = ref('葫芦');

// History stack for instant Undo
const historyStack = ref<HistorySnapshot[]>([]);

function pushHistory() {
  historyStack.value.push({
    front: [...frontTier.value],
    mid: [...midTier.value],
    back: [...backTier.value],
  });
  if (historyStack.value.length > 25) {
    historyStack.value.shift();
  }
}

function undo() {
  if (historyStack.value.length === 0) return;
  const snapshot = historyStack.value.pop()!;
  frontTier.value = [...snapshot.front];
  midTier.value = [...snapshot.mid];
  backTier.value = [...snapshot.back];
  selectedIds.value.clear();
  updateLabels();
  soundFX.playCardSnap();
  drawBoard();
}

// Map tiers for clean access
const tiersMap = {
  front: frontTier,
  mid: midTier,
  back: backTier,
};

// Drag and drop state
const dragState = ref<DragState>({
  isDragging: false,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  draggedCard: null,
  draggedCards: [],
  sourceTier: null,
  hoverTier: null,
  hoverCardId: null,
  pointerDownCard: null,
  pointerDownTier: null,
  pointerDownTime: 0,
});

// 3 Opponent Bot Hands and active opponent switcher
const botNames = ['西席 (罗宋巧手)', '北席 (十三飞龙)', '东席 (七星居士)'];
const botHands = ref<PlayerTiers[]>([]);
const opponentsBreakdown = ref<any[]>([]);
const activeOpponentIdx = ref(0);

const currentOpponentHands = computed<PlayerTiers>(() => {
  return botHands.value[activeOpponentIdx.value] || { front: [], mid: [], back: [] };
});

const currentOpponentInfo = computed(() => {
  return opponentsBreakdown.value[activeOpponentIdx.value] || null;
});

function scrollToOpponent(idx: number) {
  if (idx < 0 || idx >= botHands.value.length) return;
  activeOpponentIdx.value = idx;
  soundFX.playTap();
}

function compareTier(myCards: Card[], oppCards: Card[]): { text: string; delta: number } {
  if (!myCards.length || !oppCards.length) return { text: '平 0水', delta: 0 };
  const myEval = myCards.length === 3 ? evaluate3CardTier(myCards.map(toSSSCard)) : evaluate5CardTier(myCards.map(toSSSCard));
  const oppEval = oppCards.length === 3 ? evaluate3CardTier(oppCards.map(toSSSCard)) : evaluate5CardTier(oppCards.map(toSSSCard));
  if (myEval.scoreRank > oppEval.scoreRank) return { text: '我胜 +1水', delta: 1 };
  if (myEval.scoreRank < oppEval.scoreRank) return { text: '我负 -1水', delta: -1 };
  return { text: '平 0水', delta: 0 };
}

const isSetComplete = computed(() => (frontTier.value.length + midTier.value.length + backTier.value.length) === 13);

function toSSSCard(c: Card): SSSCard {
  return {
    id: c.id,
    rank: c.rank,
    suit: c.suit,
    suitVal: c.suit === '♠' ? 4 : c.suit === '♥' ? 3 : c.suit === '♣' ? 2 : 1,
    label: c.label,
    isRed: c.isRed,
  };
}

// Check for natural Special Hand (十三水至尊特殊牌型)
const mySpecialHand = computed(() => {
  const pool = isSetComplete.value
    ? [...frontTier.value, ...midTier.value, ...backTier.value]
    : fullHand.value;
  if (!pool || pool.length !== 13) return null;
  const cards = pool.map(toSSSCard);
  return detectSpecialHand(cards);
});

// Precise 13-Water watering diagnosis with exact reason and quick-fix target
const wateringDetail = computed(() => {
  if (!isSetComplete.value) {
    return {
      isWater: false,
      reason: '',
      violatingTier: null as 'front' | 'mid' | 'back' | null,
      fixAction: 'none' as const,
      fixLabel: '',
    };
  }

  // 特殊牌型免检倒水，直接通关
  if (mySpecialHand.value) {
    return {
      isWater: false,
      reason: '',
      violatingTier: null,
      fixAction: 'none' as const,
      fixLabel: '',
    };
  }

  return checkWateringDetail(
    frontTier.value.map(toSSSCard),
    midTier.value.map(toSSSCard),
    backTier.value.map(toSSSCard)
  );
});

const isWatering = computed(() => wateringDetail.value.isWater);

function findCardById(id: string): Card | null {
  for (const c of frontTier.value) if (c.id === id) return c;
  for (const c of midTier.value) if (c.id === id) return c;
  for (const c of backTier.value) if (c.id === id) return c;
  return null;
}

function getHandLabel(cards: Card[]): string {
  if (cards.length === 0) return '空';
  if (cards.length === 3) {
    return evaluate3CardTier(cards.map(toSSSCard)).name;
  }
  return evaluate5CardTier(cards.map(toSSSCard)).name;
}

export interface ShowdownPlayer {
  seat: number;
  name: string;
  isMe: boolean;
  avatar: string;
  front: Card[];
  mid: Card[];
  back: Card[];
  netWater: number;
  isShot: boolean;
  isFoul: boolean;
  specialHand: SpecialHandResult | null;
  frontLabel: string;
  midLabel: string;
  backLabel: string;
  tiersDetail?: TierMatchDetail[];
  summary?: string;
}

const myTierBonuses = computed(() => {
  const h = evaluate3CardTier(frontTier.value.map(toSSSCard));
  const m = evaluate5CardTier(midTier.value.map(toSSSCard));
  const t = evaluate5CardTier(backTier.value.map(toSSSCard));
  return {
    head: getTierBonusWater('head', h).desc,
    mid: getTierBonusWater('mid', m).desc,
    tail: getTierBonusWater('tail', t).desc,
  };
});

const allShowdownPlayers = computed<ShowdownPlayer[]>(() => {
  const list: ShowdownPlayer[] = [];

  // 1. 本家 (我) - Seat 0
  const myCardsSSS = [...frontTier.value, ...midTier.value, ...backTier.value].map(toSSSCard);
  const mySpecial = detectSpecialHand(myCardsSSS);
  const myFoul = isFoulHand(
    frontTier.value.map(toSSSCard),
    midTier.value.map(toSSSCard),
    backTier.value.map(toSSSCard)
  );

  list.push({
    seat: 0,
    name: '我 (本家)',
    isMe: true,
    avatar: '👑',
    front: frontTier.value,
    mid: midTier.value,
    back: backTier.value,
    netWater: totalScore.value,
    isShot: opponentsBreakdown.value.some((o) => o.isShot),
    isFoul: myFoul && !mySpecial,
    specialHand: mySpecial,
    frontLabel: frontTierLabel.value,
    midLabel: midTierLabel.value,
    backLabel: backTierLabel.value,
    summary: `本局总战果：${totalScore.value >= 0 ? `+${totalScore.value}` : totalScore.value} 水`,
  });

  // 2. 对手席位
  const bNames = props.roomPlayers && props.roomPlayers.length > 1
    ? props.roomPlayers.slice(1).map((p: any, idx: number) => {
        const prefix = isEightPlayer.value ? `席位${idx + 2}` : ['西席', '北席', '东席'][idx] || `牌友${idx + 2}`;
        return `${prefix} (${p.name})`;
      })
    : (isEightPlayer.value
        ? ['一席 (牌友)', '二席 (牌友)', '三席 (牌友)', '四席 (牌友)', '五席 (牌友)', '六席 (牌友)', '七席 (牌友)']
        : ['西席 (牌友)', '北席 (牌友)', '东席 (牌友)']);

  const count = botHands.value.length;
  for (let i = 0; i < count; i++) {
    const opp = botHands.value[i];
    const oppInfo = opponentsBreakdown.value[i];
    if (!opp) continue;

    const oppCardsSSS = [...opp.front, ...opp.mid, ...opp.back].map(toSSSCard);
    const oppSpecial = detectSpecialHand(oppCardsSSS);
    const oppFoul = isFoulHand(
      opp.front.map(toSSSCard),
      opp.mid.map(toSSSCard),
      opp.back.map(toSSSCard)
    );

    list.push({
      seat: i + 1,
      name: bNames[i] || `牌友${i + 1}`,
      isMe: false,
      avatar: props.roomPlayers?.[i + 1]?.avatar || '👤',
      front: opp.front,
      mid: opp.mid,
      back: opp.back,
      netWater: oppInfo ? oppInfo.netWater : 0,
      isShot: Boolean(oppInfo?.isShot),
      isFoul: oppFoul && !oppSpecial,
      specialHand: oppSpecial,
      frontLabel: getHandLabel(opp.front),
      midLabel: getHandLabel(opp.mid),
      backLabel: getHandLabel(opp.back),
      tiersDetail: oppInfo?.tiers,
      summary: oppInfo?.summary,
    });
  }

  return list;
});

const displayedShowdownPlayers = computed<ShowdownPlayer[]>(() => {
  if (!isEightPlayer.value) {
    return allShowdownPlayers.value.slice(0, 4);
  }
  if (showdownPage.value === 0) {
    return allShowdownPlayers.value.slice(0, 4);
  } else {
    return allShowdownPlayers.value.slice(4, 8);
  }
});

const SUITS: { suit: '♠' | '♥' | '♣' | '♦'; isRed: boolean }[] = [
  { suit: '♠', isRed: false },
  { suit: '♥', isRed: true },
  { suit: '♣', isRed: false },
  { suit: '♦', isRed: true },
];

const RANKS = [
  { rank: 2, label: '2' }, { rank: 3, label: '3' }, { rank: 4, label: '4' },
  { rank: 5, label: '5' }, { rank: 6, label: '6' }, { rank: 7, label: '7' },
  { rank: 8, label: '8' }, { rank: 9, label: '9' }, { rank: 10, label: '10' },
  { rank: 11, label: 'J' }, { rank: 12, label: 'Q' }, { rank: 13, label: 'K' },
  { rank: 14, label: 'A' },
];

function createDecks(deckCount: number): Card[] {
  const pool: Card[] = [];
  for (let d = 0; d < deckCount; d++) {
    for (const r of RANKS) {
      for (const s of SUITS) {
        pool.push({
          id: `${r.label}-${s.suit}-${d}`,
          rank: r.rank,
          suit: s.suit,
          label: r.label,
          isRed: s.isRed,
        });
      }
    }
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function toCards(sssCards: SSSCard[], lookupCards: Card[]): Card[] {
  const map = new Map(lookupCards.map((c) => [c.id, c]));
  return sssCards.map((sc) => map.get(sc.id) || {
    id: sc.id,
    rank: sc.rank,
    suit: sc.suit,
    label: sc.label,
    isRed: sc.isRed,
  });
}

function partitionHandLegally(cards13: Card[], strat: 'optimal' | 'solid' | 'flush' | 'balanced' = 'optimal'): PlayerTiers {
  const result = autoArrangeThirteen(cards13.map(toSSSCard), strat);
  return {
    front: toCards(result.head, cards13),
    mid: toCards(result.mid, cards13),
    back: toCards(result.tail, cards13),
  };
}

function dealNewMatch() {
  const deckCount = isEightPlayer.value ? 2 : 1;
  const oppCount = isEightPlayer.value ? 7 : 3;
  const deck = createDecks(deckCount);
  fullHand.value = deck.slice(0, 13);

  // Opponents (3 bots for 4-player, 7 bots for 8-player) - 使用权威算法理牌
  const opps: PlayerTiers[] = [];
  for (let i = 0; i < oppCount; i++) {
    const oppCards = deck.slice(13 + i * 13, 13 + (i + 1) * 13);
    const oppArrangement = autoArrangeThirteen(oppCards.map(toSSSCard), 'optimal');
    opps.push({
      front: toCards(oppArrangement.head, oppCards),
      mid: toCards(oppArrangement.mid, oppCards),
      back: toCards(oppArrangement.tail, oppCards),
    });
  }
  botHands.value = opps;
  activeOpponentIdx.value = 0;
  showdownPage.value = 0;

  selectedIds.value.clear();
  historyStack.value = [];
  hasCompared.value = false;
  showGunshotAnim.value = false;

  // 玩家初始即应用全维度数学一键最优
  applyStrategy('optimal', false);

  // 若开局检测到特殊牌型，震撼弹窗提醒并播放庆贺特效
  const special = detectSpecialHand(fullHand.value.map(toSSSCard));
  if (special) {
    soundFX.playVictory();
    haptics.victory();
    showSpecialHandModal.value = true;
    showToast(`👑 恭喜抓到特殊牌型【${special.name}】！胜全场 +${special.bonusWater}水`);
  }

  emit('restart');
}

function applyStrategy(strat: 'optimal' | 'solid' | 'flush' | 'balanced', recordHistory = true) {
  if (recordHistory) pushHistory();
  const currentPool = (frontTier.value.length + midTier.value.length + backTier.value.length === 13)
    ? [...frontTier.value, ...midTier.value, ...backTier.value]
    : fullHand.value;
  const cards13 = currentPool.length === 13 ? currentPool : fullHand.value;
  const allCardsSSS = cards13.map(toSSSCard);
  const result = autoArrangeThirteen(allCardsSSS, strat);

  frontTier.value = toCards(result.head, cards13);
  midTier.value = toCards(result.mid, cards13);
  backTier.value = toCards(result.tail, cards13);

  updateLabels();
  soundFX.playCardSnap();

  if (result.specialHand) {
    showToast(`👑 特殊牌型【${result.specialHand.name}】(+${result.specialHand.bonusWater}水免比直赢)`);
  } else {
    showToast(`⚡ ${result.strategyLabel}：尾道【${backTierLabel.value}】· 中道【${midTierLabel.value}】· 头道【${frontTierLabel.value}】(严防倒水)`);
  }

  drawBoard();
}

function updateLabels() {
  frontTierLabel.value = getHandLabel(frontTier.value);
  midTierLabel.value = getHandLabel(midTier.value);
  backTierLabel.value = getHandLabel(backTier.value);
}

/**
 * Whole Tier Swap: Fast swap between Mid and Back (5 cards vs 5 cards)
 */
function swapTiers(tierA: 'front' | 'mid' | 'back', tierB: 'front' | 'mid' | 'back') {
  if (tierA === tierB) return;
  pushHistory();

  if ((tierA === 'mid' && tierB === 'back') || (tierA === 'back' && tierB === 'mid')) {
    const tmp = [...midTier.value];
    midTier.value = [...backTier.value];
    backTier.value = tmp;
  } else {
    // Front vs Mid or Front vs Back: balance pool
    const otherTier = tierA === 'front' ? tierB : tierA;
    const pool = [...frontTier.value, ...tiersMap[otherTier].value].sort((a, b) => b.rank - a.rank);
    if (otherTier === 'mid') {
      midTier.value = pool.slice(0, 5);
      frontTier.value = pool.slice(5, 8);
    } else {
      backTier.value = pool.slice(0, 5);
      frontTier.value = pool.slice(5, 8);
    }
  }

  selectedIds.value.clear();
  soundFX.playCardSnap();
  updateLabels();
  drawBoard();
}

/**
 * Sorts single tier descending by rank
 */
function sortTier(tierName: 'front' | 'mid' | 'back') {
  pushHistory();
  tiersMap[tierName].value.sort((a, b) => b.rank - a.rank);
  soundFX.playCardSnap();
  updateLabels();
  drawBoard();
}

/**
 * One-click intelligent anti-watering auto balance
 */
function autoFixWatering() {
  pushHistory();
  const detail = wateringDetail.value;
  if (detail.fixAction === 'swap_mid_back') {
    const tmp = [...midTier.value];
    midTier.value = [...backTier.value];
    backTier.value = tmp;
  } else if (detail.fixAction === 'rebalance_front_mid') {
    const pool = [...midTier.value, ...frontTier.value].sort((a, b) => b.rank - a.rank);
    midTier.value = pool.slice(0, 5);
    frontTier.value = pool.slice(5, 8);
    const midEval = evaluate5CardTier(midTier.value.map(toSSSCard));
    const backEval = evaluate5CardTier(backTier.value.map(toSSSCard));
    if (midEval.scoreRank > backEval.scoreRank) {
      const tmp = [...midTier.value];
      midTier.value = [...backTier.value];
      backTier.value = tmp;
    }
  } else {
    applyStrategy('optimal', false);
  }

  updateLabels();
  soundFX.playCardSnap();
  drawBoard();
}

/**
 * Precision 1-to-1 card swap between two tiers or reordering within the same tier
 */
function swapCardsDirectly(
  cardA: Card,
  fromTierA: 'front' | 'mid' | 'back',
  cardB: Card,
  fromTierB: 'front' | 'mid' | 'back'
) {
  pushHistory();
  const listA = tiersMap[fromTierA].value;
  const listB = tiersMap[fromTierB].value;

  const idxA = listA.findIndex((c) => c.id === cardA.id);
  const idxB = listB.findIndex((c) => c.id === cardB.id);

  if (fromTierA === fromTierB) {
    if (idxA !== -1 && idxB !== -1) {
      const tmp = listA[idxA];
      listA[idxA] = listA[idxB];
      listA[idxB] = tmp;
    }
  } else {
    if (idxA !== -1 && idxB !== -1) {
      listA[idxA] = cardB;
      listB[idxB] = cardA;
    }
  }

  selectedIds.value.clear();
  updateLabels();
  soundFX.playCardSnap();
  haptics.playCard();
  drawBoard();
}

/**
 * Reorders cards in the same tier by dragging one card and inserting near another
 */
function reorderCardInTier(tierName: 'front' | 'mid' | 'back', cardId: string, targetCardId: string) {
  const list = [...tiersMap[tierName].value];
  const fromIdx = list.findIndex((c) => c.id === cardId);
  const toIdx = list.findIndex((c) => c.id === targetCardId);
  if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
    pushHistory();
    const [card] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, card);
    tiersMap[tierName].value = list;
    soundFX.playCardSnap();
    haptics.playCard();
    updateLabels();
    drawBoard();
  }
}

/**
 * Moves currently selected cards to target tier with intelligent capacity balance
 */
function moveSelectedCardsTo(targetTierName: 'front' | 'mid' | 'back', preferredSwapCardId?: string) {
  if (selectedIds.value.size === 0) return;

  const maxCapacity: Record<'front' | 'mid' | 'back', number> = {
    front: 3,
    mid: 5,
    back: 5,
  };

  const movingCards: { card: Card; fromTier: 'front' | 'mid' | 'back' }[] = [];
  (['front', 'mid', 'back'] as const).forEach((t) => {
    if (t !== targetTierName) {
      tiersMap[t].value.forEach((c) => {
        if (selectedIds.value.has(c.id)) {
          movingCards.push({ card: c, fromTier: t });
        }
      });
    }
  });

  if (movingCards.length === 0) {
    selectedIds.value.clear();
    drawBoard();
    return;
  }

  // If exactly 1 card selected and user clicked a specific target card -> direct 1-to-1 swap!
  if (movingCards.length === 1 && preferredSwapCardId) {
    const targetCard = tiersMap[targetTierName].value.find((c) => c.id === preferredSwapCardId);
    if (targetCard) {
      swapCardsDirectly(movingCards[0].card, movingCards[0].fromTier, targetCard, targetTierName);
      return;
    }
  }

  pushHistory();

  const currentFront = [...frontTier.value];
  const currentMid = [...midTier.value];
  const currentBack = [...backTier.value];

  const tiers: Record<'front' | 'mid' | 'back', Card[]> = {
    front: currentFront,
    mid: currentMid,
    back: currentBack,
  };

  for (const { card, fromTier } of movingCards) {
    const targetArr = tiers[targetTierName];
    const sourceArr = tiers[fromTier];

    const srcIdx = sourceArr.findIndex((c) => c.id === card.id);
    if (srcIdx !== -1) {
      sourceArr.splice(srcIdx, 1);
    }
    targetArr.push(card);

    if (targetArr.length > maxCapacity[targetTierName]) {
      let swapIdx = targetArr.findIndex((c) => !selectedIds.value.has(c.id));
      if (swapIdx === -1) swapIdx = 0;
      const swapCard = targetArr.splice(swapIdx, 1)[0];
      sourceArr.push(swapCard);
    }
  }

  frontTier.value = currentFront;
  midTier.value = currentMid;
  backTier.value = currentBack;

  selectedIds.value.clear();
  soundFX.playCardSnap();
  updateLabels();
  drawBoard();
}

function drawBoard() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const width = tableWidthPx.value;
  const height = tableHeightPx.value;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Background with luxury sapphire table felt gradient
  const highlight = props.tableTheme?.highlightColor || '#3B82F6';
  const felt = props.tableTheme?.feltColor || '#1D4ED8';
  const edge = props.tableTheme?.edgeColor || '#1E3A8A';

  const grad = ctx.createRadialGradient(width / 2, height / 2 - 20, 20, width / 2, height / 2, Math.max(width, height));
  grad.addColorStop(0, highlight);
  grad.addColorStop(0.35, felt);
  grad.addColorStop(0.85, edge);
  grad.addColorStop(1, edge);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Subtle luxury table felt inner rim
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 0);
  ctx.stroke();

  // Ambient spotlight
  const spotGrad = ctx.createRadialGradient(width / 2, height / 2 - 20, 0, width / 2, height / 2 - 20, Math.min(width, height) / 1.5);
  spotGrad.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
  spotGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.06)');
  spotGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = spotGrad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Top In-Canvas HUD Controls: Undo & Watering Warning
  // 1. Undo Button - Moved to DOM

  // 2. Watering Diagnosis Banner (interactive click-to-fix)
  if (isWatering.value) {
    const bannerX = 120;
    const bannerY = 7;
    const bannerW = Math.max(200, width - 120 - 95);
    const bannerH = 24;
    ctx.save();
    ctx.fillStyle = 'rgba(185, 28, 28, 0.85)';
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(239, 68, 68, 0.6)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(wateringDetail.value.reason, bannerX + 8, bannerY + bannerH / 2);

    // Click to fix badge
    ctx.fillStyle = '#FEF08A';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`⚡ ${wateringDetail.value.fixLabel}`, bannerX + bannerW - 8, bannerY + bannerH / 2);
    ctx.restore();
  } else if (mySpecialHand.value) {
    const bannerX = 120;
    const bannerY = 7;
    const bannerW = Math.max(200, width - 120 - 95);
    const bannerH = 24;
    ctx.save();
    ctx.fillStyle = 'rgba(217, 119, 6, 0.88)';
    ctx.strokeStyle = '#FCD34D';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`👑 特殊牌型：【${mySpecialHand.value.name}】(+${mySpecialHand.value.bonusWater}水)`, bannerX + 8, bannerY + bannerH / 2);

    ctx.fillStyle = '#FEF08A';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('⚡ 免比通关 · 点击开牌', bannerX + bannerW - 8, bannerY + bannerH / 2);
    ctx.restore();
  }

  // Draw 3 Tiers Slots
  const drawTierSlot = (
    y: number,
    title: string,
    cards: Card[],
    maxCount: number,
    label: string,
    slotName: 'front' | 'mid' | 'back'
  ) => {
    const isHovered = dragState.value.isDragging && dragState.value.hoverTier === slotName;
    const hasSelection = selectedIds.value.size > 0;
    const hasCardsFromOtherTier = Array.from(selectedIds.value).some((id) => !cards.some((c) => c.id === id));
    const canAcceptMoving = hasSelection && hasCardsFromOtherTier;
    const isViolating = isWatering.value && wateringDetail.value.violatingTier === slotName;

    // Slot surface
    ctx.save();
    if (isHovered) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.28)';
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
      ctx.shadowBlur = 10;
    } else if (canAcceptMoving) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
    } else if (isViolating) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
    } else {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 1;
    }

    ctx.beginPath();
    ctx.roundRect(120, y, width - 132, 118, 8);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Title & count
    ctx.fillStyle = '#FDE047';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    const titleText = `${title} (${cards.length}/${maxCount})`;
    ctx.fillText(titleText, width - 24, y + 22);

    // Hand label or move indicator
    ctx.font = '600 11px sans-serif';
    if (canAcceptMoving) {
      ctx.fillStyle = '#FBBF24';
      ctx.fillText(`👉 点击换入[${title}] (${selectedIds.value.size}张)`, width - 24, y + 40);
    } else {
      ctx.fillStyle = isViolating ? '#F87171' : '#6EE7B7';
      ctx.fillText(`【${label}】`, width - 24, y + 40);
    }

    // In-Canvas quick tier action buttons (Swap/Sort)
    if (slotName === 'mid' || slotName === 'back') {
      const btnW = 86;
      const btnH = 20;
      const btnX = width - btnW - 24;
      const btnY = y + 50;

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW, btnH, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#93C5FD';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(slotName === 'mid' ? '🔄 中尾对调' : '🔄 尾中对调', btnX + btnW / 2, btnY + btnH / 2);
      ctx.restore();
    } else if (slotName === 'front') {
      const btnW = 60;
      const btnH = 20;
      const btnX = width - btnW - 24;
      const btnY = y + 50;

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW, btnH, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#93C5FD';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('↕ 排序', btnX + btnW / 2, btnY + btnH / 2);
      ctx.restore();
    }

    // Stacked cards rendering
    const cardW = 62;
    const cardH = 96;
    const startX = 130;
    const slotAreaWidth = width - 132;
    const denom = Math.max(maxCount - 1, 1);
    const overlap = Math.min(50, (slotAreaWidth - startX - cardW) / denom);

    for (let i = 0; i < Math.max(cards.length, maxCount); i++) {
      const cx = startX + i * overlap;
      const c = cards[i];

      if (c) {
        const isSel = selectedIds.value.has(c.id);
        const isHoverTarget =
          dragState.value.isDragging &&
          dragState.value.hoverCardId === c.id &&
          dragState.value.draggedCard?.id !== c.id;
        const isBeingDragged =
          dragState.value.isDragging && dragState.value.draggedCard?.id === c.id;

        const cy = y + (isSel ? 2 : 12);

        if (isBeingDragged) {
          // Render placeholder in the original slot
          ctx.save();
          ctx.globalAlpha = 0.35;
          renderPlayingCard(ctx, c, cx, cy, cardW, cardH, {
            isSelected: false,
            borderRadius: 4,
            shadow: false,
            borderColor: 'rgba(255, 255, 255, 0.4)',
            borderWidth: 1,
          });
          ctx.restore();
        } else {
          renderPlayingCard(ctx, c, cx, cy, cardW, cardH, {
            isSelected: isSel,
            borderRadius: 4,
            shadow: true,
            borderColor: isHoverTarget ? '#FBBF24' : (isSel ? '#EF4444' : undefined),
            borderWidth: isHoverTarget ? 3.5 : (isSel ? 3.5 : 1),
          });

          // Selected card visual indicators
          if (isSel) {
            ctx.save();
            ctx.strokeStyle = '#EF4444';
            ctx.lineWidth = 3.5;
            ctx.shadowColor = 'rgba(239, 68, 68, 0.9)';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.roundRect(cx, cy, cardW, cardH, 4);
            ctx.stroke();

            ctx.fillStyle = '#DC2626';
            ctx.beginPath();
            ctx.arc(cx + cardW - 8, cy + 8, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          // Target swap highlight icon
          if (isHoverTarget) {
            ctx.save();
            ctx.fillStyle = '#F59E0B';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 6;
            ctx.fillText('⇄', cx + cardW / 2, cy + cardH / 2);
            ctx.restore();
          }
        }
      } else {
        const cy = y + 12;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(cx, cy, cardW, cardH, 4);
        ctx.fill();
        ctx.stroke();
      }
    }
  };

  drawTierSlot(40, '头道', frontTier.value, 3, frontTierLabel.value, 'front');
  drawTierSlot(165, '中道', midTier.value, 5, midTierLabel.value, 'mid');
  drawTierSlot(290, '尾道', backTier.value, 5, backTierLabel.value, 'back');

  // Floating Dragged Card(s) Rendering
  if (dragState.value.isDragging && dragState.value.draggedCard) {
    const cardW = 62;
    const cardH = 96;
    const fx = dragState.value.currentX - cardW / 2;
    const fy = dragState.value.currentY - cardH / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 8;

    // Slight dynamic rotation for natural card physics
    ctx.translate(fx + cardW / 2, fy + cardH / 2);
    ctx.rotate(0.04);
    ctx.translate(-(fx + cardW / 2), -(fy + cardH / 2));

    renderPlayingCard(ctx, dragState.value.draggedCard, fx, fy, cardW, cardH, {
      isSelected: true,
      shadow: true,
      borderRadius: 4,
      borderColor: '#F59E0B',
      borderWidth: 3,
    });
    ctx.restore();
  }
}

function onCanvasPointerDown(e: PointerEvent) {
  if (hasCompared.value) return;
  const canvas = canvasRef.value;
  if (!canvas) return;

  try {
    canvas.setPointerCapture(e.pointerId);
  } catch {}

  const width = tableWidthPx.value;
  const height = tableHeightPx.value;
  const { x, y } = getCanvasEventCoords(canvas, e.clientX, e.clientY, props.isRotated90, width, height);

  // 2. Watering Diagnosis Banner Tap (Click to Fix) or Special Hand Banner Tap
  if (isWatering.value) {
    const bannerX = 120;
    const bannerY = 7;
    const bannerW = Math.max(200, width - 120 - 95);
    const bannerH = 24;
    if (x >= bannerX && x <= bannerX + bannerW && y >= bannerY && y <= bannerY + bannerH) {
      autoFixWatering();
      return;
    }
  } else if (mySpecialHand.value) {
    const bannerX = 120;
    const bannerY = 7;
    const bannerW = Math.max(200, width - 120 - 95);
    const bannerH = 24;
    if (x >= bannerX && x <= bannerX + bannerW && y >= bannerY && y <= bannerY + bannerH) {
      showSpecialHandModal.value = true;
      soundFX.playTap();
      return;
    }
  }

  // 3. Quick Action Buttons on Tiers
  // Front sort button
  if (x >= width - 84 && x <= width - 24 && y >= 40 + 50 && y <= 40 + 70) {
    sortTier('front');
    return;
  }
  // Mid swap with back button
  if (x >= width - 110 && x <= width - 24 && y >= 165 + 50 && y <= 165 + 70) {
    swapTiers('mid', 'back');
    return;
  }
  // Back swap with mid button
  if (x >= width - 110 && x <= width - 24 && y >= 290 + 50 && y <= 290 + 70) {
    swapTiers('mid', 'back');
    return;
  }

  // 4. Cards hit detection
  const tiers = [
    { list: frontTier.value, y: 40, max: 3, name: 'front' as const, title: '头道' },
    { list: midTier.value, y: 165, max: 5, name: 'mid' as const, title: '中道' },
    { list: backTier.value, y: 290, max: 5, name: 'back' as const, title: '尾道' },
  ];

  const slotAreaWidth = width - 132;
  const cardW = 62;
  const cardH = 96;
  const startX = 130;

  let hitCard: Card | null = null;
  let hitTier: typeof tiers[0] | null = null;

  for (const t of tiers) {
    const denom = Math.max(t.max - 1, 1);
    const overlap = Math.min(50, (slotAreaWidth - startX - cardW) / denom);
    for (let i = t.list.length - 1; i >= 0; i--) {
      const cx = startX + i * overlap;
      const isSel = selectedIds.value.has(t.list[i].id);
      const cy = t.y + (isSel ? 2 : 12);
      const hitW = (i === t.list.length - 1) ? cardW : overlap;

      if (x >= cx && x <= cx + hitW && y >= cy && y <= cy + cardH) {
        hitCard = t.list[i];
        hitTier = t;
        break;
      }
    }
    if (hitCard) break;
  }

  dragState.value = {
    isDragging: false,
    startX: x,
    startY: y,
    currentX: x,
    currentY: y,
    draggedCard: hitCard,
    draggedCards: hitCard ? [hitCard] : [],
    sourceTier: hitTier ? hitTier.name : null,
    hoverTier: null,
    hoverCardId: null,
    pointerDownCard: hitCard,
    pointerDownTier: hitTier ? hitTier.name : null,
    pointerDownTime: Date.now(),
  };

  // If didn't hit card, check if tapped empty space in a tier slot
  if (!hitCard) {
    for (const t of tiers) {
      if (x >= 120 && x <= width - 12 && y >= t.y && y <= t.y + 118) {
        if (selectedIds.value.size > 0) {
          moveSelectedCardsTo(t.name);
          return;
        }
      }
    }
    // Tapped table empty area -> clear selection
    if (selectedIds.value.size > 0) {
      selectedIds.value.clear();
      soundFX.playTap();
      drawBoard();
    }
  }
}

function onCanvasPointerMove(e: PointerEvent) {
  if (hasCompared.value) return;
  const canvas = canvasRef.value;
  if (!canvas) return;

  const width = tableWidthPx.value;
  const height = tableHeightPx.value;
  const { x, y } = getCanvasEventCoords(canvas, e.clientX, e.clientY, props.isRotated90, width, height);

  if (dragState.value.pointerDownCard) {
    const dx = x - dragState.value.startX;
    const dy = y - dragState.value.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (!dragState.value.isDragging && dist > 5) {
      dragState.value.isDragging = true;
      soundFX.playTap();
    }

    if (dragState.value.isDragging) {
      dragState.value.currentX = x;
      dragState.value.currentY = y;

      const tiers = [
        { list: frontTier.value, y: 40, max: 3, name: 'front' as const },
        { list: midTier.value, y: 165, max: 5, name: 'mid' as const },
        { list: backTier.value, y: 290, max: 5, name: 'back' as const },
      ];

      let foundHoverTier: 'front' | 'mid' | 'back' | null = null;
      let foundHoverCardId: string | null = null;
      const slotAreaWidth = width - 132;
      const cardW = 62;
      const cardH = 96;
      const startX = 130;

      for (const t of tiers) {
        if (y >= t.y - 10 && y <= t.y + 128 && x >= 115 && x <= width) {
          foundHoverTier = t.name;
          const denom = Math.max(t.max - 1, 1);
          const overlap = Math.min(50, (slotAreaWidth - startX - cardW) / denom);

          for (let i = t.list.length - 1; i >= 0; i--) {
            const cx = startX + i * overlap;
            const isSel = selectedIds.value.has(t.list[i].id);
            const cy = t.y + (isSel ? 2 : 12);
            const hitW = (i === t.list.length - 1) ? cardW : overlap;

            if (x >= cx && x <= cx + hitW && y >= cy && y <= cy + cardH) {
              foundHoverCardId = t.list[i].id;
              break;
            }
          }
          break;
        }
      }

      dragState.value.hoverTier = foundHoverTier;
      dragState.value.hoverCardId = foundHoverCardId;
      drawBoard();
    }
  }
}

function onCanvasPointerUp(e: PointerEvent) {
  if (hasCompared.value) return;
  const canvas = canvasRef.value;
  if (!canvas) return;

  try {
    canvas.releasePointerCapture(e.pointerId);
  } catch {}

  if (dragState.value.isDragging) {
    const draggedCard = dragState.value.draggedCard;
    const sourceTier = dragState.value.sourceTier;
    const hoverTier = dragState.value.hoverTier;
    const hoverCardId = dragState.value.hoverCardId;

    if (draggedCard && sourceTier && hoverTier) {
      if (sourceTier === hoverTier) {
        // Drag within the SAME tier: Reorder cards!
        if (hoverCardId && hoverCardId !== draggedCard.id) {
          reorderCardInTier(sourceTier, draggedCard.id, hoverCardId);
        }
      } else {
        // Cross-tier drop!
        if (hoverCardId) {
          // Precision swap with target card!
          const targetCard = findCardById(hoverCardId);
          if (targetCard) {
            swapCardsDirectly(draggedCard, sourceTier, targetCard, hoverTier);
          }
        } else {
          // Drop into empty slot of hoverTier
          if (!selectedIds.value.has(draggedCard.id)) {
            selectedIds.value.clear();
            selectedIds.value.add(draggedCard.id);
          }
          moveSelectedCardsTo(hoverTier);
        }
      }
    }

    dragState.value.isDragging = false;
    dragState.value.pointerDownCard = null;
    dragState.value.draggedCard = null;
    drawBoard();
    return;
  }

  // Not dragging -> Pure Tap/Click!
  const tappedCard = dragState.value.pointerDownCard;
  const tappedTier = dragState.value.pointerDownTier;

  dragState.value.pointerDownCard = null;

  if (tappedCard && tappedTier) {
    // If cards from ANOTHER tier are currently selected:
    const cardsFromOtherTiers: { card: Card; tier: 'front' | 'mid' | 'back' }[] = [];
    (['front', 'mid', 'back'] as const).forEach((t) => {
      if (t !== tappedTier) {
        tiersMap[t].value.forEach((c) => {
          if (selectedIds.value.has(c.id)) {
            cardsFromOtherTiers.push({ card: c, tier: t });
          }
        });
      }
    });

    if (cardsFromOtherTiers.length === 1) {
      // Instant 1-to-1 Precision Swap!
      swapCardsDirectly(cardsFromOtherTiers[0].card, cardsFromOtherTiers[0].tier, tappedCard, tappedTier);
      return;
    } else if (cardsFromOtherTiers.length > 1) {
      // Multiple cards selected -> move to tapped tier
      moveSelectedCardsTo(tappedTier, tappedCard.id);
      return;
    }

    // Otherwise toggle selection on this card in current tier
    if (selectedIds.value.has(tappedCard.id)) {
      selectedIds.value.delete(tappedCard.id);
    } else {
      selectedIds.value.add(tappedCard.id);
    }
    soundFX.playTap();
    haptics.tap();
    drawBoard();
  }
}

function onCanvasPointerCancel(e: PointerEvent) {
  dragState.value.isDragging = false;
  dragState.value.pointerDownCard = null;
  dragState.value.draggedCard = null;
  drawBoard();
}

function handleCompare() {
  if (isWatering.value && !mySpecialHand.value) return;
  showGunshotAnim.value = true;
  soundFX.playCardSnap(true);
  haptics.gunshot();

  const myHand = {
    head: frontTier.value.map(toSSSCard),
    mid: midTier.value.map(toSSSCard),
    tail: backTier.value.map(toSSSCard),
  };

  const bNames = isEightPlayer.value
    ? ['一席 (罗宋巧手)', '二席 (十三飞龙)', '三席 (七星居士)', '四席 (青龙剑客)', '五席 (百花仙子)', '六席 (金牌赌神)', '七席 (八方豪侠)']
    : ['西席 (罗宋巧手)', '北席 (十三飞龙)', '东席 (七星居士)'];

  const oppCount = isEightPlayer.value ? 7 : 3;
  let totalNet = 0;
  let wonOpponentCount = 0;
  let shotCount = 0;
  const oppResults = [];

  for (let i = 0; i < oppCount; i++) {
    const opp = botHands.value[i];
    if (!opp) continue;
    const oppHand = {
      head: opp.front.map(toSSSCard),
      mid: opp.mid.map(toSSSCard),
      tail: opp.back.map(toSSSCard),
    };

    const vsResult = compareTwoPlayers(myHand, oppHand, i + 1, bNames[i] || `牌友${i + 1}`);
    if (vsResult.finalWater > 0) wonOpponentCount++;
    if (vsResult.isShot && vsResult.finalWater > 0) shotCount++;

    oppResults.push({
      seat: i + 1,
      name: bNames[i] || `牌友${i + 1}`,
      netWater: vsResult.finalWater,
      rawWater: vsResult.rawWater,
      isShot: vsResult.isShot,
      isFoulOpp: vsResult.isFoulOpp,
      tiers: vsResult.tiers,
      summary: vsResult.summary,
      specialMe: vsResult.specialMe,
      specialOpp: vsResult.specialOpp,
      handSummary: `头:${getHandLabel(opp.front)} 中:${getHandLabel(opp.mid)} 尾:${getHandLabel(opp.back)}`,
    });
    totalNet += vsResult.finalWater;
  }

  // 触发全垒打判定：打枪全场所有对手
  isGrandSlam.value = shotCount === oppCount && oppCount > 0;
  if (isGrandSlam.value) {
    // 打枪已翻倍 (2x)，全垒打再翻一倍 (总计 4x)
    totalNet *= 2; 
    for (const res of oppResults) {
      res.netWater *= 2;
      res.summary += ' · 【触发全垒打再翻倍！】';
    }
    haptics.victory();
    emit('fx', 'grandslam');
    soundFX.speakAction('grand_slam');
  } else if (shotCount > 0) {
    emit('fx', 'gunshot');
    soundFX.speakAction('gunshot');
  } else {
    soundFX.speakVoice('开牌比水完毕。');
  }

  totalScore.value = totalNet;
  opponentsBreakdown.value = oppResults;

  setTimeout(() => {
    showGunshotAnim.value = false;
    hasCompared.value = true;
    soundFX.playVictory();
    if (totalNet > 0) {
      haptics.victory();
      emit('fx', 'win');
    }
    emit('move', { score: totalScore.value, winner: totalNet >= 0 ? 0 : 1 });
  }, 1200);
}

onMounted(() => {
  preloadCardAssets();
  cleanupCardLoader = onCardAssetsLoaded(() => {
    drawBoard();
  });
  dealNewMatch();
  updateDimensions();
  window.addEventListener('resize', updateDimensions);
  if (containerRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(containerRef.value);
  }
});

onBeforeUnmount(() => {
  if (cleanupCardLoader) cleanupCardLoader();
  window.removeEventListener('resize', updateDimensions);
  resizeObserver?.disconnect();
  if (rafId) cancelAnimationFrame(rafId);
});
</script>
