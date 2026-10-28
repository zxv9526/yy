<template>
  <div
    :class="isRotated90 ? 'app-rotated-90' : 'app-standard'"
    class="bg-[#0C0A09] text-[#F5EFE6] selection:bg-amber-600/30 selection:text-amber-200 select-none overflow-hidden"
  >
    <!-- 实时网络与在线状态浮动提示条 -->
    <div
      v-if="!isOnline || !wsConnected"
      class="bg-red-600/90 text-white text-[10px] sm:text-[11px] py-0.5 px-2 text-center z-50 flex items-center justify-center gap-1.5 shadow shrink-0 font-medium"
    >
      <span>🔴</span>
      <span>当前网络不稳定，正在重新连接</span>
    </div>

    <!-- 3D Hardware-Accelerated Special Effects & Particle Engine -->
    <Game3DEffects ref="fxRef" />

    <!-- ======================================================== -->
    <!-- TOP NAVIGATION BAR (LOBBY MODE)                          -->
    <!-- ======================================================== -->
    <header
      v-if="currentView === 'lobby'"
      class="w-full px-4 sm:px-6 py-2.5 bg-[#14100E] border-b border-amber-900/30 shadow-sm shrink-0"
    >
      <div class="max-w-[1360px] mx-auto flex items-center justify-between gap-3">
        <!-- 左上角：注册登录 & 个人档案 & APK下载 & 极速自动匹配 -->
        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="showAuthModal = true"
            class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 border border-amber-400/40 cursor-pointer"
          >
            <span>👤</span>
            <span>{{ userProfile.isLoggedIn ? `${userProfile.name} (切换)` : '注册 / 登录' }}</span>
          </button>

          <button
            type="button"
            @click="showApkModal = true"
            class="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-700/80 to-emerald-600/80 hover:from-emerald-600 hover:to-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 border border-emerald-400/40 cursor-pointer"
            title="点击下载最新 Android APK 安装包 (国内免翻墙高速加速)"
          >
            <span>📲</span>
            <span>安卓APK</span>
            <span class="hidden sm:inline text-[9px] px-1 py-0.2 rounded bg-white/20 text-emerald-100 font-mono">国内加速</span>
          </button>
        </div>

        <!-- 右上角：积分管理 -->
        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="openPointsModal"
            class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#241B14] via-[#2F2218] to-[#201711] hover:from-[#32251B] hover:to-[#2B1F17] border border-amber-500/50 hover:border-amber-400 transition-all flex items-center gap-2 text-xs shadow-md active:scale-95 group cursor-pointer"
            title="点击打开积分管理与筹码钱庄"
          >
            <span class="text-sm text-amber-400 filter drop-shadow">🪙</span>
            <div class="text-right">
              <div class="text-amber-300 font-mono font-bold leading-none tabular-nums text-xs">
                {{ userProfile.coins }} 分
              </div>
              <div class="text-[9px] text-amber-400/80 mt-0.5 leading-none font-medium">
                积分管理 →
              </div>
            </div>
          </button>
        </div>
      </div>
    </header>

    <!-- ======================================================== -->
    <!-- VIEW 1: GAME HALL LOBBY (仅显示所有游戏板块，横屏3列)         -->
    <!-- ======================================================== -->
    <main v-if="currentView === 'lobby'" class="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-8 py-3 flex flex-col justify-center overflow-hidden">
      <!-- 所有游戏板块 (三大经典国粹游戏，横屏三列沉浸式卡片) -->
      <div class="grid grid-cols-3 gap-3.5 sm:gap-5 w-full h-[calc(100%-8px)] max-h-[310px] items-stretch">
        <div
          v-for="g in GAME_MODULES"
          :key="g.id"
          @click="enterGame(g.id)"
          class="game-compact-card group relative rounded-2xl p-3 border transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-xl active:scale-[0.98]"
          :class="[g.cardBg, g.cardBorder]"
          :style="{
            boxShadow: `0 8px 24px -4px ${g.glowColor}, 0 12px 18px -4px rgba(0,0,0,0.5)`
          }"
        >
          <!-- 3D 光泽高光覆盖层 -->
          <div
            class="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/15 opacity-40 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl"
          ></div>

          <!-- 背景光晕 -->
          <div
            class="absolute -right-6 -bottom-6 w-32 h-32 rounded-full blur-2xl opacity-25 group-hover:opacity-50 transition-opacity pointer-events-none"
            :style="{ backgroundColor: g.accentColor }"
          ></div>

          <!-- 卡片内容 -->
          <div class="relative z-10 flex flex-col justify-between h-full space-y-1.5">
            <!-- 顶部：游戏名称与游戏说明 -->
            <div class="min-w-0">
              <h3 class="text-lg sm:text-xl md:text-2xl font-black text-white font-serif-title tracking-tight group-hover:text-amber-300 transition-colors drop-shadow-lg truncate">
                {{ g.name }}
              </h3>
              <p class="text-[10px] sm:text-[11px] text-[#A89887] mt-0.5 truncate leading-tight">
                {{ g.tagline }}
              </p>
            </div>

            <!-- 中部：SVG图片展示区 (烟三固定显示，十三张扇形显示同花顺) -->
            <div class="flex items-center justify-center py-1">
              <template v-if="g.id === 'yansan'">
                <div class="flex items-center gap-2">
                  <div class="w-16 h-24 sm:w-20 sm:h-30 rounded-md overflow-hidden shadow-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
                    <img src="/cards/ace_of_spades.svg" alt="黑桃A" class="w-full h-full object-cover drop-shadow-xl" />
                  </div>
                  <div class="w-16 h-24 sm:w-20 sm:h-30 rounded-md overflow-hidden shadow-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
                    <img src="/cards/3_of_spades.svg" alt="黑桃3" class="w-full h-full object-cover drop-shadow-xl" />
                  </div>
                </div>
              </template>
              <template v-else-if="g.id === 'shisanshui'">
                <div class="flex flex-col items-center justify-center gap-1.5 py-0.5 scale-100 sm:scale-110">
                  <!-- 黑桃同花顺 10 J Q K A 扇形 -->
                  <div class="flex items-center -space-x-4 group-hover:-space-x-3 transition-all duration-300">
                    <div
                      v-for="(card, idx) in ['10_of_spades', 'jack_of_spades', 'queen_of_spades', 'king_of_spades', 'ace_of_spades']"
                      :key="card"
                      class="w-10 h-15 sm:w-12 sm:h-18 rounded-md overflow-hidden shadow-xl border border-white/30 bg-black/40 backdrop-blur-xs flex items-center justify-center transition-all duration-300 group-hover:scale-110 p-0.5"
                      :style="{
                        transform: `rotate(${(idx - 2) * 6}deg) translateY(${Math.abs(idx - 2) * 2}px)`,
                        zIndex: idx
                      }"
                    >
                      <img :src="`/cards/${card}.svg`" :alt="card" class="w-full h-full object-contain drop-shadow" />
                    </div>
                  </div>
                  <!-- 红桃同花顺 10 J Q K A 扇形 -->
                  <div class="flex items-center -space-x-4 group-hover:-space-x-3 transition-all duration-300">
                    <div
                      v-for="(card, idx) in ['10_of_hearts', 'jack_of_hearts', 'queen_of_hearts', 'king_of_hearts', 'ace_of_hearts']"
                      :key="card"
                      class="w-10 h-15 sm:w-12 sm:h-18 rounded-md overflow-hidden shadow-xl border border-white/30 bg-black/40 backdrop-blur-xs flex items-center justify-center transition-all duration-300 group-hover:scale-110 p-0.5"
                      :style="{
                        transform: `rotate(${(idx - 2) * 6}deg) translateY(${Math.abs(idx - 2) * 2}px)`,
                        zIndex: idx
                      }"
                    >
                      <img :src="`/cards/${card}.svg`" :alt="card" class="w-full h-full object-contain drop-shadow" />
                    </div>
                  </div>
                </div>
              </template>
              <template v-else-if="g.id === 'mahjong'">
                <div class="flex items-center gap-2">
                  <div class="w-16 h-24 sm:w-20 sm:h-30 rounded-md overflow-hidden shadow-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
                    <img src="/mahjong/03-red-dragon.svg" alt="红中" class="w-full h-full object-cover drop-shadow-xl" />
                  </div>
                  <div class="w-16 h-24 sm:w-20 sm:h-30 rounded-md overflow-hidden shadow-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
                    <img src="/mahjong/02-green-dragon.svg" alt="发财" class="w-full h-full object-cover drop-shadow-xl" />
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="w-16 h-22 sm:w-20 sm:h-28 rounded-xl overflow-hidden shadow-xl border border-white/20 bg-black/30 backdrop-blur-xs flex items-center justify-center transition-transform duration-500 group-hover:scale-105 p-1.5">
                  <img
                    :src="getGameSvg(g.id)"
                    alt="Game SVG Asset"
                    class="w-full h-full object-contain drop-shadow-md transition-all duration-700"
                  />
                </div>
              </template>
            </div>

            <!-- 专属牌呢桌面微缩条 -->
            <div
              class="w-full py-0.5 px-2 rounded-lg border flex items-center justify-between text-[9px] sm:text-[10px] shadow-inner transition-transform group-hover:scale-[1.02]"
              :style="{ backgroundColor: g.tableFelt, borderColor: g.accentColor + '80' }"
            >
              <span class="font-bold text-white flex items-center gap-1 font-serif-title">
                <span>●</span>
                <span class="truncate">{{ g.tableName }}</span>
              </span>
              <span class="text-amber-300 font-mono font-bold shrink-0">
                {{ g.onlinePlayers }}人
              </span>
            </div>
          </div>

          <!-- 底部动作栏：准入与一键入座 -->
          <div class="relative z-10 pt-2 mt-2 border-t border-white/15 flex items-center justify-between">
            <span class="text-[10px] sm:text-[11px] font-mono font-bold text-amber-300">
              🪙 {{ g.baseStake }} 分
            </span>
            <div class="flex items-center">
              <button
                type="button"
                @click.stop="enterGame(g.id)"
                class="px-2.5 sm:px-3 py-1 text-[11px] font-bold rounded-lg text-white shadow-md transition-all duration-300 group-hover:scale-105 active:scale-95 flex items-center gap-1 border border-white/20 cursor-pointer"
                :class="g.buttonClass"
              >
                <span>入座</span>
                <span class="text-[10px]">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- ======================================================== -->
    <!-- VIEW 2: DEDICATED LANDSCAPE GAME ARENA (横屏竞技舞台)        -->
    <!-- ======================================================== -->
    <div
      v-else-if="currentView === 'arena'"
      class="relative w-full h-full flex flex-col select-none overflow-hidden"
      :style="{
        backgroundColor: currentTheme.feltColor,
        background: `radial-gradient(ellipse at 50% 45%, ${currentTheme.highlightColor || currentTheme.feltColor} 0%, ${currentTheme.feltColor} 55%, ${currentTheme.edgeColor || '#3F1803'} 100%)`
      }"
    >
      <!-- Overhead Ambient Table Light Spotlight Overlay -->
      <div class="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_40%,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0)_65%)] z-1"></div>

      <!-- In-Table Top Panoramic Felt HUD (全透明无遮挡顶沿栏) -->
      <div
        class="absolute top-0 left-0 right-0 h-10 px-3 sm:px-5 flex items-center justify-between z-30 transition-all bg-transparent border-b border-transparent"
      >
        <!-- Left: Game Scene Display (移至左上角，彻底释放顶部中央空间) -->
        <div class="flex items-center gap-1.5 sm:gap-2.5">
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/45 border border-amber-500/30 backdrop-blur-md shadow-sm">
            <span class="text-base sm:text-lg filter drop-shadow">{{ activeModuleInfo?.icon }}</span>
            <span class="font-bold text-xs sm:text-sm text-amber-200 font-serif-title drop-shadow whitespace-nowrap">
              {{ currentSceneDisplayName || activeModuleInfo?.name }}
            </span>
            <span
              v-if="isPracticeMode"
              class="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/25 text-amber-200 font-mono border border-amber-500/40"
              title="当前为人机补位试玩模式，局内筹码与胜负纯属模拟，不影响真实账户积分"
            >
              人机试玩(模拟积分)
            </span>
          </div>
        </div>

        <!-- Right: Actions, Fullscreen, Coins, Audio, Danmaku & Chat -->
        <div class="flex items-center gap-1 sm:gap-1.5">

          <!-- Coins Badge (Click opens Points Management) -->
          <button
            type="button"
            @click="openPointsModal"
            class="px-2 sm:px-2.5 py-1 rounded-xl bg-black/60 border border-amber-500/50 text-amber-300 font-mono font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
            title="钱庄账户"
          >
            <span>🪙</span>
            <span class="tabular-nums font-bold">{{ userProfile.coins }}</span>
          </button>

          <!-- Danmaku Stream Toggle -->
          <button
            type="button"
            @click="danmakuEnabled = !danmakuEnabled"
            class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl border flex items-center justify-center text-xs transition-all active:scale-95 cursor-pointer"
            :class="danmakuEnabled ? 'bg-amber-600/40 text-amber-300 border-amber-500/60' : 'bg-black/60 text-white/50 border-white/15'"
            title="全屏横向弹幕"
          >
            📡
          </button>

          <!-- Quick Audio Mute -->
          <button
            type="button"
            @click="toggleSound"
            class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-black/60 border border-white/15 flex items-center justify-center text-xs text-white/90 active:scale-90 cursor-pointer"
            title="静音开关"
          >
            {{ soundOn ? '🔊' : '🔇' }}
          </button>

          <!-- Fullscreen Toggle Button -->
          <button
            type="button"
            @click="toggleFullscreen"
            class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-black/60 border border-white/15 flex items-center justify-center text-xs text-white/90 active:scale-90 hover:text-white cursor-pointer"
            title="点击切换全屏沉浸对战模式"
          >
            ⛶
          </button>


          <!-- Toggle Chat & Interactive Props Drawer -->
          <button
            type="button"
            @click="showChatDrawer = !showChatDrawer"
            class="px-2.5 py-1 text-xs font-bold rounded-xl border transition-all flex items-center gap-1 shadow-md active:scale-95 cursor-pointer"
            :class="showChatDrawer ? 'bg-amber-600 text-white border-amber-400' : 'bg-black/60 text-white border-white/15 hover:bg-black/80'"
            title="展开互动茶室与快捷道具"
          >
            <span>💬</span>
            <span class="hidden sm:inline">互动茶室</span>
          </button>
        </div>
      </div>

      <!-- Center Fullscreen Table Stage Area (全屏无黑边牌桌舞台) -->
      <div class="w-full h-full absolute inset-0 overflow-hidden flex flex-col items-center justify-center p-0">

        <!-- Fullscreen Floating Danmaku Stream Layer (烟三对战专注沉浸，关闭弹幕遮挡) -->
        <div v-if="danmakuEnabled && activeGameId !== 'yansan'" class="absolute inset-0 pointer-events-none z-35 overflow-hidden">
          <div
            v-for="dm in danmakuItems"
            :key="dm.id"
            class="danmaku-item absolute flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/85 border backdrop-blur-xs whitespace-nowrap shadow-xl text-xs font-medium"
            :style="{
              top: `${dm.top}%`,
              borderColor: dm.color,
              animationDuration: `${dm.duration}s`
            }"
          >
            <span class="text-sm">{{ dm.avatar || '🏮' }}</span>
            <span class="font-bold text-amber-300">{{ dm.sender }}:</span>
            <span class="text-white">{{ dm.text }}</span>
            <span v-if="dm.prop" class="text-base animate-bounce">{{ dm.prop }}</span>
          </div>
        </div>

        <!-- Targeted Parabolic Flying Props & Impact Explosions -->
        <div
          v-for="fp in activeFlyingProps"
          :key="fp.id"
          class="pointer-events-none absolute z-40"
          :class="fp.stage === 'flying' ? 'prop-flying-anim' : 'prop-impact-anim'"
          :style="{
            '--start-x': `${fp.startX}%`,
            '--start-y': `${fp.startY}%`,
            '--target-x': `${fp.targetX}%`,
            '--target-y': `${fp.targetY}%`,
            top: fp.stage === 'flying' ? undefined : `${fp.targetY}%`,
            left: fp.stage === 'flying' ? undefined : `${fp.targetX}%`,
          }"
        >
          <div v-if="fp.stage === 'flying'" class="flex flex-col items-center">
            <span class="text-5xl filter drop-shadow-2xl animate-spin-slow">{{ fp.icon }}</span>
          </div>
          <div v-else class="flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2">
            <div class="relative flex items-center justify-center">
              <span class="text-6xl filter drop-shadow-[0_0_30px_rgba(245,158,11,1)] animate-ping-once">
                {{ fp.impactIcon || '💥' }}
              </span>
              <span class="absolute text-4xl filter drop-shadow-md">{{ fp.icon }}</span>
            </div>
            <div class="mt-1 px-2.5 py-0.5 rounded-full bg-black/95 border border-amber-400 text-[10px] text-amber-200 font-bold whitespace-nowrap shadow-xl">
              {{ fp.sender }} 掷向 {{ fp.targetName }}
            </div>
          </div>
        </div>

        <!-- Central Panoramic Game Table Frame (全屏伸展自适应，无多余外框挤压) -->
        <div class="w-full h-full flex flex-col items-center justify-center relative transition-all min-h-0">
          <!-- 3 Canvas Game Engines Inheriting Matching Color & Real Players -->
          <YansanCanvas
            v-if="activeGameType === 'yansan'"
            :table-theme="currentTheme"
            :is-rotated-90="isRotated90"
            :scene-mode="activeYansanScene"
            :room-players="currentWaitingRoomPlayers"
            @move="onGameMove"
            @restart="onGameRestart"
            @fx="onGameFx"
            @exit="returnToLobby"
          />
          <ShisanshuiCanvas
            v-else-if="activeGameType === 'shisanshui'"
            :table-theme="currentTheme"
            :is-rotated-90="isRotated90"
            :scene-mode="activeShisanshuiScene"
            :room-players="currentWaitingRoomPlayers"
            @move="onGameMove"
            @restart="onGameRestart"
            @fx="onGameFx"
            @exit="returnToLobby"
          />
          <MahjongCanvas
            v-else-if="activeGameType === 'mahjong'"
            :table-theme="currentTheme"
            :is-rotated-90="isRotated90"
            :scene-mode="activeMahjongScene"
            :room-players="currentWaitingRoomPlayers"
            @move="onGameMove"
            @restart="onGameRestart"
            @fx="onGameFx"
            @exit="returnToLobby"
          />
        </div>

        <!-- Mini Integrated Quick Chat Bar on Arena Table (Bottom-Right) -->
        <div class="hidden sm:flex items-center gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10 backdrop-blur-xs absolute bottom-1.5 right-2 z-30">
          <div class="flex items-center gap-1">
            <button
              v-for="p in QUICK_FLOATING_PROPS"
              :key="p.name"
              type="button"
              @click="sendPropWithTarget(p, 1)"
              class="w-7 h-7 rounded-xl bg-black/60 hover:bg-black/90 border border-white/10 hover:border-amber-400 flex items-center justify-center text-sm transition-transform active:scale-90"
              :title="`向西席掷出【${p.name}】`"
            >
              {{ p.icon }}
            </button>
          </div>
          <form @submit.prevent="sendQuickBarChat" class="flex items-center gap-1 pl-1 border-l border-white/10">
            <input
              v-model="quickBarInput"
              type="text"
              placeholder="发条弹幕..."
              class="w-24 sm:w-32 px-2 py-1 text-[11px] rounded-lg bg-black/60 border border-white/15 text-[#F5EFE6] focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              class="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] whitespace-nowrap shadow-xs"
            >
              发
            </button>
          </form>
        </div>

        <!-- Slide-out Glassmorphic Interactive Drawer (4 Rich Tabs) -->
        <div
          v-if="showChatDrawer"
          class="absolute right-0 top-0 bottom-0 w-80 sm:w-96 bg-[#14100E]/95 backdrop-blur-2xl border-l border-white/15 p-3.5 z-50 flex flex-col justify-between shadow-[0_0_50px_rgba(0,0,0,0.85)] animate-slide-left"
        >
          <div class="flex-1 flex flex-col overflow-hidden">
            <!-- Drawer Header -->
            <div class="flex items-center justify-between pb-2.5 mb-2 border-b border-white/10 shrink-0">
              <div class="flex items-center gap-2">
                <span class="text-base">🏮</span>
                <span class="font-bold text-sm text-[#F5EFE6] font-serif-title">茶楼社交与弹幕互动</span>
              </div>
              <button
                type="button"
                @click="showChatDrawer = false"
                class="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs text-[#A89887] hover:text-white"
              >
                ✕
              </button>
            </div>

            <!-- 4 Feature Tabs Navigator -->
            <div class="flex items-center gap-1 p-1 bg-[#0A0706] rounded-xl border border-white/10 mb-3 shrink-0 text-xs">
              <button
                type="button"
                @click="activeChatTab = 'phrases'"
                :class="activeChatTab === 'phrases' ? 'bg-amber-600 text-white font-bold shadow-xs' : 'text-[#A89887] hover:text-white'"
                class="flex-1 py-1 rounded-lg transition-colors whitespace-nowrap"
              >
                台词语音
              </button>
              <button
                type="button"
                @click="activeChatTab = 'props'"
                :class="activeChatTab === 'props' ? 'bg-amber-600 text-white font-bold shadow-xs' : 'text-[#A89887] hover:text-white'"
                class="flex-1 py-1 rounded-lg transition-colors whitespace-nowrap"
              >
                互动道具
              </button>
              <button
                type="button"
                @click="activeChatTab = 'emojis'"
                :class="activeChatTab === 'emojis' ? 'bg-amber-600 text-white font-bold shadow-xs' : 'text-[#A89887] hover:text-white'"
                class="flex-1 py-1 rounded-lg transition-colors whitespace-nowrap"
              >
                趣味表情
              </button>
              <button
                type="button"
                @click="activeChatTab = 'history'"
                :class="activeChatTab === 'history' ? 'bg-amber-600 text-white font-bold shadow-xs' : 'text-[#A89887] hover:text-white'"
                class="flex-1 py-1 rounded-lg transition-colors whitespace-nowrap"
              >
                聊天实录
              </button>
            </div>

            <!-- Tab 1: Categorized Classic Tea House Phrases with Voice Speech -->
            <div v-if="activeChatTab === 'phrases'" class="flex-1 flex flex-col overflow-hidden">
              <div class="flex items-center gap-1 mb-2 shrink-0 overflow-x-auto pb-1 text-[11px]">
                <button
                  v-for="(cat, idx) in PHRASE_CATEGORIES"
                  :key="cat.name"
                  type="button"
                  @click="activePhraseCategory = idx"
                  :class="activePhraseCategory === idx ? 'bg-amber-700/60 text-amber-200 border-amber-500' : 'bg-[#1C1612] text-[#A89887] border-white/10'"
                  class="px-2 py-0.5 rounded-lg border transition-colors whitespace-nowrap"
                >
                  {{ cat.icon }} {{ cat.name }}
                </button>
              </div>

              <div class="flex-1 overflow-y-auto space-y-1.5 pr-1">
                <button
                  v-for="phrase in PHRASE_CATEGORIES[activePhraseCategory].list"
                  :key="phrase"
                  type="button"
                  @click="sendCategorizedPhrase(phrase)"
                  class="w-full p-2.5 rounded-xl bg-[#1C1612] hover:bg-[#2B211A] border border-white/10 text-left text-xs text-[#E6DEC8] transition-all flex items-center justify-between group shadow-xs active:scale-[0.99]"
                >
                  <span class="truncate">{{ phrase }}</span>
                  <span class="text-amber-400 opacity-60 group-hover:opacity-100 transition-opacity ml-2 text-sm shrink-0">🔊</span>
                </button>
              </div>
            </div>

            <!-- Tab 2: 8 Interactive Props with Seat Target Selection -->
            <div v-else-if="activeChatTab === 'props'" class="flex-1 flex flex-col overflow-hidden">
              <!-- Seat Target Selector -->
              <div class="mb-2 p-2 rounded-xl bg-[#100C0A] border border-white/10 shrink-0">
                <div class="text-[11px] text-[#A89887] mb-1 font-medium flex items-center justify-between">
                  <span>🎯 选择投掷目标席位：</span>
                  <span class="text-amber-300 font-bold">{{ selectedTargetSeatLabel }}</span>
                </div>
                <div class="grid grid-cols-4 gap-1 text-[10px]">
                  <button
                    v-for="s in AVAILABLE_TARGET_SEATS"
                    :key="s.seat"
                    type="button"
                    @click="selectedTargetSeat = s.seat"
                    :class="selectedTargetSeat === s.seat ? 'bg-amber-600 border-amber-400 text-white font-bold' : 'bg-[#1C1612] border-white/10 text-[#A89887]'"
                    class="py-1 rounded-lg border transition-colors truncate text-center"
                  >
                    {{ s.name }}
                  </button>
                </div>
              </div>

              <!-- Props Grid -->
              <div class="flex-1 overflow-y-auto grid grid-cols-2 gap-2 pr-1">
                <button
                  v-for="p in CHAT_PROPS"
                  :key="p.name"
                  type="button"
                  @click="sendPropWithTarget(p, selectedTargetSeat)"
                  class="p-2.5 rounded-xl bg-[#1C1612] hover:bg-[#2B211A] border border-white/10 flex flex-col justify-between transition-transform active:scale-95 group text-left shadow-xs"
                >
                  <div class="text-3xl mb-1 group-hover:scale-110 transition-transform">{{ p.icon }}</div>
                  <div>
                    <div class="font-bold text-xs text-amber-200">{{ p.name }}</div>
                    <div class="text-[10px] text-[#8C7A6B] mt-0.5 leading-snug">{{ p.desc }}</div>
                  </div>
                  <div class="mt-1.5 text-[9px] text-amber-400 font-mono font-medium flex items-center justify-between">
                    <span>立即秒掷</span>
                    <span>→</span>
                  </div>
                </button>
              </div>
            </div>

            <!-- Tab 3: Fun Animated Emoji Stickers Grid -->
            <div v-else-if="activeChatTab === 'emojis'" class="flex-1 overflow-y-auto grid grid-cols-6 gap-1.5 pr-1">
              <button
                v-for="em in STICKER_EMOJIS"
                :key="em"
                type="button"
                @click="sendEmojiSticker(em)"
                class="h-11 rounded-xl bg-[#1C1612] hover:bg-[#2B211A] border border-white/10 text-2xl flex items-center justify-center transition-transform hover:scale-115 active:scale-90 shadow-xs"
              >
                {{ em }}
              </button>
            </div>

            <!-- Tab 4: Live Chat Stream Log -->
            <div v-else-if="activeChatTab === 'history'" class="flex-1 overflow-y-auto space-y-2 p-2.5 rounded-2xl bg-[#0D0907] border border-white/10">
              <div v-if="activeChatList.length === 0" class="text-center py-8 text-xs text-[#8C7A6B]">
                暂无聊天弹幕记录
              </div>
              <div
                v-for="c in activeChatList"
                :key="c.id"
                class="p-2 rounded-xl bg-[#14100E] border border-white/5 text-xs leading-relaxed"
              >
                <div class="flex items-center justify-between text-[10px] mb-0.5">
                  <span class="font-bold text-amber-400 flex items-center gap-1">
                    <span>{{ c.avatar || '👤' }}</span>
                    <span>{{ c.sender }}</span>
                  </span>
                  <span class="text-[#8C7A6B] font-mono">{{ c.timestamp }}</span>
                </div>
                <div class="text-[#E6DEC8] flex items-center gap-1.5 mt-0.5">
                  <span>{{ c.text }}</span>
                  <span v-if="c.prop" class="text-base">{{ c.prop }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Chat Input Form -->
          <form @submit.prevent="sendChat" class="flex items-center gap-2 pt-2.5 border-t border-white/10 shrink-0">
            <input
              v-model="chatInput"
              type="text"
              placeholder="发送弹幕或问候客官..."
              class="flex-1 px-3 py-2 text-xs rounded-xl bg-[#0D0907] border border-white/10 text-[#F5EFE6] focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              class="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white transition-colors whitespace-nowrap shadow-md"
            >
              发送
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- VIEW 3: MAHJONG SCENE SELECTION (点击麻将游戏板块才跳转到此界面) -->
    <!-- ======================================================== -->
    <MahjongSceneModal
      v-else-if="currentView === 'mahjong-scenes'"
      :initial-scene="activeMahjongScene"
      @select="onSelectMahjongScene"
      @close="returnToLobby"
    />

    <!-- ======================================================== -->
    <!-- VIEW 4: SHISANSHUI SCENE SELECTION (点击十三张板块才跳转到此界面) -->
    <!-- ======================================================== -->
    <ShisanshuiSceneModal
      v-else-if="currentView === 'shisanshui-scenes'"
      :initial-scene="activeShisanshuiScene"
      @select="onSelectShisanshuiScene"
      @close="returnToLobby"
    />

    <!-- ======================================================== -->
    <!-- VIEW 5: YANSAN SCENE SELECTION (点击经典烟三板块跳转到场景选择) -->
    <!-- ======================================================== -->
    <YansanSceneModal
      v-else-if="currentView === 'yansan-scenes'"
      :initial-scene="activeYansanScene"
      @select="onSelectYansanScene"
      @close="returnToLobby"
    />

    <!-- ======================================================== -->
    <!-- VIEW 6: SCENE MATCHING WAITING ROOM (选定场景后等待玩家入座，满座自动开局) -->
    <!-- ======================================================== -->
    <SceneWaitingRoom
      v-else-if="currentView === 'waiting-room'"
      :game-type="activeGameType"
      :scene-mode="activeSceneMode"
      :scene-name="currentSceneDisplayName"
      :base-stake="currentSceneBaseStake"
      :max-players="currentSceneMaxPlayers"
      :current-user="userProfile"
      :ws="ws"
      :ws-connected="wsConnected"
      :table-theme="currentTheme"
      :is-rotated-90="isRotated90"
      @leave="returnToLobby"
      @change-scene="onChangeSceneFromWaitingRoom"
      @start-game="onFullSeatGameStart"
      @open-points="openPointsModal"
    />

    <!-- Modals -->
    <!-- 1. 注册登录弹窗 -->
    <AuthModal
      v-if="showAuthModal"
      :profile="userProfile"
      @close="showAuthModal = false"
      @update:profile="onUpdateProfile"
      @open-termux="showTermuxModal = true"
    />

    <!-- 2. 积分管理钱庄弹窗 -->
    <PointsManageModal
      v-if="showPointsModal"
      :profile="userProfile"
      @close="showPointsModal = false"
      @update:profile="onUpdateProfile"
      @theme-change="onThemeChange"
    />

    <!-- 3. 用户战绩档案与签到弹窗 -->
    <UserProfileModal
      v-if="showProfileModal"
      :profile="userProfile"
      :records="matchRecords"
      @close="showProfileModal = false"
      @update:profile="onUpdateProfile"
      @update:records="onUpdateRecords"
    />

    <!-- 4. 成就挑战与牌桌装扮弹窗 -->
    <AchievementModal
      v-if="showAchievementModal"
      :coins="userProfile.coins"
      @close="showAchievementModal = false"
      @claim="onClaimAchievement"
      @theme-change="onThemeChange"
    />

    <!-- 5. Android Termux 部署指南与性能监控弹窗 -->
    <TermuxDeploySection
      v-if="showTermuxModal"
      :is-modal="true"
      @close="showTermuxModal = false"
    />

    <!-- 6. Android APK 客户端极速下载弹窗 (国内加速) -->
    <ApkDownloadModal
      v-if="showApkModal"
      @close="showApkModal = false"
    />

    <!-- 8. 积分不足入座提示弹窗 (可选择进入人机补位试玩或前往钱庄) -->
    <InsufficientCoinsModal
      v-if="showInsufficientModal"
      :current-coins="insufficientModalData.currentCoins"
      :required-coins="insufficientModalData.requiredCoins"
      :scene-name="insufficientModalData.sceneName"
      @close="showInsufficientModal = false"
      @enter-practice="handleEnterPracticeFromModal"
      @open-points="handleOpenPointsFromModal"
    />

    <!-- 7. 极速自动匹配弹窗 (同段位智能连线) -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none">
        <div class="w-[94vw] max-w-lg max-h-[92dvh] flex flex-col rounded-3xl bg-[#1C1815] border border-white/15 p-4 sm:p-6 shadow-2xl overflow-hidden">
          <div class="flex items-center justify-between mb-3 pb-2 border-b border-white/10 shrink-0">
            <h3 class="text-base font-bold text-[#F5EFE6] font-serif-title flex items-center gap-2">
              <span>🏮</span>
              <span>开设新棋牌房间</span>
            </h3>
            <button type="button" @click="showCreateModal = false" class="text-xs text-[#B8A99A] hover:text-white px-2 py-1 rounded cursor-pointer">
              关闭 ✕
            </button>
          </div>

          <form @submit.prevent="createRoomSubmit" class="flex-1 overflow-y-auto space-y-3.5 pr-1">
            <div>
              <label class="block text-xs text-[#B8A99A] mb-1">房间雅号</label>
              <input
                v-model="newRoomTitle"
                type="text"
                placeholder="例如：醉月阁 · 雀王之战"
                class="w-full px-3.5 py-2 text-xs rounded-xl bg-[#120E0C] border border-white/10 text-[#F5EFE6] focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label class="block text-xs text-[#B8A99A] mb-1.5">选择棋牌种类 (3款国粹经典)</label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="g in GAME_MODULES"
                  :key="g.id"
                  type="button"
                  @click="newRoomGame = g.id"
                  :class="newRoomGame === g.id ? 'bg-amber-600 border-amber-400 text-white font-bold shadow-md' : 'bg-[#14110F] border-white/10 text-[#B8A99A]'"
                  class="py-2 px-2 text-xs rounded-xl border transition-colors whitespace-nowrap text-center cursor-pointer"
                >
                  {{ g.icon }} {{ g.name }}
                </button>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                @click="showCreateModal = false"
                class="px-4 py-2 text-xs rounded-xl bg-[#241D17] text-[#D6C7B2] hover:text-white transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                class="px-5 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-md active:scale-95 transition-all cursor-pointer"
              >
                立即开局
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
import AuthModal from './components/AuthModal.vue';
import PointsManageModal from './components/PointsManageModal.vue';
import UserProfileModal from './components/UserProfileModal.vue';
import AchievementModal from './components/AchievementModal.vue';
import TermuxDeploySection from './components/TermuxDeploySection.vue';
import ApkDownloadModal from './components/ApkDownloadModal.vue';
import Game3DEffects from './components/effects/Game3DEffects.vue';
import InsufficientCoinsModal from './components/InsufficientCoinsModal.vue';

// 3 Canvas Games
import YansanCanvas from './components/canvas/YansanCanvas.vue';
import ShisanshuiCanvas from './components/canvas/ShisanshuiCanvas.vue';
import MahjongCanvas from './components/canvas/MahjongCanvas.vue';
import MahjongSceneModal, { MahjongSceneMode } from './components/MahjongSceneModal.vue';
import ShisanshuiSceneModal, { ShisanshuiSceneMode } from './components/ShisanshuiSceneModal.vue';
import YansanSceneModal, { YansanSceneMode } from './components/YansanSceneModal.vue';
import SceneWaitingRoom, { ScenePlayer } from './components/SceneWaitingRoom.vue';

import { soundFX } from './utils/sound';
import { haptics } from './utils/haptics';
import { TableTheme, getGameTheme } from './utils/theme';
import {
  loadLocalProfile,
  saveLocalProfile,
  loadLocalRecords,
  saveLocalRecords,
  recordPointsTx,
  syncWithServer,
  clearLocalAuthData,
  resetToDefaultGuestProfile,
  UserProfile,
  MatchRecord,
} from './utils/storage';

export type GameType = 'yansan' | 'shisanshui' | 'mahjong';

interface GameModuleInfo {
  id: GameType;
  name: string;
  icon: string;
  tagline: string;
  badgeText: string;
  badgeClass: string;
  featurePills: string[];
  tableFelt: string;
  tableName: string;
  tableRule: string;
  tableIcon: string;
  onlinePlayers: number;
  baseStake: number;
  cardBg: string;
  cardBorder: string;
  iconBoxBg: string;
  iconBoxBorder: string;
  accentColor: string;
  glowColor: string;
  buttonClass: string;
}

// 3 Games with 3D Floating Gradients & Corresponding Table Colors
const GAME_MODULES: GameModuleInfo[] = [
  {
    id: 'yansan',
    name: '经典烟三',
    icon: '🔥',
    tagline: '5--10 / 10--20 / 20--40分场 · 四人争锋',
    badgeText: '5--10至20--40分场',
    badgeClass: 'bg-red-900/60 text-red-200 border-red-500/50',
    featurePills: ['四人同台', '方块三首出', '5--10分场'],
    tableFelt: '#450A0A',
    tableName: '烟三风云台',
    tableRule: '5--10 / 10--20 / 20--40分场 · 52张全发 · 炽红呢绒',
    tableIcon: '🔥',
    onlinePlayers: 1890,
    baseStake: 5,
    cardBg: 'bg-gradient-to-br from-[#7F1D1D] via-[#450A0A] to-[#1F0404]',
    cardBorder: 'border-red-500/60 hover:border-red-400',
    iconBoxBg: 'bg-red-500/25 text-red-300',
    iconBoxBorder: 'border-red-400/50',
    accentColor: '#EF4444',
    glowColor: 'rgba(239, 68, 68, 0.45)',
    buttonClass: 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400',
  },
  {
    id: 'shisanshui',
    name: '十三张',
    icon: '💎',
    tagline: '头中尾三道 · 智能理牌',
    badgeText: '深海幻蓝 · 严防倒水',
    badgeClass: 'bg-blue-900/60 text-blue-200 border-blue-500/50',
    featurePills: ['一键智能推荐', '倒水实时预警', '全垒打打枪翻倍'],
    tableFelt: '#172554',
    tableName: '深海幻蓝台',
    tableRule: '头3张/中5张/尾5张 · 幽蓝呢绒',
    tableIcon: '🌊',
    onlinePlayers: 1450,
    baseStake: 300,
    cardBg: 'bg-gradient-to-br from-[#1E3A8A] via-[#172554] to-[#0B1224]',
    cardBorder: 'border-blue-500/60 hover:border-blue-400',
    iconBoxBg: 'bg-blue-500/25 text-blue-300',
    iconBoxBorder: 'border-blue-400/50',
    accentColor: '#3B82F6',
    glowColor: 'rgba(59, 130, 246, 0.45)',
    buttonClass: 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400',
  },
  {
    id: 'mahjong',
    name: '经典麻将',
    icon: '🀄',
    tagline: '东风圈 · 碰杠听胡',
    badgeText: '幻彩紫晶 · 自摸大胡',
    badgeClass: 'bg-purple-900/60 text-purple-200 border-purple-500/50',
    featurePills: ['听牌智能推算', '牌墙余张透视', '万条筒字吃碰杠'],
    tableFelt: '#3B0764',
    tableName: '幻彩紫晶池',
    tableRule: '136张经典牌库 · 东风圈 · 紫金呢绒',
    tableIcon: '🀄',
    onlinePlayers: 2650,
    baseStake: 200,
    cardBg: 'bg-gradient-to-br from-[#581C87] via-[#3B0764] to-[#1A032C]',
    cardBorder: 'border-purple-500/60 hover:border-purple-400',
    iconBoxBg: 'bg-purple-500/25 text-purple-300',
    iconBoxBorder: 'border-purple-400/50',
    accentColor: '#A855F7',
    glowColor: 'rgba(168, 85, 247, 0.45)',
    buttonClass: 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400',
  },
];

const GAME_SVG_IMAGES: Record<GameType, string[]> = {
  yansan: ['/cards/ace_of_spades.svg', '/cards/3_of_spades.svg'],
  shisanshui: ['/cards/ace_of_spades.svg', '/cards/ace_of_hearts.svg', '/cards/ace_of_diamonds.svg', '/cards/ace_of_clubs.svg'],
  mahjong: ['/mahjong/03-red-dragon.svg', '/mahjong/02-green-dragon.svg'],
};

const currentSvgIndex = ref(0);
let svgTimer: number | null = null;

onMounted(() => {
  svgTimer = window.setInterval(() => {
    currentSvgIndex.value = (currentSvgIndex.value + 1) % 100;
  }, 2200);
});

onBeforeUnmount(() => {
  if (svgTimer) clearInterval(svgTimer);
});

const getGameSvg = (id: GameType) => {
  const imgs = GAME_SVG_IMAGES[id] || [];
  if (imgs.length === 0) return '';
  return imgs[currentSvgIndex.value % imgs.length];
};

const QUICK_PHRASES = [
  '快点吧，我等到花儿都谢了！',
  '你的牌打得也太好了吧！',
  '手气真差，怎么一把大牌都没有！',
  '搏一搏，单车变摩托！',
  '青山不改，绿水长流，后会有期！',
  '风里雨里，牌桌等你！',
  '顺子连环，谁与争锋！',
  '哈哈，这把神仙也救不了你！',
];

const CHAT_PROPS = [
  { name: '敬茶', icon: '🍵', impactIcon: '☕', desc: '奉上热茶一杯' },
  { name: '鲜花', icon: '💐', impactIcon: '🌸', desc: '花团锦簇喝彩' },
  { name: '轰天炸弹', icon: '💣', impactIcon: '💥', desc: '飞弹震屏轰炸' },
  { name: '干杯', icon: '🍺', impactIcon: '🍻', desc: '举杯碰响欢庆' },
  { name: '鼓掌', icon: '👏', impactIcon: '✨', desc: '满堂喝彩致意' },
  { name: '皇冠', icon: '👑', impactIcon: '🌟', desc: '加冕牌坛霸主' },
  { name: '飞掷番茄', icon: '🍅', impactIcon: '💦', desc: '砸个满堂通红' },
  { name: '拖鞋暴击', icon: '🩴', impactIcon: '💢', desc: '飞鞋催促快打' },
];

const QUICK_FLOATING_PROPS = [
  { name: '轰天炸弹', icon: '💣' },
  { name: '敬茶', icon: '🍵' },
  { name: '干杯', icon: '🍺' },
  { name: '鼓掌', icon: '👏' },
];

const AVAILABLE_TARGET_SEATS = [
  { seat: 1, name: '西席牌友 (左)', x: 18, y: 42 },
  { seat: 2, name: '北席牌友 (上)', x: 50, y: 20 },
  { seat: 3, name: '东席牌友 (右)', x: 82, y: 42 },
  { seat: 0, name: '本家台前 (下)', x: 50, y: 75 },
];

const selectedTargetSeat = ref(1);
const selectedTargetSeatLabel = computed(() => {
  return AVAILABLE_TARGET_SEATS.find((s) => s.seat === selectedTargetSeat.value)?.name || '西席牌友';
});

const PHRASE_CATEGORIES = [
  {
    name: '催牌急招',
    icon: '⚡',
    list: [
      '快点吧，我等到花儿都谢了！',
      '打牌如抽丝，你这是绣花呢！',
      '手疾眼快才能赢，别犹豫啦！',
      '快马加鞭，速战速决！',
    ],
  },
  {
    name: '赞叹敬佩',
    icon: '👏',
    list: [
      '你的牌打得也太好了吧！',
      '高手在民间，佩服佩服！',
      '这手牌出得出神入化！',
      '炉火纯青，甘拜下风！',
    ],
  },
  {
    name: '叹息自嘲',
    icon: '😅',
    list: [
      '手气真差，怎么一把大牌都没有！',
      '风水轮流转，下把必翻盘！',
      '搏一搏，单车变摩托！',
      '牌运不济，时运不齐呀！',
    ],
  },
  {
    name: '挑衅叫阵',
    icon: '🔥',
    list: [
      '哈哈，这把神仙也救不了你！',
      '炸弹在手，天下我有！',
      '顺子连环，谁与争锋！',
      '敢不敢再加一倍筹码！',
    ],
  },
  {
    name: '茶肆问候',
    icon: '🍵',
    list: [
      '客官上座，先饮一杯碧螺春！',
      '风里雨里，茶楼牌桌等你！',
      '青山不改，绿水长流，后会有期！',
      '牌逢知己千杯少，再来一盘！',
    ],
  },
];

const activePhraseCategory = ref(0);

const STICKER_EMOJIS = [
  '🤣', '😎', '🎉', '🔥', '👏', '🤔',
  '💪', '🥳', '😇', '☕', '🀄', '🃏',
  '👑', '🚀', '💣', '💎', '🍵', '🧧',
  '🤩', '👍', '🙈', '🎯', '🏮', '✨'
];

// Reactive states
const currentView = ref<'lobby' | 'arena' | 'mahjong-scenes' | 'shisanshui-scenes' | 'yansan-scenes' | 'waiting-room'>('lobby');
const activeGameType = ref<GameType>('yansan');
const activeRoomId = ref('RM-202');
const activeMahjongScene = ref<MahjongSceneMode>('hongzhong-6');
const activeShisanshuiScene = ref<ShisanshuiSceneMode>('four-realtime');
const activeYansanScene = ref<YansanSceneMode>('yansan-5-10');
const activeSceneMode = ref<string>('yansan-5-10');
const currentWaitingRoomPlayers = ref<ScenePlayer[]>([]);
const isPracticeMode = ref(false);

const activeMahjongSceneTag = computed(() => {
  if (activeMahjongScene.value === 'hongzhong-6') return '红中6码';
  if (activeMahjongScene.value === 'hongzhong-10') return '红中10码';
  if (activeMahjongScene.value === 'standard-10') return '普通10码';
  return '普通6码';
});

const activeShisanshuiSceneTag = computed(() => {
  if (activeShisanshuiScene.value === 'eight-realtime') return '八人实时(2副)';
  if (activeShisanshuiScene.value === 'eight-booking') return '八人预约(2副)';
  if (activeShisanshuiScene.value === 'four-booking') return '四人预约(1副)';
  return '四人实时(1副)';
});

const currentSceneDisplayName = computed(() => {
  if (activeGameType.value === 'shisanshui') {
    switch (activeShisanshuiScene.value) {
      case 'four-realtime':
        return '四人实时场';
      case 'four-booking':
        return '四人预约场';
      case 'eight-realtime':
        return '八人实时场';
      case 'eight-booking':
        return '八人预约场';
      default:
        return '四人实时场';
    }
  }
  if (activeGameType.value === 'mahjong') {
    switch (activeMahjongScene.value) {
      case 'hongzhong-6':
        return '红中6码场';
      case 'hongzhong-10':
        return '红中10码场';
      case 'standard-10':
        return '普通10码场';
      case 'standard-6':
        return '普通6码场';
      default:
        return '红中麻将';
    }
  }
  if (activeGameType.value === 'yansan') {
    if (activeYansanScene.value === 'yansan-20-40') return '经典烟三 · 20--40分场';
    if (activeYansanScene.value === 'yansan-10-20') return '经典烟三 · 10--20分场';
    return '经典烟三 · 5--10分场';
  }
  return activeModuleInfo.value?.name || '对局场';
});

const currentSceneMaxPlayers = computed(() => {
  if (activeGameType.value === 'shisanshui') {
    if (activeShisanshuiScene.value === 'eight-realtime' || activeShisanshuiScene.value === 'eight-booking') {
      return 8;
    }
  }
  return 4;
});

const currentSceneBaseStake = computed(() => {
  if (activeGameType.value === 'mahjong') return 100;
  if (activeGameType.value === 'shisanshui') {
    return (activeShisanshuiScene.value === 'eight-realtime' || activeShisanshuiScene.value === 'eight-booking') ? 500 : 200;
  }
  if (activeGameType.value === 'yansan') {
    if (activeYansanScene.value === 'yansan-20-40') return 40;
    if (activeYansanScene.value === 'yansan-10-20') return 20;
    return 10;
  }
  return 100;
});

// Danmaku and Flying Props (默认关闭弹幕，保持界面清爽)
const danmakuEnabled = ref(false);
const danmakuItems = reactive<{ id: string; sender: string; avatar: string; text: string; prop?: string; color: string; top: number; duration: number }[]>([]);
const activeFlyingProps = reactive<{ id: string; icon: string; impactIcon?: string; sender: string; targetName: string; startX: number; startY: number; targetX: number; targetY: number; stage: 'flying' | 'impact' }[]>([]);
const quickBarInput = ref('');
const activeChatTab = ref<'phrases' | 'props' | 'emojis' | 'history'>('phrases');

// Category tabs for compact lobby
const activeCategoryTab = ref<'all' | 'racing' | 'strategy'>('all');
const filteredGameModules = computed(() => {
  if (activeCategoryTab.value === 'racing') {
    return GAME_MODULES.filter((g) => g.id === 'yansan');
  }
  if (activeCategoryTab.value === 'strategy') {
    return GAME_MODULES.filter((g) => g.id === 'shisanshui' || g.id === 'mahjong');
  }
  return GAME_MODULES;
});

// Rotated 90 degrees landscape mode (default true: 全界面旋转90度横屏模式，包括大厅)
const isRotated90 = ref(true);
const showChatDrawer = ref(false);

const showAuthModal = ref(false);
const showPointsModal = ref(false);
const showProfileModal = ref(false);
const showAchievementModal = ref(false);
const showCreateModal = ref(false);
const showMahjongSceneModal = ref(false);
const showTermuxModal = ref(false);
const showApkModal = ref(false);
const showInsufficientModal = ref(false);
const insufficientModalData = reactive({
  gameType: 'mahjong' as GameType,
  sceneMode: 'hongzhong-6',
  sceneName: '红中麻将 · 六码',
  requiredCoins: 100,
  currentCoins: 0,
});
const fxRef = ref<any>(null);
const show3DFxPanel = ref(false);

const FX_SHOWCASE_LIST = [
  { id: 'rocket', name: '至尊王炸升空', icon: '🚀', desc: '升空火箭与天崩地裂超新星' },
  { id: 'bomb', name: '轰天炸弹震屏', icon: '💣', desc: '全屏强震冲击波与炸药星火' },
  { id: 'airplane', name: '超音速飞机呼啸', icon: '✈️', desc: '3D 双翼喷气双尾迹破空' },
  { id: 'dragon', name: '青龙连环顺子', icon: '🐲', desc: '金光龙影斩光波破竹而过' },
  { id: 'stamp_red', name: '朱砂天胡神印', icon: '🀄', desc: '金石下坠震屏朱砂大印' },
  { id: 'stamp_green', name: '翡翠雀王暗杠', icon: '🀄', desc: '绿玉回弹碎屑冲击印章' },
  { id: 'dice', name: '3D 物理翻滚骰子', icon: '🎲', desc: '立体双骰抛掷物理弹跳' },
  { id: 'gunshot', name: '绝杀精准打枪', icon: '🔫', desc: '十三水瞄准锁定弹道碎屏' },
  { id: 'coins', name: '金币金元宝暴雨', icon: '🪙', desc: '重力回弹闪耀金币瀑布' },
];

function triggerShowcaseFx(id: string) {
  if (!fxRef.value) return;
  if (id === 'rocket') {
    fxRef.value.triggerRocket('至尊王炸', '天崩地裂 · 积分翻倍');
  } else if (id === 'bomb') {
    fxRef.value.triggerBomb('轰天炸弹', '牌局激斗 · 筹码翻倍');
  } else if (id === 'airplane') {
    fxRef.value.triggerAirplane('飞机带翅膀 · 呼啸而过');
  } else if (id === 'dragon') {
    fxRef.value.triggerDragon('势如破竹', '连环顺子 · 一气呵成');
  } else if (id === 'stamp_red') {
    fxRef.value.triggerStamp('胡', '自摸和牌大捷', 'red');
  } else if (id === 'stamp_green') {
    fxRef.value.triggerStamp('杠', '暗杠开花 · 补牌入座', 'green');
  } else if (id === 'dice') {
    fxRef.value.triggerDice(Math.floor(1 + Math.random() * 6), Math.floor(1 + Math.random() * 6));
  } else if (id === 'gunshot') {
    fxRef.value.triggerGunshot(50, 45, '💥 绝杀打枪 +6水');
  } else if (id === 'coins') {
    fxRef.value.triggerCoins(50);
  } else if (id === 'grandslam') {
    fxRef.value.triggerGrandSlam();
  }
}

function onGameFx(type: string, payload?: any) {
  if (!fxRef.value) return;
  if (type === 'rocket') {
    fxRef.value.triggerRocket('至尊王炸', '天崩地裂 · 积分翻倍');
  } else if (type === 'bomb') {
    fxRef.value.triggerBomb('轰天炸弹', '牌局激斗 · 筹码加倍');
  } else if (type === 'airplane') {
    fxRef.value.triggerAirplane('飞机带翅膀 · 呼啸而过');
  } else if (type === 'straight') {
    fxRef.value.triggerDragon('势如破竹', '连环顺子 · 一气呵成');
  } else if (type === 'dice') {
    fxRef.value.triggerDice(Math.floor(1 + Math.random() * 6), Math.floor(1 + Math.random() * 6));
  } else if (type === 'peng') {
    fxRef.value.triggerStamp('碰', '雀圣亮刻', 'green');
  } else if (type === 'gang') {
    fxRef.value.triggerStamp('杠', '暗杠开花', 'green');
  } else if (type === 'hu') {
    fxRef.value.triggerStamp('胡', '国标自摸和牌', 'red');
    fxRef.value.triggerCoins(35);
  } else if (type === 'gunshot') {
    fxRef.value.triggerGunshot(50, 40, '💥 绝杀打枪 +3水');
  } else if (type === 'grandslam') {
    fxRef.value.triggerGrandSlam();
  } else if (type === 'win') {
    fxRef.value.triggerCoins(45);
  }
}

const userProfile = reactive<UserProfile>(loadLocalProfile());
const matchRecords = reactive<MatchRecord[]>(loadLocalRecords());
const currentTheme = ref<TableTheme>(getGameTheme('yansan'));
const soundOn = ref(true);

const rooms = ref<any[]>([]);
const chatInput = ref('');
const floatingProps = reactive<{ id: string; sender: string; icon: string; x: number; y: number }[]>([]);
const activeSpeechBubble = ref('');
let speechTimer: any = null;

const newRoomTitle = ref('');
const newRoomGame = ref<GameType>('yansan');

// WebSocket and Packet Tracking for Termux diagnostic
const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true);
const wsConnected = ref(false);
const wsRtt = ref(15);
const packetLogs = reactive<{ id: string; dir: 'IN' | 'OUT'; summary: string; ts: string }[]>([]);

let ws: WebSocket | null = null;
let pingInterval: any = null;
let sessionCheckInterval: any = null;

function addPacketLog(dir: 'IN' | 'OUT', summary: string) {
  const ts = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  packetLogs.unshift({ id: `${Date.now()}-${Math.random()}`, dir, summary, ts });
  if (packetLogs.length > 20) packetLogs.pop();
}

const activeModuleInfo = computed(() => {
  return GAME_MODULES.find((g) => g.id === activeGameType.value) || GAME_MODULES[0];
});

const activeRoom = computed(() => {
  return rooms.value.find((r) => r.id === activeRoomId.value) || rooms.value.find((r) => r.gameType === activeGameType.value) || rooms.value[0] || null;
});

const activeChatList = computed(() => {
  return activeRoom.value?.chat || [
    { id: 'def_1', sender: '系统司仪', text: '欢迎入席！横屏对弈视野更辽阔。', timestamp: '10:00' },
  ];
});

function getGameName(gt: GameType) {
  return GAME_MODULES.find((g) => g.id === gt)?.name || gt;
}

function scrollToTermux() {
  const el = document.getElementById('termux-section');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
    soundFX.playTap();
  }
}

