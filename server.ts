import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { loadDatabase, saveDatabase } from './src/serverStorage.ts';
import { handleApiRoute } from './src/serverApi.ts';
import { initTelegramBotService } from './src/telegramBotService.ts';

// Auto-detect and load .env from project directory, parent directory (~/.env), or HOME
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type GameType = 'yansan' | 'shisanshui' | 'mahjong';

const app = express();
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('error', (err) => {
  console.warn('[WS Server Warning]', err);
});

export interface AuthoritativeBoardState {
  roomId: string;
  gameType: string;
  phase: 'idle' | 'bidding' | 'playing' | 'comparing' | 'ended';
  turnSeat: number;
  actionSeq: number;
  moveCount: number;
  multiplier: number;
  handsCount: number[];
  lastCombo?: any;
  landlordSeat?: number;
  winnerSeat?: number | null;
  updatedAt: number;
}

function createDefaultBoardState(roomId: string, gameType: string): AuthoritativeBoardState {
  return {
    roomId,
    gameType,
    phase: 'playing',
    turnSeat: 0,
    actionSeq: 1,
    moveCount: 0,
    multiplier: 1,
    handsCount: [13, 13, 13, 13],
    lastCombo: null,
    landlordSeat: undefined,
    winnerSeat: null,
    updatedAt: Date.now(),
  };
}

const rooms = new Map<string, any>([
  [
    'RM-202',
    {
      id: 'RM-202',
      title: '风雷堂 · 经典烟三四人赛',
      gameType: 'yansan',
      status: 'playing',
      players: [
        { id: 'P-4', name: '快枪手张三', rating: 2010, seat: 0 },
        { id: 'P-5', name: '关门客李四', rating: 1940, seat: 1 },
        { id: 'P-6', name: '岭南少侠', rating: 1870, seat: 2 },
      ],
      spectators: 9,
      turnSeat: 0,
      moveCount: 6,
      modeLabel: '方块三首出 · 四人争锋',
      chat: [{ id: 'c2', sender: '快枪手张三', text: '方块三直接开顺子！', timestamp: '10:04' }],
      boardState: createDefaultBoardState('RM-202', 'yansan'),
    },
  ],
  [
    'RM-204',
    {
      id: 'RM-204',
      title: '水镜阁 · 经典十三水',
      gameType: 'shisanshui',
      status: 'playing',
      players: [
        { id: 'P-11', name: '罗宋巧手', rating: 2060, seat: 0 },
        { id: 'P-12', name: '倒水掌门', rating: 1850, seat: 1 },
        { id: 'P-13', name: '十三飞龙', rating: 2200, seat: 2 },
        { id: 'P-14', name: '七星居士', rating: 1970, seat: 3 },
      ],
      spectators: 18,
      turnSeat: 0,
      moveCount: 1,
      modeLabel: '头中尾三道 · 智能理牌',
      chat: [{ id: 'c4', sender: '十三飞龙', text: '尾道葫芦中道同花，防倒水稳如磐石。', timestamp: '10:06' }],
      boardState: createDefaultBoardState('RM-204', 'shisanshui'),
    },
  ],
  [
    'RM-205',
    {
      id: 'RM-205',
      title: '雀神楼 · 经典国标麻将',
      gameType: 'mahjong',
      status: 'playing',
      players: [
        { id: 'P-15', name: '天和雀圣', rating: 2240, seat: 0 },
        { id: 'P-16', name: '清一色老叟', rating: 2110, seat: 1 },
        { id: 'P-17', name: '大三元道长', rating: 2180, seat: 2 },
        { id: 'P-18', name: '十三幺隐士', rating: 2290, seat: 3 },
      ],
      spectators: 31,
      turnSeat: 0,
      moveCount: 12,
      modeLabel: '万条筒字 · 碰杠听胡',
      chat: [{ id: 'c5', sender: '天和雀圣', text: '自摸万字清一色，听牌在手！', timestamp: '10:07' }],
      boardState: createDefaultBoardState('RM-205', 'mahjong'),
    },
  ],
]);

interface ScenePlayer {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  coins: number;
  seat: number;
  isSimulated?: boolean;
}

