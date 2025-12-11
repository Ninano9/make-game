// Render 등 별도 도메인에서 백엔드를 호출할 때 절대 경로 사용
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:4000'
  : 'https://backend-lj9h.onrender.com';

const BOARD_ROWS = 4;
const BOARD_COLS = 7;
const BENCH_MAX = 8;
const SHOP_SIZE = 5;
const REROLL_COST = 2;

let units = [];
let synergies = [];
let aiComps = [];

let bench = [];
let board = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
let selectedBench = -1;
let roundIndex = 0; // 0-based (10라운드)
let hearts = 3;
let gold = 10;
let shop = [];
let shopLocked = false;
let isFighting = false;
let logEntries = [];
let fxEvents = [];

const unitListEl = document.getElementById('unit-list');
const benchEl = document.getElementById('bench');
const synergySummaryEl = document.getElementById('synergy-summary');
const configStatusEl = document.getElementById('config-status');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const playerBoardEl = document.getElementById('player-board');
const enemyBoardEl = document.getElementById('enemy-board');
const benchCountEl = document.getElementById('bench-count');
const logEl = document.getElementById('log');
const hudRoundEl = document.getElementById('hud-round');
const hudHeartEl = document.getElementById('hud-heart');
const goldTagEl = document.getElementById('gold-tag');
const shopEl = document.getElementById('shop');
const rerollBtn = document.getElementById('reroll-btn');
const lockBtn = document.getElementById('lock-btn');
const fxCanvas = document.getElementById('fx-canvas');
const ctx = fxCanvas?.getContext('2d') || null;

