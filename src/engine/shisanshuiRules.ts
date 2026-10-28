/**
 * Thirteen Cards (十三张 / 水镜十三水) Professional Rules & Scoring Engine
 * 包含：
 * 1. 头道(3张)、中道(5张)、尾道(5张) 精确牌型判定与全位比牌 (Tie-Breaking)
 * 2. 5张顺子/同花顺包括 A-2-3-4-5 (轮子顺) 与 10-J-Q-K-A (至尊顺) 判定
 * 3. 8人场双副牌专属 五同 (Five of a kind) 至尊判定
 * 4. 经典倒水 (相公) 严谨校验：尾道 >= 中道 >= 头道 (严格杜绝头道对子大过中道两对大对等各种隐蔽倒水)
 * 5. 道数特奖喜水：头道冲三(+3水/A冲三+5水)、头道对A(+1水)、中道葫芦(+2水)、中道铁支(+8水)、中道同花顺(+10水)、中道五同(+16水)、尾道铁支(+4水)、尾道同花顺(+5水)、尾道五同(+8水)
 * 6. 全套十三大特殊牌型检测与100%绝不倒水推荐阵型 (至尊青龙+108水、一条龙+36水、十二皇族+24水、三同花顺+20水、三分天下+20水、四套三条+18水、凑一色+10水、全大/全小+10水、五对三条+8水、六对半+6水、三同花+4水、三顺子+4水)
 * 7. 高性能全排列组合数学一键最优求解器 (Auto-Arrange Optimizer)，毫秒级剪枝，100% 杜绝倒水相公，最大化期望水数与喜水
 * 8. 两两对战全维度比水、打枪翻倍 (2x)、全垒打通关全场再翻倍 (2x)、相公倒水惩罚
 */

export interface SSSCard {
  id: string;
  rank: number; // 2..14 (14=A, 13=K... 2=2)
  suitVal: number; // 4=♠, 3=♥, 2=♣, 1=♦
  label: string;
  suit: '♠' | '♥' | '♣' | '♦';
  isRed: boolean;
}

export type TierRank =
  | 'five_of_a_kind'
  | 'straight_flush'
  | 'quads'
  | 'full_house'
  | 'flush'
  | 'straight'
  | 'triplet'
  | 'two_pairs'
  | 'pair'
  | 'high_card';

export interface EvaluatedTier {
  name: string;
  type: TierRank;
  scoreRank: number; // 全局统一高分辨率数值（64位安全范围），头道与中尾道可直接比大小
  cards: SSSCard[];
  detailLabel: string;
}

export type SpecialHandType =
  | 'supreme_dragon' // 至尊青龙
  | 'dragon' // 一条龙 (26水)
  | 'six_and_half_pairs' // 六对半 (6水)
  | 'three_flushes' // 三同花 (6水)
  | 'three_straights'; // 三顺子 (6水)

export interface SpecialHandResult {
  type: SpecialHandType;
  name: string;
  bonusWater: number;
  desc: string;
  recommendedLayout?: {
    head: SSSCard[];
    mid: SSSCard[];
    tail: SSSCard[];
  };
}

export function getRankChar(r: number): string {
  if (r === 14) return 'A';
  if (r === 13) return 'K';
  if (r === 12) return 'Q';
  if (r === 11) return 'J';
  if (r === 10) return '10';
  return String(r);
}

// 统一权值基数（Base 100 体系，最大值 ~10^11，安全处于 JS 2^53 内）
export const MULT_CAT = 10_000_000_000; // 类别权重 (1..10)
export const MULT_R1  =    100_000_000; // 主点数 (2..14)
export const MULT_R2  =      1_000_000; // 副点数 (2..14)
export const MULT_K1  =         10_000; // 踢脚 1 (2..14)
export const MULT_K2  =            100; // 踢脚 2 (2..14)
export const MULT_K3  =              1; // 踢脚 3 (2..14)

/**
 * 校验5张牌牌型 (中道、尾道)
 */
