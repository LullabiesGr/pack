class PackMenu {
  constructor() {
    this.button = document.querySelector('[data-menu-toggle]');
    this.menu = document.querySelector('[data-mobile-nav]');
    if (!this.button || !this.menu) return;
    this.button.addEventListener('click', () => this.toggle());
    this.menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) this.close();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') this.close();
    });
  }
  toggle() {
    const open = this.button.getAttribute('aria-expanded') === 'true';
    this.button.setAttribute('aria-expanded', String(!open));
    this.menu.classList.toggle('is-open', !open);
    document.body.classList.toggle('menu-open', !open);
  }
  close() {
    if (this.button.getAttribute('aria-expanded') !== 'true') return;
    this.button.setAttribute('aria-expanded', 'false');
    this.menu.classList.remove('is-open');
    document.body.classList.remove('menu-open');
  }
}

class PackCartDrawer {
  constructor() {
    this.enabled = document.body?.dataset.cartBehavior === 'drawer';
    this.drawer = document.querySelector('[data-cart-drawer]');
    this.lastTrigger = null;
    if (!this.enabled || !this.drawer) return;
    document.addEventListener('click', (event) => this.handleClick(event));
    document.addEventListener('change', (event) => this.handleChange(event));
    document.addEventListener('keydown', (event) => this.handleKeydown(event));
  }
  handleClick(event) {
    const openButton = event.target.closest('[data-cart-drawer-open]');
    if (openButton) {
      event.preventDefault();
      this.lastTrigger = openButton;
      this.open();
      return;
    }

    if (event.target.closest('[data-cart-drawer-close]')) {
      event.preventDefault();
      this.close();
      return;
    }

    const quantityButton = event.target.closest('[data-cart-line-change]');
    if (quantityButton) {
      event.preventDefault();
      this.changeLine(Number(quantityButton.dataset.line), Math.max(0, Number(quantityButton.dataset.quantity)));
    }
  }
  handleChange(event) {
    const quantityInput = event.target.closest('[data-cart-quantity]');
    if (quantityInput) {
      this.changeLine(Number(quantityInput.dataset.line), Math.max(0, Number(quantityInput.value)));
      return;
    }

    const note = event.target.closest('[data-cart-note]');
    if (note) this.saveNote(note.value);
  }
  handleKeydown(event) {
    if (!this.drawer?.classList.contains('is-open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key !== 'Tab') return;
    const panel = this.drawer.querySelector('[data-cart-drawer-panel]');
    const focusable = [...panel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter((element) => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  open(moveFocus = true) {
    if (!this.drawer) return;
    this.drawer.classList.add('is-open');
    this.drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cart-drawer-open');
    if (moveFocus) window.requestAnimationFrame(() => this.drawer.querySelector('[data-cart-drawer-panel]')?.focus());
  }
  close() {
    if (!this.drawer) return;
    this.drawer.classList.remove('is-open');
    this.drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cart-drawer-open');
    this.lastTrigger?.focus();
  }
  setBusy(busy) {
    if (!this.drawer) return;
    this.drawer.classList.toggle('is-loading', busy);
    this.drawer.setAttribute('aria-busy', String(busy));
  }
  showError(message) {
    const error = this.drawer?.querySelector('[data-cart-drawer-error]');
    if (!error) return;
    error.textContent = message;
    error.hidden = !message;
  }
  async changeLine(line, quantity) {
    if (!line || Number.isNaN(quantity)) return;
    this.setBusy(true);
    this.showError('');
    try {
      const response = await fetch(`${window.Shopify.routes.root}cart/change.js`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ line, quantity })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.description || 'Could not update the cart.');
      await this.refresh(true);
    } catch (error) {
      this.showError(error.message || 'Could not update the cart.');
    } finally {
      this.setBusy(false);
    }
  }
  async saveNote(note) {
    try {
      const response = await fetch(`${window.Shopify.routes.root}cart/update.js`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ note })
      });
      if (!response.ok) throw new Error('Could not save the order note.');
    } catch (error) {
      this.showError(error.message || 'Could not save the order note.');
    }
  }
  async refresh(shouldOpen = false) {
    if (!this.enabled) return;
    const wasOpen = this.drawer?.classList.contains('is-open');
    const root = window.Shopify.routes.root;
    const [sectionResponse, cartResponse] = await Promise.all([
      fetch(`${root}?section_id=cart-drawer`),
      fetch(`${root}cart.js`, { headers: { Accept: 'application/json' } })
    ]);
    if (!sectionResponse.ok || !cartResponse.ok) throw new Error('Could not refresh the cart.');
    const [sectionText, cart] = await Promise.all([sectionResponse.text(), cartResponse.json()]);
    const parsed = new DOMParser().parseFromString(sectionText, 'text/html');
    const nextDrawer = parsed.querySelector('[data-cart-drawer]');
    if (!nextDrawer) throw new Error('Cart drawer markup is unavailable.');
    this.drawer.replaceWith(nextDrawer);
    this.drawer = nextDrawer;
    document.querySelectorAll('[data-cart-count]').forEach((count) => { count.textContent = cart.item_count; });
    if (shouldOpen || wasOpen) this.open(false);
  }
}

