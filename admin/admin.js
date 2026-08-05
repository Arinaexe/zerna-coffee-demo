const github = { owner: 'Arinaexe', repo: 'zerna-coffee-demo', branch: 'main' };
const loginScreen = document.getElementById('loginScreen');
const appShell = document.getElementById('appShell');
const message = document.getElementById('loginMessage');
const saveState = document.getElementById('saveState');
const menuList = document.getElementById('menuList');
const template = document.getElementById('menuItemTemplate');
let content;
let dirty = false;
let githubToken = sessionStorage.getItem('zerna_github_token') || '';

const getPath = (object, path) => path.split('.').reduce((value, key) => value?.[key], object);
const setPath = (object, path, value) => {
  const keys = path.split('.'); let cursor = object;
  keys.slice(0, -1).forEach((key) => { cursor[key] ||= {}; cursor = cursor[key]; });
  cursor[keys.at(-1)] = value;
};
const markDirty = () => { dirty = true; saveState.textContent = 'Есть несохранённые изменения'; saveState.classList.add('is-dirty'); };
const markSaved = () => { dirty = false; saveState.textContent = 'Все изменения сохранены'; saveState.classList.remove('is-dirty'); };
const encode = (value) => btoa(unescape(encodeURIComponent(value)));
const decode = (value) => decodeURIComponent(escape(atob(value.replace(/\n/g, ''))));

async function githubApi(path, { method = 'GET', body } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`https://api.github.com${path}`, {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || 'GitHub не выполнил запрос.');
    return result;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('GitHub не ответил за 12 секунд. Проверьте подключение.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function defaultContent() {
  const response = await fetch('../index.html', { cache: 'no-store' });
  const documentFromSite = new DOMParser().parseFromString(await response.text(), 'text/html');
  const value = (selector) => documentFromSite.querySelector(selector)?.textContent.trim() || '';
  return {
    hero: { eyebrow: value('.hero-eyebrow'), title: value('.hero h1'), description: value('.hero p'), cta: value('.hero-cta') },
    roast: { origin: value('.batch-origin'), processing: value('.batch-meta').replace(/^Обработка:\s*/, '').replace(/\s*·\s*Обжарено:.*$/, ''), tags: [...documentFromSite.querySelectorAll('.flavor-tags span')].map((tag) => tag.textContent.trim()) },
    contacts: { address: value('.contacts-grid .contact-card:nth-child(1) .contact-value'), hours: value('.contacts-grid .contact-card:nth-child(2) .contact-value'), telegram: value('.contacts-grid .contact-card:nth-child(3) .contact-value') },
    menu: [...documentFromSite.querySelectorAll('.menu-cat-item')].flatMap((section) => [...section.querySelectorAll('.product-card')].map((card) => ({
      category: section.dataset.cat, name: card.querySelector('h3')?.textContent.trim() || '', price: card.querySelector('p')?.textContent.trim() || '',
      image: card.querySelector('img')?.getAttribute('src') || '', description: card.querySelector('.product-description')?.textContent.trim() || '',
      tags: [...card.querySelectorAll('.card-tags span')].map((tag) => tag.textContent.trim())
    })))
  };
}

function fillForm() {
  document.querySelectorAll('[data-path]').forEach((field) => {
    const value = getPath(content, field.dataset.path);
    field.value = field.hasAttribute('data-list') ? (value || []).join(', ') : (value || '');
  });
  renderMenu(); markSaved();
}

function renderMenu() {
  menuList.innerHTML = '';
  content.menu.forEach((item, index) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.index = index;
    node.querySelectorAll('[data-menu]').forEach((field) => {
      const key = field.dataset.menu;
      field.value = key === 'tags' ? (item.tags || []).join(', ') : (item[key] || '');
    });
    menuList.append(node);
  });
}

async function loadContent() {
  const response = await fetch('../content.json', { cache: 'no-store' });
  const saved = response.ok ? await response.json() : {};
  content = Object.keys(saved).length ? saved : await defaultContent();
  fillForm();
}

async function showApp() {
  loginScreen.hidden = true; appShell.hidden = false;
  try { await loadContent(); } catch (error) { alert(`Не удалось загрузить контент: ${error.message}`); }
}

document.getElementById('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget); githubToken = form.get('password').trim();
  if (!githubToken) { message.textContent = 'Вставьте токен GitHub.'; return; }
  message.textContent = 'Проверяем доступ…';
  try {
    await githubApi('/user');
    sessionStorage.setItem('zerna_github_token', githubToken);
    showApp();
  } catch (error) {
    console.error('GitHub login failed', error);
    message.textContent = error.message === 'Bad credentials'
      ? 'Токен GitHub не распознан. Создайте новый токен с правом Contents: Read and write.'
      : error.message || 'Не удалось проверить токен GitHub.';
  }
});

document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('is-active', item === button));
  document.querySelectorAll('.editor-panel').forEach((panel) => panel.classList.toggle('is-active', panel.dataset.editor === button.dataset.panel));
  document.getElementById('sectionTitle').textContent = ({ home: 'Главная страница', menu: 'Меню', contacts: 'Контакты' })[button.dataset.panel];
}));

document.addEventListener('input', (event) => {
  const field = event.target;
  if (field.dataset.path) setPath(content, field.dataset.path, field.hasAttribute('data-list') ? field.value.split(',').map((item) => item.trim()).filter(Boolean) : field.value);
  if (field.dataset.menu) {
    const item = content.menu[Number(field.closest('.menu-item-editor').dataset.index)];
    item[field.dataset.menu] = field.dataset.menu === 'tags' ? field.value.split(',').map((tag) => tag.trim()).filter(Boolean) : field.value;
  }
  if (field.dataset.path || field.dataset.menu) markDirty();
});

document.getElementById('addMenuItem').addEventListener('click', () => { content.menu.push({ name: 'Новая позиция', price: '', category: 'black', image: '', description: '', tags: [] }); renderMenu(); markDirty(); });
menuList.addEventListener('click', (event) => { if (event.target.closest('.delete-item')) { content.menu.splice(Number(event.target.closest('.menu-item-editor').dataset.index), 1); renderMenu(); markDirty(); } });

document.getElementById('saveButton').addEventListener('click', async () => {
  const button = document.getElementById('saveButton'); button.disabled = true; button.textContent = 'Сохраняем…';
  try {
    const path = `/repos/${github.owner}/${github.repo}/contents/content.json?ref=${github.branch}`;
    const current = await githubApi(path);
    await githubApi(`/repos/${github.owner}/${github.repo}/contents/content.json`, {
      method: 'PUT',
      body: { message: 'Обновить содержимое сайта из админ-панели', content: encode(JSON.stringify(content, null, 2)), sha: current.sha, branch: github.branch }
    });
    markSaved();
    saveState.textContent = 'Сохранено. Сайт обновится примерно через минуту';
  } catch (error) {
    alert(`Не удалось сохранить: ${error.message}`);
  } finally {
    button.disabled = false; button.innerHTML = 'Сохранить <span>⌘S</span>';
  }
});

document.getElementById('signOut').addEventListener('click', () => { sessionStorage.removeItem('zerna_github_token'); location.reload(); });
window.addEventListener('beforeunload', (event) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
document.addEventListener('keydown', (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); document.getElementById('saveButton').click(); } });

if (githubToken) githubApi('/user').then(showApp).catch(() => sessionStorage.removeItem('zerna_github_token'));