function enterGame(gt: GameType) {
  if (!userProfile.isLoggedIn) {
    showAuthModal.value = true;
    soundFX.playTap();
    return;
  }
  if (gt === 'mahjong') {
    currentView.value = 'mahjong-scenes';
    soundFX.playTap();
    return;
  }
  if (gt === 'shisanshui') {
    currentView.value = 'shisanshui-scenes';
    soundFX.playTap();
    return;
  }
  if (gt === 'yansan') {
    currentView.value = 'yansan-scenes';
    soundFX.playTap();
    return;
  }
  activeGameType.value = gt;
  currentTheme.value = getGameTheme(gt);
  currentWaitingRoomPlayers.value = [];
  currentView.value = 'waiting-room';
  soundFX.playTap();
}

function getSceneRequiredCoins(gt: GameType, sceneMode: string): number {
  if (gt === 'mahjong') return 100;
  if (gt === 'shisanshui') {
    if (sceneMode === 'eight-realtime' || sceneMode === 'eight-booking') return 500;
    return 200;
  }
  if (gt === 'yansan') {
    if (sceneMode === 'yansan-20-40') return 40;
    if (sceneMode === 'yansan-10-20') return 20;
    return 10;
  }
  return 100;
}

function getSceneDisplayName(gt: GameType, sceneMode: string): string {
  if (gt === 'mahjong') {
    if (sceneMode === 'hongzhong-6') return '红中6码场';
    if (sceneMode === 'hongzhong-10') return '红中10码场';
    if (sceneMode === 'standard-10') return '普通10码场';
    return '普通6码场';
  }
  if (gt === 'shisanshui') {
    if (sceneMode === 'eight-realtime') return '八人实时场';
    if (sceneMode === 'eight-booking') return '八人预约场';
    if (sceneMode === 'four-booking') return '四人预约场';
    return '四人实时场';
  }
  if (gt === 'yansan') {
    if (sceneMode === 'yansan-20-40') return '经典烟三 · 20--40分场';
    if (sceneMode === 'yansan-10-20') return '经典烟三 · 10--20分场';
    return '经典烟三 · 5--10分场';
  }
  return '棋牌对决场';
}

