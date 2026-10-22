// Save/load: JSON snapshot in localStorage (manual + autosave slots).

const KEY = 'blcl_save';
const AUTO_KEY = 'blcl_auto';

export function saveGame(state, { auto = false } = {}) {
  try {
    localStorage.setItem(auto ? AUTO_KEY : KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.error('save failed', e);
    return false;
  }
}

export function loadGame({ auto = false } = {}) {
  try {
    const raw = localStorage.getItem(auto ? AUTO_KEY : KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('load failed', e);
    return null;
  }
}

export function hasSave({ auto = false } = {}) {
  return !!localStorage.getItem(auto ? AUTO_KEY : KEY);
}
