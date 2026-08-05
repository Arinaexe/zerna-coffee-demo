(async () => {
  const text = (value) => String(value ?? '');
  const escapeHtml = (value) => text(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const setText = (selector, value) => { const element = document.querySelector(selector); if (element && value !== undefined) element.textContent = value; };
  const menuCard = (item) => `<div class="product-card" data-category="${escapeHtml(item.category)}"><div class="product-image"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" /><div class="product-description">${escapeHtml(item.description)}</div></div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.price)}</p><div class="card-tags">${(item.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div></div>`;
  try {
    const response = await fetch('content.json', { cache: 'no-store' });
    const content = response.ok ? await response.json() : {};
    if (!Object.keys(content).length) return;
    const hero = content.hero || {}; setText('[data-content="hero.eyebrow"]', hero.eyebrow); setText('[data-content="hero.title"]', hero.title); setText('[data-content="hero.description"]', hero.description); setText('[data-content="hero.cta"]', hero.cta);
    const roast = content.roast || {}; setText('[data-content="roast.origin"]', roast.origin);
    const meta = document.querySelector('[data-content="roast.meta"]'); if (meta && roast.processing !== undefined) meta.innerHTML = `Обработка: ${escapeHtml(roast.processing)} · Обжарено: <span id="batchDate">…</span>`;
    const tags = document.querySelector('[data-content="roast.tags"]'); if (tags && Array.isArray(roast.tags)) tags.innerHTML = roast.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
    const contacts = content.contacts || {}; ['address', 'hours', 'telegram'].forEach((key) => setText(`[data-content="contacts.${key}"]`, contacts[key]));
    const telegramLink = document.querySelector('[data-contact-link="telegram"]'); if (telegramLink && contacts.telegram) telegramLink.href = `https://t.me/${text(contacts.telegram).replace(/^@/, '')}`;
    if (Array.isArray(content.menu)) document.querySelectorAll('.menu-cat-item').forEach((section) => { const items = content.menu.filter((item) => item.category === section.dataset.cat); const catalog = section.querySelector('.catalog'); const count = section.querySelector('.menu-cat-count'); if (catalog) catalog.innerHTML = items.map(menuCard).join(''); if (count) count.textContent = items.length; });
  } catch (error) { console.warn('Не удалось загрузить содержимое сайта.', error); }
})();