function promptInsufficientCoins(gt: GameType, sceneMode: string, required: number) {
  soundFX.playTap();
  insufficientModalData.gameType = gt;
  insufficientModalData.sceneMode = sceneMode;
  insufficientModalData.sceneName = getSceneDisplayName(gt, sceneMode);
  insufficientModalData.requiredCoins = required;
  insufficientModalData.currentCoins = userProfile.coins;
  showInsufficientModal.value = true;
}

function handleEnterPracticeFromModal() {
  showInsufficientModal.value = false;
  startPracticeGame(insufficientModalData.gameType, insufficientModalData.sceneMode);
}

function handleOpenPointsFromModal() {
  showInsufficientModal.value = false;
  openPointsModal();
}

function startPracticeGame(gt: GameType, sceneMode: string) {
  isPracticeMode.value = true;
  activeGameType.value = gt;
  activeSceneMode.value = sceneMode;
  if (gt === 'mahjong') activeMahjongScene.value = sceneMode as any;
  if (gt === 'shisanshui') activeShisanshuiScene.value = sceneMode as any;
  if (gt === 'yansan') activeYansanScene.value = sceneMode as any;
  currentTheme.value = getGameTheme(gt);

  const maxPlayers = (gt === 'shisanshui' && (sceneMode === 'eight-realtime' || sceneMode === 'eight-booking')) ? 8 : 4;

  const names = [
    '岭南雀神', '濠江巧手', '九龙少侠', '秦淮雅客',
    '风雷快刀', '白鹭居士', '云梦渔樵', '天元棋客'
  ];
  const avatars = ['🤠', '🥷', '🧝', '🧙', '🤴', '👸', '🧔', '🧑‍🎨'];

  const players: ScenePlayer[] = [
    {
      id: userProfile.id || 'P-me',
      name: `${userProfile.name || '您'}(试玩)`,
      avatar: userProfile.avatar || '👤',
      rating: userProfile.rating || 1800,
      coins: userProfile.coins,
      seat: 0,
      isSimulated: true,
    }
  ];

  for (let i = 1; i < maxPlayers; i++) {
    players.push({
      id: `sim-${Date.now()}-${i}`,
      name: `${names[i % names.length]}_${Math.floor(10 + Math.random() * 90)}`,
      avatar: avatars[i % avatars.length],
      rating: Math.floor(1800 + Math.random() * 300),
      coins: Math.floor(2000 + Math.random() * 3000),
      seat: i,
      isSimulated: true,
    });
  }

  currentWaitingRoomPlayers.value = players;
  const match = rooms.value.find((r) => r.gameType === gt);
  if (match) activeRoomId.value = match.id;
  currentView.value = 'arena';
  soundFX.playVictory();
}