interface SceneWaitingRoom {
  id: string;
  gameType: string;
  sceneMode: string;
  sceneName: string;
  maxPlayers: number;
  players: ScenePlayer[];
  status: 'waiting' | 'starting' | 'playing';
  createdAt: number;
}

const sceneWaitingRooms = new Map<string, SceneWaitingRoom>();

function broadcast(payload: unknown) {
  try {
    const raw = JSON.stringify(payload);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(raw);
        } catch {}
      }
    }
  } catch {}
}

wss.on('connection', (ws) => {
  (ws as any).isAlive = true;
  (ws as any).lastHeartbeat = Date.now();

  ws.on('pong', () => {
    (ws as any).isAlive = true;
    (ws as any).lastHeartbeat = Date.now();
  });

  ws.on('error', () => {
    // Gracefully ignore client connection reset
  });

  try {
    ws.send(
      JSON.stringify({
        type: 'lobby_snapshot',
        rooms: Array.from(rooms.values()),
        onlineCount: wss.clients.size + 36,
        serverTs: Date.now(),
      })
    );
  } catch {}

  ws.on('close', () => {
    const sRoomId = (ws as any).sceneRoomId;
    const pId = (ws as any).scenePlayerId;
    if (sRoomId && sceneWaitingRooms.has(sRoomId)) {
      const room = sceneWaitingRooms.get(sRoomId)!;
      room.players = room.players.filter((pl) => pl.id !== pId);
      if (room.players.length === 0) {
        sceneWaitingRooms.delete(sRoomId);
      } else {
        room.players.forEach((pl, idx) => {
          pl.seat = idx;
        });
        room.status = 'waiting';
        broadcast({
          type: 'scene_room_update',
          roomId: room.id,
          gameType: room.gameType,
          sceneMode: room.sceneMode,
          players: room.players,
          maxPlayers: room.maxPlayers,
          status: room.status,
        });
      }
    }
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'ping') {
        (ws as any).isAlive = true;
        (ws as any).lastHeartbeat = Date.now();
        ws.send(
          JSON.stringify({
            type: 'pong',
            clientTs: msg.clientTs,
            serverTs: Date.now(),
            onlineCount: wss.clients.size + 36,
          })
        );
        return;
      }

      // ==========================================
      // Pure Multiplayer Scene Waiting Room Events (彻底移除人机补位)
      // ==========================================
      if (msg.type === 'scene_join') {
        const gType = msg.gameType || 'yansan';
        const sMode = msg.sceneMode || 'standard';
        const sName = msg.sceneName || '经典场';
        const maxP = Number(msg.maxPlayers) || 4;
        const p: ScenePlayer = msg.player || {
          id: `P-${Date.now()}`,
          name: '牌友',
          avatar: '👤',
          rating: 1900,
          coins: 2000,
          seat: 0,
        };

        // Find existing open room for this exact gameType + sceneMode
        let room: SceneWaitingRoom | undefined;
        for (const r of sceneWaitingRooms.values()) {
          if (r.gameType === gType && r.sceneMode === sMode && r.status === 'waiting' && r.players.length < r.maxPlayers) {
            room = r;
            break;
          }
        }

        if (!room) {
          const id = `SCENE-${gType}-${sMode}-${Date.now().toString(36)}`;
          room = {
            id,
            gameType: gType,
            sceneMode: sMode,
            sceneName: sName,
            maxPlayers: maxP,
            players: [],
            status: 'waiting',
            createdAt: Date.now(),
          };
          sceneWaitingRooms.set(id, room);
        }

        const existingIdx = room.players.findIndex((pl) => pl.id === p.id || pl.name === p.name);
        if (existingIdx !== -1) {
          room.players[existingIdx] = { ...room.players[existingIdx], ...p };
        } else if (room.players.length < room.maxPlayers) {
          p.seat = room.players.length;
          room.players.push(p);
        }

        (ws as any).sceneRoomId = room.id;
        (ws as any).scenePlayerId = p.id;

        broadcast({
          type: 'scene_room_update',
          roomId: room.id,
          gameType: room.gameType,
          sceneMode: room.sceneMode,
          players: room.players,
          maxPlayers: room.maxPlayers,
          status: room.status,
        });

        if (room.players.length >= room.maxPlayers) {
          room.status = 'starting';
          broadcast({
            type: 'scene_room_full',
            roomId: room.id,
            gameType: room.gameType,
            sceneMode: room.sceneMode,
            players: room.players,
            maxPlayers: room.maxPlayers,
          });
        }
        return;
      }

      if (msg.type === 'scene_leave') {
        for (const [id, room] of sceneWaitingRooms.entries()) {
          if (room.gameType === msg.gameType && room.sceneMode === msg.sceneMode) {
            room.players = room.players.filter((pl) => pl.id !== msg.playerId);
            if (room.players.length === 0) {
              sceneWaitingRooms.delete(id);
            } else {
              room.players.forEach((pl, idx) => {
                pl.seat = idx;
              });
              room.status = 'waiting';
              broadcast({
                type: 'scene_room_update',
                roomId: room.id,
                gameType: room.gameType,
                sceneMode: room.sceneMode,
                players: room.players,
                maxPlayers: room.maxPlayers,
                status: room.status,
              });
            }
          }
        }
        return;
      }

      if (msg.type === 'scene_chat') {
        broadcast({
          type: 'scene_chat_broadcast',
          gameType: msg.gameType,
          sceneMode: msg.sceneMode,
          sender: msg.sender || '牌友',
          text: String(msg.text || '').slice(0, 100),
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        });
        return;
      }

      if (msg.type === 'room_create') {
        const id = `RM-${Math.floor(207 + Math.random() * 800)}`;
        const gType = msg.gameType || 'yansan';
        const newRoom = {
          id,
          title: msg.title || `${msg.playerName || '茗局雅客'}的牌局`,
          gameType: gType,
          status: 'playing',
          players: [{ id: `P-${Date.now()}`, name: msg.playerName || '茗局雅客', rating: 1900, seat: 0 }],
          spectators: 1,
          turnSeat: 0,
          moveCount: 0,
          modeLabel: '实时 WebSocket 牌桌',
          chat: [
            {
              id: `c-${Date.now()}`,
              sender: '系统司仪',
              text: `房间 ${id} 已建立，欢迎各路牌友入席！`,
              timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            },
          ],
          boardState: createDefaultBoardState(id, gType),
        };
        rooms.set(id, newRoom);
        broadcast({ type: 'room_created', room: newRoom, rooms: Array.from(rooms.values()) });
        return;
      }

      if (msg.type === 'room_join') {
        const room = rooms.get(msg.roomId);
        if (room) {
          const playerName = msg.playerName || '牌友';
          const existingPlayer = room.players.find((p: any) => p.name === playerName);
          if (!existingPlayer && room.players.length < 4) {
            room.players.push({
              id: `P-${Date.now()}`,
              name: playerName,
              rating: msg.rating || 1900,
              seat: room.players.length,
            });
          } else {
            room.spectators += 1;
          }
          broadcast({ type: 'room_updated', room, rooms: Array.from(rooms.values()) });
        }
        return;
      }

      if (msg.type === 'room_leave') {
        const room = rooms.get(msg.roomId);
        if (room) {
          room.spectators = Math.max(0, room.spectators - 1);
          broadcast({ type: 'room_updated', room, rooms: Array.from(rooms.values()) });
        }
        return;
      }

      // Authoritative Reconnect Handler
      if (msg.type === 'room_reconnect') {
        const room = rooms.get(msg.roomId);
        if (room) {
          try {
            ws.send(
              JSON.stringify({
                type: 'reconnect_ack',
                room,
                boardState: room.boardState,
                serverTs: Date.now(),
              })
            );
          } catch {}
        }
        return;
      }

      // Authoritative Move & Event Processing
      if (msg.type === 'game_move') {
        const room = rooms.get(msg.roomId);
        if (room) {
          room.moveCount += 1;
          const seat = typeof msg.seat === 'number' ? msg.seat : 0;
          const p = msg.payload || {};

          // Update authoritative board state
          if (!room.boardState) {
            room.boardState = createDefaultBoardState(room.id, room.gameType);
          }
          const bs = room.boardState;

          // Boundary validation
          if (seat < 0 || seat >= (bs.handsCount?.length || 4)) {
            return;
          }

          bs.actionSeq = (bs.actionSeq || 0) + 1;
          bs.moveCount = room.moveCount;
          bs.updatedAt = Date.now();
          room.lastTurnTs = Date.now();

          if (p.multiplier) bs.multiplier = Number(p.multiplier);
          if (p.landlord !== undefined) {
            bs.landlordSeat = Number(p.landlord);
            bs.phase = 'playing';
          }
          if (p.nextTurn !== undefined) {
            bs.turnSeat = Number(p.nextTurn);
            room.turnSeat = bs.turnSeat;
          }
          if (p.combo) bs.lastCombo = p.combo;
          if (p.handsCount && Array.isArray(p.handsCount)) {
            bs.handsCount = p.handsCount;
          } else if (seat < bs.handsCount.length && p.cardsCount) {
            bs.handsCount[seat] = Math.max(0, bs.handsCount[seat] - Number(p.cardsCount));
          }
          if (p.winner !== undefined && p.winner !== null) {
            bs.winnerSeat = Number(p.winner);
            bs.phase = 'ended';
          }

          broadcast({
            type: 'game_event',
            roomId: room.id,
            seat,
            payload: p,
            moveCount: room.moveCount,
            boardState: bs,
          });
        }
        return;
      }

      if (msg.type === 'game_chat') {
        const room = rooms.get(msg.roomId);
        if (room && msg.text) {
          const chatMsg = {
            id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            sender: msg.sender || '牌友',
            avatar: msg.avatar || '👤',
            text: String(msg.text).slice(0, 100),
            prop: msg.prop || null,
            targetSeat: msg.targetSeat !== undefined ? msg.targetSeat : null,
            voice: Boolean(msg.voice),
            timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          };
          room.chat = [...room.chat.slice(-49), chatMsg];
          broadcast({ type: 'chat_broadcast', roomId: room.id, message: chatMsg });
        }
        return;
      }
    } catch {}
  });
});

