class SoundEffects {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Stone or light card tap
  public playTap() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(560, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.05);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Heavy wooden piece thud (Xiangqi move / capture)
  public playWoodPiece(isCapture = false) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isCapture ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(isCapture ? 300 : 220, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + (isCapture ? 0.12 : 0.08));
    gain.gain.setValueAtTime(isCapture ? 0.35 : 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isCapture ? 0.13 : 0.09));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  // Mahjong ceramic clack (碰/打/杠)
  public playMahjongClack() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(840, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.07);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Card snap / deal / bomb
  public playCardSnap(isBomb = false) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    if (isBomb) {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(36, now + 0.28);
      gain.gain.setValueAtTime(0.38, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.31);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.045);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.055);
    }
  }

  // Victory chime
  public playVictory = () => {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((freq, idx) => {
        const now = ctx.currentTime + idx * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.24, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.42);
      });
    } catch {}
  };

  // Defeat chime (descending tones)
  public playDefeat = () => {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const notes = [440, 415.3, 370, 311.13];
      notes.forEach((freq, idx) => {
        const now = ctx.currentTime + idx * 0.12;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      });
    } catch {}
  };

  // 3D Rocket Launch & Supernova Detonation
  public playRocket() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Ascending whoosh
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.6);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.55);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.7);

    // Explosive blast after launch
    setTimeout(() => {
      this.playBombExplosion(true);
    }, 550);
  }

  // 3D Bomb Detonation / Shockwave
  public playBombExplosion(isNuke = false) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * (isNuke ? 0.7 : 0.4);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.15));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);
    filter.frequency.exponentialRampToValueAtTime(50, now + (isNuke ? 0.6 : 0.35));

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(isNuke ? 0.6 : 0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isNuke ? 0.68 : 0.38));

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  // 3D Airplane Flyby Doppler Shift
  public playAirplane() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.linearRampToValueAtTime(480, now + 0.4);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.9);
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.0);
  }

  // 3D Gunshot Crack (十三水打枪)
  public playGunshot() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Crisp sharp transient
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
    // Low recoil thump
    setTimeout(() => {
      this.playWoodPiece(true);
    }, 30);
  }

  // 3D Heavy Jade / Calligraphy Seal Stamp (碰/杠/胡)
  public playSealStamp() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  // 3D Tumbling Rolling Dice
  public playDiceRoll() {
    const ctx = this.getContext();
    if (!ctx) return;
    const clicks = 6;
    for (let i = 0; i < clicks; i++) {
      const delay = i * 0.045 + Math.random() * 0.02;
      setTimeout(() => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(900 + Math.random() * 400, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);
        gain.gain.setValueAtTime(0.18 * (1 - i / clicks), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      }, delay * 1000);
    }
  }

  // 3D Coin Cascade Chime
  public playCoinShower() {
    const ctx = this.getContext();
    if (!ctx) return;
    const freqs = [1046.5, 1318.5, 1567.98, 2093.0, 2637.0];
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const freq = freqs[Math.floor(Math.random() * freqs.length)];
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.28);
      }, i * 65);
    }
  }

  // Tomato splat or slipper slap
  public playSplat() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.12);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Beer glass clink toast
  public playClink() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(1900, now + 0.22);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  // Flower chime
  public playFlower() {
    const ctx = this.getContext();
    if (!ctx) return;
    const chords = [659.25, 830.61, 987.77, 1318.5];
    chords.forEach((f, i) => {
      setTimeout(() => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.32);
      }, i * 50);
    });
  }

  // Authentic Chinese Traditional Voice Pack (国粹原汁原味真人/拟真人语音包)
  public speakAction(
    action:
      | 'call_landlord'
      | 'grab_landlord'
      | 'pass_bid'
      | 'pass'
      | 'bomb'
      | 'rocket'
      | 'straight'
      | 'airplane'
      | 'pairs'
      | 'peng'
      | 'gang'
      | 'zimo'
      | 'gunshot'
      | 'grand_slam'
      | 'spring'
      | 'anti_spring'
      | 'clean_out'
      | 'yansan_lead'
      | 'chudadi_lead'
      | 'checkin'
      | string,
    options?: { isFemale?: boolean; text?: string; pitch?: number; rate?: number }
  ) {
    if (!this.enabled || typeof window === 'undefined') return;

    const actionTextMap: Record<string, string[]> = {
      call_landlord: ['叫地主！', '叫地主三分！'],
      grab_landlord: ['抢地主！', '我抢地主！'],
      pass_bid: ['不叫。', '过。'],
      pass: ['要不起。', '不出。', '过。'],
      bomb: ['炸弹！', '王牌炸弹！'],
      rocket: ['王炸！', '火箭通天！'],
      straight: ['顺子！'],
      airplane: ['飞机带翅膀！', '飞机起飞！'],
      pairs: ['连对！'],
      peng: ['碰！', '这手我碰！'],
      gang: ['杠牌！', '开杠！'],
      zimo: ['自摸！胡了！', '自摸，胡牌！', '自摸！大胡！'],
      gunshot: ['打枪！洞穿！'],
      grand_slam: ['全垒打！通关横扫！'],
      spring: ['春天大捷，倍数翻倍！'],
      anti_spring: ['反春大捷，农民克敌！'],
      clean_out: ['率先出清，关门大吉！'],
      yansan_lead: ['方块四首出！开牌！', '方块四首发，开局！'],
      chudadi_lead: ['方块三首发！黑桃二至尊！', '经典锄大地！黑桃二至尊！'],
      unbeatable: ['全场最大，连出！', '绝对压制，继续出牌！', '通天大牌，连打！'],
      cards_short: ['对手张数不足，继续出牌！', '对手不足五张，直接连出！', '对手张数不够，连打！'],
      baodan: ['报单！只剩一张牌！', '注意防守，有玩家报单！', '报单！小心最后一张！'],
      baodan_self: ['只剩最后一张牌！报单！', '报单！看我最后一张！'],
      baodan_win: ['报单绝杀，出清获胜！', '报单关门，大获全胜！'],
      baodan_pass: ['报单要不起，过！'],
      checkin: ['恭喜领得开运金币！'],
    };

    let textToSpeak = options?.text;
    if (!textToSpeak && actionTextMap[action]) {
      const candidates = actionTextMap[action];
      textToSpeak = candidates[Math.floor(Math.random() * candidates.length)];
    }
    if (!textToSpeak) {
      textToSpeak = formatChinesePokerSpeech(action);
    }

    // 严禁在自摸语音前额外增加“清一色”等修饰词，保证纯正地道自摸播报
    if (textToSpeak && (action === 'zimo' || textToSpeak.includes('自摸'))) {
      textToSpeak = textToSpeak.replace(/^清一色[，,\s]*/, '').replace(/清一色自摸/, '自摸');
    }

    const isFemale = options?.isFemale ?? Math.random() > 0.5;
    const defaultPitch = isFemale ? 1.2 : 0.92;
    const pitch = options?.pitch ?? defaultPitch;
    const rate = options?.rate ?? 1.08;

    this.speakVoice(textToSpeak, pitch, rate);
  }

  // Voice speech synthesis for poker phrases and announcements
  public speakVoice(text: string, pitch = 1.0, rate = 1.05) {
    if (!this.enabled || typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const clean = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9，。！、？]/g, '');
      if (!clean) return;
      const utter = new SpeechSynthesisUtterance(clean);
      utter.lang = 'zh-CN';
      utter.pitch = pitch;
      utter.rate = rate;
      utter.volume = 0.95;
      // Prefer Chinese voice if present
      const voices = window.speechSynthesis.getVoices();
      const zhVoice = voices.find((v) => v.lang.includes('zh') || v.lang.includes('cmn'));
      if (zhVoice) {
        utter.voice = zhVoice;
      }
      window.speechSynthesis.speak(utter);
    } catch {}
  }

  // 输赢分专属语音播报 (仅玩家本地设备能够听到)
  public speakScoreResult(score: number, isWin: boolean, isTie = false) {
    if (!this.enabled || typeof window === 'undefined') return;
    const absScore = Math.abs(Math.round(score));
    let phrase = '';
    if (isTie || (absScore === 0 && !isWin)) {
      phrase = '势均力敌，打和不分胜负，下把再战！';
    } else if (isWin || score > 0) {
      phrase = `恭喜老板，收到${absScore}分进账！`;
    } else {
      phrase = `这把大意了，输了${absScore}分，下把一定赢回来！`;
    }

    setTimeout(() => {
      this.speakVoice(phrase, isWin ? 1.05 : 0.98, 1.02);
    }, 750);
  }
}