function onSelectMahjongScene(mode: MahjongSceneMode) {
  if (!userProfile.isLoggedIn) {
    showAuthModal.value = true;
    soundFX.playTap();
    return;
  }
  const reqCoins = getSceneRequiredCoins('mahjong', mode);
  if (userProfile.coins < reqCoins) {
    promptInsufficientCoins('mahjong', mode, reqCoins);
    return;
  }
  isPracticeMode.value = false;
  activeMahjongScene.value = mode;
  activeSceneMode.value = mode;
  activeGameType.value = 'mahjong';
  currentTheme.value = getGameTheme('mahjong');
  showChatDrawer.value = false;
  currentWaitingRoomPlayers.value = [];
  currentView.value = 'waiting-room';
  soundFX.playTap();
}

function onSelectShisanshuiScene(mode: ShisanshuiSceneMode) {
  if (!userProfile.isLoggedIn) {
    showAuthModal.value = true;
    soundFX.playTap();
    return;
  }
  const reqCoins = getSceneRequiredCoins('shisanshui', mode);
  if (userProfile.coins < reqCoins) {
    promptInsufficientCoins('shisanshui', mode, reqCoins);
    return;
  }
  isPracticeMode.value = false;
  activeShisanshuiScene.value = mode;
  activeSceneMode.value = mode;
  activeGameType.value = 'shisanshui';
  currentTheme.value = getGameTheme('shisanshui');
  showChatDrawer.value = false;
  currentWaitingRoomPlayers.value = [];
  currentView.value = 'waiting-room';
  soundFX.playTap();
}

