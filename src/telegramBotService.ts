import { executeTelegramUpdate } from './serverApi.ts';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

export interface TelegramBotStatus {
  enabled: boolean;
  mode: 'webhook' | 'polling' | 'disabled';
  tokenConfigured: boolean;
  tokenMasked: string;
  urlConfigured: string;
  apiBase?: string;
  botUsername?: string;
  botName?: string;
  webhookUrl?: string;
  pollingActive: boolean;
  lastPollTimestamp: number | null;
  lastMessageTimestamp: number | null;
  processedCount: number;
  lastError: string | null;
  lastWebhookInfo?: any;
}

let botStatus: TelegramBotStatus = {
  enabled: false,
  mode: 'disabled',
  tokenConfigured: false,
  tokenMasked: '',
  urlConfigured: '',
  pollingActive: false,
  lastPollTimestamp: null,
  lastMessageTimestamp: null,
  processedCount: 0,
  lastError: null,
};

let activePollingController: AbortController | null = null;
let savedBroadcast: Function | null = null;

export function maskToken(token: string): string {
  if (!token || token.length < 10) return '***';
  return token.substring(0, 5) + '...' + token.substring(token.length - 4);
}

export function refreshEnvFromDisk(): void {
  const possibleEnvPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env'),
    process.env.HOME ? path.resolve(process.env.HOME, '.env') : '',
  ].filter(Boolean);

  for (const p of possibleEnvPaths) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf-8');
        const parsed = dotenv.parse(content);
        for (const [k, v] of Object.entries(parsed)) {
          // 仅当 .env 中的值包含非空内容时才覆盖，防止 .env 模板中的空字符串意外抹除外部传入的有效变量
          if (typeof v === 'string' && v.trim() !== '') {
            process.env[k] = v.trim();
          }
        }
      } catch {}
    }
  }
}

