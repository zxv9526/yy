// Authoritative Real-Time Presence & Player Counting Engine
// Tracks genuine connected players across the 3 game sections:
// - 经典烟三 (烟三风云台)
// - 十三张 (深海幻蓝台)
// - 经典麻将 (幻彩紫晶池)

export type GameType = 'yansan' | 'shisanshui' | 'mahjong';

export interface ClientPresenceInfo {
  socketId: string;
  gameType: GameType | 'lobby' | null;
  playerId?: string;
  playerName?: string;
  sceneMode?: string;
  lastSeen: number;
}

export interface RealPresenceCounts {
  yansan: number;
  shisanshui: number;
  mahjong: number;
  totalOnline: number;
}

class PresenceTracker {
  private clients = new Map<string, ClientPresenceInfo>();
  private sceneWaitingRoomsRef: Map<string, any> | null = null;
  private roomsRef: Map<string, any> | null = null;
  private wssRef: any = null;

  public setReferences(refs: {
    sceneWaitingRooms?: Map<string, any>;
    rooms?: Map<string, any>;
    wss?: any;
  }) {
    if (refs.sceneWaitingRooms) this.sceneWaitingRoomsRef = refs.sceneWaitingRooms;
    if (refs.rooms) this.roomsRef = refs.rooms;
    if (refs.wss) this.wssRef = refs.wss;
  }

  public recordClient(
    socketId: string,
    info?: {
      gameType?: string | null;
      playerId?: string;
      playerName?: string;
      sceneMode?: string;
    }
  ) {
    const existing = this.clients.get(socketId) || {
      socketId,
      gameType: 'lobby',
      lastSeen: Date.now(),
    };

    if (info) {
      if (info.gameType !== undefined) {
        existing.gameType = (info.gameType as any) || 'lobby';
      }
      if (info.playerId) existing.playerId = info.playerId;
      if (info.playerName) existing.playerName = info.playerName;
      if (info.sceneMode !== undefined) existing.sceneMode = info.sceneMode;
    }

    existing.lastSeen = Date.now();
    this.clients.set(socketId, existing);
  }

  public removeClient(socketId: string) {
    this.clients.delete(socketId);
  }

  public updateClientGame(
    socketId: string,
    gameType: GameType | 'lobby' | null,
    sceneMode?: string
  ) {
    const item = this.clients.get(socketId);
    if (item) {
      item.gameType = gameType;
      if (sceneMode !== undefined) item.sceneMode = sceneMode;
      item.lastSeen = Date.now();
    } else {
      this.clients.set(socketId, {
        socketId,
        gameType,
        sceneMode,
        lastSeen: Date.now(),
      });
    }
  }

  public getRealGamePresence(): RealPresenceCounts {
    const counts: RealPresenceCounts = {
      yansan: 0,
      shisanshui: 0,
      mahjong: 0,
      totalOnline: 0,
    };

    // Calculate total online
    if (this.wssRef && this.wssRef.clients) {
      counts.totalOnline = this.wssRef.clients.size;
    } else {
      counts.totalOnline = this.clients.size;
    }

    // Accumulate distinct real players for each game section
    const targetGames: GameType[] = ['yansan', 'shisanshui', 'mahjong'];

    for (const gt of targetGames) {
      const distinctUsers = new Set<string>();

      // 1. Sockets currently located in this game
      for (const [sId, c] of this.clients.entries()) {
        if (c.gameType === gt) {
          const userKey = c.playerId || c.playerName || `sock-${sId}`;
          distinctUsers.add(userKey);
        }
      }

      // 2. Active Scene Waiting Rooms for this game
      if (this.sceneWaitingRoomsRef) {
        for (const room of this.sceneWaitingRoomsRef.values()) {
          if (room && room.gameType === gt && Array.isArray(room.players)) {
            for (const p of room.players) {
              if (p && !p.isSimulated) {
                const userKey = p.id || p.name;
                if (userKey) distinctUsers.add(userKey);
              }
            }
          }
        }
      }

      // 3. Active Playing Game Rooms for this game (excluding default static demo rooms)
      if (this.roomsRef) {
        for (const room of this.roomsRef.values()) {
          // Exclude default placeholder demo rooms RM-202, RM-204, RM-205 from counting
          if (room.id === 'RM-202' || room.id === 'RM-204' || room.id === 'RM-205') {
            continue;
          }
          if (room && room.gameType === gt && Array.isArray(room.players)) {
            for (const p of room.players) {
              if (p && !p.isSimulated && p.id && !p.id.startsWith('P-sim-')) {
                const userKey = p.id || p.name;
                if (userKey) distinctUsers.add(userKey);
              }
            }
          }
        }
      }

      counts[gt] = distinctUsers.size;
    }

    return counts;
  }
}

export const presenceTracker = new PresenceTracker();