function onSelectYansanScene(mode: YansanSceneMode) {
  if (!userProfile.isLoggedIn) {
    showAuthModal.value = true;
    soundFX.playTap();
    return;
  }
  const reqCoins = getSceneRequiredCoins('yansan', mode);
  if (userProfile.coins < reqCoins) {
    promptInsufficientCoins('yansan', mode, reqCoins);
    return;
  }
  isPracticeMode.value = false;
  activeYansanScene.value = mode;
  activeSceneMode.value = mode;
  activeGameType.value = 'yansan';
  currentTheme.value = getGameTheme('yansan');
  showChatDrawer.value = false;
  currentWaitingRoomPlayers.value = [];
  currentView.value = 'waiting-room';
  soundFX.playTap();
}

function onChangeSceneFromWaitingRoom() {
  if (activeGameType.value === 'mahjong') currentView.value = 'mahjong-scenes';
  else if (activeGameType.value === 'shisanshui') currentView.value = 'shisanshui-scenes';
  else currentView.value = 'yansan-scenes';
  soundFX.playTap();
}

function onFullSeatGameStart(players: ScenePlayer[]) {
  currentWaitingRoomPlayers.value = players;
  isPracticeMode.value = players.some((p) => Boolean(p.isSimulated));
  const match = rooms.value.find((r) => r.gameType === activeGameType.value);
  if (match) activeRoomId.value = match.id;
  currentView.value = 'arena';
  soundFX.playVictory();
}

