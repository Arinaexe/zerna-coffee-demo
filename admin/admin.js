const saveState = document.getElementById('saveState');
const menuList = document.getElementById('menuList');
const template = document.getElementById('menuItemTemplate');
let content;
let dirty = false;

const getPath = (object, path) => path.split('.').reduce((value, key) => value?.[key], object);
const setPath = (object, path, value) => {
  const keys = path.split('.'); let cursor = object;
  keys.slice(0, -1).forEach((key) => { cursor[key] ||= {}; cursor = cursor[key]; });
  cursor[keys.at(-1)] = value;
};
const markDirty = () => { dirty = true; saveState.textContent = 'Есть несохранённые изменения'; saveState.classList.add('is-dirty'); };
const markSaved = () => { dirty = false; saveState.textContent = 'Файл готов к скачиванию'; saveState.classList.remove('is-dirty'); };

async function defaultContent() {
  const response = await fetch('../index.html', { cache: 'no-store' });
  if (!response.ok) throw new Error('Не удалось прочитать главную страницу');
  const documentFromSite = new DOMParser().parseFromString(await response.text(), 'text/html');
  const value = (selector) => documentFromSite.querySelector(selector)?.textContent.trim() || '';
  const telegramHref = [...documentFromSite.querySelectorAll('a[href]')]
    .map((link) => link.getAttribute('href') || '')
    .find((href) => /^https?:\/\/t\.me\//i.test(href)) || 'https://t.me/mercy_exe';
  return {
    hero: { eyebrow: value('.hero-eyebrow'), title: value('.hero h1'), description: value('.hero p'), cta: value('.hero-cta') },
    roast: { origin: value('.batch-origin'), processing: value('.batch-meta').replace(/^Обработка:\s*/, '').replace(/\s*·\s*Обжарено:.*$/, ''), tags: [...documentFromSite.querySelectorAll('.flavor-tags span')].map((tag) => tag.textContent.trim()) },
    contacts: { address: value('[data-content="contacts.address"]'), hours: value('[data-content="contacts.hours"]'), telegram: '@' + telegramHref.replace(/^https?:\/\/t\.me\//i, '').replace(/^@/, '') },
    menu: [...documentFromSite.querySelectorAll('.menu-cat-item')].flatMap((section) => [...section.querySelectorAll('.product-card')].map((card) => ({
      category: section.dataset.cat, name: card.querySelector('h3')?.textContent.trim() || '', price: card.querySelector('p')?.textContent.trim() || '',
      image: card.querySelector('img')?.getAttribute('src') || '', description: card.querySelector('.product-description')?.textContent.trim() || '',
      tags: [...card.querySelectorAll('.card-tags span')].map((tag) => tag.textContent.trim())
    })))
  };
}

function fillForm() {
  document.querySelectorAll('[data-path]').forEach((field) => {
    const storedValue = getPath(content, field.dataset.path);
    const value = field.dataset.path === 'contacts.telegram' && !storedValue ? '@mercy_exe' : storedValue;
    if (field.dataset.path === 'contacts.telegram' && !storedValue) content.contacts.telegram = value;
    field.value = field.hasAttribute('data-list') ? (value || []).join(', ') : (value || '');
  });
  renderMenu(); markSaved();
}

function renderMenu() {
  menuList.textContent = '';
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
  const fallback = await defaultContent();
  content = {
    hero: { ...fallback.hero, ...(saved.hero || {}) },
    roast: { ...fallback.roast, ...(saved.roast || {}) },
    contacts: { ...fallback.contacts, ...(saved.contacts || {}) },
    menu: Array.isArray(saved.menu) ? saved.menu : fallback.menu
  };
  fillForm();
}

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

document.getElementById('saveButton').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'content.json';
  link.click();
  URL.revokeObjectURL(link.href);
  dirty = false;
  saveState.textContent = 'Файл скачан. Замените content.json в GitHub';
  saveState.classList.remove('is-dirty');
});

window.addEventListener('beforeunload', (event) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
loadContent().catch((error) => { saveState.textContent = `Не удалось открыть редактор: ${error.message}`; });
