// Building catalog, guest archetypes, staff roles.
// All numbers are this project's own design/balance, inspired by the genre.

export const CATS = ['accom', 'food', 'fun', 'need', 'safety', 'decor'];

// needs satisfied per visit: energy, hunger, thirst, bladder, hygiene, fun
// price: what a guest pays per use; cap: simultaneous users; wearPerUse adds degradation.
export const BUILDINGS = [
  // ---- Проживание ----
  {
    id: 'bungalow', cat: 'accom', w: 2, h: 2, cost: 1600, upkeep: 12,
    name: { ru: 'Бунгало', en: 'Bungalow' },
    desc: { ru: 'Уютный домик на 8 гостей, 2★', en: 'Cosy hut for 8 guests, 2★' },
    beds: 8, quality: 2, roomFee: 26,
  },
  {
    id: 'hotel', cat: 'accom', w: 3, h: 3, cost: 6500, upkeep: 40,
    name: { ru: 'Отель', en: 'Hotel' },
    desc: { ru: 'Корпус на 24 гостя, 3★', en: 'Block for 24 guests, 3★' },
    beds: 24, quality: 3, roomFee: 46,
  },
  {
    id: 'luxhotel', cat: 'accom', w: 4, h: 4, cost: 19000, upkeep: 110,
    name: { ru: 'Люкс-отель', en: 'Luxury hotel' },
    desc: { ru: 'Пятизвёздочный дворец на 40 гостей', en: 'Five-star palace for 40 guests' },
    beds: 40, quality: 5, roomFee: 95,
  },
  // ---- Еда и напитки ----
  {
    id: 'drinks', cat: 'food', w: 1, h: 1, cost: 450, upkeep: 4,
    name: { ru: 'Киоск напитков', en: 'Drinks kiosk' },
    desc: { ru: 'Дешёвые прохладительные напитки', en: 'Cheap soft drinks' },
    needs: { thirst: 55 }, price: 3, cap: 3, useMin: 8, quality: 1, litter: 0.5, wearPerUse: 0.4,
    night: true,
  },
  {
    id: 'icecream', cat: 'food', w: 1, h: 1, cost: 700, upkeep: 6,
    name: { ru: 'Мороженое', en: 'Ice cream stall' },
    desc: { ru: 'Любимое место детей', en: "Kids' favourite" },
    needs: { thirst: 30, fun: 15 }, price: 4, cap: 3, useMin: 8, quality: 1, litter: 0.6, wearPerUse: 0.4,
    night: true,
  },
  {
    id: 'bbq', cat: 'food', w: 2, h: 2, cost: 900, upkeep: 8,
    name: { ru: 'Барбекю', en: 'Barbecue' },
    desc: { ru: 'Быстро, сытно, дымно', en: 'Fast, filling, smoky' },
    needs: { hunger: 50 }, price: 8, cap: 3, useMin: 14, quality: 2, litter: 1.4, wearPerUse: 0.7,
  },
  {
    id: 'cafe', cat: 'food', w: 2, h: 2, cost: 2100, upkeep: 16,
    name: { ru: 'Кафе', en: 'Café' },
    desc: { ru: 'Завтраки и лёгкие обеды', en: 'Breakfast and light lunch' },
    needs: { hunger: 70, energy: 15 }, price: 13, cap: 6, useMin: 22, quality: 3, litter: 0.5, wearPerUse: 0.5,
  },
  {
    id: 'beachbar', cat: 'food', w: 2, h: 2, cost: 2400, upkeep: 20,
    name: { ru: 'Пляжный бар', en: 'Beach bar' },
    desc: { ru: 'Коктейли и веселье (иногда слишком)', en: 'Cocktails and fun (sometimes too much)' },
    needs: { thirst: 60, fun: 25 }, price: 9, cap: 5, useMin: 25, quality: 2, litter: 1.2, wearPerUse: 0.8,
    drink: true, night: true,
  },
  {
    id: 'restaurant', cat: 'food', w: 3, h: 3, cost: 5600, upkeep: 38,
    name: { ru: 'Ресторан', en: 'Restaurant' },
    desc: { ru: 'Ужины при свечах, 4★', en: 'Candle-lit dinners, 4★' },
    needs: { hunger: 90, fun: 15 }, price: 28, cap: 8, useMin: 40, quality: 4, litter: 0.3, wearPerUse: 0.5,
    night: true,
  },
  // ---- Развлечения ----
  {
    id: 'loungers', cat: 'fun', w: 2, h: 2, cost: 800, upkeep: 5,
    name: { ru: 'Шезлонги', en: 'Sun loungers' },
    desc: { ru: 'Загорать — тоже искусство', en: 'Tanning is an art' },
    needs: { fun: 30, energy: 25 }, price: 6, cap: 4, useMin: 45, quality: 2, litter: 0.1, wearPerUse: 0.3,
    beachOnly: true, sunbathe: true,
  },
  {
    id: 'volley', cat: 'fun', w: 3, h: 2, cost: 1400, upkeep: 8,
    name: { ru: 'Волейбол', en: 'Volleyball court' },
    desc: { ru: 'Пляжный волейбол до заката', en: 'Beach volleyball till sunset' },
    needs: { fun: 55, energy: -15 }, price: 0, cap: 6, useMin: 30, quality: 2, litter: 0.1, wearPerUse: 0.5,
    beachOnly: true,
  },
  {
    id: 'pool', cat: 'fun', w: 3, h: 3, cost: 4200, upkeep: 30,
    name: { ru: 'Бассейн', en: 'Main pool' },
    desc: { ru: 'Большой бассейн с зонтиками', en: 'Big pool with umbrellas' },
    needs: { fun: 45, hygiene: 30, energy: 10 }, price: 5, cap: 10, useMin: 35, quality: 3, litter: 0.2, wearPerUse: 0.6,
  },
  {
    id: 'jacuzzi', cat: 'fun', w: 2, h: 2, cost: 2200, upkeep: 18,
    name: { ru: 'Джакузи', en: 'Jacuzzi' },
    desc: { ru: 'Пузырьки и покой', en: 'Bubbles and bliss' },
    needs: { fun: 30, energy: 35, hygiene: 15 }, price: 9, cap: 4, useMin: 30, quality: 3, litter: 0.05, wearPerUse: 0.5,
  },
  {
    id: 'pedalo', cat: 'fun', w: 2, h: 2, cost: 1300, upkeep: 10,
    name: { ru: 'Прокат водных велосипедов', en: 'Pedalo hire' },
    desc: { ru: 'Катамараны по спокойному морю', en: 'Catamarans on calm water' },
    needs: { fun: 50 }, price: 14, cap: 4, useMin: 35, quality: 2, litter: 0.05, wearPerUse: 0.8,
    waterfront: true,
  },
  {
    id: 'surf', cat: 'fun', w: 2, h: 2, cost: 1800, upkeep: 12,
    name: { ru: 'Прокат сёрфов', en: 'Surf hire' },
    desc: { ru: 'Доски для смелых', en: 'Boards for the brave' },
    needs: { fun: 60 }, price: 20, cap: 3, useMin: 40, quality: 3, litter: 0.05, wearPerUse: 1.0,
    waterfront: true,
  },
  {
    id: 'stage', cat: 'fun', w: 3, h: 2, cost: 3200, upkeep: 22,
    name: { ru: 'Сцена', en: 'Stage' },
    desc: { ru: 'Вечерние шоу с аниматорами', en: 'Evening shows with entertainers' },
    needs: { fun: 60 }, price: 4, cap: 12, useMin: 40, quality: 3, litter: 0.4, wearPerUse: 0.6,
    staffBase: 'entertainer', night: true,
  },
  {
    id: 'disco', cat: 'fun', w: 3, h: 3, cost: 6800, upkeep: 45,
    name: { ru: 'Дискотека', en: 'Disco' },
    desc: { ru: 'Танцы до утра для тусовщиков', en: 'Dance till dawn for party animals' },
    needs: { fun: 70, energy: -10 }, price: 11, cap: 14, useMin: 50, quality: 3, litter: 0.6, wearPerUse: 1.0,
    staffBase: 'entertainer', night: true, noisy: true,
  },
  // ---- Необходимое ----
  {
    id: 'loo', cat: 'need', w: 1, h: 1, cost: 420, upkeep: 5,
    name: { ru: 'Туалет', en: 'Toilets' },
    desc: { ru: 'Самое необходимое', en: 'The bare necessity' },
    needs: { bladder: 100 }, price: 0, cap: 3, useMin: 6, quality: 1, litter: 0.2, wearPerUse: 0.5,
  },
  {
    id: 'shower', cat: 'need', w: 1, h: 1, cost: 340, upkeep: 4,
    name: { ru: 'Душ на пляже', en: 'Beach shower' },
    desc: { ru: 'Смыть соль и песок', en: 'Rinse off salt and sand' },
    needs: { hygiene: 60 }, price: 0, cap: 2, useMin: 7, quality: 1, litter: 0.1, wearPerUse: 0.3,
  },
  {
    id: 'store', cat: 'need', w: 2, h: 2, cost: 1600, upkeep: 12,
    name: { ru: 'Магазин', en: 'General store' },
    desc: { ru: 'Крем от загара, сувениры, мелочи', en: 'Sunscreen, souvenirs, sundries' },
    needs: { fun: 20, hygiene: 15 }, price: 12, cap: 3, useMin: 15, quality: 2, litter: 0.4, wearPerUse: 0.4,
  },
  // ---- Персонал и безопасность ----
  {
    id: 'baywatch', cat: 'safety', w: 1, h: 1, cost: 900, upkeep: 6,
    name: { ru: 'Вышка спасателя', en: 'Lifeguard tower' },
    desc: { ru: 'Осмотренная зона купания', en: 'A supervised swim zone' },
    staffBase: 'lifeguard', cap: 0, beachOnly: true, quality: 0,
  },
  {
    id: 'firstaid', cat: 'safety', w: 2, h: 2, cost: 1200, upkeep: 10,
    name: { ru: 'Медпункт', en: 'First aid' },
    desc: { ru: 'Обгорели? Укусили? Лечим!', en: 'Sunburnt? Stung? We fix!' },
    needs: { energy: 20 }, price: 0, cap: 2, useMin: 15, quality: 2, wearPerUse: 0.3,
  },
  {
    id: 'cleanershack', cat: 'safety', w: 2, h: 2, cost: 700, upkeep: 6,
    name: { ru: 'Сторожка уборщиков', en: "Cleaners' shack" },
    desc: { ru: 'База уборщиков острова', en: 'Base for the island cleaners' },
    staffBase: 'cleaner', cap: 0, quality: 0,
  },
  {
    id: 'security', cat: 'safety', w: 2, h: 2, cost: 1100, upkeep: 8,
    name: { ru: 'Пост охраны', en: 'Security post' },
    desc: { ru: 'Спокойствие в любом баре', en: 'Calm in every bar' },
    staffBase: 'security', cap: 0, quality: 0,
  },
  {
    id: 'workshop', cat: 'safety', w: 2, h: 2, cost: 1500, upkeep: 10,
    name: { ru: 'Мастерская', en: 'Workshop' },
    desc: { ru: 'Механики чинят износ построек', en: 'Mechanics fix building wear' },
    staffBase: 'mechanic', cap: 0, quality: 0,
  },
  // ---- Декор ----
  {
    id: 'palm', cat: 'decor', w: 1, h: 1, cost: 120, upkeep: 0,
    name: { ru: 'Пальма', en: 'Palm tree' },
    desc: { ru: 'Красота и тень', en: 'Beauty and shade' },
    beauty: 3, cap: 0, quality: 0,
  },
  {
    id: 'flowerbed', cat: 'decor', w: 1, h: 1, cost: 90, upkeep: 1,
    name: { ru: 'Клумба', en: 'Flowerbed' },
    desc: { ru: 'Яркие цветы', en: 'Bright flowers' },
    beauty: 2, cap: 0, quality: 0,
  },
  {
    id: 'lamp', cat: 'decor', w: 1, h: 1, cost: 150, upkeep: 1,
    name: { ru: 'Фонарь', en: 'Lamp post' },
    desc: { ru: 'Светло и уютно вечером', en: 'Bright and cosy at night' },
    beauty: 1, light: 24, cap: 0, quality: 0,
  },
];

