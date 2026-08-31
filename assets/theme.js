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

class PackTilt {
  constructor(root = document) {
    this.enabled = window.matchMedia('(hover: hover) and (pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.bind(root);
  }
  bind(root = document) {
    if (!this.enabled) return;
    root.querySelectorAll('[data-pack-tilt]').forEach((element) => {
      if (element.dataset.packTiltBound === 'true') return;
      element.dataset.packTiltBound = 'true';
      element.addEventListener('pointermove', (event) => {
        const bounds = element.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        element.style.setProperty('--pack-tilt-x', `${(-y * 11).toFixed(2)}deg`);
        element.style.setProperty('--pack-tilt-y', `${(x * 11).toFixed(2)}deg`);
        element.classList.add('is-pack-tilting');
      });
      element.addEventListener('pointerleave', () => {
        element.classList.remove('is-pack-tilting');
        element.style.removeProperty('--pack-tilt-x');
        element.style.removeProperty('--pack-tilt-y');
      });
    });
  }
}

class PackRecentlyViewed {
  constructor(root = document) {
    this.storageKey = 'pack-recently-viewed-products';
    this.recordCurrent(root);
    this.render(root);
  }
  read() {
    try { return JSON.parse(window.localStorage.getItem(this.storageKey) || '[]'); }
    catch (error) { return []; }
  }
  write(products) {
    try { window.localStorage.setItem(this.storageKey, JSON.stringify(products.slice(0, 12))); }
    catch (error) { /* Storage can be disabled without breaking the storefront. */ }
  }
  recordCurrent(root) {
    const data = root.querySelector('[data-pack-current-product]');
    if (!data) return;
    try {
      const current = JSON.parse(data.textContent);
      if (!current?.id || !current?.url) return;
      const products = this.read().filter((item) => String(item.id) !== String(current.id));
      this.write([current, ...products]);
    } catch (error) { /* Invalid product JSON leaves history untouched. */ }
  }
  render(root) {
    root.querySelectorAll('[data-pack-recently-viewed]').forEach((section) => {
      const grid = section.querySelector('[data-recently-viewed-grid]');
      if (!grid || grid.childElementCount) return;
      const limit = Number(section.dataset.limit || 4);
      const currentId = String(section.dataset.currentProductId || '0');
      const showPrice = section.dataset.showPrice === 'true';
      const interaction = section.dataset.interaction || 'lift';
      const animation = section.dataset.animation || 'none';
      const products = this.read().filter((item) => String(item.id) !== currentId).slice(0, limit);
      if (!products.length) return;
      const colors = ['var(--pack-pink)', 'var(--pack-yellow)', '#9ED8FF', 'var(--pack-green)', 'var(--pack-red)', 'var(--pack-cream)'];
      products.forEach((product, index) => {
        const article = document.createElement('article');
        article.className = `product-card pack-interaction--${interaction}`;
        article.style.setProperty('--card-bg', colors[index % colors.length]);
        if (interaction === 'tilt') article.dataset.packTilt = '';
        if (animation !== 'none') {
          article.dataset.packReveal = animation;
          article.style.setProperty('--pack-reveal-delay', `${index * 90}ms`);
        }
        const media = document.createElement('a');
        media.className = 'product-card__media';
        media.href = product.url;
        media.setAttribute('aria-label', product.title);
        if (product.image) {
          const image = document.createElement('img');
          image.src = product.image;
          image.alt = product.title;
          image.loading = 'lazy';
          media.appendChild(image);
        }
        const info = document.createElement('div');
        info.className = 'product-card__info';
        const title = document.createElement('a');
        title.className = 'product-card__title';
        title.href = product.url;
        title.textContent = product.title;
        info.appendChild(title);
        if (showPrice && product.price) {
          const price = document.createElement('span');
          price.className = 'product-card__price';
          price.textContent = product.price;
          info.appendChild(price);
        }
        article.append(media, info);
        grid.appendChild(article);
      });
      section.hidden = false;
      section.querySelector('[data-recently-viewed-empty]')?.remove();
      window.packReveal?.observe(section);
      window.packTilt?.bind(section);
    });
  }
}

if (!customElements.get('product-recommendations')) {
  customElements.define('product-recommendations', class extends HTMLElement {
    connectedCallback() {
      if (this.querySelector('.product-grid') || !this.dataset.url) return;
      fetch(this.dataset.url)
        .then((response) => response.text())
        .then((text) => {
          const html = new DOMParser().parseFromString(text, 'text/html');
          const source = html.querySelector('product-recommendations');
          if (!source?.innerHTML.trim()) return;
          this.innerHTML = source.innerHTML;
          this.hidden = false;
          window.packReveal?.observe(this);
          window.packTilt?.bind(this);
        })
        .catch(() => {});
    }
  });
}

customElements.define('pack-menu', class extends HTMLElement {});
document.addEventListener('DOMContentLoaded', () => {
  new PackMenu();
  new PackQuickAdd();
  window.packReveal = new PackReveal();
  window.packTilt = new PackTilt();
  window.packRecentlyViewed = new PackRecentlyViewed();
});

document.addEventListener('shopify:section:load', (event) => {
  if (!window.packReveal) window.packReveal = new PackReveal(event.target);
  else window.packReveal.observe(event.target);
  if (!window.packTilt) window.packTilt = new PackTilt(event.target);
  else window.packTilt.bind(event.target);
  if (!window.packRecentlyViewed) window.packRecentlyViewed = new PackRecentlyViewed(event.target);
  else {
    window.packRecentlyViewed.recordCurrent(event.target);
    window.packRecentlyViewed.render(event.target);
  }
});
