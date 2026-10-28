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
      dotenv.config({ path: p, override: true });
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
 * 查询 Telegram 官方当前的 Webhook 详细状态
 */
export async function getTelegramWebhookInfo(token: string): Promise<any> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const data = (await res.json()) as any;
    if (data && data.ok) {
      botStatus.lastWebhookInfo = data.result;
      return data.result;
    }
    return null;
  } catch (err: any) {
    console.warn('⚠️ [Telegram Bot] 查询 getWebhookInfo 失败:', err?.message || err);
    return null;
  }
}

/**
 * 启动 Telegram 长轮询服务 (Long Polling)
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

  try {
    const delRes = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=false`);
    const delData = (await delRes.json()) as any;
    if (delData && delData.ok) {
      console.log('🤖 [Telegram Bot] 已注销 Webhook，已切换为长轮询模式 (Long Polling)');
    }
  } catch (err: any) {
    console.warn('⚠️ [Telegram Bot] 清理 Webhook 时网络波动:', err?.message || err);
  }

  console.log('🤖 [Telegram Bot] 🚀 长轮询已就绪，正在后台监听 Telegram 消息 (免公网/免域名)...');

  let offset = 0;
  let consecutiveErrors = 0;

  (async () => {
    while (!controller.signal.aborted) {
      try {
        botStatus.lastPollTimestamp = Date.now();
        const fetchUrl = `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=25&allowed_updates=${encodeURIComponent(
          JSON.stringify(['message', 'edited_message', 'channel_post', 'callback_query'])
        )}`;

        const res = await fetch(fetchUrl, {
          signal: AbortSignal.timeout(35000),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          botStatus.lastError = `HTTP ${res.status}: ${errText}`;
          consecutiveErrors++;

          if (res.status === 409) {
            console.warn('⚠️ [Telegram Bot] 检测到冲突 (409 Conflict)，正在重试清理 Webhook 并等待 5 秒...');
            await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=false`).catch(() => {});
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
 * - 当 .env 中配置了有效 HTTPS 的 URL 变量时 -> 自动调用 setWebhook 注册公网 Webhook
 * - 当 .env 中 URL 变量为空、未配置或非 HTTPS 时 -> 自动以长轮询 (Long Polling) 模式启动
 */
export async function initTelegramBotService(broadcast?: Function): Promise<void> {
  if (broadcast) savedBroadcast = broadcast;

  // 1. 动态刷新并强制加载最新的 .env 文件，防止运行时读取旧变量
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

  botStatus.tokenConfigured = true;
  botStatus.tokenMasked = maskToken(token);
  botStatus.enabled = true;

  // 读取并规范化 URL 配置变量 (优先 URL，兼容 APP_URL 与 WEBHOOK_URL)
  const rawUrl = (
    process.env.URL ||
    process.env.APP_URL ||
    process.env.WEBHOOK_URL ||
    ''
  ).trim();

  const configuredUrl = normalizePublicUrl(rawUrl);
  botStatus.urlConfigured = configuredUrl;

  const isHttps = configuredUrl.startsWith('https://');
  const forcePolling = process.env.BOT_MODE === 'polling';

  if (isHttps && !forcePolling) {
    // 方案 A: 配置了有效 HTTPS 域名 -> 自动配置 Webhook
    const webhookUrl = `${configuredUrl}/api/telegram/webhook`;
    botStatus.webhookUrl = webhookUrl;

    console.log(`🤖 [Telegram Bot] 检测到隧道公网 HTTPS 域名: ${configuredUrl}`);
    console.log(`🤖 [Telegram Bot] 正在向 Telegram 官方注册 Webhook 回调地址: ${webhookUrl} ...`);

    try {
      const rawSecret = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim().replace(/^['"]+|['"]+$/g, '');
      const validSecret = /^[A-Za-z0-9_-]{1,256}$/.test(rawSecret) ? rawSecret : '';
      const secretParam = validSecret
        ? `&secret_token=${encodeURIComponent(validSecret)}`
        : '';

      const setWebhookUrl = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(
        webhookUrl
      )}${secretParam}&allowed_updates=${encodeURIComponent(
        JSON.stringify(['message', 'edited_message', 'channel_post', 'callback_query'])
      )}`;

      const res = await fetch(setWebhookUrl);
      const data = (await res.json()) as any;

      if (data && data.ok) {
        botStatus.mode = 'webhook';
        botStatus.pollingActive = false;
        botStatus.lastError = null;

        console.log(`✅ [Telegram Bot] 恭喜！Telegram Webhook 注册成功！`);
        console.log(`   • 官方回调入口: ${webhookUrl}`);
        console.log(`   • 推送链路: Telegram -> 穿透隧道 -> 本地服务 (/api/telegram/webhook)`);

        // 查询官方当前实际生效信息并做自检
        const info = await getTelegramWebhookInfo(token);
        if (info) {
          if (info.url === webhookUrl) {
            console.log(`   • Telegram 服务器挂载状态: 🟢 已核实完全一致 (${info.url})`);
          } else {
            console.warn(`   • ⚠️ 提示：Telegram 当前登记的 URL 为: ${info.url}`);
          }
          if (info.last_error_message) {
            console.warn(`   • ⚠️ 历史递送警告: Telegram 上次报错 [${info.last_error_message}]`);
            console.warn(`     (如为 502/Bad Gateway，请检查穿透隧道是否正确定向到本地 3000 端口)`);
          }
          if (typeof info.pending_update_count === 'number' && info.pending_update_count > 0) {
            console.log(`   • 待处理排队消息: ${info.pending_update_count} 条，即将由 Webhook 毫秒级直推！`);
          }
        }
        return;
      } else {
        const errorMsg = data?.description || JSON.stringify(data);
        botStatus.lastError = `Webhook 注册失败: ${errorMsg}`;
        console.error(`❌ [Telegram Bot] Webhook 注册失败，Telegram 官方返回错误:`, errorMsg);
        console.log(`👉 正在自动启动【长轮询模式 (Long Polling)】保底，确保 Bot 不掉线...`);
        await startTelegramPolling(token, broadcast);
      }
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      botStatus.lastError = `Webhook 注册网络异常: ${errorMsg}`;
      console.error(`❌ [Telegram Bot] 自动配置 Webhook 时发生网络请求异常:`, errorMsg);
      console.log(`👉 正在自动降级启动【长轮询模式 (Long Polling)】保障 Bot 即时可用...`);
      await startTelegramPolling(token, broadcast);
    }
  } else {
    // 方案 B: 未配置 URL 或 URL 非 HTTPS -> 自动启动长轮询
    if (configuredUrl) {
      console.log(`🤖 [Telegram Bot] URL 变量为非 HTTPS 地址 ('${configuredUrl}')，Telegram Webhook 仅支持 HTTPS。`);
    } else {
      console.log(`🤖 [Telegram Bot] .env 中未配置 URL 变量 (URL 为空)。`);
    }
    console.log(`🚀 [Telegram Bot] 自动启动【长轮询模式 (Long Polling)】！`);
    console.log(`   优势：无需公网 IP、无需域名、无需端口映射，在手机 Termux 或内网均可直接接收 Bot 指令！`);
    await startTelegramPolling(token, broadcast);
  }
}
