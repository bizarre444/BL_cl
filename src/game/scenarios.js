// Scenario definitions: objectives, unlock sets, start conditions, deadlines.
// Three story scenarios + endless sandbox (mirrors the original's campaign/sandbox split).

export const SCENARIOS = [
  {
    id: 's1', diff: 1,
    name: { ru: 'Первая звезда', en: 'First Star' },
    desc: {
      ru: 'Затерянный остров, немного денег и паром по расписанию. Дайте гостям крышу, еду и чистоту — и заработайте первую звезду.',
      en: 'A lost island, some cash and a ferry schedule. Give guests a roof, food and cleanliness — and earn your first star.',
    },
    cash: 30000,
    days: 12,
    unlocks: ['bungalow', 'hotel', 'drinks', 'icecream', 'bbq', 'cafe', 'loo', 'shower', 'cleanershack', 'loungers', 'palm', 'flowerbed', 'lamp', 'store'],
    objectives: [
      { key: 'rating', target: 2, label: { ru: 'Рейтинг ≥ 2★', en: 'Rating ≥ 2★' } },
      { key: 'served', target: 30, label: { ru: 'Обслужить 30 гостей', en: 'Serve 30 guests' } },
      { key: 'cash', target: 12000, label: { ru: 'Касса ≥ $12 000', en: 'Cash ≥ $12,000' } },
    ],
  },
  {
    id: 's2', diff: 2,
    name: { ru: 'Вечеринки у бассейна', en: 'Pool Parties' },
    desc: {
      ru: 'Молодёжь требует движения: бассейн, волейбол, коктейли и танцы до утра. Удержите курорт на плаву — в прямом смысле: следите за спасателями.',
      en: 'The young crowd wants action: pool, volleyball, cocktails and dancing till dawn. Keep the resort afloat — literally: watch your lifeguards.',
    },
    cash: 45000,
    days: 18,
    unlocks: ['bungalow', 'hotel', 'luxhotel', 'drinks', 'icecream', 'bbq', 'cafe', 'beachbar', 'loo', 'shower', 'cleanershack', 'security', 'workshop', 'loungers', 'volley', 'pool', 'jacuzzi', 'pedalo', 'baywatch', 'firstaid', 'stage', 'palm', 'flowerbed', 'lamp', 'store'],
    objectives: [
      { key: 'rating', target: 3, label: { ru: 'Рейтинг ≥ 3★', en: 'Rating ≥ 3★' } },
      { key: 'guests', target: 40, label: { ru: '40 гостей одновременно', en: '40 guests at once' } },
      { key: 'build', target: 'disco', label: { ru: 'Построить дискотеку', en: 'Build the disco' } },
    ],
  },
  {
    id: 's3', diff: 3,
    name: { ru: 'Пять звёзд', en: 'Five Stars' },
    desc: {
      ru: 'Престижный курорт для взыскательных гостей. Ресторан, люкс-отель, безупречная чистота — и никакой акулы в новостях.',
      en: 'A prestige resort for demanding guests. Restaurant, luxury hotel, spotless grounds — and no sharks on the news.',
    },
    cash: 60000,
    days: 26,
    unlocks: null, // everything
    objectives: [
      { key: 'rating', target: 4.5, label: { ru: 'Рейтинг ≥ 4.5★', en: 'Rating ≥ 4.5★' } },
      { key: 'cash', target: 100000, label: { ru: 'Касса ≥ $100 000', en: 'Cash ≥ $100,000' } },
      { key: 'build', target: 'restaurant', label: { ru: 'Построить ресторан', en: 'Build the restaurant' } },
      { key: 'build', target: 'luxhotel', label: { ru: 'Построить люкс-отель', en: 'Build the luxury hotel' } },
    ],
  },
  {
    id: 'sandbox', sandbox: true, diff: 0,
    name: { ru: 'Песочница', en: 'Sandbox' },
    desc: {
      ru: 'Все постройки открыты, денег хватает, сроков нет. Просто стройте курорт мечты.',
      en: 'Everything unlocked, plenty of cash, no deadlines. Just build your dream resort.',
    },
    cash: 80000,
    days: Infinity,
    unlocks: null,
    objectives: [],
  },
];

export function scenarioById(id) {
  return SCENARIOS.find(s => s.id === id) || SCENARIOS[0];
}

export function isUnlocked(scenario, buildingId) {
  if (!scenario.unlocks) return true;
  return scenario.unlocks.includes(buildingId);
}

// Evaluate objective progress against live state. Returns [{obj, value, done}].
export function evalObjectives(scenario, state) {
  return scenario.objectives.map(obj => {
    let value = 0, done = false;
    switch (obj.key) {
      case 'rating': value = state.rating.stars; break;
      case 'served': value = state.servedTotal; break;
      case 'cash': value = state.econ.cash; break;
      case 'guests': value = state.peakGuests; break;
      case 'build': value = state.bs.buildings.some(b => b.id === obj.target) ? 1 : 0; break;
    }
    done = value >= obj.target;
    return { obj, value, done };
  });
}