export const BUILDING_BY_ID = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));

export const PATH_COST = 12; // per tile

// ---- Guest archetypes ----
// weights: preference multipliers per building id (or tag); spendMul: wallet & willingness.
export const ARCHETYPES = [
  {
    id: 'party', emoji: '🎉',
    name: { ru: 'Тусовщик', en: 'Party animal' },
    weights: { beachbar: 2.6, disco: 3.0, stage: 2.0, pool: 1.4, volley: 1.2, cafe: 0.8, loungers: 0.4, jacuzzi: 1.2, restaurant: 0.7, store: 0.5, loo: 1, shower: 0.8, drinks: 1.6, icecream: 1.2, bbq: 1.1, pedalo: 1.1, surf: 1.2, firstaid: 1 },
    drinky: 0.55, spendMul: 1.5, rowdy: 0.5, walkSpeed: 1.1, stayDays: [3, 5], night: true,
    color: '#ff5d8f',
  },
  {
    id: 'sun', emoji: '🕶️',
    name: { ru: 'Солнцепоклонник', en: 'Sun worshipper' },
    weights: { loungers: 3.0, shower: 1.6, drinks: 1.8, icecream: 1.5, cafe: 1.0, pool: 1.1, jacuzzi: 1.3, bbq: 1.0, beachbar: 0.8, disco: 0.3, volley: 0.4, restaurant: 0.8, store: 1.4, loo: 1, surf: 0.5, pedalo: 0.7, stage: 0.5, firstaid: 1.2 },
    drinky: 0.1, spendMul: 1.0, rowdy: 0.05, walkSpeed: 0.9, stayDays: [4, 7], night: false,
    color: '#ffd166',
  },
  {
    id: 'sport', emoji: '🏄',
    name: { ru: 'Спортсмен', en: 'Sporty' },
    weights: { volley: 2.6, surf: 2.8, pedalo: 2.2, pool: 1.8, bbq: 1.8, drinks: 1.5, cafe: 1.2, loungers: 0.7, jacuzzi: 1.5, beachbar: 0.9, disco: 0.8, restaurant: 0.6, store: 0.8, loo: 1, shower: 1.2, stage: 0.7, firstaid: 1 },
    drinky: 0.2, spendMul: 1.25, rowdy: 0.15, walkSpeed: 1.3, stayDays: [3, 6], night: false,
    color: '#06d6a0',
  },
  {
    id: 'family', emoji: '👨‍👩‍👧',
    name: { ru: 'Семья', en: 'Family' },
    weights: { pool: 2.2, cafe: 1.8, icecream: 2.4, pedalo: 1.6, volley: 1.3, loungers: 1.4, bbq: 1.4, drinks: 1.4, store: 1.2, jacuzzi: 0.8, beachbar: 0.5, disco: 0.4, surf: 0.7, restaurant: 1.0, loo: 1.3, shower: 1.1, stage: 1.1, firstaid: 1.3 },
    drinky: 0.08, spendMul: 0.9, rowdy: 0.03, walkSpeed: 0.85, stayDays: [5, 8], night: false,
    color: '#48cae4',
  },
  {
    id: 'quiet', emoji: '📖',
    name: { ru: 'Тихоня', en: 'Quiet type' },
    weights: { jacuzzi: 2.4, restaurant: 2.2, cafe: 1.5, store: 1.1, loungers: 1.6, pedalo: 1.0, pool: 0.9, drinks: 1.0, icecream: 0.9, bbq: 0.6, volley: 0.3, surf: 0.4, beachbar: 0.5, disco: 0.15, stage: 0.6, loo: 1, shower: 1.0, firstaid: 1 },
    drinky: 0.05, spendMul: 1.1, rowdy: 0.02, walkSpeed: 0.8, stayDays: [4, 7], night: false,
    hatesNoise: true,
    color: '#b8b8ff',
  },
];

