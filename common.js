// бегущая строка слева: контент задублирован дважды, чтобы зациклить,
// но точку склейки надёжнее не гадать через 50%, а измерить по-настоящему —
// иначе любая мелочь (шрифт ещё не подгрузился, округление) сдвигает петлю и виден скачок
document.querySelectorAll('.side-marquee').forEach((marquee) => {
  const setDistance = () => {
    const distance = marquee.scrollHeight / 2;
    marquee.style.setProperty('--marquee-distance', distance + 'px');
  };
  setDistance();
  // шрифт может догрузиться позже и чуть изменить высоту текста — пересчитываем, когда это произойдёт
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(setDistance);
  }
});

// тень на шапке при скролле + анимация появления секций

const headerEl = document.querySelector('.header');
if (headerEl) {
  window.addEventListener('scroll', () => {
    headerEl.classList.toggle('scrolled', window.scrollY > 12);
  });
}

// анимированный счёт от 0 до целевого числа — запускается один раз, когда блок появляется в кадре
function animateCount(el) {
  const target = parseInt(el.dataset.target, 10);
  const duration = 1500;
  const start = performance.now();

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    el.textContent = Math.floor(progress * target);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  }

  requestAnimationFrame(step);
}

// пословное появление текста в заголовках — оборачиваем каждое слово в свой span
// с нарастающей задержкой, чтобы текст "печатался" плавно, а не всплывал целиком
function splitIntoWords(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words
    .map((word, i) => `<span class="word" style="transition-delay:${i * 70}ms">${word}</span>`)
    .join(' ');
  el.classList.add('word-reveal');
}

const wordTargets = document.querySelectorAll('.hero h1, .hero p, .page-header-content h1, .section-heading h2, .story-sticky h2');
wordTargets.forEach(splitIntoWords);

if (wordTargets.length) {
  const wordObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        wordObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  wordTargets.forEach((el) => wordObserver.observe(el));
}

const revealEls = document.querySelectorAll('.reveal, .reveal-stagger');
if (revealEls.length) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');

        const counter = entry.target.classList.contains('stats-number')
          ? entry.target
          : entry.target.querySelector('.stats-number');
        if (counter) animateCount(counter);

        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  revealEls.forEach((el) => revealObserver.observe(el));
}

// тонкая полоса прогресса прокрутки вверху страницы
const progressBar = document.querySelector('.scroll-progress');
if (progressBar) {
  const updateProgress = () => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const fraction = docHeight > 0 ? window.scrollY / docHeight : 0;
    progressBar.style.width = fraction * 100 + '%';
  };
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
}

// лёгкий параллакс для фоновых фото (шапка, полоса обжарки, фото-шапки страниц)
const parallaxImgs = document.querySelectorAll('.parallax-img');
if (parallaxImgs.length) {
  let ticking = false;
  const updateParallax = () => {
    parallaxImgs.forEach((img) => {
      const rect = img.parentElement.getBoundingClientRect();
      const center = rect.top + rect.height / 2 - window.innerHeight / 2;
      const offset = Math.max(-22, Math.min(22, center * 0.1));
      img.style.transform = `translateY(${offset}px)`;
    });
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }, { passive: true });
  updateParallax();
}

// аккордеон "часто спрашивают"
document.querySelectorAll('.faq-item').forEach((item) => {
  const btn = item.querySelector('.faq-q');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const isOpen = item.classList.toggle('open');
    btn.setAttribute('aria-expanded', isOpen);
  });
});

// выпадающий фильтр меню по категориям
const filterWrap = document.querySelector('.menu-filter');
if (filterWrap) {
  const filterBtn = filterWrap.querySelector('.menu-filter-btn');
  const filterLabel = filterWrap.querySelector('#filterLabel');
  const filterItems = filterWrap.querySelectorAll('.menu-filter-list li');

  filterBtn.addEventListener('click', () => {
    const isOpen = filterWrap.classList.toggle('open');
    filterBtn.setAttribute('aria-expanded', isOpen);
  });

  document.addEventListener('click', (e) => {
    if (!filterWrap.contains(e.target)) filterWrap.classList.remove('open');
  });

  filterItems.forEach((li) => {
    li.addEventListener('click', () => {
      filterItems.forEach((x) => x.classList.remove('active'));
      li.classList.add('active');
      filterLabel.textContent = li.textContent;
      filterWrap.classList.remove('open');
      filterBtn.setAttribute('aria-expanded', 'false');

      const filter = li.dataset.filter;
      document.querySelectorAll('.product-card').forEach((card) => {
        const match = filter === 'all' || card.dataset.category === filter;
        card.classList.toggle('hidden', !match);
      });
    });
  });
}

// живой статус "открыто/закрыто" — считает по реальному времени и часам работы (8:00-21:00)
// трекер свежести текущей обжарки — считает от даты обжарки до пика вкуса (2-4 недели)
const batchMarker = document.getElementById('batchMarker');
if (batchMarker) {
  const roastedDaysAgo = 5;
  const roastDate = new Date();
  roastDate.setDate(roastDate.getDate() - roastedDaysAgo);

  const dayLabel = document.getElementById('batchDay');
  const dateLabel = document.getElementById('batchDate');
  if (dayLabel) dayLabel.textContent = `День свежести — ${roastedDaysAgo}`;
  if (dateLabel) dateLabel.textContent = roastDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  const pct = Math.min((roastedDaysAgo / 28) * 100, 100);
  batchMarker.style.left = pct + '%';
}

function updateStatus() {
  const badge = document.getElementById('statusBadge');
  if (!badge) return;

  const hour = new Date().getHours();
  const isOpen = hour >= 8 && hour < 21;

  badge.classList.toggle('is-closed', !isOpen);
  badge.querySelector('.status-text').textContent = isOpen ? 'Открыто сейчас' : 'Сейчас закрыто';
}
updateStatus();

// на телефоне нет наведения мышкой — тап по карточке тоже показывает описание
document.querySelectorAll('.product-card').forEach((card) => {
  card.addEventListener('click', () => card.classList.toggle('active'));
});
