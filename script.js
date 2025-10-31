/*
 * Fluffy Wingz – Beach Edition (3D Enhanced v2)
 * 
 * Improved version with:
 * - 3D rendering using Three.js
 * - Power-ups system (Shield, Speed Boost, Double Points)
 * - Anger Meter (Angry Birds feature)
 * - Particle effects
 * - Combo system
 * - Dynamic difficulty
 * - Achievements
 */

/////////////////////////
// THREE.JS SETUP      //
/////////////////////////
let scene, camera, renderer, bird, palmGroup, ringGroup, eggGroup, particleGroup;

function initThreeJS() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB);
  scene.fog = new THREE.Fog(0x87CEEB, 1000, 2000);

  // Camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
  camera.position.set(0, 0, 50);

  // Renderer
  const canvas = document.getElementById('canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowShadowMap;

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
  directionalLight.position.set(100, 100, 50);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.far = 500;
  scene.add(directionalLight);

  // Groups
  palmGroup = new THREE.Group();
  ringGroup = new THREE.Group();
  eggGroup = new THREE.Group();
  particleGroup = new THREE.Group();
  scene.add(palmGroup, ringGroup, eggGroup, particleGroup);

  // Background
  createBackground();

  // Handle window resize
  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function createBackground() {
  // Sky gradient (using a large sphere)
  const skyGeometry = new THREE.SphereGeometry(1000, 32, 32);
  const skyMaterial = new THREE.MeshBasicMaterial({
    color: 0x87CEEB,
    side: THREE.BackSide
  });
  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  scene.add(sky);

  // Ocean
  const oceanGeometry = new THREE.PlaneGeometry(2000, 500);
  const oceanMaterial = new THREE.MeshStandardMaterial({
    color: 0x1E90FF,
    roughness: 0.3,
    metalness: 0.1
  });
  const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
  ocean.position.set(0, -200, -100);
  ocean.receiveShadow = true;
  scene.add(ocean);

  // Sand
  const sandGeometry = new THREE.PlaneGeometry(2000, 300);
  const sandMaterial = new THREE.MeshStandardMaterial({
    color: 0xEFD49B,
    roughness: 0.8
  });
  const sand = new THREE.Mesh(sandGeometry, sandMaterial);
  sand.position.set(0, -350, -100);
  sand.receiveShadow = true;
  scene.add(sand);

  // Animated waves
  createWaves();
}

function createWaves() {
  const waveGeometry = new THREE.BufferGeometry();
  const waveCount = 50;
  const positions = [];
  const colors = [];

  for (let i = 0; i < waveCount; i++) {
    const x = (i - waveCount / 2) * 40;
    const y = Math.sin(i * 0.3) * 10 - 150;
    const z = -80;
    positions.push(x, y, z);
    colors.push(0.5, 0.8, 1.0);
  }

  waveGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  waveGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));

  const waveMaterial = new THREE.LineBasicMaterial({ vertexColors: true, linewidth: 2 });
  const waves = new THREE.LineSegments(waveGeometry, waveMaterial);
  scene.add(waves);
}

function create3DBird() {
  const group = new THREE.Group();

  // Body
  const bodyGeometry = new THREE.SphereGeometry(8, 32, 32);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xFFD700,
    roughness: 0.4,
    metalness: 0.2
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Head
  const headGeometry = new THREE.SphereGeometry(6, 32, 32);
  const head = new THREE.Mesh(headGeometry, bodyMaterial);
  head.position.set(0, 6, 8);
  head.castShadow = true;
  head.receiveShadow = true;
  group.add(head);

  // Eyes
  const eyeGeometry = new THREE.SphereGeometry(1.5, 16, 16);
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-2, 8, 13);
  leftEye.castShadow = true;
  group.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(2, 8, 13);
  rightEye.castShadow = true;
  group.add(rightEye);

  // Beak
  const beakGeometry = new THREE.ConeGeometry(2, 5, 8);
  const beakMaterial = new THREE.MeshStandardMaterial({ color: 0xFF6B6B });
  const beak = new THREE.Mesh(beakGeometry, beakMaterial);
  beak.position.set(0, 5, 13);
  beak.rotation.z = Math.PI / 2;
  beak.castShadow = true;
  group.add(beak);

  // Wings (left and right)
  const wingGeometry = new THREE.BoxGeometry(3, 12, 2);
  const wingMaterial = new THREE.MeshStandardMaterial({
    color: 0xFF1493,
    roughness: 0.5
  });

  const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
  leftWing.position.set(-8, 0, 0);
  leftWing.castShadow = true;
  group.add(leftWing);

  const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
  rightWing.position.set(8, 0, 0);
  rightWing.castShadow = true;
  group.add(rightWing);

  // Tail
  const tailGeometry = new THREE.ConeGeometry(4, 8, 8);
  const tailMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700 });
  const tail = new THREE.Mesh(tailGeometry, tailMaterial);
  tail.position.set(0, -5, -10);
  tail.rotation.z = Math.PI / 2;
  tail.castShadow = true;
  group.add(tail);

  group.position.set(-30, 0, 0);
  group.userData = {
    velocity: 0,
    rotation: 0,
    wingFlap: 0,
    leftWing: leftWing,
    rightWing: rightWing
  };

  scene.add(group);
  return group;
}

