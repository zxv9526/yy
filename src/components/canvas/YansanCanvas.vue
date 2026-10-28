<template>
  <div
    ref="containerRef"
    class="w-full h-full select-none absolute inset-0 overflow-hidden flex items-center justify-center"
    :style="{
      backgroundColor: props.tableTheme?.feltColor || '#B91C1C',
      background: `radial-gradient(ellipse at 50% 45%, ${props.tableTheme?.highlightColor || '#EF4444'} 0%, ${props.tableTheme?.feltColor || '#B91C1C'} 60%, ${props.tableTheme?.edgeColor || '#7F1D1D'} 100%)`
    }"
  >
    <!-- Scene Selection Modal (Before entering the table) -->
    <div
      v-if="!selectedRoom"
      class="absolute inset-0 backdrop-blur-md flex flex-col items-center justify-center p-4 z-40"
      :style="{
        backgroundColor: props.tableTheme?.feltColor || '#B91C1C',
        background: `radial-gradient(ellipse at 50% 45%, ${props.tableTheme?.highlightColor || '#EF4444'}dd 0%, ${props.tableTheme?.feltColor || '#B91C1C'}f2 60%, ${props.tableTheme?.edgeColor || '#7F1D1D'}fb 100%)`
      }"
    >
      <div class="text-center max-w-md w-full p-6 rounded-3xl bg-gradient-to-b from-[#2D1B12] via-[#1A100B] to-[#2D1B12] border border-amber-500/40 shadow-2xl relative">
        <!-- Return to Lobby Button -->
        <button
          type="button"
          @click="$emit('exit')"
          class="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-xs font-bold text-amber-200 border border-amber-500/60 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-md"
          title="返回游戏大厅"
        >
          <span>🏠</span>
          <span>返回大厅</span>
        </button>

        <div class="text-4xl mb-2 mt-2">🎴</div>
        <h2 class="text-2xl font-extrabold text-amber-300 font-serif-title mb-1">烟三竞技大厅</h2>
        <p class="text-xs text-amber-100/70 mb-6">请选择您要进入的底分场次</p>
        
        <div class="flex flex-col gap-3.5">
          <button
            type="button"
            @click="selectRoom('5-10')"
            class="group relative px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-800/80 to-amber-950/80 hover:from-amber-700 hover:to-amber-900 border border-amber-400/50 text-amber-100 font-bold shadow-lg hover:scale-102 active:scale-98 transition-all flex items-center justify-between"
          >
            <div class="flex items-center gap-2.5">
              <span class="text-lg">🥉</span>
              <div class="text-left">
                <div class="text-sm font-extrabold text-amber-200">新手 5-10 分场</div>
                <div class="text-[10px] text-amber-200/60">适合新手入门，欢快竞技</div>
              </div>
            </div>
            <span class="text-xs font-mono bg-black/40 px-3 py-1 rounded-full text-amber-300 border border-amber-400/30 group-hover:translate-x-1 transition-transform">进入 ➔</span>
          </button>

          <button
            type="button"
            @click="selectRoom('10-20')"
            class="group relative px-6 py-3.5 rounded-2xl bg-gradient-to-r from-red-900/80 to-red-950/80 hover:from-red-800 hover:to-red-900 border border-red-400/50 text-red-100 font-bold shadow-lg hover:scale-102 active:scale-98 transition-all flex items-center justify-between"
          >
            <div class="flex items-center gap-2.5">
              <span class="text-lg">🥈</span>
              <div class="text-left">
                <div class="text-sm font-extrabold text-red-200">进阶 10-20 分场</div>
                <div class="text-[10px] text-red-200/60">高手切磋，策略对决</div>
              </div>
            </div>
            <span class="text-xs font-mono bg-black/40 px-3 py-1 rounded-full text-red-300 border border-red-400/30 group-hover:translate-x-1 transition-transform">进入 ➔</span>
          </button>

          <button
            type="button"
            @click="selectRoom('20-40')"
            class="group relative px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-900/90 to-slate-950/90 hover:from-purple-800 hover:to-slate-900 border border-amber-400/60 text-amber-200 font-bold shadow-lg hover:scale-102 active:scale-98 transition-all flex items-center justify-between"
          >
            <div class="flex items-center gap-2.5">
              <span class="text-lg">🥇</span>
              <div class="text-left">
                <div class="text-sm font-extrabold text-amber-300">大师 20-40 分场</div>
                <div class="text-[10px] text-amber-300/60">巅峰对决，惊心动魄</div>
              </div>
            </div>
            <span class="text-xs font-mono bg-black/40 px-3 py-1 rounded-full text-amber-300 border border-amber-400/30 group-hover:translate-x-1 transition-transform">进入 ➔</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Fullscreen Card Table Surface with In-Table Action Overlay -->
    <div class="w-full h-full absolute inset-0 overflow-hidden flex items-center justify-center">
      <canvas
        ref="canvasRef"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointerleave="onPointerUp"
        @pointercancel="onPointerUp"
        class="w-full h-full absolute inset-0 block cursor-pointer"
      ></canvas>



      <!-- Rules Explanation Modal -->
      <div
        v-if="showRulesModal"
        class="absolute inset-0 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto"
        :style="{
          backgroundColor: props.tableTheme?.feltColor || '#B91C1C',
          background: `radial-gradient(ellipse at 50% 45%, ${props.tableTheme?.highlightColor || '#EF4444'}dd 0%, ${props.tableTheme?.feltColor || '#B91C1C'}f2 60%, ${props.tableTheme?.edgeColor || '#7F1D1D'}fb 100%)`
        }"
        @click.self="showRulesModal = false"
      >
        <div class="relative w-full max-w-2xl max-h-[90vh] bg-gradient-to-b from-[#241711] via-[#1A100B] to-[#120B08] border border-amber-500/50 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col overflow-hidden text-left">
          <!-- Modal Header -->
          <div class="flex items-center justify-between pb-3 border-b border-amber-500/30 shrink-0">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🎴</span>
              <div>
                <h3 class="text-lg sm:text-xl font-black text-amber-300 font-serif-title">
                  经典烟三 · 规则指南与牌型比较
                </h3>
                <p class="text-[11px] text-amber-200/70">四人争锋 · 方块四首出 · 有牌必管 · 强攻独霸</p>
              </div>
            </div>
            <button
              type="button"
              @click="showRulesModal = false"
              class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center text-sm transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          <!-- Modal Scrollable Content -->
          <div class="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1 text-xs text-[#E6DEC8] leading-relaxed">
            <!-- 1. 基础首出与顺序 -->
            <div class="p-3 rounded-xl bg-black/40 border border-amber-500/20">
              <div class="font-bold text-amber-300 flex items-center gap-1.5 mb-1 text-sm">
                <span>🚩</span>
                <span>核心首出规则（每局固定方块4先出）</span>
              </div>
              <ul class="list-disc list-inside space-y-1 text-amber-100/90 pl-1">
                <li><strong class="text-amber-200">用牌与人数：</strong>4 人对局，使用一副扑克牌（52张，无大小王），每人 13 张。</li>
                <li><strong class="text-amber-200">首出先手：</strong>每局（包含新开局与强攻重置开局）固定由持有 <span class="text-red-400 font-bold font-mono">方块4 (♦4)</span> 的玩家先手出牌。</li>
                <li><strong class="text-amber-200">首出必须带方块4：</strong>先手玩家打出的牌型组合中，<span class="text-amber-300 underline font-semibold">必须包含方块4</span>（可以出单张♦4、包含♦4的对子、三条、炸弹或顺子等）。</li>
                <li><strong class="text-amber-200">逆时针轮转：</strong>本家 (0) ➔ 东席 (3) ➔ 北席 (2) ➔ 西席 (1) 逆时针流转。</li>
              </ul>
            </div>

            <!-- 2. 点数与花色权重 -->
            <div class="p-3 rounded-xl bg-black/40 border border-amber-500/20">
              <div class="font-bold text-amber-300 flex items-center gap-1.5 mb-1 text-sm">
                <span>🔢</span>
                <span>点数与花色大小（3最大，4最小）</span>
              </div>
              <div class="space-y-1.5">
                <div class="p-2 rounded-lg bg-black/50 font-mono text-center text-amber-300 text-xs sm:text-sm font-bold border border-white/10">
                  3 > 2 > A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4
                </div>
                <div class="text-[11px] text-amber-100/80">
                  • <strong>花色顺序：</strong>黑桃(♠) > 红心(♥) > 梅花(♣) > 方块(♦)。点数相同比花色，黑桃3为全场至尊单张。
                </div>
              </div>
            </div>

            <!-- 3. 可出牌型体系与比较 -->
            <div class="p-3 rounded-xl bg-black/40 border border-amber-500/20">
              <div class="font-bold text-amber-300 flex items-center gap-1.5 mb-1.5 text-sm">
                <span>🃏</span>
                <span>合法牌型与压制比较关系（无纯炸弹，无纯同花）</span>
              </div>
              <div class="space-y-2 text-[11px]">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div class="p-2 rounded-lg bg-white/5 border border-white/10">
                    <div class="font-bold text-amber-200 mb-0.5">① 单张 (1张)</div>
                    <div class="text-amber-100/70">比点数大小(3最大,4最小)；同点数比花色(♠>♥>♣>♦)。</div>
                  </div>
                  <div class="p-2 rounded-lg bg-white/5 border border-white/10">
                    <div class="font-bold text-amber-200 mb-0.5">② 一对 (2张)</div>
                    <div class="text-amber-100/70">2张同点数牌，先比点数；同点数比较两张牌中最大的花色。</div>
                  </div>
                  <div class="p-2 rounded-lg bg-white/5 border border-white/10">
                    <div class="font-bold text-amber-200 mb-0.5">③ 三条 (3张)</div>
                    <div class="text-amber-100/70">3张同点数牌，直接比较点数大小(3×3 最大)。</div>
                  </div>
                </div>

                <div class="p-2.5 rounded-lg bg-white/5 border border-white/10">
                  <div class="font-bold text-amber-300 mb-1">④ 五张牌型梯队（牌型最多出5张，高阶直接压低阶）：</div>
                  <div class="space-y-1 font-mono text-[11px]">
                    <div class="text-amber-400 font-bold">【Tier 5 最高】同花顺：同花色5张顺子（含A2345/34567，不可出10JQKA）。先比花色(♠>♥>♣>♦)，相同花色比单张最大的牌</div>
                    <div class="text-purple-300">【Tier 4】四带一：4张同点数 + 任意1张单牌，比4张的点数大小</div>
                    <div class="text-blue-300">【Tier 3】俘虏 (三带一对 / 葫芦)：3张同点 + 1对子，比3张的点数大小</div>
                    <div class="text-emerald-300">【Tier 2】同花：5张同花色牌（<span class="text-amber-300 font-bold">包含同花色 10 J Q K A</span> 或其他同花）。先比花色(♠>♥>♣>♦)，相同花色比单张最大的牌</div>
                    <div class="text-slate-300">【Tier 1】顺子：5张点数相连牌（<span class="text-amber-300 font-bold">包含 A2345 与 34567</span>，<span class="text-red-400 font-bold underline">唯独不可出杂色 10 J Q K A</span>）。<span class="text-amber-300 font-bold">顺子是比单张最大的牌</span></div>
                  </div>
                  <div class="mt-1.5 text-[10px] text-amber-200/70 border-t border-white/10 pt-1">
                    * 牌型铁则：能打出的牌型最多就是五张（无长顺子、无连对、无炸弹）。合法牌型仅限单张、一对、三条、四带一、俘虏、同花、顺子、同花顺。
                  </div>
                </div>
              </div>
            </div>

            <!-- 4. 关键规则约束 -->
            <div class="p-3 rounded-xl bg-black/40 border border-amber-500/20">
              <div class="font-bold text-amber-300 flex items-center gap-1.5 mb-1 text-sm">
                <span>🎯</span>
                <span>跟牌与防守规则（无有牌必管，无需放顶）</span>
              </div>
              <ul class="list-disc list-inside space-y-1 text-amber-100/90 pl-1 text-[11px]">
                <li><strong class="text-amber-200">自由过牌：</strong><span class="text-amber-300 font-semibold">没有“有牌必管”的规则</span>，哪怕手牌中有能管得起的牌型，也可根据战术自由选择“过牌”。</li>
                <li><strong class="text-amber-200">绝大推算连出：</strong>依据公开已出牌库严格数学推算，若打出全场绝对最大牌型（如♠3单张、最大对子、或对手余牌不足/记牌推算无法凑出压制牌型时），<span class="text-amber-300 font-bold">系统判定全场绝大，无需等待其他玩家点过，出牌者直接获得出牌权继续连出</span>！</li>
                <li><strong class="text-amber-200">报单全场警报：</strong>任何玩家手牌仅剩 1 张时触发全场报单警报与醒目红光标识，提示所有玩家严密防守；持单张获得出牌权时将直接出牌获胜！</li>
                <li><strong class="text-amber-200">无需放顶防守：</strong>逆时针下家只剩 1 张手牌（报单）时，<span class="text-amber-300 font-semibold">不需要放顶防守</span>，可自由出任意单牌或其它牌型。</li>
                <li><strong class="text-amber-200">起手特权决断（强攻与投降）：</strong><span class="text-amber-300 font-bold">仅限于同时拿有黑桃A和黑桃3的玩家</span>，且在 <span class="text-amber-200 underline font-semibold">13张手牌均未打出且未点击过牌</span> 的情况下显示：
                  <div class="pl-2 mt-0.5 space-y-0.5 text-[10px]">
                    <div>• 觉得牌大可选择【🔥 强攻】：收回所有玩家已打出的牌（非重新发牌），由方块4先出重新开打，独胜独输翻倍。</div>
                    <div>• 觉得牌小可能会输完可选择【🏳️ 投降】：直接结束本局，<span class="text-red-400 font-bold">5-10分场投降者输 15 分，其余三家各得 5 分</span>（10-20场输30各得10，20-40场输60各得20）。</div>
                    <div>• 只要玩家打出任意一张牌，或者点击了“过牌”（即使仍有13张手牌），强攻与投降按钮立即消失！</div>
                    <div>• 强攻与投降操作面板位于桌面右上角，<span class="text-amber-300 font-semibold">绝不遮挡底部扑克牌</span>。</div>
                  </div>
                </li>
              </ul>
            </div>

            <!-- 5. 同盟与胜负结算 -->
            <div class="p-3 rounded-xl bg-black/40 border border-amber-500/20">
              <div class="font-bold text-amber-300 flex items-center gap-1.5 mb-1 text-sm">
                <span>🔥</span>
                <span>阵营同盟与终局结算（任一阵营两人出完即结束）</span>
              </div>
              <ul class="list-disc list-inside space-y-1 text-amber-100/90 pl-1 text-[11px]">
                <li><strong class="text-amber-200">阵营划分：</strong>持 <span class="text-white font-bold">♠3</span> 与 <span class="text-white font-bold">♠A</span> 的两人为“同盟”（1号与3号），其余两人为“农民”（2号与4号）。</li>
                <li><strong class="text-amber-200">终局时刻：</strong>当两个农民或者两个同盟的先打完手牌就立即结束游戏。</li>
                <li><strong class="text-amber-200">双胜翻倍 (各10分)：</strong>1号与3号包揽前两名出完（如1,3），1和3各得10分，2和4各输10分；反之2号与4号包揽前两名出完（如2,4），2和4各得10分，1和3各输10分。</li>
                <li><strong class="text-amber-200">单胜 (各5分)：</strong>1号3号分获第1、第3名出完（如123/321/143/341），1和3各得5分，2和4各输5分；反之2号4号分获第1、第3名出完（如214/234/412/432），2和4各得5分，1和3各输5分。</li>
                <li><strong class="text-amber-200">势均打和 (0分)：</strong>一方拿下第1名但另一方包揽第2、第3名出完（如124/142/324/342/213/231/413/431），双方打和，大家都没有输赢（各得0分）。</li>
              </ul>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="pt-3 border-t border-amber-500/30 flex justify-end shrink-0">
            <button
              type="button"
              @click="showRulesModal = false"
              class="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
            >
              已知晓规则 · 返回牌局
            </button>
          </div>
        </div>
      </div>

      <!-- Floating Error Alert Tip (Top Center) -->
      <div
        v-if="errorTip"
        class="absolute top-11 left-1/2 -translate-x-1/2 z-25 px-3.5 py-0.5 rounded-full bg-black/80 border border-white/15 text-xs text-amber-200 font-bold shadow-md animate-bounce"
      >
        ⚠️ {{ errorTip }}
      </div>

      <!-- In-Table Top Utility Bar -->
      <div
        v-if="selectedRoom && winnerSeat === null"
        class="absolute top-2 right-2 z-25 flex items-center pointer-events-none"
      >
      </div>

      <!-- In-Table Floating Action Buttons (按钮独立拆分，绝不共用横幅，靠右悬浮绝不遮挡左下角玩家头像框) -->
      <div
        v-if="selectedRoom && winnerSeat === null"
        class="absolute bottom-2 left-[182px] sm:left-[196px] right-3 sm:right-5 z-20 flex items-center justify-end gap-2 sm:gap-3 pointer-events-auto select-none"
      >
        <!-- 1. 托管按钮 (独立悬浮固定尺寸) -->
        <button
          type="button"
          @click="toggleAutoHost"
          class="min-w-[68px] sm:min-w-[80px] h-10 sm:h-11 px-3 py-2 text-xs sm:text-sm font-bold rounded-2xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-95 shadow-xl bg-black/85 backdrop-blur-md"
          :class="isAutoHost ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-300 ring-2 ring-amber-400 animate-pulse' : 'bg-stone-900/90 hover:bg-stone-800 text-amber-200 border-amber-500/40'"
          :title="isAutoHost ? '点击取消托管' : '开启自动托管（轮到本家时由系统自动代出）'"
        >
          <span>⚡</span>
          <span>{{ isAutoHost ? '托管中' : '托管' }}</span>
        </button>

        <!-- 2. 回合倒计时指示器 (独立悬浮固定尺寸) -->
        <div
          class="min-w-[76px] sm:min-w-[90px] h-10 sm:h-11 px-3 py-2 rounded-2xl bg-black/85 backdrop-blur-md border text-xs sm:text-sm font-mono font-bold flex items-center justify-center gap-1.5 shrink-0 shadow-xl transition-all"
          :class="(turnSeat === 0 && !isAutoHost) ? (turnCountdown <= 10 ? 'text-red-400 border-red-500/80 animate-pulse' : 'text-amber-300 border-amber-500/50') : 'text-stone-500 border-stone-800'"
          :style="{ visibility: (turnSeat === 0 && !isAutoHost) ? 'visible' : 'hidden' }"
          title="本手思考时间上限60秒"
        >
          <span>⏱️</span>
          <span class="tabular-nums">{{ turnCountdown }}s</span>
        </div>

        <!-- 3. 提示按钮 (独立悬浮固定尺寸) -->
        <button
          type="button"
          @click="handleHint"
          :disabled="turnSeat !== 0 || isAutoHost"
          class="min-w-[68px] sm:min-w-[80px] h-10 sm:h-11 px-3 py-2 text-xs sm:text-sm font-bold rounded-2xl transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-xl bg-black/85 backdrop-blur-md"
          :class="turnSeat === 0 && !isAutoHost
            ? 'bg-amber-950/90 hover:bg-amber-900 border border-amber-400/60 text-amber-200 hover:scale-105 active:scale-95 cursor-pointer ring-1 ring-amber-400/30'
            : 'bg-stone-900/40 text-stone-500 border border-stone-800/40 cursor-not-allowed opacity-45 pointer-events-none'"
          title="智能推荐可大过桌面的合法手牌组合"
        >
          <span>💡</span>
          <span>提示</span>
        </button>

        <!-- 4. 过牌按钮 (独立悬浮固定尺寸) -->
        <button
          type="button"
          @click="handlePass"
          :disabled="turnSeat !== 0 || !lastCombo || lastCombo.seat === 0 || isAutoHost"
          class="min-w-[68px] sm:min-w-[80px] h-10 sm:h-11 px-3 py-2 text-xs sm:text-sm font-bold rounded-2xl transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-xl bg-black/85 backdrop-blur-md"
          :class="(turnSeat === 0 && lastCombo && lastCombo.seat !== 0 && !isAutoHost)
            ? 'bg-stone-900/90 hover:bg-stone-800 border border-stone-400/50 text-[#E6DEC8] hover:scale-105 active:scale-95 cursor-pointer ring-1 ring-white/15'
            : 'bg-stone-900/40 text-stone-500 border border-stone-800/40 cursor-not-allowed opacity-45 pointer-events-none'"
          title="不出本轮手牌，过牌给下一家"
        >
          过牌
        </button>

        <!-- 5. 出牌按钮 (独立悬浮固定尺寸，高亮大面积) -->
        <button
          type="button"
          @click="handlePlay"
          :disabled="turnSeat !== 0 || selectedIds.size === 0 || isAutoHost"
          class="min-w-[88px] sm:min-w-[104px] h-10 sm:h-11 px-4 py-2 text-xs sm:text-sm font-extrabold rounded-2xl transition-all flex items-center justify-center gap-2 shrink-0 shadow-2xl bg-black/85 backdrop-blur-md"
          :class="(turnSeat === 0 && selectedIds.size > 0 && !isAutoHost)
            ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-[0_4px_24px_rgba(239,68,68,0.75)] hover:scale-105 active:scale-95 cursor-pointer ring-2 ring-red-400'
            : 'bg-stone-900/40 text-stone-500 border border-stone-800/40 cursor-not-allowed opacity-45 pointer-events-none'"
          title="打出当前选中的手牌组合"
        >
          <span>出牌</span>
          <span class="inline-flex items-center justify-center min-w-[20px] text-[11px] font-mono bg-black/50 px-1.5 py-0.5 rounded-full border border-white/25" :style="{ visibility: selectedIds.size > 0 ? 'visible' : 'hidden' }">
            {{ selectedIds.size > 0 ? selectedIds.size : '0' }}
          </span>
        </button>

        <!-- 6. 特殊起手特权组：强攻 / 投降 (独立悬浮固定尺寸占位) -->
        <div class="flex items-center gap-2 shrink-0 pl-1 border-l border-white/20 transition-all" :style="{ visibility: (canShowQiangGongBtn || canShowSurrenderBtn) ? 'visible' : 'hidden', pointerEvents: (canShowQiangGongBtn || canShowSurrenderBtn) ? 'auto' : 'none', opacity: (canShowQiangGongBtn || canShowSurrenderBtn) ? '1' : '0' }">
          <button
            v-if="canShowQiangGongBtn"
            type="button"
            @click="handleQiangGong(0)"
            class="min-w-[68px] sm:min-w-[80px] h-10 sm:h-11 px-3 py-2 text-xs sm:text-sm font-extrabold rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-[0_0_16px_rgba(239,68,68,0.9)] border border-amber-300 ring-2 ring-red-500 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 animate-pulse cursor-pointer shrink-0"
            title="开启强攻：所有已出牌收回，由方块4先出重新开打，独胜独输翻倍"
          >
            <span>🔥</span>
            <span>强攻</span>
          </button>
          <button
            v-if="canShowSurrenderBtn"
            type="button"
            @click="handleSurrender"
            class="min-w-[68px] sm:min-w-[80px] h-10 sm:h-11 px-3 py-2 text-xs sm:text-sm font-bold rounded-2xl bg-stone-900/90 hover:bg-stone-800 border border-stone-400/50 text-stone-200 shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            title="起手投降认输"
          >
            <span>🏳️</span>
            <span>投降</span>
          </button>
        </div>
      </div>

      <!-- Player Played Cards Inspection Modal (点击任意玩家头像框可大图查阅已打出的全部手牌) -->
      <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
        <div
          v-if="inspectedSeat !== null"
          class="absolute inset-0 bg-black/80 backdrop-blur-sm z-35 flex items-center justify-center p-3 pointer-events-auto"
          @click.self="inspectedSeat = null"
        >
          <div class="bg-gradient-to-b from-[#1C1612] to-[#120D0A] border-2 border-amber-500/50 rounded-2xl p-4 max-w-lg w-full shadow-[0_10px_35px_rgba(0,0,0,0.9)] max-h-[88vh] flex flex-col">
            <div class="flex items-center justify-between pb-2 border-b border-white/10 mb-3 shrink-0">
              <div class="flex items-center gap-2">
                <span class="text-base">🎴</span>
                <span class="font-bold text-amber-300 text-sm font-serif-title">
                  【{{ ['本家', '西席', '北席', '东席'][inspectedSeat] }}】席位档案
                </span>
              </div>
              <button
                type="button"
                @click="inspectedSeat = null"
                class="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center text-xs cursor-pointer active:scale-95"
              >
                ✕
              </button>
            </div>

            <!-- Player Played Cards List -->
            <div class="flex-1 overflow-y-auto">
              <div v-if="(seatPlayedCards[inspectedSeat]?.length || 0) === 0" class="py-8 text-center text-xs text-stone-400">
                该席位本局目前尚未打出任何手牌
              </div>
              <div v-else class="flex flex-wrap gap-2 max-h-56 overflow-y-auto p-1 justify-center">
                <div
                  v-for="c in seatPlayedCards[inspectedSeat]"
                  :key="c.id"
                  class="w-10 sm:w-11 h-14 sm:h-15 rounded-md bg-white border border-stone-400/50 shadow-md flex flex-col justify-between p-1 select-none"
                  :class="c.isRed ? 'text-red-600' : 'text-stone-900'"
                >
                  <div class="text-[11px] font-bold leading-tight font-mono">{{ c.label }}</div>
                  <div class="text-sm self-center font-bold">{{ c.suit }}</div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="mt-3 pt-2 border-t border-white/10 flex items-center justify-between shrink-0">
              <span class="text-[11px] text-stone-400">
                已出牌: <strong class="text-amber-300 font-mono">{{ seatPlayedCards[inspectedSeat]?.length || 0 }}</strong> 张，剩余: <strong class="text-amber-300 font-mono">{{ hands[inspectedSeat]?.length || 0 }}</strong> 张
              </span>
              <button
                type="button"
                @click="inspectedSeat = null"
                class="px-4 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-200 text-xs font-bold cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      </transition>

      <!-- Victory Modal (Landscape adapted) -->
      <div
        v-if="winnerSeat !== null"
        class="absolute inset-0 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 text-center z-30 overflow-y-auto"
        :style="{
          backgroundColor: props.tableTheme?.feltColor || '#B91C1C',
          background: `radial-gradient(ellipse at 50% 45%, ${props.tableTheme?.highlightColor || '#EF4444'}dd 0%, ${props.tableTheme?.feltColor || '#B91C1C'}f2 60%, ${props.tableTheme?.edgeColor || '#7F1D1D'}fb 100%)`
        }"
      >
        <div class="text-3xl sm:text-4xl mb-1.5">{{ allianceScoreResult?.isTie ? '🤝' : '🏆' }}</div>
        <h3 class="text-xl sm:text-2xl font-bold text-amber-400 mb-1 font-serif-title">
          {{ allianceScoreResult?.isTie ? '烟三对局结束 · 双方平局打和！' : `烟三对局结束 · ${allianceScoreResult?.winnerAlliance} 获胜！` }}
        </h3>
        <p class="text-xs sm:text-sm text-amber-200/90 mb-3 font-mono max-w-xl">
          {{ allianceScoreResult?.summary }}
        </p>

        <!-- 各席位得分清单 -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 w-full max-w-lg">
          <div
            v-for="(sc, sIdx) in (allianceScoreResult?.seatScores || [0,0,0,0])"
            :key="sIdx"
            class="p-2 rounded-xl bg-black/60 border border-white/10 text-center"
            :class="{ 'border-amber-400/50 bg-amber-950/40': sIdx === winnerSeat }"
          >
            <div class="text-[11px] text-stone-400 font-semibold">{{ ['本家', '西席', '北席', '东席'][sIdx] }}</div>
            <div class="text-sm font-bold font-mono" :class="sc >= 0 ? 'text-amber-400' : 'text-red-400'">
              {{ sc >= 0 ? `+${sc}` : sc }} 分
            </div>
          </div>
        </div>

        <p class="text-[11px] sm:text-xs text-[#B8A99A] mb-4">
          出牌出清顺序：{{ finishedSeats.map(s => `${s+1}号玩家(${['本家', '西席', '北席', '东席'][s]})`).join(' ➔ ') }}
        </p>
        <div class="flex items-center gap-3">
          <button
            type="button"
            @click="selectedRoom = null"
            class="px-5 py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 text-xs sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap shrink-0 shadow-lg active:scale-95"
          >
            返回大厅
          </button>
          <button
            type="button"
            @click="dealNewMatch"
            class="px-6 py-2 bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all whitespace-nowrap shrink-0 shadow-lg active:scale-95"
          >
            再战烟三
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { soundFX } from '../../utils/sound';
import { haptics } from '../../utils/haptics';
import { TableTheme } from '../../utils/theme';
import { getCanvasEventCoords } from '../../utils/canvasCoords';
import { renderPlayingCard, preloadCardAssets, onCardAssetsLoaded } from '../../utils/cardAssets';
import {
  detectYansanSpecialHolders,
  calculateYansanSettlement,
  calculateYansanSurrenderSettlement,
  getYansanAIPlay,
  getYansanSmartAIPlay,
  inferYansanAlliances,
  parseYansanCombo,
  isYansanComboDeductivelyUnbeatable,
  YansanCard,
  YansanCombo,
  YansanPlayRecord,
  YansanSeatBelief,
  getYansanComboLabel,
} from '../../engine/yansanRules';

