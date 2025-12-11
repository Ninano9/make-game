export const synergies = [
  {
    id: 'vanguard',
    name: '전위병',
    thresholds: [
      { count: 2, armorBonus: 12, healthMult: 0.06 },
      { count: 4, armorBonus: 25, healthMult: 0.12 },
      { count: 6, armorBonus: 40, healthMult: 0.18 }
    ]
  },
  {
    id: 'guardian',
    name: '수호자',
    thresholds: [
      { count: 2, armorBonus: 10, shield: 120 },
      { count: 4, armorBonus: 20, shield: 200 },
      { count: 6, armorBonus: 35, shield: 320 }
    ]
  },
  {
    id: 'artificer',
    name: '기계공',
    thresholds: [
      { count: 2, abilityPowerMult: 0.12 },
      { count: 4, abilityPowerMult: 0.22 },
      { count: 6, abilityPowerMult: 0.35 }
    ]
  },
  {
    id: 'sniper',
    name: '저격수',
    thresholds: [
      { count: 2, attackMult: 0.12 },
      { count: 4, attackMult: 0.22 },
      { count: 6, attackMult: 0.35 }
    ]
  },
  {
    id: 'sage',
    name: '학자',
    thresholds: [
      { count: 2, manaRegen: 10, abilityPowerMult: 0.08 },
      { count: 4, manaRegen: 20, abilityPowerMult: 0.15 },
      { count: 6, manaRegen: 30, abilityPowerMult: 0.24 }
    ]
  },
  {
    id: 'brawler',
    name: '난동꾼',
    thresholds: [
      { count: 2, healthFlat: 120 },
      { count: 4, healthFlat: 260 },
      { count: 6, healthFlat: 420 }
    ]
  },
  {
    id: 'assassin',
    name: '도적',
    thresholds: [
      { count: 2, critChance: 0.1, critDamage: 0.1 },
      { count: 4, critChance: 0.2, critDamage: 0.25 },
      { count: 6, critChance: 0.3, critDamage: 0.4 }
    ]
  },
  {
    id: 'gunner',
    name: '포병',
    thresholds: [
      { count: 2, attackMult: 0.1 },
      { count: 4, attackMult: 0.18 },
      { count: 6, attackMult: 0.3 }
    ]
  },
  {
    id: 'invoker',
    name: '마도사',
    thresholds: [
      { count: 2, abilityPowerMult: 0.15 },
      { count: 4, abilityPowerMult: 0.28 },
      { count: 6, abilityPowerMult: 0.45 }
    ]
  },
  {
    id: 'chrono',
    name: '연대',
    thresholds: [
      { count: 2, attackSpeedMult: 0.08 },
      { count: 4, attackSpeedMult: 0.15 },
      { count: 6, attackSpeedMult: 0.25 }
    ]
  },
  {
    id: 'mystic',
    name: '신비술사',
    thresholds: [
      { count: 2, magicResistBonus: 15 },
      { count: 4, magicResistBonus: 30 },
      { count: 6, magicResistBonus: 50 }
    ]
  }
];

