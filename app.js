/* Arasaka Security Terminal. Everything stays on this device. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const root = document.documentElement;
  const stage = $('wallpaper');
  const storageKey = `arasaka.wallpaper.v1${document.body.dataset.defaultPreset ? '.second-screen' : ''}`;
  const collection = window.WallpaperCollection;
  const themes = collection.signals;
  const defaults = { preset: document.body.dataset.defaultPreset || 'classic', theme: 'crimson', layout: 'terminal', scale: 100, glow: 45, scanlines: true, parallax: true, ambient: true, telemetry: true, powerSaver: false, clockFormat: '24', timezone: 'local', operator: '' };
  const zones = ['local', 'Asia/Tokyo', 'America/New_York', 'Europe/London', 'UTC'];
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  let settings = { ...defaults };
  let paused = false;
  let hostPaused = false;
  let diagnosticTimer;
  let toastTimer;
  let lastFocus;
  let lastClock;
  let hostContext = {};
  let lockImageData = '';
  let lockImageName = '';
  let lockCameFromSettings = false;
  let lockReturnFocus;
  let isNative = !!window.webkit?.messageHandlers?.arasaka;
  if (!isNative) try { settings = normalize({ ...defaults, ...JSON.parse(localStorage.getItem(storageKey) || '{}') }); } catch { /* Private/file browsing may have no storage. */ }

  function normalize(value) {
    const next = { ...defaults };
    next.preset = Object.hasOwn(collection.presets, value.preset) ? value.preset : defaults.preset;
    next.theme = value.theme === 'auto' ? collection.presets[next.preset].theme : Object.hasOwn(themes, value.theme) ? value.theme : defaults.theme;
    next.layout = value.layout === 'emblem' ? 'emblem' : 'terminal';
    next.scale = Number.isFinite(Number(value.scale)) ? Math.max(70, Math.min(140, Number(value.scale))) : defaults.scale;
    next.glow = Number.isFinite(Number(value.glow)) ? Math.max(0, Math.min(100, Number(value.glow))) : defaults.glow;
    for (const key of ['scanlines', 'parallax', 'ambient', 'telemetry', 'powerSaver']) next[key] = typeof value[key] === 'boolean' ? value[key] : defaults[key];
    next.clockFormat = String(value.clockFormat) === '12' ? '12' : '24';
    next.timezone = zones.includes(value.timezone) ? value.timezone : 'local';
    next.operator = typeof value.operator === 'string' ? value.operator.replace(/[^\p{L}\p{N}_ -]/gu, '').slice(0, 20).trim().toUpperCase() : '';
    return next;
  }

  function persist() {
    if (isNative) { window.webkit.messageHandlers.arasaka.postMessage({ action: 'settings', settings }); return; }
    try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch { /* Wallpaper hosts can disable persistent browser storage. */ }
  }

  function applySettings(patch, options = {}) {
    settings = normalize({ ...settings, ...patch });
    const profile = collection.presets[settings.preset];
    stage.dataset.preset = settings.preset;
    document.title = `${profile.name} — Live Wallpaper`;
    document.querySelectorAll('[data-preset]').forEach(button => {
      if (!button.matches('button')) return;
      const selected = button.dataset.preset === settings.preset;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    document.querySelectorAll('.brand-emblem-use').forEach(use => use.setAttribute('href', `#${profile.symbol}`));
    $('top-brand-name').textContent = profile.brand;
    $('top-network').textContent = settings.preset === 'editor' ? 'DEVELOPMENT WORKSPACE' : settings.preset === 'mantis' ? 'RESEARCH & DEVELOPMENT' : settings.preset === 'militech' ? 'TACTICAL NETWORK' : settings.preset === 'kangtao' ? 'SMART SYSTEMS' : 'CORPORATE NETWORK';
    $('brand-wordmark').textContent = $('bottom-wordmark').textContent = profile.wordmark;
    $('brand-caption').textContent = profile.caption;
    $('bottom-caption').textContent = profile.sub;
    $('bottom-caption').lang = settings.preset === 'kangtao' ? 'zh' : settings.preset === 'militech' ? 'en' : 'ja';
    $('network-id').textContent = profile.network;
    document.querySelector('.security-label').textContent = profile.label;
    document.querySelector('.edge-rail span').textContent = `${profile.system} / V.3.14.080 — AUTHORIZED PERSONNEL ONLY`;
    document.querySelector('.telemetry-line>span:nth-child(2)').textContent = settings.preset === 'mantis' ? 'TECHNICAL SCHEMATIC' : 'SECURITY TERMINAL';
    document.querySelector('.telemetry-sub').firstChild.textContent = `${profile.region} `;
    $('edition-ghost').textContent = profile.ghost;
    $('edition-stamp').textContent = profile.stamp;
    $('preset-description').textContent = profile.description;
    root.style.setProperty('--accent', themes[settings.theme][0]);
    root.style.setProperty('--rgb', themes[settings.theme][1]);
    root.style.setProperty('--scale', settings.scale / 100);
    root.style.setProperty('--glow', settings.glow / 100);
    stage.classList.toggle('emblem-layout', settings.layout === 'emblem');
    stage.classList.toggle('no-scanlines', !settings.scanlines);
    stage.classList.toggle('no-ambient', !settings.ambient);
    stage.classList.toggle('no-telemetry', !settings.telemetry);
    document.querySelectorAll('[data-theme]').forEach(button => {
      const selected = button.dataset.theme === settings.theme;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    for (const key of ['layout', 'scale', 'glow', 'clockFormat', 'timezone']) $(key).value = settings[key];
    for (const key of ['scanlines', 'parallax', 'ambient', 'telemetry', 'powerSaver']) $(key).checked = settings[key];
    $('scale-value').textContent = `${settings.scale}%`;
    $('glow-value').textContent = `${settings.glow}%`;
    if (document.activeElement !== $('uid')) $('uid').value = settings.operator;
    stage.classList.toggle('authenticated', !!settings.operator);
    $('operator-status').textContent = settings.operator ? 'AUTHORIZED' : 'AWAITING AUTH';
    $('port-status').textContent = settings.operator ? 'SECURE' : 'OPEN';
    if (!stage.classList.contains('diagnosing')) $('message').textContent = settings.operator ? `WELCOME, ${settings.operator} / CONNECTION ESTABLISHED` : 'ENTER YOUR OPERATOR ID TO CONNECT';
    syncMotion();
    updateClock();
    if (options.persist !== false) persist();
  }

  function updateClock() {
    const now = new Date();
    const timeZone = settings.timezone === 'local' ? undefined : settings.timezone;
    const format = new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: settings.clockFormat === '12' ? 'h12' : 'h23' });
    const parts = Object.fromEntries(format.formatToParts(now).map(p => [p.type, p.value]));
    const value = `${parts.hour.padStart(2, '0')}:${parts.minute}:${parts.second}`;
    $('clock').replaceChildren(document.createTextNode(value));
    if (parts.dayPeriod) {
      const period = document.createElement('span');
      period.className = 'clock-period';
      period.textContent = parts.dayPeriod;
      $('clock').append(period);
    }
    $('clock').dateTime = now.toISOString();
    const date = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(now).map(p => [p.type, p.value]));
    const day = settings.preset === 'kangtao' ? { Sun:'星期日',Mon:'星期一',Tue:'星期二',Wed:'星期三',Thu:'星期四',Fri:'星期五',Sat:'星期六' }[date.weekday] : settings.preset === 'militech' ? date.weekday.toUpperCase() : { Sun: '日曜日', Mon: '月曜日', Tue: '火曜日', Wed: '水曜日', Thu: '木曜日', Fri: '金曜日', Sat: '土曜日' }[date.weekday];
    $('date').textContent = `${date.year} | ${date.month} | ${date.day} / ${day}`;
    lastClock = { value, period: parts.dayPeriod || '', date: $('date').textContent };
    $('blueprint-clock').textContent = `${value}${parts.dayPeriod ? ` ${parts.dayPeriod}` : ''}`;
    $('source-clock').textContent = `${value}${parts.dayPeriod ? ` ${parts.dayPeriod}` : ''}`;
  }

  function notify(text) {
    clearTimeout(toastTimer);
    $('toast').textContent = text;
    $('toast').classList.add('show');
    toastTimer = setTimeout(() => $('toast').classList.remove('show'), 4300);
  }

  function setClean(clean) {
    stage.classList.toggle('clean', clean);
    if (clean) {
      stage.classList.remove('just-cleaned');
      void stage.offsetWidth;
      stage.classList.add('just-cleaned');
      if (stage.contains(document.activeElement)) document.activeElement.blur();
    }
  }

  function openSettings() {
    if ($('setup-dialog').open) $('setup-dialog').close();
    lastFocus = document.activeElement;
    $('settings').hidden = false;
    $('drawer-backdrop').hidden = false;
    $('settings-button').setAttribute('aria-expanded', 'true');
    $('close-settings').focus();
  }
  function closeSettings() {
    $('settings').hidden = true;
    $('drawer-backdrop').hidden = true;
    $('settings-button').setAttribute('aria-expanded', 'false');
    if (lastFocus && !stage.classList.contains('clean')) lastFocus.focus();
  }

  function runDiagnostics(operator) {
    if (stage.classList.contains('diagnosing')) return;
    stage.classList.add('diagnosing');
    $('message').textContent = 'ESTABLISHING ENCRYPTED LOCAL SESSION...';
    $('port-status').textContent = 'LINKING';
    $('login-form').setAttribute('aria-busy', 'true');
    diagnosticTimer = setTimeout(() => {
      stage.classList.remove('diagnosing');
      $('login-form').removeAttribute('aria-busy');
      if (operator) applySettings({ operator });
      else {
        $('port-status').textContent = settings.operator ? 'SECURE' : 'OPEN';
        $('message').textContent = 'LOCAL DIAGNOSTICS COMPLETE / ALL SYSTEMS NOMINAL';
      }
    }, motionPreference.matches ? 250 : 1600);
  }

  $('login-form').addEventListener('submit', event => {
    event.preventDefault();
    const operator = normalize({ operator: $('uid').value }).operator;
    if (!operator) { $('message').textContent = 'OPERATOR ID REQUIRED / ENTER UP TO 20 CHARACTERS'; $('uid').focus(); return; }
    $('uid').value = operator;
    $('uid').blur();
    runDiagnostics(operator);
  });
  $('emblem-button').addEventListener('click', () => runDiagnostics());
  $('settings-button').addEventListener('click', openSettings);
  $('restore-button').addEventListener('click', () => { setClean(false); openSettings(); });
  $('close-settings').addEventListener('click', closeSettings);
  $('drawer-backdrop').addEventListener('click', closeSettings);
  $('clean-button').addEventListener('click', () => setClean(true));
  $('setup-button').addEventListener('click', () => $('setup-dialog').showModal());
  $('close-setup').addEventListener('click', () => $('setup-dialog').close());
  $('setup-dialog').addEventListener('click', event => { if (event.target === $('setup-dialog')) { const r = $('setup-dialog').getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) $('setup-dialog').close(); } });
  document.querySelectorAll('[data-theme]').forEach(button => button.addEventListener('click', () => applySettings({ theme: button.dataset.theme })));
  document.querySelectorAll('button[data-preset]').forEach(button => button.addEventListener('click', () => applySettings({ preset: button.dataset.preset, theme: collection.presets[button.dataset.preset].theme })));
  const blueprintParts = { edge: '01 / MONOMOLECULAR EDGE — EXTENDED BLADE ASSEMBLY / 740 mm', actuator: '02 / NEURAL ACTUATOR — ARTICULATED CYBERWARE DRIVE ASSEMBLY', link: '03 / WRIST ASSEMBLY — ROTARY COLLAR & NEURAL INTERFACE' };
  document.querySelectorAll('[data-part]').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('[data-part]').forEach(point => point.classList.toggle('selected', point === button)); $('blueprint-detail').textContent = blueprintParts[button.dataset.part]; }));
  for (const key of ['layout', 'clockFormat', 'timezone']) $(key).addEventListener('change', event => applySettings({ [key]: event.target.value }));
  for (const key of ['scale', 'glow']) $(key).addEventListener('input', event => applySettings({ [key]: Number(event.target.value) }));
  for (const key of ['scanlines', 'parallax', 'ambient', 'telemetry', 'powerSaver']) $(key).addEventListener('change', event => applySettings({ [key]: event.target.checked }));
  $('reset-button').addEventListener('click', () => { clearTimeout(diagnosticTimer); stage.classList.remove('diagnosing'); $('login-form').removeAttribute('aria-busy'); $('uid').value = ''; applySettings(defaults); notify('Default terminal configuration restored.'); });

  function togglePause() {
    paused = !paused;
    $('pause-button').setAttribute('aria-pressed', String(paused));
    const label = paused ? 'Resume motion' : 'Pause motion';
    $('pause-button').setAttribute('aria-label', label);
    $('pause-button').title = `${label} (Space)`;
    $('pause-button').querySelector('use').setAttribute('href', paused ? '#i-play' : '#i-pause');
    syncMotion();
    notify(paused ? 'Ambient motion paused. Your clock stays live.' : 'Ambient motion resumed.');
  }
  async function toggleFullscreen() {
    if (isNative) { window.webkit.messageHandlers.arasaka.postMessage({ action: 'fullscreen' }); return; }
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else if (document.documentElement.webkitRequestFullscreen) document.documentElement.webkitRequestFullscreen();
      else notify('Use your browser’s fullscreen command to fill the screen.');
    } catch { notify('Use your browser’s fullscreen command to fill the screen.'); }
  }
  $('pause-button').addEventListener('click', togglePause);
  $('fullscreen-button').addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', () => $('fullscreen-button').setAttribute('aria-label', document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen'));
  document.addEventListener('keydown', event => {
    if (!$('lock-dialog').hidden) {
      if (event.key === 'Escape') { event.preventDefault(); closeLockPreview(); }
      if (event.key === 'Tab') {
        const elements = [...$('lock-dialog').querySelectorAll('button,a[href]')].filter(el => !el.disabled && el.getClientRects().length);
        const index = elements.indexOf(document.activeElement);
        const next = event.shiftKey ? (index <= 0 ? elements.length - 1 : index - 1) : (index + 1) % elements.length;
        event.preventDefault(); elements[next]?.focus();
      }
      return;
    }
    if (!$('settings').hidden && event.key === 'Tab') {
      const elements = [...$('settings').querySelectorAll('button,select,input,a[href]')].filter(el => !el.disabled && el.getClientRects().length);
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    if (event.key === 'Escape') { if (!$('settings').hidden) closeSettings(); else if (!$('setup-dialog').open) setClean(false); return; }
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName) || event.ctrlKey || event.metaKey || event.altKey || $('setup-dialog').open) return;
    if (event.key.toLowerCase() === 's') { event.preventDefault(); $('settings').hidden ? openSettings() : closeSettings(); }
    if (event.key.toLowerCase() === 'h') { event.preventDefault(); setClean(!stage.classList.contains('clean')); }
    if (event.key.toLowerCase() === 'f') { event.preventDefault(); toggleFullscreen(); }
    if (event.code === 'Space' && event.target.tagName !== 'BUTTON') { event.preventDefault(); togglePause(); }
  });
  window.addEventListener('storage', event => { if (!isNative && event.key === storageKey && event.newValue) { try { applySettings(JSON.parse(event.newValue), { persist: false }); } catch { /* Ignore invalid settings from another tab. */ } } });

  // Only animate while visible and active. No WebGL, video, or network polling.
  const canvas = $('particles');
  const context = canvas.getContext('2d');
  let width = innerWidth, height = innerHeight, frame = 0, lastFrame = 0;
  let pointer = { x: 0, y: 0 }, position = { x: 0, y: 0 };
  let motes = [];
  const motionOff = () => paused || hostPaused || settings.powerSaver || motionPreference.matches || document.hidden;
  function resize() {
    width = innerWidth; height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    context?.setTransform(dpr, 0, 0, dpr, 0, 0);
    motes = Array.from({ length: Math.min(38, Math.round(width * height / 45000)) }, () => ({ x: Math.random() * width, y: Math.random() * height, v: .06 + Math.random() * .17, a: .08 + Math.random() * .2, size: Math.random() > .8 ? 2 : 1 }));
    drawParticles(0);
  }
  function drawParticles(delta) {
    if (!context) return;
    context.clearRect(0, 0, width, height);
    const color = themes[settings.theme][1];
    for (const mote of motes) {
      mote.y -= mote.v * delta;
      if (mote.y < -4) { mote.y = height + 4; mote.x = Math.random() * width; }
      context.fillStyle = `rgba(${color},${mote.a})`;
      context.fillRect(mote.x, mote.y, mote.size, mote.size * 2);
    }
  }
  function animate(time) {
    frame = 0;
    if (motionOff()) return;
    if (time - lastFrame >= 32) {
      const delta = Math.min((time - lastFrame) / 16.67, 3);
      lastFrame = time;
      if (settings.ambient) drawParticles(delta);
      const target = settings.parallax ? pointer : { x: 0, y: 0 };
      position.x += (target.x - position.x) * .07;
      position.y += (target.y - position.y) * .07;
      root.style.setProperty('--mx', `${position.x.toFixed(2)}px`);
      root.style.setProperty('--my', `${position.y.toFixed(2)}px`);
    }
    if (settings.ambient || settings.parallax) frame = requestAnimationFrame(animate);
  }
  function syncMotion() {
    stage.classList.toggle('paused', paused || hostPaused || document.hidden);
    stage.classList.toggle('still', settings.powerSaver || motionPreference.matches);
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (!settings.parallax || motionOff()) { root.style.setProperty('--mx', '0px'); root.style.setProperty('--my', '0px'); position = { x: 0, y: 0 }; }
    if (!motionOff() && (settings.ambient || settings.parallax)) { lastFrame = performance.now(); frame = requestAnimationFrame(animate); }
    else drawParticles(0);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', event => { pointer = { x: (event.clientX / width - .5) * 13, y: (event.clientY / height - .5) * 10 }; }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer = { x: 0, y: 0 }; });
  document.addEventListener('visibilitychange', () => { syncMotion(); if (!document.hidden) updateClock(); });
  motionPreference.addEventListener('change', syncMotion);

  async function exportWallpaper() {
    const button = $('export-button');
    button.disabled = true;
    try {
      updateClock();
      const exportWidth = isNative && hostContext.width ? hostContext.width : width;
      const exportHeight = isNative && hostContext.height ? hostContext.height : height;
      const factor = 3840 / Math.max(exportWidth, exportHeight);
      const output = await collection.render(settings, { width: Math.round(exportWidth * factor), height: Math.round(exportHeight * factor), cssWidth: isNative ? (exportWidth >= exportHeight ? 1440 : 810) : width, clock: lastClock });
      const data = output.toDataURL('image/png');
      const filename = `${collection.presets[settings.preset].brand}-${settings.preset}-${output.width}x${output.height}.png`;
      if (isNative) window.webkit.messageHandlers.arasaka.postMessage({ action: 'export', data, filename });
      else {
        $('export-result').href = data; $('export-result').download = filename; $('export-result').hidden = false;
        const link = document.createElement('a'); link.href = data; link.download = filename; document.body.append(link); link.click(); link.remove();
        notify(`Wallpaper exported at ${output.width} × ${output.height}.`);
      }
    } catch (error) { console.error('Wallpaper export failed', error); notify('Export could not finish. Try opening the wallpaper in your browser.'); }
    finally { button.disabled = false; }
  }
  $('export-button').addEventListener('click', exportWallpaper);

  async function openLockPreview() {
    const button = $('lock-preview-button');
    if (button.disabled || !$('lock-dialog').hidden) return;
    button.disabled = true;
    try {
      const displayWidth = hostContext.width || screen.width || 1440;
      const displayHeight = hostContext.height || screen.height || 900;
      const factor = 3840 / Math.max(displayWidth, displayHeight);
      const output = await collection.render(settings, { width: Math.round(displayWidth * factor), height: Math.round(displayHeight * factor), lock: true });
      lockImageData = output.toDataURL('image/png');
      lockImageName = `${collection.presets[settings.preset].brand}-${settings.preset}-Lock-${output.width}x${output.height}.png`;
      $('lock-preview-image').src = lockImageData;
      $('lock-download').href = lockImageData; $('lock-download').download = lockImageName;
      $('lock-result').textContent = '';
      $('apply-lock-button').hidden = !isNative;
      $('lock-explanation').textContent = isNative
        ? 'macOS uses its system wallpaper for the lock-screen background. Applying this still also changes the underlying system desktop picture; your live desktop keeps running above it. The login / FileVault screen is managed separately by macOS.'
        : 'Save this still, then choose it in your system’s lock-screen settings. On Windows: Settings → Personalization → Lock screen → Picture. On macOS, use the companion app to apply it through the system wallpaper setting.';
      lockCameFromSettings = !$('settings').hidden;
      lockReturnFocus = document.activeElement;
      if (lockCameFromSettings) closeSettings();
      if ($('setup-dialog').open) $('setup-dialog').close();
      $('lock-dialog').hidden = false;
      $('lock-backdrop').hidden = false;
      $('close-lock').focus();
    } catch (error) { console.error('Lock-screen render failed', error); notify('The lock-screen image could not be prepared. Please try again.'); }
    finally { button.disabled = false; }
  }
  $('lock-preview-button').addEventListener('click', openLockPreview);
  function closeLockPreview() {
    $('lock-dialog').hidden = true; $('lock-backdrop').hidden = true;
    const reopen = lockCameFromSettings; lockCameFromSettings = false;
    if (reopen) { openSettings(); lastFocus = $('settings-button'); if (lockReturnFocus?.isConnected) lockReturnFocus.focus(); }
    else if (lockReturnFocus?.isConnected) lockReturnFocus.focus();
  }
  $('close-lock').addEventListener('click', closeLockPreview);
  $('lock-backdrop').addEventListener('click', closeLockPreview);
  $('lock-download').addEventListener('click', event => {
    if (!isNative) return;
    event.preventDefault();
    window.webkit.messageHandlers.arasaka.postMessage({ action: 'export', data: lockImageData, filename: lockImageName });
  });
  $('apply-lock-button').addEventListener('click', () => {
    if (!isNative || !lockImageData) return;
    window.webkit.messageHandlers.arasaka.postMessage({ action: 'setLockScreen', data: lockImageData, preset: settings.preset });
  });
  $('restore-system-button').addEventListener('click', () => {
    if (isNative) window.webkit.messageHandlers.arasaka.postMessage({ action: 'restoreSystemWallpaper' });
  });

  // Host adapters: only documented, explicitly provided wallpaper properties.
  window.wallpaperPropertyListener = {
    applyUserProperties(properties) {
      const patch = {};
      for (const key of Object.keys(defaults)) if (properties[key] && Object.hasOwn(properties[key], 'value')) patch[key] = properties[key].value;
      if (properties.preset && !properties.theme && collection.presets[patch.preset]) patch.theme = collection.presets[patch.preset].theme;
      if (properties.clean) setClean(!!properties.clean.value);
      applySettings(patch);
    },
    setPaused(value) { hostPaused = !!value; syncMotion(); }
  };
  window.livelyPropertyListener = (name, value) => {
    if (name === 'clean') { setClean(!!value); return; }
    if (name === 'theme' && typeof value === 'number') value = ['auto', 'crimson', 'ice', 'amber', 'gold', 'orange'][value];
    if (name === 'preset' && typeof value === 'number') value = ['classic', 'ceramic', 'militech', 'kangtao', 'mantis', 'editor'][value];
    if (name === 'preset' && collection.presets[value]) { applySettings({ preset: value, theme: collection.presets[value].theme }); return; }
    if (name === 'layout' && typeof value === 'number') value = ['terminal', 'emblem'][value];
    if (Object.hasOwn(defaults, name)) applySettings({ [name]: value });
  };
  window.livelyWallpaperPlaybackChanged = data => {
    try { const info = typeof data === 'string' ? JSON.parse(data) : data; hostPaused = !!info.IsPaused; syncMotion(); } catch { /* Ignore host events from unsupported versions. */ }
  };
  window.Arasaka = {
    getSettings: () => ({ ...settings }),
    applySettings: patch => applySettings(patch, { persist: false }),
    loadSettings: value => { settings = normalize({ ...defaults, ...value }); applySettings(settings, { persist: false }); },
    setPaused: value => { hostPaused = !!value; syncMotion(); },
    setPointer: (x, y) => { if (Number.isFinite(x) && Number.isFinite(y)) pointer = { x: Math.max(-.5, Math.min(.5, x)) * 13, y: Math.max(-.5, Math.min(.5, y)) * 10 }; },
    openSettings, setClean, openLockPreview,
    setHostContext: value => {
      hostContext = value || {}; $('restore-system-button').hidden = !isNative || !hostContext.canRestore;
      const displays = hostContext.displays || [];
      $('native-display-controls').hidden = !isNative; $('browser-display-help').hidden = isNative;
      $('display-target').replaceChildren(); $('display-map').replaceChildren();
      if (isNative) {
        const all = document.createElement('option'); all.value = 'all'; all.textContent = 'All displays — same wallpaper'; $('display-target').append(all);
        displays.forEach((display,index) => { const option = document.createElement('option'); option.value = display.id; option.textContent = `${index+1} — ${display.name}${display.primary ? ' (Main)' : ''} · ${display.width}×${display.height}`; $('display-target').append(option); const chip = document.createElement('span'); chip.textContent = `${index+1} / ${display.primary ? 'MAIN' : 'SECONDARY'}`; chip.classList.toggle('selected',hostContext.target === display.id || hostContext.target === 'all'); $('display-map').append(chip); });
        $('display-target').value = hostContext.target || 'all'; $('pair-displays').disabled = displays.length < 2;
        $('display-help').textContent = hostContext.target === 'all' ? 'Changes here replace individual assignments on all displays.' : displays.length < 2 ? 'Changes apply to this display. Connect a second display to use the pairing.' : 'Changes apply only to this display. Pairing keeps your main wallpaper and assigns Source to the secondary screens.';
      }
    },
    lockResult: (text, canRestore) => { $('lock-result').textContent = text; hostContext.canRestore = !!canRestore; $('restore-system-button').hidden = !canRestore; notify(text); },
    notify,
    exportWallpaper
  };
  $('display-target').addEventListener('change', event => { if (isNative) window.webkit.messageHandlers.arasaka.postMessage({ action: 'selectDisplay', id: event.target.value }); });
  $('pair-displays').addEventListener('click', () => { if (isNative) window.webkit.messageHandlers.arasaka.postMessage({ action: 'pairDisplays' }); });
  window.SourceWallpaper.init();
  resize();
  applySettings(settings, { persist: false });
  const parameters = new URLSearchParams(location.search);
  if (collection.presets[parameters.get('preset')]) { const preset = parameters.get('preset'); applySettings({ preset, theme: collection.presets[preset].theme }, { persist: false }); }
  if (parameters.has('wallpaper') || parameters.has('clean')) setClean(true);
  if (parameters.has('configure')) openSettings();
  if (isNative) document.querySelectorAll('.setup-card a').forEach(link => { link.addEventListener('click', event => { event.preventDefault(); notify('You are already using the macOS app. Use its menu bar icon to manage displays.'); }); });
  if (document.body.dataset.package === 'web') document.querySelectorAll('.setup-card a').forEach(link => {
    link.textContent = link.href.includes('macOS') ? 'macOS app is in the original project ↗' : 'Your web wallpaper is already extracted ✓';
    link.removeAttribute('download');
    link.href = '#';
    link.addEventListener('click', event => { event.preventDefault(); notify('Import this folder’s index.html into your wallpaper host. The macOS app is supplied separately.'); });
  });
  if (document.body.dataset.package === 'web') $('second-package-link').hidden = true;
  setInterval(() => { if (!document.hidden) updateClock(); }, 1000);
})();