interface Card {
  id: string;
  rank: number; // 3..15 (15=2, 14=A, 13=K... 3=3)
  suitVal: number; // 4=♠, 3=♥, 2=♣, 1=♦
  label: string;
  suit: '♠' | '♥' | '♣' | '♦';
  isRed: boolean;
}

interface Combo {
  seat: number;
  cards: Card[];
  type: string;
  comboTier?: number;
  primaryRank: number;
  primarySuitVal: number;
  flushSuit?: number;
  label: string;
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
  (e: 'status', payload: any): void;
  (e: 'exit'): void;
}>();

function emitStatus() {
  emit('status', {
    turnSeat: turnSeat.value,
    turnText: turnSeat.value === 0 ? '轮到本家' : `席位${turnSeat.value + 1}出牌`,
    cards: hands[0]?.length || 0,
    isAutoHost: isAutoHost.value,
  });
}

watch(() => props.tableTheme, () => {
  drawTable();
});

const containerRef = ref<HTMLDivElement | null>(null);
const tableWidthPx = ref(680);
const tableHeightPx = ref(430);
let resizeObserver: ResizeObserver | null = null;

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
  drawTable();
}

const canvasRef = ref<HTMLCanvasElement | null>(null);
const hands = reactive<Card[][]>([[], [], [], []]);
const initialHands: Card[][] = [[], [], [], []];
const selectedIds = reactive(new Set<string>());
const hintCombos = ref<Card[][]>([]);
const hintIndex = ref<number>(0);
const lastHintStateKey = ref<string>('');
const turnSeat = ref(0);
const lastCombo = ref<Combo | null>(null);
const seatStatus = reactive(['等待出牌', '等待', '等待', '等待']);
const winnerSeat = ref<number | null>(null);
const errorTip = ref('');
const isDragging = ref(false);
const isFirstTurn = ref(true);
const showRulesModal = ref(false);
const consecutivePasses = ref(0);