class PackQuickAdd {
  constructor() {
    document.addEventListener('submit', (event) => {
      const form = event.target.closest('[data-quick-add], [data-product-form]');
      if (!form || !window.fetch) return;
      if (form.matches('[data-product-form]') && document.body.dataset.cartBehavior !== 'drawer') return;
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
      const result = await response.json();
      if (!response.ok) throw new Error(result.description || 'Could not add this item.');
      if (window.packCartDrawer?.enabled) {
        await window.packCartDrawer.refresh(true);
      } else {
        const cart = await fetch(`${window.Shopify.routes.root}cart.js`).then((cartResponse) => cartResponse.json());
        document.querySelectorAll('[data-cart-count]').forEach((count) => { count.textContent = cart.item_count; });
        this.toast('Added to your good stuff.');
      }
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

class PackBundleBuilder {
  constructor(root = document) { this.bind(root); }
  bind(root = document) {
    root.querySelectorAll('[data-bundle-builder]').forEach((builder) => {
      if (builder.dataset.bundleBound === 'true') return;
      builder.dataset.bundleBound = 'true';
      builder.addEventListener('change', (event) => this.handleChange(builder, event));
      builder.addEventListener('submit', (event) => this.submit(builder, event));
      this.render(builder);
    });
  }
  handleChange(builder, event) {
    const card = event.target.closest('[data-bundle-card]');
    if (event.target.matches('[data-bundle-variant]') && card) {
      const option = event.target.selectedOptions?.[0] || event.target;
      const checkbox = card.querySelector('[data-bundle-product]');
      if (checkbox) checkbox.value = event.target.value;
      const price = card.querySelector('[data-bundle-card-price]');
      if (price && option.dataset.priceLabel) price.textContent = option.dataset.priceLabel;
    }
    if (event.target.matches('[data-bundle-product]')) {
      const selected = builder.querySelectorAll('[data-bundle-product]:checked');
      if (selected.length > Number(builder.dataset.max || 4)) event.target.checked = false;
    }
    this.render(builder);
  }
  selected(builder) { return [...builder.querySelectorAll('[data-bundle-product]:checked')]; }
  render(builder) {
    const selected = this.selected(builder);
    const min = Number(builder.dataset.min || 1);
    const max = Number(builder.dataset.max || 4);
    const discountMode = builder.dataset.discountMode || 'none';
    const discountPercent = Math.max(0, Math.min(100, Number(builder.dataset.discountPercent || 0)));
    const discountCode = (builder.dataset.discountCode || '').trim();
    const discountConfigured = discountMode === 'automatic' || (discountMode === 'code' && discountCode.length > 0);
    const atMax = selected.length >= max;
    builder.querySelectorAll('[data-bundle-product]:not(:checked)').forEach((input) => {
      input.disabled = atMax || input.closest('.is-unavailable') !== null;
    });
    const count = builder.querySelector('[data-bundle-count]');
    if (count) count.textContent = `${selected.length} / ${max}`;
    const total = selected.reduce((sum, checkbox) => {
      const variant = checkbox.closest('[data-bundle-card]')?.querySelector('[data-bundle-variant]');
      const option = variant?.selectedOptions?.[0] || variant;
      return sum + Number(option?.dataset.price || 0);
    }, 0);
    const discountEligible = selected.length >= min && discountConfigured && discountPercent > 0;
    const savings = discountEligible ? Math.round(total * discountPercent / 100) : 0;
    const subtotalNode = builder.querySelector('[data-bundle-subtotal]');
    const savingsNode = builder.querySelector('[data-bundle-savings]');
    const savingsRow = builder.querySelector('[data-bundle-savings-row]');
    const totalNode = builder.querySelector('[data-bundle-total]');
    if (subtotalNode) subtotalNode.textContent = this.money(total, builder.dataset.currency);
    if (savingsNode) savingsNode.textContent = `−${this.money(savings, builder.dataset.currency)}`;
    if (savingsRow) savingsRow.hidden = !discountEligible;
    if (totalNode) totalNode.textContent = this.money(total - savings, builder.dataset.currency);
    const status = builder.querySelector('[data-bundle-status]');
    if (status) {
      if (selected.length < min) status.textContent = `Choose ${min - selected.length} more to complete the box.`;
      else if (discountMode === 'code' && !discountCode) status.textContent = 'Your box is ready. The merchant has not configured its discount code.';
      else if (atMax) status.textContent = 'Your box is full.';
      else status.textContent = `${max - selected.length} more can be added.`;
    }
    const submit = builder.querySelector('[data-bundle-submit]');
    if (submit) submit.disabled = selected.length < min || selected.length > max;
  }
  money(cents, currency) {
    try {
      return new Intl.NumberFormat(document.documentElement.lang || 'en', { style: 'currency', currency: currency || 'USD' }).format(cents / 100);
    } catch (error) {
      return (cents / 100).toFixed(2);
    }
  }
  async submit(builder, event) {
    event.preventDefault();
    const selected = this.selected(builder);
    if (selected.length < Number(builder.dataset.min || 1)) return;
    const button = builder.querySelector('[data-bundle-submit]');
    const status = builder.querySelector('[data-bundle-status]');
    button.disabled = true;
    builder.setAttribute('aria-busy', 'true');
    if (status) status.textContent = 'Adding your box…';
    let completionMessage = '';
    let boxAdded = false;
    const items = selected.map((checkbox) => ({
      id: Number(checkbox.value),
      quantity: 1,
      properties: {
        '_PACK box': builder.dataset.sectionId || 'bundle',
        '_PACK discount': builder.dataset.discountMode === 'none' ? 'none' : `${builder.dataset.discountPercent || 0}%`
      }
    }));
    try {
      const response = await fetch(`${window.Shopify.routes.root}cart/add.js`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.description || 'Could not add this box.');
      boxAdded = true;
      const discountMode = builder.dataset.discountMode || 'none';
      const discountCode = (builder.dataset.discountCode || '').trim();
      if (discountMode === 'code' && discountCode) {
        const discountResponse = await fetch(`${window.Shopify.routes.root}cart/update.js`, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ discount: discountCode })
        });
        const discountResult = await discountResponse.json();
        if (!discountResponse.ok) throw new Error(discountResult.description || 'Your box was added, but the discount could not be applied.');
      }
      if (discountMode === 'code' && discountCode) completionMessage = `Your box was added with discount code ${discountCode}.`;
      else if (discountMode === 'automatic') completionMessage = 'Your box was added. Shopify will apply the eligible automatic discount.';
      else completionMessage = 'Your box was added to the cart.';
      if (window.packCartDrawer?.enabled) await window.packCartDrawer.refresh(true);
      else {
        const cart = await fetch(`${window.Shopify.routes.root}cart.js`).then((cartResponse) => cartResponse.json());
        document.querySelectorAll('[data-cart-count]').forEach((count) => { count.textContent = cart.item_count; });
        this.toast('Your box was added to the cart.');
      }
    } catch (error) {
      completionMessage = error.message || 'Could not add this box.';
    } finally {
      builder.removeAttribute('aria-busy');
      if (boxAdded) selected.forEach((checkbox) => { checkbox.checked = false; });
      this.render(builder);
      if (status && completionMessage) status.textContent = completionMessage;
    }
  }
  toast(message) {
    const toast = document.querySelector('[data-cart-toast]');
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    window.setTimeout(() => { toast.hidden = true; }, 3000);
  }
}

class PackQuiz {
  constructor(root = document) { this.bind(root); }
  bind(root = document) {
    root.querySelectorAll('[data-pack-quiz]').forEach((quiz) => {
      if (quiz.dataset.quizBound === 'true') return;
      quiz.dataset.quizBound = 'true';
      quiz.packQuizState = { current: 0, answers: [] };
      quiz.addEventListener('click', (event) => this.handle(quiz, event));
    });
  }
  handle(quiz, event) {
    if (event.target.closest('[data-quiz-start]')) return this.start(quiz);
    const answer = event.target.closest('[data-quiz-answer]');
    if (answer) return this.answer(quiz, answer);
    if (event.target.closest('[data-quiz-back]')) return this.back(quiz);
    if (event.target.closest('[data-quiz-restart]')) return this.restart(quiz);
  }
  start(quiz) {
    if (!quiz.querySelectorAll('[data-quiz-question]').length) return;
    quiz.querySelector('[data-quiz-intro]').hidden = true;
    quiz.querySelector('[data-quiz-result]').hidden = true;
    quiz.querySelector('[data-quiz-flow]').hidden = false;
    quiz.packQuizState = { current: 0, answers: [] };
    this.showQuestion(quiz);
  }
  answer(quiz, answer) {
    const state = quiz.packQuizState;
    state.answers[state.current] = answer.dataset.resultKey;
    state.current += 1;
    if (state.current >= quiz.querySelectorAll('[data-quiz-question]').length) this.finish(quiz);
    else this.showQuestion(quiz);
  }
  back(quiz) {
    const state = quiz.packQuizState;
    if (state.current <= 0) return;
    state.current -= 1;
    state.answers = state.answers.slice(0, state.current);
    this.showQuestion(quiz);
  }
  restart(quiz) {
    quiz.querySelector('[data-quiz-result]').hidden = true;
    quiz.querySelector('[data-quiz-intro]').hidden = false;
    quiz.packQuizState = { current: 0, answers: [] };
    quiz.querySelector('[data-quiz-start]')?.focus();
  }
  showQuestion(quiz) {
    const state = quiz.packQuizState;
    const questions = [...quiz.querySelectorAll('[data-quiz-question]')];
    questions.forEach((question, index) => { question.hidden = index !== state.current; });
    quiz.querySelector('[data-quiz-progress-bar]').style.width = `${((state.current + 1) / questions.length) * 100}%`;
    quiz.querySelector('[data-quiz-progress-label]').textContent = `Question ${state.current + 1} of ${questions.length}`;
    quiz.querySelector('[data-quiz-back]').hidden = state.current === 0;
    questions[state.current]?.querySelector('[data-quiz-answer]')?.focus();
  }
  finish(quiz) {
    const scores = quiz.packQuizState.answers.reduce((map, key) => map.set(key, (map.get(key) || 0) + 1), new Map());
    const winner = [...scores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'all-products';
    const sources = [...quiz.querySelectorAll('template[data-quiz-result-source]')];
    const source = sources.find((template) => template.dataset.quizResultSource === winner)
      || sources.find((template) => template.dataset.quizResultSource === 'default')
      || sources[0];
    const target = quiz.querySelector('[data-quiz-result-content]');
    target.replaceChildren(source ? source.content.cloneNode(true) : document.createTextNode('No recommendation is configured.'));
    quiz.querySelector('[data-quiz-flow]').hidden = true;
    quiz.querySelector('[data-quiz-result]').hidden = false;
    window.packReveal?.observe(target);
    window.packTilt?.bind(target);
    quiz.querySelector('[data-quiz-restart]')?.focus();
  }
}

class PackProductGallery {
  constructor(root = document) { this.bind(root); }
  bind(root = document) {
    root.querySelectorAll('[data-product-gallery]').forEach((gallery) => {
      if (gallery.dataset.galleryBound === 'true') return;
      gallery.dataset.galleryBound = 'true';
      const track = gallery.querySelector('[data-product-gallery-track]');
      if (!track) return;
      const items = [...track.querySelectorAll('.product-gallery__item')];
      if (items.length < 2) return;
      gallery.querySelector('[data-gallery-prev]')?.addEventListener('click', () => track.scrollBy({ left: -track.clientWidth, behavior: 'smooth' }));
      gallery.querySelector('[data-gallery-next]')?.addEventListener('click', () => track.scrollBy({ left: track.clientWidth, behavior: 'smooth' }));
      const update = () => {
        const index = Math.max(0, Math.min(items.length - 1, Math.round(track.scrollLeft / Math.max(track.clientWidth, 1))));
        const counter = gallery.querySelector('[data-gallery-counter]');
        if (counter) counter.textContent = `${index + 1} / ${items.length}`;
        gallery.querySelector('[data-gallery-prev]')?.toggleAttribute('disabled', index === 0);
        gallery.querySelector('[data-gallery-next]')?.toggleAttribute('disabled', index === items.length - 1);
      };
      track.addEventListener('scroll', update, { passive: true });
      update();
    });
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
  window.packCartDrawer = new PackCartDrawer();
  window.packQuickAdd = new PackQuickAdd();
  window.packBundleBuilder = new PackBundleBuilder();
  window.packQuiz = new PackQuiz();
  window.packProductGallery = new PackProductGallery();
  window.packReveal = new PackReveal();
  window.packTilt = new PackTilt();
  window.packRecentlyViewed = new PackRecentlyViewed();
});

document.addEventListener('shopify:section:load', (event) => {
  window.packBundleBuilder?.bind(event.target);
  window.packQuiz?.bind(event.target);
  window.packProductGallery?.bind(event.target);
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