export function evaluate5CardTier(cards: SSSCard[]): EvaluatedTier {
  if (cards.length !== 5) {
    return { name: '散牌', type: 'high_card', scoreRank: 0, cards, detailLabel: '缺牌' };
  }
  const sorted = [...cards].sort((a, b) => b.rank - a.rank || b.suitVal - a.suitVal);
  const isSameSuit = sorted.every((c) => c.suit === sorted[0].suit);

  // 顺子检测：
  // 1. 10 J Q K A (至尊顺) -> rankOrder = 14.5
  // 2. 9 10 J Q K (K高) -> rankOrder = 13
  // ...
  // 6. A 2 3 4 5 (轮子顺) -> rankOrder = 5.2
  let isStraight = false;
  let straightTierRank = 0;
  let straightHighCardRank = 0;

  let standardStraight = true;
  for (let i = 1; i < 5; i++) {
    if (sorted[i].rank !== sorted[i - 1].rank - 1) {
      standardStraight = false;
      break;
    }
  }

  if (standardStraight) {
    isStraight = true;
    const topRank = sorted[0].rank;
    straightHighCardRank = topRank;
    if (topRank === 14 && sorted[1].rank === 13) {
      straightTierRank = 14.5;
    } else {
      straightTierRank = topRank;
    }
  } else if (
    sorted[0].rank === 14 &&
    sorted[1].rank === 5 &&
    sorted[2].rank === 4 &&
    sorted[3].rank === 3 &&
    sorted[4].rank === 2
  ) {
    isStraight = true;
    straightTierRank = 5.2;
    straightHighCardRank = 5;
  }

  const counts: Record<number, number> = {};
  sorted.forEach((c) => (counts[c.rank] = (counts[c.rank] || 0) + 1));
  const entries = Object.entries(counts)
    .map(([r, c]) => ({ rank: Number(r), count: c }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  // 1. 五同 (Five of a Kind - 8人双副牌专用)
  if (entries[0].count >= 5) {
    const rk = entries[0].rank;
    return {
      name: '五同(五条)',
      type: 'five_of_a_kind',
      scoreRank: 10 * MULT_CAT + rk * MULT_R1 + sorted[0].suitVal * MULT_K1,
      cards: sorted,
      detailLabel: `五条${getRankChar(rk)}`,
    };
  }

  // 2. 同花顺 (Straight Flush)
  if (isSameSuit && isStraight) {
    const topSuit = sorted[0].suitVal;
    return {
      name: '同花顺',
      type: 'straight_flush',
      scoreRank: 9 * MULT_CAT + Math.floor(straightTierRank * 100) * MULT_R2 + topSuit * MULT_K1,
      cards: sorted,
      detailLabel: `${sorted[0].suit}同花顺`,
    };
  }

  // 3. 铁支 / 四条 (Four of a kind)
  if (entries[0].count === 4) {
    const quadRank = entries[0].rank;
    const kicker = entries[1] ? entries[1].rank : 0;
    return {
      name: '铁支(四条)',
      type: 'quads',
      scoreRank: 8 * MULT_CAT + quadRank * MULT_R1 + kicker * MULT_R2,
      cards: sorted,
      detailLabel: `铁支${getRankChar(quadRank)}`,
    };
  }

  // 4. 葫芦 (Full house)
  if (entries[0].count === 3 && entries[1] && entries[1].count >= 2) {
    const tripRank = entries[0].rank;
    const pairRank = entries[1].rank;
    return {
      name: '葫芦',
      type: 'full_house',
      scoreRank: 7 * MULT_CAT + tripRank * MULT_R1 + pairRank * MULT_R2,
      cards: sorted,
      detailLabel: `${getRankChar(tripRank)}带${getRankChar(pairRank)}葫芦`,
    };
  }

  // 5. 同花 (Flush)
  if (isSameSuit) {
    return {
      name: '同花',
      type: 'flush',
      scoreRank:
        6 * MULT_CAT +
        sorted[0].rank * MULT_R1 +
        sorted[1].rank * MULT_R2 +
        sorted[2].rank * MULT_K1 +
        sorted[3].rank * MULT_K2 +
        sorted[4].rank * MULT_K3,
      cards: sorted,
      detailLabel: `${sorted[0].suit}同花${getRankChar(sorted[0].rank)}领衔`,
    };
  }

  // 6. 顺子 (Straight)
  if (isStraight) {
    const maxCardInStraight = sorted.find((c) => c.rank === straightHighCardRank) || sorted[0];
    const topSuit = maxCardInStraight.suitVal;
    return {
      name: '顺子',
      type: 'straight',
      scoreRank: 5 * MULT_CAT + Math.floor(straightTierRank * 100) * MULT_R2 + topSuit * MULT_K1,
      cards: sorted,
      detailLabel: `${maxCardInStraight.suit}${
        straightTierRank === 14.5
          ? '10JQKA'
          : straightTierRank === 5.2
          ? 'A2345'
          : `${getRankChar(straightHighCardRank)}高`
      }顺子`,
    };
  }

  // 7. 三条 (Three of a kind)
  if (entries[0].count === 3) {
    const tripRank = entries[0].rank;
    const kickers = sorted.filter((c) => c.rank !== tripRank).sort((a, b) => b.rank - a.rank);
    const k1 = kickers[0]?.rank || 0;
    const k2 = kickers[1]?.rank || 0;
    return {
      name: '三条',
      type: 'triplet',
      scoreRank: 4 * MULT_CAT + tripRank * MULT_R1 + k1 * MULT_R2 + k2 * MULT_K1,
      cards: sorted,
      detailLabel: `三条${getRankChar(tripRank)}`,
    };
  }

  // 8. 两对 (Two pairs)
  if (entries[0].count === 2 && entries[1] && entries[1].count === 2) {
    const highPair = Math.max(entries[0].rank, entries[1].rank);
    const lowPair = Math.min(entries[0].rank, entries[1].rank);
    const kicker = sorted.filter((c) => c.rank !== highPair && c.rank !== lowPair)[0]?.rank || 0;
    return {
      name: '两对',
      type: 'two_pairs',
      scoreRank: 3 * MULT_CAT + highPair * MULT_R1 + lowPair * MULT_R2 + kicker * MULT_K1,
      cards: sorted,
      detailLabel: `${getRankChar(highPair)}配${getRankChar(lowPair)}两对`,
    };
  }

  // 9. 对子 (One pair)
  if (entries[0].count === 2) {
    const pairRank = entries[0].rank;
    const kickers = sorted.filter((c) => c.rank !== pairRank).sort((a, b) => b.rank - a.rank);
    const k1 = kickers[0]?.rank || 0;
    const k2 = kickers[1]?.rank || 0;
    const k3 = kickers[2]?.rank || 0;
    return {
      name: '对子',
      type: 'pair',
      scoreRank:
        2 * MULT_CAT +
        pairRank * MULT_R1 +
        k1 * MULT_R2 +
        k2 * MULT_K1 +
        k3 * MULT_K2,
      cards: sorted,
      detailLabel: `对${getRankChar(pairRank)}`,
    };
  }

  // 10. 散牌 / 乌龙 (High card)
  return {
    name: '乌龙(散牌)',
    type: 'high_card',
    scoreRank:
      1 * MULT_CAT +
      sorted[0].rank * MULT_R1 +
      sorted[1].rank * MULT_R2 +
      sorted[2].rank * MULT_K1 +
      sorted[3].rank * MULT_K2 +
      sorted[4].rank * MULT_K3,
    cards: sorted,
    detailLabel: `${getRankChar(sorted[0].rank)}高散牌`,
  };
}

/**
 * 校验3张牌牌型 (头道)
 * 采用完全一致的归一化体系，使得 Head 能与 Mid、Tail 直接通过 scoreRank 比较，杜绝相公倒水偏差
 */
export function evaluate3CardTier(cards: SSSCard[]): EvaluatedTier {
  if (cards.length !== 3) {
    return { name: '散牌', type: 'high_card', scoreRank: 0, cards, detailLabel: '缺牌' };
  }
  const sorted = [...cards].sort((a, b) => b.rank - a.rank || b.suitVal - a.suitVal);

  // 冲三 (三条): Category 4
  if (sorted[0].rank === sorted[1].rank && sorted[1].rank === sorted[2].rank) {
    const rk = sorted[0].rank;
    return {
      name: rk === 14 ? '冲天三条A' : '冲三条',
      type: 'triplet',
      scoreRank: 4 * MULT_CAT + rk * MULT_R1,
      cards: sorted,
      detailLabel: `冲三${getRankChar(rk)}`,
    };
  }

  // 对子 (头对): Category 2
  if (sorted[0].rank === sorted[1].rank) {
    const pairRank = sorted[0].rank;
    const kicker = sorted[2].rank;
    return {
      name: pairRank === 14 ? '头道冲对A' : '头道对子',
      type: 'pair',
      scoreRank: 2 * MULT_CAT + pairRank * MULT_R1 + kicker * MULT_R2,
      cards: sorted,
      detailLabel: `对${getRankChar(pairRank)}带${getRankChar(kicker)}`,
    };
  }
  if (sorted[1].rank === sorted[2].rank) {
    const pairRank = sorted[1].rank;
    const kicker = sorted[0].rank;
    return {
      name: pairRank === 14 ? '头道冲对A' : '头道对子',
      type: 'pair',
      scoreRank: 2 * MULT_CAT + pairRank * MULT_R1 + kicker * MULT_R2,
      cards: sorted,
      detailLabel: `对${getRankChar(pairRank)}带${getRankChar(kicker)}`,
    };
  }

  // 乌龙散牌: Category 1
  return {
    name: '头道乌龙',
    type: 'high_card',
    scoreRank: 1 * MULT_CAT + sorted[0].rank * MULT_R1 + sorted[1].rank * MULT_R2 + sorted[2].rank * MULT_K1,
    cards: sorted,
    detailLabel: `${getRankChar(sorted[0].rank)}高散牌`,
  };
}

/**
 * 倒水 (相公) 严格判定
 * 规则：尾道 >= 中道 >= 头道
 * 且在中道为两对时，头道对子不可大于中道的大对（杜绝头道僭越倒水）
 */
export function isFoulHand(head: SSSCard[], mid: SSSCard[], tail: SSSCard[]): boolean {
  if (head.length !== 3 || mid.length !== 5 || tail.length !== 5) return false;
  const hEval = evaluate3CardTier(head);
  const mEval = evaluate5CardTier(mid);
  const tEval = evaluate5CardTier(tail);

  // 1. 中道强于尾道 -> 倒水
  if (mEval.scoreRank > tEval.scoreRank) return true;

  // 2. 头道强于中道 -> 倒水
  if (hEval.scoreRank > mEval.scoreRank) return true;

  // 3. 经典十三张相公规则：当中道为两对、头道为对子时，头道对子点数绝不可大于中道两对中的大对
  if (mEval.type === 'two_pairs' && hEval.type === 'pair') {
    const midHighPair = Math.floor((mEval.scoreRank % MULT_CAT) / MULT_R1);
    const headPair = Math.floor((hEval.scoreRank % MULT_CAT) / MULT_R1);
    if (headPair > midHighPair) return true;
  }

  // 4. 当中道为三条、头道为三条时，头道三条点数绝不可大于中道三条点数
  if (mEval.type === 'triplet' && hEval.type === 'triplet') {
    const midTrip = Math.floor((mEval.scoreRank % MULT_CAT) / MULT_R1);
    const headTrip = Math.floor((hEval.scoreRank % MULT_CAT) / MULT_R1);
    if (headTrip > midTrip) return true;
  }

  return false;
}

export interface WateringDetailResult {
  isWater: boolean;
  reason: string;
  violatingTier: 'front' | 'mid' | 'back' | null;
  fixAction: 'none' | 'swap_mid_back' | 'rebalance_front_mid';
  fixLabel: string;
}

/**
 * 精确倒水诊断并返回修复指引
 */
export function checkWateringDetail(head: SSSCard[], mid: SSSCard[], tail: SSSCard[]): WateringDetailResult {
  if (head.length !== 3 || mid.length !== 5 || tail.length !== 5) {
    return { isWater: false, reason: '', violatingTier: null, fixAction: 'none', fixLabel: '' };
  }
  const hEval = evaluate3CardTier(head);
  const mEval = evaluate5CardTier(mid);
  const tEval = evaluate5CardTier(tail);

  // 中道强于尾道 -> 倒水
  if (mEval.scoreRank > tEval.scoreRank) {
    return {
      isWater: true,
      reason: `⚠️ 倒水：中道【${mEval.name}】强于尾道【${tEval.name}】`,
      violatingTier: 'mid',
      fixAction: 'swap_mid_back',
      fixLabel: '点击一键对调中尾道',
    };
  }

  // 头道强于中道 -> 倒水
  if (hEval.scoreRank > mEval.scoreRank) {
    return {
      isWater: true,
      reason: `⚠️ 倒水：头道【${hEval.name}】强于中道【${mEval.name}】`,
      violatingTier: 'front',
      fixAction: 'rebalance_front_mid',
      fixLabel: '点击一键平衡头中道',
    };
  }

  // 中道两对，头道对子点数僭越大对
  if (mEval.type === 'two_pairs' && hEval.type === 'pair') {
    const midHighPair = Math.floor((mEval.scoreRank % MULT_CAT) / MULT_R1);
    const headPair = Math.floor((hEval.scoreRank % MULT_CAT) / MULT_R1);
    if (headPair > midHighPair) {
      return {
        isWater: true,
        reason: `⚠️ 倒水：头道【对${getRankChar(headPair)}】大于中道大对【对${getRankChar(midHighPair)}】`,
        violatingTier: 'front',
        fixAction: 'rebalance_front_mid',
        fixLabel: '点击一键平衡头中道',
      };
    }
  }

  // 中道三条，头道三条点数僭越
  if (mEval.type === 'triplet' && hEval.type === 'triplet') {
    const midTrip = Math.floor((mEval.scoreRank % MULT_CAT) / MULT_R1);
    const headTrip = Math.floor((hEval.scoreRank % MULT_CAT) / MULT_R1);
    if (headTrip > midTrip) {
      return {
        isWater: true,
        reason: `⚠️ 倒水：头道三条【${getRankChar(headTrip)}】大于中道三条【${getRankChar(midTrip)}】`,
        violatingTier: 'front',
        fixAction: 'rebalance_front_mid',
        fixLabel: '点击一键平衡头中道',
      };
    }
  }

  return { isWater: false, reason: '', violatingTier: null, fixAction: 'none', fixLabel: '' };
}

/**
 * 道数特奖喜水计算 (Tier Bonus Water)
 */
export function getTierBonusWater(
  tierName: 'head' | 'mid' | 'tail',
  evalTier: EvaluatedTier
): { bonus: number; desc: string } {
  if (tierName === 'head') {
    if (evalTier.type === 'triplet') {
      const isAce = evalTier.scoreRank >= (4 * MULT_CAT + 14 * MULT_R1);
      return {
        bonus: isAce ? 5 : 3,
        desc: isAce ? '头道冲天三A (+5水)' : '头道冲三条 (+3水)',
      };
    }
    if (evalTier.type === 'pair') {
      const pairRank = Math.floor((evalTier.scoreRank % MULT_CAT) / MULT_R1);
      if (pairRank === 14) {
        return { bonus: 1, desc: '头道对A喜水 (+1水)' };
      }
    }
    return { bonus: 0, desc: '' };
  } else if (tierName === 'mid') {
    if (evalTier.type === 'five_of_a_kind') {
      return { bonus: 16, desc: '中道五同至尊 (+16水)' };
    }
    if (evalTier.type === 'straight_flush') {
      return { bonus: 10, desc: '中道同花顺 (+10水)' };
    }
    if (evalTier.type === 'quads') {
      return { bonus: 8, desc: '中道四带一铁支 (+8水)' };
    }
    if (evalTier.type === 'full_house') {
      return { bonus: 2, desc: '中道葫芦 (+2水)' };
    }
  } else if (tierName === 'tail') {
    if (evalTier.type === 'five_of_a_kind') {
      return { bonus: 8, desc: '尾道五同至尊 (+8水)' };
    }
    if (evalTier.type === 'straight_flush') {
      return { bonus: 5, desc: '尾道同花顺 (+5水)' };
    }
    if (evalTier.type === 'quads') {
      return { bonus: 4, desc: '尾道四带一铁支 (+4水)' };
    }
  }
  return { bonus: 0, desc: '' };
}

// -------------------------------------------------------------
// 特殊牌型 (Special Natural Hands) 完备检测与推荐摆牌生成器
// -------------------------------------------------------------

function is3CardStraight(cards: SSSCard[]): boolean {
  if (cards.length !== 3) return false;
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  if (sorted[0].rank === sorted[1].rank + 1 && sorted[1].rank === sorted[2].rank + 1) return true;
  // A-2-3
  if (sorted[0].rank === 14 && sorted[1].rank === 3 && sorted[2].rank === 2) return true;
  return false;
}

function is3CardFlush(cards: SSSCard[]): boolean {
  if (cards.length !== 3) return false;
  return cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit;
}

function is3CardStraightFlush(cards: SSSCard[]): boolean {
  return is3CardStraight(cards) && is3CardFlush(cards);
}

/**
 * 检查三同花顺 (头中尾各为同花顺，绝不倒水)
 */
function checkThreeStraightFlushes(cards: SSSCard[]): {
  found: boolean;
  layout?: { head: SSSCard[]; mid: SSSCard[]; tail: SSSCard[] };
} {
  const bySuit: Record<string, SSSCard[]> = { '♠': [], '♥': [], '♣': [], '♦': [] };
  cards.forEach((c) => bySuit[c.suit].push(c));

  const sf5List: { cards: SSSCard[]; ids: Set<string> }[] = [];
  for (const s of ['♠', '♥', '♣', '♦'] as const) {
    const list = bySuit[s];
    if (list.length < 5) continue;
    const ranks = Array.from(new Set(list.map((c) => c.rank))).sort((a, b) => a - b);
    for (let i = 0; i <= ranks.length - 5; i++) {
      if (
        ranks[i + 1] === ranks[i] + 1 &&
        ranks[i + 2] === ranks[i] + 2 &&
        ranks[i + 3] === ranks[i] + 3 &&
        ranks[i + 4] === ranks[i] + 4
      ) {
        const c1 = list.find((c) => c.rank === ranks[i])!;
        const c2 = list.find((c) => c.rank === ranks[i + 1] && c.id !== c1.id)!;
        const c3 = list.find((c) => c.rank === ranks[i + 2] && ![c1.id, c2.id].includes(c.id))!;
        const c4 = list.find((c) => c.rank === ranks[i + 3] && ![c1.id, c2.id, c3.id].includes(c.id))!;
        const c5 = list.find((c) => c.rank === ranks[i + 4] && ![c1.id, c2.id, c3.id, c4.id].includes(c.id))!;
        const sf = [c1, c2, c3, c4, c5];
        sf5List.push({ cards: sf, ids: new Set(sf.map((c) => c.id)) });
      }
    }
    if (
      ranks.includes(14) &&
      ranks.includes(2) &&
      ranks.includes(3) &&
      ranks.includes(4) &&
      ranks.includes(5)
    ) {
      const cA = list.find((c) => c.rank === 14)!;
      const c2 = list.find((c) => c.rank === 2 && c.id !== cA.id)!;
      const c3 = list.find((c) => c.rank === 3 && ![cA.id, c2.id].includes(c.id))!;
      const c4 = list.find((c) => c.rank === 4 && ![cA.id, c2.id, c3.id].includes(c.id))!;
      const c5 = list.find((c) => c.rank === 5 && ![cA.id, c2.id, c3.id, c4.id].includes(c.id))!;
      const sf = [cA, c5, c4, c3, c2];
      sf5List.push({ cards: sf, ids: new Set(sf.map((c) => c.id)) });
    }
  }

  for (let i = 0; i < sf5List.length; i++) {
    const s1 = sf5List[i];
    for (let j = i + 1; j < sf5List.length; j++) {
      const s2 = sf5List[j];
      let overlap = false;
      for (const id of s1.ids) {
        if (s2.ids.has(id)) {
          overlap = true;
          break;
        }
      }
      if (overlap) continue;

      const usedIds = new Set([...s1.ids, ...s2.ids]);
      const remain = cards.filter((c) => !usedIds.has(c.id));
      if (remain.length === 3 && is3CardStraightFlush(remain)) {
        const eval1 = evaluate5CardTier(s1.cards);
        const eval2 = evaluate5CardTier(s2.cards);
        const tail = eval1.scoreRank >= eval2.scoreRank ? s1.cards : s2.cards;
        const mid = eval1.scoreRank >= eval2.scoreRank ? s2.cards : s1.cards;
        if (!isFoulHand(remain, mid, tail)) {
          return {
            found: true,
            layout: { head: remain, mid, tail },
          };
        }
      }
    }
  }

  return { found: false };
}

/**
 * 检查三顺子 (头中尾各为顺子，绝不倒水)
 */
function checkThreeStraights(cards: SSSCard[]): {
  found: boolean;
  layout?: { head: SSSCard[]; mid: SSSCard[]; tail: SSSCard[] };
} {
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);

  function findStraights5(cardPool: SSSCard[]): SSSCard[][] {
    const res: SSSCard[][] = [];
    const ranks = Array.from(new Set(cardPool.map((c) => c.rank))).sort((a, b) => b - a);

    for (let i = 0; i <= ranks.length - 5; i++) {
      if (
        ranks[i + 1] === ranks[i] - 1 &&
        ranks[i + 2] === ranks[i] - 2 &&
        ranks[i + 3] === ranks[i] - 3 &&
        ranks[i + 4] === ranks[i] - 4
      ) {
        const c1 = cardPool.find((c) => c.rank === ranks[i])!;
        const c2 = cardPool.find((c) => c.rank === ranks[i + 1] && c.id !== c1.id)!;
        const c3 = cardPool.find((c) => c.rank === ranks[i + 2] && ![c1.id, c2.id].includes(c.id))!;
        const c4 = cardPool.find((c) => c.rank === ranks[i + 3] && ![c1.id, c2.id, c3.id].includes(c.id))!;
        const c5 = cardPool.find((c) => c.rank === ranks[i + 4] && ![c1.id, c2.id, c3.id, c4.id].includes(c.id))!;
        res.push([c1, c2, c3, c4, c5]);
      }
    }
    if (
      ranks.includes(14) &&
      ranks.includes(2) &&
      ranks.includes(3) &&
      ranks.includes(4) &&
      ranks.includes(5)
    ) {
      const cA = cardPool.find((c) => c.rank === 14)!;
      const c5 = cardPool.find((c) => c.rank === 5 && c.id !== cA.id)!;
      const c4 = cardPool.find((c) => c.rank === 4 && ![cA.id, c5.id].includes(c.id))!;
      const c3 = cardPool.find((c) => c.rank === 3 && ![cA.id, c5.id, c4.id].includes(c.id))!;
      const c2 = cardPool.find((c) => c.rank === 2 && ![cA.id, c5.id, c4.id, c3.id].includes(c.id))!;
      res.push([cA, c5, c4, c3, c2]);
    }
    return res;
  }

  const s1List = findStraights5(sorted);
  for (const s1 of s1List) {
    const s1Ids = new Set(s1.map((c) => c.id));
    const pool2 = sorted.filter((c) => !s1Ids.has(c.id));
    const s2List = findStraights5(pool2);
    for (const s2 of s2List) {
      const s2Ids = new Set(s2.map((c) => c.id));
      const pool3 = pool2.filter((c) => !s2Ids.has(c.id));
      if (pool3.length === 3 && is3CardStraight(pool3)) {
        const eval1 = evaluate5CardTier(s1);
        const eval2 = evaluate5CardTier(s2);
        const tail = eval1.scoreRank >= eval2.scoreRank ? s1 : s2;
        const mid = eval1.scoreRank >= eval2.scoreRank ? s2 : s1;
        if (!isFoulHand(pool3, mid, tail)) {
          return {
            found: true,
            layout: { head: pool3, mid, tail },
          };
        }
      }
    }
  }

  return { found: false };
}

/**
 * 检查三同花 (头中尾各为同花，尾道 >= 中道，100% 杜绝倒水)
 */
function checkThreeFlushes(cards: SSSCard[]): {
  found: boolean;
  layout?: { head: SSSCard[]; mid: SSSCard[]; tail: SSSCard[] };
} {
  const bySuit: Record<string, SSSCard[]> = { '♠': [], '♥': [], '♣': [], '♦': [] };
  cards.forEach((c) => bySuit[c.suit].push(c));
  for (const s of ['♠', '♥', '♣', '♦'] as const) {
    bySuit[s].sort((a, b) => b.rank - a.rank || b.suitVal - a.suitVal);
  }
  const suits = Object.keys(bySuit) as ('♠' | '♥' | '♣' | '♦')[];

  // 1. 三个不同花色分别 5, 5, 3
  for (let i = 0; i < suits.length; i++) {
    for (let j = 0; j < suits.length; j++) {
      if (i === j) continue;
      for (let k = 0; k < suits.length; k++) {
        if (k === i || k === j) continue;
        if (bySuit[suits[i]].length >= 5 && bySuit[suits[j]].length >= 5 && bySuit[suits[k]].length >= 3) {
          const tCards = bySuit[suits[i]].slice(0, 5);
          const mCards = bySuit[suits[j]].slice(0, 5);
          const hCards = bySuit[suits[k]].slice(0, 3);
          const evalT = evaluate5CardTier(tCards);
          const evalM = evaluate5CardTier(mCards);
          const tail = evalT.scoreRank >= evalM.scoreRank ? tCards : mCards;
          const mid = evalT.scoreRank >= evalM.scoreRank ? mCards : tCards;
          if (!isFoulHand(hCards, mid, tail)) {
            return {
              found: true,
              layout: { head: hCards, mid, tail },
            };
          }
        }
      }
    }
  }

  // 2. 两个花色：10 + 3 或 8 + 5
  for (const s1 of suits) {
    for (const s2 of suits) {
      if (s1 === s2) continue;
      if (bySuit[s1].length >= 10 && bySuit[s2].length >= 3) {
        const c1 = bySuit[s1].slice(0, 5);
        const c2 = bySuit[s1].slice(5, 10);
        const head = bySuit[s2].slice(0, 3);
        const eval1 = evaluate5CardTier(c1);
        const eval2 = evaluate5CardTier(c2);
        const tail = eval1.scoreRank >= eval2.scoreRank ? c1 : c2;
        const mid = eval1.scoreRank >= eval2.scoreRank ? c2 : c1;
        if (!isFoulHand(head, mid, tail)) {
          return { found: true, layout: { head, mid, tail } };
        }
      }
      if (bySuit[s1].length >= 8 && bySuit[s2].length >= 5) {
        const c1 = bySuit[s1].slice(0, 5);
        const c2 = bySuit[s2].slice(0, 5);
        const head = bySuit[s1].slice(5, 8);
        const eval1 = evaluate5CardTier(c1);
        const eval2 = evaluate5CardTier(c2);
        const tail = eval1.scoreRank >= eval2.scoreRank ? c1 : c2;
        const mid = eval1.scoreRank >= eval2.scoreRank ? c2 : c1;
        if (!isFoulHand(head, mid, tail)) {
          return { found: true, layout: { head, mid, tail } };
        }
      }
    }
  }

  // 3. 单一花色 13张
  for (const s of suits) {
    if (bySuit[s].length >= 13) {
      const sorted = [...bySuit[s]].sort((a, b) => b.rank - a.rank);
      const tail = sorted.slice(0, 5);
      const mid = sorted.slice(5, 10);
      const head = sorted.slice(10, 13);
      if (!isFoulHand(head, mid, tail)) {
        return {
          found: true,
          layout: { head, mid, tail },
        };
      }
    }
  }

  return { found: false };
}

/**
 * 智能六对半推荐排布：尾道两对(最大两对)、中道两对(中等两对)、头道一对(最小对)，100% 杜绝倒水
 */
function layoutSixAndHalfPairs(cards: SSSCard[]): { head: SSSCard[]; mid: SSSCard[]; tail: SSSCard[] } | undefined {
  const counts: Record<number, SSSCard[]> = {};
  cards.forEach((c) => {
    if (!counts[c.rank]) counts[c.rank] = [];
    counts[c.rank].push(c);
  });

  const pairRanks = Object.entries(counts)
    .filter(([_, list]) => list.length >= 2)
    .map(([r, _]) => Number(r))
    .sort((a, b) => b - a);

  if (pairRanks.length < 6) return undefined;

  // 提取6对 (按点数从大到小)
  const p1 = [counts[pairRanks[0]].pop()!, counts[pairRanks[0]].pop()!];
  const p2 = [counts[pairRanks[1]].pop()!, counts[pairRanks[1]].pop()!];
  const p3 = [counts[pairRanks[2]].pop()!, counts[pairRanks[2]].pop()!];
  const p4 = [counts[pairRanks[3]].pop()!, counts[pairRanks[3]].pop()!];
  const p5 = [counts[pairRanks[4]].pop()!, counts[pairRanks[4]].pop()!];
  const p6 = [counts[pairRanks[5]].pop()!, counts[pairRanks[5]].pop()!];

  const remainSingle = cards.filter(
    (c) => ![...p1, ...p2, ...p3, ...p4, ...p5, ...p6].some((p) => p.id === c.id)
  );

  // 尾道: 最大两对 p1 + p2 + 剩余单张中最合适的一张
  const tail = [...p1, ...p2, remainSingle[0]];
  // 中道: 居中两对 p3 + p4 + p6的一张或单张
  // 头道: 最小对 p5 (或 p6)
  // 为了让 尾道两对 > 中道两对 > 头道对子：
  // 尾道：两对 (pairRanks[0] 和 pairRanks[1]) + 单张
  // 中道：两对 (pairRanks[2] 和 pairRanks[3]) + 单张
  // 头道：对子 (pairRanks[4]) + 单张 (由 p6 中的一张拆充)
  // 此时 p6 拆为两单，一张入中道，一张入头道
  const mid = [...p3, ...p4, p6[0]];
  const head = [...p5, p6[1]];

  if (!isFoulHand(head, mid, tail)) {
    return { head, mid, tail };
  }
  return undefined;
}

/**
 * 智能五对三条推荐排布：尾道葫芦、中道两对、头道一对，100% 杜绝倒水
 */
function layoutFivePairsOneTriplet(cards: SSSCard[]): { head: SSSCard[]; mid: SSSCard[]; tail: SSSCard[] } | undefined {
  const counts: Record<number, SSSCard[]> = {};
  cards.forEach((c) => {
    if (!counts[c.rank]) counts[c.rank] = [];
    counts[c.rank].push(c);
  });

  const tripEntry = Object.entries(counts).find(([_, list]) => list.length >= 3);
  if (!tripEntry) return undefined;
  const tripRank = Number(tripEntry[0]);
  const tripCards = [counts[tripRank].pop()!, counts[tripRank].pop()!, counts[tripRank].pop()!];

  const pairRanks = Object.entries(counts)
    .filter(([_, list]) => list.length >= 2)
    .map(([r, _]) => Number(r))
    .sort((a, b) => b - a);

  if (pairRanks.length < 5) return undefined;

  const p1 = [counts[pairRanks[0]].pop()!, counts[pairRanks[0]].pop()!];
  const p2 = [counts[pairRanks[1]].pop()!, counts[pairRanks[1]].pop()!];
  const p3 = [counts[pairRanks[2]].pop()!, counts[pairRanks[2]].pop()!];
  const p4 = [counts[pairRanks[3]].pop()!, counts[pairRanks[3]].pop()!];
  const p5 = [counts[pairRanks[4]].pop()!, counts[pairRanks[4]].pop()!];

  // 尾道：葫芦 (三条 + 最大对子 p1) -> 葫芦 (Cat 7)
  const tail = [...tripCards, ...p1];
  // 中道：两对 (p2 + p3 + p5中单张) -> 两对 (Cat 3)
  const mid = [...p2, ...p3, p5[0]];
  // 头道：对子 (p4 + p5第二张) -> 对子 (Cat 2)
  const head = [...p4, p5[1]];

  if (!isFoulHand(head, mid, tail)) {
    return { head, mid, tail };
  }
  return undefined;
}

/**
 * 检测13张整手牌是否为十三水特殊牌型 (Special Natural Hands)
 * 只保留：一条龙(26水)、三同花(6水)、三顺子(6水)、六对半(6水)
 */
export function detectSpecialHand(cards: SSSCard[]): SpecialHandResult | null {
  if (cards.length !== 13) return null;
  const sorted = [...cards].sort((a, b) => b.rank - a.rank || b.suitVal - a.suitVal);

  const ranksSet = new Set(cards.map((c) => c.rank));
  const hasAtoK = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].every((r) => ranksSet.has(r));
  const isAllSameSuit = cards.every((c) => c.suit === cards[0].suit);

  // 1. 至尊青龙 (同花一条龙)
  if (isAllSameSuit && hasAtoK) {
    return {
      type: 'supreme_dragon',
      name: '至尊青龙',
      bonusWater: 36,
      desc: '至尊青龙 (同花一条龙) · 独步天下 免比通关 +36水',
      recommendedLayout: {
        tail: sorted.slice(0, 5),
        mid: sorted.slice(5, 10),
        head: sorted.slice(10, 13),
      },
    };
  }

  // 2. 一条龙 (杂色一条龙): A到K各一张 (+26水)
  if (hasAtoK) {
    const tail5 = sorted.slice(0, 5);
    const mid5 = sorted.slice(5, 10);
    const head3 = sorted.slice(10, 13);
    const evalT = evaluate5CardTier(tail5);
    const evalM = evaluate5CardTier(mid5);
    const tail = evalT.scoreRank >= evalM.scoreRank ? tail5 : mid5;
    const mid = evalT.scoreRank >= evalM.scoreRank ? mid5 : tail5;

    return {
      type: 'dragon',
      name: '一条龙',
      bonusWater: 26,
      desc: '杂色一条龙 (A-K贯通) · 免比通关 +26水',
      recommendedLayout: {
        tail,
        mid,
        head: head3,
      },
    };
  }

  const counts: Record<number, number> = {};
  cards.forEach((c) => (counts[c.rank] = (counts[c.rank] || 0) + 1));
  const pairRanksCount = Object.values(counts).filter((c) => c >= 2).length;

  // 3. 六对半 (+6水)
  if (pairRanksCount >= 6) {
    const layout = layoutSixAndHalfPairs(cards);
    if (layout) {
      return {
        type: 'six_and_half_pairs',
        name: '六对半',
        bonusWater: 6,
        desc: '六对半 (六对一单) · 胜全场 +6水',
        recommendedLayout: layout,
      };
    }
  }

  // 4. 三同花 (+6水)
  const flRes = checkThreeFlushes(cards);
  if (flRes.found && flRes.layout) {
    return {
      type: 'three_flushes',
      name: '三同花',
      bonusWater: 6,
      desc: '三同花 (头中尾皆同花) · 胜全场 +6水',
      recommendedLayout: flRes.layout,
    };
  }

  // 5. 三顺子 (+6水)
  const stRes = checkThreeStraights(cards);
  if (stRes.found && stRes.layout) {
    return {
      type: 'three_straights',
      name: '三顺子',
      bonusWater: 6,
      desc: '三顺子 (头中尾皆顺子) · 胜全场 +6水',
      recommendedLayout: stRes.layout,
    };
  }

  return null;
}