// 记牌器历史与各席位打出的所有牌
const playedCardsHistory = ref<Card[]>([]);
const seatPlayedCards = reactive<Card[][]>([[], [], [], []]);
const inspectedSeat = ref<number | null>(null);
const inspectedTab = ref<'played' | 'mind'>('played');

// 人机智能战术心智与全场出牌历史推断
const playHistory = ref<YansanPlayRecord[]>([]);
const aiThoughts = reactive<string[]>(['', '', '', '']);
const aiBeliefs = reactive<YansanSeatBelief[][]>([[], [], [], []]);
const latestThoughtBubble = reactive<string[]>(['', '', '', '']);
const latestThoughtBubbleTimer = [null, null, null, null] as any[];
const showAiMindModal = ref(false);

const currentTableInference = computed(() => {
  return inferYansanAlliances(
    0,
    hands[0] || [],
    seatPlayedCards,
    playHistory.value,
    [hands[0]?.length || 0, hands[1]?.length || 0, hands[2]?.length || 0, hands[3]?.length || 0],
    isQiangGongActive.value,
    qiangGongSeat.value
  );
});

const unbeatableNotice = ref('');
let unbeatableTimer: any = null;
let unbeatablePauseTimer: any = null;

// 报单警报状态（仅剩1张牌）
const baodanNotice = ref('');
let baodanTimer: any = null;
const baodanAlertedSeats = reactive(new Set<number>());

function checkAndTriggerBaoDan(seat: number) {
  if (hands[seat].length === 1 && !baodanAlertedSeats.has(seat) && !finishedSeats.includes(seat)) {
    baodanAlertedSeats.add(seat);
    const names = ['本家', '西席', '北席', '东席'];
    const seatName = names[seat];
    baodanNotice.value = seat === 0
      ? '🚨 警报：您已报单（仅剩最后 1 张手牌）！'
      : `🚨 警报：【${seatName}】已报单（仅剩 1 张手牌）！`;
    if (baodanTimer) clearTimeout(baodanTimer);
    baodanTimer = setTimeout(() => {
      baodanNotice.value = '';
    }, 3200);

    if (seat === 0) {
      soundFX.speakAction('baodan_self');
    } else {
      soundFX.speakVoice(`${seatName}报单，只剩一张牌！`);
    }
    haptics.tap();
  }
}
const isQiangGongActive = ref(false);
const qiangGongSeat = ref<number | null>(null);
const danmakuText = ref('');
let danmakuTimer: any = null;
const spade3Seat = ref(0);
const spadeASeat = ref(0);
const animTime = ref(0);
let animFrameId: number | null = null;
let botTimer: any = null;

function hasSpade3AndA(seat: number): boolean {
  const h = hands[seat];
  if (!h || h.length === 0) return false;
  return h.some(c => c.rank === 3 && c.suit === '♠') && h.some(c => c.rank === 14 && c.suit === '♠');
}

// 玩家及各席位是否已执行过过牌（规则补加：拿有黑桃A和黑桃3的玩家，哪怕手牌还是13张，只要点了过牌，强攻和投降按钮也立即消失）
const hasPassedSeats = reactive<boolean[]>([false, false, false, false]);

// 强攻按钮：拿有黑桃A和黑桃3的玩家13张手牌都没有出的情况下才显示强攻按钮，只要手牌不足13张或点了过牌就不显示，点击强攻后强攻按钮消失
const canShowQiangGongBtn = computed(() => {
  return (
    !!selectedRoom.value &&
    winnerSeat.value === null &&
    !isQiangGongActive.value &&
    !hasPassedSeats[0] &&
    (hands[0]?.length === 13) &&
    hasSpade3AndA(0)
  );
});

// 投降按钮：仅限于同时拿有黑桃A和黑桃3的玩家，且在13张手牌都没有出且未点过牌的情况下显示，只要打出任意一张牌、点了过牌或强攻后就消失
const canShowSurrenderBtn = computed(() => {
  return (
    !!selectedRoom.value &&
    winnerSeat.value === null &&
    !isQiangGongActive.value &&
    !hasPassedSeats[0] &&
    (hands[0]?.length === 13) &&
    hasSpade3AndA(0)
  );
});

function handleSurrender() {
  if (winnerSeat.value !== null || (hands[0]?.length || 0) !== 13 || hasPassedSeats[0]) return;

  stopTurnCountdown();
  if (botTimer) clearTimeout(botTimer);
  if (autoHostTimer) clearTimeout(autoHostTimer);
  if (animFrameId) cancelAnimationFrame(animFrameId);

  const res = calculateYansanSurrenderSettlement(selectedRoom.value || '5-10', 0);
  winnerSeat.value = 1;
  finishedSeats.splice(0, finishedSeats.length, 1, 2, 3, 0);

  allianceScoreResult.value = {
    winnerAlliance: res.winnerAlliance,
    score: Math.abs(res.seatScores[0]),
    summary: res.summary,
    seatScores: res.seatScores,
  };

  if (typeof soundFX.playDefeat === 'function') soundFX.playDefeat();
  else soundFX.playTap?.();
  soundFX.speakVoice('本家起手认输投降！', 1.05, 1.0);
  drawTable();

  emit('move', {
    winner: 1,
    pointsDelta: res.seatScores[0],
    detailText: res.summary,
    finishedSeats: [...finishedSeats],
    allianceScoreResult: allianceScoreResult.value,
  });
}

function handleQiangGong(seat: number) {
  if (isQiangGongActive.value || winnerSeat.value !== null) return;
  if (!hasSpade3AndA(seat) || (hands[seat]?.length || 0) !== 13 || hasPassedSeats[seat]) return;

  isQiangGongActive.value = true;
  qiangGongSeat.value = seat;

  // 1. 所有玩家打出的牌自动收回去，恢复初始13张手牌，重新开始出牌
  for (let i = 0; i < 4; i++) {
    hands[i] = sortCards([...initialHands[i]]);
  }
  lastCombo.value = null;
  consecutivePasses.value = 0;
  playedCardsHistory.value = [];
  for (let i = 0; i < 4; i++) seatPlayedCards[i] = [];
  baodanAlertedSeats.clear();
  unbeatableNotice.value = '';
  baodanNotice.value = '';
  finishedSeats.splice(0, finishedSeats.length);
  selectedIds.clear();
  errorTip.value = '';

  // 强攻不是首出牌权，仍然由方块4先出
  let starter = 0;
  for (let i = 0; i < 4; i++) {
    if (initialHands[i].some((c) => c.rank === 4 && c.suit === '♦')) {
      starter = i;
      break;
    }
  }
  turnSeat.value = starter;
  isFirstTurn.value = true;

  const seatNames = ['本家', '西席', '北席', '东席'];
  for (let i = 0; i < 4; i++) {
    seatStatus[i] = i === starter ? '先手出方块4' : '等待';
  }

  // 2. 弹幕提示其他玩家该玩家强攻，倍数翻倍
  const announcer = seatNames[seat];
  danmakuText.value = `🔥【${announcer} 宣布强攻】倍数翻倍！所有手牌收回，重新出牌！`;
  if (danmakuTimer) clearTimeout(danmakuTimer);
  danmakuTimer = setTimeout(() => {
    danmakuText.value = '';
  }, 4500);

  // 3. 语音播报与音效
  soundFX.playCardSnap(true);
  soundFX.speakVoice(`${announcer}宣布强攻！倍数翻倍，重新出牌！`, 1.1, 1.05);
  emit('fx', 'bomb');
  haptics.bomb();

  // 4. 保持头像框变成红色一闪一闪
  startPulseLoop();
  drawTable();

  if (starter !== 0) {
    stopTurnCountdown();
    if (botTimer) clearTimeout(botTimer);
    botTimer = setTimeout(() => {
      runBotTurns(starter);
    }, 700);
  } else if (isAutoHost.value) {
    stopTurnCountdown();
    checkAutoHostTurn();
  } else {
    startTurnCountdown();
  }
}

function startPulseLoop() {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  function loop() {
    if (!isQiangGongActive.value || winnerSeat.value !== null) {
      drawTable();
      return;
    }
    animTime.value = performance.now();
    drawTable();
    animFrameId = requestAnimationFrame(loop);
  }
  animFrameId = requestAnimationFrame(loop);
}

const isAutoHost = ref(false);
let autoHostTimer: any = null;
let playerAutoTimer: any = null;
const turnCountdown = ref(60);
let countdownInterval: any = null;

function stopTurnCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  if (playerAutoTimer) {
    clearTimeout(playerAutoTimer);
    playerAutoTimer = null;
  }
  turnCountdown.value = 60;
}

function startTurnCountdown() {
  stopTurnCountdown();
  if (turnSeat.value === 0 && winnerSeat.value === null && !isAutoHost.value) {
    turnCountdown.value = 60;
    countdownInterval = setInterval(() => {
      if (turnSeat.value !== 0 || winnerSeat.value !== null || isAutoHost.value) {
        stopTurnCountdown();
        return;
      }
      turnCountdown.value--;
      if (turnCountdown.value <= 0) {
        stopTurnCountdown();
        isAutoHost.value = true;
        errorTip.value = '思考超时1分钟，已自动开启托管！';
        if (typeof soundFX.speakVoice === 'function') {
          soundFX.speakVoice('思考超时，自动开启托管');
        }
        emitStatus();
        checkAutoHostTurn();
      }
    }, 1000);
  }
}

/**
 * 玩家智能自动响应中枢：
 * 1. 报单出牌权：当本家打出一手牌后报单(余1张)且获得连续出牌权(全场要不起/绝大)，自动将最后一张单牌打出出清！
 * 2. 张数不足自动点过：当对手打出5张牌型(顺子/同花/俘虏等)而本家余牌不足5张(如剩3张)，或对子余1张，自动点过！
 * 3. 绝对要不起自动点过：手牌任何组合均无法压制桌面牌型时，自动点过，极大提升畅快体验！
 */
function checkPlayerAutoTurnActions(): boolean {
  if (turnSeat.value !== 0 || winnerSeat.value !== null) return false;

  const myHand = hands[0] || [];
  const myCount = myHand.length;
  if (myCount === 0) return false;

  // 1. 领牌 / 连续出牌权分支：
  // 桌面无牌（上一轮对手全部过牌），或者上一手牌就是本家出的（绝大连出）
  const isLeadTurn = !lastCombo.value || lastCombo.value.seat === 0;
  if (isLeadTurn) {
    // 若手牌仅剩最后 1 张（报单）：玩家拥有连续出牌权，手中只有这唯一一张牌，自动打出出清！
    if (myCount === 1) {
      stopTurnCountdown();
      seatStatus[0] = '🚨 报单绝杀 · 自动打出最后一张牌...';
      drawTable();
      emitStatus();
      playerAutoTimer = setTimeout(() => {
        if (turnSeat.value === 0 && (!lastCombo.value || lastCombo.value.seat === 0) && (hands[0]?.length || 0) === 1) {
          executeBaoDanPlay(0);
        }
      }, 700);
      return true;
    }
    return false;
  }

  // 2. 跟牌压制分支：桌上有其他玩家打出的待压制牌型
  const targetCombo = lastCombo.value;
  if (targetCombo && targetCombo.seat !== 0) {
    const targetLength = targetCombo.cards.length;

    // 规则关键细节：比如我剩下三张手牌，其他玩家打出五张的牌型，必然无法跟牌，自动点过！
    if (myCount < targetLength) {
      stopTurnCountdown();
      seatStatus[0] = `余牌不足${targetLength}张 · 自动点过`;
      drawTable();
      emitStatus();
      playerAutoTimer = setTimeout(() => {
        if (turnSeat.value === 0 && lastCombo.value && lastCombo.value.seat !== 0 && (hands[0]?.length || 0) < lastCombo.value.cards.length) {
          handlePass();
        }
      }, 850);
      return true;
    }

    // 进阶推断：手牌张数虽够，但全副手牌没有任何牌型能大过桌面牌型（例如对方打出黑桃3单张，或大顺子/大俘虏）
    const canBeatAny = findWinningCombo(myHand, targetCombo, 0);
    if (!canBeatAny) {
      stopTurnCountdown();
      seatStatus[0] = '要不起 · 自动点过';
      drawTable();
      emitStatus();
      playerAutoTimer = setTimeout(() => {
        if (turnSeat.value === 0 && lastCombo.value && lastCombo.value.seat !== 0 && !findWinningCombo(hands[0] || [], lastCombo.value, 0)) {
          handlePass();
        }
      }, 900);
      return true;
    }
  }

  return false;
}

function getInitialRoom(): string | null {
  if (!props.sceneMode) return null;
  if (props.sceneMode.includes('10-20')) return '10-20';
  if (props.sceneMode.includes('20-40')) return '20-40';
  return '5-10';
}

const selectedRoom = ref<string | null>(getInitialRoom());

watch(() => props.sceneMode, (newVal) => {
  if (newVal && !selectedRoom.value) {
    if (newVal.includes('10-20')) selectedRoom.value = '10-20';
    else if (newVal.includes('20-40')) selectedRoom.value = '20-40';
    else selectedRoom.value = '5-10';
  }
}, { immediate: true });

function selectRoom(room: string) {
  selectedRoom.value = room;
  soundFX.playTap();
  dealNewMatch();
}

function toggleAutoHost() {
  isAutoHost.value = !isAutoHost.value;
  soundFX.playTap();
  emitStatus();
  if (isAutoHost.value) {
    stopTurnCountdown();
    if (turnSeat.value === 0 && winnerSeat.value === null) {
      checkAutoHostTurn();
    }
  } else {
    if (turnSeat.value === 0 && winnerSeat.value === null) {
      startTurnCountdown();
    }
  }
}

function checkAutoHostTurn() {
  if (!isAutoHost.value || turnSeat.value !== 0 || winnerSeat.value !== null) return;
  if (autoHostTimer) clearTimeout(autoHostTimer);

  seatStatus[0] = '⚡ 托管思考出牌中...';
  drawTable();

  // 自愈修复：若本家手中无方块4，说明首出已结束，重置首出标记防卡死
  if (isFirstTurn.value && !hands[0].some((c) => c.rank === 4 && c.suit === '♦')) {
    isFirstTurn.value = false;
  }

  // 拟真思考时间 (1000ms ~ 1400ms)，给足观感时间，防止过快出牌让人看不清
  const delay = 1000 + Math.floor(Math.random() * 400);
  autoHostTimer = setTimeout(() => {
    if (!isAutoHost.value || turnSeat.value !== 0 || winnerSeat.value !== null) return;

    if (isFirstTurn.value && !hands[0].some((c) => c.rank === 4 && c.suit === '♦')) {
      isFirstTurn.value = false;
    }

    let playCards = getEnhancedAIPlay(0);

    // 校验牌型是否能真正打出并大过桌面
    if (playCards && playCards.length > 0) {
      const ev = evaluateCombo(playCards, 0);
      if (!ev || (lastCombo.value && lastCombo.value.seat !== 0 && !canBeat(ev, lastCombo.value))) {
        playCards = null;
      }
    }

    // 领牌保障：若是本家领牌回合(桌面无牌或上一手为本家出牌)，绝对不可过牌，必须出牌！
    const isLeadTurn = !lastCombo.value || lastCombo.value.seat === 0;
    if (isLeadTurn && (!playCards || playCards.length === 0)) {
      const d4 = isFirstTurn.value ? hands[0].find((c) => c.rank === 4 && c.suit === '♦') : null;
      const smallest = sortCards(hands[0])[0];
      playCards = d4 ? [d4] : (smallest ? [smallest] : null);
    }

    if (playCards && playCards.length > 0) {
      selectedIds.clear();
      playCards.forEach((c) => selectedIds.add(c.id));
      drawTable();

      setTimeout(() => {
        if (!isAutoHost.value || turnSeat.value !== 0 || winnerSeat.value !== null) return;
        selectedIds.clear();
        playCards!.forEach((c) => selectedIds.add(c.id));
        handlePlay();

        // 终极容错保障：若 handlePlay 异常未能推进，强制兜底解决卡死
        if (turnSeat.value === 0 && winnerSeat.value === null && isAutoHost.value) {
          if (lastCombo.value && lastCombo.value.seat !== 0) {
            handlePass();
          } else {
            const fallbackCard = (isFirstTurn.value && hands[0].find((c) => c.rank === 4 && c.suit === '♦')) || sortCards(hands[0])[0];
            if (fallbackCard) {
              selectedIds.clear();
              selectedIds.add(fallbackCard.id);
              handlePlay();
            }
          }
        }
      }, 250);
    } else {
      if (lastCombo.value && lastCombo.value.seat !== 0) {
        handlePass();
      } else {
        const fallbackCard = (isFirstTurn.value && hands[0].find((c) => c.rank === 4 && c.suit === '♦')) || sortCards(hands[0])[0];
        if (fallbackCard) {
          selectedIds.clear();
          selectedIds.add(fallbackCard.id);
          handlePlay();
        }
      }
    }
  }, delay);
}

