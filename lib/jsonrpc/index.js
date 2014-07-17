var uuid = require('node-uuid');
var jsonRPC = function( method , params ) {
  this._method = method;
  this._params = params;
}
jsonRPC.prototype.toJSON = function(notify) {
  var self = this;
  return JSON.stringify({
    'jsonrpc': '2.0',
    'method': self._method,
    'params': self._params,
    'id': (notify === false) ? undefined : uuid.v1()
  });
}

module.exports = jsonRPC;