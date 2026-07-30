/* ==========================================================================
   Gyokusan.REEL — 共用互動邏輯
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  initAmbientCanvas();
  initVideoModal();
  initContactForm();
  initVideoCards();
  initFilterChips();
});

/* ---------------------------------------------------------------------
   1. Ambient background canvas — 滑鼠/觸控漣漪 + 呼吸網格
   --------------------------------------------------------------------- */
function initAmbientCanvas() {
  var canvas = document.getElementById('ambient-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var w, h, dpr;
  var color = canvas.dataset.color || '111,191,176';

  function resize() {
    dpr = window.devicePixelRatio || 1;
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gap = 26;
  var ripples = [];
  var lastPoint = null;

  function addRipple(x, y) {
    ripples.push({ x: x, y: y, r: 0, alpha: 0.55 });
    if (ripples.length > 14) ripples.shift();
  }
  function handleMove(x, y) {
    if (!lastPoint || Math.hypot(x - lastPoint.x, y - lastPoint.y) > 34) {
      addRipple(x, y);
      lastPoint = { x: x, y: y };
    }
  }
  window.addEventListener('mousemove', function (e) { handleMove(e.clientX, e.clientY); }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (e.touches && e.touches[0]) handleMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  var t = 0, ringWidth = 60;
  function draw() {
    t += 0.01;
    ctx.clearRect(0, 0, w, h);
    ripples.forEach(function (r) { r.r += 2.6; r.alpha *= 0.975; });
    ripples = ripples.filter(function (r) { return r.alpha > 0.02 && r.r < Math.max(w, h) * 0.9; });

    for (var y = 0; y <= h; y += gap) {
      for (var x = 0; x <= w; x += gap) {
        var idle = 0.02 + 0.012 * Math.sin(x * 0.01 + t * 0.5) * Math.sin(y * 0.013 - t * 0.4);
        var boost = 0;
        for (var i = 0; i < ripples.length; i++) {
          var r = ripples[i];
          var dist = Math.hypot(x - r.x, y - r.y);
          var diff = dist - r.r;
          boost += Math.exp(-(diff * diff) / (2 * ringWidth * ringWidth)) * r.alpha * 0.4;
        }
        var alpha = Math.min(idle + boost * 0.4, 0.45);
        if (alpha <= 0.01) continue;
        var size = 1.0 + boost * 1.8;
        ctx.fillStyle = 'rgba(' + color + ',' + alpha + ')';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (!reduceMotion) requestAnimationFrame(draw);
  }
  draw();
}

/* ---------------------------------------------------------------------
   2. 影片卡片 — 點縮圖原地播放,播放後可再點「展開」跳出彈窗
   --------------------------------------------------------------------- */
var PLACEHOLDER_ID = 'PASTE_YOUTUBE_ID_HERE';

function initVideoCards() {
  var cards = document.querySelectorAll('.video-card');
  cards.forEach(function (card) {
    var media = card.querySelector('.video-card__media');
    if (!media) return;

    var ytIdInit = card.dataset.yt;
    if (ytIdInit && ytIdInit !== PLACEHOLDER_ID) {
      media.style.backgroundImage = 'url(https://i.ytimg.com/vi/' + ytIdInit + '/hqdefault.jpg)';
      media.classList.add('has-thumb');
    }

    media.addEventListener('click', function (e) {
      // 如果點到的是「展開」按鈕,交給 modal 邏輯處理,這裡不重複播放
      if (e.target.closest('.video-card__expand')) return;
      var ytId = card.dataset.yt;
      if (!ytId || ytId === PLACEHOLDER_ID) {
        alert('這張卡片還沒設定影片 ID,請把 data-yt 換成真正的 YouTube 影片 ID。');
        return;
      }
      if (card.classList.contains('is-playing')) return;
      playInline(card, media, ytId);
    });
  });
}

function playInline(card, media, ytId) {
  card.classList.add('is-playing');
  media.innerHTML = '';
  media.classList.remove('has-thumb');

  var iframe = document.createElement('iframe');
  iframe.src = 'https://www.youtube-nocookie.com/embed/' + ytId + '?autoplay=1&mute=1&rel=0';
  iframe.title = 'video';
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
  iframe.allowFullscreen = true;
  media.appendChild(iframe);

  var expandBtn = document.createElement('button');
  expandBtn.type = 'button';
  expandBtn.className = 'video-card__expand';
  expandBtn.setAttribute('aria-label', '在彈出視窗中放大播放');
  expandBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#F2EFE9" stroke-width="2"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg>';
  expandBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    openVideoModal(ytId, card.dataset.title || '');
  });
  media.appendChild(expandBtn);
}

/* ---------------------------------------------------------------------
   3. 彈出視窗(modal)播放 — 獨立於卡片原地播放之外的第二種瀏覽方式
   --------------------------------------------------------------------- */
var videoModalEl = null;

function initVideoModal() {
  videoModalEl = document.getElementById('video-modal');
  if (!videoModalEl) return;
  videoModalEl.addEventListener('click', function (e) {
    if (e.target === videoModalEl) closeVideoModal();
  });
  var closeBtn = videoModalEl.querySelector('.video-modal__close');
  if (closeBtn) closeBtn.addEventListener('click', closeVideoModal);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeVideoModal();
  });
}

function openVideoModal(ytId, title) {
  if (!videoModalEl) return;
  var box = videoModalEl.querySelector('.video-modal__box');
  box.innerHTML = '<button type="button" class="video-modal__close" aria-label="關閉">&times;</button>' +
    '<iframe src="https://www.youtube-nocookie.com/embed/' + ytId + '?autoplay=1&mute=1&rel=0" title="' +
    (title || 'video') + '" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
  box.querySelector('.video-modal__close').addEventListener('click', closeVideoModal);
  videoModalEl.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeVideoModal() {
  if (!videoModalEl || videoModalEl.classList.contains('hidden')) return;
  videoModalEl.classList.add('hidden');
  videoModalEl.querySelector('.video-modal__box').innerHTML = '';
  document.body.style.overflow = '';
}

/* ---------------------------------------------------------------------
   4. 篩選 chips(AllWorks 頁)
   --------------------------------------------------------------------- */
function initFilterChips() {
  var chips = document.querySelectorAll('.filter-chip');
  if (!chips.length) return;
  var cards = document.querySelectorAll('[data-cat]');

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.classList.remove('is-active'); });
      chip.classList.add('is-active');
      var target = chip.dataset.filter;
      cards.forEach(function (card) {
        var show = target === '全部' || card.dataset.cat === target;
        card.classList.toggle('hidden', !show);
      });
    });
  });
}

