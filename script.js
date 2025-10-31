/*
 * Fluffy Wingz – Beach Edition
 *
 * This script powers a simple endless flyer game.  Tap or click to make your bird flap.
 * Collect rings and eggs to increase your score and evolve through five stages.
 * Each new stage grants an extra hit; colliding with a palm downgrades you by one stage
 * instead of ending the game immediately. Golden eggs appear at dusk and night and
 * reward extra points.
 */

/////////////////////////
// Canvas & Utilities  //
/////////////////////////
const c = document.getElementById('c');
const x = c.getContext('2d');
function rs(){
  c.width  = window.innerWidth;
  c.height = window.innerHeight;
}
window.addEventListener('resize', rs);
rs();

// UI references
const menu  = document.getElementById('menu');
const over  = document.getElementById('over');
const hud   = document.getElementById('hud');
const sEl   = document.getElementById('s');
const bEl   = document.getElementById('b');
const final = document.getElementById('final');
const startBtn = document.getElementById('startBtn');
const againBtn = document.getElementById('againBtn');
const muteBtn  = document.getElementById('muteBtn');

// Mute handling
let muted = false;
muteBtn.addEventListener('click', () => {
  muted = !muted;
  muteBtn.textContent = muted ? '🔇' : '🔊';
  if (muted) stopMusic(); else tryPlayMusic();
});

/////////////////////////
// Assets (Sprites)    //
/////////////////////////
// Score thresholds and associated images for each evolution stage.  Higher stages
// grant extra hits (lives).  Stage index corresponds to the number of lives.
const STAGES = [
  { m: 0,  img: 'bird_stage1.png' }, // 0 pts: no wings
  { m: 10, img: 'bird_stage2.png' }, // 10 pts: white wings
  { m: 20, img: 'bird_stage3.png' }, // 20 pts: white wings + tail
  { m: 30, img: 'bird_stage4.png' }, // 30 pts: rainbow wings
  { m: 40, img: 'bird_stage5.png' }  // 40 pts: golden bird
];
const imgs = STAGES.map(s => { const i = new Image(); i.src = s.img; return i; });

/////////////////////////
// Audio (optional)    //
/////////////////////////
let music, sfxRing, sfxEgg;
try {
  music = new Audio('music_harp1.mp3');
  music.loop = true;
} catch {}
try { sfxRing = new Audio('sfx_ring.mp3'); } catch {}
try { sfxEgg  = new Audio('sfx_egg.mp3');  } catch {}
function tryPlayMusic(){
  if (muted || !music) return;
  music.volume = 0.4;
  music.play().catch(() => {});
}
function stopMusic(){ try { music && music.pause(); } catch {} }

/////////////////////////
// Game State          //
/////////////////////////
let best = +localStorage.getItem('fw_best_beach_v3') || 0;
if (bEl) bEl.textContent = best;

let score, stage, frame, speed, gravity, holding;
let bird, palms, rings, eggs;
let flash = 0;

// Time-of-day system for dynamic backgrounds and golden eggs.  The day cycles
// through morning, day, evening and night; each phase lasts three minutes.
const TOD = { MORNING:0, DAY:1, EVENING:2, NIGHT:3 };
let tod = TOD.DAY;
let todT = 0;
const TOD_DUR = 180000; // 3 minutes per phase

/////////////////////////
// Input Controls      //
/////////////////////////
function flap(){ bird.vy = -8; }
c.addEventListener('pointerdown',   () => { holding = true; flap(); });
c.addEventListener('pointerup',     () => { holding = false; });
document.addEventListener('keydown', e => {
  if (e.code === 'Space') flap();
});
startBtn.addEventListener('click', start);
againBtn.addEventListener('click', start);

/////////////////////////
// Lifecycle           //
/////////////////////////
function start(){
  menu.classList.add('hidden');
  over.classList.add('hidden');
  hud.classList.remove('hidden');
  reset();
  tryPlayMusic();
  loop();
}