function createPalm(x) {
  const group = new THREE.Group();

  // Trunk
  const trunkGeometry = new THREE.CylinderGeometry(3, 4, 30, 8);
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x8B4513,
    roughness: 0.7
  });
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  // Fronds (leaves)
  for (let i = 0; i < 5; i++) {
    const frondGeometry = new THREE.ConeGeometry(8, 20, 8);
    const frondMaterial = new THREE.MeshStandardMaterial({
      color: 0x2EA84A,
      roughness: 0.6
    });
    const frond = new THREE.Mesh(frondGeometry, frondMaterial);
    frond.position.set(0, 20, 0);
    frond.rotation.z = (i / 5) * Math.PI * 2;
    frond.castShadow = true;
    group.add(frond);
  }

  group.position.set(x, 0, 0);
  group.userData = { passed: false };
  palmGroup.add(group);
  return group;
}

function createRing(x, y) {
  const geometry = new THREE.TorusGeometry(6, 2, 16, 100);
  const material = new THREE.MeshStandardMaterial({
    color: 0xFFD700,
    emissive: 0xFFAA00,
    emissiveIntensity: 0.5,
    roughness: 0.3,
    metalness: 0.8
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.position.set(x, y, 0);
  ring.castShadow = true;
  ring.userData = { collected: false };
  ringGroup.add(ring);
  return ring;
}

function createEgg(x, y, isGolden = false) {
  const geometry = new THREE.SphereGeometry(4, 32, 32);
  const material = new THREE.MeshStandardMaterial({
    color: isGolden ? 0xFFD700 : 0xFFF4C6,
    emissive: isGolden ? 0xFFAA00 : 0x000000,
    emissiveIntensity: isGolden ? 0.6 : 0,
    roughness: 0.4,
    metalness: isGolden ? 0.8 : 0.2
  });
  const egg = new THREE.Mesh(geometry, material);
  egg.scale.set(1, 1.3, 1);
  egg.position.set(x, y, 0);
  egg.castShadow = true;
  egg.userData = { collected: false, isGolden };
  eggGroup.add(egg);
  return egg;
}

/////////////////////////
// PARTICLE EFFECTS    //
/////////////////////////
function createParticles(x, y, color, count = 20) {
  for (let i = 0; i < count; i++) {
    const geometry = new THREE.SphereGeometry(1, 8, 8);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.8
    });
    const particle = new THREE.Mesh(geometry, material);
    particle.position.set(x, y, 0);
    particle.userData = {
      velocity: {
        x: (Math.random() - 0.5) * 4,
        y: (Math.random() - 0.5) * 4,
        z: (Math.random() - 0.5) * 4
      },
      life: 60
    };
    particleGroup.add(particle);
  }
}

function updateParticles() {
  const toRemove = [];
  particleGroup.children.forEach((particle, idx) => {
    particle.position.x += particle.userData.velocity.x;
    particle.position.y += particle.userData.velocity.y;
    particle.position.z += particle.userData.velocity.z;
    particle.userData.velocity.y -= 0.1; // Gravity
    particle.userData.life--;
    particle.material.opacity = particle.userData.life / 60;

    if (particle.userData.life <= 0) {
      toRemove.push(idx);
    }
  });

  toRemove.reverse().forEach(idx => {
    particleGroup.remove(particleGroup.children[idx]);
  });
}

/////////////////////////
// GAME STATE          //
/////////////////////////
let gameState = {
  score: 0,
  best: +localStorage.getItem('fw_best_beach_v4') || 0,
  stage: 0,
  frame: 0,
  speed: 3.1,
  gravity: 0.48,
  combo: 0,
  comboTimer: 0,
  angerLevel: 0,
  maxAnger: 100,
  isGameRunning: false,
  difficulty: 1.0
};

