(function () {
  'use strict';
  var namespace = 'urn:x-cast:fr.salon.remote';
  function status(message) { document.getElementById('cast-status').textContent = message; }
  if (!window.cast || !cast.framework) { status('Récepteur Cast indisponible : ouvrez cette app depuis la télécommande Cast.'); return; }
  try {
    var context = cast.framework.CastReceiverContext.getInstance();
    var options = new cast.framework.CastReceiverOptions();
    options.customNamespaces = {};
    options.customNamespaces[namespace] = cast.framework.system.MessageType.JSON;
    options.disableIdleTimeout = true;
    options.skipPlayersLoad = true;
    options.statusText = 'Salon — horloge, minuteur et ambiances';
    function send(sender, sequence) {
      context.sendCustomMessage(namespace, sender, { type: 'state', sequence: sequence, state: window.SalonTV.getState() });
    }
    context.addCustomMessageListener(namespace, function (event) {
      var message = event.data;
      if (!message || typeof message !== 'object') return;
      var validKey = ['left', 'up', 'right', 'down', 'ok', 'back'].indexOf(message.key) >= 0;
      if (message.type === 'sync' || (message.type === 'key' && validKey && window.SalonTV.input(message.key))) {
        send(event.senderId, typeof message.sequence === 'number' ? message.sequence : null);
      }
    });
    context.addEventListener(cast.framework.system.EventType.READY, function () { status('CHROMECAST · commandez depuis Chrome'); });
    window.SalonTV.onExit = function () { context.stop(); };
    context.start(options);
  } catch (error) { status('Impossible de démarrer le récepteur Cast : ' + error.message); }
}());
