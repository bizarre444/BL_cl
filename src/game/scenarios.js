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
    id: 's4', diff: 2,
    name: { ru: 'Серф-пляж', en: 'Surf Beach' },
    desc: {
      ru: 'Волны здесь знаменитые — но пока ничьи. Постройте прокат, зазовите спортсменов и сделайте из дикого пляжа мекку сёрфинга.',
      en: 'The waves here are famous — but still unclaimed. Open a hire shack, pull in the sporty crowd and turn a wild beach into a surf mecca.',
    },
    cash: 38000,
    days: 16,
    unlocks: ['bungalow', 'hotel', 'drinks', 'icecream', 'bbq', 'cafe', 'loo', 'shower', 'cleanershack', 'loungers', 'volley', 'pedalo', 'surf', 'baywatch', 'firstaid', 'workshop', 'palm', 'flowerbed', 'lamp', 'store'],
    objectives: [
      { key: 'build', target: 'surf', label: { ru: 'Открыть прокат сёрфов', en: 'Open the surf hire' } },
      { key: 'build', target: 'pedalo', label: { ru: 'Открыть прокат водных велосипедов', en: 'Open the pedalo hire' } },
      { key: 'rating', target: 3, label: { ru: 'Рейтинг ≥ 3★', en: 'Rating ≥ 3★' } },
      { key: 'guests', target: 25, label: { ru: '25 гостей одновременно', en: '25 guests at once' } },
    ],
  },
  {
    id: 's5', diff: 2,
    name: { ru: 'Семейный отдых', en: 'Family Resort' },
    desc: {
      ru: 'Семьи с детьми — самые требовательные гости: бассейн, мороженое, медпункт и ни одного несчастного случая.',
      en: 'Families are the pickiest guests: a pool, ice cream, a first-aid post — and not a single accident.',
    },
    cash: 42000,
    days: 18,
    unlocks: ['bungalow', 'hotel', 'drinks', 'icecream', 'bbq', 'cafe', 'loo', 'shower', 'cleanershack', 'loungers', 'volley', 'pool', 'jacuzzi', 'pedalo', 'baywatch', 'firstaid', 'store', 'stage', 'security', 'workshop', 'palm', 'flowerbed', 'lamp'],
    objectives: [
      { key: 'build', target: 'pool', label: { ru: 'Построить бассейн', en: 'Build the pool' } },
      { key: 'build', target: 'firstaid', label: { ru: 'Открыть медпункт', en: 'Open the first-aid post' } },
      { key: 'rating', target: 3.5, label: { ru: 'Рейтинг ≥ 3.5★', en: 'Rating ≥ 3.5★' } },
      { key: 'nodrown', target: 1, label: { ru: 'Никто не утонул', en: 'Nobody drowns' } },
    ],
  },
  {
    id: 's6', diff: 3,
    name: { ru: 'Ночная жизнь', en: 'Night Life' },
    desc: {
      ru: 'Днём тихо, ночью — громко. Тусовщики ждут сцену, бар и дискотеку. Охрана обязательна: веселье не должно заканчиваться дракой.',
      en: 'Quiet by day, loud by night. Party animals want a stage, a bar and a disco. Security is a must: fun must not end in a brawl.',
    },
    cash: 52000,
    days: 20,
    unlocks: null,
    objectives: [
      { key: 'build', target: 'stage', label: { ru: 'Построить сцену', en: 'Build the stage' } },
      { key: 'build', target: 'disco', label: { ru: 'Построить дискотеку', en: 'Build the disco' } },
      { key: 'guests', target: 45, label: { ru: '45 гостей одновременно', en: '45 guests at once' } },
      { key: 'rating', target: 3.5, label: { ru: 'Рейтинг ≥ 3.5★', en: 'Rating ≥ 3.5★' } },
    ],
  },
  {
    id: 's7', diff: 3,
    name: { ru: 'Роскошь и покой', en: 'Luxury & Quiet' },
    desc: {
      ru: 'Взыскательные тихони платят за безупречность: люкс-отель, ресторан, джакузи — и ни шума, ни грязи.',
      en: 'Demanding quiet types pay for perfection: a luxury hotel, a restaurant, a jacuzzi — and no noise, no dirt.',
    },
    cash: 70000,
    days: 24,
    unlocks: null,
    objectives: [
      { key: 'build', target: 'luxhotel', label: { ru: 'Построить люкс-отель', en: 'Build the luxury hotel' } },
      { key: 'build', target: 'restaurant', label: { ru: 'Построить ресторан', en: 'Build the restaurant' } },
      { key: 'build', target: 'jacuzzi', label: { ru: 'Поставить джакузи', en: 'Install a jacuzzi' } },
      { key: 'rating', target: 4, label: { ru: 'Рейтинг ≥ 4★', en: 'Rating ≥ 4★' } },
    ],
  },
  {
    id: 's8', diff: 3,
    name: { ru: 'Сезон штормов', en: 'Storm Season' },
    desc: {
      ru: 'Синоптики не врут: самый шквалистый сезон за десятилетие. Удержите рейтинг и кассу между штормами — и не дайте курорту утонуть в расходах.',
      en: 'The forecasters are not lying: the stormiest season in a decade. Keep the rating and the cash afloat between storms — and don\'t let the resort drown in costs.',
    },
    cash: 55000,
    days: 22,
    unlocks: null,
    stormy: true,
    objectives: [
      { key: 'rating', target: 3.5, label: { ru: 'Рейтинг ≥ 3.5★', en: 'Rating ≥ 3.5★' } },
      { key: 'cash', target: 60000, label: { ru: 'Касса ≥ $60 000', en: 'Cash ≥ $60,000' } },
      { key: 'served', target: 120, label: { ru: 'Обслужить 120 гостей', en: 'Serve 120 guests' } },
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
      case 'nodrown': value = state.drownings === 0 ? 1 : 0; break;
    }
    done = value >= obj.target;
    return { obj, value, done };
  });
}
