/**
 * MELUVO PREMIUM THEME — Main JavaScript
 * Handles: scroll animations, FAQ accordion, cart drawer,
 * header behavior, mobile menu, product gallery, quantity selectors
 */

(function () {
  'use strict';

  /* =============================================
     1. SCROLL REVEAL ANIMATIONS
     ============================================= */
  function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal, .stagger-children');
    if (!reveals.length) return;

    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      reveals.forEach(function (el) {
        el.classList.add('is-visible');
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );

    reveals.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* =============================================
     2. HEADER SCROLL BEHAVIOR
     ============================================= */
  function initHeader() {
    var header = document.querySelector('[data-header]');
    if (!header) return;

    var lastScroll = 0;
    var scrollThreshold = 50;

    window.addEventListener(
      'scroll',
      function () {
        var currentScroll = window.pageYOffset;

        if (currentScroll > scrollThreshold) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
      },
      { passive: true }
    );
  }

  /* =============================================
     3. MOBILE MENU
     ============================================= */
  function initMobileMenu() {
    var toggle = document.querySelector('[data-mobile-menu-toggle]');
    var menu = document.querySelector('[data-mobile-menu]');
    var closeBtns = document.querySelectorAll('[data-mobile-menu-close]');

    if (!toggle || !menu) return;

    function openMenu() {
      menu.classList.add('is-open');
      menu.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    toggle.addEventListener('click', openMenu);
    closeBtns.forEach(function (btn) {
      btn.addEventListener('click', closeMenu);
    });
  }

  /* =============================================
     4. CART DRAWER
     ============================================= */
  function initCartDrawer() {
    var cartToggles = document.querySelectorAll('[data-cart-toggle]');
    var drawer = document.querySelector('[data-cart-drawer]');
    var closeBtns = document.querySelectorAll('[data-cart-drawer-close]');

    if (!drawer) return;

    function openDrawer() {
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    cartToggles.forEach(function (btn) {
      btn.addEventListener('click', openDrawer);
    });

    closeBtns.forEach(function (btn) {
      btn.addEventListener('click', closeDrawer);
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        closeDrawer();
      }
    });
  }

  /* =============================================
     5. FAQ ACCORDION
     ============================================= */
  function initFaqAccordion() {
    var triggers = document.querySelectorAll('[data-faq-toggle]');

    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        var item = this.closest('.faq-item') || this.closest('[data-faq-item]');
        if (!item) return;

        var isOpen = item.classList.contains('is-open');
        var expanded = isOpen ? 'false' : 'true';

        item.classList.toggle('is-open');
        this.setAttribute('aria-expanded', expanded);

        var answer = item.querySelector('.faq-item__answer');
        if (answer) {
          answer.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
        }
      });
    });
  }

  /* =============================================
     6. PRODUCT ACCORDION
     ============================================= */
  function initProductAccordion() {
    var triggers = document.querySelectorAll('[data-accordion-trigger]');

    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        var item =
          this.closest('.product-accordion__item') ||
          this.closest('[data-accordion-item]');
        if (!item) return;

        var isOpen = item.classList.contains('is-open');
        var expanded = isOpen ? 'false' : 'true';

        item.classList.toggle('is-open');
        this.setAttribute('aria-expanded', expanded);

        var content = item.querySelector('.product-accordion__content');
        if (content) {
          content.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
        }
      });
    });
  }

  /* =============================================
     7. PRODUCT GALLERY
     ============================================= */
  function initProductGallery() {
    var thumbs = document.querySelectorAll('[data-thumb]');
    var mainImage = document.getElementById('product-main-image');

    if (!thumbs.length || !mainImage) return;

    thumbs.forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        // Update active state
        thumbs.forEach(function (t) {
          t.classList.remove('active');
        });
        this.classList.add('active');

        // Swap main image
        var newSrc = this.getAttribute('data-image-url');
        if (newSrc) {
          mainImage.style.opacity = '0';
          setTimeout(function () {
            mainImage.src = newSrc;
            mainImage.style.opacity = '1';
          }, 150);
        }
      });
    });
  }

  /* =============================================
     8. QUANTITY SELECTORS
     ============================================= */
  function initQuantitySelectors() {
    // Generic quantity selectors
    document.addEventListener('click', function (e) {
      var decreaseBtn = e.target.closest('[data-qty-decrease]');
      var increaseBtn = e.target.closest('[data-qty-increase]');

      if (decreaseBtn) {
        var container = decreaseBtn.closest('.quantity-selector');
        if (!container) return;
        var input = container.querySelector('[data-qty-input], .quantity-selector__input');
        if (!input) return;
        var val = parseInt(input.value, 10);
        if (val > 1) input.value = val - 1;
      }

      if (increaseBtn) {
        var container2 = increaseBtn.closest('.quantity-selector');
        if (!container2) return;
        var input2 = container2.querySelector('[data-qty-input], .quantity-selector__input');
        if (!input2) return;
        var val2 = parseInt(input2.value, 10);
        input2.value = val2 + 1;
      }
    });
  }

  /* =============================================
     9. VARIANT SELECTOR
     ============================================= */
  function initVariantSelector() {
    var variantOptions = document.querySelectorAll('[data-variant-option]');
    if (!variantOptions.length) return;

    variantOptions.forEach(function (btn) {
      btn.addEventListener('click', function () {
        // Update visual selection
        var siblings = this.closest('.product-info__variant-options');
        if (siblings) {
          siblings.querySelectorAll('.variant-option').forEach(function (opt) {
            opt.classList.remove('selected');
          });
        }
        this.classList.add('selected');
      });
    });
  }

  /* =============================================
     10. MOBILE STICKY ATC
     ============================================= */
  function initMobileStickyATC() {
    var stickyBar = document.querySelector('[data-mobile-sticky-atc]');
    var mobileBtn = document.querySelector('[data-mobile-atc-btn]');
    var productForm = document.querySelector('[data-product-form]');

    if (!stickyBar || !productForm) return;

    if (mobileBtn) {
      mobileBtn.addEventListener('click', function () {
        var submitBtn = productForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      });
    }
  }

  /* =============================================
     11. COUNTER ANIMATION
     ============================================= */
  function initCounterAnimation() {
    var counters = document.querySelectorAll('[data-count-target]');
    if (!counters.length) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach(function (counter) {
      observer.observe(counter);
    });

    function animateCounter(el) {
      var target = parseInt(el.getAttribute('data-count-target'), 10);
      var suffix = el.textContent.replace(/[0-9]/g, '').trim();
      var duration = 1500;
      var start = 0;
      var startTime = null;

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        var current = Math.round(start + (target - start) * eased);
        el.textContent = current + suffix;
        if (progress < 1) {
          requestAnimationFrame(step);
        }
      }

      requestAnimationFrame(step);
    }
  }

  /* =============================================
     12. SMOOTH SCROLL FOR ANCHOR LINKS
     ============================================= */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var targetId = this.getAttribute('href');
        if (targetId === '#') return;
        var target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          var headerHeight = parseInt(
            getComputedStyle(document.documentElement).getPropertyValue(
              '--header-height'
            ),
            10
          ) || 72;
          var top =
            target.getBoundingClientRect().top +
            window.pageYOffset -
            headerHeight -
            20;
          window.scrollTo({ top: top, behavior: 'smooth' });
        }
      });
    });
  }

  /* =============================================
     INIT
     ============================================= */
  function init() {
    initScrollReveal();
    initHeader();
    initMobileMenu();
    initCartDrawer();
    initFaqAccordion();
    initProductAccordion();
    initProductGallery();
    initQuantitySelectors();
    initVariantSelector();
    initMobileStickyATC();
    initCounterAnimation();
    initSmoothScroll();
  }

  // Run on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