let powerUps = {
  shield: { active: false, duration: 0, maxDuration: 300 },
  speedBoost: { active: false, duration: 0, maxDuration: 200 },
  doublePoints: { active: false, duration: 0, maxDuration: 250 }
};

let obstacles = {
  palms: [],
  rings: [],
  eggs: []
};

let input = {
  holding: false,
  muted: false
};

/////////////////////////
// UI UPDATES          //
/////////////////////////
function updateHUD() {
  document.getElementById('score').textContent = `Score: ${gameState.score}`;
  document.getElementById('best').textContent = `Best: ${gameState.best}`;
  document.getElementById('combo').textContent = `Combo: ${gameState.combo}x`;

  const angerPercent = (gameState.angerLevel / gameState.maxAnger) * 100;
  document.getElementById('angerBar').style.width = angerPercent + '%';

  // Update power-up UI
  updatePowerUpUI();
}

function updatePowerUpUI() {
  const shieldBtn = document.getElementById('shieldPU');
  const speedBtn = document.getElementById('speedPU');
  const doubleBtn = document.getElementById('doublePU');

  shieldBtn.classList.toggle('active', powerUps.shield.active);
  speedBtn.classList.toggle('active', powerUps.speedBoost.active);
  doubleBtn.classList.toggle('active', powerUps.doublePoints.active);
}

function showAchievement(title, description) {
  const achievement = document.createElement('div');
  achievement.className = 'achievement';
  achievement.innerHTML = `<strong>${title}</strong><br>${description}`;
  document.body.appendChild(achievement);
  setTimeout(() => achievement.remove(), 3000);
}

/////////////////////////
// POWER-UPS           //
/////////////////////////
function activatePowerUp(type) {
  if (type === 'shield' && !powerUps.shield.active) {
    powerUps.shield.active = true;
    powerUps.shield.duration = powerUps.shield.maxDuration;
    showAchievement('🛡️ Shield Activated', 'Protected from next collision!');
    createParticles(bird.position.x, bird.position.y, 0x00FF00, 30);
  } else if (type === 'speedBoost' && !powerUps.speedBoost.active) {
    powerUps.speedBoost.active = true;
    powerUps.speedBoost.duration = powerUps.speedBoost.maxDuration;
    showAchievement('⚡ Speed Boost', 'Moving faster!');
    createParticles(bird.position.x, bird.position.y, 0xFFFF00, 30);
  } else if (type === 'doublePoints' && !powerUps.doublePoints.active) {
    powerUps.doublePoints.active = true;
    powerUps.doublePoints.duration = powerUps.doublePoints.maxDuration;
    showAchievement('2️⃣ Double Points', 'All points doubled!');
    createParticles(bird.position.x, bird.position.y, 0xFF00FF, 30);
  }
}

function updatePowerUps() {
  if (powerUps.shield.active) {
    powerUps.shield.duration--;
    if (powerUps.shield.duration <= 0) powerUps.shield.active = false;
  }
  if (powerUps.speedBoost.active) {
    powerUps.speedBoost.duration--;
    if (powerUps.speedBoost.duration <= 0) powerUps.speedBoost.active = false;
  }
  if (powerUps.doublePoints.active) {
    powerUps.doublePoints.duration--;
    if (powerUps.doublePoints.duration <= 0) powerUps.doublePoints.active = false;
  }
}

/////////////////////////
// ANGER METER         //
/////////////////////////
function increaseAnger(amount = 5) {
  gameState.angerLevel = Math.min(gameState.angerLevel + amount, gameState.maxAnger);
  if (gameState.angerLevel >= gameState.maxAnger) {
    activatePowerUp('speedBoost');
    gameState.angerLevel = 0;
  }
}

/////////////////////////
// COMBO SYSTEM        //
/////////////////////////
function increaseCombo() {
  gameState.combo++;
  gameState.comboTimer = 120;
  if (gameState.combo % 5 === 0) {
    showAchievement('🔥 Combo x' + gameState.combo, 'Keep it up!');
  }
}

function updateCombo() {
  if (gameState.comboTimer > 0) {
    gameState.comboTimer--;
  } else if (gameState.combo > 0) {
    gameState.combo = 0;
  }
}

