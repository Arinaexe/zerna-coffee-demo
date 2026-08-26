'use strict';

(async () => {
  const app = window.ZernaApp;
  if (!app) return;
  await (window.ZernaContentReady || Promise.resolve());

  const normalize = (value) => value.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').trim();
  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };

  const sweetWords = ['шоколад', 'карамел', 'ванил', 'сахар', 'мед', 'слив', 'десерт', 'манго', 'банан', 'клубник', 'ягод'];
  const acidWords = ['цитрус', 'ягод', 'жасмин', 'кислин', 'лайм', 'апельсин', 'клюкв', 'облепих'];
  const bodyWords = ['плотн', 'густ', 'слив', 'крем', 'бархат', 'молочн'];

  const scoreFromText = (text, words, positive = 78, fallback = 34) => words.some((word) => text.includes(word)) ? positive : fallback;
  const cards = [...document.querySelectorAll('.product-card')].map((element, index) => {
    const name = element.querySelector('h3')?.textContent.trim() || `Позиция ${index + 1}`;
    const priceText = element.querySelector(':scope > p')?.textContent || '0';
    const price = Number.parseInt(priceText.replace(/\D/g, ''), 10) || 0;
    const description = element.querySelector('.product-description')?.textContent.trim() || '';
    const tags = [...element.querySelectorAll('.card-tags span')].map((item) => item.textContent.trim());
    const category = element.dataset.category || '';
    const nameText = normalize(name);
    const text = normalize([name, description, ...tags].join(' '));
    const id = `menu-${index + 1}`;
    element.dataset.itemId = id;

    let strength = category === 'black' ? 76 : category === 'milk' ? 54 : category === 'cold' ? 48 : category === 'tea' ? 26 : 16;
    if (/эспрессо|ристретто|турецк/.test(text)) strength = 92;
    if (/американо|фильтр|v60/.test(text)) strength = 68;
    const sweetness = scoreFromText(text, sweetWords, 78, category === 'dessert' ? 92 : 32);
    const acidity = scoreFromText(text, acidWords, 80, /кофе|чай/.test(text) ? 38 : 20);
    const body = scoreFromText(text, bodyWords, 82, category === 'black' ? 58 : 42);

    return {
      element,
      id,
      name,
      price,
      description,
      tags,
      category,
      text,
      profile: { strength, sweetness, acidity, body },
      flags: {
        decaf: /^(какао классическое|горячий шоколад|смузи|лимонад|апельсиновый фреш|морс|молочный коктейль|иван-чай|чай каркаде|чай с чабрецом)/.test(nameText) || text.includes('без кофеина'),
        plant: /овсян|миндальн|кокосов|растительн/.test(text),
        budget: price <= 250,
        cold: category === 'cold' || /холод|лед|айс|фраппе|смузи|лимонад|морс|фреш/.test(text),
        savory: !/десерт|слад|торт|чизкейк|брауни|эклер|макарон|маффин|синнабон|чурро|какао|шоколад|смузи|коктейль/.test(text)
      }
    };
  });

  const drinks = cards.filter((item) => !['food', 'dessert'].includes(item.category));
  const favorites = new Set(app.storage.get('favorites', []));
  const compareSelection = [];

  const getCategoryItem = (card) => card.element.closest('.menu-cat-item');
  const revealCard = (card, focus = true) => {
    const categoryItem = getCategoryItem(card);
    if (categoryItem) {
      document.querySelectorAll('.menu-cat-item.open').forEach((item) => {
        if (item !== categoryItem) {
          item.classList.remove('open');
          item.querySelector('.menu-cat-header')?.setAttribute('aria-expanded', 'false');
        }
      });
      categoryItem.classList.add('open');
      categoryItem.querySelector('.menu-cat-header')?.setAttribute('aria-expanded', 'true');
    }
    card.element.hidden = false;
    card.element.classList.add('recommended');
    card.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => card.element.classList.remove('recommended'), 2600);
    if (focus) window.setTimeout(() => card.element.querySelector('.favorite-button')?.focus(), 500);
  };

  const updateFavoriteButton = (card, button) => {
    const active = favorites.has(card.id);
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
    button.textContent = active ? '★ В избранном' : '☆ В избранное';
  };

  const profileLabels = {
    strength: 'Крепость',
    sweetness: 'Сладость',
    acidity: 'Кислотность',
    body: 'Плотность'
  };

  const addProfileBars = (container, card) => {
    const title = make('h3', '', card.name);
    const price = make('p', 'compare-price', `${card.price} ₽`);
    container.append(title, price);
    Object.entries(card.profile).forEach(([key, score]) => {
      const row = make('div', 'profile-row');
      const label = make('span', '', profileLabels[key]);
      const track = make('i');
      track.style.setProperty('--score', `${score}%`);
      const value = make('b', '', `${score}/100`);
      row.append(label, track, value);
      container.append(row);
    });
  };

  const renderComparison = () => {
    const dialog = document.getElementById('compareDialog');
    const content = document.getElementById('compareContent');
    if (!dialog || !content || compareSelection.length !== 2) return;
    content.textContent = '';
    const grid = make('div', 'compare-grid');
    compareSelection.forEach((card) => {
      const column = make('article', 'compare-column');
      addProfileBars(column, card);
      grid.append(column);
    });
    const note = make('p', 'demo-caption', 'Профиль ориентировочный и рассчитан по описанию и вкусовым тегам меню.');
    const reset = make('button', 'text-button', 'Выбрать другую пару');
    reset.type = 'button';
    reset.addEventListener('click', () => {
      compareSelection.splice(0, compareSelection.length);
      document.querySelectorAll('.compare-button.active').forEach((button) => {
        button.classList.remove('active');
        button.setAttribute('aria-pressed', 'false');
        button.textContent = 'Сравнить';
      });
      app.closeDialog(dialog);
    });
    content.append(grid, note, reset);
    app.openDialog(dialog);
  };

  cards.forEach((card) => {
    const actions = make('div', 'product-actions');
    const favoriteButton = make('button', 'card-action favorite-button');
    favoriteButton.type = 'button';
    favoriteButton.setAttribute('aria-label', `Добавить «${card.name}» в избранное`);
    updateFavoriteButton(card, favoriteButton);
    favoriteButton.addEventListener('click', (event) => {
      event.stopPropagation();
      if (favorites.has(card.id)) favorites.delete(card.id);
      else favorites.add(card.id);
      app.storage.set('favorites', [...favorites]);
      updateFavoriteButton(card, favoriteButton);
      app.toast(favorites.has(card.id) ? `${card.name}: сохранено в избранном.` : `${card.name}: удалено из избранного.`);
    });

    const compareButton = make('button', 'card-action compare-button', 'Сравнить');
    compareButton.type = 'button';
    compareButton.setAttribute('aria-pressed', 'false');
    compareButton.addEventListener('click', (event) => {
      event.stopPropagation();
      const selectedIndex = compareSelection.findIndex((item) => item.id === card.id);
      if (selectedIndex >= 0) {
        compareSelection.splice(selectedIndex, 1);
        compareButton.classList.remove('active');
        compareButton.setAttribute('aria-pressed', 'false');
        compareButton.textContent = 'Сравнить';
      } else {
        if (compareSelection.length === 2) {
          const removed = compareSelection.shift();
          const removedButton = removed.element.querySelector('.compare-button');
          removedButton?.classList.remove('active');
          removedButton?.setAttribute('aria-pressed', 'false');
          if (removedButton) removedButton.textContent = 'Сравнить';
        }
        compareSelection.push(card);
        compareButton.classList.add('active');
        compareButton.setAttribute('aria-pressed', 'true');
        compareButton.textContent = `Выбрано ${compareSelection.length}/2`;
      }
      if (compareSelection.length === 2) renderComparison();
      else app.toast('Выберите ещё один напиток для сравнения.');
    });
    actions.append(favoriteButton, compareButton);
    card.element.append(actions);
    card.element.tabIndex = 0;
    card.element.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      card.element.classList.toggle('active');
    });
    card.element.addEventListener('keydown', (event) => {
      if (event.target !== card.element || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      card.element.classList.toggle('active');
    });
  });

  // Поиск и фильтры меню.
  const search = document.getElementById('menuSearch');
  const resultCount = document.getElementById('menuResultCount');
  let activeFilter = 'all';
  const updateMenu = () => {
    if (!search) return;
    const query = normalize(search.value);
    let visibleCount = 0;
    document.querySelectorAll('.menu-cat-item').forEach((categoryItem) => {
      let categoryVisible = 0;
      cards.filter((card) => getCategoryItem(card) === categoryItem).forEach((card) => {
        const matchesQuery = !query || card.text.includes(query);
        const matchesFilter = activeFilter === 'all' || card.flags[activeFilter];
        const visible = matchesQuery && matchesFilter;
        card.element.hidden = !visible;
        if (visible) {
          visibleCount += 1;
          categoryVisible += 1;
        }
      });
      categoryItem.classList.toggle('no-results', categoryVisible === 0);
      const count = categoryItem.querySelector('.menu-cat-count');
      if (count && (query || activeFilter !== 'all')) count.textContent = String(categoryVisible);
      else if (count) count.textContent = String(cards.filter((card) => getCategoryItem(card) === categoryItem).length);
      if (query || activeFilter !== 'all') {
        categoryItem.classList.toggle('open', categoryVisible > 0);
        categoryItem.querySelector('.menu-cat-header')?.setAttribute('aria-expanded', String(categoryVisible > 0));
      }
    });
    if (resultCount) resultCount.textContent = `Найдено: ${visibleCount} из ${cards.length}`;
  };
  search?.addEventListener('input', updateMenu);

  document.querySelectorAll('.filter-chip').forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter || 'all';
      document.querySelectorAll('.filter-chip').forEach((item) => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      updateMenu();
    });
  });

  const baristaPhrases = [
    'Бариста: если хочется ярких ягод — открывайте чёрный кофе и ищите V60.',
    'Бариста: флэт уайт — хороший компромисс между крепостью и мягкостью.',
    'Бариста: к фильтру сегодня особенно хорошо подходит миндальный круассан.',
    'Бариста: не бойтесь кислотности — в хорошем кофе она похожа на ягоды, а не на лимонную кислоту.',
    'Бариста: нажмите «Сравнить» на двух карточках — разница станет нагляднее.'
  ];
  let lastPhrase = -1;
  const say = () => {
    const output = document.getElementById('baristaPhrase');
    if (!output) return;
    let index = Math.floor(Math.random() * baristaPhrases.length);
    if (index === lastPhrase) index = (index + 1) % baristaPhrases.length;
    lastPhrase = index;
    output.textContent = baristaPhrases[index];
  };
  window.ZernaExperience = Object.freeze({ say });
  window.setInterval(say, 18000);

  document.getElementById('usualButton')?.addEventListener('click', () => {
    const favoriteCards = cards.filter((card) => favorites.has(card.id));
    const fallbackNames = ['Капучино', 'Фильтр-кофе V60', 'Флэт уайт', 'Круассан миндальный'];
    const fallback = cards.filter((card) => fallbackNames.includes(card.name));
    const pool = favoriteCards.length ? favoriteCards : fallback;
    const choice = pool[Math.floor(Math.random() * pool.length)];
    if (!choice) return;
    revealCard(choice);
    app.toast(favoriteCards.length ? `Как обычно: ${choice.name}.` : `Пока нет избранного — попробуйте ${choice.name}.`);
  });

  document.getElementById('openCompareGuide')?.addEventListener('click', () => {
    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    app.toast('Откройте категорию и нажмите «Сравнить» у двух напитков.');
  });

  // Навигатор по кофе.
  const quizDialog = document.getElementById('quizDialog');
  document.getElementById('openQuiz')?.addEventListener('click', () => app.openDialog(quizDialog));

  const scoreQuizCard = (card, answers) => {
    let score = 0;
    if (answers.milk === 'yes' && card.category === 'milk') score += 5;
    if (answers.milk === 'no' && card.category === 'black') score += 5;
    if (answers.milk === 'any') score += 1;
    if (answers.temp === 'cold' && card.flags.cold) score += 5;
    if (answers.temp === 'hot' && !card.flags.cold) score += 3;
    if (answers.temp === 'any') score += 1;
    if (answers.strength === 'strong') score += card.profile.strength / 20;
    if (answers.strength === 'soft') score += (100 - card.profile.strength) / 20;
    if (answers.strength === 'balanced') score += 5 - Math.abs(card.profile.strength - 55) / 20;
    if (answers.flavor === 'sweet') score += card.profile.sweetness / 18;
    if (answers.flavor === 'fruity') score += card.profile.acidity / 18;
    if (answers.flavor === 'neutral') score += 5 - Math.abs(card.profile.acidity - 40) / 20;
    return score;
  };

  document.getElementById('runQuiz')?.addEventListener('click', () => {
    const answers = {
      strength: document.getElementById('quizStrength').value,
      milk: document.getElementById('quizMilk').value,
      flavor: document.getElementById('quizFlavor').value,
      temp: document.getElementById('quizTemp').value
    };
    const ranked = drinks
      .map((card) => ({ card, score: scoreQuizCard(card, answers) }))
      .sort((left, right) => right.score - left.score);
    const best = ranked[0]?.card;
    const result = document.getElementById('quizResult');
    if (!best || !result) return;
    result.textContent = '';
    const eyebrow = make('span', 'section-eyebrow', 'Совет бариста');
    const title = make('h3', '', best.name);
    const description = make('p', '', best.description);
    const tags = make('p', 'quiz-tags', best.tags.join(' · '));
    const action = make('button', 'lab-button', 'Показать в меню');
    action.type = 'button';
    action.addEventListener('click', () => {
      app.closeDialog(quizDialog);
      revealCard(best);
    });
    result.append(eyebrow, title, description, tags, action);
  });

  // Интерактив свежести.
  const freshnessRange = document.getElementById('freshnessRange');
  if (freshnessRange) {
    const marker = document.getElementById('batchMarker');
    const dayLabel = document.getElementById('batchDay');
    const dateLabel = document.getElementById('batchDate');
    const summary = document.getElementById('freshnessSummary');
    const updateFreshness = () => {
      const day = Number(freshnessRange.value);
      const roastDate = new Date();
      roastDate.setDate(roastDate.getDate() - day);
      let message = 'зерно ещё просыпается: дайте газам выйти';
      if (day >= 4 && day <= 16) message = 'зерно в пике: вкус самый яркий и чистый';
      else if (day >= 17 && day <= 24) message = 'вкус становится спокойнее и слаще';
      else if (day >= 25) message = 'ароматика заметно тише — пора обновить пачку';
      if (marker) marker.style.left = `${Math.min(day / 28 * 100, 100)}%`;
      if (dayLabel) dayLabel.textContent = `День свежести — ${day}`;
      if (dateLabel) dateLabel.textContent = roastDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
      if (summary) summary.textContent = `День ${day} — ${message}`;
    };
    freshnessRange.addEventListener('input', updateFreshness);
    updateFreshness();
  }

  // Конструктор напитка.
  const builderBase = document.getElementById('builderBase');
  if (builderBase) {
    const builderSize = document.getElementById('builderSize');
    const builderMilk = document.getElementById('builderMilk');
    const builderSyrup = document.getElementById('builderSyrup');
    const builderExtra = document.getElementById('builderExtra');
    const bases = {
      espresso: { name: 'Эспрессо', price: 180, taste: 'Плотный, шоколадный и бодрый', milk: false },
      cappuccino: { name: 'Капучино', price: 250, taste: 'Сбалансированный и сливочный', milk: true },
      latte: { name: 'Латте', price: 280, taste: 'Мягкий, молочный и спокойный', milk: true },
      filter: { name: 'Фильтр V60', price: 280, taste: 'Чистый, ягодный и чайный', milk: false }
    };
    const sizes = {
      small: { label: '200 мл', price: 0, fill: 48 },
      medium: { label: '300 мл', price: 40, fill: 68 },
      large: { label: '450 мл', price: 90, fill: 88 }
    };
    const milkPrices = { regular: 0, oat: 0, almond: 50, none: 0 };
    const syrupPrices = { none: 0, vanilla: 40, caramel: 40 };
    const updateBuilder = () => {
      const base = bases[builderBase.value];
      const size = sizes[builderSize.value];
      const price = base.price + size.price + milkPrices[builderMilk.value] + syrupPrices[builderSyrup.value] + (builderExtra.checked ? 70 : 0);
      const additions = [];
      if (builderMilk.value === 'oat') additions.push('овсяное молоко');
      if (builderMilk.value === 'almond') additions.push('миндальное молоко');
      if (builderMilk.value === 'none') additions.push('без молока');
      if (builderSyrup.value === 'vanilla') additions.push('ваниль');
      if (builderSyrup.value === 'caramel') additions.push('карамель');
      if (builderExtra.checked) additions.push('двойной шот');
      document.getElementById('builderName').textContent = `${base.name} · ${size.label}`;
      document.getElementById('builderTaste').textContent = additions.length ? `${base.taste}; ${additions.join(', ')}` : base.taste;
      document.getElementById('builderPrice').textContent = `${price} ₽`;
      const fill = document.getElementById('builderFill');
      fill.style.height = `${size.fill}%`;
      fill.className = builderMilk.value === 'none' ? 'builder-fill-dark' : 'builder-fill-milk';
    };
    [builderBase, builderSize, builderMilk, builderSyrup, builderExtra].forEach((control) => control.addEventListener('input', updateBuilder));
    updateBuilder();
  }

  // Демо-карта лояльности.
  const stampElements = [...document.querySelectorAll('.loyalty-stamps .stamp')];
  const addStamp = document.getElementById('addStamp');
  if (stampElements.length && addStamp) {
    let stampCount = Math.max(0, Math.min(6, Number(app.storage.get('loyaltyStamps', 0)) || 0));
    const loyaltyMessage = document.getElementById('loyaltyMessage');
    const celebrate = () => {
      const layer = make('div', 'confetti-layer');
      layer.setAttribute('aria-hidden', 'true');
      for (let index = 0; index < 44; index += 1) {
        const piece = make('span');
        piece.style.left = `${Math.random() * 100}%`;
        piece.style.background = index % 2 ? '#ff7f50' : '#f0a316';
        piece.style.animationDelay = `${Math.random() * 0.45}s`;
        layer.append(piece);
      }
      document.body.append(layer);
      window.setTimeout(() => layer.remove(), 2700);
    };
    const renderStamps = () => {
      stampElements.forEach((stamp, index) => {
        stamp.classList.toggle('filled', index < stampCount);
        stamp.classList.toggle('reward-earned', index === 5 && stampCount === 6);
      });
      addStamp.textContent = stampCount === 6 ? 'Начать новую карту' : 'Поставить демо-штамп';
      if (loyaltyMessage) {
        loyaltyMessage.textContent = stampCount === 6
          ? 'Шестая чашка в подарок! В настоящей программе отметку поставил бы бариста.'
          : `На карте ${stampCount} из 6 отметок. До подарка осталось ${6 - stampCount}.`;
      }
    };
    addStamp.addEventListener('click', () => {
      if (stampCount === 6) stampCount = 0;
      else stampCount += 1;
      app.storage.set('loyaltyStamps', stampCount);
      renderStamps();
      if (stampCount === 6) {
        celebrate();
        app.toast('Шестая чашка — подарок!');
      }
    });
    document.getElementById('resetStamps')?.addEventListener('click', () => {
      stampCount = 0;
      app.storage.set('loyaltyStamps', stampCount);
      renderStamps();
    });
    renderStamps();
  }

  // Счётчик становится живым, но остаётся явно частью демо.
  const todayCounter = document.querySelector('.stats-number[data-target]');
  if (todayCounter) {
    const now = new Date();
    const minutesSinceOpening = Math.max(0, Math.min(13 * 60, (now.getHours() - 8) * 60 + now.getMinutes()));
    const dailySeed = now.getDate() * 7 + now.getMonth() * 13;
    const liveTarget = Math.round(minutesSinceOpening * 0.52 + dailySeed % 28);
    todayCounter.dataset.target = String(liveTarget);
    todayCounter.textContent = String(liveTarget);
    const label = todayCounter.nextElementSibling;
    if (label) label.textContent = 'чашек кофе сварено сегодня · демо-счётчик';
  }
})();