function enterRoom(r: any) {
  if (!userProfile.isLoggedIn) {
    showAuthModal.value = true;
    soundFX.playTap();
    return;
  }
  const reqCoins = getSceneRequiredCoins(r.gameType, 'standard');
  if (userProfile.coins < reqCoins) {
    promptInsufficientCoins(r.gameType, 'standard', reqCoins);
    return;
  }
  isPracticeMode.value = false;
  activeRoomId.value = r.id;
  activeGameType.value = r.gameType;
  currentTheme.value = getGameTheme(r.gameType);
  showChatDrawer.value = false;
  currentView.value = 'arena';
  soundFX.playTap();
}

function switchGame(gt: GameType) {
  activeGameType.value = gt;
  currentTheme.value = getGameTheme(gt);
  const match = rooms.value.find((r) => r.gameType === gt);
  if (match) activeRoomId.value = match.id;
  soundFX.playTap();
}

function toggleRotation() {
  isRotated90.value = !isRotated90.value;
  try {
    localStorage.setItem('app_screen_rotated_90', String(isRotated90.value));
  } catch {}
  soundFX.playTap();
}

function toggleFullscreen() {
  soundFX.playTap();
  try {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  } catch {}
}

function returnToLobby() {
  currentView.value = 'lobby';
  showChatDrawer.value = false;
  isPracticeMode.value = false;
  currentWaitingRoomPlayers.value = [];
  soundFX.playTap();
}

