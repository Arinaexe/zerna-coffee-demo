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

const revealEls = document.querySelectorAll('.reveal');
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

// живой статус "открыто/закрыто" — считает по реальному времени и часам работы (8:00-21:00)
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
