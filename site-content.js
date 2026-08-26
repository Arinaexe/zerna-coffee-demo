'use strict';

window.ZernaContentReady = (async () => {
  const text = (value) => String(value ?? '').trim();
  const setText = (selector, value) => {
    const element = document.querySelector(selector);
    if (element && value !== undefined) element.textContent = text(value);
  };
  const make = (tag, className, value) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = text(value);
    return element;
  };
  const categories = new Set(['black', 'milk', 'cold', 'tea', 'drinks', 'dessert', 'food']);
  const safeImage = (value) => {
    const path = text(value).replace(/\\/g, '/');
    return /^images\/[a-z0-9._/-]+$/i.test(path) && !path.includes('..') ? path : 'images/beans.jpg';
  };
  const safeTelegram = (value) => text(value)
    .replace(/^https?:\/\/t\.me\//i, '')
    .replace(/^@/, '')
    .replace(/[^a-z0-9_]/gi, '')
    .slice(0, 32);

  const makeMenuCard = (item) => {
    const category = categories.has(text(item.category)) ? text(item.category) : 'black';
    const card = make('div', 'product-card');
    card.dataset.category = category;
    const imageWrap = make('div', 'product-image');
    const picture = make('img');
    picture.src = safeImage(item.image);
    picture.alt = text(item.name) || 'Позиция меню';
    picture.loading = 'lazy';
    imageWrap.append(picture, make('div', 'product-description', item.description));
    const tags = make('div', 'card-tags');
    (Array.isArray(item.tags) ? item.tags : []).slice(0, 12).forEach((tag) => tags.append(make('span', '', tag)));
    card.append(imageWrap, make('h3', '', item.name), make('p', '', item.price), tags);
    return card;
  };

  try {
    const response = await fetch('content.json', { cache: 'no-store', credentials: 'same-origin' });
    const content = response.ok ? await response.json() : {};
    if (!content || typeof content !== 'object' || !Object.keys(content).length) return;

    const hero = content.hero || {};
    setText('[data-content="hero.eyebrow"]', hero.eyebrow);
    setText('[data-content="hero.title"]', hero.title);
    setText('[data-content="hero.description"]', hero.description);
    setText('[data-content="hero.cta"]', hero.cta);

    const roast = content.roast || {};
    setText('[data-content="roast.origin"]', roast.origin);
    const meta = document.querySelector('[data-content="roast.meta"]');
    if (meta && roast.processing !== undefined) {
      const dateText = document.getElementById('batchDate')?.textContent || '…';
      meta.textContent = `Обработка: ${text(roast.processing)} · Обжарено: `;
      const dateNode = make('span', '', dateText);
      dateNode.id = 'batchDate';
      meta.append(dateNode);
    }
    const tags = document.querySelector('[data-content="roast.tags"]');
    if (tags && Array.isArray(roast.tags)) {
      tags.textContent = '';
      roast.tags.slice(0, 12).forEach((tag) => tags.append(make('span', '', tag)));
    }

    const contacts = content.contacts || {};
    ['address', 'hours', 'telegram'].forEach((key) => setText(`[data-content="contacts.${key}"]`, contacts[key]));
    const addressLink = document.querySelector('[data-contact-link="address"]');
    if (addressLink && contacts.address) addressLink.href = `https://yandex.ru/maps/?text=${encodeURIComponent(text(contacts.address))}`;
    const telegramLink = document.querySelector('[data-contact-link="telegram"]');
    const username = safeTelegram(contacts.telegram);
    if (telegramLink && username) telegramLink.href = `https://t.me/${username}`;

    if (Array.isArray(content.menu)) {
      document.querySelectorAll('.menu-cat-item').forEach((section) => {
        const catalog = section.querySelector('.catalog');
        const items = content.menu
          .filter((item) => categories.has(text(item?.category)) && text(item.category) === section.dataset.cat)
          .slice(0, 120);
        if (catalog) {
          catalog.textContent = '';
          items.forEach((item) => catalog.append(makeMenuCard(item || {})));
        }
        const count = section.querySelector('.menu-cat-count');
        if (count) count.textContent = String(items.length);
      });
    }
  } catch (error) {
    console.warn('Не удалось загрузить локальный файл содержимого сайта.', error);
  }
})();