// Periodic WebSocket zombie client heartbeat sweep (terminates stalled half-open TCP connections)
setInterval(() => {
  const now = Date.now();
  for (const client of wss.clients) {
    const wsAny = client as any;
    if (wsAny.isAlive === false || (wsAny.lastHeartbeat && now - wsAny.lastHeartbeat > 45000)) {
      client.terminate();
    } else {
      wsAny.isAlive = false;
      try {
        client.ping();
      } catch {}
    }
  }
}, 30000);

// Authoritative AFK Watchdog: auto-advance turn if player is disconnected/stalled > 35s in playing phase
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.status === 'playing' && room.boardState && room.boardState.phase === 'playing') {
      if (room.lastTurnTs && now - room.lastTurnTs > 35000) {
        room.lastTurnTs = now;
        const currentSeat = room.turnSeat || 0;
        const totalSeats = room.boardState.handsCount?.length || 4;
        const nextSeat = (currentSeat + 1) % totalSeats;
        room.turnSeat = nextSeat;
        room.boardState.turnSeat = nextSeat;
        room.boardState.updatedAt = now;

        // Special rule guard for Yansan: first move MUST include Diamond 4 (♦4).
        // If the lead player timed out on trick #1, auto-play Diamond 4 to prevent game deadlock.
        const isYansanFirstMove = room.gameType === 'yansan' && (room.moveCount === 0 || !room.boardState.lastCombo);
        if (isYansanFirstMove) {
          room.moveCount += 1;
          room.boardState.moveCount = room.moveCount;
          room.boardState.actionSeq = (room.boardState.actionSeq || 0) + 1;
          const d4Combo = {
            type: 'single',
            rank: 4,
            suitVal: 1,
            cards: [{ id: 'd-4', rank: 4, suitVal: 1, label: '4', suit: '♦', isRed: true }],
            label: '单张 ♦4 (首出保底)',
            seat: currentSeat,
          };
          room.boardState.lastCombo = d4Combo;
          if (room.boardState.handsCount && room.boardState.handsCount[currentSeat] > 0) {
            room.boardState.handsCount[currentSeat] = Math.max(0, room.boardState.handsCount[currentSeat] - 1);
          }
          broadcast({
            type: 'game_event',
            roomId: room.id,
            seat: currentSeat,
            payload: {
              autoPlay: true,
              combo: d4Combo,
              cardsCount: 1,
              nextTurn: nextSeat,
              reason: 'timeout_first_move_diamond4',
            },
            moveCount: room.moveCount,
            boardState: room.boardState,
          });
        } else {
          broadcast({
            type: 'game_event',
            roomId: room.id,
            seat: currentSeat,
            payload: { autoPass: true, nextTurn: nextSeat, reason: 'timeout_pass' },
            moveCount: room.moveCount,
            boardState: room.boardState,
          });
        }
      }
    }
  }
}, 5000);

