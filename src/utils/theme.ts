export interface TableTheme {
  id: string;
  name: string;
  gameType?: string;
  feltColor: string;
  edgeColor: string;
  borderColor: string;
  accentColor: string;
  textColor: string;
  highlightColor?: string;
}

// 3 Dedicated Game Theme Colors matching the 3D Lobby Cards 1:1 - Upgraded to luminous, bright salon palettes
export const GAME_THEMES_MAP: Record<string, TableTheme> = {
  yansan: {
    id: 'theme-yansan',
    name: '烈焰绯红 · 经典烟三',
    gameType: 'yansan',
    highlightColor: '#EF4444',
    feltColor: '#B91C1C',
    edgeColor: '#7F1D1D',
    borderColor: '#F87171',
    accentColor: '#FECDD3',
    textColor: '#FFF1F2',
  },
  shisanshui: {
    id: 'theme-shisanshui',
    name: '深海幻蓝 · 水镜十三水',
    gameType: 'shisanshui',
    highlightColor: '#3B82F6',
    feltColor: '#1D4ED8',
    edgeColor: '#1E3A8A',
    borderColor: '#60A5FA',
    accentColor: '#BAE6FD',
    textColor: '#EFF6FF',
  },
  mahjong: {
    id: 'theme-mahjong',
    name: '幻彩紫晶 · 国标麻将',
    gameType: 'mahjong',
    highlightColor: '#A855F7',
    feltColor: '#7E22CE',
    edgeColor: '#581C87',
    borderColor: '#C084FC',
    accentColor: '#E9D5FF',
    textColor: '#FAF5FF',
  },
};

export const TABLE_THEMES: TableTheme[] = [
  GAME_THEMES_MAP.yansan,
  GAME_THEMES_MAP.shisanshui,
  GAME_THEMES_MAP.mahjong,
];

export function getGameTheme(gameType: string): TableTheme {
  return GAME_THEMES_MAP[gameType] || GAME_THEMES_MAP.yansan;
}

export function getSavedTheme(): TableTheme {
  try {
    const id = localStorage.getItem('rustchess_table_theme');
    if (id) {
      const found = TABLE_THEMES.find((t) => t.id === id);
      if (found) return found;
    }
  } catch {}
  return TABLE_THEMES[0];
}

export function saveTheme(themeId: string) {
  try {
    localStorage.setItem('rustchess_table_theme', themeId);
  } catch {}
}