function getSynergyName(id) {
  const syn = synergies.find((s) => s.id === id);
  return syn ? syn.name : id;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

async function fetchConfig() {
  try {
    configStatusEl.textContent = '로딩 중...';
    const res = await fetch(`${API_BASE}/api/config`);
    const data = await res.json();
    units = data.units || [];
    synergies = data.synergies || [];
    aiComps = data.aiComps || [];
    renderUnits();
    renderBench();
    renderBoards();
    renderSynergySummary();
    renderHud();
    configStatusEl.textContent = `유닛 ${units.length} · 시너지 ${synergies.length} · AI ${aiComps.length}`;
  } catch (e) {
    console.error(e);
    configStatusEl.textContent = '로딩 실패';
  }
}

function renderUnits() {
  unitListEl.innerHTML = '';
  units.forEach((u) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h3>${u.name}</h3>
        <span class="cost">${u.cost}코스트</span>
      </div>
      <div class="traits">${u.traits.map((t) => `<span class="pill">${getSynergyName(t)}</span>`).join('')}</div>
      <div class="muted">HP ${u.stats.hp} · ATK ${u.stats.attack} · ASPD ${u.stats.attackSpeed}</div>
      <button class="btn" data-id="${u.id}">벤치 추가</button>
    `;
    card.querySelector('button').addEventListener('click', () => addToBench(u.id));
    unitListEl.appendChild(card);
  });
}

function addToBench(id) {
  if (bench.length >= BENCH_MAX) {
    alert('벤치가 가득 찼어요.');
    return;
  }
  bench.push({ uid: uid(), id, star: 1 });
  renderBench();
}

function renderBench() {
  benchCountEl.textContent = `${bench.length} / ${BENCH_MAX}`;
  benchEl.innerHTML = '';
  bench.forEach((u, i) => {
    const base = units.find((x) => x.id === u.id);
    if (!base) return;
    const div = document.createElement('div');
    div.className = `bench-card ${selectedBench === i ? 'active' : ''}`;
    div.innerHTML = `
      <div style="flex:1">
        <div><strong>${base.name}</strong> <span class="muted">${base.traits.map(getSynergyName).join(', ')}</span></div>
        <div class="muted mini">${'★'.repeat(u.star)} · 코스트 ${base.cost}</div>
      </div>
      <div style="display:flex;gap:4px;">
        <button class="btn" aria-label="star down">-</button>
        <button class="btn" aria-label="star up">+</button>
      </div>
    `;
    const [down, up] = div.querySelectorAll('button');
    down.addEventListener('click', (ev) => { ev.stopPropagation(); changeBenchStar(i, -1); });
    up.addEventListener('click', (ev) => { ev.stopPropagation(); changeBenchStar(i, 1); });
    div.addEventListener('click', () => {
      selectedBench = selectedBench === i ? -1 : i;
      renderBench();
    });
    benchEl.appendChild(div);
  });
}

function changeBenchStar(idx, delta) {
  bench[idx].star = Math.min(3, Math.max(1, bench[idx].star + delta));
  renderBench();
}

function renderBoards() {
  renderBoard(playerBoardEl, board, true);
  const enemyUnits = (aiComps[roundIndex]?.units || []).map((u) => ({ ...u }));
  const enemyBoard = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
  enemyUnits.forEach((u) => {
    if (enemyBoard[u.y] && enemyBoard[u.y][u.x] === null) {
      enemyBoard[u.y][u.x] = u;
    }
  });
  renderBoard(enemyBoardEl, enemyBoard, false);
}

function renderBoard(container, data, isPlayer) {
  container.innerHTML = '';
  for (let y = 0; y < BOARD_ROWS; y++) {
    for (let x = 0; x < BOARD_COLS; x++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      const u = data[y][x];
      if (u) {
        const base = units.find((b) => b.id === u.id);
        const unitDiv = document.createElement('div');
        unitDiv.className = 'unit';
        unitDiv.innerHTML = `
          <div class="name">${base?.name || u.id} <span class="star">★${u.star || 1}</span></div>
          <div class="mini">${(base?.traits || []).map(getSynergyName).join(', ')}</div>
        `;
        cell.appendChild(unitDiv);
      }
      if (isPlayer) {
        cell.addEventListener('click', () => onCellClick(x, y));
      }
      container.appendChild(cell);
    }
  }
}

function onCellClick(x, y) {
  if (selectedBench >= 0 && !board[y][x]) {
    const picked = bench.splice(selectedBench, 1)[0];
    board[y][x] = picked;
    selectedBench = -1;
  } else if (board[y][x]) {
    if (bench.length >= BENCH_MAX) {
      alert('벤치가 가득 차서 회수할 수 없습니다.');
      return;
    }
    bench.push(board[y][x]);
    board[y][x] = null;
  }
  renderBench();
  renderBoards();
  renderSynergySummary();
}

function currentBoardUnits() {
  const arr = [];
  for (let y = 0; y < BOARD_ROWS; y++) {
    for (let x = 0; x < BOARD_COLS; x++) {
      if (board[y][x]) arr.push({ ...board[y][x], x, y });
    }
  }
  return arr;
}

function computeSynergyBonus(teamUnits) {
  const counts = {};
  teamUnits.forEach((u) => {
    const base = units.find((b) => b.id === u.id);
    if (!base) return;
    base.traits.forEach((t) => { counts[t] = (counts[t] || 0) + 1; });
  });
  let bonus = {
    attackMult: 0,
    abilityPowerMult: 0,
    attackSpeedMult: 0,
    critChance: 0,
    critDamage: 0,
    armorBonus: 0,
    magicResistBonus: 0,
    healthFlat: 0,
    healthMult: 0,
    shield: 0
  };
  Object.entries(counts).forEach(([trait, count]) => {
    const syn = synergies.find((s) => s.id === trait);
    if (!syn) return;
    let eff = {};
    syn.thresholds.forEach((t) => { if (count >= t.count) eff = t; });
    bonus = {
      attackMult: bonus.attackMult + (eff.attackMult || 0),
      abilityPowerMult: bonus.abilityPowerMult + (eff.abilityPowerMult || 0),
      attackSpeedMult: bonus.attackSpeedMult + (eff.attackSpeedMult || 0),
      critChance: bonus.critChance + (eff.critChance || 0),
      critDamage: bonus.critDamage + (eff.critDamage || 0),
      armorBonus: bonus.armorBonus + (eff.armorBonus || 0),
      magicResistBonus: bonus.magicResistBonus + (eff.magicResistBonus || 0),
      healthFlat: bonus.healthFlat + (eff.healthFlat || 0),
      healthMult: bonus.healthMult + (eff.healthMult || 0),
      shield: bonus.shield + (eff.shield || 0)
    };
  });
  return { counts, bonus };
}

function renderSynergySummary() {
  const boardUnits = currentBoardUnits();
  const { counts } = computeSynergyBonus(boardUnits);
  synergySummaryEl.innerHTML = '';
  synergies.forEach((s) => {
    const count = counts[s.id] || 0;
    if (!count) return;
    const reached = s.thresholds.filter((t) => count >= t.count).pop();
    const card = document.createElement('div');
    card.className = 'synergy-card';
    card.innerHTML = `
      <h4>${s.name} (${count})</h4>
      <div class="muted">${reached ? `최대 달성: ${reached.count}` : '조건 미달'}</div>
    `;
    synergySummaryEl.appendChild(card);
  });
  if (!synergySummaryEl.children.length) {
    synergySummaryEl.innerHTML = '<div class="muted">배치된 유닛이 없습니다.</div>';
  }
}

function renderHud() {
  hudRoundEl.textContent = `R${roundIndex + 1} / 10`;
  hudHeartEl.textContent = `❤️ ${hearts}`;
  goldTagEl.textContent = `골드 ${gold}`;
}

function resetGame() {
  bench = [];
  board = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
  selectedBench = -1;
  roundIndex = 0;
  hearts = 3;
  gold = 10;
  logEntries = [];
  shopLocked = false;
  rollShop();
  renderBench();
  renderBoards();
  renderSynergySummary();
  renderLog();
  renderHud();
  renderShop();
}

function prepareTeam(teamUnits, bonus, side) {
  return teamUnits.map((u) => {
    const base = units.find((b) => b.id === u.id);
    if (!base) return null;
    const star = Math.max(1, Math.min(3, u.star || 1));
    const mult = 1 + 0.6 * (star - 1);
    const stats = {
      ...base.stats,
      hp: Math.round((base.stats.hp * mult + bonus.healthFlat) * (1 + bonus.healthMult) + bonus.shield),
      attack: Math.round(base.stats.attack * mult * (1 + bonus.attackMult)),
      attackSpeed: base.stats.attackSpeed * (1 + bonus.attackSpeedMult),
      armor: base.stats.armor + bonus.armorBonus,
      magicResist: base.stats.magicResist + bonus.magicResistBonus
    };
    return {
      uid: uid(),
      id: u.id,
      side,
      star,
      x: u.x,
      y: u.y,
      stats,
      hp: stats.hp,
      cd: 0
    };
  }).filter(Boolean);
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function pickTarget(unit, enemies) {
  let best = null;
  let bestDist = 999;
  enemies.forEach((e) => {
    const d = manhattan(unit, e);
    if (d < bestDist) {
      bestDist = d;
      best = e;
    }
  });
  return best;
}

function simulateBattle(playerBoardUnits, enemyBoardUnits) {
  const playerBonus = computeSynergyBonus(playerBoardUnits).bonus;
  const enemyBonus = computeSynergyBonus(enemyBoardUnits).bonus;

  let players = prepareTeam(playerBoardUnits, playerBonus, 'player');
  let enemies = prepareTeam(enemyBoardUnits, enemyBonus, 'enemy');

  const step = 0.35; // seconds
  const maxTime = 45; // seconds
  let t = 0;
  const events = [];

  while (players.length && enemies.length && t < maxTime) {
    const all = [...players, ...enemies];
    all.forEach((u) => {
      u.cd -= step;
      if (u.cd <= 0) {
        const targets = u.side === 'player' ? enemies : players;
        const target = pickTarget(u, targets);
        if (target) {
          const dmg = Math.max(8, u.stats.attack);
          target.hp -= dmg;
          events.push({ type: 'attack', from: { x: u.x, y: u.y, side: u.side }, to: { x: target.x, y: target.y, side: target.side }, dmg });
          if (target.hp <= 0) {
            if (target.side === 'player') {
              players = players.filter((p) => p.uid !== target.uid);
            } else {
              enemies = enemies.filter((p) => p.uid !== target.uid);
            }
            events.push({ type: 'death', at: { x: target.x, y: target.y } });
          }
        }
        const atkInterval = Math.max(0.3, 1 / Math.max(0.2, u.stats.attackSpeed));
        u.cd = atkInterval;
      }
    });
    t += step;
  }

  let winner = 'draw';
  if (players.length && !enemies.length) winner = 'player';
  else if (!players.length && enemies.length) winner = 'enemy';
  else if (players.length && enemies.length) {
    const sumHp = (list) => list.reduce((a, b) => a + b.hp, 0);
    winner = sumHp(players) >= sumHp(enemies) ? 'player' : 'enemy';
  }

  return {
    winner,
    players,
    enemies,
    time: Number(t.toFixed(1)),
    events
  };
}

function rollShop() {
  if (shopLocked && shop.length) return;
  shop = [];
  for (let i = 0; i < SHOP_SIZE; i++) {
    const pick = units[Math.floor(Math.random() * units.length)];
    shop.push({ slot: i, id: pick.id, star: 1, cost: pick.cost });
  }
  renderShop();
}

function buyFromShop(slot) {
  const item = shop.find((s) => s.slot === slot);
  if (!item) return;
  if (gold < item.cost) {
    alert('골드가 부족합니다.');
    return;
  }
  if (bench.length >= BENCH_MAX) {
    alert('벤치가 가득 찼어요.');
    return;
  }
  gold -= item.cost;
  bench.push({ uid: uid(), id: item.id, star: 1 });
  shop = shop.filter((s) => s.slot !== slot);
  renderShop();
  renderBench();
  renderHud();
}

function renderShop() {
  shopEl.innerHTML = '';
  shop.forEach((s) => {
    const base = units.find((u) => u.id === s.id);
    const card = document.createElement('div');
    card.className = `shop-card ${shopLocked ? 'locked' : ''}`;
    card.innerHTML = `
      <h4>${base?.name || s.id}</h4>
      <div class="muted">${(base?.traits || []).map(getSynergyName).join(', ')}</div>
      <div class="muted">HP ${base?.stats.hp} · ATK ${base?.stats.attack}</div>
      <div class="cost">${s.cost} 골드</div>
      <button class="btn">구매</button>
    `;
    card.querySelector('button').addEventListener('click', () => buyFromShop(s.slot));
    shopEl.appendChild(card);
  });
}

function gainIncome(win) {
  const baseIncome = 5;
  const winBonus = win ? 1 : 0;
  const interest = Math.min(5, Math.floor(gold / 10));
  gold += baseIncome + winBonus + interest;
}

function rerollShop() {
  if (gold < REROLL_COST) {
    alert('골드가 부족합니다.');
    return;
  }
  gold -= REROLL_COST;
  shopLocked = false;
  rollShop();
  renderHud();
}

function renderLog() {
  logEl.innerHTML = '';
  logEntries.slice(-12).reverse().forEach((entry) => {
    const card = document.createElement('div');
    card.className = 'log-card';
    card.innerHTML = `
      <header>
        <div><strong>Round ${entry.round}</strong> <span class="muted">${entry.name}</span></div>
        <span class="pill ${entry.winner === 'player' ? 'win' : 'lose'}">${entry.winner === 'player' ? '승' : '패'}</span>
      </header>
      <div class="muted">시간 ${entry.time}s · 생존 ${entry.players}명 / ${entry.enemies}명</div>
      <div class="muted">남은 하트 ❤️ ${entry.hearts}</div>
    `;
    logEl.appendChild(card);
  });
}

function startRound() {
  if (isFighting) return;
  if (roundIndex >= 10) {
    alert('모든 라운드를 완료했습니다.');
    return;
  }
  const playerUnits = currentBoardUnits();
  if (!playerUnits.length) {
    alert('보드에 최소 1개 이상의 유닛을 배치하세요.');
    return;
  }
  const enemyUnits = (aiComps[roundIndex]?.units || []).map((u) => ({ ...u }));
  isFighting = true;
  startBtn.disabled = true;
  const result = simulateBattle(playerUnits, enemyUnits);
  fxEvents = result.events;
  playFx();
  if (result.winner === 'enemy') hearts = Math.max(0, hearts - 1);
  else gainIncome(true);
  logEntries.push({
    round: roundIndex + 1,
    name: aiComps[roundIndex]?.name || '',
    winner: result.winner,
    time: result.time,
    players: result.players.length,
    enemies: result.enemies.length,
    hearts
  });
  renderLog();
  renderHud();
  roundIndex = Math.min(9, roundIndex + 1);
  renderBoards();
  if (!shopLocked) rollShop();
  isFighting = false;
  startBtn.disabled = false;
  if (hearts === 0) {
    alert('패배! 리셋 후 다시 도전하세요.');
  }
}

startBtn.addEventListener('click', startRound);
resetBtn.addEventListener('click', resetGame);
rerollBtn.addEventListener('click', rerollShop);
lockBtn.addEventListener('click', () => { shopLocked = !shopLocked; lockBtn.textContent = shopLocked ? '고정 해제' : '고정'; renderShop(); });

function cellCenter(x, y) {
  const w = fxCanvas.width / BOARD_COLS;
  const h = fxCanvas.height / BOARD_ROWS;
  return { cx: w * x + w / 2, cy: h * y + h / 2 };
}

function playFx() {
  if (!ctx || !fxEvents.length) return;
  fxCanvas.width = fxCanvas.clientWidth;
  fxCanvas.height = fxCanvas.clientHeight;
  let i = 0;
  const tick = () => {
    ctx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
    const ev = fxEvents[i];
    if (ev) {
      if (ev.type === 'attack') {
        const from = cellCenter(ev.from.x, ev.from.y);
        const to = cellCenter(ev.to.x, ev.to.y);
        ctx.strokeStyle = ev.from.side === 'player' ? '#22d3ee' : '#a855f7';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(from.cx, from.cy);
        ctx.lineTo(to.cx, to.cy);
        ctx.stroke();
      } else if (ev.type === 'death') {
        const { cx, cy } = cellCenter(ev.at.x, ev.at.y);
        ctx.fillStyle = 'rgba(239,68,68,0.4)';
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    i++;
    if (i < fxEvents.length) {
      requestAnimationFrame(tick);
    } else {
      setTimeout(() => ctx.clearRect(0, 0, fxCanvas.width, fxCanvas.height), 200);
    }
  };
  requestAnimationFrame(tick);
}

fetchConfig();
renderHud();
renderBoards();
renderSynergySummary();
rollShop();

