(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const GRAVITY = 2400;
  const WORLD_HEIGHT = HEIGHT;
  const LEVEL_WIDTH = 3600;

  const keys = new Set();

  const game = {
    state: "start",
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
    onGround: false,
    facing: 1,
    animTime: 0,
    invuln: 0,
    respawnX: 60,
    respawnY: 380,
  };

  const groundY = 470;

  const level = {
    platforms: [
      { x: 0, y: groundY, w: LEVEL_WIDTH, h: 70 },
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
  };

  // Web Audio API: zentrale Knoten, einfache SFX und loopende Retro-Musik.
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

  function resetLevel(fullReset = false) {
    player.x = player.respawnX;
    player.y = player.respawnY;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    player.invuln = 0;
    game.cameraX = 0;

    if (fullReset) {
      game.score = 0;
      game.lives = 3;
      level.collectibles.forEach((c) => (c.taken = false));
      level.enemies[0].x = 860;
      level.enemies[1].x = 1740;
      level.enemies[2].x = 2280;
      level.enemies[3].x = 2990;
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
    const prevY = player.y;

    player.x += player.vx * dt;
    player.y += player.vy * dt;

    if (player.x < 0) player.x = 0;
    if (player.x + player.w > LEVEL_WIDTH) player.x = LEVEL_WIDTH - player.w;

    player.onGround = false;
    for (const p of level.platforms) {
      if (!overlaps(player, p)) continue;

      const prevBottom = prevY + player.h;
      if (prevBottom <= p.y + 4 && player.vy >= 0) {
        player.y = p.y - player.h;
        player.vy = 0;
        player.onGround = true;
      } else if (player.x + player.w * 0.5 < p.x + 6) {
        player.x = p.x - player.w;
      } else if (player.x + player.w * 0.5 > p.x + p.w - 6) {
        player.x = p.x + p.w;
      } else if (player.vy < 0) {
        player.y = p.y + p.h;
        player.vy = 120;
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

    player.animTime += dt;
  }

  function updateEnemies(dt) {
    for (const enemy of level.enemies) {
      enemy.x += enemy.speed * enemy.dir * dt;
      if (enemy.x <= enemy.minX) {
        enemy.x = enemy.minX;
        enemy.dir = 1;
      } else if (enemy.x + enemy.w >= enemy.maxX) {
        enemy.x = enemy.maxX - enemy.w;
        enemy.dir = -1;
      }

      if (overlaps(player, enemy)) {
        damagePlayer();
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
      game.state = "win";
      sfxWin();
    }
  }

  function updateCamera() {
    const target = player.x + player.w * 0.5 - WIDTH * 0.5;
    game.cameraX = Math.max(0, Math.min(target, LEVEL_WIDTH - WIDTH));
  }

  function update(dt) {
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

    // Parallax: ferne Hügel bewegen sich langsamer als Vordergrund.
    const hillOffset1 = (game.cameraX * 0.2) % WIDTH;
    const hillOffset2 = (game.cameraX * 0.35) % WIDTH;

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
      const cx = cloud.x - game.cameraX * 0.45;
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

    const stride = player.onGround ? Math.sin(player.animTime * 18) * 3 : 0;
    ctx.fillStyle = "#2f6fef";
    ctx.fillRect(x + 8, y + 14, 12, 18);

    ctx.fillStyle = "#f9c89b";
    ctx.fillRect(x + 8, y + 4, 12, 12);

    ctx.fillStyle = "#e15454";
    ctx.fillRect(x + 7, y, 14, 6);

    ctx.fillStyle = "#0f1f2f";
    ctx.fillRect(x + 10, y + 8, 2, 2);
    ctx.fillRect(x + 16, y + 8, 2, 2);

    ctx.fillStyle = "#3a4f7a";
    ctx.fillRect(x + 8, y + 32, 5, 8 + stride);
    ctx.fillRect(x + 15, y + 32, 5, 8 - stride);

    if (!player.onGround) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + (player.facing > 0 ? 20 : 4), y + 18, 4, 2);
    }
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
    ctx.fillRect(12, 12, 240, 62);

    ctx.fillStyle = "#ffffff";
    ctx.font = "20px monospace";
    ctx.fillText(`Punkte: ${game.score}`, 24, 38);
    ctx.fillText(`Leben: ${game.lives}`, 24, 62);

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

  function render() {
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

  function startNewGame() {
    ensureAudio();
    startMusic();
    resetLevel(true);
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
    if ((game.state === "playing" || game.state === "paused") && player.onGround && game.state !== "paused") {
      player.vy = -player.jumpForce;
      player.onGround = false;
      sfxJump();
    }
  }

  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
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
    const dt = Math.min(0.033, rawDt);

    update(dt);
    render();
    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
})();
