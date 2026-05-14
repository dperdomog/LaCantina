/* ═══════════════════════════════════════════════════
   LA CANTINA — script.js
   ═══════════════════════════════════════════════════ */

/* ── Navbar scroll ── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 30);
});

/* ── Mobile nav toggle ── */
const navToggle = document.getElementById('navToggle');
const navMobile = document.getElementById('navMobile');
navToggle.addEventListener('click', () => {
  navMobile.classList.toggle('open');
});
navMobile.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => navMobile.classList.remove('open'));
});

/* ── Particles ── */
(function spawnParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('div');
    const size = Math.random() * 3 + 1;
    const x    = Math.random() * 100;
    const delay = Math.random() * 8;
    const dur   = Math.random() * 10 + 8;
    Object.assign(p.style, {
      position:        'absolute',
      left:            x + '%',
      bottom:          '-10px',
      width:           size + 'px',
      height:          size + 'px',
      borderRadius:    '50%',
      background:      Math.random() > .5 ? '#e8873a' : '#3abde8',
      opacity:         (Math.random() * .4 + .1).toFixed(2),
      animation:       `particleFloat ${dur}s ${delay}s linear infinite`,
      pointerEvents:   'none',
    });
    container.appendChild(p);
  }

  const style = document.createElement('style');
  style.textContent = `
    @keyframes particleFloat {
      from { transform: translateY(0) scale(1); opacity: .3; }
      to   { transform: translateY(-110vh) scale(.5); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
})();

/* ── Counter animation ── */
function animateCounter(el, target, suffix = '') {
  const duration = 1600;
  const start    = performance.now();
  const update   = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.floor(ease * target) + suffix;
    if (t < 1) requestAnimationFrame(update);
    else el.textContent = target + suffix;
  };
  requestAnimationFrame(update);
}

/* ── Intersection Observer for reveals + counters ── */
const observerOptions = { threshold: 0.18 };

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll('.card, .stat-card, .torneo-card, .discord-card, .section-header').forEach(el => {
  el.classList.add('reveal');
  revealObserver.observe(el);
});

/* ── Counter observer ── */
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;

    /* hero stats */
    entry.target.querySelectorAll('.hstat-num[data-target]').forEach(el => {
      animateCounter(el, parseInt(el.dataset.target));
      el.removeAttribute('data-target');
    });

    /* stat section numbers */
    entry.target.querySelectorAll('.stat-number[data-target]').forEach(el => {
      animateCounter(el, parseInt(el.dataset.target));
      el.removeAttribute('data-target');
    });

    /* progress / stat bars */
    entry.target.querySelectorAll('.stat-fill, .progress-fill').forEach(el => {
      const w = getComputedStyle(el).getPropertyValue('--w').trim();
      el.style.width = w;
    });

    counterObserver.unobserve(entry.target);
  });
}, { threshold: 0.3 });

document.querySelectorAll('.hero-stats, .stats-grid, .torneos-grid').forEach(el => {
  counterObserver.observe(el);
});

/* ════════════════════════ MODAL ════════════════════════ */
const overlay = document.getElementById('modalOverlay');
const modal   = document.getElementById('modal');

const tournamentData = {
  'copa-cantina': {
    title: 'Copa La Cantina — Junio 2026',
    sub:   'Completá el formulario para inscribir a tu equipo.',
    form: `
      <div class="form-row">
        <div class="form-group">
          <label>Nombre del Equipo *</label>
          <input type="text" placeholder="Ej: Los Cuervos" required />
        </div>
        <div class="form-group">
          <label>Capitán del Equipo *</label>
          <input type="text" placeholder="Tu nick en Deadlock" required />
        </div>
      </div>
      <div class="form-group">
        <label>Discord del Capitán *</label>
        <input type="text" placeholder="usuario#0000" required />
      </div>
      <div class="form-group">
        <label>Región principal</label>
        <select>
          <option>Argentina</option>
          <option>Chile</option>
          <option>México</option>
          <option>Colombia</option>
          <option>Brasil</option>
          <option>Otra</option>
        </select>
      </div>
      <div class="form-group">
        <label>Integrantes del equipo (nicks)</label>
        <textarea placeholder="Un jugador por línea&#10;Jugador 1&#10;Jugador 2&#10;..."></textarea>
      </div>
    `
  },
  'showdown': {
    title: '1v1 Showdown — Semanal',
    sub:   'Inscribite individualmente al torneo 1v1.',
    form: `
      <div class="form-group">
        <label>Nick en Deadlock *</label>
        <input type="text" placeholder="Tu nick en el juego" required />
      </div>
      <div class="form-group">
        <label>Discord *</label>
        <input type="text" placeholder="usuario#0000" required />
      </div>
      <div class="form-group">
        <label>País</label>
        <select>
          <option>Argentina</option>
          <option>Chile</option>
          <option>México</option>
          <option>Colombia</option>
          <option>Brasil</option>
          <option>Otro</option>
        </select>
      </div>
      <div class="form-group">
        <label>Experiencia en Deadlock</label>
        <select>
          <option>Principiante (menos de 100h)</option>
          <option>Intermedio (100–500h)</option>
          <option>Avanzado (500h+)</option>
        </select>
      </div>
    `
  }
};

function openModal(id) {
  const data = tournamentData[id];
  if (!data) return;

  document.getElementById('modalContent').innerHTML = `
    <h3>${data.title}</h3>
    <p class="modal-sub">${data.sub}</p>
    <form id="inscriptionForm" onsubmit="submitForm(event)">
      ${data.form}
      <button type="submit" class="btn btn-primary btn-block" style="margin-top:8px">
        Confirmar inscripción
      </button>
    </form>
  `;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

overlay.addEventListener('click', (e) => {
  if (e.target === overlay) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

function submitForm(e) {
  e.preventDefault();
  document.getElementById('modalContent').innerHTML = `
    <div class="success-msg">
      <div class="success-icon">🎉</div>
      <h3>¡Inscripción recibida!</h3>
      <p>Te contactaremos por Discord con los detalles del torneo.<br/>
         Mientras tanto, <strong>unite a nuestro Discord</strong> si aún no lo hiciste.</p>
      <br/>
      <a href="https://discord.gg/TU_INVITE_AQUI" target="_blank" class="btn btn-discord" style="width:100%;justify-content:center;margin-top:8px">
        Ir al Discord
      </a>
    </div>
  `;
  setTimeout(closeModal, 5000);
}

/* ── Smooth active nav links ── */
const sections = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(sec => {
    if (window.scrollY >= sec.offsetTop - 120) current = sec.id;
  });
  navAnchors.forEach(a => {
    a.style.color = a.getAttribute('href') === '#' + current
      ? 'var(--orange)'
      : '';
  });
}, { passive: true });
