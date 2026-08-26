'use strict';

(() => {
  const STORAGE_PREFIX = 'zerna.';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let storageDisabledForSession = false;

  const storage = {
    get(key, fallback = null) {
      if (storageDisabledForSession) return fallback;
      try {
        const value = window.localStorage.getItem(STORAGE_PREFIX + key);
        return value === null ? fallback : JSON.parse(value);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      if (storageDisabledForSession) return false;
      try {
        window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        window.localStorage.removeItem(STORAGE_PREFIX + key);
      } catch {
        // Storage may be disabled by browser policy.
      }
    },
    clearAll() {
      try {
        Object.keys(window.localStorage)
          .filter((key) => key.startsWith(STORAGE_PREFIX))
          .forEach((key) => window.localStorage.removeItem(key));
      } catch {
        // Nothing else to clear when local storage is unavailable.
      }
    }
  };

  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };

  const toast = (message) => {
    let region = document.getElementById('toastRegion');
    if (!region) {
      region = make('div', 'toast-region');
      region.id = 'toastRegion';
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('aria-atomic', 'true');
      document.body.append(region);
    }
    const item = make('div', 'app-toast', message);
    region.append(item);
    window.setTimeout(() => item.classList.add('visible'), 20);
    window.setTimeout(() => {
      item.classList.remove('visible');
      window.setTimeout(() => item.remove(), 250);
    }, 3200);
  };

  const openDialog = (dialog) => {
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  };

  const closeDialog = (dialog) => {
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  };

  window.ZernaApp = Object.freeze({ storage, toast, openDialog, closeDialog });

  const firstContent = document.querySelector('main, .hero, .page-header, section');
  if (firstContent && !firstContent.id) firstContent.id = 'main-content';
  if (firstContent) {
    const skipLink = make('a', 'skip-link', 'Перейти к содержанию');
    skipLink.href = '#' + firstContent.id;
    document.body.prepend(skipLink);
  }

  document.querySelectorAll('a[target="_blank"]').forEach((link) => {
    link.rel = 'noopener noreferrer';
  });

  const headerEl = document.querySelector('.header');
  if (headerEl) {
    const onScroll = () => headerEl.classList.toggle('scrolled', window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const nav = headerEl.querySelector('.nav');
    if (nav) {
      nav.id = nav.id || 'primaryNav';
      nav.setAttribute('aria-label', nav.getAttribute('aria-label') || 'Основная навигация');
      const menuButton = make('button', 'mobile-menu-button', 'Меню');
      menuButton.type = 'button';
      menuButton.setAttribute('aria-controls', nav.id);
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.addEventListener('click', () => {
        const open = headerEl.classList.toggle('nav-open');
        menuButton.setAttribute('aria-expanded', String(open));
        menuButton.textContent = open ? 'Закрыть' : 'Меню';
      });
      headerEl.insertBefore(menuButton, nav);
      nav.addEventListener('click', (event) => {
        if (event.target.closest('a')) {
          headerEl.classList.remove('nav-open');
          menuButton.setAttribute('aria-expanded', 'false');
          menuButton.textContent = 'Меню';
        }
      });
    }
  }

  document.querySelectorAll('.side-marquee').forEach((marquee) => {
    const firstSet = marquee.querySelector('.marquee-set');
    if (!firstSet) return;
    const setDistance = () => {
      const distance = firstSet.getBoundingClientRect().height;
      if (distance > 0) marquee.style.setProperty('--marquee-distance', distance + 'px');
    };
    setDistance();
    window.addEventListener('resize', setDistance, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(setDistance).catch(() => {});
  });

  function animateCount(element) {
    const target = Number.parseInt(element.dataset.target, 10);
    if (!Number.isFinite(target)) return;
    if (reducedMotion) {
      element.textContent = String(target);
      return;
    }
    const duration = 1500;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      element.textContent = String(Math.floor(progress * target));
      if (progress < 1) window.requestAnimationFrame(step);
      else element.textContent = String(target);
    };
    window.requestAnimationFrame(step);
  }

  const splitIntoWords = (element) => {
    const words = element.textContent.trim().split(/\s+/);
    element.textContent = '';
    words.forEach((word, index) => {
      if (index) element.append(document.createTextNode(' '));
      const span = make('span', 'word', word);
      span.style.transitionDelay = String(index * 70) + 'ms';
      element.append(span);
    });
    element.classList.add('word-reveal');
  };

  const wordTargets = document.querySelectorAll('.hero h1, .hero p, .page-header-content h1, .section-heading h2, .story-sticky h2');
  wordTargets.forEach(splitIntoWords);

  if (reducedMotion) {
    wordTargets.forEach((element) => element.classList.add('visible'));
    document.querySelectorAll('.reveal, .reveal-stagger').forEach((element) => element.classList.add('visible'));
  } else {
    if (wordTargets.length) {
      const wordObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('visible');
          wordObserver.unobserve(entry.target);
        });
      }, { threshold: 0.35 });
      wordTargets.forEach((element) => wordObserver.observe(element));
    }

    const revealEls = document.querySelectorAll('.reveal, .reveal-stagger');
    if (revealEls.length) {
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('visible');
          const counter = entry.target.classList.contains('stats-number')
            ? entry.target
            : entry.target.querySelector('.stats-number');
          if (counter) animateCount(counter);
          revealObserver.unobserve(entry.target);
        });
      }, { threshold: 0.12 });
      revealEls.forEach((element) => revealObserver.observe(element));
    }
  }

  const progressBar = document.querySelector('.scroll-progress');
  if (progressBar) {
    const updateProgress = () => {
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      const fraction = documentHeight > 0 ? window.scrollY / documentHeight : 0;
      progressBar.style.width = String(Math.max(0, Math.min(1, fraction)) * 100) + '%';
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  if (!reducedMotion) {
    const parallaxImages = document.querySelectorAll('.parallax-img');
    if (parallaxImages.length) {
      let ticking = false;
      const updateParallax = () => {
        parallaxImages.forEach((image) => {
          const rect = image.parentElement.getBoundingClientRect();
          const center = rect.top + rect.height / 2 - window.innerHeight / 2;
          const offset = Math.max(-22, Math.min(22, center * 0.1));
          image.style.transform = `translateY(${offset}px)`;
        });
        ticking = false;
      };
      window.addEventListener('scroll', () => {
        if (!ticking) {
          window.requestAnimationFrame(updateParallax);
          ticking = true;
        }
      }, { passive: true });
      updateParallax();
    }
  }

  document.querySelectorAll('.faq-item').forEach((item) => {
    const button = item.querySelector('.faq-q');
    if (!button) return;
    button.addEventListener('click', () => {
      const open = item.classList.toggle('open');
      button.setAttribute('aria-expanded', String(open));
    });
  });

  document.querySelectorAll('.menu-cat-header').forEach((button) => {
    button.addEventListener('click', () => {
      const item = button.closest('.menu-cat-item');
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.menu-cat-item.open').forEach((openItem) => {
        openItem.classList.remove('open');
        const openButton = openItem.querySelector('.menu-cat-header');
        if (openButton) openButton.setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) {
        item.classList.add('open');
        button.setAttribute('aria-expanded', 'true');
        const phrase = document.getElementById('baristaPhrase');
        if (phrase && window.ZernaExperience && typeof window.ZernaExperience.say === 'function') {
          window.ZernaExperience.say();
        }
      }
    });
  });

  const statusBadge = document.getElementById('statusBadge');
  const statusDetails = document.getElementById('statusDetails');
  const plural = (value, one, few, many) => {
    const mod10 = value % 10;
    const mod100 = value % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  };

  const getStatus = () => {
    const now = new Date();
    const opening = new Date(now);
    opening.setHours(8, 0, 0, 0);
    const closing = new Date(now);
    closing.setHours(21, 0, 0, 0);
    const isOpen = now >= opening && now < closing;
    const target = isOpen ? closing : opening;
    if (!isOpen && now >= closing) target.setDate(target.getDate() + 1);
    const minutes = Math.max(0, Math.ceil((target - now) / 60000));
    const hours = Math.floor(minutes / 60);
    const restMinutes = minutes % 60;
    const parts = [];
    if (hours) parts.push(`${hours} ${plural(hours, 'час', 'часа', 'часов')}`);
    if (restMinutes || !parts.length) parts.push(`${restMinutes} ${plural(restMinutes, 'минуту', 'минуты', 'минут')}`);
    return {
      isOpen,
      short: isOpen ? 'Открыто сейчас' : 'Сейчас закрыто',
      detail: isOpen ? `Закроемся через ${parts.join(' ')}` : `Откроемся через ${parts.join(' ')}`
    };
  };

  const updateStatus = () => {
    if (!statusBadge) return;
    const status = getStatus();
    statusBadge.classList.toggle('is-closed', !status.isOpen);
    const text = statusBadge.querySelector('.status-text');
    if (text) text.textContent = status.short;
    statusBadge.title = status.detail;
    statusBadge.setAttribute('aria-label', `${status.short}. ${status.detail}`);
    if (statusDetails && statusDetails.classList.contains('visible')) statusDetails.textContent = status.detail;
  };
  updateStatus();
  window.setInterval(updateStatus, 60000);

  if (statusBadge) {
    if (statusBadge.tagName !== 'BUTTON') {
      statusBadge.setAttribute('role', 'button');
      statusBadge.tabIndex = 0;
    }
    const toggleStatusDetails = () => {
      if (!statusDetails) return;
      statusDetails.textContent = getStatus().detail;
      statusDetails.classList.toggle('visible');
    };
    statusBadge.addEventListener('click', toggleStatusDetails);
    statusBadge.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleStatusDetails();
      }
    });
  }

  const hour = new Date().getHours();
  const timeTheme = hour < 7 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'day' : hour < 22 ? 'evening' : 'night';
  document.body.classList.add('time-' + timeTheme);

  const floatingControls = make('div', 'floating-controls');
  const soundButton = make('button', 'floating-control', 'Звук кофейни');
  soundButton.type = 'button';
  soundButton.setAttribute('aria-pressed', 'false');
  const privacyButton = make('button', 'floating-control', 'Приватность');
  privacyButton.type = 'button';
  floatingControls.append(soundButton, privacyButton);
  document.body.append(floatingControls);

  let audioContext = null;
  let ambientSource = null;
  const stopAmbient = () => {
    if (ambientSource) {
      try { ambientSource.stop(); } catch { /* already stopped */ }
      ambientSource = null;
    }
    if (audioContext) {
      audioContext.close().catch(() => {});
      audioContext = null;
    }
    soundButton.setAttribute('aria-pressed', 'false');
    soundButton.textContent = 'Звук кофейни';
  };

  const startAmbient = () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      toast('Этот браузер не поддерживает фоновый звук.');
      return;
    }
    audioContext = new AudioContextClass();
    const length = audioContext.sampleRate * 3;
    const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let index = 0; index < length; index += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[index] = last * 2.4;
    }
    ambientSource = audioContext.createBufferSource();
    ambientSource.buffer = buffer;
    ambientSource.loop = true;
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 720;
    const gain = audioContext.createGain();
    gain.gain.value = 0.035;
    ambientSource.connect(filter).connect(gain).connect(audioContext.destination);
    ambientSource.start();
    soundButton.setAttribute('aria-pressed', 'true');
    soundButton.textContent = 'Выключить звук';
  };

  soundButton.addEventListener('click', () => {
    if (audioContext) stopAmbient();
    else startAmbient();
  });
  window.addEventListener('pagehide', stopAmbient, { once: true });

  const demoNotice = make('aside', 'demo-notice');
  demoNotice.setAttribute('aria-label', 'Статус проекта');
  const demoText = make('span', '', 'Демо-проект: кофейня, адреса, цены и вакансии вымышлены.');
  const demoLink = make('a', '', 'Подробнее');
  demoLink.href = 'legal.html';
  const demoClose = make('button', '', 'Скрыть');
  demoClose.type = 'button';
  demoClose.addEventListener('click', () => {
    demoNotice.remove();
    storage.set('demoNoticeHidden', true);
  });
  demoNotice.append(demoText, demoLink, demoClose);
  if (!storage.get('demoNoticeHidden', false)) {
    const header = document.querySelector('.header');
    if (header) header.insertAdjacentElement('afterend', demoNotice);
    else document.body.prepend(demoNotice);
  }

  const privacyDialog = make('dialog', 'app-dialog privacy-dialog');
  privacyDialog.id = 'privacyDialog';
  const privacyHead = make('div', 'dialog-head');
  const privacyTitleWrap = make('div');
  const privacyEyebrow = make('span', 'section-eyebrow', 'Приватность');
  const privacyTitle = make('h2', '', 'Ваши настройки остаются у вас');
  privacyTitle.id = 'privacyDialogTitle';
  privacyTitleWrap.append(privacyEyebrow, privacyTitle);
  const privacyClose = make('button', 'dialog-close', '×');
  privacyClose.type = 'button';
  privacyClose.setAttribute('aria-label', 'Закрыть');
  privacyClose.addEventListener('click', () => closeDialog(privacyDialog));
  privacyHead.append(privacyTitleWrap, privacyClose);
  const privacyText = make('p', '', 'Сайт не использует аналитику, рекламу и формы. Избранное, демо-штампы и факт показа уведомления могут храниться только в вашем браузере.');
  const privacyActions = make('div', 'dialog-actions');
  const clearButton = make('button', 'lab-button lab-button-secondary', 'Удалить локальные данные');
  clearButton.type = 'button';
  clearButton.addEventListener('click', () => {
    storage.clearAll();
    toast('Локальные данные удалены.');
    window.setTimeout(() => window.location.reload(), 450);
  });
  const policyLink = make('a', 'lab-button', 'Открыть политику');
  policyLink.href = 'privacy.html';
  privacyActions.append(clearButton, policyLink);
  privacyDialog.append(privacyHead, privacyText, privacyActions);
  privacyDialog.setAttribute('aria-labelledby', privacyTitle.id);
  document.body.append(privacyDialog);
  privacyButton.addEventListener('click', () => openDialog(privacyDialog));

  if (!storage.get('privacyNoticeSeen', false)) {
    const banner = make('aside', 'privacy-banner');
    banner.setAttribute('aria-label', 'Уведомление о локальном хранении');
    const bannerText = make('p');
    bannerText.append(document.createTextNode('Сайт не ставит рекламные cookies. Избранное и демо-настройки могут сохраняться только на вашем устройстве. '));
    const bannerLink = make('a', '', 'Политика');
    bannerLink.href = 'privacy.html';
    bannerText.append(bannerLink);
    const bannerActions = make('div', 'privacy-banner-actions');
    const decline = make('button', 'text-button', 'Не сохранять');
    decline.type = 'button';
    decline.addEventListener('click', () => {
      storage.clearAll();
      storageDisabledForSession = true;
      banner.remove();
      toast('Локальное сохранение отключено до закрытия страницы.');
    });
    const accept = make('button', 'lab-button', 'Понятно');
    accept.type = 'button';
    accept.addEventListener('click', () => {
      storage.set('privacyNoticeSeen', true);
      banner.remove();
    });
    bannerActions.append(decline, accept);
    banner.append(bannerText, bannerActions);
    document.body.append(banner);
  }

  const footer = document.querySelector('.footer');
  if (footer && !footer.querySelector('.footer-legal')) {
    const legalNav = make('nav', 'footer-legal');
    legalNav.setAttribute('aria-label', 'Правовые документы');
    const privacyLink = make('a', '', 'Конфиденциальность');
    privacyLink.href = 'privacy.html';
    const legalLink = make('a', '', 'Правовая информация');
    legalLink.href = 'legal.html';
    const settingsButton = make('button', '', 'Настройки приватности');
    settingsButton.type = 'button';
    settingsButton.addEventListener('click', () => openDialog(privacyDialog));
    legalNav.append(privacyLink, legalLink, settingsButton);
    footer.append(legalNav);
  }

  document.querySelectorAll('[data-dialog-close]').forEach((button) => {
    button.addEventListener('click', () => closeDialog(button.closest('dialog')));
  });
  document.querySelectorAll('dialog').forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) closeDialog(dialog);
    });
  });

  const logo = document.querySelector('.logo');
  if (logo && !reducedMotion) {
    let logoClicks = 0;
    let logoTimer = 0;
    logo.addEventListener('click', (event) => {
      if (logoClicks > 0) event.preventDefault();
      logoClicks += 1;
      window.clearTimeout(logoTimer);
      logoTimer = window.setTimeout(() => { logoClicks = 0; }, 2400);
      if (logoClicks < 5) return;
      logoClicks = 0;
      const rain = make('div', 'bean-rain');
      rain.setAttribute('aria-hidden', 'true');
      for (let index = 0; index < 34; index += 1) {
        const bean = make('span');
        bean.style.left = String(Math.random() * 100) + '%';
        bean.style.animationDelay = String(Math.random() * 0.8) + 's';
        bean.style.animationDuration = String(1.8 + Math.random() * 1.4) + 's';
        rain.append(bean);
      }
      document.body.append(rain);
      toast('Секретный режим бариста включён ☕');
      window.setTimeout(() => rain.remove(), 3600);
    });
  }

  const hero = document.querySelector('.hero');
  if (hero && !reducedMotion && window.matchMedia('(pointer: fine)').matches) {
    let lastSteam = 0;
    hero.addEventListener('pointermove', (event) => {
      const now = performance.now();
      if (now - lastSteam < 90) return;
      lastSteam = now;
      const rect = hero.getBoundingClientRect();
      const puff = make('span', 'steam-puff');
      puff.style.left = String(event.clientX - rect.left) + 'px';
      puff.style.top = String(event.clientY - rect.top) + 'px';
      hero.append(puff);
      puff.addEventListener('animationend', () => puff.remove(), { once: true });
    }, { passive: true });
  }

  const transition = make('div', 'page-grind-transition');
  transition.setAttribute('aria-hidden', 'true');
  document.body.append(transition);
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
    const target = new URL(link.href, window.location.href);
    if (target.origin !== window.location.origin) return;
    const samePageHash = target.pathname === window.location.pathname && target.hash;
    if (samePageHash || !target.pathname.endsWith('.html')) return;
    event.preventDefault();
    if (reducedMotion) {
      window.location.assign(target.href);
      return;
    }
    transition.classList.add('active');
    window.setTimeout(() => window.location.assign(target.href), 260);
  });

  const localClear = document.getElementById('clearLocalData');
  if (localClear) {
    localClear.addEventListener('click', () => {
      storage.clearAll();
      const output = document.getElementById('clearLocalDataStatus');
      if (output) output.textContent = 'Локальные данные удалены. После обновления страницы настройки будут исходными.';
    });
  }

  const brewMethod = document.getElementById('brewMethod');
  if (brewMethod) {
    const water = document.getElementById('brewWater');
    const strength = document.getElementById('brewStrength');
    const recipes = {
      v60: { temperature: 94, time: '2:45–3:15', grind: 'средний' },
      aeropress: { temperature: 88, time: '1:45–2:15', grind: 'средне-мелкий' },
      french: { temperature: 93, time: '4:00', grind: 'крупный' },
      chemex: { temperature: 94, time: '4:00–4:45', grind: 'средне-крупный' }
    };
    const ratios = { light: 17.5, balanced: 16, strong: 14.5 };
    const updateRecipe = () => {
      const waterValue = Number(water.value);
      const recipe = recipes[brewMethod.value];
      const coffee = Math.round((waterValue / ratios[strength.value]) * 10) / 10;
      document.getElementById('brewWaterOutput').textContent = `${waterValue} мл`;
      document.getElementById('brewCoffee').textContent = `${String(coffee).replace('.', ',')} г`;
      document.getElementById('brewTemperature').textContent = `${recipe.temperature} °C`;
      document.getElementById('brewTime').textContent = recipe.time;
      document.getElementById('brewGrind').textContent = recipe.grind;
    };
    [brewMethod, water, strength].forEach((control) => control.addEventListener('input', updateRecipe));
    updateRecipe();
  }
})();
