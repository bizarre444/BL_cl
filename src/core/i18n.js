// Localization: Russian default, English toggle.
// L(x) resolves {ru, en} objects or plain strings; t(key) looks up the dict.

import { bus } from './bus.js';

const dict = {
  // Menu
  'menu.tagline': { ru: 'Построй райский курорт. Гости сами расскажут, хорош ли он.', en: 'Build a paradise resort. Your guests will tell you how good it is.' },
  'menu.continue': { ru: 'Продолжить игру', en: 'Continue game' },
  'menu.note': { ru: 'Переосмысление классического курортного симулятора 2002 года: полностью новый код и графика.', en: 'A reimagining of the classic 2002 resort sim: entirely new code and art.' },
  'menu.diff': { ru: 'Сложность', en: 'Difficulty' },
  'menu.seed': { ru: 'Остров №', en: 'Island #' },
  // Categories
  'cat.accom': { ru: 'Проживание', en: 'Stay' },
  'cat.food': { ru: 'Еда и напитки', en: 'Food & drink' },
  'cat.fun': { ru: 'Развлечения', en: 'Fun' },
  'cat.need': { ru: 'Необходимое', en: 'Essentials' },
  'cat.safety': { ru: 'Персонал и безопасность', en: 'Staff & safety' },
  'cat.decor': { ru: 'Декор', en: 'Decor' },
  // HUD
  'hud.cash': { ru: 'Наличные', en: 'Cash' },
  'hud.rating': { ru: 'Рейтинг', en: 'Rating' },
  'hud.guests': { ru: 'Гости', en: 'Guests' },
  'hud.staff': { ru: 'Персонал', en: 'Staff' },
  'hud.day': { ru: 'День', en: 'Day' },
  // Weather
  'w.sun': { ru: 'Солнечно', en: 'Sunny' },
  'w.cloud': { ru: 'Облачно', en: 'Cloudy' },
  'w.rain': { ru: 'Дождь', en: 'Rain' },
  'w.storm': { ru: 'Шторм', en: 'Storm' },
  // Build / tools
  'tool.select': { ru: 'Осмотр', en: 'Inspect' },
  'tool.place': { ru: 'Постройка', en: 'Build' },
  'tool.demolish': { ru: 'Снос', en: 'Demolish' },
  'tool.path': { ru: 'Дорожка', en: 'Path' },
  'demolish.refund': { ru: 'Снос: возвращено', en: 'Demolished: refunded' },
  'build.noMoney': { ru: 'Не хватает денег', en: 'Not enough cash' },
  'build.blocked': { ru: 'Здесь строить нельзя', en: "Can't build here" },
  'build.built': { ru: 'Построено:', en: 'Built:' },
  // Inspect panel
  'insp.guest': { ru: 'Гость', en: 'Guest' },
  'insp.mood': { ru: 'Настроение', en: 'Mood' },
  'insp.money': { ru: 'Кошелёк', en: 'Wallet' },
  'insp.needs': { ru: 'Потребности', en: 'Needs' },
  'insp.wear': { ru: 'Износ', en: 'Wear' },
  'insp.users': { ru: 'Посетители', en: 'Visitors' },
  'insp.closed': { ru: 'ЗАКРЫТО (нужен ремонт)', en: 'CLOSED (needs repair)' },
  'insp.demolish': { ru: 'Снести', en: 'Demolish' },
  'insp.upkeep': { ru: 'Обслуживание/день', en: 'Upkeep/day' },
  'insp.price': { ru: 'Цена услуги', en: 'Service price' },
  'insp.quality': { ru: 'Класс', en: 'Quality' },
  // Needs
  'need.energy': { ru: 'Отдых', en: 'Rest' },
  'need.hunger': { ru: 'Голод', en: 'Hunger' },
  'need.thirst': { ru: 'Жажда', en: 'Thirst' },
  'need.bladder': { ru: 'Туалет', en: 'Toilet' },
  'need.hygiene': { ru: 'Гигиена', en: 'Hygiene' },
  'need.fun': { ru: 'Развлечения', en: 'Fun' },
  // Thoughts
  'th.hungry': { ru: '«Хочу есть!»', en: '"I am hungry!"' },
  'th.thirsty': { ru: '«Пить хочу!»', en: '"So thirsty!"' },
  'th.bored': { ru: '«Скучно-о…»', en: '"Boooring…"' },
  'th.tired': { ru: '«Спать…»', en: '"So sleepy…"' },
  'th.toilet': { ru: '«Где туалет?!»', en: '"Where is the toilet?!"' },
  'th.dirty': { ru: '«Тут грязно…»', en: '"It is dirty here…"' },
  'th.happy': { ru: '«Отпуск удался!»', en: '"Best holiday ever!"' },
  'th.angry': { ru: '«Ужасный курорт!»', en: '"Awful resort!"' },
  'th.noRoom': { ru: '«Нет мест?!»', en: '"No rooms?!"' },
  // Finance
  'fin.title': { ru: 'Финансы', en: 'Finances' },
  'fin.income': { ru: 'Доходы', en: 'Income' },
  'fin.upkeep': { ru: 'Обслуживание', en: 'Upkeep' },
  'fin.wages': { ru: 'Зарплаты', en: 'Wages' },
  'fin.net': { ru: 'Итого', en: 'Net' },
  'fin.today': { ru: 'Сегодня', en: 'Today' },
  'fin.history': { ru: 'Последние дни', en: 'Recent days' },
  // Staff panel
  'staff.title': { ru: 'Персонал', en: 'Staff' },
  'staff.wage': { ru: 'в день', en: '/day' },
  'staff.needBase': { ru: 'Нужно здание:', en: 'Requires building:' },
  'staff.hired': { ru: 'Нанято', en: 'Hired' },
  // Objectives
  'obj.title': { ru: 'Цели', en: 'Objectives' },
  'obj.done': { ru: 'выполнено', en: 'done' },
  'obj.deadline': { ru: 'Срок: день', en: 'Deadline: day' },
  'obj.won': { ru: 'Победа! Все цели выполнены.', en: 'Victory! All objectives complete.' },
  'obj.lostCash': { ru: 'Курорт банкрот…', en: 'The resort is bankrupt…' },
  'obj.lostTime': { ru: 'Время вышло. Цели не выполнены.', en: "Time's up. Objectives not met." },
  'obj.continueAnyWay': { ru: 'Играть дальше', en: 'Keep playing' },
  'obj.toMenu': { ru: 'В меню', en: 'To menu' },
  // Messages / events
  'msg.arrivals': { ru: 'Паром привёз гостей:', en: 'Ferry brought guests:' },
  'msg.leave': { ru: 'Гость уехал:', en: 'Guest left:' },
  'msg.review': { ru: 'Отзыв:', en: 'Review:' },
  'msg.noRoom': { ru: 'Гость уехал злым: нет мест!', en: 'Guest left angry: no rooms!' },
  'msg.shark': { ru: 'АКУЛА! Пляж закрыт.', en: 'SHARK! Beach closed.' },
  'msg.sharkGone': { ru: 'Акула уплыла, пляж открыт.', en: 'The shark swam away, beach open.' },
  'msg.jelly': { ru: 'Медузы! Купающиеся вышли из воды.', en: 'Jellyfish! Swimmers got out of the water.' },
  'msg.rescued': { ru: 'Спасатель вытащил тонущего гостя.', en: 'Lifeguard rescued a drowning guest.' },
  'msg.drowned': { ru: 'Гость утонул! Позор курорту.', en: 'A guest drowned! Resort scandal.' },
  'msg.fight': { ru: 'Драка у бара! Нужна охрана.', en: 'Bar fight! Security needed.' },
  'msg.fightStop': { ru: 'Охрана прекратила дебош.', en: 'Security stopped the ruckus.' },
  'msg.wearClosed': { ru: 'Закрыто на ремонт:', en: 'Closed for repairs:' },
  'msg.repaired': { ru: 'Отремонтировано:', en: 'Repaired:' },
  'msg.dirty': { ru: 'На острове грязно — гости недовольны!', en: 'The island is dirty — guests are unhappy!' },
  'msg.newDay': { ru: 'День', en: 'Day' },
  'msg.saved': { ru: 'Игра сохранена', en: 'Game saved' },
  'msg.loaded': { ru: 'Игра загружена', en: 'Game loaded' },
  'msg.noSave': { ru: 'Нет сохранений', en: 'No saves' },
  'msg.autosave': { ru: 'Автосохранение…', en: 'Autosaving…' },
  'msg.shot': { ru: 'Фото сохранено', en: 'Photo saved' },
  'msg.staffNeedBase': { ru: 'Сначала постройте:', en: 'Build this first:' },
  'msg.stormDamage': { ru: 'Шторм повредил постройки!', en: 'Storm damaged buildings!' },
  'msg.bankruptWarn': { ru: 'Касса пуста! Следите за расходами.', en: 'Cash is negative! Watch your spending.' },
  // Help
  'help.title': { ru: 'Как играть', en: 'How to play' },
  'help.body': {
    ru: '<p><b>Цель</b> — превратить дикий остров в процветающий курорт и выполнить цели сценария.</p>'
      + '<h3>Управление</h3><ul>'
      + '<li>ЛКМ — выбрать/построить, ПКМ — отмена инструмента</li>'
      + '<li>Колесо — зум, WASD/стрелки или тащить мышью — камера</li>'
      + '<li>Space — пауза, 1/2/3 — скорость</li></ul>'
      + '<h3>Советы</h3><ul>'
      + '<li>Гости приезжают на пароме: им нужны жильё, еда, питьё, туалет и развлечения.</li>'
      + '<li>Рейтинг (звёзды) растёт от хороших отзывов — чем выше, тем больше гостей.</li>'
      + '<li>Уборщики убирают мусор, механики чинят износ, спасатели следят за пляжем, охрана усмиряет дебоширов, аниматоры зажигают на сцене и в дискотеке.</li>'
      + '<li>Штормы, акулы и медузы — часть жизни курорта. Будьте готовы.</li></ul>',
    en: '<p><b>Goal</b> — turn a wild island into a thriving resort and complete the scenario objectives.</p>'
      + '<h3>Controls</h3><ul>'
      + '<li>LMB — select/build, RMB — cancel tool</li>'
      + '<li>Wheel — zoom, WASD/arrows or drag — camera</li>'
      + '<li>Space — pause, 1/2/3 — speed</li></ul>'
      + '<h3>Tips</h3><ul>'
      + '<li>Guests arrive by ferry: they need rooms, food, drinks, toilets and fun.</li>'
      + '<li>The star rating grows with good reviews — higher rating brings more guests.</li>'
      + '<li>Cleaners pick litter, mechanics fix wear, lifeguards watch the beach, security handles brawlers, entertainers light up the stage and disco.</li>'
      + '<li>Storms, sharks and jellyfish are part of resort life. Be ready.</li></ul>'
  },
  'help.close': { ru: 'Понятно', en: 'Got it' },
  // Scenario end
  'scen.need': { ru: 'Осталось', en: 'Remaining' },
  'scen.sandboxName': { ru: 'Песочница', en: 'Sandbox' },
  'scen.sandboxDesc': { ru: 'Без целей и ограничений. Стройте мечту.', en: 'No goals, no limits. Build your dream.' },
  // Units
  'u.perNight': { ru: 'за ночь', en: 'per night' },
  'u.waterfront': { ru: 'у воды', en: 'waterfront' },
  'u.beach': { ru: 'на песке', en: 'on sand' },
  // Staff roles
  'role.cleaner': { ru: 'Уборщик', en: 'Cleaner' },
  'role.mechanic': { ru: 'Механик', en: 'Mechanic' },
  'role.lifeguard': { ru: 'Спасатель', en: 'Lifeguard' },
  'role.security': { ru: 'Охранник', en: 'Security' },
  'role.entertainer': { ru: 'Аниматор', en: 'Entertainer' },
};

let lang = localStorage.getItem('blcl_lang') || 'ru';

export function t(key) {
  const entry = dict[key];
  if (!entry) return key;
  return entry[lang] ?? entry.ru ?? key;
}

// Resolve localized object: {ru, en} | string
export function L(x) {
  if (x == null) return '';
  if (typeof x === 'string') return x;
  return x[lang] ?? x.ru ?? x.en ?? '';
}

export function getLang() { return lang; }

export function setLang(l) {
  if (l === lang) return;
  lang = l;
  localStorage.setItem('blcl_lang', l);
  bus.emit('lang:changed', l);
}
