const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:4000'
  : '';

let units = [];
let synergies = [];
let selected = [];

const unitListEl = document.getElementById('unit-list');
const selectedListEl = document.getElementById('selected-list');
const selectedCountEl = document.getElementById('selected-count');
const synergySummaryEl = document.getElementById('synergy-summary');
const resultsEl = document.getElementById('results');
const configStatusEl = document.getElementById('config-status');
const simulateBtn = document.getElementById('simulate-btn');

async function fetchConfig() {
  try {
    configStatusEl.textContent = '로딩 중...';
    const res = await fetch(`${API_BASE}/api/config`);
    const data = await res.json();
    units = data.units || [];
    synergies = data.synergies || [];
    renderUnits();
    renderSelected();
    configStatusEl.textContent = `유닛 ${units.length} · 시너지 ${synergies.length}`;
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
      <div class="muted">HP ${u.stats.hp} · ATK ${u.stats.attack} · AP ${u.stats.abilityPower}</div>
      <button class="btn" data-id="${u.id}">추가</button>
    `;
    card.querySelector('button').addEventListener('click', () => addUnit(u.id));
    unitListEl.appendChild(card);
  });
}

function addUnit(id) {
  if (selected.length >= 8) return;
  selected.push({ id, star: 1 });
  renderSelected();
}

function removeUnit(idx) {
  selected.splice(idx, 1);
  renderSelected();
}

function changeStar(idx, delta) {
  selected[idx].star = Math.min(3, Math.max(1, selected[idx].star + delta));
  renderSelected();
}

function renderSelected() {
  selectedCountEl.textContent = `${selected.length} / 8`;
  selectedListEl.innerHTML = '';
  selected.forEach((s, i) => {
    const base = units.find((u) => u.id === s.id);
    if (!base) return;
    const li = document.createElement('li');
    li.innerHTML = `
      <div>
        <div><strong>${base.name}</strong> <span class="muted">${base.traits.map(getSynergyName).join(', ')}</span></div>
        <div class="muted">코스트 ${base.cost}</div>
      </div>
      <div class="star">${'★'.repeat(s.star)}</div>
      <div style="display:flex;gap:4px;">
        <button class="btn" aria-label="star down">-</button>
        <button class="btn" aria-label="star up">+</button>
        <button class="btn" aria-label="remove">삭제</button>
      </div>
    `;
    const [down, up, remove] = li.querySelectorAll('button');
    down.addEventListener('click', () => changeStar(i, -1));
    up.addEventListener('click', () => changeStar(i, 1));
    remove.addEventListener('click', () => removeUnit(i));
    selectedListEl.appendChild(li);
  });
  renderSynergySummary();
}

function getSynergyName(id) {
  const syn = synergies.find((s) => s.id === id);
  return syn ? syn.name : id;
}

function computeSynergyCounts() {
  const counts = {};
  selected.forEach((s) => {
    const unit = units.find((u) => u.id === s.id);
    if (!unit) return;
    unit.traits.forEach((t) => {
      counts[t] = (counts[t] || 0) + 1;
    });
  });
  return counts;
}

function renderSynergySummary() {
  const counts = computeSynergyCounts();
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
    synergySummaryEl.innerHTML = '<div class="muted">활성 시너지가 없습니다.</div>';
  }
}

async function simulate() {
  if (!selected.length) {
    alert('유닛을 한 개 이상 선택하세요.');
    return;
  }
  simulateBtn.disabled = true;
  simulateBtn.textContent = '계산 중...';
  try {
    const res = await fetch(`${API_BASE}/api/battle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerUnits: selected })
    });
    const data = await res.json();
    renderResults(data.results || []);
  } catch (e) {
    console.error(e);
    alert('시뮬레이션 실패');
  } finally {
    simulateBtn.disabled = false;
    simulateBtn.textContent = '시뮬레이션 실행';
  }
}

function renderResults(results) {
  resultsEl.innerHTML = '';
  results.forEach((r) => {
    const pillClass = r.winner === 'player' ? 'win' : r.winner === 'enemy' ? 'lose' : 'draw';
    const pillLabel = r.winner === 'player' ? '승' : r.winner === 'enemy' ? '패' : '무';
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML = `
      <header>
        <div><strong>Round ${r.round}</strong> <span class="muted">${r.name}</span></div>
        <span class="pill ${pillClass}">${pillLabel}</span>
      </header>
      <div class="muted">내 전투력 ${r.playerPower} / 적 전투력 ${r.enemyPower}</div>
      <div class="muted">신뢰도 ${Math.round((r.confidence || 0) * 100)}%</div>
    `;
    resultsEl.appendChild(card);
  });
  if (!results.length) {
    resultsEl.innerHTML = '<div class="muted">먼저 조합을 고르고 시뮬레이션을 실행하세요.</div>';
  }
}

simulateBtn.addEventListener('click', simulate);
fetchConfig();
renderResults([]);