/////////////////////////
// SPAWNING            //
/////////////////////////
function spawnPalmCluster() {
  const gap = 160;
  const minY = -100;
  const maxY = 100;
  const centerY = Math.random() * (maxY - minY) + minY;
  const x = 150;

  const palm1 = createPalm(x);
  palm1.position.y = centerY - gap / 2;
  palm1.userData.gapTop = centerY - gap / 2;
  palm1.userData.gapBottom = centerY + gap / 2;

  const palm2 = createPalm(x);
  palm2.position.y = centerY + gap / 2;

  obstacles.palms.push(palm1, palm2);
}

function spawnRing() {
  const y = Math.random() * 200 - 100;
  const ring = createRing(150, y);
  obstacles.rings.push(ring);
}

function spawnEgg() {
  const y = Math.random() * 200 - 100;
  const isGolden = Math.random() < 0.3;
  const egg = createEgg(150, y, isGolden);
  obstacles.eggs.push(egg);
}

/////////////////////////
// COLLISION           //
/////////////////////////
function checkCollisions() {
  const birdPos = bird.position;
  const birdRadius = 10;

  // Check palm collisions
  for (const palm of obstacles.palms) {
    const palmPos = palm.position;
    const dist = Math.hypot(birdPos.x - palmPos.x, birdPos.y - palmPos.y);
    if (dist < birdRadius + 15) {
      if (powerUps.shield.active) {
        powerUps.shield.active = false;
        createParticles(palmPos.x, palmPos.y, 0xFF0000, 40);
        showAchievement('🛡️ Shield Broken', 'But you survived!');
      } else {
        createParticles(palmPos.x, palmPos.y, 0xFF0000, 50);
        gameOver();
      }
    }
  }

  // Check ring collisions
  for (const ring of obstacles.rings) {
    if (!ring.userData.collected) {
      const dist = Math.hypot(birdPos.x - ring.position.x, birdPos.y - ring.position.y);
      if (dist < birdRadius + 6) {
        ring.userData.collected = true;
        let points = 5;
        if (powerUps.doublePoints.active) points *= 2;
        gameState.score += points;
        increaseCombo();
        increaseAnger(10);
        createParticles(ring.position.x, ring.position.y, 0xFFD700, 25);
        ringGroup.remove(ring);
      }
    }
  }

  // Check egg collisions
  for (const egg of obstacles.eggs) {
    if (!egg.userData.collected) {
      const dist = Math.hypot(birdPos.x - egg.position.x, birdPos.y - egg.position.y);
      if (dist < birdRadius + 6) {
        egg.userData.collected = true;
        let points = egg.userData.isGolden ? 10 : 5;
        if (powerUps.doublePoints.active) points *= 2;
        gameState.score += points;
        increaseCombo();
        increaseAnger(15);
        createParticles(egg.position.x, egg.position.y, egg.userData.isGolden ? 0xFFD700 : 0xFFF4C6, 25);
        eggGroup.remove(egg);
      }
    }
  }
}

/////////////////////////
// GAME LOOP           //
/////////////////////////
function updatePhysics() {
  bird.userData.velocity += gameState.gravity;
  if (input.holding) {
    bird.userData.velocity = Math.min(bird.userData.velocity, -1.2);
  }
  bird.position.y += bird.userData.velocity;

  // Rotation based on velocity
  bird.userData.rotation = bird.userData.rotation * 0.92 + Math.min(Math.max(bird.userData.velocity * 0.02, -0.4), 0.6) * 0.35;
  bird.rotation.z = bird.userData.rotation;

  // Wing flap animation
  if (input.holding) {
    bird.userData.wingFlap = Math.min(bird.userData.wingFlap + 0.1, 1);
  } else {
    bird.userData.wingFlap = Math.max(bird.userData.wingFlap - 0.05, 0);
  }

  // Animate wings
  if (bird.userData.leftWing && bird.userData.rightWing) {
    bird.userData.leftWing.rotation.z = Math.sin(gameState.frame * 0.1) * bird.userData.wingFlap * 0.5;
    bird.userData.rightWing.rotation.z = -Math.sin(gameState.frame * 0.1) * bird.userData.wingFlap * 0.5;
  }

  // Boundary checks
  if (bird.position.y < -150) bird.position.y = -150;
  if (bird.position.y > 150) bird.position.y = 150;
}