export function normalizePublicUrl(rawUrl: string): string {
  let u = String(rawUrl || '').trim();
  u = u.replace(/^['"]+|['"]+$/g, '').trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) {
    u = 'https://' + u;
  }
  return u.replace(/\/+$/, '');
}

export function getTelegramBotStatus(): TelegramBotStatus {
  return { ...botStatus };
}

/**
 * 获取 Telegram API 端点：
 * 优先采用用户配置的国内反代地址 (URL / TELEGRAM_API_BASE / TG_PROXY)，
 * 若均未配置则使用官方 https://api.telegram.org
 */
export function getTelegramApiBase(): string {
  refreshEnvFromDisk();
  const raw = (
    process.env.TELEGRAM_API_BASE ||
    process.env.TG_PROXY ||
    process.env.TG_API_BASE ||
    process.env.URL ||
    ''
  ).trim().replace(/^['"]+|['"]+$/g, '');

  if (!raw) return 'https://api.telegram.org';

  let base = raw;
  if (!/^https?:\/\//i.test(base)) {
    base = 'https://' + base;
  }
  // 过滤多余尾部斜杠与意外附加的 /bot 路径
  base = base.replace(/\/+$/, '').replace(/\/bot$/i, '');
  return base;
}

/**
 * 查询 Telegram 官方当前的 Webhook 详细状态
 */
export async function getTelegramWebhookInfo(token: string): Promise<any> {
  try {
    const apiBase = getTelegramApiBase();
    const res = await fetch(`${apiBase}/bot${token}/getWebhookInfo`, {
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as any;
    if (data && data.ok) {
      botStatus.lastWebhookInfo = data.result;
      return data.result;
    }
    return null;
  } catch (err: any) {
    console.warn('⚠️ [Telegram Bot] 查询 getWebhookInfo 失败 (可能未配置反代或网络波动):', err?.message || err);
    return null;
  }
}

/**
 * 启动 Telegram 长轮询服务 (Long Polling)
 * 通过反代 URL 直连 Telegram getUpdates，国内 Termux / 无代理服务器完美运行！
 */
export async function startTelegramPolling(token: string, broadcast?: Function): Promise<void> {
  if (broadcast) savedBroadcast = broadcast;

  if (activePollingController) {
    try {
      activePollingController.abort();
    } catch {}
    activePollingController = null;
  }

  const controller = new AbortController();
  activePollingController = controller;

  botStatus.mode = 'polling';
  botStatus.pollingActive = true;
  botStatus.lastError = null;

  const apiBase = getTelegramApiBase();

  try {
    const delRes = await fetch(`${apiBase}/bot${token}/deleteWebhook?drop_pending_updates=false`, {
      signal: AbortSignal.timeout(8000),
    });
    const delData = (await delRes.json().catch(() => ({}))) as any;
    if (delData && delData.ok) {
      console.log('🤖 [Telegram Bot] 已注销旧 Webhook，已切换为长轮询模式 (Long Polling)');
    }
  } catch (err: any) {
    console.warn('⚠️ [Telegram Bot] 注销 Webhook 网络提示:', err?.message || err);
  }

  console.log(`🤖 [Telegram Bot] 🚀 长轮询已就绪，正在后台监听 Telegram 消息 (反代: ${apiBase})...`);

  let offset = 0;
  let consecutiveErrors = 0;

  (async () => {
    while (!controller.signal.aborted) {
      try {
        botStatus.lastPollTimestamp = Date.now();
        const currentApiBase = getTelegramApiBase();
        const fetchUrl = `${currentApiBase}/bot${token}/getUpdates?offset=${offset}&timeout=25&allowed_updates=${encodeURIComponent(
          JSON.stringify(['message', 'edited_message', 'channel_post', 'callback_query'])
        )}`;

        const res = await fetch(fetchUrl, {
          signal: AbortSignal.timeout(40000),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          botStatus.lastError = `HTTP ${res.status}: ${errText}`;
          consecutiveErrors++;

          if (res.status === 409) {
            console.warn('⚠️ [Telegram Bot] 检测到冲突 (409 Conflict)，正在重试清理 Webhook 并等待 5 秒...');
            await fetch(`${currentApiBase}/bot${token}/deleteWebhook?drop_pending_updates=false`, {
              signal: AbortSignal.timeout(8000),
            }).catch(() => {});
            await new Promise((r) => setTimeout(r, 5000));
            continue;
          }

          const backoff = Math.min(consecutiveErrors * 2000, 15000);
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }

        consecutiveErrors = 0;
        const data = (await res.json()) as any;

        if (data && data.ok && Array.isArray(data.result)) {
          if (data.result.length > 0) {
            console.log(`📥 [Telegram Bot] 收到 ${data.result.length} 条更新，正在执行...`);
          }
          for (const update of data.result) {
            if (controller.signal.aborted) break;
            offset = Math.max(offset, (update.update_id || 0) + 1);

            botStatus.lastMessageTimestamp = Date.now();
            botStatus.processedCount++;

            try {
              await executeTelegramUpdate(update, savedBroadcast || undefined);
            } catch (procErr: any) {
              console.error('[Telegram Bot Polling Process Error]', procErr);
            }
          }
        } else {
          await new Promise((r) => setTimeout(r, 1000));
        }
      } catch (err: any) {
        if (controller.signal.aborted) break;
        if (err.name === 'TimeoutError' || err.message?.includes('timeout')) {
          continue;
        }
        consecutiveErrors++;
        botStatus.lastError = err?.message || String(err);
        const backoff = Math.min(consecutiveErrors * 2000, 15000);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
    botStatus.pollingActive = false;
  })();
}

/**
 * 停止 Telegram 长轮询服务
 */
export function stopTelegramPolling(): void {
  if (activePollingController) {
    try {
      activePollingController.abort();
    } catch {}
    activePollingController = null;
  }
  botStatus.pollingActive = false;
}

/**
 * 初始化并自动调度 Telegram Bot
 * - 用户配置的 URL 变量用作 Telegram 反代地址 (解决国内未挂代理直连报错 TypeError: fetch failed)
 * - 默认自动以【长轮询模式 (Long Polling)】运行，无需域名、无需穿透，通过反代毫秒级收发消息！
 * - 若显式指定 BOT_MODE=webhook 且配置了 WEBHOOK_URL，则切换为 Webhook 模式
 */
export async function initTelegramBotService(broadcast?: Function): Promise<void> {
  if (broadcast) savedBroadcast = broadcast;

  // 1. 动态刷新并强制加载最新的 .env 文件
  refreshEnvFromDisk();

  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim().replace(/^['"]+|['"]+$/g, '');

  if (!token || token === 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
    botStatus = {
      enabled: false,
      mode: 'disabled',
      tokenConfigured: false,
      tokenMasked: '',
      urlConfigured: '',
      pollingActive: false,
      lastPollTimestamp: null,
      lastMessageTimestamp: null,
      processedCount: 0,
      lastError: 'TELEGRAM_BOT_TOKEN 未在 .env 中设置',
    };
    console.log('ℹ️ [Telegram Bot] TELEGRAM_BOT_TOKEN 未在 .env 中设置，跳过 Bot 启动。');
    return;
  }

  const apiBase = getTelegramApiBase();

  botStatus.tokenConfigured = true;
  botStatus.tokenMasked = maskToken(token);
  botStatus.enabled = true;
  botStatus.apiBase = apiBase;
  botStatus.urlConfigured = (process.env.URL || process.env.TELEGRAM_API_BASE || '').trim();

  // 2. 向 Telegram 反代端点发送 getMe 探测连通性并获取 Bot 身份
  try {
    console.log(`🤖 [Telegram Bot] 正在连接 Telegram 反代端点 (${apiBase}) 验证 Bot 凭据...`);
    const meRes = await fetch(`${apiBase}/bot${token}/getMe`, {
      signal: AbortSignal.timeout(8000),
    });
    const meData = (await meRes.json().catch(() => ({}))) as any;
    if (meData && meData.ok && meData.result) {
      const me = meData.result;
      botStatus.botUsername = me.username;
      botStatus.botName = me.first_name;
      botStatus.lastError = null;
      console.log(`✅ [Telegram Bot] 反代连接成功！机器人账号: @${me.username} (${me.first_name || '国粹棋牌'})`);
      console.log(`   • Telegram API 反代端点: ${apiBase}`);
    } else {
      const desc = meData?.description || JSON.stringify(meData);
      botStatus.lastError = `Telegram API 返回: ${desc}`;
      console.warn(`⚠️ [Telegram Bot] getMe 验证未通过: ${desc}`);
    }
  } catch (err: any) {
    botStatus.lastError = `连接 Telegram 反代端点异常 (${apiBase}): ${err?.message || err}`;
    console.warn(`⚠️ [Telegram Bot] 连接 Telegram API 反代端点异常 (${apiBase}):`, err?.message || err);
  }

  // 3. 确定运行模式：长轮询 (Long Polling) 还是 Webhook
  const webhookExplicit = (process.env.WEBHOOK_URL || '').trim();
  const botModeEnv = (process.env.BOT_MODE || '').trim().toLowerCase();
  const isWebhookMode = botModeEnv === 'webhook' || (Boolean(webhookExplicit) && botModeEnv !== 'polling');

  if (isWebhookMode && webhookExplicit) {
    // 显式指定了 Webhook 模式和应用本身的穿透域名
    const configuredWebhookHost = normalizePublicUrl(webhookExplicit);
    const webhookUrl = `${configuredWebhookHost}/api/telegram/webhook`;
    botStatus.mode = 'webhook';
    botStatus.pollingActive = false;
    botStatus.webhookUrl = webhookUrl;

    const rawSecret = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim().replace(/^['"]+|['"]+$/g, '');
    const validSecret = /^[A-Za-z0-9_-]{1,256}$/.test(rawSecret) ? rawSecret : '';
    const secretParam = validSecret ? `&secret_token=${encodeURIComponent(validSecret)}` : '';

    const setWebhookUrl = `${apiBase}/bot${token}/setWebhook?url=${encodeURIComponent(
      webhookUrl
    )}${secretParam}&drop_pending_updates=true&allowed_updates=${encodeURIComponent(
      JSON.stringify(['message', 'edited_message', 'channel_post', 'callback_query'])
    )}`;

    console.log(`🤖 [Telegram Bot] 检测到显式配置 Webhook 回调地址: ${webhookUrl}`);
    console.log(`🤖 [Telegram Bot] 正在向 Telegram 注册 Webhook...`);

    try {
      const res = await fetch(setWebhookUrl, { signal: AbortSignal.timeout(8000) });
      const data = (await res.json().catch(() => ({}))) as any;
      if (data && data.ok) {
        botStatus.lastError = null;
        console.log(`✅ [Telegram Bot] Webhook 注册成功！`);
        console.log(`   • 回调入口: ${webhookUrl}`);
        return;
      } else {
        const errorMsg = data?.description || JSON.stringify(data);
        botStatus.lastError = `Webhook 注册未通过: ${errorMsg}`;
        console.warn(`⚠️ [Telegram Bot] Webhook 注册未通过:`, errorMsg);
        console.log(`🚀 [Telegram Bot] 自动降级启动【长轮询模式 (Long Polling)】...`);
      }
    } catch (err: any) {
      botStatus.lastError = `Webhook 注册请求异常: ${err?.message || err}`;
      console.warn(`⚠️ [Telegram Bot] Webhook 注册请求异常，降级启动长轮询:`, err?.message || err);
    }
  }

  // 默认启动长轮询模式 (Long Polling)
  // 通过反代 URL 直连 Telegram getUpdates，国内 Termux / 无代理服务器完美运行！
  console.log(`🚀 [Telegram Bot] 自动启动【长轮询模式 (Long Polling)】！`);
  console.log(`   • Telegram 反代通道: ${apiBase}`);
  console.log(`   • 运行优势: 国内网络免代理直连，无需穿透隧道与公网域名，全自动接收与响应管理指令！`);
  await startTelegramPolling(token, broadcast);
}