const SUITS: { suit: '♠' | '♥' | '♣' | '♦'; suitVal: number; isRed: boolean }[] = [
  { suit: '♠', suitVal: 4, isRed: false },
  { suit: '♥', suitVal: 3, isRed: true },
  { suit: '♣', suitVal: 2, isRed: false },
  { suit: '♦', suitVal: 1, isRed: true },
];

const RANKS = [
  { rank: 3, label: '3' }, { rank: 4, label: '4' }, { rank: 5, label: '5' },
  { rank: 6, label: '6' }, { rank: 7, label: '7' }, { rank: 8, label: '8' },
  { rank: 9, label: '9' }, { rank: 10, label: '10' }, { rank: 11, label: 'J' },
  { rank: 12, label: 'Q' }, { rank: 13, label: 'K' }, { rank: 14, label: 'A' },
  { rank: 15, label: '2' },
];

function createDeck(): Card[] {
  const pool: Card[] = [];
  for (const r of RANKS) {
    for (const s of SUITS) {
      pool.push({
        id: `${r.label}-${s.suit}`,
        rank: r.rank,
        suitVal: s.suitVal,
        label: r.label,
        suit: s.suit,
        isRed: s.isRed,
      });
    }
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function getRankWeight(rank: number): number {
  if (rank === 3) return 13;
  if (rank === 15) return 12; // 2
  if (rank === 14) return 11; // A
  if (rank === 13) return 10; // K
  if (rank === 12) return 9;  // Q
  if (rank === 11) return 8;  // J
  if (rank === 10) return 7;  // 10
  if (rank === 9) return 6;   // 9
  if (rank === 8) return 5;   // 8
  if (rank === 7) return 4;   // 7
  if (rank === 6) return 3;   // 6
  if (rank === 5) return 2;   // 5
  if (rank === 4) return 1;   // 4
  return 0;
}

function getCardPower(c: Card): number {
  return getRankWeight(c.rank) * 10 + c.suitVal;
}

function sortCards(c: Card[]): Card[] {
  return [...c].sort((a, b) => getCardPower(b) - getCardPower(a));
}

const finishedSeats = reactive<number[]>([]);
const allianceScoreResult = ref<{ winnerAlliance: string; score: number; summary: string; seatScores?: number[] } | null>(null);

function dealNewMatch() {
  if (!selectedRoom.value) return;
  if (animFrameId) cancelAnimationFrame(animFrameId);
  if (botTimer) clearTimeout(botTimer);
  if (unbeatablePauseTimer) clearTimeout(unbeatablePauseTimer);
  if (danmakuTimer) clearTimeout(danmakuTimer);
  danmakuText.value = '';
  isQiangGongActive.value = false;
  qiangGongSeat.value = null;
  hasPassedSeats.splice(0, 4, false, false, false, false);

  const deck = createDeck();
  initialHands[0] = sortCards(deck.slice(0, 13));
  initialHands[1] = sortCards(deck.slice(13, 26));
  initialHands[2] = sortCards(deck.slice(26, 39));
  initialHands[3] = sortCards(deck.slice(39, 52));

  hands[0] = [...initialHands[0]];
  hands[1] = [...initialHands[1]];
  hands[2] = [...initialHands[2]];
  hands[3] = [...initialHands[3]];

  // 检测黑桃3与黑桃A持有人，动态确立同盟（同盟不固定位置）
  const holders = detectYansanSpecialHolders(hands);
  spade3Seat.value = holders.spade3Seat;
  spadeASeat.value = holders.spadeASeat;

  let starter = 0;
  for (let i = 0; i < 4; i++) {
    if (hands[i].some((c) => c.rank === 4 && c.suit === '♦')) {
      starter = i;
      break;
    }
  }
  turnSeat.value = starter;
  isFirstTurn.value = true;
  lastCombo.value = null;
  consecutivePasses.value = 0;
  playedCardsHistory.value = [];
  playHistory.value = [];
  for (let i = 0; i < 4; i++) {
    seatPlayedCards[i] = [];
    aiThoughts[i] = '';
    aiBeliefs[i] = [];
    latestThoughtBubble[i] = '';
  }
  baodanAlertedSeats.clear();
  unbeatableNotice.value = '';
  baodanNotice.value = '';
  winnerSeat.value = null;
  finishedSeats.splice(0, finishedSeats.length);
  allianceScoreResult.value = null;
  selectedIds.clear();
  seatStatus.forEach((_, idx) => {
    seatStatus[idx] = idx === starter ? '先手出方块4' : '等待';
  });

  drawTable();
  emit('restart');
  emitStatus();

  if (starter !== 0) {
    stopTurnCountdown();
    // 留出 2.0 秒给洗发牌与玩家理牌看牌时间，避免刚进房间就听到机器人出牌语音
    seatStatus[starter] = `${['本家', '西席', '北席', '东席'][starter]} 执♦4准备首出...`;
    if (botTimer) clearTimeout(botTimer);
    botTimer = setTimeout(() => {
      if (!selectedRoom.value) return;
      runBotTurns(starter);
    }, 2000);
  } else if (isAutoHost.value && turnSeat.value === 0) {
    stopTurnCountdown();
    checkAutoHostTurn();
  } else {
    startTurnCountdown();
  }
}

// 逆时针寻找下一个手牌未走完的存活席位：本家(0) ➔ 东席(3) ➔ 北席(2) ➔ 西席(1) ➔ 本家(0)
function getNextActiveSeat(fromSeat: number): number {
  let s = (fromSeat - 1 + 4) % 4;
  let guard = 0;
  while (finishedSeats.includes(s) && guard < 4) {
    s = (s - 1 + 4) % 4;
    guard++;
  }
  return s;
}

function checkGameFinishAfterPlay(seat: number) {
  if (!finishedSeats.includes(seat)) {
    finishedSeats.push(seat);
  }

  const isQiangGong = isQiangGongActive.value;
  let shouldEnd = false;

  if (isQiangGong) {
    // 强攻规则：只要强攻者打完，或者其他任意一家打完，游戏立即结束！
    shouldEnd = finishedSeats.length >= 1;
  } else if (spade3Seat.value !== spadeASeat.value) {
    // 2v2 经典同盟对决：
    // 当两个农民或者两个同盟的先打完手牌就立即结束游戏！
    const spadeFinishedCount = finishedSeats.filter(
      (s) => s === spade3Seat.value || s === spadeASeat.value
    ).length;
    const farmerFinishedCount = finishedSeats.filter(
      (s) => s !== spade3Seat.value && s !== spadeASeat.value
    ).length;

    shouldEnd = spadeFinishedCount >= 2 || farmerFinishedCount >= 2 || finishedSeats.length >= 3;
  } else {
    // 独占 ♠3 & ♠A (1 vs 3 模式):
    const soloSeat = spade3Seat.value;
    const soloFinished = finishedSeats.includes(soloSeat);
    const farmerFinishedCount = finishedSeats.filter((s) => s !== soloSeat).length;
    shouldEnd = soloFinished || farmerFinishedCount >= 2 || finishedSeats.length >= 3;
  }

  if (shouldEnd) {
    if (botTimer) clearTimeout(botTimer);
    if (autoHostTimer) clearTimeout(autoHostTimer);
    if (animFrameId) cancelAnimationFrame(animFrameId);

    const firstWinner = finishedSeats[0];
    winnerSeat.value = firstWinner;

    const result = calculateYansanSettlement(
      selectedRoom.value || '5-10',
      firstWinner,
      isQiangGongActive.value,
      qiangGongSeat.value,
      spade3Seat.value,
      spadeASeat.value,
      [...finishedSeats]
    );

    allianceScoreResult.value = {
      winnerAlliance: result.winnerAlliance,
      score: Math.abs(result.seatScores[0]),
      summary: result.summary,
      seatScores: result.seatScores,
      isTie: result.isTie,
    };

    const myDelta = result.seatScores[0];
    if (myDelta > 0) {
      if (typeof soundFX.playVictory === 'function') soundFX.playVictory();
      else soundFX.playTap?.();
    } else if (myDelta < 0) {
      if (typeof soundFX.playDefeat === 'function') soundFX.playDefeat();
      else soundFX.playTap?.();
    } else {
      soundFX.playTap?.();
      soundFX.speakVoice?.('双方势均力敌，本局打和！');
    }

    emit('move', {
      winner: myDelta > 0 ? 0 : (myDelta < 0 ? firstWinner : -1),
      pointsDelta: myDelta,
      detailText: result.summary,
      finishedSeats: [...finishedSeats],
      allianceScoreResult: allianceScoreResult.value,
    });
  }
}

function evaluateCombo(cards: Card[], seat: number): Combo | null {
  if (cards.length === 0) return null;
  const sorted = sortCards(cards);
  const n = sorted.length;
  const counts = new Map<number, number>();
  for (const c of sorted) counts.set(c.rank, (counts.get(c.rank) || 0) + 1);

  // 1. 单张 (1张)
  if (n === 1) {
    return { seat, cards: sorted, type: 'single', primaryRank: sorted[0].rank, primarySuitVal: getCardPower(sorted[0]), label: `单张 ${sorted[0].label}${sorted[0].suit}` };
  }

  // 2. 一对 (2张)
  if (n === 2 && sorted[0].rank === sorted[1].rank) {
    return { seat, cards: sorted, type: 'pair', primaryRank: sorted[0].rank, primarySuitVal: Math.max(getCardPower(sorted[0]), getCardPower(sorted[1])), label: `对子 ${sorted[0].label}对` };
  }

  // 3. 三条 (3张)
  if (n === 3 && counts.size === 1) {
    return { seat, cards: sorted, type: 'triple', primaryRank: sorted[0].rank, primarySuitVal: getCardPower(sorted[0]), label: `三条 ${sorted[0].label}` };
  }

  // 烟三规则：没有纯4张炸弹，没有纯同花！

  // 4. 五张牌型（顺子、同花、俘虏、四带一、同花顺）
  if (n === 5) {
    const isFlush = sorted.every((c) => c.suit === sorted[0].suit);
    const ranks = sorted.map(c => c.rank).sort((a, b) => a - b);
    
    // 顺子判断：连续5张递增1，或者特殊回环顺 A-2-3-4-5
    let isNormalSeq = true;
    for (let i = 1; i < 5; i++) {
      if (ranks[i] !== ranks[i - 1] + 1) {
        isNormalSeq = false;
        break;
      }
    }
    if (ranks.includes(15)) isNormalSeq = false;
    const isA2345 = (ranks[0] === 3 && ranks[1] === 4 && ranks[2] === 5 && ranks[3] === 14 && ranks[4] === 15);
    const is10JQKA = (ranks[0] === 10 && ranks[1] === 11 && ranks[2] === 12 && ranks[3] === 13 && ranks[4] === 14);
    
    // 烟三规则：10JQKA 如果同花可以出（属于同花牌型，不属于同花顺）；如果是杂色则不可出！
    const isLegalStraight = (isNormalSeq || isA2345) && !is10JQKA;

    // ① 同花顺 (Tier 5)：同花色且构成合法顺子 (允许A2345/34567，不可出10JQKA)
    // 规则：同花顺先比花色(♠>♥>♣>♦)，相同花色比单张最大的牌
    if (isFlush && isLegalStraight) {
      const maxCard = sorted.reduce((max, c) => (getCardPower(c) > getCardPower(max) ? c : max), sorted[0]);
      return {
        seat,
        cards: sorted,
        type: '5_card',
        comboTier: 5,
        primaryRank: maxCard.rank,
        primarySuitVal: getCardPower(maxCard),
        flushSuit: sorted[0].suitVal,
        label: isA2345 ? `同花顺 (A2345 · ${maxCard.suit})` : `同花顺 (${maxCard.suit})`
      };
    }

    // ② 四带一 (Tier 4)：4张相同点数 + 任意1张单牌
    for (const [rk, cnt] of counts.entries()) {
      if (cnt === 4) {
        return {
          seat,
          cards: sorted,
          type: '5_card',
          comboTier: 4,
          primaryRank: rk,
          primarySuitVal: 0,
          label: `四带一`
        };
      }
    }

    // ③ 俘虏 (Tier 3)：3张同点 + 1个对子 (三带一对 / 葫芦)
    for (const [rk, cnt] of counts.entries()) {
      if (cnt === 3 && counts.size === 2) {
        return {
          seat,
          cards: sorted,
          type: '5_card',
          comboTier: 3,
          primaryRank: rk,
          primarySuitVal: 0,
          label: `俘虏 (三带一对)`
        };
      }
    }

    // ④ 同花 (Tier 2)：5张同花色牌（包含同花色 10 J Q K A，或其他同花）
    // 规则：同花先比花色(♠>♥>♣>♦)，相同花色比单张最大的牌
    if (isFlush) {
      const maxCard = sorted.reduce((max, c) => (getCardPower(c) > getCardPower(max) ? c : max), sorted[0]);
      return {
        seat,
        cards: sorted,
        type: '5_card',
        comboTier: 2,
        primaryRank: maxCard.rank,
        primarySuitVal: getCardPower(maxCard),
        flushSuit: sorted[0].suitVal,
        label: is10JQKA ? `同花 (10JQKA · ${sorted[0].suit})` : `同花 (${sorted[0].suit})`
      };
    }

    // ⑤ 顺子 (Tier 1)：5张杂色点数相连牌，包含A2345与34567，唯独不可出杂色 10 J Q K A
    // 规则：顺子是比单张最大的牌
    if (isLegalStraight) {
      const maxCard = sorted.reduce((max, c) => (getCardPower(c) > getCardPower(max) ? c : max), sorted[0]);
      return {
        seat,
        cards: sorted,
        type: '5_card',
        comboTier: 1,
        primaryRank: maxCard.rank,
        primarySuitVal: getCardPower(maxCard),
        label: isA2345 ? `顺子 (A2345)` : `顺子`
      };
    }
  }

  return null;
}

function canBeat(cand: Combo, target: Combo | null): boolean {
  if (!target || target.seat === cand.seat) return true;

  // 必须同类型相管（单张打单张，对子打对子，三条打三条，5张打5张）
  if (cand.type !== target.type) return false;

  if (cand.type === 'single' || cand.type === 'pair') {
    const candRW = getRankWeight(cand.primaryRank);
    const targetRW = getRankWeight(target.primaryRank);
    if (candRW !== targetRW) return candRW > targetRW;
    return cand.primarySuitVal > target.primarySuitVal;
  }
  if (cand.type === 'triple') {
    return getRankWeight(cand.primaryRank) > getRankWeight(target.primaryRank);
  }
  if (cand.type === '5_card') {
    const candTier = cand.comboTier || 1;
    const targTier = target.comboTier || 1;
    // 五张牌型压制：同花顺 (Tier 5) > 四带一 (Tier 4) > 俘虏 (Tier 3) > 同花 (Tier 2) > 顺子 (Tier 1)
    if (candTier !== targTier) return candTier > targTier;

    // 1. 同花顺 (Tier 5) 或 同花 (Tier 2)：先比花色（黑桃 > 红桃 > 梅花 > 方块），花色相同比单张最大牌
    if (candTier === 5 || candTier === 2) {
      const candSuit = cand.flushSuit || 0;
      const targetSuit = target.flushSuit || 0;
      if (candSuit !== targetSuit) return candSuit > targetSuit;
      // 相同花色比单张最大的牌
      const candRW = getRankWeight(cand.primaryRank);
      const targetRW = getRankWeight(target.primaryRank);
      if (candRW !== targetRW) return candRW > targetRW;
      return cand.primarySuitVal > target.primarySuitVal;
    }

    // 2. 四带一 (Tier 4) 或 俘虏 (Tier 3)：比主牌点数权重
    if (candTier === 4 || candTier === 3) {
      return getRankWeight(cand.primaryRank) > getRankWeight(target.primaryRank);
    }

    // 3. 顺子 (Tier 1)：顺子是比单张最大的牌
    if (candTier === 1) {
      const candRW = getRankWeight(cand.primaryRank);
      const targetRW = getRankWeight(target.primaryRank);
      if (candRW !== targetRW) return candRW > targetRW;
      return cand.primarySuitVal > target.primarySuitVal;
    }
  }
  return false;
}

function drawTable() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const width = 680;
  const height = 430;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const highlight = props.tableTheme?.highlightColor || '#EF4444';
  const felt = props.tableTheme?.feltColor || '#B91C1C';
  const edge = props.tableTheme?.edgeColor || '#7F1D1D';

  const grad = ctx.createRadialGradient(width / 2, height / 2 - 20, 20, width / 2, height / 2, 430);
  grad.addColorStop(0, highlight);
  grad.addColorStop(0.35, felt);
  grad.addColorStop(0.85, edge);
  grad.addColorStop(1, edge);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 0);
  ctx.stroke();
  ctx.restore();

  const drawSeat = (x: number, y: number, name: string, count: number, status: string, active: boolean, seatIdx: number) => {
    const isQiangGong = isQiangGongActive.value && qiangGongSeat.value === seatIdx;
    const pulse = 0.5 + 0.5 * Math.sin((animTime.value || performance.now()) / 120);

    const isBaoDan = count === 1 && !finishedSeats.includes(seatIdx);

    let fillStyle = active ? 'rgba(239, 68, 68, 0.38)' : 'rgba(0, 0, 0, 0.58)';
    let strokeStyle = active ? '#F87171' : 'rgba(255, 255, 255, 0.22)';
    let lineWidth = active ? 2 : 1;

    if (isBaoDan && !isQiangGong) {
      fillStyle = `rgba(220, 38, 38, ${0.30 + 0.18 * pulse})`;
      strokeStyle = `rgba(239, 68, 68, ${0.75 + 0.25 * pulse})`;
      lineWidth = 2.5;
    }

    if (isQiangGong) {
      // 保持头像框变成红色一闪一闪
      fillStyle = `rgba(220, 38, 38, ${0.25 + 0.35 * pulse})`;
      strokeStyle = `rgba(255, 68, 68, ${0.6 + 0.4 * pulse})`;
      lineWidth = 3 + 1.5 * pulse;
    }

    ctx.save();
    if (isQiangGong || isBaoDan) {
      ctx.shadowColor = '#EF4444';
      ctx.shadowBlur = isQiangGong ? (12 + 12 * pulse) : (8 + 8 * pulse);
    }
    ctx.fillStyle = fillStyle;
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.roundRect(x, y, 154, 52, 9);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 1. 头像框顶部：玩家席位与手牌张数
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 11.5px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(name, x + 8, y + 16);

    // 强攻徽章标识
    if (isQiangGong) {
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.roundRect(x + 104, y + 4, 42, 16, 4);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 9.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔥强攻', x + 125, y + 16);
    } else if (isBaoDan) {
      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.roundRect(x + 104, y + 4, 42, 16, 4);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 9.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🚨报单', x + 125, y + 16);
    } else {
      ctx.textAlign = 'right';
      ctx.fillStyle = count <= 2 ? '#EF4444' : '#FDE047';
      ctx.font = '700 11px monospace';
      ctx.fillText(`余 ${count} 张 ${count === 2 ? '⚠️' : ''}`, x + 146, y + 16);
    }

    // 2. 身份状态标签 (移除所有思考中/等待提示)

    // 3. 细微分割线 (移除，仅用于 66px 及以上高度)

    // 4. 该玩家打出的所有牌展示区 (mini 卡牌)
    const playedList = seatPlayedCards[seatIdx] || [];

    if (playedList.length === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = 'italic 9.5px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('暂无出牌', x + 8, y + 38);
    } else {
      const cardMiniW = 28;
      const cardMiniH = 34;
      const startX = x + 8;
      const startY = y + 17;
      const maxAvailableW = 154 - 16 - cardMiniW;
      const step = playedList.length > 1 ? Math.min(18, maxAvailableW / (playedList.length - 1)) : 0;

      playedList.forEach((c, idx) => {
        const cx = startX + idx * step;
        renderPlayingCard(ctx, c, cx, startY, cardMiniW, cardMiniH, {
          borderRadius: 3,
          shadow: true,
          cropTopLeft: true,
        });
      });
    }
  };

  const westName = props.roomPlayers?.[1]?.name ? `西席 (${props.roomPlayers[1].name})` : '西席 (牌友)';
  const northName = props.roomPlayers?.[2]?.name ? `北席 (${props.roomPlayers[2].name})` : '北席 (牌友)';
  const eastName = props.roomPlayers?.[3]?.name ? `东席 (${props.roomPlayers[3].name})` : '东席 (牌友)';
  const meName = props.roomPlayers?.[0]?.name ? `本家 (${props.roomPlayers[0].name})` : '本家 (您)';

  drawSeat(16, 92, westName, hands[1]?.length || 0, seatStatus[1], turnSeat.value === 1, 1);
  drawSeat(width / 2 - 77, 12, northName, hands[2]?.length || 0, seatStatus[2], turnSeat.value === 2, 2);
  drawSeat(width - 170, 92, eastName, hands[3]?.length || 0, seatStatus[3], turnSeat.value === 3, 3);
  drawSeat(16, height - 76, meName, hands[0]?.length || 0, seatStatus[0], turnSeat.value === 0, 0);

  if (lastCombo.value) {
    const list = lastCombo.value.cards;
    const overlap = 28;
    const totalW = 54 + (list.length - 1) * overlap;
    const startY = 112;
    const s = lastCombo.value.seat;

    let startX = width / 2 - totalW / 2;
    let textX = width / 2;

    if (s === 1) {
      // 左边玩家打出的牌靠左对齐 (避开西席头像框)
      startX = 178;
      textX = startX + totalW / 2;
    } else if (s === 3) {
      // 右边玩家打出的牌靠右对齐 (避开东席头像框)
      startX = width - 178 - totalW;
      textX = startX + totalW / 2;
    }

    list.forEach((c, idx) => {
      const cx = startX + idx * overlap;
      renderPlayingCard(ctx, c, cx, startY, 54, 76, {
        borderRadius: 5,
        shadow: true,
      });
    });

    const names = ['本家', '西席', '北席', '东席'];
    const isUnbeatable = seatStatus[s]?.includes('全场绝大') || !!unbeatableNotice.value;
    if (isUnbeatable) {
      ctx.fillStyle = '#FBBF24';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`👑 ${names[s]} · ${lastCombo.value.label} (全场最大 · 无人可管)`, textX, startY + 76 + 18);
    } else {
      ctx.fillStyle = '#FDE68A';
      ctx.font = '600 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${names[s]} · ${lastCombo.value.label}`, textX, startY + 76 + 18);
    }
  }

  const myHand = hands[0] || [];
  if (myHand.length > 0) {
    const cardW = 70;
    const cardH = 100;
    const step = Math.min(34, (width - 130) / Math.max(1, myHand.length));
    const totalW = cardW + (myHand.length - 1) * step;
    const baseLeft = width / 2 - totalW / 2;
    const baseY = height - 192;

    myHand.forEach((c, idx) => {
      const isSel = selectedIds.has(c.id);
      const x = baseLeft + idx * step;
      const y = isSel ? baseY - 20 : baseY;

      renderPlayingCard(ctx, c, x, y, cardW, cardH, {
        isSelected: isSel,
        borderRadius: 6,
        shadow: true,
      });
    });
  }
}