function updateWorld() {
  // Move obstacles
  for (const palm of obstacles.palms) {
    palm.position.x -= gameState.speed;
  }
  for (const ring of obstacles.rings) {
    ring.position.x -= gameState.speed * 1.05;
    ring.rotation.x += 0.05;
    ring.rotation.y += 0.05;
  }
  for (const egg of obstacles.eggs) {
    egg.position.x -= gameState.speed;
    egg.rotation.y += 0.03;
  }

  // Remove off-screen obstacles
  obstacles.palms = obstacles.palms.filter(p => {
    if (p.position.x < -100) {
      palmGroup.remove(p);
      return false;
    }
    return true;
  });

  obstacles.rings = obstacles.rings.filter(r => {
    if (r.position.x < -100) {
      ringGroup.remove(r);
      return false;
    }
    return true;
  });

  obstacles.eggs = obstacles.eggs.filter(e => {
    if (e.position.x < -100) {
      eggGroup.remove(e);
      return false;
    }
    return true;
  });

  // Spawn new obstacles
  if (gameState.frame % 95 === 0) spawnPalmCluster();
  if (gameState.frame % 140 === 0) spawnRing();
  if (gameState.frame % 60 === 0) spawnEgg();

  // Increase difficulty
  gameState.speed += 0.0001;
  gameState.difficulty = 1.0 + (gameState.score / 1000) * 0.1;
}

function animate() {
  requestAnimationFrame(animate);

  if (!gameState.isGameRunning) {
    renderer.render(scene, camera);
    return;
  }

  gameState.frame++;

  updatePhysics();
  updateWorld();
  updatePowerUps();
  updateCombo();
  updateParticles();
  checkCollisions();
  updateHUD();

  // Render
  renderer.render(scene, camera);
}

/////////////////////////
// GAME CONTROL        //
/////////////////////////
function startGame() {
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('gameOver').classList.add('hidden');
  document.getElementById('hud').style.display = 'block';

  gameState = {
    score: 0,
    best: gameState.best,
    stage: 0,
    frame: 0,
    speed: 3.1,
    gravity: 0.48,
    combo: 0,
    comboTimer: 0,
    angerLevel: 0,
    maxAnger: 100,
    isGameRunning: true,
    difficulty: 1.0
  };

  powerUps = {
    shield: { active: false, duration: 0, maxDuration: 300 },
    speedBoost: { active: false, duration: 0, maxDuration: 200 },
    doublePoints: { active: false, duration: 0, maxDuration: 250 }
  };

  obstacles = { palms: [], rings: [], eggs: [] };

  // Clear scene
  palmGroup.clear();
  ringGroup.clear();
  eggGroup.clear();
  particleGroup.clear();

  bird = create3DBird();
  animate();
}

function gameOver() {
  gameState.isGameRunning = false;

  if (gameState.score > gameState.best) {
    gameState.best = gameState.score;
    localStorage.setItem('fw_best_beach_v4', gameState.best);
  }

  document.getElementById('finalScore').textContent = `Final Score: ${gameState.score}`;
  document.getElementById('finalStats').textContent = `Best: ${gameState.best} | Combo: ${gameState.combo}x`;
  document.getElementById('gameOver').classList.remove('hidden');
}

/////////////////////////
// INPUT              //
/////////////////////////
document.addEventListener('pointerdown', () => {
  input.holding = true;
});

document.addEventListener('pointerup', () => {
  input.holding = false;
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') input.holding = true;
  if (e.code === 'KeyS') activatePowerUp('shield');
  if (e.code === 'KeyD') activatePowerUp('speedBoost');
  if (e.code === 'KeyX') activatePowerUp('doublePoints');
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'Space') input.holding = false;
});

// Power-up buttons
document.getElementById('shieldPU').addEventListener('click', () => activatePowerUp('shield'));
document.getElementById('speedPU').addEventListener('click', () => activatePowerUp('speedBoost'));
document.getElementById('doublePU').addEventListener('click', () => activatePowerUp('doublePoints'));

// Mute button
document.getElementById('muteBtn').addEventListener('click', () => {
  input.muted = !input.muted;
  document.getElementById('muteBtn').textContent = input.muted ? '🔇' : '🔊';
});

// Menu buttons
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('againBtn').addEventListener('click', startGame);

/////////////////////////
// INITIALIZATION      //
/////////////////////////
try {
  initThreeJS();
  bird = create3DBird();
  animate();
  document.getElementById('best').textContent = `Best: ${gameState.best}`;
} catch (error) {
  console.error('Game initialization error:', error);
  alert('Error initializing game. Please refresh the page.');
}

