<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none overflow-hidden">
      <div
        class="w-[94vw] max-w-2xl max-h-[90dvh] rounded-3xl bg-gradient-to-br from-[#1C1815] via-[#15110E] to-[#0D0A08] border border-amber-500/35 p-3.5 sm:p-5 shadow-2xl flex flex-col justify-between overflow-hidden text-[#F5EFE6]"
      >
        <!-- Header -->
        <div class="flex items-center justify-between pb-2.5 border-b border-[#2E2722] shrink-0 gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="text-2xl sm:text-3xl p-1.5 sm:p-2 rounded-xl bg-[#26201B] border border-[#3A3029] shrink-0">{{ profile.avatar }}</span>
            <div class="min-w-0">
              <h3 class="text-base sm:text-lg font-bold text-[#F5EFE6] font-serif-title flex items-center gap-2 truncate">
                <span class="truncate">{{ profile.name }}</span>
                <span class="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-amber-600/30 text-amber-300 border border-amber-500/40 font-mono shrink-0">
                  LV.{{ profile.level }} 棋道雅士
                </span>
              </h3>
              <p class="text-[11px] sm:text-xs text-[#B8A99A] tabular-nums mt-0.5 truncate">
                ID: {{ profile.id }} · 天梯积分：{{ profile.rating }} · 筹码金币：{{ profile.coins }} 分
              </p>
            </div>
          </div>
          <button type="button" @click="$emit('close')" class="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs text-[#B8A99A] hover:text-white transition-colors cursor-pointer shrink-0">
            ✕
          </button>
        </div>

      <!-- Tab Navigation -->
      <div class="flex items-center gap-1.5 my-2.5 p-1 bg-[#14110F] rounded-xl shrink-0">
        <button
          type="button"
          @click="activeTab = 'stats'"
          :class="activeTab === 'stats' ? 'bg-amber-600 text-white' : 'text-[#B8A99A] hover:text-white'"
          class="flex-1 py-1.5 text-xs font-medium rounded-md transition-colors"
        >
          三大棋种战绩
        </button>
        <button
          type="button"
          @click="activeTab = 'records'"
          :class="activeTab === 'records' ? 'bg-amber-600 text-white' : 'text-[#B8A99A] hover:text-white'"
          class="flex-1 py-1.5 text-xs font-medium rounded-md transition-colors"
        >
          历史对局详单 ({{ records.length }})
        </button>
        <button
          type="button"
          @click="activeTab = 'settings'"
          :class="activeTab === 'settings' ? 'bg-amber-600 text-white' : 'text-[#B8A99A] hover:text-white'"
          class="flex-1 py-1.5 text-xs font-medium rounded-md transition-colors"
        >
          名号与数据备份
        </button>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto pr-1 space-y-4">
        <!-- Tab 1: Stats -->
        <div v-if="activeTab === 'stats'" class="space-y-4">
          <!-- Stats Grid (三大经典棋种) -->
          <div class="grid grid-cols-3 gap-3">
            <div
              v-for="key in ACTIVE_GAME_KEYS"
              :key="key"
              class="p-3.5 rounded-xl bg-[#14110F] border border-[#2A231E]"
            >
              <div class="text-xs font-bold text-[#E6DEC8] mb-1 font-serif-title">{{ GAME_NAMES[key] || key }}</div>
              <div class="text-xs text-[#B8A99A] tabular-nums leading-relaxed">
                <div>总场次：{{ profile.stats[key]?.played || 0 }} 局</div>
                <div>胜率：{{ (profile.stats[key]?.played || 0) > 0 ? Math.round(((profile.stats[key]?.won || 0) / (profile.stats[key]?.played || 1)) * 100) : 0 }}% ({{ profile.stats[key]?.won || 0 }}胜)</div>
                <div class="text-amber-400">最高分/番：{{ profile.stats[key]?.highestScore || 0 }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 2: Records -->
        <div v-else-if="activeTab === 'records'" class="space-y-2">
          <div v-if="records.length === 0" class="text-center py-10 text-xs text-[#8C7A6B]">
            暂无历史战绩对局记录
          </div>
          <div
            v-for="rec in records"
            :key="rec.id"
            class="p-3 rounded-lg bg-[#14110F] border border-[#2A231E] flex items-center justify-between text-xs"
          >
            <div>
              <div class="flex items-center gap-2 mb-0.5">
                <span class="font-bold text-[#F5EFE6]">{{ rec.gameName }}</span>
                <span
                  :class="rec.result === 'win' ? 'text-amber-400' : 'text-slate-400'"
                  class="font-semibold"
                >
                  {{ rec.result === 'win' ? '【大捷】' : '【失利】' }}
                </span>
                <span class="text-[#8C7A6B] tabular-nums">{{ rec.timestamp }}</span>
              </div>
              <div class="text-[11px] text-[#A89887]">{{ rec.details }}</div>
            </div>

            <div class="text-right tabular-nums">
              <div :class="rec.coinsDelta >= 0 ? 'text-emerald-400' : 'text-red-400'" class="font-bold">
                {{ rec.coinsDelta >= 0 ? `+${rec.coinsDelta}` : rec.coinsDelta }} 金币
              </div>
              <div class="text-[11px] text-[#B8A99A]">天梯 {{ rec.ratingDelta >= 0 ? `+${rec.ratingDelta}` : rec.ratingDelta }}</div>
            </div>
          </div>
        </div>

        <!-- Tab 3: Settings & Data Backup -->
        <div v-else class="space-y-4 text-xs">
          <div>
            <label class="block text-[#B8A99A] mb-1">修改名号</label>
            <input
              v-model="profile.name"
              type="text"
              class="w-full px-3 py-2 rounded-lg bg-[#14110F] border border-[#2E2722] text-[#F5EFE6]"
            />
          </div>

          <div>
            <label class="block text-[#B8A99A] mb-1.5">挑选雅号头像</label>
            <div class="flex items-center gap-2">
              <button
                v-for="a in AVATARS"
                :key="a"
                type="button"
                @click="profile.avatar = a"
                :class="profile.avatar === a ? 'border-amber-500 bg-amber-600/20' : 'border-[#2E2722] bg-[#14110F]'"
                class="w-9 h-9 rounded-lg border text-lg flex items-center justify-center transition-colors"
              >
                {{ a }}
              </button>
            </div>
          </div>

          <div class="pt-2 border-t border-[#2E2722] flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="exportJson"
                class="px-3.5 py-1.5 rounded-lg bg-[#2A231E] hover:bg-[#382F29] text-[#E6DEC8] transition-colors"
              >
                📥 导出战绩 JSON
              </button>
              <label class="px-3.5 py-1.5 rounded-lg bg-[#2A231E] hover:bg-[#382F29] text-[#E6DEC8] cursor-pointer transition-colors inline-flex items-center">
                <span>📤 导入恢复战绩</span>
                <input type="file" accept=".json" @change="importJson" class="hidden" />
              </label>
            </div>
            <button
              type="button"
              @click="resetData"
              class="px-3.5 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-200 border border-red-800/40 transition-colors"
            >
              重置战绩数据
            </button>
          </div>
          <div v-if="importNotice" class="text-xs text-amber-300 bg-amber-950/50 p-2 rounded border border-amber-700/50">
            {{ importNotice }}
          </div>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="pt-3 mt-3 border-t border-[#2E2722] flex items-center justify-between">
        <span class="text-[11px] text-[#8C7A6B]">数据已本地与服务端双通道实时持久化存储</span>
        <button
          type="button"
          @click="saveAndClose"
          class="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors"
        >
          保存并返回对局
        </button>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { UserProfile, MatchRecord, recordPointsTx, saveLocalProfile, saveLocalRecords } from '../utils/storage';
import { soundFX } from '../utils/sound';

const props = defineProps<{
  profile: UserProfile;
  records: MatchRecord[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:profile', p: UserProfile): void;
  (e: 'update:records', r: MatchRecord[]): void;
}>();

const activeTab = ref<'stats' | 'records' | 'settings'>('stats');

const ACTIVE_GAME_KEYS = ['yansan', 'shisanshui', 'mahjong'] as const;

const GAME_NAMES: Record<string, string> = {
  yansan: '经典烟三',
  shisanshui: '水镜十三水',
  mahjong: '经典国标麻将',
};

const AVATARS = ['🀄', '♟️', '🃏', '👑', '🐉', '🍵', '⚡', '🪓'];

function exportJson() {
  const data = JSON.stringify({ profile: props.profile, records: props.records }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rustchess_profile_${props.profile.name}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

const importNotice = ref('');

function importJson(ev: Event) {
  const target = ev.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target?.result as string);
      if (parsed.profile) {
        Object.assign(props.profile, parsed.profile);
      }
      if (Array.isArray(parsed.records)) {
        props.records.splice(0, props.records.length, ...parsed.records);
        emit('update:records', props.records);
      }
      importNotice.value = '战绩数据导入恢复成功！';
      soundFX.playVictory();
    } catch {
      importNotice.value = '文件解析失败，请上传标准的战绩 JSON 文件';
    }
  };
  reader.readAsText(file);
}

function resetData() {
  props.profile.coins = 0;
  props.profile.rating = 1800;
  props.records.length = 0;
  saveLocalProfile(props.profile);
  saveLocalRecords(props.records);
  emit('update:profile', props.profile);
  emit('update:records', props.records);
  importNotice.value = '已恢复初始战绩！';
  soundFX.playTap();
}

function saveAndClose() {
  saveLocalProfile(props.profile);
  saveLocalRecords(props.records);
  emit('update:profile', props.profile);
  emit('close');
}
</script>
