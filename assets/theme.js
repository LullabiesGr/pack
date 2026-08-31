class PackMenu {
  constructor() {
    this.button = document.querySelector('[data-menu-toggle]');
    this.menu = document.querySelector('[data-mobile-nav]');
    if (!this.button || !this.menu) return;
    this.button.addEventListener('click', () => this.toggle());
  }
  toggle() {
    const open = this.button.getAttribute('aria-expanded') === 'true';
    this.button.setAttribute('aria-expanded', String(!open));
    this.menu.classList.toggle('is-open', !open);
    document.body.classList.toggle('menu-open', !open);
  }
}

class PackQuickAdd {
  constructor() {
    document.addEventListener('submit', (event) => {
      const form = event.target.closest('[data-quick-add]');
      if (!form || !window.fetch) return;
      event.preventDefault();
      this.add(form);
    });
  }
  async add(form) {
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    button.disabled = true;
    try {
      const response = await fetch(`${window.Shopify.routes.root}cart/add.js`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      });
      if (!response.ok) throw new Error('Could not add this item.');
      const cart = await fetch(`${window.Shopify.routes.root}cart.js`).then((result) => result.json());
      document.querySelectorAll('[data-cart-count]').forEach((count) => { count.textContent = cart.item_count; });
      this.toast('Added to your good stuff.');
    } catch (error) {
      this.toast(error.message || 'Something went wrong.');
    } finally {
      button.disabled = false;
    }
  }
  toast(message) {
    const toast = document.querySelector('[data-cart-toast]');
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3000);
  }
}

class PackReveal {
  constructor(root = document) {
    this.repeat = document.body?.dataset.packMotionRepeat === 'true';
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.observer = null;
    this.observe(root);
  }
  observe(root = document) {
    const elements = [...root.querySelectorAll('[data-pack-reveal]')];
    if (!elements.length) return;

    if (this.reducedMotion || !('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('is-visible'));
      return;
    }

    document.documentElement.classList.add('pack-reveal-ready');
    if (!this.observer) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            if (!this.repeat) this.observer.unobserve(entry.target);
          } else if (this.repeat) {
            entry.target.classList.remove('is-visible');
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    }

    elements.forEach((element) => {
      if (element.dataset.packRevealBound === 'true') return;
      element.dataset.packRevealBound = 'true';
      this.observer.observe(element);
    });
  }
}

customElements.define('pack-menu', class extends HTMLElement {});
document.addEventListener('DOMContentLoaded', () => {
  new PackMenu();
  new PackQuickAdd();
  window.packReveal = new PackReveal();
});

document.addEventListener('shopify:section:load', (event) => {
  if (!window.packReveal) window.packReveal = new PackReveal(event.target);
  else window.packReveal.observe(event.target);
});