function reset(){
  score = 0;
  stage = 0;
  frame = 0;
  speed = 3.1;
  gravity = 0.48;
  flash = 0;
  holding = false;
  bird = { x: Math.max(120, c.width * 0.22), y: c.height * 0.45, vy: 0, size: 48, rot: 0 };
  palms = [];
  rings = [];
  eggs  = [];
  todT = 0;
  tod  = TOD.DAY;
  sEl.textContent = '0';
}

function gameOver(){
  hud.classList.add('hidden');
  over.classList.remove('hidden');
  final.textContent = 'Score: ' + score;
  if (score > best){
    best = score;
    localStorage.setItem('fw_best_beach_v3', best);
    bEl.textContent = best;
  }
}

/////////////////////////
// Spawning & World    //
/////////////////////////
// Spawn two palm obstacles (top and bottom) with a gap between them.
function spawnPalmCluster(){
  const gap = 160;
  const minY = 140;
  const maxY = c.height * 0.65 - gap - 80;
  const top = Math.random() * (maxY - minY) + minY;
  const w = 42;
  // top palm
  palms.push({ x: c.width, top: 0, h: top, w });
  // bottom palm
  palms.push({ x: c.width, top: top + gap, h: (c.height * 0.65) - (top + gap), w });
}

// Spawn a ring collectible.
function spawnRing(){
  const y = 160 + Math.random() * (c.height * 0.65 - 240);
  rings.push({ x: c.width + 60, y, r: 28, passed: false });
}

// Spawn an egg collectible near the last gap if possible.  Golden eggs
// appear at evening and night and are worth 10 points instead of 5.
function spawnEggReachable(){
  const latest = palms.slice(-2);
  let minY = 120;
  let maxY = c.height * 0.65 - 120;
  let y;
  if (latest.length === 2){
    const top  = latest[0].h;
    const bottom = latest[1].top;
    const center = top + (bottom - top) / 2;
    minY = Math.max(100, top + 24);
    maxY = Math.min(c.height * 0.65 - 80, bottom - 24);
    y = Math.max(minY, Math.min(maxY, center + (Math.random() * 40 - 20)));
  } else {
    y = Math.random() * (maxY - minY) + minY;
  }
  const gold = (tod === TOD.EVENING || tod === TOD.NIGHT);
  eggs.push({ x: c.width + 30, y, r: 14, gold, taken: false });
}

// Move world objects and cull those off-screen.
function moveCull(arr, vel){
  for (const a of arr){ a.x -= vel; }
  return arr.filter(a => a.x > -80);
}

/////////////////////////
// Drawing Helpers     //
/////////////////////////
// Draws the evolving background: sky, sea, waves, sand, and small boats.
function drawBackground(dt){
  // Advance time-of-day timer
  todT += dt;
  if (todT > TOD_DUR){ todT = 0; tod = (tod + 1) % 4; }
  // Determine sky gradient based on time of day
  let skyGrad = x.createLinearGradient(0, 0, 0, c.height);
  if (tod === TOD.MORNING){ skyGrad.addColorStop(0, '#FFE9C9'); skyGrad.addColorStop(1, '#9ED4FF'); }
  if (tod === TOD.DAY){     skyGrad.addColorStop(0, '#BFE4FF'); skyGrad.addColorStop(1, '#6EC1FF'); }
  if (tod === TOD.EVENING){ skyGrad.addColorStop(0, '#FFB07A'); skyGrad.addColorStop(1, '#6A77FF'); }
  if (tod === TOD.NIGHT){   skyGrad.addColorStop(0, '#04122A'); skyGrad.addColorStop(1, '#0B2B50'); }
  x.fillStyle = skyGrad;
  x.fillRect(0, 0, c.width, c.height);
  // Sea
  const seaY = c.height * 0.65;
  let seaGrad = x.createLinearGradient(0, seaY, 0, c.height);
  if (tod === TOD.NIGHT){ seaGrad.addColorStop(0, '#0A2F4A'); seaGrad.addColorStop(1, '#061E30'); }
  else { seaGrad.addColorStop(0, '#3DA3D9'); seaGrad.addColorStop(1, '#0E6FA5'); }
  x.fillStyle = seaGrad;
  x.fillRect(0, seaY, c.width, c.height - seaY);
  // Waves
  x.globalAlpha = 0.25;
  x.strokeStyle = 'white';
  x.lineWidth = 1.3;
  for (let i = 0; i < 3; i++){
    x.beginPath();
    const y = seaY + 14 + i * 12;
    for (let px = 0; px < c.width; px += 6){
      x.lineTo(px, y + Math.sin((px + performance.now() / 12) / 30 + i) * 2);
    }
    x.stroke();
  }
  x.globalAlpha = 1;
  // Sand
  const sandY = c.height * 0.80;
  let sandGrad = x.createLinearGradient(0, sandY, 0, c.height);
  sandGrad.addColorStop(0, '#EFD49B');
  sandGrad.addColorStop(1, '#D9B774');
  x.fillStyle = sandGrad;
  x.fillRect(0, sandY, c.width, c.height - sandY);
  // Simple boat silhouettes
  drawBoats(seaY);
}