let dragStartIndex = -1;
let dragCurrentIndex = -1;
let initialSelectedIds = new Set<string>();
let isSelectMode = true;
let pointerStartX = 0;
let pointerStartY = 0;
let dragMovedDistance = 0;
let clickedEmpty = false;

function getCardIndexAtPoint(clientX: number, clientY: number, isDuringDrag = false): number {
  const canvas = canvasRef.value;
  if (!canvas) return -1;
  const { x, y } = getCanvasEventCoords(canvas, clientX, clientY, props.isRotated90);

  const myHand = hands[0] || [];
  if (myHand.length === 0) return -1;

  const cardW = 70;
  const cardH = 100;
  const step = Math.min(34, (680 - 130) / Math.max(1, myHand.length));
  const totalW = cardW + (myHand.length - 1) * step;
  const baseLeft = 680 / 2 - totalW / 2;
  const baseY = 430 - 192;

  if (isDuringDrag) {
    if (y < baseY - 120 || y > 430 + 60) return dragCurrentIndex;
    const clampedX = Math.max(baseLeft, Math.min(x, baseLeft + totalW - 1));
    return Math.min(myHand.length - 1, Math.max(0, Math.floor((clampedX - baseLeft) / step)));
  }

  // Generous vertical hit box for initial touch
  if (y < baseY - 40 || y > baseY + cardH + 30) return -1;

  // Horizontal bounds (with 15px padding)
  if (x < baseLeft - 15 || x > baseLeft + totalW + 15) return -1;

  // 1. Precise card hit check from right to left (topmost cards first)
  for (let i = myHand.length - 1; i >= 0; i--) {
    const c = myHand[i];
    const isSel = selectedIds.has(c.id);
    const cx = baseLeft + i * step;
    const cy = isSel ? baseY - 20 : baseY;
    if (x >= cx && x <= cx + cardW && y >= cy - 15 && y <= cy + cardH + 15) {
      return i;
    }
  }

  // 2. Continuous horizontal projection fallback
  const clampedX = Math.max(baseLeft, Math.min(x, baseLeft + totalW - 1));
  return Math.min(myHand.length - 1, Math.max(0, Math.floor((clampedX - baseLeft) / step)));
}

function onPointerDown(e: PointerEvent) {
  const canvas = canvasRef.value;
  if (canvas) {
    try {
      (canvas as any)?.setPointerCapture?.(e.pointerId);
    } catch {}
    const coords = getCanvasEventCoords(canvas, e.clientX, e.clientY, props.isRotated90);
    pointerStartX = coords.x;
    pointerStartY = coords.y;
    dragMovedDistance = 0;
  }
  const idx = getCardIndexAtPoint(e.clientX, e.clientY, false);
  if (idx === -1) {
    clickedEmpty = true;
    if (canvasRef.value) {
      const coords = getCanvasEventCoords(canvasRef.value, e.clientX, e.clientY, props.isRotated90);
      const seats = [
        { idx: 0, x: 16, y: 430 - 98, w: 154, h: 94 },
        { idx: 1, x: 16, y: 92, w: 154, h: 94 },
        { idx: 2, x: 680 / 2 - 77, y: 12, w: 154, h: 94 },
        { idx: 3, x: 680 - 170, y: 92, w: 154, h: 94 },
      ];
      const clicked = seats.find((s) => coords.x >= s.x && coords.x <= s.x + s.w && coords.y >= s.y && coords.y <= s.y + s.h);
      if (clicked) {
        inspectedSeat.value = clicked.idx;
        soundFX.playTap();
        return;
      }
    }
    return;
  }

  clickedEmpty = false;
  const myHand = hands[0] || [];
  const startCard = myHand[idx];
  if (!startCard) return;

  isDragging.value = true;
  dragStartIndex = idx;
  dragCurrentIndex = idx;
  initialSelectedIds = new Set(selectedIds);

  isSelectMode = !initialSelectedIds.has(startCard.id);

  if (isSelectMode) {
    selectedIds.add(startCard.id);
  } else {
    selectedIds.delete(startCard.id);
  }

  soundFX.playTap();
  haptics.tap();
  drawTable();
}

function onPointerMove(e: PointerEvent) {
  if (canvasRef.value) {
    const coords = getCanvasEventCoords(canvasRef.value, e.clientX, e.clientY, props.isRotated90);
    dragMovedDistance += Math.hypot(coords.x - pointerStartX, coords.y - pointerStartY);
  }
  if (!isDragging.value) return;
  const idx = getCardIndexAtPoint(e.clientX, e.clientY, true);
  if (idx === -1 || idx === dragCurrentIndex) return;

  dragCurrentIndex = idx;
  const myHand = hands[0] || [];
  const minIdx = Math.min(dragStartIndex, dragCurrentIndex);
  const maxIdx = Math.max(dragStartIndex, dragCurrentIndex);

  const nextSelected = new Set(initialSelectedIds);
  for (let i = minIdx; i <= maxIdx; i++) {
    const card = myHand[i];
    if (card) {
      if (isSelectMode) {
        nextSelected.add(card.id);
      } else {
        nextSelected.delete(card.id);
      }
    }
  }

  let changed = false;
  if (nextSelected.size !== selectedIds.size) {
    changed = true;
  } else {
    for (const id of nextSelected) {
      if (!selectedIds.has(id)) {
        changed = true;
        break;
      }
    }
  }

  if (changed) {
    selectedIds.clear();
    nextSelected.forEach((id) => selectedIds.add(id));
    soundFX.playCardSnap();
    haptics.tap();
    drawTable();
  }
}

function onPointerUp(e: PointerEvent) {
  const canvas = canvasRef.value;
  if (canvas) {
    try {
      (canvas as any)?.releasePointerCapture?.(e.pointerId);
    } catch {}

    const coords = getCanvasEventCoords(canvas, e.clientX, e.clientY, props.isRotated90);

    // Tap on empty table area to deselect all cards
    if (clickedEmpty && dragMovedDistance < 12 && selectedIds.size > 0) {
      selectedIds.clear();
      soundFX.playTap();
      drawTable();
    }

    // Flick upwards gesture: only if predominantly vertical flick up
    const upDist = pointerStartY - coords.y;
    const horizDist = Math.abs(coords.x - pointerStartX);
    if (
      isDragging.value &&
      upDist > 45 &&
      upDist > horizDist * 1.5 &&
      selectedIds.size > 0 &&
      turnSeat.value === 0 &&
      winnerSeat.value === null
    ) {
      handlePlay();
    }
  }
  isDragging.value = false;
  dragStartIndex = -1;
  dragCurrentIndex = -1;
  clickedEmpty = false;
}

/**
 * 报单玩家自动出牌并宣布出清获胜
 */
function executeBaoDanPlay(seat: number) {
  if (winnerSeat.value !== null || (hands[seat]?.length || 0) !== 1) return;
  const remainingCard = hands[seat][0];
  const cb = evaluateCombo([remainingCard], seat);
  if (!cb) return;
  hands[seat] = [];
  lastCombo.value = cb;
  consecutivePasses.value = 0;
  const rankTitle = finishedSeats.length === 0 ? '头游出清' : '二游出清';
  seatStatus[seat] = `出牌：${cb.label} (${rankTitle})`;
  soundFX.playCardSnap(false);
  soundFX.speakAction('baodan_win', { isFemale: seat === 1 });
  afterComboPlayed(seat, cb);
}

