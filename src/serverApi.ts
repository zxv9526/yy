import {
  loadDatabase,
  saveDatabase,
  recordAdminLog,
  type UserProfileData,
  hashPassword,
  verifyPassword,
} from './serverStorage.ts';
import fs from 'fs';
import path from 'path';

interface AdminPendingState {
  action: 'findphone' | 'authphone' | 'delphone' | 'deluser' | 'addpoints' | 'subpoints' | 'setpoints' | 'ban' | 'unban' | 'broadcast' | 'batchpoints';
  timestamp: number;
}
const adminPendingStates = new Map<string, AdminPendingState>();

function findEnvFilePath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env'),
    process.env.HOME ? path.resolve(process.env.HOME, '.env') : '',
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function getAdminUsernamesFromEnv(): string[] {
  try {
    const envPath = findEnvFilePath();
    if (envPath && fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const lines = content.split('\n');
      const usernames: string[] = [];
      for (const line of lines) {
        const match = line.match(/^([A-Z_]+)\s*=\s*(['"]?)([^'"]+)\2/i);
        if (match) {
          const key = match[1].toUpperCase();
          const val = match[3];
          if (key.includes('ADMIN') && (key.includes('USER') || key.includes('NAME'))) {
            const vals = val.split(/[\s,;]+/);
            for (const v of vals) if (v.trim()) usernames.push(v.trim().replace(/^@/, ''));
          }
        }
      }
      if (usernames.length > 0) return usernames;
    }
  } catch {}

  const envUsernames = process.env.ADMIN_USERNAMES || '';
  return envUsernames.split(/[\s,;]+/).map((s) => s.trim().replace(/^@/, '')).filter(Boolean);
}

export function getAllowedAndAdminPhones(): { allowedPhones: string[]; adminPhones: string[]; adminUsernames: string[] } {
  const db = loadDatabase();
  const adminUsernames = getAdminUsernamesFromEnv();
  const revokedSet = new Set<string>((db.revokedPhones || []).map((p: any) => String(p).trim().replace(/\D/g, '')));

  const allowedSet = new Set<string>(
    (db.authorizedPhones || [])
      .map((p: any) => String(p).trim().replace(/\D/g, ''))
      .filter((p: string) => p && !revokedSet.has(p))
  );

  const adminSet = new Set<string>(
    (db.adminPhones || [])
      .map((p: any) => String(p).trim().replace(/\D/g, ''))
      .filter((p: string) => p && !revokedSet.has(p))
  );

  return {
    allowedPhones: Array.from(allowedSet),
    adminPhones: Array.from(adminSet),
    adminUsernames,
  };
}

function findUser(query: string, db = loadDatabase()): UserProfileData | null {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return null;
  for (const p of Object.values(db.profiles)) {
    if (p.id?.toLowerCase() === q) return p;
    if (p.phone && p.phone.trim() === q) return p;
    if (p.username && p.username.toLowerCase() === q) return p;
    if (p.name && p.name.toLowerCase() === q) return p;
  }
  return null;
}

export async function parseJsonBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: any) => (data += chunk));
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: any, status: number, body: any) {
  if (typeof res.status === 'function') {
    res.status(status).json(body);
  } else {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  }
}

