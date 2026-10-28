<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-start sm:items-center justify-center p-2 sm:p-4 select-none overflow-hidden">
      <!-- Modal Box: Auto-adapts to mobile height with permanently visible action footer -->
      <div
        class="w-full max-w-[450px] max-h-[96vh] sm:max-h-[88vh] flex flex-col rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#1C1815] via-[#15110E] to-[#0D0A08] border border-amber-500/40 shadow-2xl overflow-hidden relative text-[#F5EFE6]"
      >
        <!-- 1. Top Header Bar (Fixed / Shrink-0) -->
        <div class="flex items-center justify-between px-3.5 py-2.5 sm:px-5 sm:py-3 border-b border-[#2E2722] shrink-0 gap-2 bg-[#171310]">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-xl sm:text-2xl shrink-0">🏮</span>
            <div class="min-w-0">
              <h3 class="text-sm sm:text-base font-bold text-amber-200 font-serif-title truncate">
                {{ isLoggedIn ? '用户账号管理' : (authTab === 'login' ? '牌友登录' : '新秀注册') }}
              </h3>
              <p class="text-[10px] sm:text-[11px] text-[#A89887] truncate">
                {{ isLoggedIn ? '管理对局身份与云端战绩' : (authTab === 'login' ? '输入手机号与密码快速登录' : '授权手机号注册即送 8,888 开局筹码') }}
              </p>
            </div>
          </div>

          <button
            type="button"
            @click="$emit('close')"
            class="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs text-[#B8A99A] hover:text-white transition-colors cursor-pointer shrink-0"
            title="关闭"
          >
            ✕
          </button>
        </div>

        <!-- 2. Segmented Tab Switcher (When Not Logged In, Fixed) -->
        <div v-if="!isLoggedIn" class="px-3.5 pt-2.5 pb-1 sm:px-5 shrink-0 bg-[#15110E]">
          <div class="flex items-center gap-1 p-1 bg-[#100D0B] rounded-xl border border-white/10">
            <button
              type="button"
              @click="authTab = 'login'; errorMessage = ''"
              :class="authTab === 'login' ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold shadow-md' : 'text-[#8C7A6B] hover:text-white'"
              class="flex-1 py-1.5 text-xs rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1"
            >
              <span>🔑</span>
              <span>账号登录</span>
            </button>
            <button
              type="button"
              @click="authTab = 'register'; errorMessage = ''"
              :class="authTab === 'register' ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold shadow-md' : 'text-[#8C7A6B] hover:text-white'"
              class="flex-1 py-1.5 text-xs rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1"
            >
              <span>✨</span>
              <span>快速注册</span>
            </button>
          </div>
        </div>

        <!-- 3. Scrollable Input Body (Middle Area) -->
        <div class="flex-1 overflow-y-auto px-3.5 py-2 sm:px-5 min-h-0 space-y-2.5 overscroll-contain">
          <!-- A. Logged In Profile Card Mode -->
          <div v-if="isLoggedIn" class="py-1 space-y-3">
            <div class="p-3 rounded-xl bg-[#14110F] border border-[#2A231E] flex items-center justify-between">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="text-2xl p-1.5 rounded-xl bg-[#26201B] border border-[#3A3029] shrink-0">
                  {{ currentProfile.avatar }}
                </span>
                <div class="min-w-0">
                  <div class="text-xs sm:text-sm font-bold text-[#F5EFE6] flex items-center gap-1.5 truncate">
                    <span class="truncate">{{ currentProfile.name }}</span>
                    <span class="text-[9px] px-1.5 py-0.2 rounded bg-amber-600/30 text-amber-300 border border-amber-500/40 shrink-0 font-mono">
                      LV.{{ currentProfile.level }}
                    </span>
                  </div>
                  <div class="text-[10px] text-[#8C7A6B] font-mono mt-0.5 truncate">
                    手机账号: {{ currentProfile.phone || currentProfile.username }} · UID: {{ currentProfile.id }}
                  </div>
                </div>
              </div>
              <div class="text-right shrink-0">
                <div class="text-xs text-amber-400 font-mono font-bold">🪙 {{ currentProfile.coins.toLocaleString() }} 分</div>
                <div class="text-[10px] text-[#8C7A6B] mt-0.5">积分: {{ currentProfile.rating }}</div>
              </div>
            </div>

            <!-- Edit Nickname -->
            <div>
              <label class="block text-[11px] text-[#B8A99A] mb-1">修改堂号名讳</label>
              <input
                v-model="editName"
                type="text"
                class="w-full px-3 py-1.5 text-xs rounded-xl bg-[#12100E] border border-[#2E2722] text-[#F5EFE6] focus:outline-none focus:border-amber-500 shadow-inner"
                placeholder="请输入新的名号..."
              />
            </div>

            <!-- Edit Avatar -->
            <div>
              <label class="block text-[11px] text-[#B8A99A] mb-1">更换牌桌头像印信</label>
              <div class="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
                <button
                  v-for="av in AVATAR_OPTIONS"
                  :key="av"
                  type="button"
                  @click="editAvatar = av"
                  :class="editAvatar === av ? 'border-amber-400 bg-amber-600/40 text-amber-200 ring-2 ring-amber-500/50 scale-105' : 'border-white/10 bg-[#16120F] text-white/80 hover:border-white/30'"
                  class="w-8 h-8 rounded-lg border text-base flex items-center justify-center shrink-0 transition-all cursor-pointer"
                >
                  {{ av }}
                </button>
              </div>
            </div>
          </div>

          <!-- B. Not Logged In: Form Inputs -->
          <div v-else class="py-1 space-y-2.5">
            <!-- 1) Login Form (Compact: 仅支持手机号与密码登录) -->
            <div v-if="authTab === 'login'" class="space-y-2.5">
              <div>
                <label class="block text-[11px] text-[#B8A99A] mb-1">登录手机号</label>
                <input
                  v-model="formPhone"
                  type="tel"
                  inputmode="tel"
                  autocomplete="tel"
                  required
                  class="w-full px-3 py-2 text-xs rounded-xl bg-[#12100E] border border-[#2E2722] text-[#F5EFE6] focus:outline-none focus:border-amber-500 font-mono shadow-inner"
                  placeholder="请输入您的登录手机号 (如 13800138000)"
                  @keydown.enter="submitLogin"
                />
              </div>

              <div>
                <label class="block text-[11px] text-[#B8A99A] mb-1">登录密码</label>
                <input
                  v-model="formPassword"
                  type="password"
                  required
                  autocomplete="current-password"
                  class="w-full px-3 py-2 text-xs rounded-xl bg-[#12100E] border border-[#2E2722] text-[#F5EFE6] focus:outline-none focus:border-amber-500 shadow-inner font-mono"
                  placeholder="请输入登录密码..."
                  @keydown.enter="submitLogin"
                />
              </div>
            </div>

            <!-- 2) Register Form (Compact 2-Column Grid: 移除账号名，以手机号为唯一凭证) -->
            <div v-else-if="authTab === 'register'" class="space-y-2">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <!-- Phone (Whitelist) -->
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="text-[11px] text-[#B8A99A]">授权手机号</label>
                    <span class="text-[9px] px-1 py-0.2 rounded bg-amber-900/60 text-amber-300 font-mono border border-amber-600/30">Bot白名单</span>
                  </div>
                  <input
                    v-model="formPhone"
                    type="tel"
                    inputmode="tel"
                    autocomplete="tel"
                    required
                    class="w-full px-3 py-1.5 text-xs rounded-xl bg-[#12100E] border border-[#2E2722] text-[#F5EFE6] focus:outline-none focus:border-amber-500 font-mono shadow-inner"
                    placeholder="输入已获Bot授权的手机号"
                    @keydown.enter="submitRegister"
                  />
                </div>

                <!-- Password -->
                <div>
                  <label class="block text-[11px] text-[#B8A99A] mb-1">设置登录密码 (六位数字)</label>
                  <input
                    v-model="formPassword"
                    type="password"
                    inputmode="numeric"
                    maxlength="6"
                    required
                    class="w-full px-3 py-1.5 text-xs rounded-xl bg-[#12100E] border border-[#2E2722] text-[#F5EFE6] focus:outline-none focus:border-amber-500 shadow-inner font-mono"
                    placeholder="设置6位数字密码"
                    @keydown.enter="submitRegister"
                  />
                </div>

                <!-- Nickname -->
                <div class="sm:col-span-2">
                  <label class="block text-[11px] text-[#B8A99A] mb-1">牌桌名号 (昵称)</label>
                  <input
                    v-model="formNickname"
                    type="text"
                    class="w-full px-3 py-1.5 text-xs rounded-xl bg-[#12100E] border border-[#2E2722] text-[#F5EFE6] focus:outline-none focus:border-amber-500 shadow-inner"
                    placeholder="如：香江雀仙（选填，默认手机尾号茶客）"
                    @keydown.enter="submitRegister"
                  />
                </div>
              </div>

              <!-- Sleek Horizontal Avatar Picker -->
              <div class="pt-1">
                <div class="flex items-center justify-between mb-1">
                  <label class="text-[11px] text-[#B8A99A]">印信头像选择</label>
                  <span class="text-xs text-amber-300 font-mono">当前选择: {{ formAvatar }}</span>
                </div>
                <div class="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
                  <button
                    v-for="av in AVATAR_OPTIONS"
                    :key="av"
                    type="button"
                    @click="formAvatar = av"
                    :class="formAvatar === av ? 'border-amber-400 bg-amber-600/40 text-amber-200 ring-2 ring-amber-500/50 scale-105' : 'border-white/10 bg-[#16120F] text-white/80 hover:border-white/30'"
                    class="w-8 h-8 rounded-lg border text-base flex items-center justify-center shrink-0 transition-all cursor-pointer"
                  >
                    {{ av }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Error Banner -->
            <div v-if="errorMessage" class="p-2 rounded-xl bg-red-950/80 border border-red-700/60 text-[11px] text-red-200 leading-snug flex items-center gap-1.5">
              <span>⚠️</span>
              <span>{{ errorMessage }}</span>
            </div>
          </div>
        </div>

        <!-- 4. DOCKED STICKY FOOTER (吸底常驻操作栏，绝不被软键盘或滚动条掩盖！) -->
        <div class="shrink-0 p-3 sm:px-5 bg-[#14100E] border-t border-amber-500/25 flex flex-col gap-1.5 shadow-2xl">
          <!-- When Logged In: Save / Logout Buttons -->
          <div v-if="isLoggedIn" class="flex items-center justify-between gap-2.5">
            <button
              type="button"
              @click="handleLogout"
              class="flex-1 py-2 text-xs font-medium rounded-xl bg-red-950/50 hover:bg-red-900/60 text-red-200 border border-red-800/50 transition-colors cursor-pointer text-center"
            >
              退出登录
            </button>
            <button
              type="button"
              @click="handleSaveProfile"
              class="flex-1 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-md transition-colors cursor-pointer text-center"
            >
              保存修改
            </button>
          </div>

          <!-- When Auth (Login / Register): Primary Action Button -->
          <template v-else>
            <button
              type="button"
              @click="authTab === 'login' ? submitLogin() : submitRegister()"
              class="w-full py-2.5 px-4 text-xs sm:text-sm font-bold rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-white shadow-lg active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{{ authTab === 'login' ? '🔑 立即登录账号' : '✨ 立即注册账号' }}</span>
            </button>

            <!-- Bottom Subtitle / Guidance -->
            <div class="text-[10px] text-center text-[#8C7A6B] flex items-center justify-center gap-1">
              <span>🛡️</span>
              <span v-if="authTab === 'login'">单设备安全会话机制 · 保护您的账号资产</span>
              <span v-else>注册手机号须由管理员在 Telegram Bot 中发送 /authphone 授权</span>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import {
  UserProfile,
  AccountData,
  getRegisteredAccounts,
  saveRegisteredAccounts,
  saveLocalProfile,
  recordPointsTx,
  hashPassword,
} from '../utils/storage';
import { soundFX } from '../utils/sound';

const props = defineProps<{
  profile: UserProfile;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:profile', p: UserProfile): void;
  (e: 'open-termux'): void;
}>();

const authTab = ref<'login' | 'register'>('login');
const isLoggedIn = ref(props.profile.isLoggedIn);
const currentProfile = reactive<UserProfile>({ ...props.profile });

const editName = ref(currentProfile.name);
const editAvatar = ref(currentProfile.avatar);

const formPassword = ref('');
const formPhone = ref('');
const formNickname = ref('');
const formAvatar = ref('🀄');
const errorMessage = ref('');
const AVATAR_OPTIONS = ['🀄', '♟️', '🃏', '👑', '🐉', '🍵', '⚡', '🪓', '🐯', '🦅', '🪙', '🏮'];

async function submitLogin() {
  errorMessage.value = '';
  const phone = formPhone.value.trim().replace(/\D/g, '');
  if (!phone || !formPassword.value) {
    errorMessage.value = '请输入登录手机号和密码';
    return;
  }
  const accounts = getRegisteredAccounts();

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        password: formPassword.value,
      }),
    });
    const data = await res.json();
    if (data.success && data.profile) {
      const serverProfile: UserProfile = {
        ...data.profile,
        isLoggedIn: true,
        sessionToken: data.sessionToken,
      };
      const hashedPassword = await hashPassword(formPassword.value);
      const exIdx = accounts.findIndex(
        (a) => (a.phone && a.phone.replace(/\D/g, '') === phone) ||
               (a.username && a.username.toLowerCase() === phone.toLowerCase())
      );
      const accountEntry: AccountData = {
        username: serverProfile.username || phone,
        phone,
        password: hashedPassword,
        profile: serverProfile,
        updatedAt: Date.now(),
      };
      if (exIdx >= 0) {
        accounts[exIdx] = accountEntry;
      } else {
        accounts.push(accountEntry);
      }
      saveRegisteredAccounts(accounts);
      saveLocalProfile(serverProfile);
      Object.assign(currentProfile, serverProfile);
      isLoggedIn.value = true;
      emit('update:profile', serverProfile);
      soundFX.playVictory();
      emit('close');
      return;
    } else {
      errorMessage.value = data.error || '手机号或密码不匹配，请核对后再试';
      soundFX.playTap();
      return;
    }
  } catch {
    errorMessage.value = '服务器连接异常，请稍后重试';
  }
}

