/* Jefferson Thales · Soluna IA — interações da landing page (porte do design "Landing Page.dc.html") */
(function () {
  'use strict';

  // ---------- Configuração ----------
  var CONFIG = {
    whatsapp: '5511924574553',
    // Vazio = o formulário abre o WhatsApp com o pedido preenchido (padrão).
    // Com uma URL (Formspree, Web3Forms…), o pedido é enviado por POST {nome, whatsapp, tipo, mensagem}.
    formEndpoint: '',
    // Backend da Luna (api/luna.php): POST {messages:[{role,content}]} → {reply:"..."}.
    // Se falhar ou não estiver configurado, a Luna usa as respostas prontas de fallback().
    lunaEndpoint: '/api/luna.php',
    lunaPreviewSeconds: 20
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v) { return Math.max(0, Math.min(1, v)); };
  var isMob = function () { return window.innerWidth < 820; };
  var wa = function (t) { return 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(t); };
  var rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var NAV = ['servicos', 'agentes', 'portfolio', 'cases', 'precos', 'duvidas'];
  var state = { step: 0, shown: 0, active: '', portIdx: 0, proc: -1, lastY: 0, drawer: false };

  // ---------- Revelação ao rolar ----------
  var io;
  function setupReveal() {
    if (rm) return;
    var words = $$('[data-word]');
    var tops = [];
    words.forEach(function (w) { var t = Math.round(w.parentNode.offsetTop); if (tops.indexOf(t) < 0) tops.push(t); });
    tops.sort(function (a, b) { return a - b; });
    words.forEach(function (w) { w.setAttribute('data-delay', 160 + tops.indexOf(Math.round(w.parentNode.offsetTop)) * 110); });

    $$('[data-reveal]').forEach(function (el) {
      el._tr = el.style.transition; el._fin = el.style.transform || ''; el._op = el.style.opacity || '';
      var cf = el.getAttribute('data-clip-from');
      if (cf) { el._clip = el.style.clipPath || ''; el.style.clipPath = cf; }
      el.style.transition = 'none';
      var from = (isMob() && el.getAttribute('data-from-mob')) || el.getAttribute('data-from') || 'translateY(28px)';
      el.style.transform = from + (el._fin && !el.hasAttribute('data-replace') ? ' ' + el._fin : '');
      if (!el.hasAttribute('data-noop')) el.style.opacity = '0';
    });
    $$('[data-count]').forEach(function (el) { el.textContent = '0'; });
    $$('[data-draw]').forEach(function (svg) {
      var shapes = svg.tagName.toLowerCase() === 'svg' ? $$('path,polyline,circle', svg) : [svg];
      shapes.forEach(function (p) { var L = p.getTotalLength ? p.getTotalLength() : 200; p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
    });

    io = new IntersectionObserver(function (entries) {
      var i = 0;
      entries.filter(function (e) { return e.isIntersecting; }).forEach(function (e) {
        io.unobserve(e.target);
        (e.target._revEls || []).forEach(function (el) {
          var d = el.hasAttribute('data-delay') ? +el.getAttribute('data-delay') : (i++) * 80;
          play(el, d);
        });
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    // Um elemento deslocado para fora de um pai com overflow:hidden (palavras do H1, títulos)
    // nunca "intersecta"; nesses casos observa-se o pai.
    $$('[data-reveal],[data-count],[data-draw]').forEach(function (el) {
      var t = el, par = el.parentElement;
      if (el.hasAttribute('data-reveal') && par && getComputedStyle(par).overflow === 'hidden' && par.children.length === 1) t = par;
      // Idem para elementos totalmente recortados por clip-path (cards de Serviços)
      if (el.hasAttribute('data-clip-from') && par) t = par;
      (t._revEls = t._revEls || []).push(el);
      io.observe(t);
    });
  }

  function play(el, d) {
    if (el.hasAttribute('data-reveal')) {
      el.style.transition = 'transform 1.2s cubic-bezier(.16,1,.3,1) ' + d + 'ms, opacity .9s ease ' + d + 'ms, clip-path 1.3s cubic-bezier(.16,1,.3,1) ' + d + 'ms';
      el.style.transform = el._fin; el.style.opacity = el._op;
      if (el._clip !== undefined) el.style.clipPath = el._clip;
      setTimeout(function () { el.style.transition = el._tr; }, d + 1500);
    }
    if (el.hasAttribute('data-count')) {
      var v = +el.getAttribute('data-count');
      setTimeout(function () {
        var t0 = performance.now();
        var tick = function (now) {
          var k = Math.min(1, (now - t0) / 1600);
          el.textContent = Math.round(v * (1 - Math.pow(1 - k, 3))).toLocaleString('pt-BR');
          if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, d);
    }
    if (el.hasAttribute('data-draw')) {
      var shapes = el.tagName.toLowerCase() === 'svg' ? $$('path,polyline,circle', el) : [el];
      shapes.forEach(function (p) { p.style.transition = 'stroke-dashoffset 1.3s cubic-bezier(.65,0,.35,1) ' + (d + 150) + 'ms'; p.style.strokeDashoffset = '0'; });
    }
  }

  // ---------- Agentes de IA: celular + etapas ----------
  var phoneTyping = $('#phone-typing');
  var typT;
  function renderPhone() {
    $$('[data-pm]').forEach(function (m) { m.style.display = +m.getAttribute('data-pm') <= state.shown ? '' : 'none'; });
  }
  function renderSteps() {
    $$('[data-step]').forEach(function (s, i) {
      var on = i === state.step;
      s.style.opacity = on ? 1 : 0.4;
      var bar = $('[data-bar]', s); if (bar) bar.style.transform = on ? 'scaleX(1)' : 'scaleX(0)';
    });
  }
  function goStep(idx) {
    if (idx === state.step) return;
    clearTimeout(typT);
    state.step = idx;
    if (idx > state.shown && !rm) {
      phoneTyping.style.display = 'flex';
      typT = setTimeout(function () { phoneTyping.style.display = 'none'; state.shown = state.step; renderPhone(); }, 850);
    } else {
      phoneTyping.style.display = 'none'; state.shown = idx; renderPhone();
    }
    renderSteps();
  }
  $$('[data-step]').forEach(function (s, i) { s.addEventListener('click', function () { goStep(i); }); });
  var stepsEl = $('#ag-steps');
  stepsEl.addEventListener('scroll', function () {
    if (!isMob()) return;
    var first = stepsEl.firstElementChild, w = first ? first.offsetWidth + 16 : 1;
    goStep(Math.max(0, Math.min(3, Math.round(stepsEl.scrollLeft / w))));
  }, { passive: true });

  // ---------- Portfólio ----------
  var portOuter = $('#port-outer'), portTrack = $('#port-track'), portCount = $('#port-count'), portEmpty = $('#port-empty');
  var portDist = 0;
  function portItems() { return $$('.port-card', portTrack).filter(function (c) { return c.style.display !== 'none'; }); }
  function renderPortCount() {
    var n = portItems().length;
    portCount.textContent = n ? String(state.portIdx + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0') : '00 / 00';
  }
  function measurePort() {
    if (isMob() || rm) { portTrack.style.transform = ''; portOuter.style.height = 'auto'; return; }
    portDist = Math.max(0, portTrack.scrollWidth - portTrack.clientWidth);
    portOuter.style.height = Math.round(window.innerHeight + portDist) + 'px';
  }
  $$('[data-filter]').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = b.getAttribute('data-filter');
      $$('[data-filter]').forEach(function (o) {
        var on = o === b;
        o.setAttribute('aria-pressed', on);
        o.style.background = on ? '#F5F3F7' : 'transparent';
        o.style.color = on ? '#14101C' : '#D9D4E0';
        o.style.borderColor = on ? '#F5F3F7' : 'rgba(255,255,255,.18)';
      });
      $$('.port-card', portTrack).forEach(function (c) {
        var cats = c.getAttribute('data-cats').split(' ');
        c.style.display = f === 'all' || cats.indexOf(f) >= 0 ? '' : 'none';
      });
      portEmpty.hidden = portItems().length > 0;
      state.portIdx = 0; portTrack.scrollLeft = 0; renderPortCount();
      requestAnimationFrame(function () { measurePort(); onScroll(); });
    });
  });
  portTrack.addEventListener('scroll', function () {
    if (!isMob()) return;
    var first = portItems()[0], w = first ? first.offsetWidth + 20 : 1, i = Math.round(portTrack.scrollLeft / w);
    if (i !== state.portIdx) { state.portIdx = i; renderPortCount(); }
  }, { passive: true });

  // ---------- Processo ----------
  var proc = $('#proc'), procFill = $('#proc-fill');
  function renderProc(lit) {
    $$('[data-proc]', proc).forEach(function (nd, i) {
      var on = i < lit, n = $('[data-proc-n]', nd), t = $('[data-proc-t]', nd);
      n.style.background = on ? 'linear-gradient(135deg,#E8368F,#FF7A3D)' : '#15101F';
      n.style.color = on ? '#fff' : '#B7B0C2';
      n.style.borderColor = on ? 'transparent' : 'rgba(255,255,255,.14)';
      n.style.boxShadow = on ? '0 0 30px rgba(232,54,143,.55)' : 'none';
      t.style.opacity = on ? 1 : 0.55;
    });
  }

  // ---------- Rolagem ----------
  var progress = $('#progress'), header = $('#header'), servCurtain = $('#serv-curtain'), serv = $('#servicos');
  var cta = $('#cta'), ctaSun = $('#cta-sun'), footFill = $('#foot-fill');
  var pxEls = $$('[data-px]'), stepEls = $$('[data-step]'), navEls = NAV.map(function (id) { return document.getElementById(id); });
  var raf = 0;

  function onScroll() {
    var y = window.scrollY, vh = window.innerHeight, H = document.documentElement.scrollHeight;
    progress.style.transform = 'scaleX(' + clamp(y / Math.max(1, H - vh)).toFixed(4) + ')';

    var g = y > 40;
    header.style.background = g ? 'rgba(11,8,20,.72)' : 'transparent';
    header.style.backdropFilter = header.style.webkitBackdropFilter = g ? 'blur(16px)' : 'none';
    header.style.borderBottomColor = g ? 'rgba(255,255,255,.08)' : 'transparent';
    header.style.transform = (y > state.lastY && y > 320 && !state.drawer) ? 'translateY(-100%)' : 'translateY(0)';
    state.lastY = y;

    if (!rm && y < vh * 1.6) {
      var f = isMob() ? 0.5 : 1;
      pxEls.forEach(function (el) {
        var tr = 'translate3d(0,' + (y * +el.getAttribute('data-px') * f).toFixed(1) + 'px,0)';
        if (el.hasAttribute('data-px-sun')) { var p = clamp(y / vh); tr += ' scale(' + (1 + p * 0.25).toFixed(3) + ')'; el.style.opacity = (1 - p * 0.7).toFixed(3); }
        el.style.transform = tr;
      });
    }

    var act = '';
    navEls.forEach(function (e, i) { if (e) { var r = e.getBoundingClientRect(); if (r.top <= vh * 0.4 && r.bottom > vh * 0.4) act = NAV[i]; } });
    if (act !== state.active) {
      state.active = act;
      $$('[data-ul]').forEach(function (u) { u.style.transform = u.getAttribute('data-ul') === act ? 'scaleX(1)' : 'scaleX(0)'; });
    }

    if (!rm) {
      var rs = serv.getBoundingClientRect();
      servCurtain.style.opacity = (1 - Math.min(clamp((vh - rs.top) / (vh * 0.55)), clamp(rs.bottom / (vh * 0.55)))).toFixed(3);
    }

    if (!isMob()) {
      var idx = 0;
      stepEls.forEach(function (e, i) { if (e.getBoundingClientRect().top < vh * 0.55) idx = i; });
      goStep(idx);
      if (!rm) {
        var rp = portOuter.getBoundingClientRect(), scr = rp.height - vh, pp = scr > 0 ? clamp(-rp.top / scr) : 0;
        portTrack.style.transform = 'translate3d(' + (-(pp * portDist)).toFixed(1) + 'px,0,0)';
        var n = portItems().length, pi = Math.round(pp * Math.max(0, n - 1));
        if (pi !== state.portIdx) { state.portIdx = pi; renderPortCount(); }
      }
    }

    var rr = proc.getBoundingClientRect(), pr = rm ? 1 : clamp((vh * 0.62 - rr.top) / rr.height);
    procFill.style.transform = 'scaleY(' + pr.toFixed(4) + ')';
    var lit = 0;
    $$('[data-proc]', proc).forEach(function (nd) { if (nd.offsetTop + 10 <= pr * rr.height) lit++; });
    if (lit !== state.proc) { state.proc = lit; renderProc(lit); }

    var rc = cta.getBoundingClientRect(), pc = rm ? 1 : clamp((vh - rc.top) / (rc.height * 0.9));
    ctaSun.style.transform = 'translateX(-50%) translateY(' + ((1 - pc) * 45).toFixed(2) + '%) scale(' + (0.85 + 0.15 * pc).toFixed(3) + ')';

    var pf = rm ? 1 : clamp(1 - (H - vh - y) / (vh * 0.9));
    footFill.style.clipPath = 'inset(0 ' + ((1 - pf) * 100).toFixed(2) + '% 0 0)';
  }
  window.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(function () { raf = 0; onScroll(); }); }, { passive: true });
  var resizeT;
  window.addEventListener('resize', function () { clearTimeout(resizeT); resizeT = setTimeout(function () { measurePort(); onScroll(); }, 120); });

  // ---------- Inclinação 3D, brilho e zonas de hover ----------
  var curTilt = null;
  document.addEventListener('mousemove', function (e) {
    if (isMob()) return;
    var t = e.target && e.target.closest ? e.target.closest('[data-tilt]') : null;
    if (curTilt && curTilt !== t) {
      curTilt.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
      var og = $('[data-glow]', curTilt); if (og) og.style.opacity = '0';
    }
    curTilt = t; if (!t) return;
    var r = t.getBoundingClientRect(), x = e.clientX - r.left, yy = e.clientY - r.top;
    t.style.setProperty('--mx', x + 'px'); t.style.setProperty('--my', yy + 'px');
    var gl = $('[data-glow]', t); if (gl) gl.style.opacity = '1';
    if (!t.hasAttribute('data-flat') && !rm) t.style.transform = 'perspective(1000px) rotateX(' + (-(yy / r.height - 0.5) * 12).toFixed(2) + 'deg) rotateY(' + ((x / r.width - 0.5) * 12).toFixed(2) + 'deg)';
  });
  var hzSet = [];
  function hz(el, on) {
    $$('[data-hon]', el).forEach(function (ch) {
      if (ch._h0 === undefined) ch._h0 = ch.style.transform;
      ch.style.transform = on ? ch.getAttribute('data-hon') : ch._h0;
    });
  }
  function hzUpdate(target) {
    var set = [], n = target;
    while (n && n.nodeType === 1) { if (n.hasAttribute('data-hz')) set.push(n); n = n.parentNode; }
    hzSet.forEach(function (el) { if (set.indexOf(el) < 0) hz(el, false); });
    set.forEach(function (el) { if (hzSet.indexOf(el) < 0) hz(el, true); });
    hzSet = set;
  }
  document.addEventListener('mouseover', function (e) { hzUpdate(e.target); });
  document.addEventListener('focusin', function (e) { hzUpdate(e.target); });

  // ---------- Menu do celular ----------
  var drawer = $('#drawer'), drawerOpen = $('#drawer-open');
  function setDrawer(open) {
    state.drawer = open;
    drawer.hidden = !open; drawer.style.display = open ? 'flex' : '';
    drawerOpen.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) $('[data-drawer-close]', drawer).focus(); else drawerOpen.focus({ preventScroll: true });
  }
  drawerOpen.addEventListener('click', function () { setDrawer(true); });
  $$('[data-drawer-close]', drawer).forEach(function (b) { b.addEventListener('click', function () { setDrawer(false); }); });

  // ---------- Dúvidas (acordeão) ----------
  $$('[data-faq]').forEach(function (item) {
    var btn = $('button', item);
    btn.addEventListener('click', function () {
      var willOpen = btn.getAttribute('aria-expanded') !== 'true';
      $$('[data-faq]').forEach(function (o) {
        var on = o === item && willOpen, b = $('button', o);
        b.setAttribute('aria-expanded', on);
        o.style.background = on ? '#15101F' : 'transparent';
        $('span', b).style.transform = on ? 'rotate(45deg)' : 'rotate(0deg)';
        b.parentNode.nextElementSibling.style.gridTemplateRows = on ? '1fr' : '0fr';
      });
    });
  });

  // ---------- Luna (agente de IA) ----------
  // O prompt da Luna fica só no servidor (api/luna.php).
  var luna = { msgs: [{ role: 'assistant', text: 'Oi! Eu sou a Luna, agente de IA da Soluna. Posso te contar preços, prazos ou já montar seu pedido de orçamento. Como posso ajudar?' }], busy: false };
  var logs = $$('[data-luna-log]');

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lunaWa() {
    var u = luna.msgs.filter(function (m) { return m.role === 'user'; }).map(function (m) { return m.text; }).join(' / ');
    return wa('Olá, Jefferson! Vim pela Luna no site. Resumo da conversa: ' + (u || 'quero um orçamento'));
  }
  var WA_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style="fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 21l1.9-5.4A8.5 8.5 0 1 1 21 11.5z"></path></svg>';
  var DOT = '<span style="width:7px;height:7px;border-radius:50%;background:#B7B0C2;animation:dot 1.2s VAR infinite;"></span>';
  function renderLuna() {
    var html = luna.msgs.map(function (m) {
      if (m.role === 'user') return '<div style="align-self:flex-end;max-width:82%;background:linear-gradient(90deg,#E8368F,#FF7A3D);padding:12px 16px;border-radius:18px 18px 6px 18px;font:500 15px/1.5 \'Plus Jakarta Sans\',sans-serif;color:#fff;animation:msgIn .4s cubic-bezier(.16,1,.3,1) both;">' + esc(m.text) + '</div>';
      return '<div style="align-self:flex-start;max-width:86%;display:flex;flex-direction:column;gap:8px;animation:msgIn .4s cubic-bezier(.16,1,.3,1) both;"><div style="background:#1E1730;border:1px solid rgba(255,255,255,.06);padding:12px 16px;border-radius:18px 18px 18px 6px;font:400 15px/1.55 \'Plus Jakarta Sans\',sans-serif;color:#F5F3F7;">' + esc(m.text) + '</div>' +
        (m.cta ? '<a href="' + esc(lunaWa()) + '" target="_blank" rel="noopener" style="align-self:flex-start;height:44px;padding:0 16px;border-radius:12px;display:inline-flex;align-items:center;gap:8px;background:#25D366;color:#06210F;font:700 14px/1 \'Plus Jakarta Sans\',sans-serif;">' + WA_ICON + 'Continuar no WhatsApp</a>' : '') + '</div>';
    }).join('');
    if (luna.busy) html += '<div aria-label="Luna está digitando" style="align-self:flex-start;display:flex;gap:5px;padding:14px 16px;border-radius:18px 18px 18px 6px;background:#1E1730;">' + DOT.replace('VAR', '0s') + DOT.replace('VAR', '.15s') + DOT.replace('VAR', '.3s') + '</div>';
    logs.forEach(function (l) { l.innerHTML = html; l.scrollTop = l.scrollHeight; });
  }
  function fallback(t) {
    var s = t.toLowerCase();
    if (/orçamento|orcamento|quero|contratar|falar/.test(s)) return 'Perfeito! Me conta rapidinho: qual é o seu negócio e o que você precisa? Se preferir, já te passo para o WhatsApp do Jefferson com o resumo desta conversa. [WHATSAPP]';
    if (/agente|ia\b|whats|robô|robo|atendimento/.test(s)) return 'O agente de IA atende seus clientes no WhatsApp 24h, tira dúvidas, qualifica e agenda sozinho. A implantação começa em R$ 1.500 e a mensalidade em R$ 399. Quer ver como ficaria no seu negócio?';
    if (/prazo|tempo|demora|dias/.test(s)) return 'Sites ficam prontos em 15 a 20 dias; lojas virtuais e sites dinâmicos, em 25 a 40 dias. Um agente de IA leva de 7 a 15 dias.';
    if (/preço|preco|custa|valor|site/.test(s)) return 'Os sites começam em R$ 1.200, com design exclusivo, SEO e WhatsApp integrado. O valor final depende das páginas e funções, e o orçamento é gratuito. Quer que eu monte o seu?';
    return 'Posso te ajudar com preços, prazos e com o agente de IA para WhatsApp. Se quiser, já monto seu pedido de orçamento gratuito.';
  }
  function sendLuna(text) {
    text = (text || '').trim();
    if (!text || luna.busy) return;
    luna.msgs.push({ role: 'user', text: text });
    luna.busy = true; renderLuna();
    $$('[data-luna-input]').forEach(function (i) { i.value = ''; });
    var history = luna.msgs.slice(1).map(function (m) { return { role: m.role, content: m.text }; });
    while (history.length > 19 || (history.length && history[0].role !== 'user')) history.shift();
    var ask = CONFIG.lunaEndpoint
      ? fetch(CONFIG.lunaEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history }) })
          .then(function (r) { return r.ok ? r.json() : {}; }).then(function (d) { return d.reply || ''; }).catch(function () { return ''; })
      : new Promise(function (res) { setTimeout(function () { res(''); }, 900); });
    ask.then(function (reply) {
      if (!reply) reply = fallback(text);
      var hasCta = /\[WHATSAPP\]/.test(reply);
      luna.msgs.push({ role: 'assistant', text: reply.replace(/\[WHATSAPP\]/g, '').trim(), cta: hasCta });
      luna.busy = false; renderLuna();
    });
  }
  $$('[data-luna-form]').forEach(function (f) {
    f.addEventListener('submit', function (e) { e.preventDefault(); sendLuna($('[data-luna-input]', f).value); });
  });
  $$('[data-sugg]').forEach(function (b) { b.addEventListener('click', function () { sendLuna(b.textContent); }); });
  renderLuna();

  var panel = $('#luna-panel'), launcher = $('#luna-launcher'), preview = $('#luna-preview');
  var previewClosed = false, lastFocus = null;
  function setLuna(open) {
    panel.hidden = !open; panel.style.display = open ? 'flex' : '';
    launcher.hidden = open;
    if (open) { preview.hidden = true; lastFocus = document.activeElement; renderLuna(); $('[data-luna-input]', panel).focus(); }
    else if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    if (isMob()) document.body.style.overflow = open ? 'hidden' : '';
  }
  $$('[data-luna-open]').forEach(function (b) { b.addEventListener('click', function () { setLuna(true); }); });
  $('#luna-close').addEventListener('click', function () { setLuna(false); });
  preview.addEventListener('click', function () { setLuna(true); });
  preview.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLuna(true); } });
  $('#luna-preview-close').addEventListener('click', function (e) { e.stopPropagation(); preview.hidden = true; previewClosed = true; });
  setTimeout(function () { if (panel.hidden && !previewClosed) preview.hidden = false; }, CONFIG.lunaPreviewSeconds * 1000);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!panel.hidden) setLuna(false);
    else if (state.drawer) setDrawer(false);
  });

  // ---------- Formulário de orçamento ----------
  var form = $('#lead-form'), sent = $('#lead-sent'), err = $('#lead-error');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.hidden = true;
    var d = { nome: form.nome.value.trim(), whatsapp: form.whatsapp.value.trim(), tipo: form.tipo.value, mensagem: form.mensagem.value.trim() };
    if (d.whatsapp.replace(/\D/g, '').length < 10) { err.textContent = 'Informe um WhatsApp com DDD, por exemplo (11) 90000-0000.'; err.hidden = false; form.whatsapp.focus(); return; }
    var done = function (viaWa) {
      form.hidden = true; sent.hidden = false; sent.style.display = 'flex';
      if (viaWa) {
        $('#lead-sent-title').textContent = 'Seu pedido está pronto.';
        $('#lead-sent-text').textContent = 'Abrimos o WhatsApp com a mensagem preenchida. É só tocar em enviar que eu respondo em até 24 horas.';
      }
      $('#lead-sent-title').focus();
    };
    if (CONFIG.formEndpoint) {
      fetch(CONFIG.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(d) })
        .then(function (r) { if (!r.ok) throw new Error(); done(false); })
        .catch(function () { err.textContent = 'Não foi possível enviar agora. Tente pelo WhatsApp: (11) 92457-4553.'; err.hidden = false; });
    } else {
      window.open(wa('Olá, Jefferson! Vim pelo site.\nNome: ' + d.nome + '\nWhatsApp: ' + d.whatsapp + '\nProjeto: ' + d.tipo + (d.mensagem ? '\nMensagem: ' + d.mensagem : '')), '_blank', 'noopener');
      done(true);
    }
  });
  $('#lead-reset').addEventListener('click', function () {
    form.reset(); sent.hidden = true; sent.style.display = ''; form.hidden = false;
    $('#lead-sent-title').textContent = 'Recebi seu pedido.';
    $('#lead-sent-text').textContent = 'Respondo em até 24 horas pelo WhatsApp que você informou.';
    form.nome.focus();
  });

  // ---------- Início ----------
  renderPhone(); renderSteps(); renderProc(0); renderPortCount();
  setupReveal();
  document.documentElement.classList.remove('js-pending');
  measurePort(); onScroll();
  window.addEventListener('load', function () { measurePort(); onScroll(); });
})();
