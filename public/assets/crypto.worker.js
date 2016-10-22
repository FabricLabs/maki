importScripts('/js/sha3.min.js');

self.addEventListener('message', function(e) {
  var input = e.data;

  console.log('[MAKI:WEB-WORKER]', 'message received:', e.data);

  var msg = JSON.parse(input);
  var hash = null;

  switch (msg.method) {
    default:
      return;
    case 'digest':
      hash = self._digest(msg.params[0]);
    break;
  }

  var response = {
    "jsonrpc": "2.0",
    "id": msg.id,
    "result": hash
  };

  self.postMessage(JSON.stringify(response));
});

self._digest = function _digest(input) {
  if (!input) return null;
  if (typeof input !== 'string') {
    input = JSON.stringify(input);
  }
  return CryptoJS.SHA3(input).toString();
};