function connectWs() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${proto}//${location.host}/ws`);

  ws.onopen = () => {
    wsConnected.value = true;
    addPacketLog('OUT', 'WS_HANDSHAKE_INIT');
    sendPing();
    if (activeRoom.value && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'room_reconnect',
        roomId: activeRoom.value.id,
        playerId: userProfile.id || 'P-me',
        playerName: userProfile.name,
      }));
      addPacketLog('OUT', `RECONNECT_SYNC: ${activeRoom.value.id}`);
    }
  };

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'pong') {
        wsRtt.value = Math.max(1, Date.now() - (msg.clientTs || Date.now()));
        addPacketLog('IN', `PONG (rtt: ${wsRtt.value}ms)`);
        return;
      }

      addPacketLog('IN', `EV_${msg.type}`);

      if (msg.type === 'lobby_snapshot') {
        rooms.value = msg.rooms || [];
      } else if (msg.type === 'room_created') {
        rooms.value = msg.rooms || [];
        activeRoomId.value = msg.room.id;
        activeGameType.value = msg.room.gameType;
        currentTheme.value = getGameTheme(msg.room.gameType);
      } else if (msg.type === 'reconnect_ack') {
        if (msg.room) {
          const idx = rooms.value.findIndex((r) => r.id === msg.room.id);
          if (idx !== -1) {
            rooms.value[idx] = msg.room;
          } else {
            rooms.value.push(msg.room);
          }
          if (msg.boardState && activeRoom.value) {
            activeRoom.value.boardState = msg.boardState;
          }
        }
      } else if (msg.type === 'game_event') {
        if (msg.boardState && activeRoom.value && activeRoom.value.id === msg.roomId) {
          activeRoom.value.boardState = msg.boardState;
        }
      } else if (msg.type === 'chat_broadcast') {
        if (activeRoom.value) {
          activeRoom.value.chat.push(msg.message);
        }
        if (msg.message.voice && msg.message.text) {
          soundFX.speakVoice(msg.message.text);
        }
        if (msg.message.prop) {
          if (msg.message.targetSeat !== undefined && msg.message.targetSeat !== null) {
            // Parabolic prop flight from remote user
            const targetSeatInfo = AVAILABLE_TARGET_SEATS.find((s) => s.seat === msg.message.targetSeat) || AVAILABLE_TARGET_SEATS[0];
            const id = `fp-${Date.now()}-${Math.random()}`;
            const fp = {
              id,
              icon: msg.message.prop,
              impactIcon: '💥',
              sender: msg.message.sender,
              targetName: targetSeatInfo.name,
              startX: 50,
              startY: 20,
              targetX: targetSeatInfo.x,
              targetY: targetSeatInfo.y,
              stage: 'flying' as const,
            };
            activeFlyingProps.push(fp);
            setTimeout(() => {
              fp.stage = 'impact';
              if (msg.message.prop === '💣') soundFX.playBombExplosion(false);
              else if (msg.message.prop === '🍺' || msg.message.prop === '🍵') soundFX.playClink();
              else if (msg.message.prop === '💐') soundFX.playFlower();
              else if (msg.message.prop === '👏') soundFX.playVictory();
              else if (msg.message.prop === '👑') soundFX.playCoinShower();
              else if (msg.message.prop === '🍅' || msg.message.prop === '🩴') soundFX.playSplat();
              else soundFX.playTap();
              setTimeout(() => {
                const idx = activeFlyingProps.findIndex((p) => p.id === id);
                if (idx !== -1) activeFlyingProps.splice(idx, 1);
              }, 1200);
            }, 750);
          } else {
            triggerFloatingProp(msg.message.sender, msg.message.prop);
          }
        }
        addDanmaku(msg.message.sender, msg.message.avatar || '👤', msg.message.text, msg.message.prop);
        triggerSpeechBubble(`${msg.message.sender}: ${msg.message.text}`);
      } else if (msg.type === 'user_coins_updated') {
        const cleanUserPhone = String(userProfile.phone || '').trim().replace(/\D/g, '');
        const cleanMsgPhone = String(msg.phone || '').trim().replace(/\D/g, '');
        const isMatch = (msg.userId && msg.userId === userProfile.id) ||
                        (cleanUserPhone && cleanMsgPhone && cleanUserPhone === cleanMsgPhone) ||
                        (msg.username && msg.username === userProfile.username);
        if (isMatch) {
          const delta = typeof msg.delta === 'number' ? msg.delta : (msg.coins - userProfile.coins);
          userProfile.coins = msg.coins;
          if (msg.rating) userProfile.rating = msg.rating;
          if (msg.level) userProfile.level = msg.level;
          saveLocalProfile(userProfile);
          recordPointsTx(
            delta >= 0 ? 'admin_grant' : 'admin_deduct',
            `钱庄系统/Bot筹码调配 (${delta >= 0 ? '+' : ''}${delta})`,
            delta,
            userProfile.coins
          );
          soundFX.playCoinShower();
          triggerSpeechBubble(`🪙 钱庄筹码已更新为 ${msg.coins.toLocaleString()} 分 (${delta >= 0 ? '+' : ''}${delta})`);
        }
      } else if (msg.type === 'all_users_coins_updated') {
        fetchFreshProfile();
        soundFX.playCoinShower();
      }
    } catch {}
  };

  ws.onclose = () => {
    wsConnected.value = false;
    addPacketLog('IN', 'WS_DISCONNECTED');
    setTimeout(connectWs, 3000);
  };
}

function sendPing() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ping', clientTs: Date.now() }));
    addPacketLog('OUT', 'PING');
  }
}

function addDanmaku(sender: string, avatar: string, text: string, prop?: string) {
  if (!danmakuEnabled.value) return;
  const colors = ['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#A855F7', '#F97316'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const top = Math.floor(12 + Math.random() * 68);
  const duration = 6.5 + Math.random() * 4;
  const dm = {
    id: `dm-${Date.now()}-${Math.random()}`,
    sender,
    avatar: avatar || '🏮',
    text,
    prop,
    color,
    top,
    duration,
  };
  danmakuItems.push(dm);
  setTimeout(() => {
    const idx = danmakuItems.findIndex((d) => d.id === dm.id);
    if (idx !== -1) danmakuItems.splice(idx, 1);
  }, duration * 1000 + 400);
}

function triggerFloatingProp(sender: string, icon: string) {
  const id = `${Date.now()}-${Math.random()}`;
  const x = Math.floor(20 + Math.random() * 55);
  const y = Math.floor(25 + Math.random() * 40);
  floatingProps.push({ id, sender, icon, x, y });
  setTimeout(() => {
    const idx = floatingProps.findIndex((p) => p.id === id);
    if (idx !== -1) floatingProps.splice(idx, 1);
  }, 2600);
}

function triggerSpeechBubble(text: string) {
  activeSpeechBubble.value = text;
  if (speechTimer) clearTimeout(speechTimer);
  speechTimer = setTimeout(() => {
    activeSpeechBubble.value = '';
  }, 3500);
}

function sendChat() {
  if (!chatInput.value.trim() || !activeRoom.value) return;
  const text = chatInput.value.trim();
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'game_chat',
      roomId: activeRoom.value.id,
      sender: userProfile.name,
      avatar: userProfile.avatar,
      text,
    }));
    addPacketLog('OUT', `CHAT: ${text.slice(0, 15)}`);
  }
  addDanmaku(userProfile.name, userProfile.avatar, text);
  triggerSpeechBubble(`${userProfile.name}: ${text}`);
  chatInput.value = '';
}

function sendQuickBarChat() {
  if (!quickBarInput.value.trim() || !activeRoom.value) return;
  const text = quickBarInput.value.trim();
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'game_chat',
      roomId: activeRoom.value.id,
      sender: userProfile.name,
      avatar: userProfile.avatar,
      text,
    }));
    addPacketLog('OUT', `CHAT: ${text.slice(0, 15)}`);
  }
  addDanmaku(userProfile.name, userProfile.avatar, text);
  triggerSpeechBubble(`${userProfile.name}: ${text}`);
  quickBarInput.value = '';
}

function sendQuickPhrase(phrase: string) {
  if (!activeRoom.value) return;
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'game_chat',
      roomId: activeRoom.value.id,
      sender: userProfile.name,
      avatar: userProfile.avatar,
      text: phrase,
      voice: true,
    }));
    addPacketLog('OUT', `PHRASE: ${phrase.slice(0, 10)}`);
  }
  soundFX.speakVoice(phrase);
  addDanmaku(userProfile.name, userProfile.avatar, phrase);
  triggerSpeechBubble(`${userProfile.name}: ${phrase}`);
  soundFX.playTap();
}

function sendCategorizedPhrase(phrase: string) {
  sendQuickPhrase(phrase);
}

function sendEmojiSticker(em: string) {
  if (!activeRoom.value) return;
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'game_chat',
      roomId: activeRoom.value.id,
      sender: userProfile.name,
      avatar: userProfile.avatar,
      text: em,
      prop: em,
    }));
    addPacketLog('OUT', `EMOJI: ${em}`);
  }
  soundFX.playTap();
  addDanmaku(userProfile.name, userProfile.avatar, em, em);
  triggerSpeechBubble(`${userProfile.name}: ${em}`);
}

function sendProp(prop: { name: string; icon: string; impactIcon?: string }) {
  sendPropWithTarget(prop, selectedTargetSeat.value);
}

function sendPropWithTarget(prop: { name: string; icon: string; impactIcon?: string }, targetSeatNum?: number) {
  const targetSeat = targetSeatNum !== undefined ? targetSeatNum : selectedTargetSeat.value;
  const targetSeatInfo = AVAILABLE_TARGET_SEATS.find((s) => s.seat === targetSeat) || AVAILABLE_TARGET_SEATS[0];

  const id = `prop-${Date.now()}-${Math.random()}`;
  const flyingProp = {
    id,
    icon: prop.icon,
    impactIcon: prop.impactIcon || '💥',
    sender: userProfile.name,
    targetName: targetSeatInfo.name,
    startX: 50,
    startY: 85,
    targetX: targetSeatInfo.x,
    targetY: targetSeatInfo.y,
    stage: 'flying' as const,
  };

  activeFlyingProps.push(flyingProp);
  soundFX.playCardSnap(false);

  setTimeout(() => {
    flyingProp.stage = 'impact';
    if (prop.icon === '💣') soundFX.playBombExplosion(false);
    else if (prop.icon === '🍺' || prop.icon === '🍵') soundFX.playClink();
    else if (prop.icon === '💐') soundFX.playFlower();
    else if (prop.icon === '👏') soundFX.playVictory();
    else if (prop.icon === '👑') soundFX.playCoinShower();
    else if (prop.icon === '🍅' || prop.icon === '🩴') soundFX.playSplat();
    else soundFX.playTap();

    setTimeout(() => {
      const idx = activeFlyingProps.findIndex((p) => p.id === id);
      if (idx !== -1) activeFlyingProps.splice(idx, 1);
    }, 1200);
  }, 750);

  if (ws && ws.readyState === WebSocket.OPEN && activeRoom.value) {
    ws.send(
      JSON.stringify({
        type: 'game_chat',
        roomId: activeRoom.value.id,
        sender: userProfile.name,
        avatar: userProfile.avatar,
        text: `向【${targetSeatInfo.name}】投掷了 ${prop.name}`,
        prop: prop.icon,
        targetSeat,
      })
    );
    addPacketLog('OUT', `PROP: ${prop.name} -> seat ${targetSeat}`);
  }

  addDanmaku(userProfile.name, userProfile.avatar, `掷向 ${targetSeatInfo.name}【${prop.name}】`, prop.icon);
  triggerSpeechBubble(`${userProfile.name} 掷出 ${prop.icon}`);
}

function createRoomSubmit() {
  if (!userProfile.isLoggedIn) {
    showAuthModal.value = true;
    soundFX.playTap();
    return;
  }
  const reqCoins = getSceneRequiredCoins(newRoomGame.value, 'standard');
  if (userProfile.coins < reqCoins) {
    showCreateModal.value = false;
    promptInsufficientCoins(newRoomGame.value, 'standard', reqCoins);
    return;
  }
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'room_create',
      title: newRoomTitle.value.trim() || `${userProfile.name}的雅座`,
      gameType: newRoomGame.value,
      playerName: userProfile.name,
    }));
    addPacketLog('OUT', `ROOM_CREATE: ${newRoomGame.value}`);
  }
  activeGameType.value = newRoomGame.value;
  currentTheme.value = getGameTheme(newRoomGame.value);
  showCreateModal.value = false;
  newRoomTitle.value = '';
  currentView.value = 'arena';
}