/**
 * 当有玩家打出一手牌后的状态机处理：
 * 1. 记录已出牌库 (用于记牌推算绝大)
 * 2. 检查获胜 (一手走完)
 * 3. 报单检测：若出牌后仅剩 1 张手牌，立即触发报单警报
 * 4. 核心体验机制：全场绝大（绝对压制）记牌推算：
 *    依据公开已出牌库（严禁偷窥对手暗牌，杜绝信息泄露）。
 *    若未出牌库中数学上不可能存在任何压制牌（如黑桃3全场至尊、或3已出后的2、或对手张数不足）：
 *    直接由系统判定为全场绝大，该玩家保留出牌权直接继续出牌！无需等待其他玩家点过！
 * 5. 正常逆时针流转
 */
function afterComboPlayed(seat: number, combo: Combo) {
  const previousCombo = lastCombo.value && lastCombo.value.seat !== seat ? lastCombo.value : null;
  playedCardsHistory.value.push(...combo.cards);
  seatPlayedCards[seat].push(...combo.cards);

  playHistory.value.push({
    seat,
    cards: combo.cards as any,
    combo: {
      type: combo.type === 'triple' ? 'triplet' : (combo.type as any),
      comboTier: combo.comboTier,
      rank: combo.primaryRank,
      suitVal: combo.flushSuit || (combo.primarySuitVal % 10),
      cards: combo.cards as any,
      seat: combo.seat,
      label: combo.label,
    },
    targetCombo: previousCombo ? {
      type: previousCombo.type === 'triple' ? 'triplet' : (previousCombo.type as any),
      comboTier: previousCombo.comboTier,
      rank: previousCombo.primaryRank,
      suitVal: previousCombo.flushSuit || (previousCombo.primarySuitVal % 10),
      cards: previousCombo.cards as any,
      seat: previousCombo.seat,
      label: previousCombo.label,
    } : null,
    isPass: false,
    actionSeq: playHistory.value.length + 1,
    timestamp: Date.now(),
  });

  const isFinished = hands[seat].length === 0;
  if (isFinished) {
    checkGameFinishAfterPlay(seat);
    // 若整局对决已满足终局条件 (如强攻局结束、双跑双胜包揽前二、或决出前三名)
    if (winnerSeat.value !== null) {
      drawTable();
      emitStatus();
      return;
    }
  } else {
    // 报单检测：若出牌后手牌仅剩 1 张，立即触发报单警报
    checkAndTriggerBaoDan(seat);
  }

  // 记牌器推算全场绝大（绝对压制）：
  const yCombo: YansanCombo = {
    type: combo.type === 'triple' ? 'triplet' : (combo.type as any),
    comboTier: combo.comboTier,
    rank: combo.primaryRank,
    suitVal: combo.flushSuit || (combo.primarySuitVal % 10),
    cards: combo.cards as any,
    seat: combo.seat,
  };

  // 严格全场公开推算原则（严禁使用出牌者自身私密手牌）：
  // 仅依据全场已公开打出的牌 (playedCardsHistory) 与对手剩余张数进行绝对压制判定！
  // 绝不能结合出牌者自身的剩余手牌来推算是否最大，否则一旦报全场最大连出，就会反向暴露该玩家手牌中隐藏的私密牌
  const all52 = createDeck();
  const knownPlayedCardIds = new Set<string>();
  for (const c of playedCardsHistory.value) knownPlayedCardIds.add(c.id);

  // 公开未出牌池 (在全场公开视角看来，所有未公开打出的牌均有可能在对手手中)
  const availableOpponentPool = all52.filter((c) => !knownPlayedCardIds.has(c.id));
  const otherActiveHands = hands.filter((_, idx) => idx !== seat && !finishedSeats.includes(idx));
  const maxOpponentCards = otherActiveHands.length > 0 ? Math.max(...otherActiveHands.map((h) => h.length)) : 0;

  const isDeductivelyUnbeatable = isYansanComboDeductivelyUnbeatable(
    yCombo,
    availableOpponentPool as any,
    maxOpponentCards
  );

  const names = ['本家', '西席', '北席', '东席'];

  // 情况 1：该玩家已经出清手牌 (头游 / 二游)
  if (isFinished) {
    const rankTitle = finishedSeats.length === 1 ? '头游出清' : '二游出清';
    const nextS = getNextActiveSeat(seat);

    const hasSpade3 = combo.cards.some((c) => c.rank === 3 && c.suit === '♠');
    if (isDeductivelyUnbeatable || hasSpade3) {
      // 🌟 用户明确规则：第一个打完手牌的玩家最后打出的是全场绝大（如黑桃3、通天牌型等），
      // 数学上无人可压，不需要等待其他玩家点过，下家应该直接接风出牌！
      unbeatableNotice.value = `👑【${names[seat]}】${rankTitle}打出【${combo.label}】全场绝大！无人可压，下家【${names[nextS]}】直接接风领出！`;
      if (unbeatableTimer) clearTimeout(unbeatableTimer);
      unbeatableTimer = setTimeout(() => {
        unbeatableNotice.value = '';
      }, 4500);

      soundFX.speakAction('unbeatable');
      soundFX.speakVoice(`${names[seat]}${rankTitle}打出全场绝大！无人可压，下家${names[nextS]}直接接风！`, 1.05);
      emit('fx', 'dragon');

      seatStatus[seat] = `🎉 ${rankTitle} · 绝大出清 (${combo.label})`;
      for (let i = 0; i < 4; i++) {
        if (i !== seat && !finishedSeats.includes(i)) {
          seatStatus[i] = i === nextS
            ? (nextS === 0 ? '👑 上家绝大出清 · 准备接风领出...' : `👑 【${names[nextS]}】准备接风领出...`)
            : '要不起 (全场绝大)';
        }
      }

      // 保留绝大出清牌型在桌布中央停顿 2.0 秒供全场清晰阅览
      lastCombo.value = combo;
      turnSeat.value = -1;
      drawTable();
      emitStatus();

      if (unbeatablePauseTimer) clearTimeout(unbeatablePauseTimer);
      unbeatablePauseTimer = setTimeout(() => {
        if (winnerSeat.value !== null) return;

        // 停顿 2.0 秒后清理桌面，正式由下家直接接风领出新一轮任意牌型
        lastCombo.value = null;
        consecutivePasses.value = 0;
        turnSeat.value = nextS;

        for (let i = 0; i < 4; i++) {
          if (i !== seat && !finishedSeats.includes(i)) {
            seatStatus[i] = i === nextS ? '' : '等待';
          }
        }

        if (nextS === 0) {
          seatStatus[0] = '🎉 接风领出 · 该您首出任意新牌！';
          drawTable();
          emitStatus();
          if (isAutoHost.value) {
            checkAutoHostTurn();
          } else if (!checkPlayerAutoTurnActions()) {
            startTurnCountdown();
          }
        } else {
          seatStatus[nextS] = `🎉 接风领出 · 【${names[nextS]}】思考领出新牌...`;
          drawTable();
          emitStatus();
          const thinkingDelay = 1200 + Math.floor(Math.random() * 500);
          if (botTimer) clearTimeout(botTimer);
          botTimer = setTimeout(() => {
            botStep(nextS);
          }, thinkingDelay);
        }
      }, 2000);

      return;
    } else {
      // 最后一手牌并非全场绝大，按烟三正统接风规则：
      // 桌面保留该手牌，逆时针移交下家跟牌压制；只有其他玩家都过牌无人压制时，才由其下家接风领出
      seatStatus[seat] = `🎉 ${rankTitle} (手牌已出完)`;
      soundFX.speakVoice(`${names[seat]}${rankTitle}！请下家跟牌压制！`, 1.05);

      turnSeat.value = nextS;
      drawTable();
      emitStatus();
      emit('move', { seat, combo, winner: null, nextTurn: nextS });

      if (nextS === 0) {
        seatStatus[0] = '该您跟牌 (必须压制桌面)';
        drawTable();
        emitStatus();
        if (isAutoHost.value) {
          checkAutoHostTurn();
        } else if (!checkPlayerAutoTurnActions()) {
          startTurnCountdown();
        }
      } else {
        seatStatus[nextS] = `${names[nextS]} 思考跟牌...`;
        drawTable();
        emitStatus();
        runBotTurns(nextS);
      }
      return;
    }
  }

  // 情况 2：该玩家仍有手牌，且打出了全场绝大（绝对压制）：
  if (isDeductivelyUnbeatable) {
    const isCountShort = maxOpponentCards < combo.cards.length;
    unbeatableNotice.value = isCountShort
      ? `👑 对手余牌均不足${combo.cards.length}张！【${names[seat]}】打出【${combo.label}】全场绝大，直接连出`
      : `👑 记牌推算全场绝大【${combo.label}】！【${names[seat]}】无人可压，获得连出新牌权`;
    if (unbeatableTimer) clearTimeout(unbeatableTimer);
    unbeatableTimer = setTimeout(() => {
      unbeatableNotice.value = '';
    }, 4500);

    soundFX.speakAction(isCountShort ? 'cards_short' : 'unbeatable');
    emit('fx', 'dragon');

    // 其它存活各家直接显示要不起
    for (let i = 0; i < 4; i++) {
      if (i !== seat && !finishedSeats.includes(i)) {
        seatStatus[i] = isCountShort ? `余牌不足${combo.cards.length}张` : '要不起 (无人可压)';
      }
    }

    // 核心体验保障：打出绝大牌型后完整保留在桌布中央停顿整整 2.0 秒，给足玩家看清花色与点数，切勿瞬间连续出牌！
    lastCombo.value = combo;
    seatStatus[seat] = `👑 全场绝大：${combo.label} (无人可管 · 准备连出)`;
    turnSeat.value = seat;
    drawTable();
    emitStatus();

    if (unbeatablePauseTimer) clearTimeout(unbeatablePauseTimer);
    unbeatablePauseTimer = setTimeout(() => {
      if (winnerSeat.value !== null) return;

      // 停顿 2.0 秒看清上一手绝大牌后，清理桌面并正式进入该席位领出新一轮牌型回合
      lastCombo.value = null;
      consecutivePasses.value = 0;
      turnSeat.value = seat;

      // 若该席位仅余1张牌(报单)，且获得了领出权，间隔 1.8 秒从容自动出牌获胜！
      if (hands[seat].length === 1) {
        seatStatus[seat] = `🚨 报单绝杀 · 【${names[seat]}】准备打出最后一张牌...`;
        drawTable();
        emitStatus();
        setTimeout(() => {
          executeBaoDanPlay(seat);
        }, 1800);
        return;
      }

      for (let i = 0; i < 4; i++) {
        if (i !== seat && !finishedSeats.includes(i)) {
          seatStatus[i] = '等待';
        }
      }

      if (seat === 0) {
        seatStatus[0] = '👑 全场绝大 · 该您领出新牌！';
        drawTable();
        emitStatus();
        if (isAutoHost.value) {
          checkAutoHostTurn();
        } else if (!checkPlayerAutoTurnActions()) {
          startTurnCountdown();
        }
      } else {
        seatStatus[seat] = `👑 全场绝大 · 【${names[seat]}】思考领出新牌...`;
        drawTable();
        emitStatus();
        // 拟真思考延迟 1.5 秒 ~ 2.0 秒 (1500ms ~ 2000ms)，让玩家从容消化上一手牌局并清晰观看第二次出牌
        const thinkingDelay = 1500 + Math.floor(Math.random() * 500);
        if (botTimer) clearTimeout(botTimer);
        botTimer = setTimeout(() => {
          botStep(seat);
        }, thinkingDelay);
      }
    }, 2000);

    return;
  }

  // 正常逆时针流转至下一个存活玩家
  const nextS = getNextActiveSeat(seat);
  const isBigCombo = combo.type === '5_card' || combo.cards.length >= 4 || combo.comboTier !== undefined;

  if (isBigCombo) {
    for (let i = 0; i < 4; i++) {
      if (i !== seat && !finishedSeats.includes(i)) {
        seatStatus[i] = `欣赏大牌：${combo.label}`;
      }
    }
    turnSeat.value = -1;
    drawTable();
    emitStatus();

    setTimeout(() => {
      if (winnerSeat.value !== null) return;
      turnSeat.value = nextS;
      emit('move', { seat, combo, winner: null, nextTurn: nextS });

      if (nextS === 0) {
        seatStatus[0] = lastCombo.value ? '该您跟牌' : '该您出牌';
        drawTable();
        emitStatus();
        if (isAutoHost.value) {
          checkAutoHostTurn();
        } else if (!checkPlayerAutoTurnActions()) {
          startTurnCountdown();
        }
      } else {
        runBotTurns(nextS);
      }
    }, 2000);
    return;
  }

  turnSeat.value = nextS;
  drawTable();
  emitStatus();
  emit('move', { seat, combo, winner: null, nextTurn: nextS });

  if (nextS === 0) {
    seatStatus[0] = lastCombo.value ? '该您跟牌' : '该您出牌';
    drawTable();
    emitStatus();
    if (isAutoHost.value) {
      checkAutoHostTurn();
    } else if (!checkPlayerAutoTurnActions()) {
      startTurnCountdown();
    }
  } else {
    runBotTurns(nextS);
  }
}

function handlePlay() {
  if (turnSeat.value !== 0 || winnerSeat.value !== null) return;
  stopTurnCountdown();
  errorTip.value = '';
  const chosen = hands[0].filter((c) => selectedIds.has(c.id));
  if (chosen.length === 0) return;

  // 烟三铁律：每局首出必须包含方块4 (♦4)
  if (isFirstTurn.value && !hands[0].some((c) => c.rank === 4 && c.suit === '♦')) {
    isFirstTurn.value = false;
  }
  if (isFirstTurn.value && !chosen.some((c) => c.rank === 4 && c.suit === '♦')) {
    errorTip.value = '每局首出必须包含方块4 (♦4)！';
    return;
  }

  const combo = evaluateCombo(chosen, 0);
  if (!combo) {
    errorTip.value = '牌型不符合烟三规则（单张、一对、三条、顺子、同花、俘虏、四带一、同花顺，杂色10-J-Q-K-A不可出）';
    return;
  }
  if (!canBeat(combo, lastCombo.value)) {
    errorTip.value = '必须大过桌面牌型！';
    return;
  }

  const isSpecialHighTier = combo.type === '5_card' && (combo.comboTier || 1) >= 3;
  if (typeof soundFX.playCardSnap === 'function') soundFX.playCardSnap(isSpecialHighTier);
  if (isSpecialHighTier) {
    haptics.bomb();
    emit('fx', 'bomb');
  } else {
    haptics.playCard();
  }

  hands[0] = hands[0].filter((c) => !selectedIds.has(c.id));
  selectedIds.clear();
  lastCombo.value = combo;
  consecutivePasses.value = 0;
  seatStatus[0] = `出牌：${combo.label}`;
  soundFX.speakAction(isFirstTurn.value ? 'yansan_lead' : combo.label);
  isFirstTurn.value = false;

  afterComboPlayed(0, combo);
}

