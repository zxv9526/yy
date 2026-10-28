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

export function getTelegramApiBase(): string {
  refreshEnvFromDisk();
  const raw = (process.env.TELEGRAM_API_BASE || '').trim().replace(/^['"]+|['"]+$/g, '');
  if (!raw) return 'https://api.telegram.org';
  let base = raw;
  if (!/^https?:\/\//i.test(base)) {
    base = 'https://' + base;
  }
  return base.replace(/\/+$/, '');
}

/**
 * 查询 Telegram 官方当前的 Webhook 详细状态
 */
export async function getTelegramWebhookInfo(token: string): Promise<any> {
  try {
    const apiBase = getTelegramApiBase();
    const res = await fetch(`${apiBase}/bot${token}/getWebhookInfo`, {
      signal: AbortSignal.timeout(4000),
    });
    const data = (await res.json()) as any;
    if (data && data.ok) {
      botStatus.lastWebhookInfo = data.result;
      return data.result;
    }
    return null;
  } catch (err: any) {
    console.warn('⚠️ [Telegram Bot] 查询 getWebhookInfo 失败 (本地直连受限):', err?.message || err);
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
    const apiBase = getTelegramApiBase();
    const delRes = await fetch(`${apiBase}/bot${token}/deleteWebhook?drop_pending_updates=false`, {
      signal: AbortSignal.timeout(4000),
    });
    const delData = (await delRes.json().catch(() => ({}))) as any;
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
        const apiBase = getTelegramApiBase();
        const fetchUrl = `${apiBase}/bot${token}/getUpdates?offset=${offset}&timeout=25&allowed_updates=${encodeURIComponent(
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
            const apiBase = getTelegramApiBase();
            await fetch(`${apiBase}/bot${token}/deleteWebhook?drop_pending_updates=false`, {
              signal: AbortSignal.timeout(4000),
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
 * - 当 .env 中配置了有效 HTTPS 的 URL 变量时 -> 优先 Webhook 模式 (支持隧道反向投递与免代理回复)
 * - 当 .env 中 URL 变量为空或未配置时 -> 自动以长轮询 (Long Polling) 模式启动
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
    // 方案 A: 配置了有效 HTTPS 域名 -> 启动 Webhook 模式
    botStatus.mode = 'webhook';
    botStatus.pollingActive = false;
    const webhookUrl = `${configuredUrl}/api/telegram/webhook`;
    botStatus.webhookUrl = webhookUrl;

    const rawSecret = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim().replace(/^['"]+|['"]+$/g, '');
    const validSecret = /^[A-Za-z0-9_-]{1,256}$/.test(rawSecret) ? rawSecret : '';
    const secretParam = validSecret
      ? `&secret_token=${encodeURIComponent(validSecret)}`
      : '';

    const officialSetWebhookUrl = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(
      webhookUrl
    )}${secretParam}&drop_pending_updates=true&allowed_updates=${encodeURIComponent(
      JSON.stringify(['message', 'edited_message', 'channel_post', 'callback_query'])
    )}`;

    const apiBase = getTelegramApiBase();
    const setWebhookUrl = `${apiBase}/bot${token}/setWebhook?url=${encodeURIComponent(
      webhookUrl
    )}${secretParam}&drop_pending_updates=true&allowed_updates=${encodeURIComponent(
      JSON.stringify(['message', 'edited_message', 'channel_post', 'callback_query'])
    )}`;

    console.log(`🤖 [Telegram Bot] 检测到隧道公网 HTTPS 域名: ${configuredUrl}`);
    console.log(`🤖 [Telegram Bot] 正在向 Telegram 注册 Webhook 回调地址: ${webhookUrl} ...`);

    try {
      const res = await fetch(setWebhookUrl, {
        signal: AbortSignal.timeout(4000),
      });
      const data = (await res.json().catch(() => ({}))) as any;

      if (data && data.ok) {
        botStatus.lastError = null;

        console.log(`✅ [Telegram Bot] 恭喜！Telegram Webhook 注册成功！`);
        console.log(`   • 官方回调入口: ${webhookUrl}`);
        console.log(`   • 推送链路: Telegram -> 穿透隧道 -> 本地服务 (/api/telegram/webhook)`);

        const info = await getTelegramWebhookInfo(token);
        if (info) {
          if (info.url === webhookUrl) {
            console.log(`   • Telegram 服务器挂载状态: 🟢 已核实完全一致 (${info.url})`);
          } else {
            console.warn(`   • ⚠️ 提示：Telegram 当前登记的 URL 为: ${info.url}`);
          }
          if (info.last_error_message) {
            console.warn(`   • ⚠️ 历史递送警告: Telegram 上次报错 [${info.last_error_message}]`);
          }
          if (typeof info.pending_update_count === 'number' && info.pending_update_count > 0) {
            console.log(`   • 待处理排队消息: ${info.pending_update_count} 条，即将由 Webhook 毫秒级直推！`);
          }
        }
        return;
      } else {
        const errorMsg = data?.description || JSON.stringify(data);
        botStatus.lastError = `Webhook 官方返回: ${errorMsg}`;
        console.warn(`⚠️ [Telegram Bot] Webhook 自动注册未通过:`, errorMsg);
        console.log(`👉 解决方案：请在浏览器中打开官方链接完成一键激活: ${officialSetWebhookUrl}`);
      }
    } catch (err: any) {
      botStatus.lastError = '本地直连受限 (fetch failed)。已启用免代理 Webhook 模式，请在浏览器中完成一次性注册。';
      console.warn(`⚠️ [Telegram Bot] 本地 Node 无法直连 api.telegram.org (国内服务器/Termux常见现象)。`);
      console.log(`💡 [Telegram Bot 免代理全自动运行秘诀]:`);
      console.log(`   Telegram Webhook 具备“免代理双向直通”机制！`);
      console.log(`   您只需在手机浏览器或电脑（具备科学上网环境）中点击打开以下链接一次：`);
      console.log(`   👉 官方一键激活直链: ${officialSetWebhookUrl}`);
      console.log(`   👉 点击后 Telegram 将返回 {"ok":true}，之后即使手机完全不挂梯子，Telegram 也会通过隧道直推消息并由本地极速秒回！`);
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
