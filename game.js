(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const GRAVITY = 2400;
  const WORLD_HEIGHT = HEIGHT;
  const DEFAULT_LEVEL_WIDTH = 3600;
  const MAX_DELTA_TIME = 0.033;
  const PLATFORM_COLLISION_TOLERANCE = 4;
  const PLAYER_CENTER_RATIO = 0.5;
  const SIDE_COLLISION_MARGIN = 6;
  const HEAD_BUMP_VELOCITY = 120;
  const ENEMY_BOUNCE_VELOCITY = 520;
  const ENEMY_STOMP_TOLERANCE = 10;
  const HILL_PARALLAX_SPEED_NEAR = 0.35;
  const HILL_PARALLAX_SPEED_FAR = 0.2;
  const CLOUD_PARALLAX_SPEED = 0.45;
  const BASE_XP_TO_NEXT = 140;
  const XP_GROWTH_RATE = 1.35;
  const ENEMY_XP_REWARD = 45;
  const INTRO_SCENE_DURATION = 4.5;

  const keys = new Set();

  const game = {
    state: "intro",
    score: 0,
    lives: 3,
    muted: false,
    cameraX: 0,
    startedAtLeastOnce: false,
    lastTime: 0,
  };

  const player = {
    x: 60,
    y: 380,
    w: 28,
    h: 40,
    vx: 0,
    vy: 0,
    speed: 280,
    jumpForce: 860,
    baseSpeed: 280,
    baseJumpForce: 860,
    maxLives: 3,
    onGround: false,
    facing: 1,
    animTime: 0,
    invuln: 0,
    levelUpFlash: 0,
    prevY: 380,
    respawnX: 60,
    respawnY: 380,
  };

  const groundY = 470;

  const PLAYER_STYLES = [
    { body: "#2f6fef", cap: "#e15454", legs: "#3a4f7a", glow: "rgba(120, 170, 255, 0.35)" },
    { body: "#2fbf71", cap: "#f2b134", legs: "#1c6d50", glow: "rgba(110, 255, 185, 0.35)" },
    { body: "#a06dff", cap: "#ff8acb", legs: "#4c2b7a", glow: "rgba(205, 160, 255, 0.45)" },
    { body: "#ff8a3d", cap: "#ffe37a", legs: "#7a3b1f", glow: "rgba(255, 190, 120, 0.45)" },
  ];

  const levels = [
    {
      name: "Sternenpfad",
      width: DEFAULT_LEVEL_WIDTH,
      start: { x: 60, y: 380 },
      platforms: [
        { x: 0, y: groundY, w: DEFAULT_LEVEL_WIDTH, h: 70 },
        { x: 260, y: 400, w: 140, h: 26 },
        { x: 500, y: 340, w: 120, h: 24 },
        { x: 740, y: 375, w: 130, h: 22 },
        { x: 930, y: 310, w: 110, h: 24 },
        { x: 1170, y: 360, w: 150, h: 24 },
        { x: 1420, y: 300, w: 160, h: 24 },
        { x: 1680, y: 355, w: 120, h: 24 },
        { x: 1900, y: 290, w: 145, h: 24 },
        { x: 2130, y: 335, w: 140, h: 24 },
        { x: 2360, y: 280, w: 170, h: 24 },
        { x: 2630, y: 340, w: 130, h: 24 },
        { x: 2870, y: 300, w: 160, h: 24 },
        { x: 3130, y: 250, w: 140, h: 24 },
      ],
      hazards: [
        { x: 660, y: groundY - 20, w: 70, h: 20 },
        { x: 1540, y: groundY - 20, w: 80, h: 20 },
        { x: 2460, y: groundY - 20, w: 80, h: 20 },
      ],
      collectibles: [
        { x: 300, y: 360, w: 16, h: 16, taken: false },
        { x: 550, y: 300, w: 16, h: 16, taken: false },
        { x: 810, y: 335, w: 16, h: 16, taken: false },
        { x: 980, y: 270, w: 16, h: 16, taken: false },
        { x: 1250, y: 320, w: 16, h: 16, taken: false },
        { x: 1500, y: 260, w: 16, h: 16, taken: false },
        { x: 1760, y: 315, w: 16, h: 16, taken: false },
        { x: 1960, y: 250, w: 16, h: 16, taken: false },
        { x: 2220, y: 295, w: 16, h: 16, taken: false },
        { x: 2440, y: 240, w: 16, h: 16, taken: false },
        { x: 2690, y: 300, w: 16, h: 16, taken: false },
        { x: 2950, y: 260, w: 16, h: 16, taken: false },
        { x: 3190, y: 210, w: 16, h: 16, taken: false },
      ],
      enemies: [
        { x: 860, y: 442, w: 30, h: 28, minX: 800, maxX: 1040, speed: 72, dir: 1 },
        { x: 1740, y: 327, w: 30, h: 28, minX: 1690, maxX: 1785, speed: 58, dir: -1 },
        { x: 2280, y: 307, w: 30, h: 28, minX: 2140, maxX: 2350, speed: 70, dir: 1 },
        { x: 2990, y: 272, w: 30, h: 28, minX: 2880, maxX: 3040, speed: 76, dir: -1 },
      ],
      goal: { x: 3440, y: 340, w: 44, h: 130 },
      clouds: [
        { x: 120, y: 80, s: 1.1 },
        { x: 540, y: 70, s: 0.9 },
        { x: 980, y: 100, s: 1.3 },
        { x: 1520, y: 75, s: 1.1 },
        { x: 2010, y: 95, s: 1.25 },
        { x: 2580, y: 68, s: 1.05 },
        { x: 3250, y: 84, s: 1.2 },
      ],
    },
    {
      name: "Nachtklippen",
      width: 3900,
      start: { x: 70, y: 360 },
      platforms: [
        { x: 0, y: groundY, w: 3900, h: 70 },
        { x: 220, y: 410, w: 140, h: 26 },
        { x: 480, y: 340, w: 140, h: 24 },
        { x: 720, y: 300, w: 120, h: 24 },
        { x: 980, y: 360, w: 160, h: 24 },
        { x: 1240, y: 285, w: 120, h: 24 },
        { x: 1500, y: 330, w: 160, h: 24 },
        { x: 1780, y: 260, w: 140, h: 24 },
        { x: 2050, y: 310, w: 150, h: 24 },
        { x: 2320, y: 270, w: 130, h: 24 },
        { x: 2580, y: 330, w: 160, h: 24 },
        { x: 2860, y: 250, w: 150, h: 24 },
        { x: 3140, y: 300, w: 170, h: 24 },
        { x: 3440, y: 240, w: 150, h: 24 },
      ],
      hazards: [
        { x: 600, y: groundY - 20, w: 90, h: 20 },
        { x: 1380, y: groundY - 20, w: 100, h: 20 },
        { x: 2220, y: groundY - 20, w: 90, h: 20 },
        { x: 3020, y: groundY - 20, w: 120, h: 20 },
      ],
      collectibles: [
        { x: 280, y: 370, w: 16, h: 16, taken: false },
        { x: 520, y: 300, w: 16, h: 16, taken: false },
        { x: 760, y: 260, w: 16, h: 16, taken: false },
        { x: 1040, y: 320, w: 16, h: 16, taken: false },
        { x: 1300, y: 245, w: 16, h: 16, taken: false },
        { x: 1560, y: 290, w: 16, h: 16, taken: false },
        { x: 1840, y: 220, w: 16, h: 16, taken: false },
        { x: 2100, y: 270, w: 16, h: 16, taken: false },
        { x: 2380, y: 230, w: 16, h: 16, taken: false },
        { x: 2660, y: 290, w: 16, h: 16, taken: false },
        { x: 2920, y: 210, w: 16, h: 16, taken: false },
        { x: 3220, y: 260, w: 16, h: 16, taken: false },
        { x: 3500, y: 200, w: 16, h: 16, taken: false },
      ],
      enemies: [
        { x: 780, y: 272, w: 30, h: 28, minX: 720, maxX: 840, speed: 86, dir: 1 },
        { x: 1580, y: 302, w: 30, h: 28, minX: 1500, maxX: 1660, speed: 70, dir: -1 },
        { x: 2120, y: 282, w: 30, h: 28, minX: 2050, maxX: 2200, speed: 74, dir: 1 },
        { x: 2660, y: 302, w: 30, h: 28, minX: 2580, maxX: 2740, speed: 78, dir: -1 },
        { x: 3260, y: 272, w: 30, h: 28, minX: 3140, maxX: 3310, speed: 88, dir: 1 },
      ],
      goal: { x: 3720, y: 300, w: 44, h: 140 },
      clouds: [
        { x: 140, y: 70, s: 1.2 },
        { x: 620, y: 90, s: 1.0 },
        { x: 1180, y: 60, s: 1.4 },
        { x: 1760, y: 85, s: 1.15 },
        { x: 2380, y: 70, s: 1.35 },
        { x: 3040, y: 60, s: 1.1 },
        { x: 3560, y: 88, s: 1.25 },
      ],
    },
    {
      name: "Sternenfestung",
      width: 4200,
      start: { x: 80, y: 350 },
      platforms: [
        { x: 0, y: groundY, w: 4200, h: 70 },
        { x: 240, y: 410, w: 150, h: 26 },
        { x: 520, y: 330, w: 150, h: 24 },
        { x: 800, y: 280, w: 130, h: 24 },
        { x: 1080, y: 340, w: 160, h: 24 },
        { x: 1360, y: 260, w: 140, h: 24 },
        { x: 1640, y: 320, w: 170, h: 24 },
        { x: 1940, y: 240, w: 150, h: 24 },
        { x: 2240, y: 300, w: 160, h: 24 },
        { x: 2520, y: 230, w: 150, h: 24 },
        { x: 2800, y: 310, w: 170, h: 24 },
        { x: 3100, y: 250, w: 150, h: 24 },
        { x: 3380, y: 320, w: 170, h: 24 },
        { x: 3680, y: 240, w: 170, h: 24 },
      ],
      hazards: [
        { x: 620, y: groundY - 20, w: 110, h: 20 },
        { x: 1540, y: groundY - 20, w: 120, h: 20 },
        { x: 2360, y: groundY - 20, w: 110, h: 20 },
        { x: 3140, y: groundY - 20, w: 120, h: 20 },
      ],
      collectibles: [
        { x: 300, y: 370, w: 16, h: 16, taken: false },
        { x: 560, y: 290, w: 16, h: 16, taken: false },
        { x: 840, y: 240, w: 16, h: 16, taken: false },
        { x: 1120, y: 300, w: 16, h: 16, taken: false },
        { x: 1400, y: 220, w: 16, h: 16, taken: false },
        { x: 1680, y: 280, w: 16, h: 16, taken: false },
        { x: 1980, y: 200, w: 16, h: 16, taken: false },
        { x: 2280, y: 260, w: 16, h: 16, taken: false },
        { x: 2580, y: 190, w: 16, h: 16, taken: false },
        { x: 2860, y: 270, w: 16, h: 16, taken: false },
        { x: 3160, y: 210, w: 16, h: 16, taken: false },
        { x: 3440, y: 280, w: 16, h: 16, taken: false },
        { x: 3740, y: 200, w: 16, h: 16, taken: false },
      ],
      enemies: [
        { x: 880, y: 252, w: 30, h: 28, minX: 810, maxX: 930, speed: 90, dir: 1 },
        { x: 1740, y: 292, w: 30, h: 28, minX: 1660, maxX: 1810, speed: 82, dir: -1 },
        { x: 2320, y: 272, w: 30, h: 28, minX: 2250, maxX: 2400, speed: 84, dir: 1 },
        { x: 2900, y: 282, w: 30, h: 28, minX: 2820, maxX: 2970, speed: 86, dir: -1 },
        { x: 3480, y: 292, w: 30, h: 28, minX: 3400, maxX: 3550, speed: 92, dir: 1 },
        { x: 3780, y: 212, w: 30, h: 28, minX: 3690, maxX: 3850, speed: 96, dir: -1 },
      ],
      goal: { x: 4010, y: 280, w: 44, h: 150 },
      clouds: [
        { x: 160, y: 70, s: 1.25 },
        { x: 700, y: 88, s: 1.05 },
        { x: 1320, y: 65, s: 1.4 },
        { x: 1980, y: 92, s: 1.2 },
        { x: 2620, y: 68, s: 1.35 },
        { x: 3280, y: 62, s: 1.15 },
        { x: 3920, y: 86, s: 1.3 },
      ],
    },
  ];

  let level = null;
  let levelWidth = DEFAULT_LEVEL_WIDTH;
  let currentLevelIndex = 0;
  let playerLevel = 1;
  let playerXP = 0;
  let xpToNextLevel = BASE_XP_TO_NEXT;
  const intro = { index: 0, timer: 0 };
  const introScenes = [
    {
      title: "Pixel-Königreich",
      lines: ["In einem alten Pixel-Königreich", "wurde die Energie der Sterne gestohlen."],
      draw: drawIntroCastle,
    },
    {
      title: "Der gestohlene Stern",
      lines: ["Ein finsterer Schatten raubte das Licht,", "nur ein Stern blieb als Spur zurück."],
      draw: drawIntroStar,
    },
    {
      title: "Der Held erwacht",
      lines: [
        "Unser Held muss durch gefährliche Welten",
        "springen, Gegner besiegen und stärker werden,",
        "um das Licht zurückzubringen.",
      ],
      draw: drawIntroHero,
    },
  ];

  // Web Audio API: central nodes, simple SFX and looping retro music.
  let audioCtx;
  let masterGain;
  let musicGain;
  let musicStarted = false;
  let nextNoteTime = 0;
  let musicStep = 0;

  const melody = [
    523.25, 659.25, 783.99, 659.25,
    587.33, 659.25, 698.46, 783.99,
    880.0, 783.99, 698.46, 659.25,
    587.33, 523.25, 659.25, 783.99,
  ];

  const bass = [130.81, 130.81, 146.83, 164.81, 174.61, 164.81, 146.83, 130.81];

  function ensureAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.35;
      musicGain = audioCtx.createGain();
      musicGain.gain.value = 0.4;
      musicGain.connect(masterGain);
      masterGain.connect(audioCtx.destination);
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }

  function setMuted(muted) {
    game.muted = muted;
    if (masterGain) {
      masterGain.gain.setTargetAtTime(muted ? 0 : 0.35, audioCtx.currentTime, 0.01);
      if (!muted && musicStarted) {
        nextNoteTime = audioCtx.currentTime + 0.05;
      }
    }
  }

  function beep(freq, duration = 0.12, type = "square", volume = 0.18, when = 0) {
    if (game.muted || !audioCtx) return;
    const now = audioCtx.currentTime + when;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function sfxJump() {
    beep(560, 0.08, "square", 0.12);
    beep(760, 0.06, "square", 0.1, 0.04);
  }

  function sfxCollect() {
    beep(900, 0.07, "triangle", 0.14);
    beep(1200, 0.09, "triangle", 0.12, 0.06);
  }

  function sfxDamage() {
    beep(220, 0.1, "sawtooth", 0.13);
    beep(170, 0.16, "sawtooth", 0.1, 0.07);
  }

  function sfxWin() {
    [784, 988, 1174, 1568].forEach((f, i) => beep(f, 0.12, "square", 0.12, i * 0.08));
  }

  function sfxGameOver() {
    [392, 294, 220, 165].forEach((f, i) => beep(f, 0.15, "triangle", 0.12, i * 0.1));
  }

  function startMusic() {
    if (!audioCtx || musicStarted) return;
    musicStarted = true;
    nextNoteTime = audioCtx.currentTime + 0.05;
  }

  function scheduleMusic() {
    if (!musicStarted || !audioCtx || game.muted || game.state !== "playing") return;
    const stepDur = 0.18;
    while (nextNoteTime < audioCtx.currentTime + 0.2) {
      const m = melody[musicStep % melody.length];
      const b = bass[musicStep % bass.length];

      const o1 = audioCtx.createOscillator();
      const o2 = audioCtx.createOscillator();
      const g1 = audioCtx.createGain();
      const g2 = audioCtx.createGain();

      o1.type = "square";
      o2.type = "triangle";
      o1.frequency.setValueAtTime(m, nextNoteTime);
      o2.frequency.setValueAtTime(b, nextNoteTime);

      g1.gain.setValueAtTime(0.0001, nextNoteTime);
      g1.gain.exponentialRampToValueAtTime(0.08, nextNoteTime + 0.01);
      g1.gain.exponentialRampToValueAtTime(0.0001, nextNoteTime + stepDur * 0.95);

      g2.gain.setValueAtTime(0.0001, nextNoteTime);
      g2.gain.exponentialRampToValueAtTime(0.07, nextNoteTime + 0.01);
      g2.gain.exponentialRampToValueAtTime(0.0001, nextNoteTime + stepDur * 0.95);

      o1.connect(g1);
      o2.connect(g2);
      g1.connect(musicGain);
      g2.connect(musicGain);

      o1.start(nextNoteTime);
      o2.start(nextNoteTime);
      o1.stop(nextNoteTime + stepDur);
      o2.stop(nextNoteTime + stepDur);

      nextNoteTime += stepDur;
      musicStep += 1;
    }
  }

  function overlaps(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  // Clone level data so collectibles/enemies can be modified per run.
  function cloneLevelData(data) {
    return {
      name: data.name,
      width: data.width,
      start: { ...data.start },
      platforms: data.platforms.map((p) => ({ ...p })),
      hazards: data.hazards.map((h) => ({ ...h })),
      collectibles: data.collectibles.map((c) => ({ ...c, taken: false })),
      enemies: data.enemies.map((e) => ({ ...e, defeated: false })),
      goal: { ...data.goal },
      clouds: data.clouds.map((c) => ({ ...c })),
    };
  }

  // Lädt ein Level aus der definierten Level-Struktur.
  function loadLevel(levelIndex) {
    const data = levels[levelIndex];
    if (!data) return;
    currentLevelIndex = levelIndex;
    level = cloneLevelData(data);
    levelWidth = level.width;
    player.respawnX = level.start.x;
    player.respawnY = level.start.y;
    resetLevel();
  }

  function resetLevel() {
    player.x = player.respawnX;
    player.y = player.respawnY;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    player.invuln = 0;
    player.levelUpFlash = 0;
    player.prevY = player.y;
    game.cameraX = 0;
  }

  function applyLevelBonuses() {
    player.speed = player.baseSpeed + (playerLevel - 1) * 22;
    player.jumpForce = player.baseJumpForce + (playerLevel - 1) * 40;
    player.maxLives = 3 + Math.floor((playerLevel - 1) / 2);
  }

  // XP-System: XP sammeln und Level-Up auslösen.
  function addXP(amount) {
    playerXP += amount;
    while (playerXP >= xpToNextLevel) {
      playerXP -= xpToNextLevel;
      levelUp();
    }
  }

  function levelUp() {
    playerLevel += 1;
    xpToNextLevel = Math.round(xpToNextLevel * XP_GROWTH_RATE);
    applyLevelBonuses();
    player.levelUpFlash = 0.6;
    game.lives = Math.min(player.maxLives, game.lives + 1);
  }

  // Gegner besiegen, XP vergeben und den Spieler abprallen lassen.
  function defeatEnemy(enemy) {
    enemy.defeated = true;
    player.vy = -ENEMY_BOUNCE_VELOCITY;
    player.onGround = false;
    addXP(ENEMY_XP_REWARD);
  }

  function updateIntro(dt) {
    intro.timer += dt;
    if (intro.timer >= INTRO_SCENE_DURATION) {
      intro.timer = 0;
      intro.index += 1;
    }
    if (intro.index >= introScenes.length) {
      startNewGame(false);
    }
  }

  function damagePlayer() {
    if (player.invuln > 0 || game.state !== "playing") return;

    game.lives -= 1;
    player.invuln = 1.2;
    sfxDamage();

    if (game.lives <= 0) {
      game.state = "gameover";
      sfxGameOver();
      return;
    }

    player.x = Math.max(20, player.x - 70);
    player.y = 320;
    player.vx = 0;
    player.vy = 0;
  }

  function updatePlayer(dt) {
    let move = 0;
    if (keys.has("arrowleft") || keys.has("a")) move -= 1;
    if (keys.has("arrowright") || keys.has("d")) move += 1;

    player.vx = move * player.speed;
    if (move !== 0) player.facing = move;

    player.vy += GRAVITY * dt;
    player.prevY = player.y;
    const prevY = player.prevY;

    player.x += player.vx * dt;
    player.y += player.vy * dt;

    if (player.x < 0) player.x = 0;
    if (player.x + player.w > levelWidth) player.x = levelWidth - player.w;

    player.onGround = false;
    for (const p of level.platforms) {
      if (!overlaps(player, p)) continue;

      const prevBottom = prevY + player.h;
      if (prevBottom <= p.y + PLATFORM_COLLISION_TOLERANCE && player.vy >= 0) {
        player.y = p.y - player.h;
        player.vy = 0;
        player.onGround = true;
      } else if (player.x + player.w * PLAYER_CENTER_RATIO < p.x + SIDE_COLLISION_MARGIN) {
        player.x = p.x - player.w;
      } else if (player.x + player.w * PLAYER_CENTER_RATIO > p.x + p.w - SIDE_COLLISION_MARGIN) {
        player.x = p.x + p.w;
      } else if (player.vy < 0) {
        player.y = p.y + p.h;
        player.vy = HEAD_BUMP_VELOCITY;
      }
    }

    if (player.y > WORLD_HEIGHT + 120) {
      damagePlayer();
      player.x = Math.max(20, player.x - 100);
      player.y = 260;
      player.vx = 0;
      player.vy = 0;
    }

    if (player.invuln > 0) {
      player.invuln = Math.max(0, player.invuln - dt);
    }

    if (player.levelUpFlash > 0) {
      player.levelUpFlash = Math.max(0, player.levelUpFlash - dt);
    }

    player.animTime += dt;
  }

  function updateEnemies(dt) {
    for (const enemy of level.enemies) {
      if (enemy.defeated) continue;
      enemy.x += enemy.speed * enemy.dir * dt;
      if (enemy.x <= enemy.minX) {
        enemy.x = enemy.minX;
        enemy.dir = 1;
      } else if (enemy.x + enemy.w >= enemy.maxX) {
        enemy.x = enemy.maxX - enemy.w;
        enemy.dir = -1;
      }

      if (overlaps(player, enemy)) {
        // Nur ein Treffer von oben besiegt den Gegner.
        const playerBottomPrev = player.prevY + player.h;
        const stompFromAbove = player.vy > 0 && playerBottomPrev <= enemy.y + ENEMY_STOMP_TOLERANCE;
        if (stompFromAbove) {
          defeatEnemy(enemy);
        } else {
          damagePlayer();
        }
      }
    }
  }

  function updateCollectibles() {
    for (const item of level.collectibles) {
      if (!item.taken && overlaps(player, item)) {
        item.taken = true;
        game.score += 100;
        sfxCollect();
      }
    }
  }

  function updateHazards() {
    for (const h of level.hazards) {
      if (overlaps(player, h)) {
        damagePlayer();
      }
    }
  }

  function updateGoal() {
    if (overlaps(player, level.goal)) {
      if (currentLevelIndex < levels.length - 1) {
        loadLevel(currentLevelIndex + 1);
      } else {
        game.state = "win";
        sfxWin();
      }
    }
  }

  function updateCamera() {
    const target = player.x + player.w * 0.5 - WIDTH * 0.5;
    game.cameraX = Math.max(0, Math.min(target, levelWidth - WIDTH));
  }

  function update(dt) {
    if (game.state === "intro") {
      updateIntro(dt);
      return;
    }
    if (game.state !== "playing") return;

    updatePlayer(dt);
    updateEnemies(dt);
    updateCollectibles();
    updateHazards();
    updateGoal();
    updateCamera();
    scheduleMusic();
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, "#8bd2ff");
    sky.addColorStop(1, "#dbf6ff");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Parallax: distant hills move slower than the foreground.
    const hillOffset1 = (game.cameraX * HILL_PARALLAX_SPEED_FAR) % WIDTH;
    const hillOffset2 = (game.cameraX * HILL_PARALLAX_SPEED_NEAR) % WIDTH;

    ctx.fillStyle = "#8ecf9f";
    for (let i = -1; i < 3; i++) {
      const x = i * WIDTH - hillOffset1;
      ctx.beginPath();
      ctx.moveTo(x, HEIGHT);
      ctx.quadraticCurveTo(x + 180, 280, x + 360, HEIGHT);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = "#6fbe85";
    for (let i = -1; i < 3; i++) {
      const x = i * WIDTH - hillOffset2;
      ctx.beginPath();
      ctx.moveTo(x, HEIGHT);
      ctx.quadraticCurveTo(x + 120, 330, x + 260, HEIGHT);
      ctx.closePath();
      ctx.fill();
    }

    for (const cloud of level.clouds) {
      const cx = cloud.x - game.cameraX * CLOUD_PARALLAX_SPEED;
      drawCloud(cx, cloud.y, cloud.s);
    }
  }

  function drawCloud(x, y, scale) {
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    const w = 70 * scale;
    const h = 24 * scale;
    ctx.fillRect(x, y, w, h);
    ctx.fillRect(x + w * 0.15, y - h * 0.5, w * 0.3, h);
    ctx.fillRect(x + w * 0.52, y - h * 0.35, w * 0.34, h * 0.9);
  }

  function drawPlatforms() {
    for (const p of level.platforms) {
      const x = p.x - game.cameraX;
      if (x + p.w < -40 || x > WIDTH + 40) continue;

      ctx.fillStyle = "#4f8f5f";
      ctx.fillRect(x, p.y, p.w, 6);
      ctx.fillStyle = "#6c757d";
      ctx.fillRect(x, p.y + 6, p.w, p.h - 6);

      ctx.fillStyle = "rgba(255,255,255,0.12)";
      for (let i = 0; i < p.w; i += 18) {
        ctx.fillRect(x + i, p.y + 10, 2, p.h - 12);
      }
    }
  }

  function drawHazards() {
    ctx.fillStyle = "#ce3d4c";
    for (const h of level.hazards) {
      const x = h.x - game.cameraX;
      for (let i = 0; i < h.w; i += 10) {
        ctx.beginPath();
        ctx.moveTo(x + i, h.y + h.h);
        ctx.lineTo(x + i + 5, h.y);
        ctx.lineTo(x + i + 10, h.y + h.h);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function drawCollectibles() {
    for (const c of level.collectibles) {
      if (c.taken) continue;
      const x = c.x - game.cameraX;
      const y = c.y + Math.sin((performance.now() + c.x) * 0.006) * 3;

      ctx.fillStyle = "#ffd24a";
      ctx.beginPath();
      ctx.moveTo(x + 8, y);
      ctx.lineTo(x + 10, y + 6);
      ctx.lineTo(x + 16, y + 6);
      ctx.lineTo(x + 11.5, y + 10);
      ctx.lineTo(x + 13.5, y + 16);
      ctx.lineTo(x + 8, y + 12);
      ctx.lineTo(x + 2.5, y + 16);
      ctx.lineTo(x + 4.5, y + 10);
      ctx.lineTo(x, y + 6);
      ctx.lineTo(x + 6, y + 6);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawEnemy(enemy) {
    if (enemy.defeated) return;
    const x = enemy.x - game.cameraX;
    const y = enemy.y;

    ctx.fillStyle = "#42b883";
    ctx.fillRect(x, y + 8, enemy.w, enemy.h - 8);
    ctx.fillRect(x + 4, y + 2, enemy.w - 8, 10);

    ctx.fillStyle = "#0e1b2a";
    ctx.fillRect(x + 7, y + 12, 4, 4);
    ctx.fillRect(x + enemy.w - 11, y + 12, 4, 4);

    ctx.fillStyle = "#1f7f59";
    const wobble = Math.sin(performance.now() * 0.012 + enemy.x) * 2;
    ctx.fillRect(x + 4, y + enemy.h - 4, 6, 3 + wobble);
    ctx.fillRect(x + enemy.w - 10, y + enemy.h - 4, 6, 3 - wobble);
  }

  function drawPlayer() {
    if (player.invuln > 0 && Math.floor(performance.now() * 0.03) % 2 === 0) return;

    const x = player.x - game.cameraX;
    const y = player.y;
    const style = PLAYER_STYLES[(playerLevel - 1) % PLAYER_STYLES.length];
    const baseGlow = playerLevel > 1 ? 6 + (playerLevel - 1) * 2 : 0;
    const flashGlow = player.levelUpFlash > 0 ? 18 * (player.levelUpFlash / 0.6) : 0;

    const stride = player.onGround ? Math.sin(player.animTime * 18) * 3 : 0;
    ctx.save();
    ctx.shadowColor = style.glow;
    ctx.shadowBlur = baseGlow + flashGlow;
    ctx.fillStyle = style.body;
    ctx.fillRect(x + 8, y + 14, 12, 18);

    ctx.fillStyle = "#f9c89b";
    ctx.fillRect(x + 8, y + 4, 12, 12);

    ctx.fillStyle = style.cap;
    ctx.fillRect(x + 7, y, 14, 6);

    ctx.fillStyle = "#0f1f2f";
    ctx.fillRect(x + 10, y + 8, 2, 2);
    ctx.fillRect(x + 16, y + 8, 2, 2);

    ctx.fillStyle = style.legs;
    ctx.fillRect(x + 8, y + 32, 5, 8 + stride);
    ctx.fillRect(x + 15, y + 32, 5, 8 - stride);

    if (!player.onGround) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + (player.facing > 0 ? 20 : 4), y + 18, 4, 2);
    }
    ctx.restore();
  }

  function drawGoal() {
    const g = level.goal;
    const x = g.x - game.cameraX;

    ctx.fillStyle = "#70543e";
    ctx.fillRect(x + 18, g.y, 8, g.h);

    ctx.fillStyle = "#7d3cff";
    const wave = Math.sin(performance.now() * 0.01) * 3;
    ctx.beginPath();
    ctx.moveTo(x + 26, g.y + 8);
    ctx.lineTo(x + 48 + wave, g.y + 20);
    ctx.lineTo(x + 26, g.y + 32);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(125, 60, 255, 0.18)";
    ctx.fillRect(x - 4, g.y + g.h - 10, 54, 10);
  }

  function drawHud() {
    ctx.fillStyle = "rgba(16, 32, 48, 0.7)";
    ctx.fillRect(12, 12, 260, 120);

    ctx.fillStyle = "#ffffff";
    ctx.font = "20px monospace";
    ctx.fillText(`Punkte: ${game.score}`, 24, 38);
    ctx.fillText(`Leben: ${game.lives}`, 24, 62);
    ctx.fillText(`Level: ${playerLevel}`, 24, 86);
    ctx.fillText(`XP: ${playerXP}/${xpToNextLevel}`, 24, 110);

    ctx.fillStyle = "rgba(16, 32, 48, 0.65)";
    ctx.fillRect(WIDTH - 170, 12, 158, 32);
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px monospace";
    ctx.fillText(game.muted ? "Sound: AUS (M)" : "Sound: AN (M)", WIDTH - 162, 33);
  }

  function drawOverlay(title, subtitle, extraLines = []) {
    ctx.fillStyle = "rgba(10, 20, 35, 0.58)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "54px monospace";
    ctx.fillText(title, WIDTH * 0.5, HEIGHT * 0.38);

    ctx.font = "22px monospace";
    ctx.fillText(subtitle, WIDTH * 0.5, HEIGHT * 0.48);

    ctx.font = "18px monospace";
    extraLines.forEach((line, i) => {
      ctx.fillText(line, WIDTH * 0.5, HEIGHT * 0.57 + i * 28);
    });

    ctx.textAlign = "left";
  }

  // Intro-Sequenz mit einfacher Bitmap-/Pixel-Art.
  function drawIntroStory() {
    const scene = introScenes[Math.min(intro.index, introScenes.length - 1)];

    ctx.fillStyle = "#0b1020";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    for (let i = 0; i < 60; i++) {
      const starX = (i * 157) % WIDTH;
      const starY = (i * 83) % (HEIGHT * 0.6);
      ctx.fillRect(starX, starY, 2, 2);
    }

    scene.draw();

    ctx.fillStyle = "rgba(5, 8, 16, 0.75)";
    ctx.fillRect(0, HEIGHT * 0.62, WIDTH, HEIGHT * 0.38);

    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "28px monospace";
    ctx.fillText(scene.title, WIDTH * 0.5, HEIGHT * 0.72);
    ctx.font = "18px monospace";
    scene.lines.forEach((line, i) => {
      ctx.fillText(line, WIDTH * 0.5, HEIGHT * 0.78 + i * 24);
    });
    ctx.font = "14px monospace";
    ctx.fillStyle = "#c9d7ff";
    ctx.fillText("Beliebige Taste zum Überspringen", WIDTH * 0.5, HEIGHT - 20);
    ctx.restore();
  }

  function drawIntroCastle() {
    const baseY = HEIGHT * 0.55;
    ctx.fillStyle = "#18223a";
    ctx.fillRect(140, baseY, 220, 120);
    ctx.fillRect(110, baseY - 40, 60, 160);
    ctx.fillRect(330, baseY - 50, 70, 170);

    ctx.fillStyle = "#101724";
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(170 + i * 34, baseY + 30, 12, 18);
    }
    ctx.fillRect(128, baseY + 20, 18, 20);
    ctx.fillRect(352, baseY + 10, 20, 24);

    ctx.fillStyle = "#293b5f";
    ctx.fillRect(200, baseY - 20, 40, 20);
    ctx.fillRect(280, baseY - 20, 40, 20);
  }

  function drawIntroStar() {
    const cx = WIDTH * 0.5;
    const cy = HEIGHT * 0.38;

    ctx.fillStyle = "#1a2030";
    ctx.fillRect(cx - 140, cy - 40, 280, 80);

    ctx.fillStyle = "#ffd24a";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 40);
    ctx.lineTo(cx + 16, cy - 6);
    ctx.lineTo(cx + 54, cy - 6);
    ctx.lineTo(cx + 22, cy + 14);
    ctx.lineTo(cx + 36, cy + 48);
    ctx.lineTo(cx, cy + 26);
    ctx.lineTo(cx - 36, cy + 48);
    ctx.lineTo(cx - 22, cy + 14);
    ctx.lineTo(cx - 54, cy - 6);
    ctx.lineTo(cx - 16, cy - 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#0b1020";
    ctx.fillRect(cx - 10, cy + 4, 20, 18);
  }

  function drawIntroHero() {
    const baseY = HEIGHT * 0.62;
    ctx.fillStyle = "#0f1b2d";
    ctx.fillRect(0, baseY + 40, WIDTH, 140);

    const heroX = WIDTH * 0.25;
    ctx.fillStyle = "#1f2e49";
    ctx.fillRect(heroX, baseY - 10, 26, 50);
    ctx.fillRect(heroX - 6, baseY - 28, 38, 20);
    ctx.fillRect(heroX + 6, baseY - 48, 16, 20);

    ctx.fillStyle = "#ffd24a";
    ctx.fillRect(heroX + 46, baseY - 20, 10, 10);
    ctx.fillRect(heroX + 62, baseY - 30, 6, 6);
  }
  function render() {
    if (game.state === "intro") {
      drawIntroStory();
      return;
    }
    drawBackground();
    drawPlatforms();
    drawHazards();
    drawCollectibles();
    level.enemies.forEach(drawEnemy);
    drawGoal();
    drawPlayer();
    drawHud();

    if (game.state === "start") {
      drawOverlay("Pixel Adventure Run", "Drücke Enter zum Start", [
        "Sammle Sterne, weiche Schleimen aus,",
        "und erreiche das Portal am Levelende.",
      ]);
    } else if (game.state === "paused") {
      drawOverlay("Pause", "Drücke P zum Fortsetzen");
    } else if (game.state === "gameover") {
      drawOverlay("Game Over", `Punkte: ${game.score}`, ["Drücke Enter zum Neustart"]);
    } else if (game.state === "win") {
      drawOverlay("Sieg!", `Endpunktzahl: ${game.score}`, ["Drücke Enter für neues Spiel"]);
    }
  }

  function startNewGame(withAudio = true) {
    if (withAudio) {
      ensureAudio();
      startMusic();
    }
    game.score = 0;
    playerLevel = 1;
    playerXP = 0;
    xpToNextLevel = BASE_XP_TO_NEXT;
    applyLevelBonuses();
    game.lives = player.maxLives;
    loadLevel(0);
    game.state = "playing";
    game.startedAtLeastOnce = true;
  }

  function togglePause() {
    if (game.state === "playing") {
      game.state = "paused";
    } else if (game.state === "paused") {
      if (audioCtx && musicStarted) {
        nextNoteTime = audioCtx.currentTime + 0.05;
      }
      game.state = "playing";
    }
  }

  function handleJumpInput() {
    if (game.state === "playing" && player.onGround) {
      player.vy = -player.jumpForce;
      player.onGround = false;
      sfxJump();
    }
  }

  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();

    if (game.state === "intro") {
      e.preventDefault();
      keys.clear();
      startNewGame();
      return;
    }
    keys.add(key);

    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
      e.preventDefault();
    }

    if (key === "enter") {
      if (game.state === "start" || game.state === "gameover" || game.state === "win") {
        startNewGame();
      }
    }

    if (key === "p") {
      togglePause();
    }

    if (key === "m") {
      ensureAudio();
      setMuted(!game.muted);
    }

    if (key === "w" || key === "arrowup" || key === " ") {
      handleJumpInput();
    }
  });

  window.addEventListener("keyup", (e) => {
    keys.delete(e.key.toLowerCase());
  });

  function gameLoop(ts) {
    if (!game.lastTime) game.lastTime = ts;
    const rawDt = (ts - game.lastTime) / 1000;
    game.lastTime = ts;
    const dt = Math.min(MAX_DELTA_TIME, rawDt);

    update(dt);
    render();
    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
})();