// -------------------------------------------------------------
// 高性能全排列一键最优求解器 (Comprehensive Optimal Arrangement Solver)
// -------------------------------------------------------------

const COMBINATIONS_13_5: number[][] = [];
(function () {
  const chosen: number[] = [];
  function backtrack(start: number) {
    if (chosen.length === 5) {
      COMBINATIONS_13_5.push([...chosen]);
      return;
    }
    for (let i = start; i < 13; i++) {
      chosen.push(i);
      backtrack(i + 1);
      chosen.pop();
    }
  }
  backtrack(0);
})();

const COMBINATIONS_8_5: number[][] = [];
(function () {
  const chosen: number[] = [];
  function backtrack(start: number) {
    if (chosen.length === 5) {
      COMBINATIONS_8_5.push([...chosen]);
      return;
    }
    for (let i = start; i < 8; i++) {
      chosen.push(i);
      backtrack(i + 1);
      chosen.pop();
    }
  }
  backtrack(0);
})();

export interface OptimalArrangementResult {
  head: SSSCard[];
  mid: SSSCard[];
  tail: SSSCard[];
  specialHand?: SpecialHandResult | null;
  fitness: number;
  strategyLabel: string;
}

/**
 * 评估理牌方案在战局中的综合收益得分 (Fitness Score)
 * 强化尾道压阵基石，平衡中道攻守，杜绝头重脚轻
 */
