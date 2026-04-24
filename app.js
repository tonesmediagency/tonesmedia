// Tones Media — interactions
// All animations follow the Emil Kowalski framework:
// transform/opacity only, ease-out custom curve, <300ms, stagger 50ms.

(() => {
  const doc = document.documentElement;
  const body = document.body;

  // Page mount reveal (fallback when View Transitions API isn't active)
  requestAnimationFrame(() => body.setAttribute('data-mounted', 'true'));

  // Scrolled nav state
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => {
      nav.setAttribute('data-scrolled', String(window.scrollY > 8));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Mobile nav sheet
  const burger = document.querySelector('.nav__burger');
  const sheet = document.querySelector('.sheet');
  if (burger && sheet && nav) {
    const toggle = (open) => {
      const isOpen = open ?? sheet.getAttribute('data-open') !== 'true';
      sheet.setAttribute('data-open', String(isOpen));
      nav.setAttribute('data-open', String(isOpen));
      burger.setAttribute('aria-expanded', String(isOpen));
      body.style.overflow = isOpen ? 'hidden' : '';
    };
    burger.addEventListener('click', () => toggle());
    sheet.addEventListener('click', (e) => {
      if (e.target.closest('a')) toggle(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sheet.getAttribute('data-open') === 'true') toggle(false);
    });
  }

  // Reveal-on-scroll with staggered delay
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '-40px 0px -10% 0px', threshold: 0.05 }
    );
    // Apply a gentle stagger to sibling groups that share a .stagger parent
    document.querySelectorAll('.stagger').forEach((group) => {
      const kids = group.querySelectorAll('.reveal');
      kids.forEach((el, i) => {
        el.style.setProperty('--stagger', `${Math.min(i * 60, 360)}ms`);
      });
    });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  // Active nav link highlighting based on current file
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('[data-nav-link]').forEach((a) => {
    const href = a.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      a.setAttribute('aria-current', 'page');
    }
  });

  // Chip group (multi-select on contact form)
  document.querySelectorAll('[data-chip-group]').forEach((group) => {
    group.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      const pressed = chip.getAttribute('aria-pressed') === 'true';
      chip.setAttribute('aria-pressed', String(!pressed));
    });
  });

  // ────────────────────────────────────────────
  // Success modal
  // ────────────────────────────────────────────
  const modal = document.querySelector('[data-modal]');
  let lastFocused = null;

  function openModal(email) {
    if (!modal) return;
    lastFocused = document.activeElement;
    if (email) {
      const target = modal.querySelector('[data-modal-email]');
      if (target) target.textContent = email;
    }
    modal.setAttribute('data-open', 'true');
    modal.setAttribute('aria-hidden', 'false');
    body.style.overflow = 'hidden';
    const firstBtn = modal.querySelector('[data-modal-close].btn, .modal__close');
    setTimeout(() => firstBtn?.focus(), 60);
  }

  function closeModal() {
    if (!modal) return;
    modal.setAttribute('data-open', 'false');
    modal.setAttribute('aria-hidden', 'true');
    body.style.overflow = '';
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  if (modal) {
    modal.querySelectorAll('[data-modal-close]').forEach((el) => {
      el.addEventListener('click', closeModal);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.getAttribute('data-open') === 'true') closeModal();
    });
  }

  // ────────────────────────────────────────────
  // Contact form → Formspree (AJAX) + modal
  // ────────────────────────────────────────────
  const form = document.querySelector('[data-form]');
  if (form) {
    const errorBox = form.querySelector('[data-form-error]');
    const submitBtn = form.querySelector('[data-submit]');
    const submitLabel = form.querySelector('[data-submit-label]');
    const chipGroup = form.querySelector('[data-chip-group]');

    const action = form.getAttribute('action') || '';
    const isDemo = !action || action.includes('YOUR_FORM_ID');

    function setError(text) {
      if (!errorBox) return;
      errorBox.textContent = text || '';
      errorBox.setAttribute('data-show', text ? 'true' : 'false');
    }

    function resetForm() {
      form.querySelectorAll('input:not([type=hidden]), textarea, select').forEach((el) => {
        el.value = '';
      });
      chipGroup?.querySelectorAll('.chip[aria-pressed="true"]').forEach((c) => {
        c.setAttribute('aria-pressed', 'false');
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      setError('');

      const data = new FormData(form);
      const name = (data.get('name') || '').toString().trim();
      const email = (data.get('email') || '').toString().trim();

      if (!name) { setError('Scrivi il tuo nome.'); return; }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('Controlla l\'email: non sembra valida.');
        return;
      }

      // Flatten chips into a single readable field for the email
      const chips = [...(chipGroup?.querySelectorAll('.chip[aria-pressed="true"]') || [])]
        .map((c) => c.textContent.trim());
      if (chips.length) data.set('interessi', chips.join(', '));
      // Mirror user email into _replyto so Formspree replies go there
      data.set('_replyto', email);

      submitBtn?.setAttribute('data-loading', 'true');

      try {
        if (isDemo) {
          // Placeholder endpoint: simulate success so the UX is testable
          await new Promise((r) => setTimeout(r, 600));
        } else {
          const res = await fetch(action, {
            method: 'POST',
            body: data,
            headers: { Accept: 'application/json' },
          });
          if (!res.ok) {
            let msg = 'Qualcosa è andato storto. Riprova tra poco o scrivici a tonesmediagency@gmail.com.';
            try {
              const j = await res.json();
              if (j && j.errors && j.errors.length) {
                msg = j.errors.map((x) => x.message).join(' · ');
              }
            } catch (_) {}
            throw new Error(msg);
          }
        }

        openModal(email);
        resetForm();
      } catch (err) {
        setError(err.message || 'Invio fallito. Riprova.');
      } finally {
        submitBtn?.removeAttribute('data-loading');
      }
    });
  }
})();
