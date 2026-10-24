(function () {
  'use strict';
  var page = 'home', previousFocus, modal = false;
  var duration = 300, remaining = 300, deadline = 0, running = false, finished = false;
  var $ = function (id) { return document.getElementById(id); };
  function pad(value) { return ('0' + value).slice(-2); }
  function timerText(seconds) { return pad(Math.floor(seconds / 60)) + ':' + pad(seconds % 60); }
  function buttons() {
    return Array.prototype.filter.call(document.querySelectorAll(modal ? '#exit-dialog button' : '#' + page + ' button'), function (b) { return !b.disabled && b.offsetWidth > 0; });
  }
  function show(name) {
    if (name !== 'home') previousFocus = document.activeElement;
    $(page).hidden = true; page = name; $(page).hidden = false;
    if (name === 'home' && previousFocus && previousFocus.offsetWidth) previousFocus.focus();
    else buttons()[0].focus();
  }
  function closeDialog() { modal = false; $('exit-dialog').hidden = true; if (previousFocus) previousFocus.focus(); }
  function back() {
    if (modal) { closeDialog(); return; }
    if (page !== 'home') { show('home'); return; }
    previousFocus = document.activeElement; modal = true;
    $('exit-message').textContent = ''; $('exit-dialog').hidden = false; $('stay').focus();
  }
  // Geometric focus navigation also works when controls occupy multiple rows.
  function navigate(code) {
    var list = buttons(), active = document.activeElement;
    if (list.indexOf(active) < 0) { list[0].focus(); return; }
    var a = active.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    var best = null, score = Infinity;
    list.forEach(function (button) {
      if (button === active) return;
      var r = button.getBoundingClientRect(), dx = r.left + r.width / 2 - ax, dy = r.top + r.height / 2 - ay;
      var along = code === 37 ? -dx : code === 39 ? dx : code === 38 ? -dy : dy;
      var across = code === 37 || code === 39 ? Math.abs(dy) : Math.abs(dx);
      if (along > 5 && along + across * 3 < score) { score = along + across * 3; best = button; }
    });
    if (best) best.focus();
  }
  function input(key) {
    var keys = { left: 37, up: 38, right: 39, down: 40 };
    if (typeof key !== 'string') return false;
    if (Object.prototype.hasOwnProperty.call(keys, key)) navigate(keys[key]);
    else if (key === 'back') back();
    else if (key === 'ok') { if (buttons().indexOf(document.activeElement) >= 0) document.activeElement.click(); }
    else return false;
    return true;
  }
  document.addEventListener('keydown', function (event) {
    var keys = { 37: 'left', 38: 'up', 39: 'right', 40: 'down', 10009: 'back', 27: 'back', 8: 'back', 13: 'ok' };
    if (keys[event.keyCode]) {
      event.preventDefault();
      if (!(event.keyCode === 13 && event.repeat)) input(keys[event.keyCode]);
    }
  });
  function theme(name, save) {
    if (['dune', 'forest', 'night'].indexOf(name) < 0) name = 'dune';
    document.body.className = name;
    Array.prototype.forEach.call(document.querySelectorAll('[data-theme]'), function (button) { button.setAttribute('aria-pressed', String(button.getAttribute('data-theme') === name)); });
    if (save) {
      try { localStorage.setItem('salon-theme', name); $('save-state').textContent = 'Votre choix est enregistré sur cet appareil.'; }
      catch (e) { $('save-state').textContent = 'Ambiance appliquée pour cette session. Enregistrement indisponible.'; }
    }
  }
  function updateTimer() {
    if (running) {
      remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      if (remaining === 0) { running = false; finished = true; }
    }
    $('countdown').textContent = timerText(remaining);
    $('toggle-timer').textContent = running ? 'Pause' : finished ? 'Recommencer' : remaining < duration ? 'Reprendre' : 'Démarrer';
    $('timer-state').textContent = finished ? 'Le temps est écoulé.' : running ? 'Votre pause est en cours.' : remaining < duration ? 'Minuteur en pause.' : 'Choisissez une durée.';
    $('timer-badge').textContent = finished ? 'MINUTEUR TERMINÉ' : running ? 'PAUSE · ' + timerText(remaining) : 'FAIT POUR LE SALON';
  }
  document.addEventListener('click', function (event) {
    var button = event.target.closest('button'); if (!button) return;
    if (button.hasAttribute('data-open')) show(button.getAttribute('data-open'));
    else if (button.hasAttribute('data-home')) show('home');
    else if (button.hasAttribute('data-theme')) theme(button.getAttribute('data-theme'), true);
    else if (button.hasAttribute('data-minutes')) {
      duration = Number(button.getAttribute('data-minutes')) * 60; remaining = duration; running = false; finished = false;
      Array.prototype.forEach.call(document.querySelectorAll('[data-minutes]'), function (b) { b.setAttribute('aria-pressed', String(b === button)); });
      updateTimer();
    }
  });
  $('toggle-timer').onclick = function () {
    updateTimer();
    if (running) running = false;
    else { if (remaining === 0) remaining = duration; finished = false; deadline = Date.now() + remaining * 1000; running = true; }
    updateTimer();
  };
  $('reset-timer').onclick = function () { running = false; finished = false; remaining = duration; updateTimer(); };
  $('stay').onclick = closeDialog;
  $('quit').onclick = function () {
    try {
      if (window.SalonTV.onExit) { window.SalonTV.onExit(); return; }
      if (window.tizen && tizen.application) { tizen.application.getCurrentApplication().exit(); return; }
      $('exit-message').textContent = 'Aperçu navigateur : vous pouvez fermer cet onglet.';
    } catch (e) { $('exit-message').textContent = 'Impossible de quitter. Maintenez Retour sur la télécommande.'; }
  };
  function tick() {
    var now = new Date(), time = pad(now.getHours()) + ':' + pad(now.getMinutes());
    var days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    var months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    var date = days[now.getDay()] + ' ' + now.getDate() + ' ' + months[now.getMonth()];
    $('mini-clock').textContent = time; $('large-clock').textContent = time;
    $('date').textContent = date; $('clock-date').textContent = date;
    $('greeting').textContent = now.getHours() >= 18 || now.getHours() < 5 ? 'Une soirée à la maison.' : 'Bienvenue chez vous.';
    updateTimer();
  }
  try { theme(localStorage.getItem('salon-theme'), false); } catch (e) { theme('dune', false); }
  // Both platforms use the same actions and UI; Cast only transports the keys.
  window.SalonTV = {
    input: input,
    onExit: null,
    getState: function () {
      return { page: page, modal: modal, theme: document.body.className, remaining: remaining, running: running, finished: finished,
        focus: document.activeElement ? document.activeElement.textContent.replace(/\s+/g, ' ').trim() : '' };
    }
  };
  document.addEventListener('visibilitychange', tick);
  tick(); setInterval(tick, 1000); buttons()[0].focus();
}());