/**
 * 将各类扑克牌型及文字描述精准转换为原汁原味地道国粹真人语音播报文本
 * 解决数字连读为万位数字（如 23456 -> 两万三千四百五十六）、10被读为一零、九十、英文字母被生硬读出等严重错误
 */
export function formatChinesePokerSpeech(text: string): string {
  if (!text) return '';

  // 过滤多余符号
  let s = text
    .replace(/×\s*\d+|\*\s*\d+/g, '')
    .replace(/[♠♥♣♦]/g, '')
    .trim();

  // 单点数到标准汉语扑克发音映射（A读尖，J读勾，Q读圈，10读十，2读二）
  const rankToZh = (r: string): string => {
    const clean = r.trim().toUpperCase();
    if (clean === '2') return '二';
    if (clean === '3') return '三';
    if (clean === '4') return '四';
    if (clean === '5') return '五';
    if (clean === '6') return '六';
    if (clean === '7') return '七';
    if (clean === '8') return '八';
    if (clean === '9') return '九';
    if (clean === '10') return '十';
    if (clean === 'J') return '勾';
    if (clean === 'Q') return '圈';
    if (clean === 'K') return '老K';
    if (clean === 'A') return '尖';
    return clean;
  };

  // 1. 同花顺（如 同花顺23456、同花顺A2345、同花顺 910JQK 等）
  const sfMatch = s.match(/^同花顺\s*(.+)$/i);
  if (sfMatch) {
    return formatStraightSpeech(sfMatch[1], '同花顺');
  }

  // 2. 顺子（如 23456顺子、A2345顺子、910JQK顺子、顺子 34567 等）
  const stMatch1 = s.match(/^(.+)顺子$/i);
  const stMatch2 = s.match(/^顺子\s*(.+)$/i);
  if (stMatch1 || stMatch2) {
    const seq = (stMatch1 ? stMatch1[1] : stMatch2![1]).trim();
    return formatStraightSpeech(seq, '顺子');
  }

  // 3. 俘虏 / 葫芦 / 三带二（如 俘虏 A带K、俘虏 10带8、俘虏 2带A）
  const fuluMatch = s.match(/^(?:俘虏|葫芦|三带二|三带对)\s*([0-9JQKA]+)\s*带\s*([0-9JQKA]+)$/i);
  if (fuluMatch) {
    const trip = rankToZh(fuluMatch[1]);
    const pair = rankToZh(fuluMatch[2]);
    return `三个${trip}带对${pair}`;
  }

  // 4. 四带一 / 铁支（如 四带一 10、四带一 A、四带一 2）
  const quadMatch = s.match(/^(?:四带一|铁支|四条)\s*([0-9JQKA]+)$/i);
  if (quadMatch) {
    const rk = rankToZh(quadMatch[1]);
    return `四个${rk}带一张`;
  }

  // 5. 三条 / 三个（如 三条 10、三条 2、三条 A、三个10）
  const triMatch = s.match(/^(?:三条|三个)\s*([0-9JQKA]+)$/i);
  if (triMatch) {
    const rk = rankToZh(triMatch[1]);
    return `三个${rk}`;
  }

  // 6. 对子 / 对（如 对10、对子 10、对A、对2、对J、对Q）
  const pairMatch = s.match(/^(?:对子|对)\s*([0-9JQKA]+)对?$/i);
  if (pairMatch) {
    const rk = rankToZh(pairMatch[1]);
    return `对${rk}`;
  }

  // 7. 单张（如 单张 10、单张 2、单张 A、单张 J、单张 Q、单张 K）
  const singleMatch = s.match(/^单张\s*([0-9JQKA]+)$/i);
  if (singleMatch) {
    const rk = rankToZh(singleMatch[1]);
    return `单张${rk}`;
  }

  // 8. 同花（如 黑桃同花、红桃同花）
  if (s.includes('同花')) {
    return s;
  }

  return s;
}

