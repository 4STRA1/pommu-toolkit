// ==UserScript==
// @name         Pommu Toolkit
// @namespace    https://github.com/4STRA1/pommu-toolkit
// @version      1.1.0
// @description  Pommu用の小物スクリプト詰め合わせ(R18画像のみ表示 / YouTubeタイトル自動入力 / 動画埋め込み / Xポスト埋め込み)。Tampermonkeyメニューから機能ごとにON/OFF可能。
// @author       4STRA1
// @license      MIT
// @match        https://ch.dlsite.com/*
// @run-at       document-start
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @connect      www.youtube.com
// @connect      api.fxtwitter.com
// @homepageURL  https://github.com/4STRA1/pommu-toolkit
// @supportURL   https://github.com/4STRA1/pommu-toolkit/issues
// @updateURL    https://raw.githubusercontent.com/4STRA1/pommu-toolkit/main/pommu-toolkit.user.js
// @downloadURL  https://raw.githubusercontent.com/4STRA1/pommu-toolkit/main/pommu-toolkit.user.js
// ==/UserScript==

(() => {
  'use strict';

  // ===== 共通 =====
  const inPommu = () => /^\/pommu(\/|$)/.test(location.pathname);
  const onBody = (fn) => {
    if (document.body) fn();
    else document.addEventListener('DOMContentLoaded', fn, { once: true });
  };

  // ============================================================
  // モジュール1: R18画像のみ表示(旧 PommuR18imgView 1.0.0)
  // ============================================================
  function r18View() {
    // Firefox: unsafeWindow + exportFunction / Chrome: そのままのwindow + 素通しの関数
    const W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const ex = typeof exportFunction === 'function' ? exportFunction : (f) => f;

    const MIN_POSTS = 6;   // 1回の読み込みで最低これだけ集める
    const MAX_PAGES = 8;   // 1回の読み込みで先読みする最大ページ数
    const LIST_PATH = '/api/pommu/posts';
    const ANCHOR = 'label[for^="r18toggle"]'; // 「R18投稿表示」のトグル(SP/PC両方)
    const COLOR_ON = '#38bdf8';               // 水色

    let enabled = true;
    try { enabled = localStorage.getItem('__pf_on') !== '0'; } catch {}
    let scanned = 0, passed = 0, failed = 0;

    // --- サイトの見た目に合わせたスタイル(色は文字色から継承) ---
    const style = document.createElement('style');
    style.textContent = `
  .pf-row{margin-bottom:.75rem;--pf-w:2rem;--pf-h:1.25rem}
  .pf-track{position:relative;flex:none;box-sizing:border-box;width:var(--pf-w);height:var(--pf-h);border-radius:9999px;border:1px solid color-mix(in srgb,currentColor 40%,transparent);transition:background-color .2s ease-out,border-color .2s ease-out}
  .pf-track::after{content:"";position:absolute;top:2px;left:2px;width:calc(var(--pf-h) - 6px);height:calc(var(--pf-h) - 6px);border-radius:9999px;background:color-mix(in srgb,currentColor 60%,transparent);transition:transform .2s ease-out,background-color .2s ease-out}
  .pf-row[aria-checked="true"] .pf-track{background:${COLOR_ON};border-color:${COLOR_ON}}
  .pf-row[aria-checked="true"] .pf-track::after{background:#fff;transform:translateX(calc(var(--pf-w) - var(--pf-h)))}
  .pf-stat{margin-left:.5rem;font-size:11px;opacity:.6}`;
    document.documentElement.append(style);

    // --- トグル行(サイトの label と同じクラス構成) ---
    const rows = new Set();
    const byAnchor = new WeakMap();

    const toggle = () => {
      enabled = !enabled;
      try { localStorage.setItem('__pf_on', enabled ? '1' : '0'); } catch {}
      paint();
      setTimeout(() => location.reload(), 150); // 絞り込みは読み込み時に行うため、反映にはリロードが必要
    };

    const makeRow = () => {
      const row = document.createElement('label');
      row.className = 'label justify-start p-0 cursor-pointer pf-row';
      row.setAttribute('role', 'switch');
      row.tabIndex = 0;
      const name = document.createElement('span');
      name.className = 'mr-2 text-body-md text-on-surface';
      name.textContent = 'R18画像のみ表示';
      const track = document.createElement('span');
      track.className = 'pf-track';
      const stat = document.createElement('span');
      stat.className = 'pf-stat';
      row.append(name, track, stat);
      row._stat = stat;
      row.addEventListener('click', toggle);
      row.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
      });
      return row;
    };

    const paint = () => {
      const t = enabled ? `${passed}/${scanned}${failed ? ' ERR' + failed : ''}` : '';
      for (const row of rows) {
        const v = String(enabled);
        if (row.getAttribute('aria-checked') !== v) row.setAttribute('aria-checked', v);
        if (row._stat.textContent !== t) row._stat.textContent = t; // 同じ内容なら触らない(再描画ループ防止)
      }
    };

    const mount = () => {
      for (const r of rows) if (!r.isConnected) rows.delete(r);
      for (const a of document.querySelectorAll(ANCHOR)) {
        let row = byAnchor.get(a);
        if (!row) {
          row = makeRow();
          byAnchor.set(a, row);
          // 実物のトグルの大きさに合わせる(非表示で測れない時は既定値のまま)
          const inp = a.querySelector('input');
          const cs = inp && getComputedStyle(inp);
          if (cs && parseFloat(cs.width) > 0 && parseFloat(cs.height) > 0) {
            row.style.setProperty('--pf-w', cs.width);
            row.style.setProperty('--pf-h', cs.height);
          }
        }
        rows.add(row);
        if (a.previousElementSibling !== row) a.parentElement.insertBefore(row, a); // 真上に置く
      }
      paint();
    };

    let queued = false;
    const schedule = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; mount(); });
    };
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });

    // --- R18 かつ 画像付き ---
    const keep = (p) => (p.post?.ageCategory ?? 1) >= 2 && (p.post?.imageUrls?.length ?? 0) > 0;

    // --- 次ページを先読みして、条件に合う投稿を集める ---
    async function collect(s) {
      const u = new URL(s.u);
      const out = [];
      let last = null, pages = 0;
      while (pages < MAX_PAGES) {
        const r = await fetch(u.href, { headers: s.h, credentials: 'include' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        pages++;
        last = j;
        for (const p of j.posts || []) {
          scanned++;
          if (keep(p)) { out.push(p); passed++; }
        }
        paint();
        if (out.length >= MIN_POSTS || !j.hasMorePages || !j.nextCursor) break;
        u.searchParams.set('nextCursor', j.nextCursor);
      }
      return { ...last, posts: out };
    }

    // --- XHR フック: 投稿一覧のリクエストだけ差し替える ---
    const proto = W.XMLHttpRequest.prototype;
    const oo = proto.open, os = proto.send, oh = proto.setRequestHeader;
    const meta = new WeakMap();

    proto.open = ex(function (m, url, ...r) {
      try {
        const u = new URL(String(url), location.href);
        if (enabled && u.pathname === LIST_PATH && String(m).toUpperCase() === 'GET') {
          meta.set(this, { u: u.href, h: {} });
        } else {
          meta.delete(this);
        }
      } catch {}
      return oo.call(this, m, url, ...r);
    }, W);

    proto.setRequestHeader = ex(function (k, v) {
      try { const s = meta.get(this); if (s) s.h[k] = v; } catch {}
      return oh.call(this, k, v);
    }, W);

    proto.send = ex(function (body) {
      const s = meta.get(this);
      if (!s) return os.call(this, body);
      const xhr = this;
      collect(s).then((json) => {
        const blobUrl = W.URL.createObjectURL(new W.Blob([JSON.stringify(json)], { type: 'application/json' }));
        oo.call(xhr, 'GET', blobUrl);
        os.call(xhr);
      }).catch(() => {
        failed++; paint();
        os.call(xhr, body); // 失敗時は元のリクエストをそのまま送る
      });
    }, W);
  }

  // ============================================================
  // モジュール2: YouTubeタイトル自動入力(旧 1.2)
  // ============================================================
  function ytTitle() {
    const DEBUG = true;
    const log = (...a) => DEBUG && console.log('[pommu-yt-title]', ...a);
    const YT_SRC = '(?:https?:\\/\\/)?(?:www\\.|m\\.)?(?:youtube\\.com\\/(?:watch\\?[^\\s]*?v=|shorts\\/|live\\/)|youtu\\.be\\/)([\\w-]{11})[^\\s]*';
  
    const titles = new Map(); // id -> title
    const failed = new Map(); // id -> 失敗時刻
    const inflight = new Set(); // 取得中のid
    const timers = new WeakMap();
  
    const toast = (msg) => {
      const d = document.createElement('div');
      d.textContent = msg;
      d.style.cssText = 'position:fixed;left:50%;bottom:80px;transform:translateX(-50%);background:#333;color:#fff;padding:8px 14px;border-radius:8px;z-index:2147483647;font-size:13px';
      document.body.appendChild(d);
      setTimeout(() => d.remove(), 3000);
    };
  
    const fetchTitle = (id) => new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=' + id)}`,
        onload: (r) => {
          if (r.status !== 200) return reject(new Error('HTTP ' + r.status));
          try { resolve(JSON.parse(r.responseText).title); } catch (e) { reject(e); }
        },
        onerror: () => reject(new Error('network error')),
        ontimeout: () => reject(new Error('timeout')),
      });
    });
  
    const setNativeValue = (el, value) => {
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
  
    // 入力欄内のYouTubeリンクを全て収集
    const collect = (el) => {
      const out = [];
      const re = new RegExp(YT_SRC, 'g');
      if (el.isContentEditable) {
        const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = w.nextNode())) {
          re.lastIndex = 0;
          let m;
          while ((m = re.exec(n.nodeValue))) out.push({ node: n, index: m.index, url: m[0], id: m[1] });
        }
      } else {
        const v = el.value;
        let m;
        while ((m = re.exec(v))) out.push({ node: null, index: m.index, url: m[0], id: m[1] });
      }
      return out;
    };
  
    // リンク直前のテキスト(空白のみなら前のノードへ遡る)
    const preceding = (el, hit) => {
      if (!hit.node) return el.value.slice(0, hit.index);
      let s = hit.node.nodeValue.slice(0, hit.index);
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      w.currentNode = hit.node;
      let p;
      while (s.trim() === '' && (p = w.previousNode())) s = p.nodeValue + s;
      return s;
    };
  
    const insertTitle = (el, hit, title) => {
      const line = title + '\n';
      if (hit.node) {
        el.focus();
        const range = document.createRange();
        range.setStart(hit.node, hit.index);
        range.collapse(true);
        const sel = getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('insertText', false, line);
        sel.selectAllChildren(el);
        sel.collapseToEnd();
      } else {
        const v = el.value;
        const caret = el.selectionStart;
        setNativeValue(el, v.slice(0, hit.index) + line + v.slice(hit.index));
        const pos = caret >= hit.index ? caret + line.length : caret;
        try { el.setSelectionRange(pos, pos); } catch (_) {}
      }
      return true;
    };
  
    const scan = (el) => {
      for (const hit of collect(el)) {
        const title = titles.get(hit.id);
      
        if (title === undefined) {
          if (inflight.has(hit.id)) continue;
          if (Date.now() - (failed.get(hit.id) || 0) < 10000) continue;
          inflight.add(hit.id);
          log('取得開始', hit.id);
          fetchTitle(hit.id)
            .then((t) => {
              if (!t) return;
              titles.set(hit.id, t);
              scan(el);
            })
            .catch((err) => {
              failed.set(hit.id, Date.now());
              log('取得失敗', err);
              toast('YouTubeタイトル取得失敗: ' + err.message);
            })
            .finally(() => inflight.delete(hit.id));
          continue;
        }
      
        // 直前に同じタイトルがあれば何もしない
        if (preceding(el, hit).trimEnd().endsWith(title)) continue;
      
        insertTitle(el, hit, title);
        setTimeout(() => scan(el), 0); // 位置が変わるので再走査
        return;
      }
    };
  
    const onInput = (e) => {
      if (!inPommu() || !location.pathname.includes('/posts/')) return;
      const t = e.target;
      if (!(t instanceof Element)) return;
      const el = t.closest('textarea, input, [contenteditable]');
      if (!el || !(el.matches('textarea, input') || el.isContentEditable)) return;
      clearTimeout(timers.get(el));
      timers.set(el, setTimeout(() => scan(el), 300));
    };
  
    document.addEventListener('input', onInput, true);
    document.addEventListener('paste', onInput, true);
    document.addEventListener('change', onInput, true);
    log('loaded');
  }

  // ============================================================
  // モジュール3: 動画埋め込み(YouTube/ニコニコ)(旧 1.5)
  // ============================================================
  function videoEmbed() {
    const MARK = 'data-yt-embed-done';
    const LINK_SEL = 'a[href*="youtube.com"], a[href*="youtu.be"], a[href*="nicovideo.jp"], a[href*="nico.ms"]';

    function parseTime(t) {
      if (!t) return 0;
      const m = String(t).match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
      return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0;
    }

    function parse(href) {
      let u;
      try { u = new URL(href, location.href); } catch { return null; }
      const h = u.hostname.replace(/^(www\.|m\.|music\.|sp\.)/, '');

      // ニコニコ動画
      if (h === 'nicovideo.jp' || h === 'nico.ms') {
        const m = h === 'nico.ms'
          ? u.pathname.match(/^\/((?:sm|nm|so)?\d+)/)
          : u.pathname.match(/^\/watch\/((?:sm|nm|so)?\d+)/);
        if (!m) return null;
        return { site: 'nico', id: m[1], start: parseTime(u.searchParams.get('from')) };
      }

      // YouTube
      let id = null;
      if (h === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
      else if (h === 'youtube.com') {
        if (u.pathname === '/watch') id = u.searchParams.get('v');
        else {
          const m = u.pathname.match(/^\/(shorts|embed|live|v)\/([\w-]{11})/);
          if (m) id = m[2];
        }
      }
      if (!id || !/^[\w-]{11}$/.test(id)) return null;
      return { site: 'yt', id, start: parseTime(u.searchParams.get('t') || u.searchParams.get('start')) };
    }

    function findRoot(a) {
      return a.closest('article, li, [class*="post"], [class*="Post"], [class*="card"], [class*="Card"]') || a.parentElement;
    }

    const SITE = {
      yt:   { name: 'YouTube',  color: '#e62117' },
      nico: { name: 'ニコニコ', color: '#3a3a3a' },
    };

    function build(videos) {
      const wrap = document.createElement('div');
      wrap.className = 'yt-embed-wrap';
      wrap.style.cssText = 'margin:8px 0;max-width:100%;';
      // タップが投稿詳細への遷移などに伝播しないようにする
      wrap.addEventListener('click', e => e.stopPropagation());

      let tabs = null;
      if (videos.length > 1) {
        tabs = document.createElement('div');
        tabs.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;';
        wrap.appendChild(tabs);
      }

      const box = document.createElement('div');
      box.style.cssText = 'position:relative;width:100%;aspect-ratio:16/9;background:#000;border-radius:8px;overflow:hidden;cursor:pointer;';
      wrap.appendChild(box);

      const buttons = [];
      let cur = 0;

      // サムネイル表示(iframeは作らないので即表示される)
      function showThumb(i) {
        cur = i;
        const v = videos[i];
        box.replaceChildren();
        if (v.site === 'yt') {
          const img = document.createElement('img');
          img.src = `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`;
          img.loading = 'lazy';
          img.alt = '';
          img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';
          box.appendChild(img);
        } else {
          const ph = document.createElement('div');
          ph.textContent = 'ニコニコ動画  ' + v.id;
          ph.style.cssText = 'position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center;padding-bottom:12px;color:#ddd;font-size:13px;background:#252525;';
          box.appendChild(ph);
        }
        const play = document.createElement('div');
        play.style.cssText = 'position:absolute;left:50%;top:50%;width:64px;height:44px;margin:-22px 0 0 -32px;background:rgba(0,0,0,.75);border-radius:12px;';
        play.innerHTML = '<svg viewBox="0 0 64 44" width="64" height="44"><path d="M26 12l16 10-16 10z" fill="#fff"/></svg>';
        box.appendChild(play);
        buttons.forEach((b, j) => {
          const c = SITE[videos[j].site].color;
          b.style.background = j === i ? c : '#e8eef5';
          b.style.color = j === i ? '#fff' : '#333';
        });
      }

      // クリックで初めてiframeを読み込む
      box.addEventListener('click', e => {
        e.stopPropagation();
        if (box.querySelector('iframe')) return;
        const v = videos[cur];
        const frame = document.createElement('iframe');
        frame.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;';
        frame.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';
        frame.allowFullscreen = true;
        frame.referrerPolicy = 'strict-origin-when-cross-origin';
        frame.src = v.site === 'yt'
          ? `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1` + (v.start ? `&start=${v.start}` : '')
          : `https://embed.nicovideo.jp/watch/${v.id}?autoplay=1` + (v.start ? `&from=${v.start}` : '');
        box.replaceChildren(frame);
        box.style.cursor = 'default';
      });

      function select(i) {
        box.style.cursor = 'pointer';
        showThumb(i);
      }

      if (tabs) {
        const count = {};
        videos.forEach((v, i) => {
          count[v.site] = (count[v.site] || 0) + 1;
          const info = SITE[v.site];
          const b = document.createElement('button');
          b.type = 'button';
          b.textContent = `${info.name} ${count[v.site]}`;
          b.style.cssText = `border:0;border-left:5px solid ${info.color};border-radius:14px;padding:4px 12px 4px 9px;font-size:13px;cursor:pointer;`;
          b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); select(i); });
          tabs.appendChild(b);
          buttons.push(b);
        });
      }
      select(0);
      return wrap;
    }

    function scan() {
      if (!inPommu()) return;
      const anchors = [];
      document.querySelectorAll(LINK_SEL).forEach(a => {
        if (a.closest('.yt-embed-wrap')) return;
        const v = parse(a.href);
        if (v) anchors.push({ a, v });
      });

      // 各リンクの直近の親(root)ごとに集計
      const own = new Map();
      anchors.forEach(x => {
        const r = findRoot(x.a);
        if (!r) return;
        if (!own.has(r)) own.set(r, []);
        own.get(r).push(x);
      });

      // 入れ子のrootは外側に統合する(本文リンクとプレビューカードのリンクが
      // 別のrootに振り分けられて二重に埋め込まれるのを防ぐ)
      const roots = [...own.keys()];
      const absorbed = new Set();
      roots.forEach(r => {
        if (!own.get(r).length) return;
        roots.forEach(o => { if (o !== r && r.contains(o)) absorbed.add(o); });
      });

      roots.filter(r => !absorbed.has(r)).forEach(r => {
        const videos = [];
        anchors.forEach(x => {
          if (r.contains(x.a) && !videos.some(y => y.site === x.v.site && y.id === x.v.id)) videos.push(x.v);
        });
        const sig = videos.map(v => v.site + v.id + ':' + v.start).join(',');
        if (r.getAttribute(MARK) === sig) return;
        // 以前の埋め込み(内側rootに作られたもの含む)を片付けてから作り直す
        r.querySelectorAll('.yt-embed-wrap').forEach(w => w.remove());
        r.querySelectorAll('[' + MARK + ']').forEach(e => e.removeAttribute(MARK));
        r.setAttribute(MARK, sig);
        r.appendChild(build(videos));
      });
    }

    // document-start で起動するため、body が出来てから監視を始める
    onBody(() => {
      let timer = null;
      new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(scan, 300);
      }).observe(document.body, { childList: true, subtree: true });
      scan();
    });
  }

  // ============================================================
  // モジュール4: X(x.com)ポスト埋め込み(旧 pommu-x-embed 1.1.0)
  // ============================================================
  function xEmbed() {
    // x.com / twitter.com のポストURL
    const STATUS_RE = /(?:^|[\/.])(?:x|twitter)\.com\/([A-Za-z0-9_]+)\/status(?:es)?\/(\d+)/i;

    // ---------- スタイル ----------
    const style = document.createElement('style');
    style.textContent = `
      .xe-embed{margin:8px 0;max-width:560px}
      .xe-card{border:1px solid rgba(128,128,128,.4);border-radius:12px;padding:10px 12px;
        font-size:14px;line-height:1.5;color:inherit;box-sizing:border-box;overflow:hidden}
      .xe-card a{color:inherit;text-decoration:none}
      .xe-quote{margin-top:8px;border-radius:10px}
      .xe-head{display:flex;align-items:center;gap:8px;margin-bottom:4px}
      .xe-avatar{width:32px;height:32px;border-radius:50%;flex:none}
      .xe-name{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .xe-sn{opacity:.6;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .xe-text{white-space:pre-wrap;word-break:break-word;margin:4px 0}
      .xe-text.xe-collapsed{max-height:7.5em;overflow:hidden}
      .xe-toggle{display:block;margin:0 0 4px;padding:0;border:0;background:none;color:inherit;
        opacity:.7;font-size:12px;text-decoration:underline;cursor:pointer}
      .xe-media{display:grid;gap:4px;margin-top:6px}
      .xe-media.xe-multi{grid-template-columns:repeat(2,1fr)}
      .xe-media img,.xe-media video{width:100%;max-height:360px;border-radius:8px;display:block;object-fit:contain}
      .xe-media.xe-multi img,.xe-media.xe-multi video{object-fit:cover;height:180px}
      .xe-foot{opacity:.6;font-size:12px;margin-top:6px}
      .xe-msg{opacity:.7;font-size:13px}
    `;
    document.documentElement.append(style);

    // ---------- util ----------
    const el = (tag, cls, text) => {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      return e;
    };
    const safeDecode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

    // ---------- API (fxtwitter) ----------
    const cache = new Map();
    function fetchTweet(user, id) {
      if (cache.has(id)) return cache.get(id);
      const p = new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: 'GET',
          url: `https://api.fxtwitter.com/${user}/status/${id}`,
          headers: { Accept: 'application/json' },
          timeout: 15000,
          onload: (r) => {
            try {
              const j = JSON.parse(r.responseText);
              if (j && j.tweet) resolve(j.tweet);
              else reject(new Error((j && j.message) || `HTTP ${r.status}`));
            } catch (e) { reject(e); }
          },
          onerror: () => reject(new Error('通信エラー')),
          ontimeout: () => reject(new Error('タイムアウト')),
        });
      });
      cache.set(id, p);
      p.catch(() => cache.delete(id));
      return p;
    }

    // ---------- 描画 ----------
    function renderMedia(t) {
      const items = (t.media && t.media.all) || [];
      if (!items.length) return null;
      const wrap = el('div', 'xe-media' + (items.length > 1 ? ' xe-multi' : ''));
      for (const m of items) {
        if (m.type === 'photo') {
          const a = el('a');
          a.href = m.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
          const img = el('img');
          img.src = m.url; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
          a.appendChild(img);
          wrap.appendChild(a);
        } else if (m.type === 'video' || m.type === 'gif') {
          const v = el('video');
          v.src = m.url;
          if (m.thumbnail_url) v.poster = m.thumbnail_url;
          v.controls = true; v.playsInline = true; v.preload = 'metadata';
          if (m.type === 'gif') { v.muted = true; v.loop = true; }
          wrap.appendChild(v);
        }
      }
      return wrap.childElementCount ? wrap : null;
    }

    function renderTweet(t, isQuote) {
      const card = el('div', 'xe-card' + (isQuote ? ' xe-quote' : ''));

      const head = el('a', 'xe-head');
      head.href = t.url; head.target = '_blank'; head.rel = 'noopener noreferrer';
      if (t.author && t.author.avatar_url) {
        const av = el('img', 'xe-avatar');
        av.src = t.author.avatar_url; av.loading = 'lazy'; av.referrerPolicy = 'no-referrer';
        head.appendChild(av);
      }
      const names = el('div');
      names.style.minWidth = '0';
      names.appendChild(el('div', 'xe-name', (t.author && t.author.name) || ''));
      names.appendChild(el('div', 'xe-sn', t.author ? '@' + t.author.screen_name : ''));
      head.appendChild(names);
      card.appendChild(head);

      if (t.text) card.appendChild(el('div', 'xe-text', t.text));
      const media = renderMedia(t);
      if (media) card.appendChild(media);

      // 引用リポストの引用部分(引用の引用は表示しない)
      if (!isQuote && t.quote) card.appendChild(renderTweet(t.quote, true));

      if (t.created_timestamp) {
        card.appendChild(el('div', 'xe-foot', new Date(t.created_timestamp * 1000).toLocaleString('ja-JP')));
      }
      // 埋め込み内のクリックで投稿カード側の遷移が走らないようにする
      card.addEventListener('click', (e) => e.stopPropagation());
      return card;
    }

    // 本文が長い場合は折りたたむ(DOMに挿入後に高さを測って判定)
    function setupCollapse(root) {
      root.querySelectorAll('.xe-text').forEach((txt) => {
        txt.classList.add('xe-collapsed');
        if (txt.scrollHeight <= txt.clientHeight + 1) {
          txt.classList.remove('xe-collapsed');
          return;
        }
        const btn = el('button', 'xe-toggle', '続きを読む');
        btn.type = 'button';
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const collapsed = txt.classList.toggle('xe-collapsed');
          btn.textContent = collapsed ? '続きを読む' : '閉じる';
        });
        txt.after(btn);
      });
    }

    // ---------- 検出・挿入 ----------
    function process(root) {
      if (!inPommu()) return;
      root.querySelectorAll('a[href]').forEach((a) => {
        if (a.dataset.xeDone || a.closest('.xe-embed')) return;
        const m = STATUS_RE.exec(safeDecode(a.href)) || STATUS_RE.exec(a.textContent || '');
        if (!m) return;
        a.dataset.xeDone = '1';
        const [, user, id] = m;

        // 同じ投稿内で同一ポストを重複表示しない / 複数リンクは順に並べる
        const host = a.closest('p, li, div') || a.parentElement;
        if (!host) return;
        let ref = host;
        while (ref.nextElementSibling && ref.nextElementSibling.classList.contains('xe-embed')) {
          ref = ref.nextElementSibling;
          if (ref.dataset.xeId === id) return;
        }

        const box = el('div', 'xe-embed');
        box.dataset.xeId = id;
        box.appendChild(el('div', 'xe-msg', 'ポストを読み込み中…'));
        ref.after(box);

        fetchTweet(user, id).then(
          (t) => {
            box.replaceChildren(renderTweet(t, false));
            setupCollapse(box);
          },
          (err) => {
            const msg = el('div', 'xe-card xe-msg');
            msg.append(`ポストを取得できませんでした(${err.message}) `);
            const link = el('a', null, 'x.comで開く');
            link.href = `https://x.com/${user}/status/${id}`;
            link.target = '_blank'; link.rel = 'noopener noreferrer';
            msg.appendChild(link);
            box.replaceChildren(msg);
          }
        );
      });
    }

    // ---------- SPA対応 ----------
    let timer = null;
    const schedule = () => { clearTimeout(timer); timer = setTimeout(() => process(document), 300); };

    // document-start で起動するため、body が出来てから監視を始める
    onBody(() => {
      new MutationObserver((muts) => {
        // 自分が挿入したノードによる変化は無視
        const external = muts.some((m) =>
          [...m.addedNodes].some((n) => !(n.nodeType === 1 && (n.classList.contains('xe-embed') || n.closest('.xe-embed'))))
        );
        if (external) schedule();
      }).observe(document.body, { childList: true, subtree: true });

      process(document);
    });
  }

  // ============================================================
  // 機能ごとのON/OFF(Tampermonkeyメニューから切り替え。切替後にリロード)
  // ============================================================
  const MODULES = [
    { id: 'r18view', name: 'R18画像のみ表示', init: r18View },
    { id: 'ytTitle', name: 'YouTubeタイトル自動入力', init: ytTitle },
    { id: 'videoEmbed', name: '動画埋め込み', init: videoEmbed },
    { id: 'xEmbed', name: 'Xポスト埋め込み', init: xEmbed },
  ];

  const isOn = (id) => {
    try { return GM_getValue('mod.' + id, true) !== false; } catch { return true; }
  };

  for (const m of MODULES) {
    const on = isOn(m.id);
    try {
      GM_registerMenuCommand(`${on ? '✅' : '⬜'} ${m.name}`, () => {
        GM_setValue('mod.' + m.id, !on);
        location.reload();
      });
    } catch {}
    if (!on) continue;
    try { m.init(); } catch (e) { console.error('[pommu-toolkit]', m.id, e); } // 1つ失敗しても他は動かす
  }
})();