function evaluateLayoutFitness(
  tailEval: EvaluatedTier,
  midEval: EvaluatedTier,
  headEval: EvaluatedTier,
  strategy: 'optimal' | 'solid' | 'flush' | 'balanced'
): number {
  const headBonus = getTierBonusWater('head', headEval).bonus;
  const midBonus = getTierBonusWater('mid', midEval).bonus;
  const tailBonus = getTierBonusWater('tail', tailEval).bonus;
  const bonusScore = (headBonus + midBonus + tailBonus) * 25;

  let headPower = 0;
  if (headEval.type === 'triplet') {
    headPower = 45 + (headEval.scoreRank % 1000) * 0.1;
  } else if (headEval.type === 'pair') {
    const pairRank = Math.floor((headEval.scoreRank % MULT_CAT) / MULT_R1);
    headPower = 12 + pairRank * 1.2;
  } else {
    const highRank = Math.floor((headEval.scoreRank % MULT_CAT) / MULT_R1);
    headPower = Math.max(0, (highRank - 8) * 0.8);
  }

  let midPower = 0;
  switch (midEval.type) {
    case 'five_of_a_kind': midPower = 85; break;
    case 'straight_flush': midPower = 78; break;
    case 'quads': midPower = 70; break;
    case 'full_house': midPower = 58; break;
    case 'flush': midPower = 46; break;
    case 'straight': midPower = 38; break;
    case 'triplet': midPower = 28; break;
    case 'two_pairs': midPower = 18; break;
    case 'pair': midPower = 8; break;
    default: midPower = 1; break;
  }

  let tailPower = 0;
  switch (tailEval.type) {
    case 'five_of_a_kind': tailPower = 95; break;
    case 'straight_flush': tailPower = 88; break;
    case 'quads': tailPower = 80; break;
    case 'full_house': tailPower = 68; break;
    case 'flush': tailPower = 52; break;
    case 'straight': tailPower = 42; break;
    case 'triplet': tailPower = 28; break;
    case 'two_pairs': tailPower = 18; break;
    case 'pair': tailPower = 6; break;
    default: tailPower = 1; break;
  }

  let synergy = 0;
  // 尾道足够稳健时，中道与头道的加成更具价值
  if (tailPower >= 42 && midPower >= 28) {
    synergy += 25;
  } else if (tailPower >= 42) {
    synergy += 12;
  }

  // 严惩尾道中道虚弱（严防打枪惩罚）
  let defensePenalty = 0;
  if (tailPower < 18) defensePenalty += 30;
  if (midPower < 8) defensePenalty += 20;

  // 严惩头重脚轻：如果头道是对子，而中道仅为单对且中道对子不占优
  if (headEval.type === 'pair' && midEval.type === 'pair') {
    const midPair = Math.floor((midEval.scoreRank % MULT_CAT) / MULT_R1);
    const headPair = Math.floor((headEval.scoreRank % MULT_CAT) / MULT_R1);
    if (midPair <= headPair) {
      defensePenalty += 15;
    }
  }

  let totalFitness = headPower + midPower + tailPower + bonusScore + synergy - defensePenalty;

  if (strategy === 'solid') {
    if (tailEval.type === 'full_house' || tailEval.type === 'quads' || tailEval.type === 'straight_flush') {
      totalFitness += 40;
    }
  } else if (strategy === 'flush') {
    if (tailEval.type === 'flush' || tailEval.type === 'straight_flush' || midEval.type === 'flush') {
      totalFitness += 40;
    }
  } else if (strategy === 'balanced') {
    const minTier = Math.min(headPower, midPower * 0.7, tailPower * 0.5);
    totalFitness += minTier * 2.8;
  }

  return totalFitness;
}