function formatStraightSpeech(seq: string, prefix: '顺子' | '同花顺'): string {
  const clean = seq.replace(/[\s,、\-_]/g, '').toUpperCase();
  if (clean === 'A2345' || clean === '2345A') {
    return prefix === '同花顺' ? '至尊同花顺，A到五' : '至尊顺子，A到五';
  }
  if (clean === '23456') return `${prefix}，二到六`;
  if (clean === '34567') return `${prefix}，三到七`;
  if (clean === '45678') return `${prefix}，四到八`;
  if (clean === '56789') return `${prefix}，五到九`;
  if (clean === '678910' || clean === '6789十') return `${prefix}，六到十`;
  if (clean === '78910J' || clean === '789十J') return `${prefix}，七到勾`;
  if (clean === '8910JQ' || clean === '89十JQ') return `${prefix}，八到圈`;
  if (clean === '910JQK' || clean === '9十JQK') return `${prefix}，九到K`;

  // 针对任意杂色或特殊连号，使用顿号隔开单字，防止 TTS 拼接读为大数字
  const chars = clean
    .split('')
    .map((c) => {
      if (c === '2') return '二';
      if (c === '3') return '三';
      if (c === '4') return '四';
      if (c === '5') return '五';
      if (c === '6') return '六';
      if (c === '7') return '七';
      if (c === '8') return '八';
      if (c === '9') return '九';
      if (c === '1' && clean.includes('10')) return '十';
      if (c === '0' && clean.includes('10')) return '';
      if (c === 'J') return '勾';
      if (c === 'Q') return '圈';
      if (c === 'K') return '老K';
      if (c === 'A') return '尖';
      return c;
    })
    .filter(Boolean);

  return `${prefix}，${chars.join('、')}`;
}

export const soundFX = new SoundEffects();