// Pre-create a few boats with random positions and drift directions.
const BOATS = [];
function drawBoats(seaY){
  if (BOATS.length === 0){
    for (let i = 0; i < 3; i++){
      BOATS.push({ x: Math.random() * c.width, y: seaY + 18 + Math.random() * 30, s: 1 + Math.random() * 0.6, dir: Math.random() < 0.5 ? -1 : 1 });
    }
  }
  x.fillStyle = 'rgba(255,255,255,0.9)';
  BOATS.forEach(b => {
    b.x += b.dir * 0.08;
    if (b.x < -40) b.x = c.width + 40;
    if (b.x > c.width + 40) b.x = -40;
    const bob = Math.sin((performance.now() / 350) + (b.x * 0.05)) * 2;
    x.save();
    x.translate(b.x, b.y + bob);
    x.scale(b.s, b.s);
    // hull
    x.beginPath();
    x.moveTo(-12, 0);
    x.lineTo(12, 0);
    x.lineTo(6, 6);
    x.lineTo(-6, 6);
    x.closePath();
    x.fill();
    // mast
    x.fillRect(0, -10, 2, 10);
    x.restore();
  });
}

// Draw a palm (obstacle).  Each palm is represented by a brown trunk and green fronds.
function drawPalm(p){
  x.fillStyle = '#6F4E37';
  x.fillRect(p.x, p.top, p.w, p.h);
  x.fillStyle = '#2EA84A';
  for (let i = 0; i < 3; i++){
    const y = (p.top === 0) ? (p.h - 18 + i * 6) : (p.top + i * 6);
    x.beginPath();
    x.ellipse(p.x + p.w / 2, y, 24, 10, 0, 0, Math.PI * 2);
    x.fill();
  }
}

// Draw a ring collectible.  Rings pulse with a radial gradient and light outline.
function drawRing(r){
  const grad = x.createRadialGradient(r.x, r.y, 4, r.x, r.y, r.r);
  grad.addColorStop(0, 'rgba(255,240,180,0.9)');
  grad.addColorStop(1, 'rgba(255,160,0,0.2)');
  x.fillStyle = grad;
  x.beginPath();
  x.arc(r.x, r.y, r.r, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = 'rgba(255,190,60,0.85)';
  x.lineWidth = 3;
  x.beginPath();
  x.arc(r.x, r.y, r.r, 0, Math.PI * 2);
  x.stroke();
}

// Draw an egg collectible.  Golden eggs glow brightly.
function drawEgg(e){
  x.save();
  x.shadowColor = e.gold ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.35)';
  x.shadowBlur = e.gold ? 18 : 10;
  x.fillStyle = e.gold ? '#FFD700' : '#FFF4C6';
  x.beginPath();
  x.ellipse(e.x, e.y, e.r, e.r * 1.25, 0, 0, Math.PI * 2);
  x.fill();
  x.restore();
}