async function submitRegister() {
  errorMessage.value = '';
  const phone = formPhone.value.trim().replace(/\D/g, '');
  if (!phone || !formPassword.value) {
    errorMessage.value = '请填写授权手机号和6位登录密码';
    return;
  }
  if (formPassword.value.length !== 6) {
    errorMessage.value = '登录密码必须为六位数';
    return;
  }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        password: formPassword.value,
        nickname: formNickname.value.trim(),
        avatar: formAvatar.value,
      }),
    });
    const data = await res.json();
    if (!data.success) {
      errorMessage.value = data.error || '该手机号无效或未获授权';
      return;
    }
    const newProfile = {
      ...data.profile,
      isLoggedIn: true,
      sessionToken: data.sessionToken,
    };
    saveLocalProfile(newProfile);

    // Save to local registered accounts store for offline/persistent login
    const hashedPassword = await hashPassword(formPassword.value);
    const accounts = getRegisteredAccounts();
    const existingIdx = accounts.findIndex(
      (a) => (a.phone && a.phone.replace(/\D/g, '') === phone) ||
             (a.username && a.username.toLowerCase() === phone.toLowerCase())
    );
    const accountEntry: AccountData = {
      username: newProfile.username || phone,
      phone,
      password: hashedPassword,
      profile: { ...newProfile, isLoggedIn: true },
      updatedAt: Date.now(),
    };
    if (existingIdx >= 0) {
      accounts[existingIdx] = accountEntry;
    } else {
      accounts.push(accountEntry);
    }
    saveRegisteredAccounts(accounts);

    Object.assign(currentProfile, newProfile);
    isLoggedIn.value = true;
    emit('update:profile', newProfile);
    soundFX.playVictory();
    emit('close');
  } catch {
    errorMessage.value = '服务器连接超时，请检查网络后再试';
  }
}

function handleSaveProfile() {
  currentProfile.name = editName.value.trim() || currentProfile.name;
  currentProfile.avatar = editAvatar.value;
  saveLocalProfile(currentProfile);

  const accounts = getRegisteredAccounts();
  const acc = accounts.find(
    (a) => (a.phone && a.phone === currentProfile.phone) ||
           (a.username.toLowerCase() === currentProfile.username.toLowerCase())
  );
  if (acc) {
    acc.profile = { ...currentProfile };
    acc.updatedAt = Date.now();
    saveRegisteredAccounts(accounts);
  }

  emit('update:profile', { ...currentProfile });
  soundFX.playTap();
  emit('close');
}

function handleLogout() {
  currentProfile.isLoggedIn = false;
  currentProfile.sessionToken = '';
  isLoggedIn.value = false;
  saveLocalProfile(currentProfile);
  emit('update:profile', { ...currentProfile });
  soundFX.playTap();
  authTab.value = 'login';
}

onMounted(() => {
  if (props.profile.phone && !formPhone.value) {
    formPhone.value = props.profile.phone;
  }
});
</script>

<style scoped>
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
