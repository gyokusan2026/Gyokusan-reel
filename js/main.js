/* ==========================================================================
   Gyokusan.REEL — 共用互動邏輯（米白紙卡版型）
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  initBgVideo();
  initWorkGrid();
  initBtsGrid();
  initContactForm();
  initVideoModal();
});

/* ---------------------------------------------------------------------
   0. 共用小工具
   --------------------------------------------------------------------- */
function extractYouTubeId(raw) {
  if (!raw) return raw;
  var str = String(raw).trim();
  var vMatch = str.match(/[?&]v=([A-Za-z0-9_-]{6,20})/);
  if (vMatch) return vMatch[1];
  var pathMatch = str.match(/(?:youtu\.be\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{6,20})/);
  if (pathMatch) return pathMatch[1];
  return str.split(/[?&#\s]/)[0] || str;
}

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function youtubeThumb(ytId) {
  return 'https://i.ytimg.com/vi/' + ytId + '/hqdefault.jpg';
}

function youtubeEmbed(ytId) {
  return '<iframe src="https://www.youtube-nocookie.com/embed/' + ytId +
    '?autoplay=1&rel=0" title="video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
}

/* ---------------------------------------------------------------------
   1. 背景影片 / 首頁 hero 影片 — 強制播放
   --------------------------------------------------------------------- */
function initBgVideo() {
  document.querySelectorAll('video').forEach(function (v) {
    v.muted = true;
    v.loop = true;
    var tryPlay = function () { v.play().catch(function () {}); };
    tryPlay();
    v.addEventListener('loadeddata', tryPlay);
    v.addEventListener('loadeddata', function () {
      var placeholder = v.parentElement && v.parentElement.querySelector('.hero-reel__placeholder');
      if (placeholder) placeholder.classList.add('hidden');
    });
  });
}

/* ---------------------------------------------------------------------
   2. 首頁 WORK 區塊 — 分類 chips + 大預覽 + 縮圖網格
   --------------------------------------------------------------------- */
var HOME_CATEGORY_ORDER = ['全部', '品牌廣告', '產品影片', '生活vlog', 'MV製作'];

function initWorkGrid() {
  var chipsEl = document.getElementById('work-chips');
  var previewMediaEl = document.getElementById('work-preview-media');
  var previewPillEl = document.getElementById('work-preview-pill');
  var gridEl = document.getElementById('work-grid');
  if (!chipsEl || !previewMediaEl || !gridEl) return;

  fetch('content/works.json')
    .then(function (res) {
      if (!res.ok) throw new Error('works.json 讀取失敗：' + res.status);
      return res.json();
    })
    .then(function (data) {
      var items = (data.items || []).map(function (item, idx) {
        var ytId = extractYouTubeId(item.yt);
        return {
          id: ytId || ('work-' + idx),
          title: item.title || '',
          cat: item.cat || '未分類',
          yt: ytId,
          desc: item.desc || '',
          dur: item.dur || '',
          ratio: item.ratio || '9:16',
        };
      });

      var cats = HOME_CATEGORY_ORDER.filter(function (c) {
        return c === '全部' || items.some(function (w) { return w.cat === c; });
      });
      items.forEach(function (w) {
        if (cats.indexOf(w.cat) === -1) cats.push(w.cat);
      });

      var state = { filter: '全部', selectedId: items.length ? items[0].id : null, isPlaying: false };

      function visibleWorks() {
        return state.filter === '全部' ? items : items.filter(function (w) { return w.cat === state.filter; });
      }

      function selectedWork() {
        var visible = visibleWorks();
        var found = visible.filter(function (w) { return w.id === state.selectedId; })[0];
        return found || visible[0] || null;
      }

      function renderChips() {
        chipsEl.innerHTML = cats.map(function (c) {
          var active = c === state.filter;
          return '<button type="button" class="chip' + (active ? ' is-active' : '') +
            '" data-cat="' + escapeHtml(c) + '">' + escapeHtml(c) + '</button>';
        }).join('');
        chipsEl.querySelectorAll('.chip').forEach(function (btn) {
          btn.addEventListener('click', function () {
            state.filter = btn.dataset.cat;
            state.isPlaying = false;
            var stillVisible = visibleWorks().some(function (w) { return w.id === state.selectedId; });
            if (!stillVisible) {
              var first = visibleWorks()[0];
              state.selectedId = first ? first.id : null;
            }
            renderAll();
          });
        });
      }

      function renderPreview() {
        var work = selectedWork();
        if (!work) {
          previewMediaEl.innerHTML = '';
          previewPillEl.innerHTML = '';
          return;
        }
        if (state.isPlaying && work.yt) {
          previewMediaEl.style.backgroundImage = '';
          previewMediaEl.innerHTML = youtubeEmbed(work.yt);
        } else {
          previewMediaEl.innerHTML = '<div class="work-preview__play"><span>▶</span></div>';
          previewMediaEl.style.backgroundImage = work.yt ? 'url(' + youtubeThumb(work.yt) + ')' : 'none';
        }
        previewPillEl.innerHTML =
          '<span class="work-preview__pill-dot"></span><span>' +
          escapeHtml(work.cat) + (work.dur ? ' · ' + escapeHtml(work.dur) : '') + ' · ' + escapeHtml(work.ratio) + '</span>';
      }

      function renderGrid() {
        var visible = visibleWorks();
        gridEl.innerHTML = visible.map(function (w) {
          var selected = w.id === state.selectedId;
          return (
            '<div class="work-grid__item' + (selected ? ' is-selected' : '') + '" data-id="' + escapeHtml(w.id) + '">' +
              '<div class="work-grid__thumb" style="' + (w.yt ? 'background-image:url(' + youtubeThumb(w.yt) + ')' : '') + '"></div>' +
              '<div class="work-grid__info"><div class="work-grid__title">' + escapeHtml(w.title) + '</div></div>' +
            '</div>'
          );
        }).join('');
        gridEl.querySelectorAll('.work-grid__item').forEach(function (el) {
          el.addEventListener('click', function () {
            state.selectedId = el.dataset.id;
            state.isPlaying = false;
            renderAll();
          });
        });
      }

      function renderAll() {
        renderChips();
        renderPreview();
        renderGrid();
      }

      previewMediaEl.addEventListener('click', function () {
        if (state.isPlaying) return;
        state.isPlaying = true;
        renderPreview();
      });

      renderAll();
    })
    .catch(function (err) {
      console.error('作品資料載入失敗', err);
      gridEl.innerHTML = '<p class="mono" style="color:var(--muted-60);">作品資料載入失敗，請稍後再試。</p>';
    });
}

/* ---------------------------------------------------------------------
   3. BTS 頁 — 方形卡片網格,點擊原地播放
   --------------------------------------------------------------------- */
function initBtsGrid() {
  var gridEl = document.getElementById('bts-grid');
  var countEl = document.getElementById('bts-count');
  if (!gridEl) return;

  fetch('content/bts.json')
    .then(function (res) {
      if (!res.ok) throw new Error('bts.json 讀取失敗：' + res.status);
      return res.json();
    })
    .then(function (data) {
      var items = data.items || [];
      gridEl.innerHTML = items.map(function (item, idx) {
        var num = String(idx + 1).length < 2 ? '0' + (idx + 1) : String(idx + 1);
        var ytId = extractYouTubeId(item.yt);
        var color = idx % 2 === 0 ? 'var(--orange)' : 'var(--teal)';
        return (
          '<div class="bts-grid__item" data-yt="' + escapeHtml(ytId || '') + '">' +
            '<div class="bts-grid__thumb" style="' + (ytId ? 'background-image:url(' + youtubeThumb(ytId) + ')' : '') + '">' +
              '<div class="work-preview__play"><span>▶</span></div>' +
            '</div>' +
            '<div class="bts-grid__meta"><span class="bts-grid__num" style="color:' + color + ';">' + num + '</span>' +
            '<span class="bts-grid__tag">' + escapeHtml(item.tag || '') + '</span></div>' +
            '<div class="bts-grid__title">' + escapeHtml(item.title || ('幕後花絮 ' + num)) + '</div>' +
          '</div>'
        );
      }).join('');

      if (countEl) countEl.textContent = items.length + ' FRAMES';

      gridEl.querySelectorAll('.bts-grid__item').forEach(function (card) {
        card.addEventListener('click', function (e) {
          if (e.target.closest('.bts-grid__expand')) return;
          var ytId = card.dataset.yt;
          if (!ytId) return;
          var thumb = card.querySelector('.bts-grid__thumb');
          if (thumb.querySelector('iframe')) return;
          thumb.style.backgroundImage = '';
          thumb.innerHTML = youtubeEmbed(ytId);

          var expandBtn = document.createElement('button');
          expandBtn.type = 'button';
          expandBtn.className = 'bts-grid__expand';
          expandBtn.setAttribute('aria-label', '在彈出視窗中放大播放');
          expandBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#F2EFE9" stroke-width="2"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg>';
          expandBtn.addEventListener('click', function (ev) {
            ev.stopPropagation();
            var title = card.querySelector('.bts-grid__title');
            openVideoModal(ytId, title ? title.textContent : '');
            thumb.innerHTML = '<div class="work-preview__play"><span>▶</span></div>';
            thumb.style.backgroundImage = 'url(' + youtubeThumb(ytId) + ')';
          });
          thumb.appendChild(expandBtn);
        });
      });
    })
    .catch(function (err) {
      console.error('花絮資料載入失敗', err);
      gridEl.innerHTML = '<p class="mono" style="color:var(--muted-60);">花絮資料載入失敗，請稍後再試。</p>';
    });
}

/* ---------------------------------------------------------------------
   4. 影片彈窗放大播放（BTS 用）
   --------------------------------------------------------------------- */
var videoModalEl = null;

function initVideoModal() {
  videoModalEl = document.getElementById('video-modal');
  if (!videoModalEl) return;
  videoModalEl.addEventListener('click', function (e) {
    if (e.target === videoModalEl) closeVideoModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeVideoModal();
  });
}

function openVideoModal(ytId, title) {
  if (!videoModalEl) return;
  var box = videoModalEl.querySelector('.video-modal__box');
  box.innerHTML = '<button type="button" class="video-modal__close" aria-label="關閉">&times;</button>' +
    '<iframe src="https://www.youtube-nocookie.com/embed/' + ytId + '?autoplay=1&rel=0" title="' +
    escapeHtml(title || 'video') + '" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
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