function onGameMove(payload: any) {
  if (ws && ws.readyState === WebSocket.OPEN && activeRoom.value) {
    ws.send(JSON.stringify({
      type: 'game_move',
      roomId: activeRoom.value.id,
      seat: 0,
      payload,
    }));
    addPacketLog('OUT', `MOVE: seat 0`);
  }

  // Handle outcome
  if (payload && payload.winner !== undefined && payload.winner !== null) {
    const isWin = payload.winner === 0;
    const isTie = payload.winner === -1 || (typeof payload.pointsDelta === 'number' && payload.pointsDelta === 0);
    let coinsDelta = isWin ? 600 : (isTie ? 0 : -300);
    let ratingDelta = isWin ? 25 : (isTie ? 0 : -15);
    let detailText = isWin ? '克敌获胜结算' : (isTie ? '势均力敌打和' : '对局失利结算');

    let scorePoints = 0;

    if (activeGameType.value === 'yansan') {
      if (typeof payload.pointsDelta === 'number') {
        const pts = payload.pointsDelta;
        scorePoints = pts;
        coinsDelta = pts * 30;
        ratingDelta = Math.round(pts * 0.8);
        detailText = payload.detailText || (isTie ? '烟三势均力敌 · 本局打和' : (isWin ? '烟三先手出清大捷' : '烟三对局失利'));
      } else {
        scorePoints = isWin ? 10 : (isTie ? 0 : -10);
        coinsDelta = isWin ? 450 : (isTie ? 0 : -200);
        ratingDelta = isWin ? 20 : (isTie ? 0 : -12);
        detailText = isWin ? '烟三先手出清大捷' : (isTie ? '烟三势均力敌 · 本局打和' : '烟三对局失利');
      }
    } else if (activeGameType.value === 'shisanshui' && typeof payload.score === 'number') {
      const netWater = payload.score;
      scorePoints = netWater;
      coinsDelta = netWater * 50;
      ratingDelta = Math.round(netWater * 2.5);
      detailText = netWater >= 0 ? `十三水比水大捷 · 净胜 ${netWater} 水` : `十三水比水告负 · 净输 ${Math.abs(netWater)} 水`;
    } else if (activeGameType.value === 'mahjong') {
      scorePoints = typeof payload.rewardCoins === 'number'
        ? payload.rewardCoins
        : (isWin ? (payload.payoutPerOpponent ? payload.payoutPerOpponent * 3 : 70) : -(payload.payoutPerOpponent || 30));
      coinsDelta = typeof payload.rewardCoins === 'number' ? payload.rewardCoins : (isWin ? 300 : -150);
      ratingDelta = isWin ? 20 : -10;
      detailText = payload.detail || (isWin ? '麻将自摸和牌' : '对手率先自摸和出');
    }

    if (scorePoints === 0 && !isTie) {
      scorePoints = isWin ? 10 : -10;
    }

    // 专属输赢分语音播报（仅玩家本地设备能够听到，试玩演练模式也播报给玩家提供完整局内反馈）
    soundFX.speakScoreResult(scorePoints, isWin, isTie);

    // 【重大业务风控】：人机补位试玩模式 (Practice Mode)，积分纯属模拟演练，严禁写入真实玩家真实账户与排行榜！
    if (isPracticeMode.value) {
      console.info('[人机补位试玩模式] 牌局演练结束，胜负积分仅供模拟演练体验，未写入真实玩家资产：', {
        simCoinsDelta: coinsDelta,
        scorePoints,
        gameType: activeGameType.value,
      });
      return;
    }

    userProfile.coins = Math.max(0, userProfile.coins + coinsDelta);
    userProfile.rating = Math.max(1000, userProfile.rating + ratingDelta);
    userProfile.level = Math.max(1, Math.min(10, Math.floor(userProfile.rating / 500)));

    if (!userProfile.stats[activeGameType.value]) {
      userProfile.stats[activeGameType.value] = { played: 0, won: 0, highestScore: 0 };
    }
    const stat = userProfile.stats[activeGameType.value]!;
    stat.played += 1;
    if (isWin) {
      stat.won += 1;
      stat.highestScore = Math.max(stat.highestScore, Math.abs(coinsDelta));
    }

    recordPointsTx(
      coinsDelta >= 0 ? 'game_win' : 'game_loss',
      `${getGameName(activeGameType.value)}对局结算`,
      coinsDelta,
      userProfile.coins
    );

    const rec: MatchRecord = {
      id: `REC-${Date.now()}`,
      gameType: activeGameType.value,
      gameName: getGameName(activeGameType.value),
      result: isWin ? 'win' : (isTie ? 'draw' : 'lose'),
      coinsDelta,
      ratingDelta,
      details: detailText,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    };

    matchRecords.unshift(rec);
    if (matchRecords.length > 50) matchRecords.pop();
    saveLocalProfile(userProfile);
    saveLocalRecords(matchRecords);
    syncAndCheckProfile();
  }
}

async function syncAndCheckProfile() {
  const res = await syncWithServer(userProfile, matchRecords);
  if (res && res.notFound) {
    const guest = resetToDefaultGuestProfile();
    Object.assign(userProfile, guest);
    showAuthModal.value = true;
  }
}

async function fetchFreshProfile() {
  if (userProfile.isLoggedIn && userProfile.id && userProfile.sessionToken) {
    try {
      const res = await fetch('/api/auth/check-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userProfile.id, sessionToken: userProfile.sessionToken }),
      });
      const data = await res.json();
      if (data.success && data.sessionExpired) {
        const guest = resetToDefaultGuestProfile();
        Object.assign(userProfile, guest);
        showAuthModal.value = true;
        soundFX.playTap();
      } else if (data.success && typeof data.coins === 'number' && data.coins !== userProfile.coins) {
        const diff = data.coins - userProfile.coins;
        userProfile.coins = data.coins;
        if (data.rating) userProfile.rating = data.rating;
        if (data.level) userProfile.level = data.level;
        saveLocalProfile(userProfile);
        recordPointsTx(
          diff >= 0 ? 'admin_grant' : 'admin_deduct',
          `钱庄同步筹码 (${diff >= 0 ? '+' : ''}${diff})`,
          diff,
          userProfile.coins
        );
      }
    } catch {}
  }
}

function openPointsModal() {
  showPointsModal.value = true;
  soundFX.playTap();
  fetchFreshProfile();
}

function onGameRestart() {
  soundFX.playTap();
}

function onUpdateProfile(p: UserProfile) {
  Object.assign(userProfile, p);
  saveLocalProfile(userProfile);
  syncAndCheckProfile();
}

function onUpdateRecords(r: MatchRecord[]) {
  matchRecords.splice(0, matchRecords.length, ...r);
  saveLocalRecords(matchRecords);
  syncAndCheckProfile();
}

function onClaimAchievement(reward: number) {
  userProfile.coins += reward;
  recordPointsTx('admin_grant', '雀神成就奖励领取', reward, userProfile.coins);
  saveLocalProfile(userProfile);
  syncAndCheckProfile();
}

function onThemeChange(th: TableTheme) {
  currentTheme.value = th;
  soundFX.playTap();
}

function toggleSound() {
  soundOn.value = !soundOn.value;
  soundFX.enabled = soundOn.value;
  if (soundOn.value) soundFX.playTap();
}

function onVisibilityChange() {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      connectWs();
    } else if (activeRoom.value) {
      ws.send(JSON.stringify({
        type: 'room_reconnect',
        roomId: activeRoom.value.id,
        playerId: userProfile.id || 'P-me',
        playerName: userProfile.name,
      }));
      addPacketLog('OUT', `WAKE_SYNC: ${activeRoom.value.id}`);
    }
  }
}

onMounted(() => {
  try {
    const savedRot = localStorage.getItem('app_screen_rotated_90');
    if (savedRot !== null) {
      isRotated90.value = savedRot === 'true';
    } else {
      isRotated90.value = true; // 默认横屏对战
    }
    if (typeof window !== 'undefined' && 'screen' in window && 'orientation' in window.screen) {
      (window.screen.orientation as any).lock?.('landscape').catch(() => {});
    }
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const autoGame = urlParams.get('auto_game') as GameType | null;
      const autoScene = urlParams.get('auto_scene');
      if (autoGame && autoScene) {
        activeGameType.value = autoGame;
        activeSceneMode.value = autoScene;
        if (autoGame === 'mahjong') activeMahjongScene.value = autoScene as any;
        if (autoGame === 'shisanshui') activeShisanshuiScene.value = autoScene as any;
        if (autoGame === 'yansan') activeYansanScene.value = autoScene as any;
        currentTheme.value = getGameTheme(autoGame);
        currentWaitingRoomPlayers.value = [];
        currentView.value = 'waiting-room';
      }
    }
  } catch {}
  connectWs();
  pingInterval = setInterval(sendPing, 10000);
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => { isOnline.value = true; connectWs(); });
    window.addEventListener('offline', () => { isOnline.value = false; });
  }

  // Immediate check & balance refresh on initial mount
  fetchFreshProfile();
  sessionCheckInterval = setInterval(fetchFreshProfile, 20000);
});

onBeforeUnmount(() => {
  if (pingInterval) clearInterval(pingInterval);
  if (sessionCheckInterval) clearInterval(sessionCheckInterval);
  if (speechTimer) clearTimeout(speechTimer);
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisibilityChange);
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('online', () => {});
    window.removeEventListener('offline', () => {});
  }
  ws?.close();
});
</script>

<style scoped>
/* Rotated 90-degree Master Landscape Container (全界面包括大厅与游戏舞台旋转90度横屏) */
.app-rotated-90 {
  position: fixed;
  top: 0;
  left: 0;
  width: 100dvh;
  height: 100dvw;
  transform-origin: 0 0;
  transform: rotate(90deg) translateY(-100%);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  z-index: 10;
  box-sizing: border-box;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.app-standard {
  min-height: 100dvh;
  width: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  box-sizing: border-box;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.game-compact-card {
  perspective: 1000px;
  transform-style: preserve-3d;
}

.game-compact-card:hover {
  transform: translateY(-4px);
}

@keyframes slideLeft {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-left {
  animation: slideLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes danmakuSlide {
  0% {
    transform: translateX(100vw);
  }
  100% {
    transform: translateX(-150%);
  }
}

.danmaku-item {
  animation-name: danmakuSlide;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}

@keyframes propParabola {
  0% {
    left: var(--start-x);
    top: var(--start-y);
    transform: translate(-50%, -50%) scale(0.6) rotate(0deg);
    opacity: 0;
  }
  20% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.3) rotate(60deg);
  }
  70% {
    transform: translate(-50%, -50%) scale(1.1) rotate(240deg);
  }
  100% {
    left: var(--target-x);
    top: var(--target-y);
    transform: translate(-50%, -50%) scale(1) rotate(360deg);
    opacity: 1;
  }
}

.prop-flying-anim {
  animation: propParabola 0.75s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

@keyframes propImpact {
  0% {
    transform: translate(-50%, -50%) scale(0.3);
    opacity: 0;
  }
  25% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 1;
  }
  70% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 0;
  }
}

.prop-impact-anim {
  animation: propImpact 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes pingOnce {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  50% {
    transform: scale(1.4);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-ping-once {
  animation: pingOnce 0.5s ease-out forwards;
}

@keyframes spinSlow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin-slow {
  animation: spinSlow 3s linear infinite;
}
</style>
