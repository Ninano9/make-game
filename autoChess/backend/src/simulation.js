import { units } from './data/units.js';
import { synergies } from './data/synergies.js';
import { aiComps } from './data/aiComps.js';

const unitMap = new Map(units.map((u) => [u.id, u]));
const synergyMap = new Map(synergies.map((s) => [s.id, s]));

function resolveSynergyEffects(count, thresholds) {
  let effect = {};
  thresholds.forEach((t) => {
    if (count >= t.count) {
      effect = t;
    }
  });
  return effect;
}

function aggregateSynergyBonus(teamUnits) {
  const counts = {};
  teamUnits.forEach((u) => {
    const base = unitMap.get(u.id);
    if (!base) return;
    base.traits.forEach((trait) => {
      counts[trait] = (counts[trait] || 0) + 1;
    });
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
    const syn = synergyMap.get(trait);
    if (!syn) return;
    const eff = resolveSynergyEffects(count, syn.thresholds);
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

function toUnitStats(unit) {
  const base = unitMap.get(unit.id);
  if (!base) return null;
  const star = Math.max(1, Math.min(3, unit.star || 1));
  const multiplier = 1 + 0.6 * (star - 1);
  return {
    ...base,
    star,
    stats: {
      ...base.stats,
      hp: Math.round(base.stats.hp * multiplier),
      attack: Math.round(base.stats.attack * multiplier),
      abilityPower: Math.round(base.stats.abilityPower * multiplier)
    }
  };
}

function computeTeamPower(teamUnits) {
  const resolved = teamUnits
    .map(toUnitStats)
    .filter(Boolean);
  if (!resolved.length) return { power: 0, detail: { resolved, synergyCounts: {}, synergyBonus: {} } };

  const { counts, bonus } = aggregateSynergyBonus(resolved);

  let offense = 0;
  let defense = 0;

  resolved.forEach((u) => {
    const s = u.stats;
    const attackPart =
      s.attack * (1 + bonus.attackMult) *
      (s.attackSpeed * (1 + bonus.attackSpeedMult)) *
      (1 + bonus.critChance * (0.5 + bonus.critDamage));
    const abilityPart = s.abilityPower * (1 + bonus.abilityPowerMult);
    offense += attackPart * 0.7 + abilityPart * 0.3;

    const armor = s.armor + bonus.armorBonus;
    const mr = s.magicResist + bonus.magicResistBonus;
    const hp = (s.hp + bonus.healthFlat + bonus.shield) * (1 + bonus.healthMult);
    defense += hp * 0.6 + (armor + mr) * 6;
  });

  const power = Math.round(offense * 0.6 + defense * 0.4);
  return { power, detail: { resolved, synergyCounts: counts, synergyBonus: bonus } };
}

function simulateRound(playerUnits, enemyUnits) {
  const player = computeTeamPower(playerUnits);
  const enemy = computeTeamPower(enemyUnits);

  const diff = player.power - enemy.power;
  let winner = 'draw';
  if (Math.abs(diff) > 10) {
    winner = diff > 0 ? 'player' : 'enemy';
  }
  const confidence = Math.min(0.35, Math.abs(diff) / Math.max(200, enemy.power + 1));
  return {
    winner,
    playerPower: player.power,
    enemyPower: enemy.power,
    confidence: Number(confidence.toFixed(3)),
    detail: { player: player.detail, enemy: enemy.detail }
  };
}

export function simulateCampaign(playerUnits) {
  const rounds = aiComps.slice(0, 10);
  const results = rounds.map((r) => {
    const outcome = simulateRound(playerUnits, r.units.map((id) => ({ id, star: 2 })));
    return { round: r.round, name: r.name, ...outcome };
  });
  const wins = results.filter((r) => r.winner === 'player').length;
  const losses = results.filter((r) => r.winner === 'enemy').length;
  return { results, summary: { wins, losses, draws: results.length - wins - losses } };
}

export function getConfig() {
  return {
    units,
    synergies,
    rounds: aiComps.length
  };
}

