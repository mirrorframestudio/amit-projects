/* ===== Products Slider ===== */
(function() {
  var _script = document.currentScript;

  var base = 'https://onezonejersey.com/wp-content/uploads/';
  var PRODUCTS = [
    { name: 'ארגנטינה חוץ מונדיאל 2026 מסי', team: 'ארגנטינה', img: base+'2026/03/ארגנטינה-חוץ-מסי.png', img2: base+'2026/03/ארגנטינה-חוץ-מסי-אחורה.png', href: 'https://onezonejersey.com/product/%d7%90%d7%a8%d7%92%d7%a0%d7%98%d7%99%d7%a0%d7%94-%d7%97%d7%95%d7%a5-%d7%9e%d7%95%d7%a0%d7%93%d7%99%d7%90%d7%9c-2026-%d7%9e%d7%a1%d7%99/', hot: true },
    { name: 'ברזיל חוץ מונדיאל 2026', team: 'ברזיל', img: base+'2026/03/brazil-away.webp', img2: base+'2026/03/brazil-away-2.webp', href: 'https://onezonejersey.com/product/%d7%91%d7%a8%d7%96%d7%99%d7%9c-%d7%97%d7%95%d7%a5-%d7%9e%d7%95%d7%a0%d7%93%d7%99%d7%90%d7%9c-2026/', hot: true },
    { name: 'גרמניה בית מונדיאל 2026', team: 'גרמניה', img: base+'2025/11/germany1.png', img2: base+'2025/11/germany2.png', href: 'https://onezonejersey.com/product/%d7%92%d7%a8%d7%9e%d7%a0%d7%99%d7%94-%d7%91%d7%99%d7%aa-%d7%9e%d7%95%d7%a0%d7%93%d7%99%d7%90%d7%9c-2026/', hot: true },
    { name: 'הולנד בית מונדיאל 2026', team: 'הולנד', img: base+'2026/03/הולנד-בית.png', img2: null, href: 'https://onezonejersey.com/product/%d7%94%d7%95%d7%9c%d7%a0%d7%93-%d7%91%d7%99%d7%aa-%d7%9e%d7%95%d7%a0%d7%93%d7%99%d7%90%d7%9c-2026/', hot: false },
    { name: 'ספרד חוץ מונדיאל 2026', team: 'ספרד', img: base+'2026/03/ספרד-חוץ.png', img2: base+'2026/03/ספרד-חוץ-אחורה.png', href: 'https://onezonejersey.com/product/%D7%A1%D7%A4%D7%A8%D7%93-%D7%97%D7%95%D7%A5-%D7%9E%D7%95%D7%A0%D7%93%D7%99%D7%90%D7%9C-2026/', hot: true },
    { name: 'פורטוגל חוץ מונדיאל 2026', team: 'פורטוגל', img: base+'2026/03/פורטוגל-חוץ.png', img2: base+'2026/03/פורטוגל-חוץ-אחורה.png', href: 'https://onezonejersey.com/product/%d7%a4%d7%95%d7%a8%d7%98%d7%95%d7%92%d7%9c-%d7%97%d7%95%d7%a5-%d7%9e%d7%95%d7%a0%d7%93%d7%99%d7%90%d7%9c-2026/', hot: false },
    { name: 'צרפת בית מונדיאל 2026', team: 'צרפת', img: base+'2026/03/צרפת-בית-1.png', img2: base+'2026/03/צרפת-בית-אחורה-1.png', href: 'https://onezonejersey.com/product/%d7%a6%d7%a8%d7%a4%d7%aa-%d7%91%d7%99%d7%aa-%d7%9e%d7%95%d7%a0%d7%93%d7%99%d7%90%d7%9c-2026/', hot: true },
    { name: 'אנגליה בית מונדיאל 2026', team: 'אנגליה', img: base+'2026/03/אנגליה-בית.png', img2: base+'2026/03/אנגליה-בית-אחורה-1.png', href: 'https://onezonejersey.com/product/%d7%90%d7%a0%d7%92%d7%9c%d7%99%d7%94-%d7%91%d7%99%d7%aa-%d7%9e%d7%95%d7%a0%d7%93%d7%99%d7%90%d7%9c-2026/', hot: true },
    { name: 'ארגנטינה בית מונדיאל 2026', team: 'ארגנטינה', img: base+'2025/11/argentina1.png', img2: base+'2025/11/argentina2.png', href: 'https://onezonejersey.com/product/%D7%90%D7%A8%D7%92%D7%A0%D7%98%D7%99%D7%A0%D7%94-%D7%91%D7%99%D7%AA-%D7%9E%D7%95%D7%A0%D7%93%D7%99%D7%90%D7%9C-2026/', hot: true },
    { name: 'ברזיל בית מונדיאל 2026', team: 'ברזיל', img: base+'2026/03/ברזיל-בית-1.png', img2: base+'2026/03/ברזיל-בית-אחורה.png', href: 'https://onezonejersey.com/product/%D7%91%D7%A8%D7%96%D7%99%D7%9C-%D7%91%D7%99%D7%AA-%D7%9E%D7%95%D7%A0%D7%93%D7%99%D7%90%D7%9C-2026/', hot: true },
    { name: 'ספרד בית מונדיאל 2026', team: 'ספרד', img: base+'2025/11/spain1.png', img2: base+'2025/11/spain2.png', href: 'https://onezonejersey.com/product/%D7%A1%D7%A4%D7%A8%D7%93-%D7%91%D7%99%D7%AA-%D7%9E%D7%95%D7%A0%D7%93%D7%99%D7%90%D7%9C-2026/', hot: false },
    { name: 'פורטוגל בית מונדיאל 2026', team: 'פורטוגל', img: base+'2025/12/עיצוב-ללא-שם.png', img2: base+'2025/12/עיצוב-ללא-שם-1.png', href: 'https://onezonejersey.com/product/%D7%A4%D7%95%D7%A8%D7%98%D7%95%D7%92%D7%9C-%D7%91%D7%99%D7%AA-%D7%9E%D7%95%D7%A0%D7%93%D7%99%D7%90%D7%9C-2026/', hot: false }
  ];

  var teamColors = { 'ארגנטינה':'rgba(108,172,228,0.13)','ברזיל':'rgba(0,156,59,0.10)','גרמניה':'rgba(220,220,220,0.35)','הולנד':'rgba(255,119,0,0.10)','ספרד':'rgba(170,0,0,0.08)','פורטוגל':'rgba(0,102,0,0.08)','צרפת':'rgba(0,35,149,0.09)','אנגליה':'rgba(204,0,0,0.08)' };

  function buildProducts() {
    var insertPoint = _script;
    if (document.getElementById('oz-products')) return;

    var style = document.createElement('style');
    style.textContent = [
      '#oz-products{background:#fff;padding:40px 0 56px;direction:rtl;text-align:center}',
      '#oz-products h2{font-size:22px;font-weight:700;color:#111;margin:0 0 28px;font-family:inherit}',
      '#oz-products h2 span{color:#e63946}',
      '#oz-products .pz-slider-wrap{position:relative;max-width:1180px;margin:0 auto;padding:0 48px}',
      '#oz-products .pz-viewport{overflow:hidden}',
      '#oz-products .pz-track{display:flex;gap:18px;transition:transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94);will-change:transform}',
      '#oz-products .pz-card{flex:0 0 calc(25% - 14px);border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08);overflow:hidden;border:1px solid #eee;text-decoration:none;display:block;transition:transform .18s,box-shadow .18s;position:relative;opacity:0}',
      '#oz-products .pz-card:hover{transform:translateY(-4px);box-shadow:0 8px 24px rgba(0,0,0,.13)}',
      '#oz-products .pz-card.pz-visible{animation:pz-fadein 0.5s ease forwards}',
      '#oz-products .pz-img{aspect-ratio:1/1;overflow:hidden;background:#fff;position:relative}',
      '#oz-products .pz-img img{width:100%;height:100%;object-fit:contain;display:block;transition:transform .3s,opacity .3s}',
      '#oz-products .pz-card:hover .pz-img img{transform:scale(1.05)}',
      '#oz-products .pz-info{padding:12px}',
      '#oz-products .pz-prices{display:flex;align-items:center;gap:8px;margin-bottom:10px}',
      '#oz-products .pz-price{font-size:16px;color:#e63946;font-weight:700}',
      '#oz-products .pz-original{font-size:13px;color:#aaa;text-decoration:line-through;font-weight:500}',
      '#oz-products .pz-btn{width:100%;padding:8px;background:#111;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s;font-family:inherit}',
      '#oz-products .pz-btn:hover{background:#e63946}',
      /* Side arrows */
      '#oz-products .pz-arrow{position:absolute!important;top:50%!important;transform:translateY(-50%)!important;z-index:10!important;width:40px!important;height:40px!important;min-width:0!important;min-height:0!important;border:none!important;border-radius:50%!important;background:rgba(0,0,0,.55)!important;color:#fff!important;font-size:20px!important;line-height:1!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:0!important;margin:0!important;transition:background .2s,transform .2s!important;box-shadow:0 2px 8px rgba(0,0,0,.25)!important}',
      '#oz-products .pz-arrow:hover{background:rgba(230,57,70,.9)!important;transform:translateY(-50%) scale(1.1)!important}',
      '#oz-products .pz-arrow:active{transform:translateY(-50%) scale(0.95)!important}',
      '#oz-products .pz-arrow:disabled{opacity:0!important;pointer-events:none!important}',
      '#oz-products .pz-arrow-right{right:4px!important;left:auto!important}',
      '#oz-products .pz-arrow-left{left:4px!important;right:auto!important}',
      /* hide Slick/Swiper dots that the theme injects near our slider */
      '#oz-products ~ .slick-dots,#oz-products + * .slick-dots,#oz-products .slick-dots{display:none!important}',
      '#oz-products ~ .swiper-pagination,#oz-products + * .swiper-pagination{display:none!important}',
      '#oz-products .pz-name{font-size:13px;color:#333;font-weight:600;margin-bottom:14px;line-height:1.4;height:2.8em;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
      '.oz-badge{position:absolute;top:10px;right:10px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;color:#fff;z-index:2}',
      '@keyframes oz-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}',
      '.oz-badge-hot{background:#e63946;animation:oz-pulse 1.6s ease-in-out infinite}',
      '.pz-heart{position:absolute;top:10px;left:10px;width:32px;height:32px;font-size:16px;background:rgba(255,255,255,.92);border:none;border-radius:50%;cursor:pointer;z-index:2;display:flex;align-items:center;justify-content:center;transition:transform .15s;box-shadow:0 1px 4px rgba(0,0,0,.12)}',
      '.pz-heart:hover{transform:scale(1.15)}',
      '.pz-heart.active{color:#e63946}',
      '.pz-promo{position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,.62);color:#fff;font-size:10px;font-weight:700;padding:3px 7px;border-radius:10px;z-index:2}',
      '@keyframes pz-fadein{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}',
      '@media(max-width:768px){#oz-products{padding:24px 0 36px}#oz-products h2{font-size:18px}#oz-products .pz-slider-wrap{padding:0 36px}#oz-products .pz-card{flex:0 0 calc(50% - 9px)}}'
    ].join('\n');
    document.head.appendChild(style);

    var sec = document.createElement('div');
    sec.id = 'oz-products';

    sec.innerHTML = '<h2>חולצות <span>מונדיאל 2026</span> &#x1F525;</h2>' +
      '<div class="pz-slider-wrap">' +
        '<button class="pz-arrow pz-arrow-right" id="pz-next">&#8250;</button>' +
        '<button class="pz-arrow pz-arrow-left" id="pz-prev">&#8249;</button>' +
        '<div class="pz-viewport"><div class="pz-track">' +
        PRODUCTS.map(function(p) {
          return '<a class="pz-card" href="'+p.href+'" target="_blank">'+(p.hot?'<span class="oz-badge oz-badge-hot">HOT</span>':'')+
            '<button class="pz-heart">&#9825;</button>'+
            '<div class="pz-img"><img src="'+p.img+'" alt="'+p.name+'" loading="lazy"><span class="pz-promo">משתתף ב-3+1</span></div>'+
            '<div class="pz-info"><p class="pz-name">'+p.name+'</p>'+
            '<div class="pz-prices"><span class="pz-original">&#8362;199.00</span><span class="pz-price">&#8362;159.00</span></div>'+
            '<button class="pz-btn">לצפייה ורכישה &#8592;</button></div></a>';
        }).join('') +
        '</div></div>' +
      '</div>';

    insertPoint.insertAdjacentElement('afterend', sec);

    var allCards = sec.querySelectorAll('.pz-card');
    allCards.forEach(function(card, i) {
      var nameEl = card.querySelector('.pz-name');
      if (nameEl) {
        var tk = Object.keys(teamColors).find(function(t) { return nameEl.textContent.indexOf(t) === 0; });
        if (tk) card.style.background = teamColors[tk];
      }
      setTimeout(function() { card.classList.add('pz-visible'); }, i * 80);
      var h = card.querySelector('.pz-heart');
      if (h) h.addEventListener('click', function(e) { e.preventDefault(); var on = h.classList.toggle('active'); h.innerHTML = on ? '&#9829;' : '&#9825;'; });
    });

    PRODUCTS.forEach(function(p, i) {
      if (!p.img2) return;
      var card = allCards[i]; if (!card) return;
      var img = card.querySelector('.pz-img img'); if (!img) return;
      new Image().src = p.img2;
      card.addEventListener('mouseenter', function() { img.style.opacity='0'; setTimeout(function() { img.src=p.img2; img.style.opacity='1'; }, 150); });
      card.addEventListener('mouseleave', function() { img.style.opacity='0'; setTimeout(function() { img.src=p.img; img.style.opacity='1'; }, 150); });
    });

    var track   = sec.querySelector('.pz-track');
    var prevBtn = sec.querySelector('#pz-prev');
    var nextBtn = sec.querySelector('#pz-next');
    var visible = window.innerWidth <= 768 ? 2 : 4;
    var total   = allCards.length;
    var idx     = 0;
    var maxIdx  = total - visible;

    function getW() { return allCards[0].getBoundingClientRect().width + 18; }

    function update() {
      track.style.transform = 'translateX(' + (idx * getW()) + 'px)';
      prevBtn.disabled = (idx === 0);
      nextBtn.disabled = (idx >= maxIdx);
    }

    prevBtn.addEventListener('click', function() { if (idx > 0) { idx--; update(); } });
    nextBtn.addEventListener('click', function() { if (idx < maxIdx) { idx++; update(); } });
    window.addEventListener('resize', function() {
      visible = window.innerWidth <= 768 ? 2 : 4;
      maxIdx = total - visible;
      if (idx > maxIdx) idx = maxIdx;
      update();
    });

    /* Touch/swipe — verified coordinate mapping:
       idx++ → translateX increases → track moves RIGHT → shows next cards
       So: finger LEFT → content RIGHT → next (idx++)
           finger RIGHT → content LEFT → prev (idx--) */
    var tx = 0, ty = 0, td = 0, isH = null, t0 = 0;
    track.addEventListener('touchstart', function(e) {
      tx = e.touches[0].clientX; ty = e.touches[0].clientY;
      td = 0; isH = null; t0 = Date.now();
      track.style.transition = 'none';
    }, { passive: true });
    track.addEventListener('touchmove', function(e) {
      var dx = e.touches[0].clientX - tx, dy = e.touches[0].clientY - ty;
      if (isH === null) isH = Math.abs(dx) > Math.abs(dy);
      if (!isH) return;
      e.preventDefault();
      td = dx;
      var base = idx * getW();
      var target = base - td; /* -td: finger left → translateX up → content right */
      /* rubber-band at edges */
      if (target < 0) target *= 0.3;
      if (target > maxIdx * getW()) target = maxIdx * getW() + (target - maxIdx * getW()) * 0.3;
      track.style.transform = 'translateX(' + target + 'px)';
    }, { passive: false });
    track.addEventListener('touchend', function() {
      track.style.transition = '';
      if (!isH) { update(); return; }
      var elapsed = Math.max(1, Date.now() - t0);
      var vel = td / elapsed; /* px/ms, positive = finger went right */
      var fast = Math.abs(vel) > 0.3;
      if ((td > 40 || (fast && td > 5)) && idx > 0) { idx--; update(); }
      else if ((td < -40 || (fast && td < -5)) && idx < maxIdx) { idx++; update(); }
      else { update(); }
    });

    update();
  }

  function init() { buildProducts(findInsertPoint()); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
/* ===== End Products Slider ===== */
