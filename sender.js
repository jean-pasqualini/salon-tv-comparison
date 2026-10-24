(function () {
  'use strict';
  var namespace = 'urn:x-cast:fr.salon.remote', context, session, sequence = 0, pending = {}, sdkReady = false;
  var $ = function (id) { return document.getElementById(id); };
  function status(message) { $('status').textContent = message; }
  function send(message) {
    if (!session) return;
    message.sequence = ++sequence;
    var id = message.sequence;
    pending[id] = { start: Date.now(), timeout: setTimeout(function () {
      delete pending[id]; status('La Chromecast ne répond pas. Vérifiez la connexion et le récepteur enregistré.'); $('remote').disabled = true;
    }, 5000) };
    session.sendMessage(namespace, message).catch(function () {
      if (pending[id]) clearTimeout(pending[id].timeout);
      delete pending[id]; status('Commande non envoyée. Reconnectez la Chromecast.'); $('remote').disabled = true;
    });
  }
  function receive(channel, raw) {
    if (!session) return;
    var data; try { data = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { return; }
    if (!data || data.type !== 'state' || !data.state) return;
    var entry = pending[data.sequence];
    if (entry) { clearTimeout(entry.timeout); $('latency').textContent = 'Aller-retour des commandes : ' + (Date.now() - entry.start) + ' ms'; delete pending[data.sequence]; }
    $('remote').disabled = false;
    status('Connecté à ' + session.getCastDevice().friendlyName + '.');
    var names = { home: 'Accueil', clock: 'Horloge', timer: 'Minuteur', settings: 'Ambiance' };
    $('screen-state').textContent = (data.state.modal ? 'Confirmation de sortie' : names[data.state.page] || data.state.page) + ' · ' + data.state.focus;
  }
  function refreshSession() {
    if (session) session.removeMessageListener(namespace, receive);
    Object.keys(pending).forEach(function (id) { clearTimeout(pending[id].timeout); }); pending = {};
    session = context.getCurrentSession(); $('remote').disabled = true; $('disconnect').disabled = !session;
    if (session) { session.addMessageListener(namespace, receive); status('Connexion établie, attente de Salon…'); send({ type: 'sync' }); }
    else { status('Sélectionnez « SALON TV » pour lancer l’application.'); $('screen-state').textContent = 'Aucune session connectée.'; $('latency').textContent = 'Aller-retour des commandes : —'; }
  }
  function configure() {
    var id = $('app-id').value.trim().toUpperCase();
    if (!/^[A-F0-9]{8}$/.test(id)) { status('Saisissez les 8 caractères de l’identifiant Cast fourni par Google.'); return; }
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') { status('Ouvrez la télécommande via HTTPS ou localhost. Un fichier local ne permet pas ce test Cast.'); return; }
    if (!sdkReady) { status('SDK Google Cast indisponible. Utilisez Chrome sur ordinateur ou Android et vérifiez Internet.'); return; }
    if (session) { status('Arrêtez la session avant de changer d’application.'); return; }
    if (!context) {
      context = cast.framework.CastContext.getInstance();
      context.addEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, refreshSession);
    }
    try {
      context.setOptions({ receiverApplicationId: id, autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED });
      try { localStorage.setItem('salon-cast-app-id', id); } catch (e) {}
      $('connect').disabled = false; refreshSession();
    } catch (error) { status('Configuration Cast impossible : ' + error.message); }
  }
  window.__onGCastApiAvailable = function (available) { sdkReady = available; if ($('app-id').value) configure(); else if (!available) status('Google Cast indisponible dans ce navigateur.'); };
  $('setup').onsubmit = function (event) { event.preventDefault(); configure(); };
  $('connect').onclick = function () { context.requestSession().catch(function () { status('Connexion annulée ou impossible. Vérifiez le réseau local et l’enregistrement de « SALON TV ».'); }); };
  $('disconnect').onclick = function () { if (context) context.endCurrentSession(true); };
  $('remote').onclick = function (event) { var button = event.target.closest('[data-key]'); if (button && !$('remote').disabled) send({ type: 'key', key: button.getAttribute('data-key') }); };
  document.addEventListener('keydown', function (event) {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON' || $('remote').disabled) return;
    var keys = { 37: 'left', 38: 'up', 39: 'right', 40: 'down', 13: 'ok', 27: 'back' };
    if (keys[event.keyCode]) { event.preventDefault(); if (!(event.repeat && event.keyCode === 13)) send({ type: 'key', key: keys[event.keyCode] }); }
  });
  try { $('app-id').value = localStorage.getItem('salon-cast-app-id') || ''; } catch (e) {}
}());
