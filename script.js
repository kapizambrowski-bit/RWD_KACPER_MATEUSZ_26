/* VoltPC – koszyk (localStorage), konfigurator PC, filtry sklepu, nawigacja, blog i panel klienta */
(() => {
  'use strict';

  const CART_KEY = 'voltpc_cart_v1';
  const COUPON_KEY = 'voltpc_coupon_v1';
  const PROFILE_KEY = 'voltpc_profile_v1';
  const ADDRESS_KEY = 'voltpc_address_v1';
  const VALID_COUPON = 'VOLTPC2026';
  const DISCOUNT_RATE = 0.05;

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function loadCart() {
    const items = loadJSON(CART_KEY, []);
    return Array.isArray(items) ? items : [];
  }

  function saveCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    updateCartBadge();
  }

  function loadCoupon() {
    try {
      const code = localStorage.getItem(COUPON_KEY);
      return code === VALID_COUPON ? code : '';
    } catch {
      return '';
    }
  }

  function saveCoupon(code) {
    if (code === VALID_COUPON) {
      localStorage.setItem(COUPON_KEY, code);
    } else {
      localStorage.removeItem(COUPON_KEY);
    }
  }

  function formatPLN(value, withDecimals = false) {
    const num = Number(value) || 0;
    const formatted = num.toLocaleString('pl-PL', {
      minimumFractionDigits: withDecimals ? 2 : 0,
      maximumFractionDigits: withDecimals ? 2 : 0
    });
    return `${formatted}\u00a0zł`;
  }

  function calculateTotals(items, couponCode) {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 1), 0);
    const hasDiscount = couponCode === VALID_COUPON && subtotal > 0;
    const discount = hasDiscount ? Math.round(subtotal * DISCOUNT_RATE) : 0;
    const total = Math.max(0, subtotal - discount);
    const vat = total * (23 / 123);
    return { subtotal, discount, total, vat, hasDiscount };
  }

  function addItemToCart(newItem) {
    const cart = loadCart();
    const id = String(newItem.id || newItem.name);
    const existing = cart.find((entry) => entry.id === id);
    if (existing) {
      existing.qty = Math.min(10, (Number(existing.qty) || 1) + (Number(newItem.qty) || 1));
    } else {
      cart.push({
        id,
        name: String(newItem.name),
        variant: String(newItem.variant || ''),
        price: Number(newItem.price) || 0,
        qty: Math.min(10, Math.max(1, Number(newItem.qty) || 1)),
        image: String(newItem.image || 'https://images.unsplash.com/photo-1658673609646-9c7ba9514b89?auto=format&fit=crop&w=240&q=80'),
        url: String(newItem.url || 'produkt.html')
      });
    }
    saveCart(cart);
  }

  function updateCartBadge() {
    const cart = loadCart();
    const count = cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    document.querySelectorAll('.js-cart-count').forEach((el) => {
      el.textContent = String(count);
    });
  }

  /* ------------------------------------------------------------------------
     1. Podświetlenie paska nawigacji (Start vs Konfigurator na index.html)
     ------------------------------------------------------------------------ */
  function syncNavbarHashState() {
    const path = window.location.pathname;
    const isHomePage = path === '' || path.endsWith('/') || path.endsWith('/index.html') || path === 'index.html';
    if (!isHomePage) return;

    const startLink = document.querySelector('.site-navbar .nav-link[href="index.html"]');
    const configLink = document.querySelector('.site-navbar .nav-link[href="index.html#konfigurator"]');
    if (!startLink || !configLink) return;

    if (window.location.hash === '#konfigurator') {
      startLink.classList.remove('active');
      startLink.removeAttribute('aria-current');
      configLink.classList.add('active');
      configLink.setAttribute('aria-current', 'page');
    } else {
      configLink.classList.remove('active');
      configLink.removeAttribute('aria-current');
      startLink.classList.add('active');
      startLink.setAttribute('aria-current', 'page');
    }
  }

  /* ------------------------------------------------------------------------
     2. Strona koszyka (koszyk.html)
     ------------------------------------------------------------------------ */
  function initCartPage() {
    const tbody = document.getElementById('koszyk-wiersze');
    if (!tbody) return;

    const emptyBox = document.getElementById('koszyk-pusty');
    const filledBox = document.getElementById('koszyk-zawartosc');
    const subtotalEl = document.getElementById('suma-czesciowa');
    const discountRow = document.getElementById('wiersz-rabatu');
    const discountEl = document.getElementById('kwota-rabatu');
    const totalEl = document.getElementById('suma-koncowa');
    const vatEl = document.getElementById('kwota-vat');
    const checkoutBtn = document.getElementById('przejdz-do-zamowienia');
    const shopFallbackBtn = document.getElementById('przejdz-do-sklepu-koszyk');
    const clearBtn = document.getElementById('wyczysc-koszyk');
    const couponForm = document.getElementById('formularz-kuponu');
    const couponInput = document.getElementById('kod-rabatowy');
    const couponMsg = document.getElementById('komunikat-kuponu');

    function renderCart() {
      const cart = loadCart();
      const coupon = loadCoupon();
      const totals = calculateTotals(cart, coupon);

      tbody.textContent = '';

      if (cart.length === 0) {
        if (emptyBox) emptyBox.classList.remove('d-none');
        if (filledBox) filledBox.classList.add('d-none');
        if (checkoutBtn) checkoutBtn.classList.add('d-none');
        if (shopFallbackBtn) shopFallbackBtn.classList.remove('d-none');
      } else {
        if (emptyBox) emptyBox.classList.add('d-none');
        if (filledBox) filledBox.classList.remove('d-none');
        if (checkoutBtn) checkoutBtn.classList.remove('d-none');
        if (shopFallbackBtn) shopFallbackBtn.classList.add('d-none');

        cart.forEach((item, index) => {
          const tr = document.createElement('tr');

          const tdProduct = document.createElement('td');
          const wrap = document.createElement('div');
          wrap.className = 'd-flex align-items-center gap-3';

          const img = document.createElement('img');
          img.src = item.image;
          img.alt = `Miniatura produktu ${item.name}`;
          img.className = 'cart-thumb img-fluid';
          img.width = 72;
          img.height = 54;

          const info = document.createElement('div');
          const link = document.createElement('a');
          link.href = item.url || 'produkt.html';
          link.className = 'fw-bold text-decoration-none d-block';
          link.textContent = item.name;
          info.appendChild(link);

          if (item.variant) {
            const meta = document.createElement('p');
            meta.className = 'small text-muted-brand mb-0';
            meta.textContent = item.variant;
            info.appendChild(meta);
          }

          wrap.appendChild(img);
          wrap.appendChild(info);
          tdProduct.appendChild(wrap);

          const tdUnit = document.createElement('td');
          tdUnit.className = 'text-nowrap';
          tdUnit.textContent = formatPLN(item.price);

          const tdQty = document.createElement('td');
          const inputId = `koszyk-ilosc-${index}`;
          const label = document.createElement('label');
          label.setAttribute('for', inputId);
          label.className = 'visually-hidden';
          label.textContent = `Ilość sztuk produktu ${item.name}`;

          const input = document.createElement('input');
          input.type = 'number';
          input.id = inputId;
          input.className = 'form-control qty-input';
          input.min = '1';
          input.max = '10';
          input.value = String(item.qty);
          input.addEventListener('change', () => {
            const parsed = parseInt(input.value, 10);
            const safeQty = Number.isNaN(parsed) ? 1 : Math.min(10, Math.max(1, parsed));
            const updated = loadCart();
            if (updated[index]) {
              updated[index].qty = safeQty;
              saveCart(updated);
              renderCart();
            }
          });

          tdQty.appendChild(label);
          tdQty.appendChild(input);

          const tdSubtotal = document.createElement('td');
          tdSubtotal.className = 'fw-bold text-nowrap';
          tdSubtotal.textContent = formatPLN(item.price * item.qty);

          const tdAction = document.createElement('td');
          const removeBtn = document.createElement('button');
          removeBtn.type = 'button';
          removeBtn.className = 'btn btn-outline-danger-brand';
          removeBtn.textContent = 'Usuń';
          removeBtn.setAttribute('aria-label', `Usuń ${item.name} z koszyka`);
          removeBtn.addEventListener('click', () => {
            const updated = loadCart();
            updated.splice(index, 1);
            saveCart(updated);
            renderCart();
          });
          tdAction.appendChild(removeBtn);

          tr.appendChild(tdProduct);
          tr.appendChild(tdUnit);
          tr.appendChild(tdQty);
          tr.appendChild(tdSubtotal);
          tr.appendChild(tdAction);
          tbody.appendChild(tr);
        });
      }

      if (subtotalEl) subtotalEl.textContent = formatPLN(totals.subtotal);
      if (discountRow && discountEl) {
        discountRow.classList.toggle('d-none', !totals.hasDiscount);
        discountEl.textContent = `-${formatPLN(totals.discount)}`;
      }
      if (totalEl) totalEl.textContent = formatPLN(totals.total);
      if (vatEl) vatEl.textContent = formatPLN(totals.vat, true);

      if (couponInput && coupon && !couponInput.value) {
        couponInput.value = coupon;
      }
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        saveCart([]);
        saveCoupon('');
        if (couponInput) couponInput.value = '';
        if (couponMsg) couponMsg.classList.add('d-none');
        renderCart();
      });
    }

    if (couponForm && couponInput && couponMsg) {
      couponForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const entered = couponInput.value.trim().toUpperCase();
        couponMsg.classList.remove('d-none', 'status-banner', 'status-banner-error');

        if (entered === VALID_COUPON) {
          saveCoupon(VALID_COUPON);
          couponMsg.classList.add('status-banner');
          couponMsg.textContent = 'Kod VOLTPC2026 został aktywowany – naliczono 5% rabatu od wartości zamówienia.';
        } else if (entered === '') {
          saveCoupon('');
          couponMsg.classList.add('status-banner');
          couponMsg.textContent = 'Usunięto aktywny kod rabatowy.';
        } else {
          saveCoupon('');
          couponMsg.classList.add('status-banner-error');
          couponMsg.textContent = 'Nieprawidłowy kod promocyjny. Wpisz VOLTPC2026, aby otrzymać -5% rabatu.';
        }
        renderCart();
      });
    }

    renderCart();
  }

  /* ------------------------------------------------------------------------
     3. Konfigurator PC na stronie głównej z ilościami komponentów (index.html)
     ------------------------------------------------------------------------ */
  function initConfigurator() {
    const form = document.getElementById('formularz-konfiguratora');
    if (!form) return;

    const selects = Array.from(form.querySelectorAll('select.js-config-select'));
    const qtyInputs = Array.from(form.querySelectorAll('input.js-config-qty'));
    const priceDisplay = document.getElementById('konfig-suma');
    const countDisplay = document.getElementById('konfig-liczba-czesci');
    const summaryText = document.getElementById('konfig-podsumowanie-czesci');

    function getClampedQty(input, writeBack = false) {
      if (!input) return 1;
      const min = Number(input.min) || 1;
      const max = Number(input.max) || 10;
      const parsed = parseInt(input.value, 10);
      const safe = Number.isNaN(parsed) ? min : Math.min(max, Math.max(min, parsed));
      if (writeBack) {
        input.value = String(safe);
      }
      return safe;
    }

    function getSelection(writeBackQty = false) {
      let total = 0;
      let totalItems = 0;
      const parts = [];
      const keySegments = [];

      selects.forEach((select) => {
        const opt = select.options[select.selectedIndex];
        if (!opt) return;
        const unitPrice = Number(opt.dataset.price) || 0;
        const qtyInput = select.dataset.qtyId ? document.getElementById(select.dataset.qtyId) : null;
        const qty = getClampedQty(qtyInput, writeBackQty);
        const shortName = opt.dataset.short || opt.textContent.split('–')[0].trim();

        total += unitPrice * qty;
        totalItems += qty;
        parts.push(qty > 1 ? `${qty}× ${shortName}` : shortName);
        keySegments.push(qty > 1 ? `${select.value}x${qty}` : select.value);
      });

      return { total, totalItems, parts, configKey: keySegments.join('-') };
    }

    function updateConfiguratorUI(writeBackQty = false) {
      const { total, totalItems, parts } = getSelection(writeBackQty);
      if (priceDisplay) priceDisplay.textContent = formatPLN(total);
      if (countDisplay) countDisplay.textContent = String(totalItems);
      if (summaryText) summaryText.textContent = parts.slice(0, 4).join(' • ');
    }

    selects.forEach((select) => {
      select.addEventListener('change', () => updateConfiguratorUI(false));
    });

    qtyInputs.forEach((input) => {
      input.addEventListener('input', () => updateConfiguratorUI(false));
      input.addEventListener('change', () => updateConfiguratorUI(true));
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const { total, parts, configKey } = getSelection(true);
      addItemToCart({
        id: `konfig-${configKey}`,
        name: 'Konfiguracja własna VoltPC (z montażem i testami OCCT)',
        variant: parts.join(' | '),
        price: total,
        qty: 1,
        image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=240&q=80',
        url: 'index.html#konfigurator'
      });
      window.location.href = 'koszyk.html';
    });

    updateConfiguratorUI(true);
  }

  /* ------------------------------------------------------------------------
     4. Karta produktu i warianty (produkt.html)
     ------------------------------------------------------------------------ */
  function initProductVariants() {
    const form = document.getElementById('formularz-produktu');
    if (!form) return;

    const basePrice = Number(form.dataset.basePrice) || 8499;
    const priceEl = document.getElementById('produkt-cena');
    const selects = Array.from(form.querySelectorAll('select.js-variant-select'));

    function computeVariant() {
      let total = basePrice;
      const chosen = [];
      selects.forEach((select) => {
        const opt = select.options[select.selectedIndex];
        if (!opt) return;
        total += Number(opt.dataset.delta) || 0;
        chosen.push(opt.dataset.label || opt.textContent.trim());
      });
      return { total, chosen };
    }

    function updatePriceUI() {
      const { total } = computeVariant();
      if (priceEl) priceEl.textContent = formatPLN(total);
    }

    selects.forEach((select) => {
      select.addEventListener('change', updatePriceUI);
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const { total, chosen } = computeVariant();
      const variantSlug = selects.map((s) => s.value).join('-');
      addItemToCart({
        id: `${form.dataset.productId || 'voltpc-apex'}-${variantSlug}`,
        name: form.dataset.productName || 'VoltPC Apex – Ryzen 7 9800X3D / RTX 5070 Ti',
        variant: chosen.join(' • '),
        price: total,
        qty: 1,
        image: form.dataset.productImage || 'https://images.unsplash.com/photo-1658673609646-9c7ba9514b89?auto=format&fit=crop&w=240&q=80',
        url: 'produkt.html'
      });
      window.location.href = 'koszyk.html';
    });

    updatePriceUI();
  }

  /* ------------------------------------------------------------------------
     5. Przyciski szybkiego dodawania do koszyka (sklep.html, konto.html)
     ------------------------------------------------------------------------ */
  function initQuickAddButtons() {
    const statusBanner = document.getElementById('sklep-status-koszyka');
    document.querySelectorAll('.js-add-cart, .js-add-to-cart').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        const shouldRedirect = btn.dataset.redirect === 'true';
        if (btn.tagName === 'A') {
          event.preventDefault();
        }
        addItemToCart({
          id: btn.dataset.id || btn.dataset.name,
          name: btn.dataset.name,
          variant: btn.dataset.variant || '',
          price: Number(btn.dataset.price) || 0,
          qty: 1,
          image: btn.dataset.image,
          url: btn.dataset.url || 'produkt.html'
        });

        if (shouldRedirect) {
          window.location.href = 'koszyk.html';
          return;
        }

        const originalText = btn.dataset.originalLabel || btn.textContent;
        btn.dataset.originalLabel = originalText;
        btn.textContent = 'Dodano do koszyka';
        if (statusBanner) {
          statusBanner.classList.remove('d-none');
          statusBanner.textContent = `Dodano „${btn.dataset.name}” do koszyka. Przejdź do Koszyka w górnym menu, aby sfinalizować zamówienie.`;
        }
        window.setTimeout(() => {
          btn.textContent = originalText;
        }, 1600);
      });
    });
  }

  /* ------------------------------------------------------------------------
     6. Rozbudowane filtrowanie 6 kryteriów i sortowanie (sklep.html)
     ------------------------------------------------------------------------ */
  function initShopFilters() {
    const grid = document.getElementById('siatka-produktow');
    const filterForm = document.getElementById('formularz-filtrow');
    if (!grid || !filterForm) return;

    const cards = Array.from(grid.querySelectorAll('.js-product-col'));
    const countEl = document.getElementById('liczba-produktow');
    const emptyState = document.getElementById('brak-wynikow-sklep');
    const sortSelect = document.getElementById('sortowanie');
    const resetBtns = document.querySelectorAll('.js-reset-filters');

    function getCheckedValues(name) {
      return Array.from(filterForm.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);
    }

    function applyFiltersAndSort() {
      const selectedCategories = getCheckedValues('kategoria');
      const selectedRam = getCheckedValues('ram');
      const selectedSsd = getCheckedValues('ssd');

      const minPrice = Number(document.getElementById('cena-od')?.value) || 0;
      const maxRaw = document.getElementById('cena-do')?.value;
      const maxPrice = maxRaw === '' || maxRaw === undefined ? Infinity : Number(maxRaw);

      const selectedCpu = filterForm.querySelector('input[name="procesor"]:checked')?.value || 'wszystkie';
      const selectedGpu = filterForm.querySelector('input[name="gpu"]:checked')?.value || 'wszystkie';

      let visibleCount = 0;
      cards.forEach((card) => {
        const category = card.dataset.category || '';
        const cpu = card.dataset.cpu || '';
        const gpu = card.dataset.gpu || '';
        const ram = card.dataset.ram || '';
        const ssd = card.dataset.ssd || '';
        const price = Number(card.dataset.price) || 0;

        const matchCategory = selectedCategories.includes(category);
        const matchPrice = price >= minPrice && price <= maxPrice;
        const matchCpu = selectedCpu === 'wszystkie' || cpu === selectedCpu;
        const matchGpu = selectedGpu === 'wszystkie' || gpu === selectedGpu;
        const matchRam = selectedRam.includes(ram);
        const matchSsd = selectedSsd.includes(ssd);

        const isVisible = matchCategory && matchPrice && matchCpu && matchGpu && matchRam && matchSsd;
        card.classList.toggle('d-none', !isVisible);
        if (isVisible) visibleCount += 1;
      });

      const sortMode = sortSelect ? sortSelect.value : 'polecane';
      const sorted = [...cards].sort((a, b) => {
        if (sortMode === 'cena-rosnaco') {
          return (Number(a.dataset.price) || 0) - (Number(b.dataset.price) || 0);
        }
        if (sortMode === 'cena-malejaco') {
          return (Number(b.dataset.price) || 0) - (Number(a.dataset.price) || 0);
        }
        return (Number(a.dataset.order) || 0) - (Number(b.dataset.order) || 0);
      });
      sorted.forEach((node) => grid.appendChild(node));

      if (countEl) {
        countEl.textContent = `Wyświetlono ${visibleCount} z ${cards.length} zestawów PC`;
      }
      if (emptyState) {
        emptyState.classList.toggle('d-none', visibleCount > 0);
      }
    }

    filterForm.addEventListener('submit', (event) => {
      event.preventDefault();
      applyFiltersAndSort();
    });

    filterForm.addEventListener('change', applyFiltersAndSort);
    filterForm.addEventListener('input', (event) => {
      if (event.target.type === 'number') {
        applyFiltersAndSort();
      }
    });

    if (sortSelect) {
      sortSelect.addEventListener('change', applyFiltersAndSort);
    }

    resetBtns.forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        filterForm.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
          cb.checked = true;
        });
        const minInput = document.getElementById('cena-od');
        const maxInput = document.getElementById('cena-do');
        if (minInput) minInput.value = '0';
        if (maxInput) maxInput.value = '16000';
        const allCpu = document.getElementById('cpu-wszystkie');
        const allGpu = document.getElementById('gpu-wszystkie');
        if (allCpu) allCpu.checked = true;
        if (allGpu) allGpu.checked = true;
        if (sortSelect) sortSelect.value = 'polecane';
        applyFiltersAndSort();
      });
    });

    applyFiltersAndSort();
  }

  /* ------------------------------------------------------------------------
     7. Blog: kategorie, wyszukiwarka na żywo i paginacja 6/stronę (blog.html)
     ------------------------------------------------------------------------ */
  function initBlogPage() {
    const grid = document.getElementById('siatka-bloga');
    if (!grid) return;

    const posts = Array.from(grid.querySelectorAll('.js-blog-col'));
    const categoryLinks = Array.from(document.querySelectorAll('.js-blog-category'));
    const searchForm = document.getElementById('formularz-szukaj-blog');
    const searchInput = document.getElementById('szukaj-wpis');
    const countEl = document.getElementById('blog-liczba-wynikow');
    const activeCatEl = document.getElementById('blog-aktywna-kategoria');
    const emptyBox = document.getElementById('brak-wynikow-blog');
    const resetBtn = document.getElementById('reset-blog-filtr');
    const paginationNav = document.getElementById('paginacja-bloga');
    const pageItem1 = document.getElementById('blog-page-item-1');
    const pageItem2 = document.getElementById('blog-page-item-2');
    const pageNextItem = document.getElementById('blog-page-next');
    const pageLinks = Array.from(document.querySelectorAll('.js-blog-page'));

    const PER_PAGE = 6;
    let activeCategory = 'wszystkie';
    let activeCategoryLabel = 'Wszystkie artykuły';
    let currentPage = 1;

    function renderBlog() {
      const query = (searchInput?.value || '').trim().toLowerCase();

      const matched = posts.filter((post) => {
        const cat = post.dataset.category || '';
        const matchCat = activeCategory === 'wszystkie' || cat === activeCategory;
        if (!matchCat) return false;
        if (!query) return true;
        const title = (post.querySelector('.card-title')?.textContent || '').toLowerCase();
        const excerpt = (post.querySelector('.card-text')?.textContent || '').toLowerCase();
        return title.includes(query) || excerpt.includes(query);
      });

      const totalPages = Math.max(1, Math.ceil(matched.length / PER_PAGE));
      if (currentPage > totalPages) currentPage = 1;

      const startIdx = (currentPage - 1) * PER_PAGE;
      const endIdx = startIdx + PER_PAGE;
      const visibleSet = new Set(matched.slice(startIdx, endIdx));

      posts.forEach((post) => {
        post.classList.toggle('d-none', !visibleSet.has(post));
      });

      if (emptyBox) emptyBox.classList.toggle('d-none', matched.length > 0);
      if (paginationNav) paginationNav.classList.toggle('d-none', matched.length === 0);

      if (countEl) {
        if (matched.length === 0) {
          countEl.textContent = 'Wyświetlono 0 artykułów';
        } else {
          const from = startIdx + 1;
          const to = Math.min(endIdx, matched.length);
          countEl.textContent = `Wyświetlono ${from}–${to} z ${matched.length} artykułów`;
        }
      }

      if (activeCatEl) {
        activeCatEl.textContent = `Kategoria: ${activeCategoryLabel}`;
      }

      if (pageItem1) {
        pageItem1.classList.toggle('active', currentPage === 1);
        if (currentPage === 1) pageItem1.setAttribute('aria-current', 'page');
        else pageItem1.removeAttribute('aria-current');
      }

      if (pageItem2) {
        pageItem2.classList.toggle('d-none', totalPages < 2);
        pageItem2.classList.toggle('active', currentPage === 2);
        if (currentPage === 2) pageItem2.setAttribute('aria-current', 'page');
        else pageItem2.removeAttribute('aria-current');
      }

      if (pageNextItem) {
        pageNextItem.classList.toggle('d-none', totalPages < 2);
        const nextLink = pageNextItem.querySelector('.js-blog-page');
        if (nextLink) {
          if (currentPage === 1) {
            nextLink.dataset.page = '2';
            nextLink.textContent = 'Następna strona »';
          } else {
            nextLink.dataset.page = '1';
            nextLink.textContent = '« Poprzednia strona';
          }
        }
      }
    }

    categoryLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        activeCategory = link.dataset.blogCategory || 'wszystkie';
        activeCategoryLabel = link.querySelector('span')?.textContent.trim() || 'Wszystkie artykuły';
        currentPage = 1;

        categoryLinks.forEach((item) => {
          const isCurrent = item === link;
          item.classList.toggle('active', isCurrent);
          if (isCurrent) item.setAttribute('aria-current', 'true');
          else item.removeAttribute('aria-current');
        });

        renderBlog();
        document.getElementById('lista-artykulow')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        currentPage = 1;
        renderBlog();
      });
    }

    if (searchForm) {
      searchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        currentPage = 1;
        renderBlog();
      });
    }

    pageLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const targetPage = parseInt(link.dataset.page || '1', 10);
        currentPage = Number.isNaN(targetPage) ? 1 : targetPage;
        renderBlog();
        document.getElementById('lista-artykulow')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        activeCategory = 'wszystkie';
        activeCategoryLabel = 'Wszystkie artykuły';
        currentPage = 1;
        categoryLinks.forEach((item) => {
          const isAll = item.dataset.blogCategory === 'wszystkie';
          item.classList.toggle('active', isAll);
          if (isAll) item.setAttribute('aria-current', 'true');
          else item.removeAttribute('aria-current');
        });
        renderBlog();
      });
    }

    renderBlog();
  }

  /* ------------------------------------------------------------------------
     8. Panel klienta: menu boczne + edycja danych i adresu (konto.html)
     ------------------------------------------------------------------------ */
  function initAccountPage() {
    const menu = document.getElementById('menu-konta');
    if (!menu) return;

    // Boczne menu konta – aktywna pozycja i płynne przewijanie
    const navLinks = Array.from(menu.querySelectorAll('.js-account-nav'));
    function setActiveAccountLink(hash) {
      const match = navLinks.find((item) => item.getAttribute('href') === hash);
      if (!match) return;
      navLinks.forEach((item) => {
        const active = item === match;
        item.classList.toggle('active', active);
        if (active) item.setAttribute('aria-current', 'true');
        else item.removeAttribute('aria-current');
      });
    }

    if (window.location.hash) {
      setActiveAccountLink(window.location.hash);
    }

    navLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        const hash = link.getAttribute('href') || '';
        if (!hash.startsWith('#')) return;
        const target = document.querySelector(hash);
        if (!target) return;

        event.preventDefault();
        setActiveAccountLink(hash);
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', hash);
      });
    });

    // Edycja danych osobowych (localStorage)
    const defaultProfile = {
      name: 'Jan Kowalski',
      email: 'jan.kowalski@przyklad.pl',
      phone: '+48 602 314 820',
      type: 'Klient indywidualny i firmowy'
    };

    const headingEl = document.getElementById('konto-naglowek');
    const profileView = document.getElementById('dane-konta-widok');
    const profileForm = document.getElementById('formularz-danych');
    const profileMsg = document.getElementById('komunikat-danych');
    const editProfileBtn = document.getElementById('btn-edytuj-dane');
    const cancelProfileBtn = document.getElementById('btn-anuluj-dane');

    function renderProfile(profile) {
      const nameText = document.getElementById('konto-imie-tekst');
      const emailText = document.getElementById('konto-email-tekst');
      const phoneText = document.getElementById('konto-telefon-tekst');
      const typeText = document.getElementById('konto-typ-tekst');

      if (headingEl) headingEl.textContent = `Panel klienta – ${profile.name}`;
      if (nameText) nameText.textContent = profile.name;
      if (emailText) emailText.textContent = profile.email;
      if (phoneText) phoneText.textContent = profile.phone;
      if (typeText) typeText.textContent = profile.type;

      const nameIn = document.getElementById('edytuj-imie');
      const emailIn = document.getElementById('edytuj-email');
      const phoneIn = document.getElementById('edytuj-telefon');
      const typeIn = document.getElementById('edytuj-typ');
      if (nameIn) nameIn.value = profile.name;
      if (emailIn) emailIn.value = profile.email;
      if (phoneIn) phoneIn.value = profile.phone;
      if (typeIn) typeIn.value = profile.type;
    }

    const savedProfile = { ...defaultProfile, ...loadJSON(PROFILE_KEY, {}) };
    renderProfile(savedProfile);

    if (editProfileBtn && profileView && profileForm) {
      editProfileBtn.addEventListener('click', () => {
        if (profileMsg) profileMsg.classList.add('d-none');
        profileView.classList.add('d-none');
        profileForm.classList.remove('d-none');
        document.getElementById('edytuj-imie')?.focus();
      });
    }

    if (cancelProfileBtn && profileView && profileForm) {
      cancelProfileBtn.addEventListener('click', () => {
        renderProfile({ ...defaultProfile, ...loadJSON(PROFILE_KEY, {}) });
        profileForm.classList.add('d-none');
        profileView.classList.remove('d-none');
      });
    }

    if (profileForm && profileView) {
      profileForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const updated = {
          name: (document.getElementById('edytuj-imie')?.value || '').trim() || defaultProfile.name,
          email: (document.getElementById('edytuj-email')?.value || '').trim() || defaultProfile.email,
          phone: (document.getElementById('edytuj-telefon')?.value || '').trim() || defaultProfile.phone,
          type: document.getElementById('edytuj-typ')?.value || defaultProfile.type
        };
        localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
        renderProfile(updated);
        profileForm.classList.add('d-none');
        profileView.classList.remove('d-none');
        if (profileMsg) {
          profileMsg.textContent = 'Zapisano zaktualizowane dane osobowe na Twoim koncie.';
          profileMsg.classList.remove('d-none');
        }
      });
    }

    // Edycja adresu dostawy (localStorage)
    const defaultAddress = {
      recipient: 'Jan Kowalski',
      street: 'ul. Mokotowska 48/12',
      zip: '00-543',
      city: 'Warszawa',
      carrier: 'Kurier DPD (ubezpieczenie)'
    };

    const addrView = document.getElementById('adres-widok');
    const addrForm = document.getElementById('formularz-adresu');
    const addrMsg = document.getElementById('komunikat-adresu');
    const editAddrBtn = document.getElementById('btn-edytuj-adres');
    const cancelAddrBtn = document.getElementById('btn-anuluj-adres');

    function renderAddress(addr) {
      const recEl = document.getElementById('adres-odbiorca-tekst');
      const streetEl = document.getElementById('adres-ulica-tekst');
      const zipCityEl = document.getElementById('adres-kod-miasto-tekst');
      const carrierEl = document.getElementById('adres-przewoznik-tekst');

      if (recEl) recEl.textContent = addr.recipient;
      if (streetEl) streetEl.textContent = addr.street;
      if (zipCityEl) zipCityEl.textContent = `${addr.zip} ${addr.city}`;
      if (carrierEl) carrierEl.textContent = addr.carrier;

      const recIn = document.getElementById('edytuj-odbiorca');
      const streetIn = document.getElementById('edytuj-ulica');
      const zipIn = document.getElementById('edytuj-kod');
      const cityIn = document.getElementById('edytuj-miasto');
      const carrierIn = document.getElementById('edytuj-przewoznik');
      if (recIn) recIn.value = addr.recipient;
      if (streetIn) streetIn.value = addr.street;
      if (zipIn) zipIn.value = addr.zip;
      if (cityIn) cityIn.value = addr.city;
      if (carrierIn) carrierIn.value = addr.carrier;
    }

    const savedAddress = { ...defaultAddress, ...loadJSON(ADDRESS_KEY, {}) };
    renderAddress(savedAddress);

    if (editAddrBtn && addrView && addrForm) {
      editAddrBtn.addEventListener('click', () => {
        if (addrMsg) addrMsg.classList.add('d-none');
        addrView.classList.add('d-none');
        addrForm.classList.remove('d-none');
        document.getElementById('edytuj-odbiorca')?.focus();
      });
    }

    if (cancelAddrBtn && addrView && addrForm) {
      cancelAddrBtn.addEventListener('click', () => {
        renderAddress({ ...defaultAddress, ...loadJSON(ADDRESS_KEY, {}) });
        addrForm.classList.add('d-none');
        addrView.classList.remove('d-none');
      });
    }

    if (addrForm && addrView) {
      addrForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const updated = {
          recipient: (document.getElementById('edytuj-odbiorca')?.value || '').trim() || defaultAddress.recipient,
          street: (document.getElementById('edytuj-ulica')?.value || '').trim() || defaultAddress.street,
          zip: (document.getElementById('edytuj-kod')?.value || '').trim() || defaultAddress.zip,
          city: (document.getElementById('edytuj-miasto')?.value || '').trim() || defaultAddress.city,
          carrier: document.getElementById('edytuj-przewoznik')?.value || defaultAddress.carrier
        };
        localStorage.setItem(ADDRESS_KEY, JSON.stringify(updated));
        renderAddress(updated);
        addrForm.classList.add('d-none');
        addrView.classList.remove('d-none');
        if (addrMsg) {
          addrMsg.textContent = 'Zapisano nowy domyślny adres dostawy.';
          addrMsg.classList.remove('d-none');
        }
      });
    }
  }

  /* ------------------------------------------------------------------------
     9. Podsumowanie zamówienia i czyszczenie koszyka (zamowienie.html)
     ------------------------------------------------------------------------ */
  function initCheckoutPage() {
    const checkoutForm = document.getElementById('formularz-zamowienia');
    const summaryList = document.getElementById('zamowienie-lista');
    if (!checkoutForm || !summaryList) return;

    const emptyNotice = document.getElementById('zamowienie-pusty-koszyk');
    const totalEl = document.getElementById('zamowienie-suma');
    const vatEl = document.getElementById('zamowienie-vat');
    const submitBtn = document.getElementById('przycisk-zamow');

    const cart = loadCart();
    const coupon = loadCoupon();
    const totals = calculateTotals(cart, coupon);

    summaryList.textContent = '';

    if (cart.length === 0) {
      if (emptyNotice) emptyNotice.classList.remove('d-none');
      const li = document.createElement('li');
      const k = document.createElement('span');
      k.className = 'spec-key';
      k.textContent = 'Koszyk jest pusty';
      const v = document.createElement('span');
      v.className = 'spec-val';
      v.textContent = formatPLN(0);
      li.appendChild(k);
      li.appendChild(v);
      summaryList.appendChild(li);

      if (totalEl) totalEl.textContent = formatPLN(0);
      if (vatEl) vatEl.textContent = formatPLN(0, true);
      if (submitBtn) submitBtn.textContent = 'Zamawiam i płacę (0 zł)';
    } else {
      if (emptyNotice) emptyNotice.classList.add('d-none');

      cart.forEach((item) => {
        const li = document.createElement('li');
        const keySpan = document.createElement('span');
        keySpan.className = 'spec-key';
        keySpan.textContent = `${item.name} (${item.qty} szt.)`;
        const valSpan = document.createElement('span');
        valSpan.className = 'spec-val text-nowrap';
        valSpan.textContent = formatPLN(item.price * item.qty);
        li.appendChild(keySpan);
        li.appendChild(valSpan);
        summaryList.appendChild(li);
      });

      if (totals.hasDiscount) {
        const liDisc = document.createElement('li');
        const kDisc = document.createElement('span');
        kDisc.className = 'spec-key text-brand-cta';
        kDisc.textContent = `Rabat (${VALID_COUPON}, -5%)`;
        const vDisc = document.createElement('span');
        vDisc.className = 'spec-val text-brand-cta text-nowrap';
        vDisc.textContent = `-${formatPLN(totals.discount)}`;
        liDisc.appendChild(kDisc);
        liDisc.appendChild(vDisc);
        summaryList.appendChild(liDisc);
      }

      const liShip = document.createElement('li');
      const kShip = document.createElement('span');
      kShip.className = 'spec-key';
      kShip.textContent = 'Dostawa i ubezpieczenie';
      const vShip = document.createElement('span');
      vShip.className = 'spec-val';
      vShip.textContent = '0 zł';
      liShip.appendChild(kShip);
      liShip.appendChild(vShip);
      summaryList.appendChild(liShip);

      if (totalEl) totalEl.textContent = formatPLN(totals.total);
      if (vatEl) vatEl.textContent = formatPLN(totals.vat, true);
      if (submitBtn) submitBtn.textContent = `Zamawiam i płacę (${formatPLN(totals.total)})`;
    }

    checkoutForm.addEventListener('submit', (event) => {
      if (loadCart().length === 0) {
        event.preventDefault();
        if (emptyNotice) {
          emptyNotice.classList.remove('d-none');
          emptyNotice.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
      saveCart([]);
      saveCoupon('');
    });
  }

  /* ------------------------------------------------------------------------
     10. Formularz kontaktowy bez przeładowania strony (kontakt.html)
     ------------------------------------------------------------------------ */
  function initContactForm() {
    const form = document.getElementById('formularz-kontaktowy-form');
    const msgBox = document.getElementById('komunikat-kontakt');
    if (!form || !msgBox) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const senderName = (document.getElementById('kontakt-imie')?.value || '').trim();
      const greeting = senderName ? `Dziękujemy, ${senderName}! ` : 'Dziękujemy! ';
      msgBox.textContent = `${greeting}Twoje zapytanie zostało przyjęte przez zespół VoltPC. Odpowiemy maksymalnie w ciągu 1 dnia roboczego.`;
      msgBox.classList.remove('d-none');
      form.reset();
      msgBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  window.addEventListener('hashchange', syncNavbarHashState);

  document.addEventListener('DOMContentLoaded', () => {
    syncNavbarHashState();
    updateCartBadge();
    initCartPage();
    initConfigurator();
    initProductVariants();
    initQuickAddButtons();
    initShopFilters();
    initBlogPage();
    initAccountPage();
    initCheckoutPage();
    initContactForm();
  });
})();