export const ARCH_BY_ID = Object.fromEntries(ARCHETYPES.map(a => [a.id, a]));

// ---- Staff ----
export const STAFF = [
  { id: 'cleaner', wage: 20, base: 'cleanershack', emoji: '🧹',
    desc: { ru: 'Убирает мусор и грязь по острову', en: 'Cleans litter and dirt around the island' } },
  { id: 'mechanic', wage: 32, base: 'workshop', emoji: '🔧',
    desc: { ru: 'Чинит износ построек', en: 'Repairs building wear' } },
  { id: 'lifeguard', wage: 26, base: 'baywatch', emoji: '🛟',
    desc: { ru: 'Следит за купающимися, спасает тонущих', en: 'Watches swimmers, rescues the drowning' } },
  { id: 'security', wage: 28, base: 'security', emoji: '👮',
    desc: { ru: 'Усмиряет дебоширов у баров', en: 'Handles brawlers near bars' } },
  { id: 'entertainer', wage: 24, base: 'stage', emoji: '🎤',
    desc: { ru: 'Ведёт шоу на сцене и в дискотеке', en: 'Hosts shows at the stage and disco' } },
];

export const STAFF_BY_ID = Object.fromEntries(STAFF.map(s => [s.id, s]));

export const FIRST_NAMES = ['Alex', 'Sam', 'Kim', 'Leo', 'Mia', 'Max', 'Zoe', 'Ben', 'Eva', 'Tom', 'Ira', 'Dana', 'Oleg', 'Lucy', 'Pedro', 'Nina', 'Ravi', 'Sara', 'Kurt', 'Yara'];
export const LAST_NAMES = ['Sun', 'Wave', 'Palm', 'Reef', 'Breeze', 'Shell', 'Coral', 'Sands', 'Tide', 'Lagoon'];