// Draw the bird sprite according to the current stage.  Applies rotation
// and a brief flash effect whenever the stage upgrades or downgrades.
function drawBird(){
  const img = imgs[stage];
  if (!img || !img.complete) return;
  const h = img.height;
  const w = img.width;
  // Scale sprite so its height matches bird.size * 2, preserving aspect ratio
  const scale = (bird.size * 2) / h;
  const dw = w * scale;
  const dh = h * scale;
  const cx = bird.x + bird.size * 0.5;
  const cy = bird.y + bird.size * 0.5;
  x.save();
  x.translate(cx, cy);
  x.rotate(bird.rot);
  if (flash > 0){
    x.filter = `brightness(${1 + flash * 0.8})`;
    flash *= 0.9;
  }
  x.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  x.filter = 'none';
  x.restore();
}

/////////////////////////
// Collision & Stage   //
/////////////////////////
function hitPalm(p){
  const bx = bird.x;
  const by = bird.y;
  const bw = bird.size;
  const bh = bird.size;
  return (bx + bw > p.x && bx < p.x + p.w && by + bh > p.top && by < p.top + p.h);
}

function hitCircle(o){
  const cx = bird.x + bird.size * 0.5;
  const cy = bird.y + bird.size * 0.5;
  const dist = Math.hypot(cx - o.x, cy - o.y);
  return dist < (o.r + bird.size * 0.45);
}

function eggValue(e){ return e.gold ? 10 : 5; }

function updateStageByScore(){
  let s = 0;
  for (let i = 0; i < STAGES.length; i++){
    if (score >= STAGES[i].m) s = i;
  }
  if (s > stage){ flash = 1.0; }
  stage = s;
}

function onHit(){
  // If the bird has evolved (stage > 0), downgrade instead of game over
  if (stage > 0){
    stage--;
    flash = 0.6;
    // Bounce slightly upward when downgraded
    bird.vy = -5;
    return;
  }
  gameOver();
}

/////////////////////////
// Main Loop           //
/////////////////////////
let lastTS = 0;
function loop(ts = 0){
  const dt = Math.min(32, ts - lastTS || 16);
  lastTS = ts;
  frame++;
  // Physics update
  bird.vy += gravity;
  if (holding) bird.vy = Math.min(bird.vy, -1.2);
  bird.y += bird.vy;
  // Rotation easing based on velocity
  bird.rot = bird.rot * 0.92 + Math.min(Math.max(bird.vy * 0.02, -0.4), 0.6) * 0.35;
  // Prevent going above top or below bottom
  if (bird.y < 0){ bird.y = 0; bird.vy = 0; }
  if (bird.y > c.height * 0.95){ bird.y = c.height * 0.95; bird.vy = 0; }
  // Spawning of obstacles and collectibles
  if (frame % 95 === 0) spawnPalmCluster();
  if (frame % 140 === 0) spawnRing();
  if (frame % 60 === 0) spawnEggReachable();
  // Move world objects
  palms = moveCull(palms, speed);
  rings = moveCull(rings, speed * 1.05);
  eggs  = moveCull(eggs, speed);
  // Collisions
  for (const p of palms){
    if (hitPalm(p)){ onHit(); break; }
  }
  for (const r of rings){
    if (!r.passed && hitCircle(r)){
      r.passed = true;
      score += 5;
      if (!muted && sfxRing) sfxRing.play().catch(() => {});
    }
  }
  for (const e of eggs){
    if (!e.taken && hitCircle(e)){
      e.taken = true;
      score += eggValue(e);
      if (!muted && sfxEgg) sfxEgg.play().catch(() => {});
    }
  }
  updateStageByScore();
  // Drawing
  drawBackground(dt);
  palms.forEach(drawPalm);
  rings.forEach(drawRing);
  eggs.forEach(drawEgg);
  drawBird();
  // Update HUD
  sEl.textContent = score;
  if (!over.classList.contains('hidden')) return; // Stop loop on game over
  requestAnimationFrame(loop);
}

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(err => {
      console.warn('ServiceWorker registration failed', err);
    });
  });
}