function handlePass() {
  if (!lastCombo.value || lastCombo.value.seat === 0) return;
  if (turnSeat.value !== 0 || winnerSeat.value !== null) return;
  stopTurnCountdown();

  // 补加规则：玩家只要点了过牌，即使手牌还有13张，强攻与投降按钮也立即消失
  hasPassedSeats[0] = true;

  selectedIds.clear();
  errorTip.value = '';
  seatStatus[0] = '过牌';
  if (typeof soundFX.playTap === 'function') soundFX.playTap();
  soundFX.speakAction('pass');
  consecutivePasses.value++;

  playHistory.value.push({
    seat: 0,
    cards: [],
    combo: null,
    targetCombo: lastCombo.value ? {
      type: lastCombo.value.type === 'triple' ? 'triplet' : (lastCombo.value.type as any),
      comboTier: lastCombo.value.comboTier,
      rank: lastCombo.value.primaryRank,
      suitVal: lastCombo.value.flushSuit || (lastCombo.value.primarySuitVal % 10),
      cards: lastCombo.value.cards as any,
      seat: lastCombo.value.seat,
      label: lastCombo.value.label,
    } : null,
    isPass: true,
    actionSeq: playHistory.value.length + 1,
    timestamp: Date.now(),
  });

  const activeSeats = [0, 1, 2, 3].filter((s) => !finishedSeats.includes(s));
  const activeCount = activeSeats.length;
  const lastLeader = lastCombo.value?.seat;
  const leaderFinished = lastLeader !== undefined && finishedSeats.includes(lastLeader);
  const passThreshold = leaderFinished ? activeCount : activeCount - 1;

  if (consecutivePasses.value >= passThreshold) {
    // 剩余玩家全部过牌，本轮结束！
    // 用户明确规则："如果剩下的三个玩家都不出，就是打完手牌的下家接权，可以出其他牌型"
    const leadSeat = leaderFinished ? getNextActiveSeat(lastLeader!) : lastLeader!;
    consecutivePasses.value = 0;
    const names = ['本家', '西席', '北席', '东席'];
    for (const s of activeSeats) {
      if (s === leadSeat) {
        seatStatus[s] = s === 0 ? '该您出牌 (接风领出)' : (leaderFinished ? '接风领牌' : '大过全场 · 领出新牌');
      } else {
        seatStatus[s] = '要不起 (过牌)';
      }
    }
    drawTable();
    emitStatus();

    // 留存 1.5 秒桌面牌型，让玩家看清全场过牌与谁获得领出权，随后清空桌面
    setTimeout(() => {
      if (winnerSeat.value !== null) return;
      lastCombo.value = null;
      for (const s of activeSeats) {
        if (s !== leadSeat) {
          seatStatus[s] = '等待';
        }
      }
      turnSeat.value = leadSeat;
      drawTable();
      emitStatus();
      if (leadSeat !== 0) {
        if ((hands[leadSeat]?.length || 0) === 1) {
          executeBaoDanPlay(leadSeat);
        } else {
          runBotTurns(leadSeat);
        }
      } else if ((hands[0]?.length || 0) === 1) {
        seatStatus[0] = '🚨 报单绝杀 · 自动打出最后一张牌...';
        drawTable();
        emitStatus();
        playerAutoTimer = setTimeout(() => {
          if (turnSeat.value === 0 && (!lastCombo.value || lastCombo.value.seat === 0) && (hands[0]?.length || 0) === 1) {
            executeBaoDanPlay(0);
          }
        }, 700);
      } else if (isAutoHost.value) {
        checkAutoHostTurn();
      } else {
        if (!checkPlayerAutoTurnActions()) {
          startTurnCountdown();
        }
      }
    }, 1500);
  } else {
    // 未达出清轮数，逆时针轮到下一个未走完的玩家
    const nextS = getNextActiveSeat(0);
    turnSeat.value = nextS;
    drawTable();
    emitStatus();
    if (nextS === 0) {
      if (isAutoHost.value) {
        checkAutoHostTurn();
      } else {
        if (!checkPlayerAutoTurnActions()) {
          startTurnCountdown();
        }
      }
    } else {
      runBotTurns(nextS);
    }
  }
}

function isTeamMate(s1: number, s2: number): boolean {
  if (s1 === s2) return true;
  if (isQiangGongActive.value) {
    if (s1 === qiangGongSeat.value || s2 === qiangGongSeat.value) return false;
    return true;
  }
  const s3 = spade3Seat.value !== null ? spade3Seat.value : detectYansanSpecialHolders(hands, seatPlayedCards).spade3Seat;
  const sA = spadeASeat.value !== null ? spadeASeat.value : detectYansanSpecialHolders(hands, seatPlayedCards).spadeASeat;
  if (s3 === sA) {
    if (s1 === s3 || s2 === s3) return false;
    return true;
  }
  const isS1Spade = s1 === s3 || s1 === sA;
  const isS2Spade = s2 === s3 || s2 === sA;
  return isS1Spade === isS2Spade;
}

function findWinningCombo(cardList: Card[], target: Combo, seat: number): Card[] | null {
  // 必须严格按真实牌力从弱到强升序排列（4最小，3最大）：
  const cards = [...cardList].sort((a, b) => getCardPower(a) - getCardPower(b));
  const rankGroups = new Map<number, Card[]>();
  for (const c of cards) {
    if (!rankGroups.has(c.rank)) rankGroups.set(c.rank, []);
    rankGroups.get(c.rank)!.push(c);
  }
  const sortedRanks = Array.from(rankGroups.keys()).sort((a, b) => getRankWeight(a) - getRankWeight(b));

  if (target.type === 'single') {
    // 升序查找：选择能管上牌的【最小单张】
    for (const c of cards) {
      const ev = evaluateCombo([c], seat);
      if (ev && canBeat(ev, target)) return [c];
    }
    return null;
  }

  if (target.type === 'pair') {
    // 1. 优先从纯对子 (group.length === 2) 中由小到大寻找
    for (const rk of sortedRanks) {
      const group = rankGroups.get(rk)!;
      if (group.length === 2) {
        const ev = evaluateCombo(group, seat);
        if (ev && canBeat(ev, target)) return group;
      }
    }
    // 2. 无纯对子时，从三条中拆出最小对子（不拆四张四条）
    for (const rk of sortedRanks) {
      const group = rankGroups.get(rk)!;
      if (group.length === 3) {
        const subPair = group.slice(0, 2);
        const ev = evaluateCombo(subPair, seat);
        if (ev && canBeat(ev, target)) return subPair;
      }
    }
    // 3. 终局紧急情况才允许拆四张
    for (const rk of sortedRanks) {
      const group = rankGroups.get(rk)!;
      if (group.length === 4) {
        const subPair = group.slice(0, 2);
        const ev = evaluateCombo(subPair, seat);
        if (ev && canBeat(ev, target)) return subPair;
      }
    }
    return null;
  }

  if (target.type === 'triple') {
    for (const rk of sortedRanks) {
      const group = rankGroups.get(rk)!;
      if (group.length === 3) {
        const ev = evaluateCombo(group, seat);
        if (ev && canBeat(ev, target)) return group;
      }
    }
    for (const rk of sortedRanks) {
      const group = rankGroups.get(rk)!;
      if (group.length === 4) {
        const subTriple = group.slice(0, 3);
        const ev = evaluateCombo(subTriple, seat);
        if (ev && canBeat(ev, target)) return subTriple;
      }
    }
    return null;
  }

  if (target.type === '5_card') {
    const tTier = target.comboTier || 1;

    // ① 顺子 (Tier 1)
    const validStraights: Card[][] = [];
    const uniqueRanks = Array.from(new Set(cards.map((c) => c.rank)));
    for (let i = 0; i <= uniqueRanks.length - 5; i++) {
      const sub = uniqueRanks.slice(i, i + 5);
      let isSeq = true;
      for (let j = 1; j < 5; j++) {
        if (sub[j] !== sub[j - 1] + 1) {
          isSeq = false;
          break;
        }
      }
      if (sub.includes(15)) isSeq = false;
      const is10JQKA = sub[0] === 10 && sub[4] === 14;
      if (isSeq && !is10JQKA) {
        const combo = sub.map((r) => cards.find((c) => c.rank === r)!);
        const ev = evaluateCombo(combo, seat);
        if (ev && ev.comboTier === 1 && canBeat(ev, target)) {
          validStraights.push(combo);
        }
      }
    }
    // A2345 特殊顺子 (3, 4, 5, 14, 15)
    if (uniqueRanks.includes(3) && uniqueRanks.includes(4) && uniqueRanks.includes(5) && uniqueRanks.includes(14) && uniqueRanks.includes(15)) {
      const combo = [3, 4, 5, 14, 15].map((r) => cards.find((c) => c.rank === r)!);
      const ev = evaluateCombo(combo, seat);
      if (ev && ev.comboTier === 1 && canBeat(ev, target)) {
        validStraights.push(combo);
      }
    }

    if (tTier === 1 && validStraights.length > 0) {
      // 挑出能管上的最小顺子
      validStraights.sort((a, b) => {
        const evA = evaluateCombo(a, seat)!;
        const evB = evaluateCombo(b, seat)!;
        return getRankWeight(evA.primaryRank) - getRankWeight(evB.primaryRank) || evA.primarySuitVal - evB.primarySuitVal;
      });
      return validStraights[0];
    }

    // ② 同花 (Tier 2)
    const flushes: Card[][] = [];
    const suitGroups = new Map<string, Card[]>();
    for (const c of cards) {
      if (!suitGroups.has(c.suit)) suitGroups.set(c.suit, []);
      suitGroups.get(c.suit)!.push(c);
    }
    for (const group of suitGroups.values()) {
      if (group.length >= 5) {
        const sSorted = [...group].sort((a, b) => getCardPower(a) - getCardPower(b));
        for (let i = 0; i <= sSorted.length - 5; i++) {
          const sub = sSorted.slice(i, i + 5);
          const ev = evaluateCombo(sub, seat);
          if (ev && ev.comboTier === 2 && canBeat(ev, target)) {
            flushes.push(sub);
          }
        }
      }
    }
    if (tTier <= 2 && flushes.length > 0) {
      flushes.sort((a, b) => {
        const evA = evaluateCombo(a, seat)!;
        const evB = evaluateCombo(b, seat)!;
        return (evA.flushSuit || 0) - (evB.flushSuit || 0) || getRankWeight(evA.primaryRank) - getRankWeight(evB.primaryRank);
      });
      return flushes[0];
    }

    // ③ 俘虏 (Tier 3)
    const fulus: Card[][] = [];
    const triples = sortedRanks.filter((rk) => rankGroups.get(rk)!.length >= 3);
    const pairs = sortedRanks.filter((rk) => rankGroups.get(rk)!.length >= 2);
    for (const tRk of triples) {
      for (const pRk of pairs) {
        if (tRk !== pRk) {
          const fh = [...rankGroups.get(tRk)!.slice(0, 3), ...rankGroups.get(pRk)!.slice(0, 2)];
          const ev = evaluateCombo(fh, seat);
          if (ev && ev.comboTier === 3 && canBeat(ev, target)) {
            fulus.push(fh);
          }
        }
      }
    }
    if (tTier <= 3 && fulus.length > 0) {
      fulus.sort((a, b) => {
        const evA = evaluateCombo(a, seat)!;
        const evB = evaluateCombo(b, seat)!;
        return getRankWeight(evA.primaryRank) - getRankWeight(evB.primaryRank);
      });
      return fulus[0];
    }

    // ④ 四带一 (Tier 4)：仅当目标也是高阶牌，或终局紧迫时才动用
    // 严禁拿四条3或四条2当普通牌打出！
    const fourOnes: Card[][] = [];
    const fourRanks = sortedRanks.filter((rk) => rankGroups.get(rk)!.length === 4);
    for (const fRk of fourRanks) {
      // 挑选一张最小的非本条单牌作为带牌 (从cards[0]小牌找起)
      const kicker = cards.find((c) => c.rank !== fRk);
      if (kicker) {
        const fo = [...rankGroups.get(fRk)!, kicker];
        const ev = evaluateCombo(fo, seat);
        if (ev && ev.comboTier === 4 && canBeat(ev, target)) {
          fourOnes.push(fo);
        }
      }
    }
    if (fourOnes.length > 0) {
      fourOnes.sort((a, b) => {
        const evA = evaluateCombo(a, seat)!;
        const evB = evaluateCombo(b, seat)!;
        return getRankWeight(evA.primaryRank) - getRankWeight(evB.primaryRank);
      });
      const oppCards = hands[target.seat]?.length || 10;
      // 若对手牌尚多（>=5张）且只是普通顺子或同花，绝不轻易浪费四带一
      if (tTier >= 3 || oppCards <= 4 || cards.length <= 5) {
        return fourOnes[0];
      }
    }

    // ⑤ 同花顺 (Tier 5)
    for (const group of suitGroups.values()) {
      if (group.length >= 5) {
        const sSorted = [...group].sort((a, b) => getCardPower(a) - getCardPower(b));
        for (let i = 0; i <= sSorted.length - 5; i++) {
          const sub = sSorted.slice(i, i + 5);
          const ev = evaluateCombo(sub, seat);
          if (ev && ev.comboTier === 5 && canBeat(ev, target)) {
            const oppCards = hands[target.seat]?.length || 10;
            if (tTier >= 4 || oppCards <= 3 || cards.length <= 5) {
              return sub;
            }
          }
        }
      }
    }
  }

  return null;
}

function getEnhancedAIPlay(seat: number): Card[] | null {
  const currentHand = hands[seat];
  if (!currentHand || currentHand.length === 0) return null;

  // 自愈校验：若此席位并无方块4，则绝不可能是首出方块4限制
  const hasD4 = currentHand.some((c) => c.rank === 4 && c.suit === '♦');
  const isActualFirstTurn = isFirstTurn.value && hasD4;
  if (seat === 0 && isFirstTurn.value && !hasD4) {
    isFirstTurn.value = false;
  }

  // 1. 如果一手牌本身就是合法组合，直接走完获胜！
  const allEv = evaluateCombo(currentHand, seat);
  if (allEv && (!lastCombo.value || lastCombo.value.seat === seat || canBeat(allEv, lastCombo.value))) {
    if (isActualFirstTurn) {
      if (hasD4) {
        aiThoughts[seat] = '首出成套直接走完获胜！';
        return [...currentHand];
      }
    } else {
      aiThoughts[seat] = '手牌一次性出清！终局获胜！';
      return [...currentHand];
    }
  }

  // 2. 转换目标牌型为 YansanCombo 供引擎决策
  const targetCombo = lastCombo.value && lastCombo.value.seat !== seat ? lastCombo.value : null;
  let yTarget: YansanCombo | null = null;
  if (targetCombo) {
    yTarget = {
      type: targetCombo.type === 'triple' ? 'triplet' : (targetCombo.type as any),
      comboTier: targetCombo.comboTier,
      rank: targetCombo.primaryRank,
      suitVal: targetCombo.flushSuit || (targetCombo.primarySuitVal % 10),
      cards: targetCombo.cards as any,
      seat: targetCombo.seat,
      label: targetCombo.label,
    };
  }

  const handsCount = [hands[0]?.length || 0, hands[1]?.length || 0, hands[2]?.length || 0, hands[3]?.length || 0];

  // 3. 调用强大的基于出牌历史敌友推断的 getYansanSmartAIPlay 核心
  const smartResult = getYansanSmartAIPlay(currentHand as any, yTarget, {
    isFirstTurn: isActualFirstTurn,
    seat,
    handsCount,
    seatPlayedCards: seatPlayedCards as any,
    playHistory: playHistory.value as any,
    isQiangGong: isQiangGongActive.value,
    qiangGongSeat: qiangGongSeat.value,
    downstreamSeat: getNextActiveSeat(seat),
    lastTargetSeat: targetCombo ? targetCombo.seat : undefined,
  });

  aiThoughts[seat] = smartResult.thought;
  aiBeliefs[seat] = smartResult.deducedAlliances;

  if (smartResult.cards && smartResult.cards.length > 0) {
    const idSet = new Set(smartResult.cards.map((c) => c.id));
    const matched = currentHand.filter((c) => idSet.has(c.id));
    if (matched.length === smartResult.cards.length) {
      const ev = evaluateCombo(matched, seat);
      if (ev && (!targetCombo || canBeat(ev, targetCombo))) {
        return matched;
      }
    }
  }

  // 4. 若智能引擎明确要求战术让行或战术隐忍过牌，严格尊重过牌决策
  if (smartResult.cards === null && (smartResult.tacticalIntent === 'yield_ally' || smartResult.tacticalIntent === 'strategic_pass')) {
    return null;
  }

  // 5. 备选方案：若规则引擎决策未完全匹配，使用 findWinningCombo
  if (targetCombo) {
    return findWinningCombo(currentHand, targetCombo, seat);
  } else {
    // 领牌备选
    if (isActualFirstTurn) {
      const d4 = currentHand.find((c) => c.rank === 4 && c.suit === '♦');
      if (d4) return [d4];
    }
    const sorted = [...currentHand].sort((a, b) => getCardPower(a) - getCardPower(b));
    return [sorted[0]];
  }
}