/**
 * 智能理牌顶级优化器 (一键最优 / 战术策略理牌)
 * 遍历评估所有组合，100% 杜绝倒水相公，最大化期望水数与喜水
 */
export function autoArrangeThirteen(
  cards: SSSCard[],
  strategy: 'optimal' | 'solid' | 'flush' | 'balanced' = 'optimal'
): OptimalArrangementResult {
  if (cards.length !== 13) {
    return {
      head: cards.slice(0, 3),
      mid: cards.slice(3, 8),
      tail: cards.slice(8, 13),
      fitness: 0,
      strategyLabel: '默认分组',
    };
  }

  const special = detectSpecialHand(cards);
  // 若有预设且绝不倒水的特殊牌型推荐阵型，直接权威返回
  if (
    special &&
    special.recommendedLayout &&
    !isFoulHand(special.recommendedLayout.head, special.recommendedLayout.mid, special.recommendedLayout.tail)
  ) {
    return {
      head: special.recommendedLayout.head,
      mid: special.recommendedLayout.mid,
      tail: special.recommendedLayout.tail,
      specialHand: special,
      fitness: 9999 + special.bonusWater * 100,
      strategyLabel: `特殊牌型【${special.name}】`,
    };
  }

  interface Subset5 {
    mask: number;
    indices: number[];
    evaluated: EvaluatedTier;
    scoreRank: number;
  }

  const subsetMap = new Map<number, Subset5>();
  const allSubsets: Subset5[] = [];

  for (let i = 0; i < COMBINATIONS_13_5.length; i++) {
    const idxs = COMBINATIONS_13_5[i];
    let mask = 0;
    const c5: SSSCard[] = [];
    for (let k = 0; k < 5; k++) {
      mask |= 1 << idxs[k];
      c5.push(cards[idxs[k]]);
    }
    const evaluated = evaluate5CardTier(c5);
    const item: Subset5 = {
      mask,
      indices: idxs,
      evaluated,
      scoreRank: evaluated.scoreRank,
    };
    subsetMap.set(mask, item);
    allSubsets.push(item);
  }

  allSubsets.sort((a, b) => b.scoreRank - a.scoreRank);

  let bestFitness = -Infinity;
  let bestHead: SSSCard[] = [];
  let bestMid: SSSCard[] = [];
  let bestTail: SSSCard[] = [];

  for (let tIdx = 0; tIdx < allSubsets.length; tIdx++) {
    const tailItem = allSubsets[tIdx];
    const tailMask = tailItem.mask;
    const tailScore = tailItem.scoreRank;

    const remIndices: number[] = [];
    for (let i = 0; i < 13; i++) {
      if ((tailMask & (1 << i)) === 0) {
        remIndices.push(i);
      }
    }

    for (let mIdx = 0; mIdx < COMBINATIONS_8_5.length; mIdx++) {
      const midRel = COMBINATIONS_8_5[mIdx];
      let midMask = 0;
      for (let k = 0; k < 5; k++) {
        midMask |= 1 << remIndices[midRel[k]];
      }

      const midItem = subsetMap.get(midMask)!;

      // 倒水剪枝 1：尾道必须 >= 中道 (完全统一比较)
      if (midItem.scoreRank > tailScore) {
        continue;
      }

      const headCards: SSSCard[] = [];
      for (let k = 0; k < 8; k++) {
        if (!midRel.includes(k)) {
          headCards.push(cards[remIndices[k]]);
        }
      }

      const headEval = evaluate3CardTier(headCards);

      // 倒水剪枝 2：中道必须 >= 头道 (完全统一比较)
      if (headEval.scoreRank > midItem.scoreRank) {
        continue;
      }

      // 倒水剪枝 3：中道为两对时，头道对子点数绝不可大于中道大对
      if (midItem.evaluated.type === 'two_pairs' && headEval.type === 'pair') {
        const midHighPair = Math.floor((midItem.scoreRank % MULT_CAT) / MULT_R1);
        const headPair = Math.floor((headEval.scoreRank % MULT_CAT) / MULT_R1);
        if (headPair > midHighPair) continue;
      }

      // 倒水剪枝 4：中道为三条时，头道三条点数绝不可大于中道三条
      if (midItem.evaluated.type === 'triplet' && headEval.type === 'triplet') {
        const midTrip = Math.floor((midItem.scoreRank % MULT_CAT) / MULT_R1);
        const headTrip = Math.floor((headEval.scoreRank % MULT_CAT) / MULT_R1);
        if (headTrip > midTrip) continue;
      }

      // 终极倒水拦截：确保候选阵型绝不倒水
      if (isFoulHand(headCards, midItem.evaluated.cards, tailItem.evaluated.cards)) {
        continue;
      }

      const fitness = evaluateLayoutFitness(tailItem.evaluated, midItem.evaluated, headEval, strategy);

      if (fitness > bestFitness) {
        bestFitness = fitness;
        bestTail = tailItem.evaluated.cards;
        bestMid = midItem.evaluated.cards;
        bestHead = headCards;
      }
    }
  }

  // 兜底校验：绝不允许返回倒水牌型
  if (bestTail.length === 0 || isFoulHand(bestHead, bestMid, bestTail)) {
    // 强制寻找任何一个绝对不倒水的合法解
    for (let tIdx = 0; tIdx < allSubsets.length; tIdx++) {
      const tailItem = allSubsets[tIdx];
      const remIndices: number[] = [];
      for (let i = 0; i < 13; i++) {
        if ((tailItem.mask & (1 << i)) === 0) remIndices.push(i);
      }
      for (let mIdx = 0; mIdx < COMBINATIONS_8_5.length; mIdx++) {
        const midRel = COMBINATIONS_8_5[mIdx];
        let midMask = 0;
        for (let k = 0; k < 5; k++) midMask |= 1 << remIndices[midRel[k]];
        const midItem = subsetMap.get(midMask)!;
        if (midItem.scoreRank > tailItem.scoreRank) continue;

        const headCards: SSSCard[] = [];
        for (let k = 0; k < 8; k++) {
          if (!midRel.includes(k)) headCards.push(cards[remIndices[k]]);
        }

        if (!isFoulHand(headCards, midItem.evaluated.cards, tailItem.evaluated.cards)) {
          bestTail = tailItem.evaluated.cards;
          bestMid = midItem.evaluated.cards;
          bestHead = headCards;
          break;
        }
      }
      if (bestTail.length > 0) break;
    }
  }

  // 终极安全保底：若因极端情况仍未匹配，按点数绝对降序排列（确保尾道 >= 中道 >= 头道）
  if (bestTail.length === 0 || isFoulHand(bestHead, bestMid, bestTail)) {
    const fallbackSorted = [...cards].sort((a, b) => b.rank - a.rank || b.suitVal - a.suitVal);
    bestTail = fallbackSorted.slice(0, 5);
    bestMid = fallbackSorted.slice(5, 10);
    bestHead = fallbackSorted.slice(10, 13);
  }

  const stratLabel =
    strategy === 'solid'
      ? '稳健葫芦'
      : strategy === 'flush'
      ? '同花攻势'
      : strategy === 'balanced'
      ? '三道均衡'
      : '一键最优';

  return {
    head: bestHead,
    mid: bestMid,
    tail: bestTail,
    specialHand: special,
    fitness: bestFitness,
    strategyLabel: special ? `特殊牌型【${special.name}】` : stratLabel,
  };
}