// Periodic room garbage collection: clean stale user-created rooms and empty scene waiting rooms older than 1 hour
setInterval(() => {
  const now = Date.now();
  const defaultRoomIds = new Set(['RM-202', 'RM-204', 'RM-205']);
  for (const [id, room] of rooms.entries()) {
    if (!defaultRoomIds.has(id) && room.createdAt && now - room.createdAt > 3600000 && (room.spectators <= 1 || (!room.players || room.players.length === 0))) {
      rooms.delete(id);
    }
  }
  for (const [id, sRoom] of sceneWaitingRooms.entries()) {
    if (sRoom.createdAt && now - sRoom.createdAt > 3600000 && (!sRoom.players || sRoom.players.length === 0)) {
      sceneWaitingRooms.delete(id);
    }
  }
}, 600000);

// Unified API Route Dispatcher
app.use(async (req, res, next) => {
  if (req.url && req.url.startsWith('/api/')) {
    try {
      const handled = await handleApiRoute(req, res, broadcast);
      if (handled) return;
    } catch (err) {
      console.error('[API Error]', err);
      return res.status(500).json({ error: String(err) });
    }
  }
  next();
});

// Static file serving or automated Vite dev middleware fallback
const distHtml = path.join(__dirname, 'dist', 'index.html');

if (fs.existsSync(distHtml)) {
  // Production mode: high-performance static caching headers for SVG assets
  app.use(
    express.static(path.join(__dirname, 'dist'), {
      maxAge: '1y',
      immutable: true,
    })
  );
  app.get('*', (_req, res) => {
    res.sendFile(distHtml);
  });
} else {
  // Guidance fallback when dist has not been cloned or built
  console.warn('⚠️ [Server] 未在项目根目录检测到 dist/index.html 生产静态资源。');
  console.warn('💡 [提示] 请确保已将包含 dist 文件夹的仓库完整推送并在 Termux 中 pull。');

  app.get('*', (_req, res) => {
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>国粹棋牌 · 提示</title>
        <style>
          body { background: #12100E; color: #F5EFE6; font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
          .box { background: #1C1815; border: 1px solid #D97706; border-radius: 20px; padding: 28px; max-width: 520px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); }
          h2 { color: #FBBF24; margin-top: 0; }
          p { font-size: 14px; line-height: 1.6; color: #D6C7B2; }
          code { background: #26201B; padding: 4px 10px; border-radius: 6px; color: #34D399; font-family: monospace; font-size: 14px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="box">
          <h2>⚠️ 尚未检测到前端 dist 静态包</h2>
          <p>由于 Android Termux 底层缺乏 glibc 动态库，手机上直接运行 <code>vite build</code> 会报 <code>Segmentation fault</code>。</p>
          <p><strong>最稳妥解决方案</strong>：项目已取消 <code>dist</code> 的忽略限制，只需在电脑或开发端运行 <code>npm run build</code> 后，将生成的 <code>dist</code> 目录一同 <code>git push</code> 到 GitHub。</p>
          <p>随后在 Termux 中执行 <code>git pull</code> 即可直接极速畅玩，无需在手机上编译！</p>
        </div>
      </body>
      </html>
    `);
  });
}

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌【端口冲突】端口 ${PORT} 已被后台旧服务占用！`);
    console.error('👉 解决办法：在 Termux 终端执行以下命令释放端口后再启动：');
    console.error('   pkill -9 -f "node|tsx|server"\n');
    process.exit(1);
  } else {
    console.error('[Server Error]', err);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  // 自动调度 Telegram Bot (根据 .env 的 URL 配置智能选择 Webhook 或轮询启动)
  initTelegramBotService(broadcast).catch((err) => {
    console.error('⚠️ [Telegram Bot Init Error]', err);
  });
});