function findAllWinningCombos(cardList: Card[], target: Combo | null, seat: number): Card[][] {
  const cards = [...cardList].sort((a, b) => getCardPower(a) - getCardPower(b));
  const rankGroups = new Map<number, Card[]>();
  for (const c of cards) {
    if (!rankGroups.has(c.rank)) rankGroups.set(c.rank, []);
    rankGroups.get(c.rank)!.push(c);
  }
  const sortedRanks = Array.from(rankGroups.keys()).sort((a, b) => getRankWeight(a) - getRankWeight(b));

  if (!target) {
    const results: Card[][] = [];
    for (const c of cards) {
      const ev = evaluateCombo([c], seat);
      if (ev) results.push([c]);
    }
    for (const rk of sortedRanks) {
      const group = rankGroups.get(rk)!;
      if (group.length >= 2) {
        for (let i = 0; i < group.length - 1; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const pair = [group[i], group[j]];
            const ev = evaluateCombo(pair, seat);
            if (ev) results.push(pair);
          }
        }
      }
      if (group.length >= 3) {
        const trip = group.slice(0, 3);
        const ev = evaluateCombo(trip, seat);
        if (ev) results.push(trip);
      }
    }
    return results;
  }

  const results: Card[][] = [];

  if (target.type === 'single') {
    for (const c of cards) {
      const ev = evaluateCombo([c], seat);
      if (ev && canBeat(ev, target)) {
        results.push([c]);
      }
    }
  } else if (target.type === 'pair') {
    for (const rk of sortedRanks) {
      const group = rankGroups.get(rk)!;
      if (group.length >= 2) {
        for (let i = 0; i < group.length - 1; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const pair = [group[i], group[j]];
            const ev = evaluateCombo(pair, seat);
            if (ev && canBeat(ev, target)) {
              results.push(pair);
            }
          }
        }
      }
    }
  } else if (target.type === 'triple' || target.type === 'triplet') {
    for (const rk of sortedRanks) {
      const group = rankGroups.get(rk)!;
      if (group.length >= 3) {
        const trip = group.slice(0, 3);
        const ev = evaluateCombo(trip, seat);
        if (ev && canBeat(ev, target)) {
          results.push(trip);
        }
      }
      if (group.length === 4) {
        for (let i = 0; i < 4; i++) {
          const trip = group.filter((_, idx) => idx !== i);
          const ev = evaluateCombo(trip, seat);
          if (ev && canBeat(ev, target)) {
            results.push(trip);
          }
        }
      }
    }
  } else if (target.type === '5_card') {
    const uniqueRanks = Array.from(new Set(cards.map((c) => c.rank)));
    for (let i = 0; i <= uniqueRanks.length - 5; i++) {
      const sub = uniqueRanks.slice(i, i + 5);
      let isSeq = true;
      for (let j = 1; j < 5; j++) {
        if (sub[j] !== sub[j - 1] + 1) {
          isSeq = false;
          break;
        }
      }
      if (sub.includes(15)) isSeq = false;
      const is10JQKA = sub[0] === 10 && sub[4] === 14;
      if (isSeq && !is10JQKA) {
        const combo = sub.map((r) => cards.find((c) => c.rank === r)!);
        const ev = evaluateCombo(combo, seat);
        if (ev && canBeat(ev, target)) {
          results.push(combo);
        }
      }
    }
    if (uniqueRanks.includes(3) && uniqueRanks.includes(4) && uniqueRanks.includes(5) && uniqueRanks.includes(14) && uniqueRanks.includes(15)) {
      const combo = [3, 4, 5, 14, 15].map((r) => cards.find((c) => c.rank === r)!);
      const ev = evaluateCombo(combo, seat);
      if (ev && canBeat(ev, target)) {
        results.push(combo);
      }
    }

    const suitGroups = new Map<string, Card[]>();
    for (const c of cards) {
      if (!suitGroups.has(c.suit)) suitGroups.set(c.suit, []);
      suitGroups.get(c.suit)!.push(c);
    }
    for (const group of suitGroups.values()) {
      if (group.length >= 5) {
        const sSorted = [...group].sort((a, b) => getCardPower(a) - getCardPower(b));
        for (let i = 0; i <= sSorted.length - 5; i++) {
          const sub = sSorted.slice(i, i + 5);
          const ev = evaluateCombo(sub, seat);
          if (ev && canBeat(ev, target)) {
            results.push(sub);
          }
        }
      }
    }

    const triples = sortedRanks.filter((rk) => rankGroups.get(rk)!.length >= 3);
    const pairs = sortedRanks.filter((rk) => rankGroups.get(rk)!.length >= 2);
    for (const tRk of triples) {
      for (const pRk of pairs) {
        if (tRk !== pRk) {
          const fh = [...rankGroups.get(tRk)!.slice(0, 3), ...rankGroups.get(pRk)!.slice(0, 2)];
          const ev = evaluateCombo(fh, seat);
          if (ev && canBeat(ev, target)) {
            results.push(fh);
          }
        }
      }
    }

    const fourRanks = sortedRanks.filter((rk) => rankGroups.get(rk)!.length === 4);
    for (const fRk of fourRanks) {
      for (const c of cards) {
        if (c.rank !== fRk) {
          const fo = [...rankGroups.get(fRk)!, c];
          const ev = evaluateCombo(fo, seat);
          if (ev && canBeat(ev, target)) {
            results.push(fo);
          }
        }
      }
    }
  }

  return results;
}

function handleHint() {
  errorTip.value = '';
  const currentHand = hands[0] || [];
  const targetCombo = lastCombo.value && lastCombo.value.seat !== 0 ? lastCombo.value : null;
  const stateKey = `${currentHand.map((c) => c.id).sort().join(',')}_${targetCombo ? targetCombo.primaryRank + '_' + targetCombo.type : 'lead'}`;

  if (lastHintStateKey.value !== stateKey) {
    lastHintStateKey.value = stateKey;
    hintCombos.value = findAllWinningCombos(currentHand, targetCombo, 0);
    hintIndex.value = 0;
  }

  selectedIds.clear();

  if (hintCombos.value.length > 0) {
    const combo = hintCombos.value[hintIndex.value];
    if (combo && combo.length > 0) {
      combo.forEach((c) => selectedIds.add(c.id));
    }
    hintIndex.value = (hintIndex.value + 1) % hintCombos.value.length;
    drawTable();
    return;
  }

  // 没有管得起的牌时提示过牌
  if (lastCombo.value && lastCombo.value.seat !== 0) {
    handlePass();
  }
}

function runBotTurns(startSeat: number) {
  if (!selectedRoom.value || winnerSeat.value !== null) return;

  let s = startSeat;
  if (finishedSeats.includes(s)) {
    s = getNextActiveSeat(s);
  }
  if (!selectedRoom.value || winnerSeat.value !== null) return;

  if (s === 0) {
    turnSeat.value = 0;
    seatStatus[0] = lastCombo.value ? '该您跟牌' : '该您出牌';
    drawTable();
    emitStatus();
    if (isAutoHost.value) {
      checkAutoHostTurn();
    } else if (!checkPlayerAutoTurnActions()) {
      startTurnCountdown();
    }
    return;
  }

  turnSeat.value = s;
  const seatNames = ['本家', '西席', '北席', '东席'];
  seatStatus[s] = `${seatNames[s]} 思考中...`;
  drawTable();
  emitStatus();

  // 报单快速响应：若对手出的是对子/三条/五张，而机器人张数不足(如报单仅剩1张牌)，无法跟牌，留出适度反应时间迅速过牌
  const isCountShort = lastCombo.value && lastCombo.value.cards.length > hands[s].length;
  const thinkingDelay = isCountShort ? 900 : Math.floor(1400 + Math.random() * 700);

  if (botTimer) clearTimeout(botTimer);
  botTimer = setTimeout(() => {
    if (!selectedRoom.value || winnerSeat.value !== null || turnSeat.value !== s) return;
    botStep(s);
  }, thinkingDelay);
}

function botStep(seat: number) {
  if (!selectedRoom.value || winnerSeat.value !== null || turnSeat.value !== seat) return;

  // 1. 强攻判断：同时持黑桃3和黑桃A，13张手牌均未动，且本局未曾点击过牌
  if (!isQiangGongActive.value && !hasPassedSeats[seat] && hands[seat].length === 13 && hasSpade3AndA(seat)) {
    // 评估手牌实力：有强力大牌护体才选择强攻
    const highCards = hands[seat].filter((c) => getRankWeight(c.rank) >= 10);
    if (highCards.length >= 4 && Math.random() < 0.8) {
      handleQiangGong(seat);
      return;
    }
  }

  // 2. 调用增强版高智能决策引擎
  const chosen = getEnhancedAIPlay(seat);

  if (chosen) {
    const cb = evaluateCombo(chosen, seat)!;
    const rmIds = new Set(chosen.map((c) => c.id));
    hands[seat] = hands[seat].filter((c) => !rmIds.has(c.id));
    lastCombo.value = cb;
    consecutivePasses.value = 0;
    seatStatus[seat] = `出牌：${cb.label}`;

    const thought = aiThoughts[seat];
    if (thought) {
      latestThoughtBubble[seat] = thought;
      if (latestThoughtBubbleTimer[seat]) clearTimeout(latestThoughtBubbleTimer[seat]);
      latestThoughtBubbleTimer[seat] = setTimeout(() => {
        latestThoughtBubble[seat] = '';
      }, 4000);
    }

    if (typeof soundFX.playCardSnap === 'function') soundFX.playCardSnap(cb.type === 'bomb');
    soundFX.speakAction(cb.type === 'bomb' ? 'bomb' : cb.label, { isFemale: seat === 1 });
    if (cb.type === 'bomb') emit('fx', 'bomb');
    isFirstTurn.value = false;

    afterComboPlayed(seat, cb);
  } else {
    const thought = aiThoughts[seat] || '过牌';
    const isYield = thought.includes('让行') || thought.includes('让牌') || thought.includes('保送');
    seatStatus[seat] = isYield ? '战术让行' : '过牌';

    if (thought) {
      latestThoughtBubble[seat] = thought;
      if (latestThoughtBubbleTimer[seat]) clearTimeout(latestThoughtBubbleTimer[seat]);
      latestThoughtBubbleTimer[seat] = setTimeout(() => {
        latestThoughtBubble[seat] = '';
      }, 4000);
    }

    // 记录机器人过牌动作到全局历史以供推断
    playHistory.value.push({
      seat,
      cards: [],
      combo: null,
      targetCombo: lastCombo.value ? {
        type: lastCombo.value.type === 'triple' ? 'triplet' : (lastCombo.value.type as any),
        comboTier: lastCombo.value.comboTier,
        rank: lastCombo.value.primaryRank,
        suitVal: lastCombo.value.flushSuit || (lastCombo.value.primarySuitVal % 10),
        cards: lastCombo.value.cards as any,
        seat: lastCombo.value.seat,
        label: lastCombo.value.label,
      } : null,
      isPass: true,
      actionSeq: playHistory.value.length + 1,
      timestamp: Date.now(),
    });

    if (typeof soundFX.playTap === 'function') soundFX.playTap();
    soundFX.speakAction('pass', { isFemale: seat === 1 });
    hasPassedSeats[seat] = true;
    consecutivePasses.value++;

    const activeSeats = [0, 1, 2, 3].filter((s) => !finishedSeats.includes(s));
    const activeCount = activeSeats.length;
    const lastLeader = lastCombo.value?.seat;
    const leaderFinished = lastLeader !== undefined && finishedSeats.includes(lastLeader);
    const passThreshold = leaderFinished ? activeCount : activeCount - 1;

    if (consecutivePasses.value >= passThreshold) {
      // 所有剩余玩家都不出，本轮结束！
      // 用户明确规则："如果剩下的三个玩家都不出，就是打完手牌的下家接权，可以出其他牌型"
      const leadSeat = leaderFinished ? getNextActiveSeat(lastLeader!) : lastLeader!;
      consecutivePasses.value = 0;
      const names = ['本家', '西席', '北席', '东席'];
      for (const s of activeSeats) {
        if (s === leadSeat) {
          seatStatus[s] = s === 0 ? '该您出牌 (接风领出)' : (leaderFinished ? '接风领牌' : '大过全场 · 领出新牌');
        } else {
          seatStatus[s] = '要不起 (过牌)';
        }
      }
      drawTable();
      emitStatus();

      // 留存 1.5 秒桌面牌型，让玩家看清全场过牌与谁获得领出权，随后清空桌面
      setTimeout(() => {
        if (winnerSeat.value !== null) return;
        lastCombo.value = null;
        for (const s of activeSeats) {
          if (s !== leadSeat) {
            seatStatus[s] = '等待';
          }
        }
        turnSeat.value = leadSeat;
        drawTable();
        emitStatus();
        if (leadSeat !== 0) {
          if ((hands[leadSeat]?.length || 0) === 1) {
            executeBaoDanPlay(leadSeat);
          } else {
            runBotTurns(leadSeat);
          }
        } else if ((hands[0]?.length || 0) === 1) {
          seatStatus[0] = '🚨 报单绝杀 · 自动打出最后一张牌...';
          drawTable();
          emitStatus();
          playerAutoTimer = setTimeout(() => {
            if (turnSeat.value === 0 && (!lastCombo.value || lastCombo.value.seat === 0) && (hands[0]?.length || 0) === 1) {
              executeBaoDanPlay(0);
            }
          }, 700);
        } else if (isAutoHost.value) {
          checkAutoHostTurn();
        } else {
          if (!checkPlayerAutoTurnActions()) {
            startTurnCountdown();
          }
        }
      }, 1500);
    } else {
      // 未达出清轮数，逆时针轮到下一个未走完的玩家
      const nextS = getNextActiveSeat(seat);
      turnSeat.value = nextS;
      drawTable();
      emitStatus();
      if (nextS === 0) {
        if (isAutoHost.value) {
          checkAutoHostTurn();
        } else {
          if (!checkPlayerAutoTurnActions()) {
            startTurnCountdown();
          }
        }
      } else {
        runBotTurns(nextS);
      }
    }
  }
}

let cleanupCardLoader: (() => void) | null = null;

onMounted(() => {
  preloadCardAssets();
  cleanupCardLoader = onCardAssetsLoaded(() => {
    drawTable();
  });
  if (selectedRoom.value) {
    dealNewMatch();
  }
  updateDimensions();
  emitStatus();
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
  stopTurnCountdown();
  if (playerAutoTimer) clearTimeout(playerAutoTimer);
  if (autoHostTimer) clearTimeout(autoHostTimer);
  if (botTimer) clearTimeout(botTimer);
  if (danmakuTimer) clearTimeout(danmakuTimer);
  if (unbeatableTimer) clearTimeout(unbeatableTimer);
  if (unbeatablePauseTimer) clearTimeout(unbeatablePauseTimer);
  if (baodanTimer) clearTimeout(baodanTimer);
  if (animFrameId) cancelAnimationFrame(animFrameId);
});

defineExpose({
  dealNewMatch,
  toggleAutoHost,
});
</script>
