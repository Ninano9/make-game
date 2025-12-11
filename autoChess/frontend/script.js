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
let fxUnits = [];

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
    rollShop();
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
      <div class="muted mini">구매는 상점에서만 가능합니다.</div>
    `;
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
        <button class="btn" aria-label="sell">판매</button>
      </div>
    `;
    const [sell] = div.querySelectorAll('button');
    sell.addEventListener('click', (ev) => { ev.stopPropagation(); sellBench(i); });
    div.addEventListener('click', () => {
      selectedBench = selectedBench === i ? -1 : i;
      renderBench();
    });
    benchEl.appendChild(div);
  });
}

function sellBench(idx) {
  const u = bench[idx];
  const base = units.find((b) => b.id === u.id);
  const cost = base?.cost || 1;
  const price = cost * Math.pow(3, (u.star || 1) - 1);
  gold += price;
  bench.splice(idx, 1);
  if (selectedBench === idx) selectedBench = -1;
  renderBench();
  renderHud();
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
    tryCombine(picked.id);
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

function collectUnits(id, star) {
  const refs = [];
  bench.forEach((u, i) => { if (u.id === id && u.star === star) refs.push({ source: 'bench', i }); });
  for (let y = 0; y < BOARD_ROWS; y++) {
    for (let x = 0; x < BOARD_COLS; x++) {
      const u = board[y][x];
      if (u && u.id === id && u.star === star) refs.push({ source: 'board', x, y });
    }
  }
  return refs;
}

function applyUpgrade(ref, newStar) {
  if (ref.source === 'bench') {
    bench[ref.i].star = newStar;
  } else {
    board[ref.y][ref.x].star = newStar;
  }
}

function removeRef(ref) {
  if (ref.source === 'bench') {
    bench.splice(ref.i, 1);
  } else {
    board[ref.y][ref.x] = null;
  }
}

function tryCombine(id) {
  for (let star = 1; star <= 2; star++) {
    while (true) {
      const refs = collectUnits(id, star);
      if (refs.length < 3) break;
      const keep = refs[0];
      const toRemove = refs.slice(1, 3);
      // remove in safe order: bench high index first
      toRemove.sort((a, b) => {
        if (a.source === 'bench' && b.source === 'bench') return b.i - a.i;
        if (a.source === 'bench') return 1;
        if (b.source === 'bench') return -1;
        return 0;
      });
      toRemove.forEach(removeRef);
      applyUpgrade(keep, star + 1);
    }
  }
  renderBench();
  renderBoards();
  renderSynergySummary();
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

function prepareTeam(teamUnits, bonus, side, scale = 1) {
  return teamUnits.map((u) => {
    const base = units.find((b) => b.id === u.id);
    if (!base) return null;
    const star = Math.max(1, Math.min(3, u.star || 1));
    const mult = 1 + 0.6 * (star - 1);
    const stats = {
      ...base.stats,
      hp: Math.round(((base.stats.hp * mult * scale) + bonus.healthFlat) * (1 + bonus.healthMult) + bonus.shield),
      attack: Math.round(base.stats.attack * mult * scale * (1 + bonus.attackMult)),
      attackSpeed: base.stats.attackSpeed * (1 + bonus.attackSpeedMult),
      armor: base.stats.armor + bonus.armorBonus,
      magicResist: base.stats.magicResist + bonus.magicResistBonus,
      abilityPower: Math.round(base.stats.abilityPower * mult * scale)
    };
    const manaMax = 80 + Math.round(stats.abilityPower * 0.4);
    return {
      uid: uid(),
      id: u.id,
      side,
      star,
      x: u.x,
      y: u.y,
      stats,
      hp: stats.hp,
      cd: 0,
      mana: 0,
      manaMax,
      manaRegen: 6, // 초당 마나 재생
      manaOnHit: 12,
      manaOnDamaged: 10
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

function simulateBattle(playerBoardUnits, enemyBoardUnits, roundIdx) {
  const playerBonus = computeSynergyBonus(playerBoardUnits).bonus;
  const enemyBonus = computeSynergyBonus(enemyBoardUnits).bonus;

  const enemyScale = 0.9 + roundIdx * 0.08; // 완화된 난이도 스케일
  let players = prepareTeam(playerBoardUnits, playerBonus, 'player', 1);
  let enemies = prepareTeam(enemyBoardUnits, enemyBonus, 'enemy', enemyScale);

  const step = 0.35; // seconds
  const maxTime = 45; // seconds
  let t = 0;
  const events = [];

  while (players.length && enemies.length && t < maxTime) {
    const all = [...players, ...enemies];
    all.forEach((u) => {
      // 지속 마나 회복
      u.mana = Math.min(u.manaMax, u.mana + u.manaRegen * step);
      u.cd -= step;
      if (u.cd <= 0) {
        const targets = u.side === 'player' ? enemies : players;
        const target = pickTarget(u, targets);
        if (target) {
          // 기본 공격
          const dmg = Math.max(8, u.stats.attack);
          target.hp -= dmg;
          u.mana = Math.min(u.manaMax, u.mana + u.manaOnHit);
          target.mana = Math.min(target.manaMax, target.mana + target.manaOnDamaged);
          events.push({
            type: 'attack',
            from: { x: u.x, y: u.y, side: u.side, id: u.id },
            to: { x: target.x, y: target.y, side: target.side, id: target.id },
            dmg,
            targetHp: Math.max(0, target.hp)
          });
          // 스킬 사용 조건
          if (u.mana >= u.manaMax) {
            u.mana = 0;
            const splashTargets = (u.side === 'player' ? enemies : players)
              .slice(0, 2); // 간단히 2명 타격
            splashTargets.forEach((st) => {
              const sdmg = Math.max(12, Math.round(u.stats.abilityPower * 1.4));
              st.hp -= sdmg;
              st.mana = Math.min(st.manaMax, st.mana + st.manaOnDamaged);
              events.push({
                type: 'spell',
                from: { x: u.x, y: u.y, side: u.side, id: u.id },
                to: { x: st.x, y: st.y, side: st.side, id: st.id },
                dmg: sdmg,
                targetHp: Math.max(0, st.hp)
              });
            });
            // 죽은 처리
            if ((u.side === 'player' ? enemies : players) === enemies) {
              enemies = enemies.filter((e) => e.hp > 0);
            } else {
              players = players.filter((p) => p.hp > 0);
            }
          }
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

function getShopWeight(cost, r) {
  if (r <= 1) { // Round 1~2 (idx 0~1): 1코 70, 2코 30
    return cost === 1 ? 70 : cost === 2 ? 30 : 0;
  }
  if (r <= 3) { // Round 3~4: 1코 45, 2코 40, 3코 15
    return cost === 1 ? 45 : cost === 2 ? 40 : cost === 3 ? 15 : 0;
  }
  if (r <= 6) { // Round 5~7: 1코 25, 2코 35, 3코 25, 4코 15
    return cost === 1 ? 25 : cost === 2 ? 35 : cost === 3 ? 25 : cost === 4 ? 15 : 0;
  }
  // Round 8~10: 1코 10, 2코 25, 3코 30, 4코 25, 5코 10
  return cost === 1 ? 10 : cost === 2 ? 25 : cost === 3 ? 30 : cost === 4 ? 25 : cost === 5 ? 10 : 0;
}

function pickWeightedUnit(r) {
  let total = 0;
  const acc = [];
  units.forEach((u) => {
    const w = getShopWeight(u.cost, r);
    if (w > 0) {
      total += w;
      acc.push({ id: u.id, w: total });
    }
  });
  if (total === 0) return units[Math.floor(Math.random() * units.length)].id;
  const roll = Math.random() * total;
  const found = acc.find((a) => roll <= a.w);
  return found ? found.id : acc[acc.length - 1].id;
}

function rollShop() {
  if (shopLocked && shop.length) return;
  if (!units.length) return;
  shop = [];
  for (let i = 0; i < SHOP_SIZE; i++) {
    const pickId = pickWeightedUnit(roundIndex);
    const pick = units.find((u) => u.id === pickId);
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
  tryCombine(item.id);
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
  fxUnits = [
    ...playerUnits.map((u) => ({ ...u, side: 'player', hp: (units.find((b) => b.id === u.id)?.stats.hp || 1) })),
    ...enemyUnits.map((u) => ({ ...u, side: 'enemy', hp: (units.find((b) => b.id === u.id)?.stats.hp || 1) }))
  ];
  isFighting = true;
  startBtn.disabled = true;
  const result = simulateBattle(playerUnits, enemyUnits, roundIndex);
  fxEvents = result.events;
  playFx();
  if (result.winner === 'enemy') hearts = Math.max(0, hearts - 1);
  gainIncome(result.winner === 'player');
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
  shopLocked = false;
  lockBtn.textContent = '고정';
  rollShop(); // 라운드 종료 자동 새로고침 (무료)
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
  let start = null;
  const duration = 320;

  const drawUnits = () => {
    fxUnits.forEach((u) => {
      const { cx, cy } = cellCenter(u.x, u.y);
      const color = u.side === 'player' ? '#22d3ee' : '#a855f7';
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();
      // HP bar
      const ratio = Math.max(0, Math.min(1, u.hp / (units.find((b) => b.id === u.id)?.stats.hp || u.hp || 1)));
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 16, cy + 14, 32, 5);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(cx - 16, cy + 14, 32 * ratio, 5);
    });
  };

  const drawEvent = (ev, progress) => {
    ctx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
    drawUnits();
    if (!ev) return;
    if (ev.type === 'attack') {
      const from = cellCenter(ev.from.x, ev.from.y);
      const to = cellCenter(ev.to.x, ev.to.y);
      const cx = from.cx + (to.cx - from.cx) * progress;
      const cy = from.cy + (to.cy - from.cy) * progress;
      ctx.strokeStyle = ev.from.side === 'player' ? '#22d3ee' : '#a855f7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(from.cx, from.cy);
      ctx.lineTo(cx, cy);
      ctx.stroke();
      ctx.fillStyle = ev.from.side === 'player' ? '#22d3ee' : '#a855f7';
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (ev.type === 'spell') {
      const from = cellCenter(ev.from.x, ev.from.y);
      const to = cellCenter(ev.to.x, ev.to.y);
      const midx = from.cx + (to.cx - from.cx) * progress;
      const midy = from.cy + (to.cy - from.cy) * progress;
      const radius = 10 + 24 * progress;
      ctx.strokeStyle = ev.from.side === 'player' ? '#38bdf8' : '#c084fc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(midx, midy, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = ev.from.side === 'player' ? 'rgba(56,189,248,0.25)' : 'rgba(192,132,252,0.25)';
      ctx.beginPath();
      ctx.arc(midx, midy, radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
    } else if (ev.type === 'death') {
      const { cx, cy } = cellCenter(ev.at.x, ev.at.y);
      const r = 6 + 18 * progress;
      ctx.fillStyle = 'rgba(239,68,68,0.35)';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const step = (ts) => {
    if (!start) start = ts;
    const ev = fxEvents[i];
    const progress = Math.min(1, (ts - start) / duration);
    drawEvent(ev, progress);
    if (progress >= 1) {
      if (ev && ev.type === 'attack') {
        // apply HP update
        const target = fxUnits.find((u) => u.x === ev.to.x && u.y === ev.to.y && u.side === ev.to.side);
        if (target) {
          target.hp = ev.targetHp;
        }
      } else if (ev && ev.type === 'death') {
        fxUnits = fxUnits.filter((u) => !(u.x === ev.at.x && u.y === ev.at.y));
      }
      i++;
      start = ts;
      if (i >= fxEvents.length) {
        setTimeout(() => ctx.clearRect(0, 0, fxCanvas.width, fxCanvas.height), 120);
        return;
      }
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

fetchConfig();
renderHud();
renderBoards();
renderSynergySummary();

