// Tema chiaro/scuro. La preferenza esplicita vince sul sistema e viene
// applicata anche in index.html, prima del primo paint, per evitare il flash.
const STORAGE_KEY = 'theme';

export function systemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function currentTheme() {
  return localStorage.getItem(STORAGE_KEY) || systemTheme();
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
}