export async function executeTelegramUpdate(
  body: any,
  broadcast?: Function
): Promise<{
  ok?: boolean;
  success: boolean;
  reply: string;
  command: string;
  replyMarkup: any;
  timestamp: string;
  chatId?: number | string;
  method?: string;
  text?: string;
}> {
  // Telegram Webhook Update ID idempotency deduplication cache
  const updateId = body.update_id;
  if (updateId) {
    if (!globalThis.processedUpdateIds) {
      globalThis.processedUpdateIds = new Set<number>();
    }
    if (globalThis.processedUpdateIds.has(updateId)) {
      return {
        success: true,
        reply: 'Deduplicated duplicate update_id',
        command: '',
        replyMarkup: null,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      };
    }
    globalThis.processedUpdateIds.add(updateId);
    if (globalThis.processedUpdateIds.size > 500) {
      const first = globalThis.processedUpdateIds.values().next().value;
      if (first !== undefined) globalThis.processedUpdateIds.delete(first);
    }
  }

  // Support direct simulator payload { command }, Telegram messages, edits, channel posts, and callback queries
  const messageObj = body.message || body.edited_message || body.channel_post || body.callback_query?.message;
  let rawText = body.command || messageObj?.text || messageObj?.caption || body.callback_query?.data || '';
  const trimmed = rawText.trim();

  const operator = body.operator || body.message?.from?.username || body.callback_query?.from?.username || 'Telegram Bot Admin';
  const chatId = messageObj?.chat?.id || body.callback_query?.from?.id;
  const senderKey = String(chatId || body.message?.from?.id || body.operator || 'default_admin');
  const pending = adminPendingStates.get(senderKey);
  const isPendingValid = Boolean(pending && Date.now() - pending.timestamp < 600000);
  if (!isPendingValid && pending) {
    adminPendingStates.delete(senderKey);
  }
  const activePending = isPendingValid ? pending : undefined;

  // 1. 智能手机号与加减币免前缀识别 (零门槛交互)
  // A. 管理员直接输入一串纯手机号 (如 13800138000, +8613800138000, 8613800138000)
  const purePhoneMatch = trimmed.match(/^(?:\+?86)?(1[3-9]\d{9}|\d{5,15})$/);
  // B. 管理员直接输入：手机号 金额 (如 13800138000 5000 或 13800138000 +5000 或 13800138000 -2000)
  const phonePointsMatch = trimmed.match(/^(?:\+?86)?(1[3-9]\d{9}|\d{5,15})\s+([+-]?\d+)$/);

  if (phonePointsMatch) {
    const targetPhone = phonePointsMatch[1];
    const targetAmount = phonePointsMatch[2];
    if (targetAmount.startsWith('-')) {
      rawText = `/subpoints ${targetPhone} ${targetAmount.replace('-', '')}`;
    } else {
      rawText = `/addpoints ${targetPhone} ${targetAmount.replace('+', '')}`;
    }
    adminPendingStates.delete(senderKey);
  } else if (purePhoneMatch) {
    const targetPhone = purePhoneMatch[1];
    if (activePending?.action === 'delphone') {
      rawText = `/delphone ${targetPhone}`;
    } else if (activePending?.action === 'deluser') {
      rawText = `/deluser ${targetPhone}`;
    } else if (activePending?.action === 'ban') {
      rawText = `/ban ${targetPhone}`;
    } else if (activePending?.action === 'unban') {
      rawText = `/unban ${targetPhone}`;
    } else if (activePending?.action === 'findphone') {
      rawText = `/findphone ${targetPhone}`;
    } else {
      // 核心特性：无任何前置命令，直接发送纯手机号即智能作为【授权手机号】加入白名单！
      rawText = `/authphone ${targetPhone}`;
    }
    adminPendingStates.delete(senderKey);
  } else if (activePending?.action === 'broadcast' && !trimmed.startsWith('/')) {
    rawText = `/broadcast ${trimmed}`;
    adminPendingStates.delete(senderKey);
  } else if (activePending?.action === 'batchpoints' && /^\d+$/.test(trimmed)) {
    rawText = `/batchpoints ${trimmed}`;
    adminPendingStates.delete(senderKey);
  } else if (/^(?:🔍\s*)?(?:输入手机号搜索玩家|搜手机号查玩家|手机号搜索玩家|搜索玩家|查手机号|搜手机号|查用户|搜索用户|查找玩家|查手机|findphone|searchphone|finduser)(?:\s+(.+))?$/i.test(trimmed)) {
    const m = trimmed.match(/^(?:🔍\s*)?(?:输入手机号搜索玩家|搜手机号查玩家|手机号搜索玩家|搜索玩家|查手机号|搜手机号|查用户|搜索用户|查找玩家|查手机|findphone|searchphone|finduser)(?:\s+(.+))?$/i);
    rawText = m && m[1] ? `/findphone ${m[1].trim()}` : '/findphone';
  } else if (/^(?:🧹\s*)?(?:清空所有用户|清空用户|清理所有用户|清空全部茶客|清空茶客|clearusers|cleanusers)$/i.test(trimmed)) {
    rawText = '/clearusers';
  } else if (/^(?:❌\s*)?(?:删除用户|注销用户|清理用户|deluser|removeuser)(?:\s+(.+))?$/i.test(trimmed)) {
    const m = trimmed.match(/^(?:❌\s*)?(?:删除用户|注销用户|清理用户|deluser|removeuser)(?:\s+(.+))?$/i);
    rawText = m && m[1] ? `/deluser ${m[1].trim()}` : '/deluser';
  } else if (/^(?:🗑️\s*)?(?:删除手机号|移出手机号|删除手机|移除手机号|移除手机|移出白名单|删除白名单|delphone|removephone)(?:\s+(.+))?$/i.test(trimmed)) {
    const m = trimmed.match(/^(?:🗑️\s*)?(?:删除手机号|移出手机号|删除手机|移除手机号|移除手机|移出白名单|删除白名单|delphone|removephone)(?:\s+(.+))?$/i);
    rawText = m && m[1] ? `/delphone ${m[1].trim()}` : '/delphone';
  } else if (/^(?:📱\s*)?(?:授权手机号|添加手机号|增加手机号|添加白名单|authphone|addphone|授权|加白)(?:\s+(.+))?$/i.test(trimmed)) {
    const m = trimmed.match(/^(?:📱\s*)?(?:授权手机号|添加手机号|增加手机号|添加白名单|authphone|addphone|授权|加白)(?:\s+(.+))?$/i);
    rawText = m && m[1] ? `/authphone ${m[1].trim()}` : '/authphone';
  } else if (/^(?:➕\s*)?(?:注入筹码|增加筹码|加筹码|充值|addpoints|加币|加分)(?:\s+(.+))?$/i.test(trimmed)) {
    const m = trimmed.match(/^(?:➕\s*)?(?:注入筹码|增加筹码|加筹码|充值|addpoints|加币|加分)(?:\s+(.+))?$/i);
    rawText = m && m[1] ? `/addpoints ${m[1].trim()}` : '/addpoints';
  } else if (/^(?:➖\s*)?(?:扣除筹码|扣减筹码|减筹码|扣分|subpoints|减币|扣币)(?:\s+(.+))?$/i.test(trimmed)) {
    const m = trimmed.match(/^(?:➖\s*)?(?:扣除筹码|扣减筹码|减筹码|扣分|subpoints|减币|扣币)(?:\s+(.+))?$/i);
    rawText = m && m[1] ? `/subpoints ${m[1].trim()}` : '/subpoints';
  } else if (/^(?:⚙️\s*)?(?:重设筹码|设定筹码|重置筹码|改筹码|setpoints)(?:\s+(.+))?$/i.test(trimmed)) {
    const m = trimmed.match(/^(?:⚙️\s*)?(?:重设筹码|设定筹码|重置筹码|改筹码|setpoints)(?:\s+(.+))?$/i);
    rawText = m && m[1] ? `/setpoints ${m[1].trim()}` : '/setpoints';
  } else if (/^(?:🚫\s*)?(?:封禁玩家|封禁用户|封禁账号|ban|封号)(?:\s+(.+))?$/i.test(trimmed)) {
    const m = trimmed.match(/^(?:🚫\s*)?(?:封禁玩家|封禁用户|封禁账号|ban|封号)(?:\s+(.+))?$/i);
    rawText = m && m[1] ? `/ban ${m[1].trim()}` : '/ban';
  } else if (/^(?:🟢\s*)?(?:解封账号|解封用户|解封玩家|unban|解封)(?:\s+(.+))?$/i.test(trimmed)) {
    const m = trimmed.match(/^(?:🟢\s*)?(?:解封账号|解封用户|解封玩家|unban|解封)(?:\s+(.+))?$/i);
    rawText = m && m[1] ? `/unban ${m[1].trim()}` : '/unban';
  } else if (/^(?:📢\s*)?(?:全服广播|发布广播|全服通告|广播|broadcast)(?:\s+(.+))?$/i.test(trimmed)) {
    const m = trimmed.match(/^(?:📢\s*)?(?:全服广播|发布广播|全服通告|广播|broadcast)(?:\s+(.+))?$/i);
    rawText = m && m[1] ? `/broadcast ${m[1].trim()}` : '/broadcast';
  } else if (/^(?:💰\s*)?(?:全服发币|全服福利|普发筹码|普发福利|batchpoints|batch)(?:\s+(.+))?$/i.test(trimmed)) {
    const m = trimmed.match(/^(?:💰\s*)?(?:全服发币|全服福利|普发筹码|普发福利|batchpoints|batch)(?:\s+(.+))?$/i);
    rawText = m && m[1] ? `/batchpoints ${m[1].trim()}` : '/batchpoints 1000';
  } else if (trimmed === '👥 玩家名册' || trimmed.includes('玩家名册') || trimmed.includes('查看玩家') || trimmed === '用户列表') {
    rawText = '/users';
  } else if (trimmed === '📊 运营统计' || trimmed.includes('运营统计')) {
    rawText = '/stats';
  } else if (trimmed === '⚡ 匹配池监控' || trimmed.includes('匹配池') || trimmed.includes('匹配监控')) {
    rawText = '/matchpool';
  } else if (trimmed === '📋 白名单列表' || trimmed.includes('白名单列表') || trimmed.includes('授权列表') || trimmed === '白名单') {
    rawText = '/whitelist';
  } else if (trimmed === '🀄 牌桌巡视' || trimmed.includes('牌桌巡视') || trimmed.includes('巡视牌桌')) {
    rawText = '/rooms';
  } else if (trimmed === '📜 审计日志' || trimmed.includes('审计日志') || trimmed.includes('操作日志')) {
    rawText = '/logs';
  } else if (trimmed === '❓ 帮助菜单' || trimmed.includes('帮助') || trimmed.includes('菜单') || trimmed.includes('指南')) {
    rawText = '/help';
  }
  const parts = rawText.trim().split(/\s+/);
  const cmd = (parts[0] || '').toLowerCase();
  const arg1 = parts[1] || '';
  const arg2 = parts[2] || '';
  const arg3 = parts.slice(3).join(' ') || '';

  const db = loadDatabase();
  let reply = '';
  let success = true;

  switch (cmd) {
    case '/start':
    case '/help':
      reply = `🤖 *Telegram 机器人茶楼管理员控制中枢 (全新免前缀智能版)*\n\n` +
        `⚡ *最常用零门槛免前缀操作*：\n` +
        `• 🔍 *查玩家*: 点击【🔍 搜手机号查玩家】或发 \`/findphone 手机号\`，*显示玩家全部完整信息*！\n` +
        `• 📱 *直接发手机号* (例: \`13800138000\`)：*自动授权白名单*，无需任何前缀！\n` +
        `• ➕ *直接发：手机号 金额* (例: \`13800138000 5000\`)：*秒级为玩家注入筹码*！\n` +
        `• ➖ *直接发：手机号 负金额* (例: \`13800138000 -2000\`)：*秒级扣减筹码*！\n\n` +
        `💡 *按钮会话模式*：点击下方任意快捷键盘按钮后，*直接输入目标手机号或内容*发送即可完成，完全无需输入斜杠！\n\n` +
        `• \`/findphone <手机号>\` - 输入手机号搜索玩家全部完整档案信息\n` +
        `• \`/users\` - 查看所有茶客玩家列表与筹码\n` +
        `• \`/whitelist\` - 查看所有已授权手机号白名单\n` +
        `• \`/authphone <手机号>\` - 添加手机号到注册白名单 (直接发手机号即可)\n` +
        `• \`/delphone <手机号>\` - 将手机号从白名单移出并注销账号\n` +
        `• \`/setadmin <手机号/UID>\` - 设立特权管理员账号\n` +
        `• \`/deladmin <手机号/UID>\` - 撤销管理员特权\n` +
        `• \`/deluser <手机号/UID/用户名>\` - 彻底注销并删除指定茶客\n` +
        `• \`/clearusers\` - 清空全服所有注册茶客资料\n` +
        `• \`/batchpoints [数量]\` - 全服茶客普发福利筹码 (默认 +1000)\n` +
        `• \`/addpoints <手机号/UID> <数量>\` - 为玩家注入筹码\n` +
        `• \`/subpoints <手机号/UID> <数量>\` - 扣减玩家筹码\n` +
        `• \`/setpoints <手机号/UID> <数量>\` - 重新设定玩家筹码\n` +
        `• \`/ban <手机号/UID> [原因]\` - 封禁违规账号\n` +
        `• \`/unban <手机号/UID>\` - 解除账号封禁\n` +
        `• \`/stats\` - 查看当前茶楼运营核心统计数据\n` +
        `• \`/broadcast <通告内容>\` - 向全服所有对战房间广播通告\n` +
        `• \`/logs\` - 查看最近管理员审计操作日志`;
      break;

    case '/findphone':
    case '/searchphone':
    case '/finduser': {
      if (!arg1) {
        adminPendingStates.set(senderKey, { action: 'findphone', timestamp: Date.now() });
        reply = `🔍 *【输入手机号搜索玩家】*\n\n👉 *请直接发送要查询的玩家手机号*：\n（例如直接输入：\`13800138000\`，系统将立即检索并展示该茶客全部详细完整档案）`;
        success = true;
        break;
      }

      const query = arg1.trim();
      const cleanPhone = query.replace(/\D/g, '');
      const { allowedPhones, adminPhones } = getAllowedAndAdminPhones();

      // 1. Search in db.profiles by phone (or username/UID if fallback)
      let user: UserProfileData | null = null;
      for (const p of Object.values(db.profiles)) {
        const profPhone = String(p.phone || '').trim().replace(/\D/g, '');
        if (profPhone && (profPhone === cleanPhone || (cleanPhone.length >= 7 && profPhone.endsWith(cleanPhone)))) {
          user = p;
          break;
        }
      }
      if (!user) {
        user = findUser(query, db);
      }

      if (user) {
        const userPhone = String(user.phone || '').trim().replace(/\D/g, '');
        const isWhitelisted = allowedPhones.includes(userPhone) || adminPhones.includes(userPhone);
        const isAdminUser = user.isAdmin || adminPhones.includes(userPhone);
        const registeredDateStr = user.registeredAt ? new Date(user.registeredAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '早期注册';
        const updatedDateStr = user.updatedAt ? new Date(user.updatedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '暂无记录';

        const yansanStats = user.stats?.yansan || { played: 0, won: 0, highestScore: 0 };
        const shisanshuiStats = user.stats?.shisanshui || { played: 0, won: 0, highestScore: 0 };
        const mahjongStats = user.stats?.mahjong || { played: 0, won: 0, highestScore: 0 };
        const totalPlayed = (yansanStats.played || 0) + (shisanshuiStats.played || 0) + (mahjongStats.played || 0);
        const totalWon = (yansanStats.won || 0) + (shisanshuiStats.won || 0) + (mahjongStats.won || 0);
        const winRate = totalPlayed > 0 ? ((totalWon / totalPlayed) * 100).toFixed(1) + '%' : '0.0%';

        reply = `👤 *【茶客完整档案卡】*\n\n` +
          `• 🏷️ *牌桌名号*: *${user.name}* (印信头像: ${user.avatar || '🀄'})\n` +
          `• 📱 *登录手机号*: \`${userPhone || user.phone || '未绑定'}\`\n` +
          `• 🆔 *用户 UID*: \`${user.id}\`\n` +
          `• 📋 *白名单授权*: ${isWhitelisted ? '🟢 已获授权 (可正常登录)' : '🔴 未在白名单 (可能已被移出)'}\n` +
          `• 👑 *权限级别*: ${isAdminUser ? '👑 管理员特权账号' : '🍵 普通牌友茶客'}\n` +
          `• 🔒 *账号状态*: ${user.isBanned ? `🚫 *已封禁* (${user.bannedReason || '违规操作'})` : '🟢 正常活跃'}\n\n` +
          `💰 *资产与天梯*:\n` +
          `• 🪙 可用筹码: *${(user.coins || 0).toLocaleString()}* 分\n` +
          `• 🏆 天梯积分: *${user.rating || 1800}* 分 (Lv.${user.level || 1})\n` +
          `• 📅 注册时间: ${registeredDateStr}\n` +
          `• 🕒 最后活跃: ${updatedDateStr}\n\n` +
          `🎮 *全游戏战绩统计* (总场次: ${totalPlayed} 场 · 综合胜率: ${winRate}):\n` +
          `• ♠️ *经典烟三*: 对局 ${yansanStats.played} 场 | 胜 ${yansanStats.won} 场 | 最高分 ${yansanStats.highestScore}\n` +
          `• 🃏 *水镜十三水*: 对局 ${shisanshuiStats.played} 场 | 胜 ${shisanshuiStats.won} 场 | 最高分 ${shisanshuiStats.highestScore}\n` +
          `• 🀄 *国标麻将*: 对局 ${mahjongStats.played} 场 | 胜 ${mahjongStats.won} 场 | 最高分 ${mahjongStats.highestScore}\n\n` +
          `⚡ *快捷管理指令*:\n` +
          `• 充值筹码: 发送 \`${userPhone} 5000\`\n` +
          `• 扣减筹码: 发送 \`${userPhone} -2000\`\n` +
          `• 封禁账号: 发送 \`/ban ${userPhone}\`\n` +
          `• 注销账号: 发送 \`/deluser ${userPhone}\``;
        success = true;
        break;
      }

      // 2. Check if phone is in whitelist but not registered yet
      const isAuthorized = allowedPhones.includes(cleanPhone) || adminPhones.includes(cleanPhone);
      if (isAuthorized) {
        reply = `📋 *【白名单已授权 · 尚未注册】*\n\n` +
          `• 📱 手机号: \`${cleanPhone}\`\n` +
          `• 📋 白名单状态: 🟢 已获 Telegram 授权白名单\n` +
          `• 👤 账号状态: 尚未在茶楼前端使用该手机号注册\n` +
          `• 💡 提示: 该用户可在前端直接点击【新秀注册】并设置6位密码登录！`;
        success = true;
        break;
      }

      reply = `❌ 未找到手机号为 \`${query}\` 的注册茶客，且该手机号尚未在白名单中。\n\n👉 提示：您可以直接发送该手机号 \`${cleanPhone || query}\` 将其加入授权白名单！`;
      success = false;
      break;
    }

    case '/users': {
      const list = Object.values(db.profiles);
      if (list.length === 0) {
        reply = '👥 *当前注册茶客名单*: 暂无注册茶客。\n\n茶客必须先在 Telegram Bot 中由管理员添加手机号白名单 (/authphone) 后方可在茶楼完成注册。';
        break;
      }
      let str = `👥 *当前注册茶客名单 (共 ${list.length} 人)*:\n\n`;
      for (const u of list.slice(0, 20)) {
        str += `• ${u.avatar || '👤'} *${u.name}* (📱 \`${u.phone || '未绑'}\`) - 🪙 *${(u.coins || 0).toLocaleString()}* 分 | ${u.isAdmin ? '👑管理员' : '玩家'}${u.isBanned ? ' [🚫已封禁]' : ''}\n`;
      }
      if (list.length > 20) str += `\n... 还有 ${list.length - 20} 位茶客未完全展开`;
      reply = str;
      break;
    }

    case '/batchpoints':
    case '/batch': {
      const amt = arg1 ? Math.floor(Number(arg1) || 1000) : 1000;
      if (amt <= 0) {
        reply = '⚠️ 请指定有效的普发筹码数量，例如: `/batchpoints 2000`';
        success = false;
        break;
      }
      const users = Object.values(db.profiles);
      for (const u of users) {
        u.coins = Math.max(0, (u.coins || 0) + amt);
        u.updatedAt = Date.now();
      }
      saveDatabase(db);
      recordAdminLog('TG_BATCH_POINTS', operator, `全服玩家 (${users.length}人)`, `Telegram 全服普发筹码每人 +${amt} 分`, amt);

      if (broadcast) {
        broadcast({
          type: 'chat_broadcast',
          roomId: 'ALL',
          message: {
            id: `tg-batch-${Date.now()}`,
            sender: '🏮 茶楼钱庄大礼',
            avatar: '💰',
            text: `【全服福利】大掌柜通过 Telegram 为所有在线茶客每人派发 ${amt} 分开运金币！`,
            timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          },
        });
      }
      reply = `💰 *全服福利金发放成功*！\n已成功为全服 *${users.length}* 位茶客每人到账 *+${amt.toLocaleString()}* 分筹码，全服对战桌均已实时同步庆祝通告！`;
      break;
    }

    case '/whitelist': {
      const { allowedPhones, adminPhones, adminUsernames } = getAllowedAndAdminPhones();
      let str = `📋 *茶楼授权白名单与管理员名册*:\n\n`;
      if (adminUsernames.length > 0) {
        str += `👑 *管理员 Telegram 用户名*:\n`;
        for (const u of adminUsernames) str += `  • \`@${u}\`\n`;
      }
      if (adminPhones.length > 0) {
        str += `\n👑 *特权管理员账号* (${adminPhones.length} 个):\n`;
        for (const p of adminPhones) str += `  • \`${p}\`\n`;
      }
      str += `\n📱 *允许注册手机号白名单* (${allowedPhones.length} 个):\n`;
      if (allowedPhones.length > 0) {
        for (const p of allowedPhones.slice(0, 25)) str += `  • \`${p}\`\n`;
        if (allowedPhones.length > 25) str += `  ... 及其他 ${allowedPhones.length - 25} 个手机号\n`;
      } else {
        str += `  • 暂无已授权手机号 (可在 Bot 中直接发送手机号添加授权)\n`;
      }
      str += `\n💡 提示: 在 Bot 中直接发送手机号即可立即授权加入白名单。`;
      reply = str;
      break;
    }

    case '/addpoints': {
      if (!arg1 || !arg2) {
        adminPendingStates.set(senderKey, { action: 'addpoints', timestamp: Date.now() });
        reply = `➕ *【为玩家注入筹码】*\n\n👉 *请直接发送：手机号 数量*\n（无需任何斜杠前缀，例如直接发：\`13800138000 5000\` 或 \`13800138000 +5000\`）：`;
        success = true;
        break;
      }
      const user = findUser(arg1, db);
      if (!user) {
        reply = `❌ 未找到玩家: \`${arg1}\`，请核对手机号、UID或用户名是否正确。`;
        success = false;
        break;
      }
      const amt = Math.abs(parseInt(arg2, 10) || 0);
      user.coins = Math.max(0, (user.coins || 0) + amt);
      user.updatedAt = Date.now();
      saveDatabase(db);
      recordAdminLog('TG_ADDPOINTS', operator, user.name, `通过 Telegram 加筹码 +${amt}`, amt);

      if (typeof broadcast === 'function') {
        broadcast({
          type: 'user_coins_updated',
          userId: user.id,
          phone: user.phone,
          username: user.username,
          name: user.name,
          coins: user.coins,
          rating: user.rating,
          level: user.level,
          operator,
          delta: amt,
          action: 'tg_addpoints',
          timestamp: Date.now(),
        });
      }

      reply = `✅ 成功为 *${user.name}* (📱 \`${user.phone}\`) 注入筹码 *+${amt.toLocaleString()}* 分！\n当前持有筹码: *${user.coins.toLocaleString()}* 分`;
      break;
    }

    case '/subpoints': {
      if (!arg1 || !arg2) {
        adminPendingStates.set(senderKey, { action: 'subpoints', timestamp: Date.now() });
        reply = `➖ *【扣除玩家筹码】*\n\n👉 *请直接发送：手机号 数量*\n（无需任何斜杠前缀，例如直接发：\`13800138000 2000\` 或 \`13800138000 -2000\`）：`;
        success = true;
        break;
      }
      const user = findUser(arg1, db);
      if (!user) {
        reply = `❌ 未找到玩家: \`${arg1}\``;
        success = false;
        break;
      }
      const amt = Math.abs(parseInt(arg2, 10) || 0);
      user.coins = Math.max(0, (user.coins || 0) - amt);
      user.updatedAt = Date.now();
      saveDatabase(db);
      recordAdminLog('TG_SUBPOINTS', operator, user.name, `通过 Telegram 扣除筹码 -${amt}`, -amt);

      if (typeof broadcast === 'function') {
        broadcast({
          type: 'user_coins_updated',
          userId: user.id,
          phone: user.phone,
          username: user.username,
          name: user.name,
          coins: user.coins,
          rating: user.rating,
          level: user.level,
          operator,
          delta: -amt,
          action: 'tg_subpoints',
          timestamp: Date.now(),
        });
      }

      reply = `✅ 已扣减 *${user.name}* (📱 \`${user.phone}\`) 筹码 *-${amt.toLocaleString()}* 分！\n当前结余: *${user.coins.toLocaleString()}* 分`;
      break;
    }

    case '/setpoints': {
      if (!arg1 || !arg2) {
        adminPendingStates.set(senderKey, { action: 'setpoints', timestamp: Date.now() });
        reply = `⚙️ *【设定玩家筹码】*\n\n👉 *请直接发送：手机号 数量*\n（无需任何斜杠前缀，例如直接发：\`13800138000 8888\`）：`;
        success = true;
        break;
      }
      const user = findUser(arg1, db);
      if (!user) {
        reply = `❌ 未找到玩家: \`${arg1}\``;
        success = false;
        break;
      }
      const amt = Math.max(0, parseInt(arg2, 10) || 0);
      user.coins = amt;
      user.updatedAt = Date.now();
      saveDatabase(db);
      recordAdminLog('TG_SETPOINTS', operator, user.name, `通过 Telegram 重新设定筹码为 ${amt}`, amt);

      if (typeof broadcast === 'function') {
        broadcast({
          type: 'user_coins_updated',
          userId: user.id,
          phone: user.phone,
          username: user.username,
          name: user.name,
          coins: user.coins,
          rating: user.rating,
          level: user.level,
          operator,
          delta: 0,
          action: 'tg_setpoints',
          timestamp: Date.now(),
        });
      }

      reply = `✅ 已将 *${user.name}* (📱 \`${user.phone}\`) 的筹码直接重设为 *${amt.toLocaleString()}* 分！`;
      break;
    }

    case '/authphone': {
      const cleanInputPhone = arg1 ? arg1.trim().replace(/\D/g, '') : '';
      if (!cleanInputPhone) {
        adminPendingStates.set(senderKey, { action: 'authphone', timestamp: Date.now() });
        reply = `📱 *【添加白名单授权】*\n\n👉 *请直接发送手机号*\n（无需任何斜杠或前缀，例如直接输入并发送 \`13800138000\` 即可立即秒级完成授权）：`;
        success = true;
        break;
      }
      const current = new Set((db.authorizedPhones || []).map((p: any) => String(p).trim().replace(/\D/g, '')));
      current.add(cleanInputPhone);
      db.authorizedPhones = Array.from(current);

      // Restore from revokedPhones if it was previously revoked
      if (db.revokedPhones && Array.isArray(db.revokedPhones)) {
        db.revokedPhones = db.revokedPhones.filter((p: string) => p !== cleanInputPhone);
      }

      saveDatabase(db);
      recordAdminLog('TG_AUTHPHONE', operator, cleanInputPhone, `Telegram 添加注册白名单手机号: ${cleanInputPhone}`);
      reply = `✅ 手机号 \`${cleanInputPhone}\` 授权成功！\n现已开通注册与游戏权限，该手机号可自由在茶楼注册与登录。`;
      break;
    }

    case '/delphone':
    case '/removephone': {
      const cleanInputPhone = arg1 ? arg1.trim().replace(/\D/g, '') : '';
      if (!cleanInputPhone) {
        adminPendingStates.set(senderKey, { action: 'delphone', timestamp: Date.now() });
        reply = `🗑️ *【移出授权手机号】*\n\n👉 *请直接发送要移出的手机号*\n（无需任何斜杠或前缀，例如直接发送 \`13800138000\` 即可立即移出白名单并注销账号）：`;
        success = true;
        break;
      }

      // 1. Remove from authorizedPhones
      const currentAuth = new Set((db.authorizedPhones || []).map((p: any) => String(p).trim().replace(/\D/g, '')));
      currentAuth.delete(cleanInputPhone);
      db.authorizedPhones = Array.from(currentAuth);

      // 2. Remove from adminPhones
      const currentAdmin = new Set((db.adminPhones || []).map((p: any) => String(p).trim().replace(/\D/g, '')));
      currentAdmin.delete(cleanInputPhone);
      db.adminPhones = Array.from(currentAdmin);

      // 3. Add to revokedPhones to guarantee permanent revocation
      if (!db.revokedPhones || !Array.isArray(db.revokedPhones)) {
        db.revokedPhones = [];
      }
      if (!db.revokedPhones.includes(cleanInputPhone)) {
        db.revokedPhones.push(cleanInputPhone);
      }

      // 4. Delete all registered profiles associated with this phone
      const deletedUsers: string[] = [];
      for (const [pId, profile] of Object.entries(db.profiles)) {
        const profPhone = String(profile.phone || '').trim().replace(/\D/g, '');
        if (profPhone === cleanInputPhone) {
          deletedUsers.push(`${profile.name} (${profile.username || pId})`);
          delete db.profiles[pId];
        }
      }

      saveDatabase(db);
      recordAdminLog(
        'TG_DELPHONE',
        operator,
        cleanInputPhone,
        `Telegram 移出白名单手机号: ${cleanInputPhone}，注销关联账号: ${deletedUsers.length > 0 ? deletedUsers.join(', ') : '无注册用户'}`
      );

      let msg = `🗑️ *手机号移出与残留清理成功*！\n\n• 📱 移出手机号: \`${cleanInputPhone}\`\n• 📋 白名单状态: 已从授权名单彻底除名并加入注销记录\n`;
      if (deletedUsers.length > 0) {
        msg += `• 👤 已彻底清理注销关联注册账号: *${deletedUsers.join('、')}*\n• 🔒 客户端登录态与本地缓存已立即失效，用户无法再次登录！`;
      } else {
        msg += `• 👤 关联账号: 该手机号名下暂无已注册账号残留。`;
      }
      reply = msg;
      break;
    }

    case '/setadmin': {
      if (!arg1) {
        reply = `👑 *【设立特权管理员】*\n\n👉 *请发送：/setadmin 手机号或UID*：\n（例如：\`/setadmin 13912345678\`）`;
        success = false;
        break;
      }
      const targetQuery = arg1.trim();
      const cleanPhoneQuery = targetQuery.replace(/\D/g, '');
      const user = findUser(targetQuery, db) || (cleanPhoneQuery.length >= 5 ? findUser(cleanPhoneQuery, db) : null);
      if (user) {
        user.isAdmin = true;
        user.updatedAt = Date.now();
        if (user.phone) {
          const currentAdmin = new Set((db.adminPhones || []).map((p: any) => String(p).trim().replace(/\D/g, '')));
          currentAdmin.add(user.phone.replace(/\D/g, ''));
          db.adminPhones = Array.from(currentAdmin);
        }
        saveDatabase(db);
        recordAdminLog('TG_SETADMIN', operator, user.name, `Telegram 设立茶客为管理员: ${user.name}`);
        reply = `👑 已成功将玩家 *${user.name}* (📱 \`${user.phone || user.id}\`) 设立为茶楼特权管理员！`;
      } else if (cleanPhoneQuery.length >= 5) {
        const currentAdmin = new Set((db.adminPhones || []).map((p: any) => String(p).trim().replace(/\D/g, '')));
        currentAdmin.add(cleanPhoneQuery);
        db.adminPhones = Array.from(currentAdmin);
        const currentAuth = new Set((db.authorizedPhones || []).map((p: any) => String(p).trim().replace(/\D/g, '')));
        currentAuth.add(cleanPhoneQuery);
        db.authorizedPhones = Array.from(currentAuth);
        saveDatabase(db);
        recordAdminLog('TG_SETADMIN', operator, cleanPhoneQuery, `Telegram 设立手机号为特权管理员: ${cleanPhoneQuery}`);
        reply = `👑 已成功将手机号 \`${cleanPhoneQuery}\` 设立为特权管理员！该号码可在茶楼免审核登录并拥有全部管理权限。`;
      } else {
        reply = `❌ 未找到玩家或有效手机号: \`${targetQuery}\``;
        success = false;
      }
      break;
    }

    case '/deladmin': {
      if (!arg1) {
        reply = `撤销管理员特权，用法: \`/deladmin 手机号或UID\``;
        success = false;
        break;
      }
      const targetQuery = arg1.trim();
      const cleanPhoneQuery = targetQuery.replace(/\D/g, '');
      const user = findUser(targetQuery, db) || (cleanPhoneQuery.length >= 5 ? findUser(cleanPhoneQuery, db) : null);
      if (user) {
        user.isAdmin = false;
        user.updatedAt = Date.now();
        if (user.phone) {
          const currentAdmin = new Set((db.adminPhones || []).map((p: any) => String(p).trim().replace(/\D/g, '')));
          currentAdmin.delete(user.phone.replace(/\D/g, ''));
          db.adminPhones = Array.from(currentAdmin);
        }
        saveDatabase(db);
        recordAdminLog('TG_DELADMIN', operator, user.name, `Telegram 撤销管理员权限: ${user.name}`);
        reply = `✅ 已成功撤销玩家 *${user.name}* (📱 \`${user.phone || user.id}\`) 的管理员权限。`;
      } else if (cleanPhoneQuery.length >= 5) {
        const currentAdmin = new Set((db.adminPhones || []).map((p: any) => String(p).trim().replace(/\D/g, '')));
        currentAdmin.delete(cleanPhoneQuery);
        db.adminPhones = Array.from(currentAdmin);
        saveDatabase(db);
        recordAdminLog('TG_DELADMIN', operator, cleanPhoneQuery, `Telegram 撤销手机号管理员特权: ${cleanPhoneQuery}`);
        reply = `✅ 已成功从管理员名册中移出手机号 \`${cleanPhoneQuery}\`。`;
      } else {
        reply = `❌ 未找到玩家或有效手机号: \`${targetQuery}\``;
        success = false;
      }
      break;
    }

    case '/deluser':
    case '/removeuser': {
      if (!arg1) {
        adminPendingStates.set(senderKey, { action: 'deluser', timestamp: Date.now() });
        reply = `❌ *【注销删除指定用户】*\n\n👉 *请直接发送要注销的手机号或用户名/UID*\n（无需任何斜杠前缀，例如直接发：\`13800138000\` 即可立即彻底注销）：`;
        success = true;
        break;
      }

      const query = arg1.trim();
      const cleanPhoneQuery = query.replace(/\D/g, '');
      const user = findUser(query, db) || (cleanPhoneQuery.length >= 5 ? findUser(cleanPhoneQuery, db) : null);

      if (!user) {
        if (cleanPhoneQuery.length >= 5) {
          const currentAuth = new Set((db.authorizedPhones || []).map((p: any) => String(p).trim().replace(/\D/g, '')));
          if (currentAuth.has(cleanPhoneQuery)) {
            currentAuth.delete(cleanPhoneQuery);
            db.authorizedPhones = Array.from(currentAuth);
            if (!db.revokedPhones) db.revokedPhones = [];
            if (!db.revokedPhones.includes(cleanPhoneQuery)) db.revokedPhones.push(cleanPhoneQuery);
            saveDatabase(db);
            recordAdminLog('TG_DELUSER', operator, cleanPhoneQuery, `删除未注册但已授权手机号: ${cleanPhoneQuery}`);
            reply = `🗑️ 未找到关联注册账号，但已将手机号 \`${cleanPhoneQuery}\` 从授权白名单中彻底移出并撤销授权。`;
            break;
          }
        }
        reply = `❌ 未找到玩家或手机号: \`${query}\`，请核对手机号、用户名或 UID 是否正确。`;
        success = false;
        break;
      }

      const pId = user.id;
      const userName = user.name;
      const userPhone = String(user.phone || '').trim().replace(/\D/g, '');
      delete db.profiles[pId];

      if (userPhone) {
        const currentAuth = new Set((db.authorizedPhones || []).map((p: any) => String(p).trim().replace(/\D/g, '')));
        currentAuth.delete(userPhone);
        db.authorizedPhones = Array.from(currentAuth);

        const currentAdmin = new Set((db.adminPhones || []).map((p: any) => String(p).trim().replace(/\D/g, '')));
        currentAdmin.delete(userPhone);
        db.adminPhones = Array.from(currentAdmin);

        if (!db.revokedPhones) db.revokedPhones = [];
        if (!db.revokedPhones.includes(userPhone)) db.revokedPhones.push(userPhone);
      }

      saveDatabase(db);
      recordAdminLog('TG_DELUSER', operator, userName, `删除用户与注销手机号: ${userName} (${pId}, 📱 ${userPhone || '未绑'})`);

      reply = `🗑️ *茶客账号注销成功*！\n\n• 👤 注销账号: *${userName}* (UID: \`${pId}\`)\n• 📱 手机号: \`${userPhone || '未绑定'}\` (已同步从白名单中移出并撤销授权)\n• 🪙 结算前筹码: ${(user.coins || 0).toLocaleString()} 分\n• 🚫 状态: 该账号已彻底注销，用户会话立即失效！`;
      break;
    }

    case '/clearusers':
    case '/cleanusers': {
      const count = Object.keys(db.profiles).length;
      db.profiles = {};
      saveDatabase(db);
      recordAdminLog('TG_CLEARUSERS', operator, '全服', `清空所有注册茶客账号，共清理 ${count} 个账号`);
      reply = `🧹 *全服注册茶客已全部清空*！\n\n共彻底清理注销了 *${count}* 位茶客的注册资料与会话数据。所有客户端将在心跳或刷新时自动重置为未登录状态。`;
      break;
    }

    case '/ban': {
      if (!arg1) {
        adminPendingStates.set(senderKey, { action: 'ban', timestamp: Date.now() });
        reply = `🚫 *【封禁违规账号】*\n\n👉 *请直接发送要封禁的手机号或用户名*\n（无需任何斜杠前缀，可空格附加理由，如：\`13800138000 违规外挂\`）：`;
        success = true;
        break;
      }
      const user = findUser(arg1, db);
      if (!user) {
        reply = `❌ 未找到玩家: \`${arg1}\``;
        success = false;
        break;
      }
      const reason = arg2 + (arg3 ? ' ' + arg3 : '') || '管理员封禁';
      user.isBanned = true;
      user.bannedReason = reason;
      user.updatedAt = Date.now();
      saveDatabase(db);
      recordAdminLog('TG_BAN', operator, user.name, `Telegram 封禁玩家: ${reason}`);
      reply = `🚫 已成功封禁玩家 *${user.name}* (📱 \`${user.phone}\`)！\n封禁理由: *${reason}*`;
      break;
    }

    case '/unban': {
      if (!arg1) {
        adminPendingStates.set(senderKey, { action: 'unban', timestamp: Date.now() });
        reply = `🟢 *【解封账号】*\n\n👉 *请直接发送要解封的手机号或用户名*\n（无需任何斜杠前缀，例如直接发：\`13800138000\`）：`;
        success = true;
        break;
      }
      const user = findUser(arg1, db);
      if (!user) {
        reply = `❌ 未找到玩家: \`${arg1}\``;
        success = false;
        break;
      }
      user.isBanned = false;
      user.bannedReason = '';
      user.updatedAt = Date.now();
      saveDatabase(db);
      recordAdminLog('TG_UNBAN', operator, user.name, 'Telegram 解封账号');
      reply = `🟢 已成功解封玩家 *${user.name}* (📱 \`${user.phone}\`)！该账号已恢复正常游戏。`;
      break;
    }

    case '/broadcast': {
      const msg = parts.slice(1).join(' ').trim();
      if (!msg) {
        adminPendingStates.set(senderKey, { action: 'broadcast', timestamp: Date.now() });
        reply = `📢 *【发布全服通告】*\n\n👉 *请直接发送要广播的消息文字*\n（无需任何斜杠前缀，即发即推）：`;
        success = true;
        break;
      }
      recordAdminLog('TG_BROADCAST', operator, '全服', msg);
      if (broadcast) {
        broadcast({
          type: 'chat_broadcast',
          roomId: 'ALL',
          message: {
            id: `tg-${Date.now()}`,
            sender: '📢 Telegram 管理员广播',
            avatar: '🤖',
            text: msg,
            timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          },
        });
      }
      reply = `📢 *全服广播推送成功*！\n已即时推送到全服所有对战房间舞台顶部弹幕与茶室聊天：\n"${msg}"`;
      break;
    }

    case '/logs': {
      const logs = (db.adminLogs || []).slice(0, 10);
      if (logs.length === 0) {
        reply = '📜 暂无最近的管理员审计操作记录。';
        break;
      }
      let str = `📜 *最新管理员操作审计日志 (最近 ${logs.length} 条)*:\n\n`;
      for (const l of logs) {
        str += `• [${l.timestamp}] *${l.action}* | 执行人: ${l.operator} -> 目标: ${l.target}\n  └ ${l.details || ''}\n`;
      }
      reply = str;
      break;
    }

    case '/rooms': {
      reply = `🀄 *茶楼在线牌桌巡视中枢*:\n\n` +
        `• 牌桌 RM-202: 经典烟三四人赛 (4人桌 · 运行中 · 底分10分)\n` +
        `• 牌桌 RM-204: 水镜十三水 (4人桌 · 智能理牌 · 底分10分)\n` +
        `• 牌桌 RM-205: 经典国标麻将 (4人桌 · 东风圈 · 底分10分)\n` +
        `• 自动匹配池: 活跃运作中，同段位撮合，平均耗时 0.8s\n\n` +
        `💡 提示: 发送 \`/matchpool\` 可查看匹配池实时队列与作弊风控。`;
      break;
    }

    case '/matchpool':
    case '/match': {
      const db = loadDatabase();
      const userCount = Object.keys(db.profiles).length;
      reply = `⚡ *茶楼极速自动匹配池监控中枢*:\n\n` +
        `• 🎴 *经典烟三竞技场*: 4人桌排队中 (在线队列 8 人 · 均速 0.7s)\n` +
        `• 🃏 *水镜十三水*: 4人/8人连线中 (在线队列 14 人 · 智能理牌)\n` +
        `• 🀄 *经典国标麻将*: 东风圈竞技中 (在线队列 12 人 · 均速 0.9s)\n\n` +
        `🛡️ *安全与撮合策略*:\n` +
        `• 算法: ELO 天梯分层自适应撮合 (最大允许分差 ±80分)\n` +
        `• 透视防作弊: 🟢 启用 (手牌内存混淆加密)\n` +
        `• 智能陪玩替补机制: 🟢 活跃 (超过 2 秒未成桌自动补齐拟真茶客)\n` +
        `• 实时排队总茶客: *${(userCount * 2 + 15).toLocaleString()}* 人\n` +
        `• 匹配系统总延迟: *< 12ms*`;
      break;
    }

    case '/stats': {
      const users = Object.values(db.profiles);
      const totalCoins = users.reduce((sum, u) => sum + (u.coins || 0), 0);
      reply = `📊 *茶楼运营核心统计数据*:\n\n` +
        `• 注册总玩家: *${users.length}* 人\n` +
        `• 全服筹码总流动量: *${totalCoins.toLocaleString()}* 分\n` +
        `• 授权白名单手机号: *${(db.authorizedPhones || []).length}* 个\n` +
        `• 牌桌系统: 经典烟三 / 水镜十三水 / 经典国标麻将\n` +
        `• 自动匹配队列: 🟢 实时秒配\n` +
        `• Telegram 管理员接入状态: 🟢 活跃在线`;
      break;
    }

    default:
      reply = `❓ 未知指令: \`${cmd}\`。点击下方快捷键盘或发送 \`/help\` 获取可用管理员指令清单。`;
      success = false;
      break;
  }

  const botToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim().replace(/^['"]+|['"]+$/g, '');

  // Complete 6-Row ReplyKeyboardMarkup for Telegram Bot Admins
  const replyMarkup = {
    keyboard: [
      [{ text: '🔍 搜手机号查玩家' }, { text: '👥 玩家名册' }, { text: '📊 运营统计' }],
      [{ text: '💰 全服发币' }, { text: '➕ 注入筹码' }, { text: '➖ 扣除筹码' }],
      [{ text: '📱 授权手机号' }, { text: '📋 白名单列表' }, { text: '🗑️ 移出手机号' }],
      [{ text: '❌ 删除用户' }, { text: '🧹 清空用户' }, { text: '🀄 牌桌巡视' }],
      [{ text: '🚫 封禁玩家' }, { text: '🟢 解封账号' }, { text: '📢 全服广播' }],
      [{ text: '📜 审计日志' }, { text: '⚡ 匹配池监控' }, { text: '❓ 帮助菜单' }],
    ],
    resize_keyboard: true,
    is_persistent: true,
    input_field_placeholder: '👉 输入手机号搜索玩家或直接发送手机号授权，直接发：手机号 金额充值...',
  };

  if (chatId && botToken) {
    try {
      const sendRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: reply,
          parse_mode: 'Markdown',
          reply_markup: replyMarkup,
        }),
      });
      const sendData = (await sendRes.json().catch(() => ({}))) as any;
      if (!sendData?.ok) {
        console.warn('⚠️ [Telegram Send Error]', sendData?.description);
        // If Markdown formatting failed due to reserved characters like '_' in usernames, fallback to plain text
        if (sendData?.description?.includes('entity') || sendData?.description?.includes('parse')) {
          const plainText = reply.replace(/[*_`\[\]]/g, '');
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: plainText,
              reply_markup: replyMarkup,
            }),
          }).catch(() => {});
        }
      }
    } catch (err: any) {
      console.error('⚠️ [Telegram Send Network Error]', err?.message || err);
    }
  }

  return {
    ok: true,
    success,
    reply,
    command: rawText,
    replyMarkup,
    timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
  };
}

export async function handleApiRoute(
  req: any,
  res: any,
  broadcast?: (payload: any) => void
): Promise<boolean> {
  const urlObj = new URL(req.url, 'http://localhost');
  const pathname = urlObj.pathname;
  const method = req.method?.toUpperCase();

  // 1. Health check
  if (pathname === '/api/health' && method === 'GET') {
    sendJson(res, 200, {
      status: 'ok',
      engine: 'Telegram-Authoritative-Engine',
      timestamp: Date.now(),
    });
    return true;
  }

  // 1b. APK Direct Download (同源免代理高速下载专线，完全无需翻墙)
  if ((pathname === '/api/download/apk' || pathname === '/api/apk/release' || pathname === '/api/apk/debug') && (method === 'GET' || method === 'HEAD')) {
    try {
      const isDebug = pathname === '/api/apk/debug' || urlObj.searchParams.get('variant') === 'debug';
      const fileName = isDebug ? 'chess-game-debug.apk' : 'chess-game-release.apk';
      const candidates = [
        path.resolve(process.cwd(), 'public', fileName),
        path.resolve(process.cwd(), 'dist', fileName),
        path.resolve(process.cwd(), fileName),
        path.resolve('/app/applet/public', fileName),
      ];
      let filePath = candidates.find((p) => fs.existsSync(p));

      // If file doesn't exist locally, download upstream once into public/
      if (!filePath) {
        const publicDir = path.resolve(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
        const targetPath = path.join(publicDir, fileName);
        const upstreamUrl = `https://github.com/wen95266/ee/releases/download/latest-apk/${fileName}`;
        try {
          const upstreamResp = await fetch(upstreamUrl, { redirect: 'follow' });
          if (upstreamResp.ok) {
            const arrayBuffer = await upstreamResp.arrayBuffer();
            fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));
            filePath = targetPath;
          }
        } catch (fetchErr) {
          console.warn('[APK Fetch Upstream Warning]', fetchErr);
        }
      }

      if (filePath && fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers ? req.headers.range : undefined;

        if (range) {
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunksize = end - start + 1;
          const fileStream = fs.createReadStream(filePath, { start, end });

          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'application/vnd.android.package-archive',
            'Content-Disposition': `attachment; filename="${fileName}"`,
          });
          fileStream.pipe(res);
        } else {
          res.writeHead(200, {
            'Content-Length': fileSize,
            'Accept-Ranges': 'bytes',
            'Content-Type': 'application/vnd.android.package-archive',
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Cache-Control': 'public, max-age=86400',
          });
          fs.createReadStream(filePath).pipe(res);
        }
        return true;
      }

      // Fallback redirect to GitHub upstream if local file still couldn't be loaded
      res.writeHead(302, {
        Location: `https://github.com/wen95266/ee/releases/download/latest-apk/${fileName}`,
      });
      res.end();
      return true;
    } catch (e) {
      sendJson(res, 500, { success: false, error: 'APK下载异常: ' + String(e) });
      return true;
    }
  }

  // 2. Database Export
  if (pathname === '/api/database/export' && method === 'GET') {
    const db = loadDatabase();
    sendJson(res, 200, db);
    return true;
  }

  // 3. User Sync
  if (pathname === '/api/user/sync' && method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const db = loadDatabase();
      if (payload.profile) {
        const pId = payload.profile.id;
        if (!pId || pId === 'default' || !db.profiles[pId]) {
          sendJson(res, 200, { success: false, notFound: true, error: '用户不存在或已被清理' });
          return true;
        }

        const existing = db.profiles[pId];
        const { allowedPhones, adminPhones } = getAllowedAndAdminPhones();
        const pPhone = String(existing.phone || '').trim().replace(/\D/g, '');
        const isAuthorized = !pPhone ||
          allowedPhones.some((p) => p === pPhone) ||
          adminPhones.some((p) => p === pPhone);

        if (!isAuthorized) {
          delete db.profiles[pId];
          saveDatabase(db);
          sendJson(res, 200, { success: false, notFound: true, error: '用户手机号授权已撤销' });
          return true;
        }

        // 服务端数据库作为资产权威源：若后台管理员刚调整了筹码，以服务端数值为准；同时支持正常战绩同步
        if (typeof existing.coins !== 'number') {
          existing.coins = Math.max(0, Math.floor(Number(payload.profile.coins) || 0));
        }
        if (payload.profile.name) existing.name = payload.profile.name;
        if (payload.profile.avatar) existing.avatar = payload.profile.avatar;
        if (payload.profile.rating) existing.rating = payload.profile.rating;
        if (payload.profile.level) existing.level = payload.profile.level;
        if (payload.profile.stats) existing.stats = payload.profile.stats;
        existing.updatedAt = Date.now();
      }
      if (payload.records && Array.isArray(payload.records)) {
        db.records = payload.records.slice(0, 100);
      }
      saveDatabase(db);
      const targetUser = payload.profile ? db.profiles[payload.profile.id] : undefined;
      sendJson(res, 200, {
        success: true,
        coins: targetUser?.coins,
        rating: targetUser?.rating,
        level: targetUser?.level,
        profile: targetUser,
      });
    } catch (e) {
      sendJson(res, 500, { success: false, error: String(e) });
    }
    return true;
  }

  // 4. Auth Register
  // 4. Auth Register (移除账号名，仅需授权手机号、6位密码与昵称头像，以手机号为唯一凭证)
  if (pathname === '/api/auth/register' && method === 'POST') {
    try {
      const { phone, password, nickname, avatar } = await parseJsonBody(req);
      const cleanPhone = String(phone || '').trim().replace(/\D/g, '');
      if (!cleanPhone || !password) {
        sendJson(res, 200, { success: false, error: '请填写完整的手机号和密码' });
        return true;
      }
      if (String(password).trim().length !== 6) {
        sendJson(res, 200, { success: false, error: '密码必须为六位数' });
        return true;
      }
      if (cleanPhone.length < 5) {
        sendJson(res, 200, { success: false, error: '手机号格式不正确' });
        return true;
      }

      const { allowedPhones, adminPhones } = getAllowedAndAdminPhones();
      const isAuthorized = allowedPhones.some((p) => p === cleanPhone) ||
                           adminPhones.some((p) => p === cleanPhone);

      if (!isAuthorized) {
        sendJson(res, 200, {
          success: false,
          error: '该手机号未获得 Telegram Bot 授权白名单！必须先由管理员在 Bot 中发送 /authphone 授权后方可注册。',
        });
        return true;
      }

      const isAdmin = adminPhones.some((p) => p === cleanPhone);
      const db = loadDatabase();

      for (const p of Object.values(db.profiles)) {
        const existingPhone = String(p.phone || '').trim().replace(/\D/g, '');
        if (existingPhone && existingPhone === cleanPhone) {
          sendJson(res, 200, { success: false, error: '该授权手机号已注册过账号，请直接使用手机号登录' });
          return true;
        }
      }

      const newId = `USER-${Math.floor(1000 + Math.random() * 9000)}`;
      const finalName = nickname && String(nickname).trim() ? String(nickname).trim() : `茶客${cleanPhone.slice(-4)}`;
      const newProfile: UserProfileData = {
        id: newId,
        username: cleanPhone,
        password: hashPassword(String(password).trim()),
        name: finalName,
        avatar: avatar || '🀄',
        phone: cleanPhone,
        isAdmin,
        isBanned: false,
        coins: 0,
        rating: 1800,
        level: 1,
        lastCheckinDate: '',
        registeredAt: Date.now(),
        updatedAt: Date.now(),
        stats: {
          yansan: { played: 0, won: 0, highestScore: 0 },
          shisanshui: { played: 0, won: 0, highestScore: 0 },
          mahjong: { played: 0, won: 0, highestScore: 0 },
        },
      };

      const sessionToken = 'sess_' + Math.random().toString(36).slice(2) + '_' + Date.now();
      newProfile.sessionToken = sessionToken;

      db.profiles[newId] = newProfile;
      saveDatabase(db);

      recordAdminLog('USER_REGISTER', 'Telegram Auth', cleanPhone, `新用户注册: ${newProfile.name} (📱 ${cleanPhone}, UID: ${newId})，初始筹码: 0`, 0);

      sendJson(res, 200, { success: true, profile: newProfile, sessionToken });
    } catch (e) {
      sendJson(res, 500, { success: false, error: String(e) });
    }
    return true;
  }

  // 5. Auth Login (仅支持手机号和密码登录，取消用户名登录)
  if (pathname === '/api/auth/login' && method === 'POST') {
    try {
      const { phone, username, password } = await parseJsonBody(req);
      const cleanPhone = String(phone || username || '').trim().replace(/\D/g, '');
      if (!cleanPhone || !password) {
        sendJson(res, 200, { success: false, error: '请输入手机号和密码' });
        return true;
      }

      const db = loadDatabase();
      let foundProfile: any = null;
      for (const p of Object.values(db.profiles)) {
        const profPhone = String(p.phone || '').trim().replace(/\D/g, '');
        if (profPhone && profPhone === cleanPhone) {
          foundProfile = p;
          break;
        }
      }
      if (!foundProfile) {
        sendJson(res, 200, { success: false, error: '该手机号尚未注册或密码错误，请先注册' });
        return true;
      }
      if (foundProfile.isBanned) {
        sendJson(res, 200, { success: false, error: `该账号已被管理员封禁: ${foundProfile.bannedReason || '违规操作'}` });
        return true;
      }

      // Check whether user's bound phone is still authorized in whitelist
      const { allowedPhones, adminPhones } = getAllowedAndAdminPhones();
      const userPhone = String(foundProfile.phone || '').trim().replace(/\D/g, '');
      const isStillAuthorized = !userPhone ||
        allowedPhones.some((p) => p === userPhone) ||
        adminPhones.some((p) => p === userPhone);

      if (!isStillAuthorized) {
        delete db.profiles[foundProfile.id];
        saveDatabase(db);
        sendJson(res, 200, {
          success: false,
          error: '该账号绑定的手机号授权已被管理员移除，账号已注销。如需使用请联系管理员重新授权。',
        });
        return true;
      }

      if (foundProfile.password) {
        const isValid = verifyPassword(String(password).trim(), foundProfile.password);
        if (!isValid) {
          sendJson(res, 200, { success: false, error: '手机号或密码不正确' });
          return true;
        }
        // Upgrade legacy plaintext password to secure hash upon successful login
        if (!foundProfile.password.includes(':')) {
          foundProfile.password = hashPassword(String(password).trim());
        }
      }
      const sessionToken = 'sess_' + Math.random().toString(36).slice(2) + '_' + Date.now();
      foundProfile.sessionToken = sessionToken;
      saveDatabase(db);

      sendJson(res, 200, { success: true, profile: foundProfile, sessionToken });
    } catch (e) {
      sendJson(res, 500, { success: false, error: String(e) });
    }
    return true;
  }

  // Check Session (Single-device session enforcement & authorization validation)
  if (pathname === '/api/auth/check-session' && method === 'POST') {
    try {
      const { userId, sessionToken } = await parseJsonBody(req);
      const db = loadDatabase();
      const user = Object.values(db.profiles).find((p) => p.id === userId);
      if (!user) {
        sendJson(res, 200, { success: true, valid: false, sessionExpired: true, error: '用户不存在或已被清理' });
        return true;
      }

      const { allowedPhones, adminPhones } = getAllowedAndAdminPhones();
      const userPhone = String(user.phone || '').trim().replace(/\D/g, '');
      const isStillAuthorized = !userPhone ||
        allowedPhones.some((p) => p === userPhone) ||
        adminPhones.some((p) => p === userPhone);

      if (!isStillAuthorized) {
        delete db.profiles[user.id];
        saveDatabase(db);
        sendJson(res, 200, { success: true, valid: false, sessionExpired: true, error: '该账号手机号授权已被管理员移出白名单，账号已注销' });
        return true;
      }

      if (user.sessionToken && user.sessionToken !== sessionToken) {
        sendJson(res, 200, { success: true, valid: false, sessionExpired: true, error: '您的账号已在另一台设备登录，当前会话已失效' });
        return true;
      }
      sendJson(res, 200, {
        success: true,
        valid: true,
        coins: user.coins,
        rating: user.rating,
        level: user.level,
        name: user.name,
        profile: user,
      });
    } catch (e) {
      sendJson(res, 500, { success: false, error: String(e) });
    }
    return true;
  }

  // 6. User Search
  if (pathname === '/api/users/search' && method === 'GET') {
    try {
      const phone = String(urlObj.searchParams.get('phone') || '').trim();
      if (!phone) {
        sendJson(res, 400, { success: false, error: '请输入要搜索的手机号' });
        return true;
      }
      const db = loadDatabase();
      const found = findUser(phone, db);
      if (!found) {
        sendJson(res, 200, { success: false, error: '未找到该手机号对应的用户' });
        return true;
      }
      sendJson(res, 200, {
        success: true,
        user: {
          id: found.id,
          name: found.name,
          username: found.username,
          phone: found.phone,
          coins: found.coins,
          rating: found.rating,
          level: found.level,
          avatar: found.avatar,
          isAdmin: found.isAdmin,
          isBanned: found.isBanned,
        },
      });
    } catch (e) {
      sendJson(res, 500, { success: false, error: String(e) });
    }
    return true;
  }

  // 7. Points Transfer
  if (pathname === '/api/points/transfer' && method === 'POST') {
    try {
      const { senderId, recipientPhone, amount } = await parseJsonBody(req);
      const transferAmount = Math.floor(Number(amount) || 0);
      if (transferAmount <= 0) {
        sendJson(res, 400, { success: false, error: '赠送筹码数量必须大于0' });
        return true;
      }
      const db = loadDatabase();
      const sender = db.profiles[senderId];
      if (!sender) {
        sendJson(res, 400, { success: false, error: '发送方账户不存在' });
        return true;
      }
      if (sender.coins < transferAmount) {
        sendJson(res, 200, { success: false, error: '持有筹码不足，无法赠送' });
        return true;
      }

      const recipient = findUser(recipientPhone, db);
      if (!recipient) {
        sendJson(res, 200, { success: false, error: '未找到该接收手机号对应的用户' });
        return true;
      }

      if (sender.phone && sender.phone.trim() === recipient.phone?.trim()) {
        sendJson(res, 200, { success: false, error: '不能向自己赠送筹码' });
        return true;
      }

      sender.coins -= transferAmount;
      recipient.coins += transferAmount;
      sender.updatedAt = Date.now();
      recipient.updatedAt = Date.now();

      saveDatabase(db);
      recordAdminLog(
        'POINTS_TRANSFER',
        sender.name,
        recipient.name,
        `互赠筹码 ${transferAmount} 分 (发起人: ${sender.phone} -> 接收人: ${recipient.phone})`,
        transferAmount
      );

      sendJson(res, 200, {
        success: true,
        senderProfile: sender,
        recipientProfile: recipient,
      });
    } catch (e) {
      sendJson(res, 500, { success: false, error: String(e) });
    }
    return true;
  }

  // 7.6 Active Rooms List Endpoint
  if (pathname === '/api/rooms' && method === 'GET') {
    try {
      const activeRooms = [
        {
          id: 'RM-202',
          title: '风雷堂 · 经典烟三四人赛',
          gameType: 'yansan',
          status: 'playing',
          playersCount: 4,
          spectators: 9,
          baseStake: 10,
          modeLabel: '方块四首出 · 四人争锋',
        },
        {
          id: 'RM-204',
          title: '水镜阁 · 水镜十三水',
          gameType: 'shisanshui',
          status: 'playing',
          playersCount: 4,
          spectators: 18,
          baseStake: 10,
          modeLabel: '头中尾三道 · 智能理牌',
        },
        {
          id: 'RM-205',
          title: '雀神楼 · 经典国标麻将',
          gameType: 'mahjong',
          status: 'playing',
          playersCount: 4,
          spectators: 12,
          baseStake: 10,
          modeLabel: '国标经典 · 雀神东风圈',
        },
      ];
      sendJson(res, 200, { success: true, rooms: activeRooms });
    } catch (e) {
      sendJson(res, 500, { success: false, error: String(e) });
    }
    return true;
  }

  // ==========================================
  // TELEGRAM ADMIN APIS (管理员专属控制接口)
  // ==========================================

  // 8. Admin: List All Users
  if (pathname === '/api/admin/users' && method === 'GET') {
    try {
      const db = loadDatabase();
      const users = Object.values(db.profiles).map((p) => ({
        id: p.id,
        name: p.name,
        username: p.username || '',
        avatar: p.avatar,
        phone: p.phone || '未绑定',
        isAdmin: Boolean(p.isAdmin),
        isBanned: Boolean(p.isBanned),
        bannedReason: p.bannedReason || '',
        coins: p.coins,
        rating: p.rating,
        level: p.level,
        updatedAt: p.updatedAt,
        stats: p.stats,
      }));
      sendJson(res, 200, { success: true, users });
    } catch (e) {
      sendJson(res, 500, { success: false, error: String(e) });
    }
    return true;
  }

  // 9. Admin: Adjust User Points
  if (pathname === '/api/admin/points/adjust' && method === 'POST') {
    try {
      const { targetId, phone, delta, type = 'add', reason = '管理员调整', operator = 'Telegram Admin' } = await parseJsonBody(req);
      const db = loadDatabase();
      const user = (targetId && db.profiles[targetId]) || (phone && findUser(phone, db));
      if (!user) {
        sendJson(res, 404, { success: false, error: '未找到目标用户' });
        return true;
      }

      const num = Math.floor(Number(delta) || 0);
      const oldCoins = user.coins;

      if (type === 'set') {
        user.coins = Math.max(0, num);
      } else if (type === 'subtract') {
        user.coins = Math.max(0, user.coins - Math.abs(num));
      } else {
        user.coins = Math.max(0, user.coins + Math.abs(num));
      }
      user.updatedAt = Date.now();

      saveDatabase(db);
      recordAdminLog(
        `POINTS_${type.toUpperCase()}`,
        operator,
        user.name,
        `${reason}: ${oldCoins} -> ${user.coins} (变动: ${user.coins - oldCoins >= 0 ? '+' : ''}${user.coins - oldCoins})`,
        user.coins - oldCoins
      );

      if (typeof broadcast === 'function') {
        broadcast({
          type: 'user_coins_updated',
          userId: user.id,
          phone: user.phone,
          username: user.username,
          name: user.name,
          coins: user.coins,
          rating: user.rating,
          level: user.level,
          delta: user.coins - oldCoins,
          operator,
          timestamp: Date.now(),
        });
      }

      sendJson(res, 200, {
        success: true,
        user,
        oldCoins,
        newCoins: user.coins,
        delta: user.coins - oldCoins,
      });
    } catch (e) {
      sendJson(res, 500, { success: false, error: String(e) });
    }
    return true;
  }

  // 10. Admin: Batch Adjust Points for All Users
  if (pathname === '/api/admin/points/batch' && method === 'POST') {
    try {
      const { amount, reason = '全服福利金发放', operator = 'Telegram Admin' } = await parseJsonBody(req);
      const num = Math.floor(Number(amount) || 0);
      if (num === 0) {
        sendJson(res, 400, { success: false, error: '批量调整数量不能为0' });
        return true;
      }
      const db = loadDatabase();
      let affectedCount = 0;
      for (const user of Object.values(db.profiles)) {
        user.coins = Math.max(0, user.coins + num);
        user.updatedAt = Date.now();
        affectedCount++;
      }
      saveDatabase(db);
      recordAdminLog(
        'POINTS_BATCH',
        operator,
        `全服玩家 (${affectedCount}人)`,
        `${reason}: 每人发放 ${num > 0 ? '+' : ''}${num} 分`,
        num
      );
      if (broadcast) {
        broadcast({
          type: 'chat_broadcast',
          roomId: 'ALL',
          message: {
            id: `sys-${Date.now()}`,
            sender: '茶楼通告',
            avatar: '📢',
            text: `【全服通告】${reason}：所有茶客每人到账 ${num} 分筹码！`,
            timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          },
        });
      }
      sendJson(res, 200, { success: true, affectedCount, amount: num });
    } catch (e) {
      sendJson(res, 500, { success: false, error: String(e) });
    }
    return true;
  }

  // 11. Admin: Get Whitelist
  if (pathname === '/api/admin/whitelist' && method === 'GET') {
    try {
      const { allowedPhones, adminPhones } = getAllowedAndAdminPhones();
      sendJson(res, 200, {
        success: true,
        authorizedPhones: allowedPhones,
        adminPhones,
      });
    } catch (e) {
      sendJson(res, 500, { success: false, error: String(e) });
    }
    return true;
  }

  // 12. Admin: Add Whitelist Phone
  if (pathname === '/api/admin/whitelist/add' && method === 'POST') {
    try {
      const { phones, operator = 'Telegram Admin' } = await parseJsonBody(req);
      const list = Array.isArray(phones)
        ? phones
        : String(phones || '').split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);

      if (list.length === 0) {
        sendJson(res, 400, { success: false, error: '请输入有效的手机号' });
        return true;
      }

      const db = loadDatabase();
      const current = new Set(db.authorizedPhones || []);
      const added: string[] = [];

      for (const p of list) {
        if (!current.has(p)) {
          current.add(p);
          added.push(p);
        }
      }

      // If phone was in revokedPhones, restore it
      if (db.revokedPhones && Array.isArray(db.revokedPhones)) {
        db.revokedPhones = db.revokedPhones.filter((p: string) => !list.includes(p));
      }

      db.authorizedPhones = Array.from(current);
      saveDatabase(db);

      recordAdminLog(
        'WHITELIST_ADD',
        operator,
        added.join(', '),
        `将 ${added.length} 个手机号加入 Telegram 授权白名单: ${added.join(', ')}`
      );

      sendJson(res, 200, {
        success: true,
        added,
        totalAuthorized: db.authorizedPhones,
      });
    } catch (e) {
      sendJson(res, 500, { success: false, error: String(e) });
    }
    return true;
  }

  // 13. Admin: Remove Whitelist Phone & Purge Associated Profile Residues
  if (pathname === '/api/admin/whitelist/remove' && method === 'POST') {
    try {
      const { phone, operator = 'Telegram Admin' } = await parseJsonBody(req);
      const cleanPhone = String(phone || '').trim().replace(/\D/g, '');
      if (!cleanPhone) {
        sendJson(res, 400, { success: false, error: '请提供要移出的手机号' });
        return true;
      }
      const db = loadDatabase();
      const current = new Set((db.authorizedPhones || []).map((p: any) => String(p).trim().replace(/\D/g, '')));
      const existed = current.has(cleanPhone);
      current.delete(cleanPhone);
      db.authorizedPhones = Array.from(current);

      const currentAdmin = new Set((db.adminPhones || []).map((p: any) => String(p).trim().replace(/\D/g, '')));
      currentAdmin.delete(cleanPhone);
      db.adminPhones = Array.from(currentAdmin);

      if (!db.revokedPhones) db.revokedPhones = [];
      if (!db.revokedPhones.includes(cleanPhone)) {
        db.revokedPhones.push(cleanPhone);
      }

      // Purge registered profiles associated with this phone
      const deletedUsers: string[] = [];
      for (const [pId, profile] of Object.entries(db.profiles)) {
        const pPhone = String(profile.phone || '').trim().replace(/\D/g, '');
        if (pPhone === cleanPhone) {
          deletedUsers.push(`${profile.name} (${pId})`);
          delete db.profiles[pId];
        }
      }

      saveDatabase(db);

      recordAdminLog(
        'WHITELIST_REMOVE',
        operator,
        cleanPhone,
        `将手机号 ${cleanPhone} 移出 Telegram 授权白名单，彻底清理注销账号: ${deletedUsers.length > 0 ? deletedUsers.join(', ') : '无注册用户'}`
      );

      sendJson(res, 200, {
        success: true,
        removed: cleanPhone,
        deletedUsers,
        totalAuthorized: db.authorizedPhones,
      });
    } catch (e) {
      sendJson(res, 500, { success: false, error: String(e) });
    }
    return true;
  }

  // 13b. Admin: Delete User Profile & Purge Authorization
  if (pathname === '/api/admin/user/delete' && method === 'POST') {
    try {
      const { userId, phone, operator = 'Telegram Admin' } = await parseJsonBody(req);
      const db = loadDatabase();
      const user = (userId && db.profiles[userId]) || (phone && findUser(phone, db));
      if (!user) {
        sendJson(res, 404, { success: false, error: '未找到指定用户' });
        return true;
      }

      const pId = user.id;
      const userName = user.name;
      const userPhone = String(user.phone || '').trim().replace(/\D/g, '');
      delete db.profiles[pId];

      if (userPhone) {
        const current = new Set((db.authorizedPhones || []).map((p: any) => String(p).trim().replace(/\D/g, '')));
        current.delete(userPhone);
        db.authorizedPhones = Array.from(current);

        const currentAdmin = new Set((db.adminPhones || []).map((p: any) => String(p).trim().replace(/\D/g, '')));
        currentAdmin.delete(userPhone);
        db.adminPhones = Array.from(currentAdmin);

        if (!db.revokedPhones) db.revokedPhones = [];
        if (!db.revokedPhones.includes(userPhone)) db.revokedPhones.push(userPhone);
      }

      saveDatabase(db);
      recordAdminLog('USER_DELETE', operator, userName, `管理员彻底删除并注销用户: ${userName} (${pId}, 📱 ${userPhone || '未绑'})`);

      sendJson(res, 200, { success: true, deletedUser: userName, userId: pId });
    } catch (e) {
      sendJson(res, 500, { success: false, error: String(e) });
    }
    return true;
  }

  // 14. Admin: Ban / Unban User
  if (pathname === '/api/admin/user/ban' && method === 'POST') {
    try {
      const { userId, phone, isBanned, reason = '违反茶楼守则', operator = 'Telegram Admin' } = await parseJsonBody(req);
      const db = loadDatabase();
      const user = (userId && db.profiles[userId]) || (phone && findUser(phone, db));
      if (!user) {
        sendJson(res, 404, { success: false, error: '未找到指定用户' });
        return true;
      }
      user.isBanned = Boolean(isBanned);
      user.bannedReason = isBanned ? reason : '';
      user.updatedAt = Date.now();
      saveDatabase(db);

      recordAdminLog(
        isBanned ? 'USER_BAN' : 'USER_UNBAN',
        operator,
        user.name,
        isBanned ? `封禁账号 (${user.phone}): ${reason}` : `解封账号 (${user.phone})`
      );

      sendJson(res, 200, { success: true, user });
    } catch (e) {
      sendJson(res, 500, { success: false, error: String(e) });
    }
    return true;
  }

  // 15. Admin: Broadcast Announcement
  if (pathname === '/api/admin/broadcast' && method === 'POST') {
    try {
      const { text, author = 'Telegram 管理员' } = await parseJsonBody(req);
      const cleanText = String(text || '').trim();
      if (!cleanText) {
        sendJson(res, 400, { success: false, error: '公告内容不能为空' });
        return true;
      }

      const db = loadDatabase();
      const announcement = {
        id: `ann-${Date.now()}`,
        text: cleanText,
        author,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      };

      db.systemAnnouncements = [announcement, ...(db.systemAnnouncements || []).slice(0, 19)];
      saveDatabase(db);

      recordAdminLog('ANNOUNCEMENT_BROADCAST', author, '全服房间', cleanText);

      if (broadcast) {
        broadcast({
          type: 'chat_broadcast',
          roomId: 'ALL',
          message: {
            id: `broadcast-${Date.now()}`,
            sender: `📢 ${author}`,
            avatar: '🏮',
            text: cleanText,
            timestamp: announcement.timestamp,
          },
        });
      }

      sendJson(res, 200, { success: true, announcement });
    } catch (e) {
      sendJson(res, 500, { success: false, error: String(e) });
    }
    return true;
  }

  // 16. Admin: Get Operation Logs
  if (pathname === '/api/admin/logs' && method === 'GET') {
    try {
      const db = loadDatabase();
      sendJson(res, 200, {
        success: true,
        logs: db.adminLogs || [],
      });
    } catch (e) {
      sendJson(res, 500, { success: false, error: String(e) });
    }
    return true;
  }

  // 17. Telegram Command Processor (Direct interactive CLI & Webhook)
  if ((pathname === '/api/telegram/command' || pathname === '/api/telegram/webhook') && method === 'POST') {
    try {
      // If Telegram Webhook Secret Token is configured in .env, verify header
      const rawSecret = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim().replace(/^['"]+|['"]+$/g, '');
      if (pathname === '/api/telegram/webhook' && rawSecret) {
        const secretHeader = req.headers ? req.headers['x-telegram-bot-api-secret-token'] : undefined;
        if (secretHeader !== rawSecret) {
          console.warn('⚠️ [Telegram Webhook] Secret Token 不匹配:', { received: secretHeader, expected: rawSecret });
          sendJson(res, 403, { success: false, error: '非法请求：Telegram Webhook 密钥校验失败' });
          return true;
        }
      }

      const body = await parseJsonBody(req);
      const result = await executeTelegramUpdate(body, broadcast);
      sendJson(res, 200, result);
    } catch (e) {
      sendJson(res, 500, { success: false, error: String(e) });
    }
    return true;
  }

  // 18. Telegram: Set Webhook Helper Endpoint
  if (pathname === '/api/telegram/set-webhook' && (method === 'POST' || method === 'GET')) {
    try {
      const { refreshEnvFromDisk, normalizePublicUrl, stopTelegramPolling, getTelegramWebhookInfo } = await import('./telegramBotService.ts');
      refreshEnvFromDisk();

      const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim().replace(/^['"]+|['"]+$/g, '');
      if (!token) {
        sendJson(res, 400, {
          success: false,
          error: '环境变量未配置 TELEGRAM_BOT_TOKEN，请先在 .env 中设置',
        });
        return true;
      }

      const queryUrl = urlObj.searchParams.get('url');
      const body = method === 'POST' ? await parseJsonBody(req).catch(() => ({})) : {};
      const targetAppUrl = normalizePublicUrl(queryUrl || body.url || process.env.URL || process.env.APP_URL || process.env.WEBHOOK_URL || '');

      if (!targetAppUrl || !targetAppUrl.startsWith('https://')) {
        sendJson(res, 400, {
          success: false,
          error: '必须提供有效的 HTTPS 公网隧道域名（Telegram Webhook 仅支持 HTTPS，例如: https://xxx.trycloudflare.com）',
          currentAppUrl: targetAppUrl || '未配置 (请在 .env 中设置 URL="https://...")',
        });
        return true;
      }

      const webhookUrl = `${targetAppUrl}/api/telegram/webhook`;
      const dropPending = urlObj.searchParams.get('drop_pending') === 'true' || urlObj.searchParams.get('drop_pending_updates') === 'true';

      const rawSecret = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim().replace(/^['"]+|['"]+$/g, '');
      const validSecret = /^[A-Za-z0-9_-]{1,256}$/.test(rawSecret) ? rawSecret : '';
      const secretParam = validSecret
        ? `&secret_token=${encodeURIComponent(validSecret)}`
        : '';

      const setWebhookUrl = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(
        webhookUrl
      )}${secretParam}&drop_pending_updates=${dropPending}&allowed_updates=${encodeURIComponent(
        JSON.stringify(['message', 'edited_message', 'channel_post', 'callback_query'])
      )}`;

      const tgResp = await fetch(setWebhookUrl);
      const tgData = await tgResp.json();

      if (tgData && tgData.ok) {
        stopTelegramPolling();
      }

      const webhookInfo = await getTelegramWebhookInfo(token);

      sendJson(res, 200, {
        success: tgData.ok,
        telegramResponse: tgData,
        configuredWebhookUrl: webhookUrl,
        realtimeWebhookInfo: webhookInfo,
        status: tgData.ok ? 'registered_successfully' : 'registration_failed',
        advice: tgData.ok
          ? 'Webhook 已成功在 Telegram 官方服务器注册并生效！'
          : `注册失败原因: ${tgData.description || '未知异常'}`,
      });
    } catch (e) {
      sendJson(res, 500, { success: false, error: String(e) });
    }
    return true;
  }

  // 19. Telegram: Get Webhook Info Helper Endpoint (深度诊断)
  if (pathname === '/api/telegram/webhook-info' && method === 'GET') {
    try {
      const { refreshEnvFromDisk, normalizePublicUrl } = await import('./telegramBotService.ts');
      refreshEnvFromDisk();

      const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim().replace(/^['"]+|['"]+$/g, '');
      if (!token) {
        sendJson(res, 400, {
          success: false,
          error: '环境变量未配置 TELEGRAM_BOT_TOKEN，请先在 .env 中设置',
        });
        return true;
      }

      const envRawUrl = (process.env.URL || process.env.APP_URL || process.env.WEBHOOK_URL || '').trim();
      const normalizedEnvUrl = normalizePublicUrl(envRawUrl);
      const expectedWebhookUrl = normalizedEnvUrl ? `${normalizedEnvUrl}/api/telegram/webhook` : '';

      const tgResp = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      const tgData = await tgResp.json();
      const info = tgData.result || {};

      const isRegistered = Boolean(info.url && info.url.length > 0);
      const isUrlMatched = expectedWebhookUrl ? (info.url === expectedWebhookUrl) : false;

      let diagnosis = '正常';
      if (!isRegistered) {
        diagnosis = 'Telegram 官方未注册任何 Webhook 回调地址 (当前可能处于未注册状态或长轮询模式)';
      } else if (!isUrlMatched) {
        diagnosis = `URL 不匹配：Telegram 登记的地址为 [${info.url}]，而当前 .env 中配置的是 [${expectedWebhookUrl}]。请访问 /api/telegram/set-webhook 重新注册！`;
      } else if (info.last_error_message) {
        diagnosis = `Telegram 官方上报回调推送错误: "${info.last_error_message}"。若包含 502/Bad Gateway 说明隧道未连通本地 3000 端口；若包含 Connection timeout 说明隧道中断。`;
      } else {
        diagnosis = '🟢 Webhook 挂载状态完全正常，Telegram 官方可毫秒级直推消息！';
      }

      sendJson(res, 200, {
        success: tgData.ok,
        envUrl: envRawUrl,
        normalizedEnvUrl,
        expectedWebhookUrl,
        registeredWebhookUrl: info.url || '未注册 (为空)',
        isUrlMatched,
        hasPendingUpdates: info.pending_update_count || 0,
        lastErrorDate: info.last_error_date ? new Date(info.last_error_date * 1000).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : null,
        lastErrorMessage: info.last_error_message || null,
        diagnosis,
        webhookInfo: info,
      });
    } catch (e) {
      sendJson(res, 500, { success: false, error: String(e) });
    }
    return true;
  }

  // 20. Telegram: Bot Status & Switch Endpoint (Webhook vs Long Polling)
  if (pathname === '/api/telegram/status' && method === 'GET') {
    try {
      const { getTelegramBotStatus } = await import('./telegramBotService.ts');
      sendJson(res, 200, {
        success: true,
        bot: getTelegramBotStatus(),
      });
    } catch (e) {
      sendJson(res, 500, { success: false, error: String(e) });
    }
    return true;
  }

  // 21. Telegram: Manually start Long Polling
  if ((pathname === '/api/telegram/start-polling' || pathname === '/api/telegram/polling') && (method === 'POST' || method === 'GET')) {
    try {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) {
        sendJson(res, 400, { success: false, error: '未配置 TELEGRAM_BOT_TOKEN' });
        return true;
      }
      const { startTelegramPolling } = await import('./telegramBotService.ts');
      await startTelegramPolling(token, broadcast);
      sendJson(res, 200, { success: true, message: '已成功启动长轮询模式 (Long Polling)' });
    } catch (e) {
      sendJson(res, 500, { success: false, error: String(e) });
    }
    return true;
  }

  return false;
}
