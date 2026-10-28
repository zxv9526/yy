import { executeTelegramUpdate } from './serverApi.ts';

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

function maskToken(token: string): string {
  if (!token || token.length < 10) return '***';
  return token.substring(0, 5) + '...' + token.substring(token.length - 4);
}

export function getTelegramBotStatus(): TelegramBotStatus {
  return { ...botStatus };
}

/**
 * 启动 Telegram 长轮询服务 (Long Polling)
 * 当未配置 URL 变量或处于无公网域名环境时，直接通过官方 getUpdates 长轮询获取指令
 */
export async function startTelegramPolling(token: string, broadcast?: Function): Promise<void> {
  if (broadcast) savedBroadcast = broadcast;

  // 终止旧的轮询实例
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

  // 1. 在开启轮询前，向 Telegram 官方注销旧的 Webhook，避免 getUpdates 发生 409 Conflict 冲突
  try {
    const delRes = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=false`);
    const delData = (await delRes.json()) as any;
    if (delData && delData.ok) {
      console.log('🤖 [Telegram Bot] 已清理旧 Webhook，已成功切换为长轮询模式 (Long Polling)');
    }
  } catch (err: any) {
    console.warn('⚠️ [Telegram Bot] 清理 Webhook 时遇到网络波动:', err?.message || err);
  }

  console.log('🤖 [Telegram Bot] 🚀 长轮询已就绪，正在后台监听 Telegram 消息 (免公网/免域名)...');

  let offset = 0;
  let consecutiveErrors = 0;

  // 轮询主循环
  (async () => {
    while (!controller.signal.aborted) {
      try {
        botStatus.lastPollTimestamp = Date.now();
        // 设置 25 秒长连接等待时间 (Long Polling)，保持与 Telegram 服务器持久信道
        const fetchUrl = `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=25&allowed_updates=${encodeURIComponent(
          JSON.stringify(['message', 'callback_query'])
        )}`;

        const res = await fetch(fetchUrl, {
          signal: AbortSignal.timeout(35000),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          botStatus.lastError = `HTTP ${res.status}: ${errText}`;
          consecutiveErrors++;

          // 409 Conflict 表示仍有残留 Webhook 或其他实例在轮询
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
              // 统一由 executeTelegramUpdate 处理，保证与 Webhook 逻辑 100% 相同
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
        // 如果是长轮询正常的超时重连，直接继续下一个周期
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
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();

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

  // 读取 URL 配置变量 (优先 URL，同时兼容 APP_URL 与 WEBHOOK_URL)
  const configuredUrl = (
    process.env.URL ||
    process.env.APP_URL ||
    process.env.WEBHOOK_URL ||
    ''
  ).trim();

  botStatus.urlConfigured = configuredUrl;

  const isHttps = configuredUrl.startsWith('https://');
  const forcePolling = process.env.BOT_MODE === 'polling';

  if (isHttps && !forcePolling) {
    // 方案 A: 配置了有效 HTTPS 域名 -> 自动配置 Webhook
    const cleanUrl = configuredUrl.replace(/\/+$/, '');
    const webhookUrl = `${cleanUrl}/api/telegram/webhook`;
    botStatus.webhookUrl = webhookUrl;

    console.log(`🤖 [Telegram Bot] 检测到 URL 变量已设置公网 HTTPS: ${cleanUrl}`);
    console.log(`🤖 [Telegram Bot] 正在自动调用 setWebhook 注册: ${webhookUrl} ...`);

    try {
      const secret = process.env.TELEGRAM_WEBHOOK_SECRET
        ? `&secret_token=${encodeURIComponent(process.env.TELEGRAM_WEBHOOK_SECRET)}`
        : '';
      const setWebhookUrl = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(
        webhookUrl
      )}${secret}&allowed_updates=${encodeURIComponent(JSON.stringify(['message', 'callback_query']))}`;

      const res = await fetch(setWebhookUrl);
      const data = (await res.json()) as any;

      if (data && data.ok) {
        botStatus.mode = 'webhook';
        botStatus.pollingActive = false;
        console.log(`✅ [Telegram Bot] Webhook 自动注册成功！`);
        console.log(`   公网回调入口: ${webhookUrl}`);
        console.log(`   Telegram 推送将以毫秒级直推本服务！`);
        return;
      } else {
        console.warn(`⚠️ [Telegram Bot] Webhook 注册返回异常:`, data);
        console.log(`👉 正在自动降级启动【长轮询模式 (Long Polling)】保障 Bot 即时可用...`);
        await startTelegramPolling(token, broadcast);
      }
    } catch (err: any) {
      console.error(`❌ [Telegram Bot] 自动配置 Webhook 失败:`, err?.message || err);
      console.log(`👉 正在自动降级启动【长轮询模式 (Long Polling)】保障 Bot 即时可用...`);
      await startTelegramPolling(token, broadcast);
    }
  } else {
    // 方案 B: 未配置 URL 或 URL 为本地内网 / 指定了轮询模式 -> 自动启动长轮询
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
