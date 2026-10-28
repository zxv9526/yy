<template>
  <div
    class="relative w-full h-full flex flex-col justify-between select-none overflow-hidden"
    :style="{
      backgroundColor: props.tableTheme.feltColor,
      background: `radial-gradient(ellipse at 50% 45%, ${props.tableTheme.highlightColor || props.tableTheme.feltColor} 0%, ${props.tableTheme.feltColor} 60%, ${props.tableTheme.edgeColor || '#1A0808'} 100%)`
    }"
  >
    <!-- Background Ambient Spotlight Overlay -->
    <div class="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_40%,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0)_65%)] z-1"></div>

    <!-- ======================================================== -->
    <!-- TOP HEADER BAR                                           -->
    <!-- ======================================================== -->
    <header class="relative z-30 w-full px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between border-b border-white/10 bg-black/45 backdrop-blur-md shrink-0">
      <div class="flex items-center gap-2 sm:gap-3">
        <!-- Return / Leave Button -->
        <button
          type="button"
          @click="onLeave"
          class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#E6DEC8] hover:text-white text-xs font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer border border-white/10 shadow-sm"
          title="退出等候室并返回大厅"
        >
          <span>🚪</span>
          <span>退出等候</span>
        </button>

        <button
          type="button"
          @click="$emit('change-scene')"
          class="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 text-xs font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer border border-amber-500/40 shadow-sm"
          title="更换其他玩法场景"
        >
          <span>🔄</span>
          <span>换场</span>
        </button>

        <!-- Game & Scene Title Tag -->
        <div class="flex items-center gap-2 ml-1">
          <span class="text-xl filter drop-shadow">{{ gameIcon }}</span>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-xs sm:text-sm md:text-base font-black text-white font-serif-title drop-shadow truncate">
                {{ gameName }} · {{ sceneDisplayName }}
              </h2>
              <span class="px-2 py-0.2 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 text-[9px] sm:text-[10px] font-mono font-bold whitespace-nowrap">
                🛡️ 彻底移除人机 · 纯真人对决
              </span>
            </div>
            <div class="text-[9px] sm:text-[10px] text-amber-200/80 font-mono flex items-center gap-2">
              <span>🪙 {{ gameType === 'yansan' ? `分场: ${baseStake === 5 ? '5--10' : baseStake === 10 ? '10--20' : '20--40'} 分` : `底分准入: ${baseStake} 分` }}</span>
              <span>•</span>
              <span>满座 {{ maxPlayers }} 人自动开局</span>
            </div>
          </div>
        </div>
      </div>
      <!-- Right: Connection Status -->
      <div class="flex items-center gap-1.5 sm:gap-2">
        <!-- Simulated Player Quick Join (For instantaneous full-seat auto-start testing) -->
        <button
          v-if="currentPlayers.length < maxPlayers && !isStarting"
          type="button"
          @click="addSimulatedPlayer"
          class="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-600/40 to-amber-500/40 hover:from-amber-600/60 hover:to-amber-500/60 text-amber-200 border border-amber-400/50 text-[10px] sm:text-[11px] font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1 shadow-sm"
          title="使用人机补位快速开局试玩（模拟试玩模式，胜负积分纯属演练，不计入真实玩家账户）"
        >
          <span>⚡</span>
          <span>用人机补位试玩</span>
        </button>

        <!-- Connection ping -->
        <div class="px-2 py-1 rounded-xl bg-black/60 border border-white/10 text-[10px] sm:text-xs font-mono text-emerald-400 flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>实时连线</span>
        </div>
      </div>
    </header>

    <!-- ======================================================== -->
    <!-- CENTER TABLE STAGE: WAITING SEATS DISPLAY                 -->
    <!-- ======================================================== -->
    <main class="relative z-10 flex-1 w-full max-w-[1100px] mx-auto p-2 sm:p-4 flex flex-col items-center justify-between min-h-0">
      <!-- Top Banner: Status & Seat Countdown Progress -->
      <div class="w-full max-w-xl mx-auto flex flex-col items-center gap-1.5 shrink-0 my-1">
        <div class="px-4 py-1.5 rounded-2xl bg-black/75 border border-amber-500/50 backdrop-blur-md shadow-2xl flex items-center gap-3">
          <span class="text-lg animate-bounce">{{ isStarting ? '🚀' : '⏳' }}</span>
          <div class="text-center">
            <div class="text-xs sm:text-sm font-black text-amber-300 font-serif-title tracking-wide">
              {{ isStarting ? `🎉 全员满座 (${currentPlayers.length}/${maxPlayers})！牌局即将自动开启` : `正在等待牌友选择相同场景入座 (${currentPlayers.length}/${maxPlayers})` }}
            </div>
            <div class="text-[9px] sm:text-[10px] text-[#D4C3B3] font-mono mt-0.5">
              {{ isStarting ? (hasSimulatedPlayer ? '🤖 已启用人机补位试玩 · 本局输赢纯属演练，不计入真实玩家积分' : `各席位已就位，倒计时 ${countdownSeconds} 秒后发牌...`) : '纯真人实时匹配 · 点击右上角可用人机补位试玩 · 满座即刻自动开战' }}
            </div>
          </div>
          <span class="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold text-xs border border-amber-500/40">
            {{ currentPlayers.length }} / {{ maxPlayers }}
          </span>
        </div>

        <!-- Visual Progress Meter -->
        <div class="w-64 sm:w-80 h-2 bg-black/60 rounded-full overflow-hidden border border-white/15 p-0.5 shadow-inner">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="isStarting ? 'bg-gradient-to-r from-amber-400 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.8)]' : 'bg-gradient-to-r from-amber-600 to-amber-400'"
            :style="{ width: `${(currentPlayers.length / maxPlayers) * 100}%` }"
          ></div>
        </div>
      </div>

      <!-- Center Ornate Table Felt Area -->
      <div class="relative w-full flex-1 flex items-center justify-center min-h-0 my-1">
        <!-- 4-Seat Layout (For Yansan, Mahjong, and 4-Player Shisanshui) -->
        <div v-if="maxPlayers === 4" class="relative w-full max-w-3xl h-full max-h-[360px] flex items-center justify-center">
          <!-- Table Center Badge -->
          <div class="absolute inset-x-0 inset-y-0 m-auto w-48 h-32 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-center shadow-2xl pointer-events-none">
            <span class="text-3xl filter drop-shadow mb-1">{{ gameIcon }}</span>
            <span class="text-xs sm:text-sm font-black font-serif-title text-amber-200">
              {{ sceneDisplayName }}
            </span>
            <span class="text-[9px] text-[#A89887] font-mono mt-0.5">
              {{ isStarting ? '即将发牌 ➔' : '等待满座自动开局' }}
            </span>
          </div>

          <!-- Seat 2: Top (North) -->
          <div class="absolute top-0 left-1/2 -translate-x-1/2">
            <SeatCard
              :seat-index="2"
              seat-label="北席"
              :player="getPlayerAtSeat(2)"
              :is-current-user="isPlayerMe(getPlayerAtSeat(2))"
            />
          </div>

          <!-- Seat 3: Left (West) -->
          <div class="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2">
            <SeatCard
              :seat-index="3"
              seat-label="西席"
              :player="getPlayerAtSeat(3)"
              :is-current-user="isPlayerMe(getPlayerAtSeat(3))"
            />
          </div>

          <!-- Seat 1: Right (East) -->
          <div class="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2">
            <SeatCard
              :seat-index="1"
              seat-label="东席"
              :player="getPlayerAtSeat(1)"
              :is-current-user="isPlayerMe(getPlayerAtSeat(1))"
            />
          </div>

          <!-- Seat 0: Bottom (South - Usually Current Player) -->
          <div class="absolute bottom-0 left-1/2 -translate-x-1/2">
            <SeatCard
              :seat-index="0"
              seat-label="本家席位 (您)"
              :player="getPlayerAtSeat(0)"
              :is-current-user="isPlayerMe(getPlayerAtSeat(0))"
            />
          </div>
        </div>

        <!-- 8-Seat Layout (For 8-Player Shisanshui) -->
        <div v-else class="relative w-full max-w-4xl h-full max-h-[380px] grid grid-cols-4 grid-rows-2 gap-2 sm:gap-3 p-2 items-center justify-items-center">
          <template v-for="sIdx in 8" :key="sIdx">
            <SeatCard
              :seat-index="sIdx - 1"
              :seat-label="`席位 ${sIdx}`"
              :player="getPlayerAtSeat(sIdx - 1)"
              :is-current-user="isPlayerMe(getPlayerAtSeat(sIdx - 1))"
              :compact="true"
            />
          </template>
        </div>

        <!-- Insufficient Points Sitting Notice Overlay (积分不足不允许入座提示) -->
        <div
          v-if="isCoinsInsufficient && !hasSimulatedPlayer"
          class="absolute inset-0 z-35 flex items-center justify-center p-3 pointer-events-auto bg-black/60 backdrop-blur-xs"
        >
          <div class="max-w-md w-full p-4 sm:p-5 rounded-3xl bg-[#1C1815]/95 border-2 border-amber-500/70 shadow-[0_0_50px_rgba(0,0,0,0.9)] backdrop-blur-md text-center space-y-3 text-[#F5EFE6]">
            <div class="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/60 mx-auto flex items-center justify-center text-xl text-amber-300">
              🪙
            </div>
            <div>
              <h3 class="text-sm sm:text-base font-bold text-amber-200 font-serif-title">
                可用积分不足，暂不允许入座真实对战
              </h3>
              <p class="text-xs text-[#D8C7B5] mt-1">
                本场准入要求 <strong class="text-amber-300 font-mono">{{ baseStake }}</strong> 分，您当前结余 <strong class="text-rose-400 font-mono">{{ currentUser.coins }}</strong> 分。
              </p>
            </div>
            <div class="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-200/90 leading-relaxed text-left">
              💡 <strong>推荐体验</strong>：您可以选择 <strong>进入人机补位模式试玩</strong>（模拟积分演练，零扣费体验完整对局规则），或前往钱庄管理。
            </div>
            <div class="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                @click="onLeave"
                class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-[#C4B5A5] cursor-pointer"
              >
                退出等候
              </button>
              <button
                type="button"
                @click="$emit('open-points')"
                class="px-3.5 py-1.5 rounded-xl bg-[#2C211A] hover:bg-[#382B22] border border-amber-500/40 text-xs text-amber-200 font-bold cursor-pointer"
              >
                前往钱庄
              </button>
              <button
                type="button"
                @click="startSimulatedPracticeFromWaiting"
                class="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-xs text-white font-black shadow-md ring-1 ring-amber-300 cursor-pointer"
              >
                🤖 进入人机补位试玩
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Interactive Greetings & Tea Bar -->
      <div class="w-full max-w-2xl mx-auto flex items-center justify-between gap-2 p-2 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md shrink-0">
        <div class="flex items-center gap-1.5 overflow-x-auto text-xs py-0.5">
          <span class="text-[11px] text-[#A89887] whitespace-nowrap pl-1">🍵 迎客问候：</span>
          <button
            v-for="phrase in WAITING_GREETINGS"
            :key="phrase"
            type="button"
            @click="sendWaitingGreeting(phrase)"
            class="px-2.5 py-1 rounded-xl bg-[#221711] hover:bg-[#34241B] border border-white/10 text-amber-200 text-[11px] whitespace-nowrap transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            {{ phrase }}
          </button>
        </div>

        <!-- Active speech bubble preview -->
        <div v-if="lastGreetingText" class="text-xs text-amber-300 font-medium px-2 py-0.5 rounded-lg bg-amber-950/60 border border-amber-500/40 truncate max-w-xs animate-pulse">
          {{ lastGreetingText }}
        </div>
      </div>
    </main>

    <!-- ======================================================== -->
    <!-- FULL TABLE COUNTDOWN FULLSCREEN OVERLAY                  -->
    <!-- ======================================================== -->
    <Transition name="fade">
      <div
        v-if="isStarting"
        class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto"
      >
        <div class="flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#2E180E] via-[#1F100A] to-[#120804] border-2 border-amber-400 shadow-[0_0_60px_rgba(245,158,11,0.5)] max-w-md w-full mx-4 text-center">
          <span class="text-5xl sm:text-6xl filter drop-shadow-xl animate-bounce mb-2">🎉</span>
          <h3 class="text-xl sm:text-2xl font-black text-amber-300 font-serif-title tracking-wider mb-1">
            全员满座 · 即刻开局！
          </h3>
          <p class="text-xs sm:text-sm text-[#E6DEC8] font-mono mb-4">
            {{ maxPlayers }} 位真实牌友已全员入座同一场景，正在为您生成牌桌...
          </p>

          <!-- Countdown Big Number -->
          <div class="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-amber-400/80 bg-black/60 flex items-center justify-center shadow-inner my-2">
            <span class="text-5xl sm:text-6xl font-black font-mono text-amber-400 animate-pulse">
              {{ countdownSeconds }}
            </span>
          </div>

          <div class="text-xs text-emerald-400 font-bold font-mono mt-3 animate-pulse flex items-center gap-1.5">
            <span>●</span>
            <span>发牌就绪，立即进入牌桌</span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import SeatCard from './waiting/SeatCard.vue';
import { UserProfile } from '../utils/storage';
import { TableTheme } from '../utils/theme';
import { soundFX } from '../utils/sound';

export interface ScenePlayer {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  coins: number;
  seat: number;
  isSimulated?: boolean;
}

const props = defineProps<{
  gameType: 'yansan' | 'shisanshui' | 'mahjong';
  sceneMode: string;
  sceneName: string;
  baseStake: number;
  maxPlayers: number;
  currentUser: UserProfile;
  ws: WebSocket | null;
  wsConnected: boolean;
  tableTheme: TableTheme;
  isRotated90: boolean;
}>();

const emit = defineEmits<{
  (e: 'leave'): void;
  (e: 'change-scene'): void;
  (e: 'start-game', players: ScenePlayer[]): void;
  (e: 'open-points'): void;
}>();

// Current active players waiting in this scene
const currentPlayers = ref<ScenePlayer[]>([]);
const isStarting = ref(false);
const countdownSeconds = ref(3);
let countdownTimer: any = null;
const lastGreetingText = ref('');
let greetingTimer: any = null;

const isCoinsInsufficient = computed(() => (props.currentUser.coins || 0) < props.baseStake);

const hasSimulatedPlayer = computed(() => {
  return currentPlayers.value.some((p) => Boolean(p.isSimulated));
});

const WAITING_GREETINGS = [
  '🍵 各位客官上座，慢用香茗！',
  '👏 今日雀友齐聚，幸会幸会！',
  '🏮 满座即刻开打，严阵以待！',
  '🔥 顺子在手，随时准备出招！',
  '👑 牌桌之上，全凭真功夫！',
];

const gameName = computed(() => {
  if (props.gameType === 'mahjong') return '经典麻将';
  if (props.gameType === 'shisanshui') return '水镜十三张';
  return '经典烟三';
});

const gameIcon = computed(() => {
  if (props.gameType === 'mahjong') return '🀄';
  if (props.gameType === 'shisanshui') return '💎';
  return '🔥';
});

const sceneDisplayName = computed(() => {
  return props.sceneName || '经典对局场';
});

function getPlayerAtSeat(seatIndex: number): ScenePlayer | null {
  return currentPlayers.value.find((p) => p.seat === seatIndex) || null;
}

function isPlayerMe(p: ScenePlayer | null): boolean {
  if (!p) return false;
  return p.id === props.currentUser.id || p.name === props.currentUser.name;
}

function onLeave() {
  if (props.ws && props.ws.readyState === WebSocket.OPEN) {
    try {
      props.ws.send(JSON.stringify({
        type: 'scene_leave',
        gameType: props.gameType,
        sceneMode: props.sceneMode,
        playerId: props.currentUser.id,
      }));
    } catch {}
  }
  emit('leave');
}

function sendWaitingGreeting(text: string) {
  lastGreetingText.value = `${props.currentUser.name}: ${text}`;
  soundFX.playTap();
  if (greetingTimer) clearTimeout(greetingTimer);
  greetingTimer = setTimeout(() => {
    lastGreetingText.value = '';
  }, 4000);

  if (props.ws && props.ws.readyState === WebSocket.OPEN) {
    try {
      props.ws.send(JSON.stringify({
        type: 'scene_chat',
        gameType: props.gameType,
        sceneMode: props.sceneMode,
        sender: props.currentUser.name,
        text,
      }));
    } catch {}
  }
}

// Simulated real player manual invite test (NEVER automated or auto-filled)
function addSimulatedPlayer() {
  soundFX.playTap();
  if (currentPlayers.value.length >= props.maxPlayers) return;

  const names = [
    '岭南雀神', '濠江巧手', '九龙少侠', '秦淮雅客',
    '风雷快刀', '白鹭居士', '云梦渔樵', '天元棋客'
  ];
  const avatars = ['🤠', '🥷', '🧝', '🧙', '🤴', '👸', '🧔', '🧑‍🎨'];
  const nextSeat = getNextFreeSeat();
  const randomName = `${names[Math.floor(Math.random() * names.length)]}_${Math.floor(10 + Math.random() * 90)}`;
  const simPlayer: ScenePlayer = {
    id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: randomName,
    avatar: avatars[Math.floor(Math.random() * avatars.length)],
    rating: Math.floor(1850 + Math.random() * 350),
    coins: Math.floor(2000 + Math.random() * 5000),
    seat: nextSeat,
    isSimulated: true,
  };

  currentPlayers.value.push(simPlayer);
  soundFX.playVictory();

  // If this filled the table to maxPlayers, trigger auto-start countdown!
  if (currentPlayers.value.length >= props.maxPlayers) {
    startAutoLaunchCountdown();
  }
}

function getNextFreeSeat(): number {
  const occupied = new Set(currentPlayers.value.map((p) => p.seat));
  for (let i = 0; i < props.maxPlayers; i++) {
    if (!occupied.has(i)) return i;
  }
  return currentPlayers.value.length;
}

function startAutoLaunchCountdown() {
  if (isStarting.value) return;
  isStarting.value = true;
  countdownSeconds.value = 3;
  soundFX.playVictory();

  countdownTimer = setInterval(() => {
    countdownSeconds.value -= 1;
    if (countdownSeconds.value > 0) {
      soundFX.playTap();
    } else {
      clearInterval(countdownTimer);
      countdownTimer = null;
      // Start game with these exact real players!
      emit('start-game', [...currentPlayers.value]);
    }
  }, 1000);
}

function startSimulatedPracticeFromWaiting() {
  soundFX.playTap();
  const myPlayer: ScenePlayer = {
    id: props.currentUser.id || `P-${Date.now()}`,
    name: `${props.currentUser.name || '您'}(试玩)`,
    avatar: props.currentUser.avatar || '👤',
    rating: props.currentUser.rating || 1900,
    coins: props.currentUser.coins || 0,
    seat: 0,
    isSimulated: true,
  };
  currentPlayers.value = [myPlayer];
  while (currentPlayers.value.length < props.maxPlayers) {
    addSimulatedPlayer();
  }
}

// Join scene on WebSocket
function joinSceneQueue() {
  // If coins are insufficient for baseStake准入, do NOT sit in seat 0 of real queue
  if (isCoinsInsufficient.value) {
    currentPlayers.value = [];
    return;
  }

  // Add self to local list first as seat 0
  const myPlayer: ScenePlayer = {
    id: props.currentUser.id || `P-${Date.now()}`,
    name: props.currentUser.name || '茗局雅客',
    avatar: props.currentUser.avatar || '👤',
    rating: props.currentUser.rating || 1900,
    coins: props.currentUser.coins || 3000,
    seat: 0,
  };
  currentPlayers.value = [myPlayer];

  if (props.ws && props.ws.readyState === WebSocket.OPEN) {
    try {
      props.ws.send(JSON.stringify({
        type: 'scene_join',
        gameType: props.gameType,
        sceneMode: props.sceneMode,
        sceneName: props.sceneName,
        maxPlayers: props.maxPlayers,
        player: myPlayer,
      }));
    } catch {}
  }
}

// WebSocket message listener
function handleWsMessage(event: MessageEvent) {
  try {
    const msg = JSON.parse(event.data);
    if (msg.type === 'scene_room_update') {
      if (msg.gameType === props.gameType && msg.sceneMode === props.sceneMode) {
        if (Array.isArray(msg.players)) {
          currentPlayers.value = msg.players;
          if (currentPlayers.value.length >= props.maxPlayers && !isStarting.value) {
            startAutoLaunchCountdown();
          }
        }
      }
    } else if (msg.type === 'scene_room_full') {
      if (msg.gameType === props.gameType && msg.sceneMode === props.sceneMode) {
        if (Array.isArray(msg.players)) {
          currentPlayers.value = msg.players;
        }
        startAutoLaunchCountdown();
      }
    } else if (msg.type === 'scene_chat_broadcast') {
      if (msg.gameType === props.gameType && msg.sceneMode === props.sceneMode) {
        lastGreetingText.value = `${msg.sender}: ${msg.text}`;
        soundFX.playTap();
        if (greetingTimer) clearTimeout(greetingTimer);
        greetingTimer = setTimeout(() => {
          lastGreetingText.value = '';
        }, 4000);
      }
    }
  } catch {}
}

onMounted(() => {
  joinSceneQueue();
  if (props.ws) {
    props.ws.addEventListener('message', handleWsMessage);
  }
});

onBeforeUnmount(() => {
  if (countdownTimer) clearInterval(countdownTimer);
  if (greetingTimer) clearTimeout(greetingTimer);
  if (props.ws) {
    props.ws.removeEventListener('message', handleWsMessage);
  }
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