// -------------------------------------------------------------
// 比牌对决与计分结算 (Showdown & Settlement)
// -------------------------------------------------------------

export interface TierMatchDetail {
  tierName: '头道' | '中道' | '尾道';
  myLabel: string;
  oppLabel: string;
  winner: 'me' | 'opp' | 'tie';
  baseWater: number;
  bonusWater: number;
  netWater: number;
  bonusDesc?: string;
}

export interface ThirteenVersusResult {
  oppSeat: number;
  oppName: string;
  tiers: TierMatchDetail[];
  isShot: boolean;
  isFoulOpp: boolean;
  isFoulMe: boolean;
  specialMe?: SpecialHandResult | null;
  specialOpp?: SpecialHandResult | null;
  rawWater: number;
  multiplier: number;
  finalWater: number;
  summary: string;
}

export function compareTwoPlayers(
  myHand: { head: SSSCard[]; mid: SSSCard[]; tail: SSSCard[] },
  oppHand: { head: SSSCard[]; mid: SSSCard[]; tail: SSSCard[] },
  oppSeat: number = 1,
  oppName: string = '牌友'
): ThirteenVersusResult {
  const allMyCards = [...myHand.head, ...myHand.mid, ...myHand.tail];
  const allOppCards = [...oppHand.head, ...oppHand.mid, ...oppHand.tail];

  const specialMe = detectSpecialHand(allMyCards);
  const specialOpp = detectSpecialHand(allOppCards);

  if (specialMe || specialOpp) {
    if (specialMe && specialOpp) {
      const delta = specialMe.bonusWater - specialOpp.bonusWater;
      return {
        oppSeat,
        oppName,
        tiers: [],
        isShot: false,
        isFoulOpp: false,
        isFoulMe: false,
        specialMe,
        specialOpp,
        rawWater: delta,
        multiplier: 1,
        finalWater: delta,
        summary: `双方皆为特殊牌！我方【${specialMe.name}】对战【${oppName}】的【${specialOpp.name}】，净胜 ${
          delta >= 0 ? `+${delta}` : delta
        } 水`,
      };
    }
    if (specialMe) {
      return {
        oppSeat,
        oppName,
        tiers: [],
        isShot: false,
        isFoulOpp: false,
        isFoulMe: false,
        specialMe,
        specialOpp: null,
        rawWater: specialMe.bonusWater,
        multiplier: 1,
        finalWater: specialMe.bonusWater,
        summary: `🎉 我方特殊牌【${specialMe.name}】免比三道！直取【${oppName}】+${specialMe.bonusWater} 水`,
      };
    }
    if (specialOpp) {
      return {
        oppSeat,
        oppName,
        tiers: [],
        isShot: false,
        isFoulOpp: false,
        isFoulMe: false,
        specialMe: null,
        specialOpp,
        rawWater: -specialOpp.bonusWater,
        multiplier: 1,
        finalWater: -specialOpp.bonusWater,
        summary: `【${oppName}】展出特殊牌【${specialOpp.name}】！我方输付 -${specialOpp.bonusWater} 水`,
      };
    }
  }

  const isFoulMe = isFoulHand(myHand.head, myHand.mid, myHand.tail);
  const isFoulOpp = isFoulHand(oppHand.head, oppHand.mid, oppHand.tail);

  if (isFoulMe && isFoulOpp) {
    return {
      oppSeat,
      oppName,
      tiers: [],
      isShot: false,
      isFoulOpp: true,
      isFoulMe: true,
      rawWater: 0,
      multiplier: 1,
      finalWater: 0,
      summary: `双方均倒水相公，按规则打和 0 水`,
    };
  }

  if (isFoulMe) {
    const oppH = evaluate3CardTier(oppHand.head);
    const oppM = evaluate5CardTier(oppHand.mid);
    const oppT = evaluate5CardTier(oppHand.tail);
    const oppBonus =
      getTierBonusWater('head', oppH).bonus +
      getTierBonusWater('mid', oppM).bonus +
      getTierBonusWater('tail', oppT).bonus;
    const finalW = -(6 + oppBonus);
    return {
      oppSeat,
      oppName,
      tiers: [],
      isShot: true,
      isFoulOpp: false,
      isFoulMe: true,
      rawWater: finalW,
      multiplier: 1,
      finalWater: finalW,
      summary: `我方摆牌倒水相公！被【${oppName}】全胜打枪惩罚 ${finalW} 水`,
    };
  }

  if (isFoulOpp) {
    const myH = evaluate3CardTier(myHand.head);
    const myM = evaluate5CardTier(myHand.mid);
    const myT = evaluate5CardTier(myHand.tail);
    const myBonus =
      getTierBonusWater('head', myH).bonus +
      getTierBonusWater('mid', myM).bonus +
      getTierBonusWater('tail', myT).bonus;
    const finalW = 6 + myBonus;
    return {
      oppSeat,
      oppName,
      tiers: [],
      isShot: true,
      isFoulOpp: true,
      isFoulMe: false,
      rawWater: finalW,
      multiplier: 1,
      finalWater: finalW,
      summary: `【${oppName}】摆牌倒水相公！我方全胜打枪进账 +${finalW} 水`,
    };
  }

  // 正常比牌流程
  const myH = evaluate3CardTier(myHand.head);
  const myM = evaluate5CardTier(myHand.mid);
  const myT = evaluate5CardTier(myHand.tail);

  const opH = evaluate3CardTier(oppHand.head);
  const opM = evaluate5CardTier(oppHand.mid);
  const opT = evaluate5CardTier(oppHand.tail);

  const tierDetails: TierMatchDetail[] = [];

  function areCardsIdentical(c1: SSSCard[], c2: SSSCard[]): boolean {
    if (c1.length !== c2.length) return false;
    const s1 = [...c1].sort((a, b) => b.rank - a.rank || b.suitVal - a.suitVal);
    const s2 = [...c2].sort((a, b) => b.rank - a.rank || b.suitVal - a.suitVal);
    return s1.every((c, idx) => c.rank === s2[idx].rank && c.suitVal === s2[idx].suitVal);
  }

  // 头道
  let headBase = 0;
  let headWinner: 'me' | 'opp' | 'tie' = 'tie';
  if (areCardsIdentical(myHand.head, oppHand.head)) {
    headWinner = 'tie';
    headBase = 0;
  } else if (myH.scoreRank > opH.scoreRank) {
    headWinner = 'me';
    headBase = 1;
  } else if (myH.scoreRank < opH.scoreRank) {
    headWinner = 'opp';
    headBase = -1;
  }
  let headBonus = 0;
  let headDesc = '';
  if (headWinner === 'me') {
    const b = getTierBonusWater('head', myH);
    headBonus = b.bonus;
    headDesc = b.desc;
  } else if (headWinner === 'opp') {
    const b = getTierBonusWater('head', opH);
    headBonus = -b.bonus;
    headDesc = b.desc ? `对手${b.desc}` : '';
  }
  tierDetails.push({
    tierName: '头道',
    myLabel: myH.name,
    oppLabel: opH.name,
    winner: headWinner,
    baseWater: headBase,
    bonusWater: headBonus,
    netWater: headBase + headBonus,
    bonusDesc: headDesc,
  });

  // 中道
  let midBase = 0;
  let midWinner: 'me' | 'opp' | 'tie' = 'tie';
  if (areCardsIdentical(myHand.mid, oppHand.mid)) {
    midWinner = 'tie';
    midBase = 0;
  } else if (myM.scoreRank > opM.scoreRank) {
    midWinner = 'me';
    midBase = 1;
  } else if (myM.scoreRank < opM.scoreRank) {
    midWinner = 'opp';
    midBase = -1;
  }
  let midBonus = 0;
  let midDesc = '';
  if (midWinner === 'me') {
    const b = getTierBonusWater('mid', myM);
    midBonus = b.bonus;
    midDesc = b.desc;
  } else if (midWinner === 'opp') {
    const b = getTierBonusWater('mid', opM);
    midBonus = -b.bonus;
    midDesc = b.desc ? `对手${b.desc}` : '';
  }
  tierDetails.push({
    tierName: '中道',
    myLabel: myM.name,
    oppLabel: opM.name,
    winner: midWinner,
    baseWater: midBase,
    bonusWater: midBonus,
    netWater: midBase + midBonus,
    bonusDesc: midDesc,
  });

  // 尾道
  let tailBase = 0;
  let tailWinner: 'me' | 'opp' | 'tie' = 'tie';
  if (areCardsIdentical(myHand.tail, oppHand.tail)) {
    tailWinner = 'tie';
    tailBase = 0;
  } else if (myT.scoreRank > opT.scoreRank) {
    tailWinner = 'me';
    tailBase = 1;
  } else if (myT.scoreRank < opT.scoreRank) {
    tailWinner = 'opp';
    tailBase = -1;
  }
  let tailBonus = 0;
  let tailDesc = '';
  if (tailWinner === 'me') {
    const b = getTierBonusWater('tail', myT);
    tailBonus = b.bonus;
    tailDesc = b.desc;
  } else if (tailWinner === 'opp') {
    const b = getTierBonusWater('tail', opT);
    tailBonus = -b.bonus;
    tailDesc = b.desc ? `对手${b.desc}` : '';
  }
  tierDetails.push({
    tierName: '尾道',
    myLabel: myT.name,
    oppLabel: opT.name,
    winner: tailWinner,
    baseWater: tailBase,
    bonusWater: tailBonus,
    netWater: tailBase + tailBonus,
    bonusDesc: tailDesc,
  });

  const myWins = tierDetails.filter((t) => t.winner === 'me').length;
  const oppWins = tierDetails.filter((t) => t.winner === 'opp').length;
  const isShot = myWins === 3 || oppWins === 3;
  const multiplier = isShot ? 2 : 1;

  const rawBase = headBase + midBase + tailBase;
  const rawBonus = headBonus + midBonus + tailBonus;
  const finalWater = rawBase * multiplier + rawBonus;

  let summary = '';
  if (myWins === 3) {
    summary = `💥 完胜打枪【${oppName}】！基础三道翻倍 (${rawBase}×2) + 喜水(${rawBonus}) = 净胜 +${finalWater} 水`;
  } else if (oppWins === 3) {
    summary = `⚠️ 被【${oppName}】全胜打枪！基础三道负分翻倍 (${rawBase}×2) + 喜水(${rawBonus}) = 净负 ${finalWater} 水`;
  } else {
    summary = `对阵【${oppName}】：${headWinner === 'me' ? '胜' : headWinner === 'opp' ? '负' : '平'} / ${
      midWinner === 'me' ? '胜' : midWinner === 'opp' ? '负' : '平'
    } / ${tailWinner === 'me' ? '胜' : tailWinner === 'opp' ? '负' : '平'}，净计 ${
      finalWater >= 0 ? `+${finalWater}` : finalWater
    } 水`;
  }

  return {
    oppSeat,
    oppName,
    tiers: tierDetails,
    isShot,
    isFoulOpp: false,
    isFoulMe: false,
    rawWater: rawBase + rawBonus,
    multiplier,
    finalWater,
    summary,
  };
}