/* ---------------------------------------------------------------------
   5. 合作洽談表單 — Formspree 串接(表單 ID: xzdnrrrj)
   --------------------------------------------------------------------- */
function initContactForm() {
  var form = document.getElementById('contact-form');
  if (!form) return;

  var successView = document.getElementById('contact-success');
  var submitBtn = document.getElementById('contact-submit');
  var resetBtn = document.getElementById('contact-reset');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.querySelector('[name="name"]').value.trim();
    var contact = form.querySelector('[name="contact"]').value.trim();
    var message = form.querySelector('[name="message"]').value.trim();

    if (!name || !contact || !message) {
      alert('請至少填寫稱呼、聯絡方式與內容需求。');
      return;
    }

    var tier = form.querySelector('[name="tier"]').value;
    var fd = new FormData(form);
    fd.set('_subject', '【合作洽談】' + tier + ' — ' + name);

    submitBtn.disabled = true;
    submitBtn.textContent = '送出中…';

    fetch('https://formspree.io/f/xzdnrrrj', {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: fd
    }).then(function (res) {
      if (res.ok) {
        form.classList.add('hidden');
        successView.classList.remove('hidden');
      } else {
        alert('送出失敗,請稍後再試一次。');
      }
    }).catch(function () {
      alert('送出失敗,請檢查網路連線後再試一次。');
    }).finally(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = '送出合作需求 →';
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      form.reset();
      successView.classList.add('hidden');
      form.classList.remove('hidden');
    });
  }
}
