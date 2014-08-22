var redis = require('redis');

var MyWebSocketServer = function() {
  
}

MyWebSocketServer.prototype.bind = function( maki ) {
  var self = this;

  // prepare the websocket server
  var WebSocketServer = require('ws').Server;
  var wss = new WebSocketServer({
    server: maki.httpd
  });
  
  self.server = wss;

  self.server.on('connection', function(ws) {
    // determine appropriate resource / handler
    for (var route in maki.routes) {
      // TODO: is there a cleaner way to do this, without eval()?
      var regex = new RegExp( eval(route) );
      // test if this resource should handle the request...
      if ( regex.test( ws.upgradeReq.url ) ) {
        // unique identifier for our upcoming mess
        ws.id = ws.upgradeReq.headers['sec-websocket-key'];

        // make a mess
        ws.pongTime = (new Date()).getTime();
        ws.redis = redis.createClient( maki.config.redis.port , maki.config.redis.host );
        ws.redis.on('message', function(channel, message) {

          try {
            var message = JSON.parse( message );
          } catch (e) {
            var message = message;
          }

          ws.send( (new jsonRPC('patch' , {
              channel: channel
            , ops: message
          })).toJSON() );
        });
        ws.redis.subscribe( ws.upgradeReq.url );

        // handle events, mainly pongs
        ws.on('message', function handleClientMessage(msg) {
          try {
            var data = JSON.parse( msg );
          } catch (e) {
            return ws.send({
              'jsonrpc': '2.0',
              'error': {
                'code': 32700,
                'message': 'Unable to parse submitted JSON message.'
              }
            });
          }

          // experimental JSON-RPC implementation
          if (data.jsonrpc !== '2.0') {
            return ws.send({
              'jsonrpc': '2.0',
              'error': {
                'code': 32600,
                'message': 'No jsonrpc version specified.'
              }
            });
          }
          
          if (data.result === 'pong') {
            ws.pongTime = (new Date()).getTime();
          }

          switch( data.method ) {
            case 'subscribe':
              // fail early
              if (!data.params.channel) {
                return ws.send({
                  'jsonrpc': '2.0',
                  'error': {
                    'code': 32602,
                    'message': 'Missing param: \'channel\''
                  },
                  'id': data.id
                })
              }
              
              if (maki.debug) console.log( '[SOCKETS] subscribe event, ' , data.params.channel );

              ws.redis.subscribe( data.params.channel );
              var subscriptions = Object.keys(ws.redis.subscription_set).filter(function(x) {
                return x;
              }).map(function(x) {
                return x.substring(4); // removes `sub ` from redis set
              });
              
              if (subscriptions.length > 10) {
                if (maki.debug) console.log('[SOCKETS] warning, oversubscribed');
              }
              
              ws.send({
                'jsonrpc': '2.0',
                'result': 'success',
                'id': data.id
              });

            break;
            case 'unsubscribe':
              // fail early
              if (!data.params.channel) {
                return ws.send({
                  'jsonrpc': '2.0',
                  'error': {
                    'code': 32602,
                    'message': 'Missing param: \'channel\''
                  },
                  'id': data.id
                })
              }

              if (maki.debug) console.log( '[SOCKETS] unsubscribe event, ' , data.params.channel );

              ws.redis.unsubscribe( data.params.channel );
              ws.send({
                'jsonrpc': '2.0',
                'result': 'success',
                'id': data.id
              });

            break;
          }
        });

        maki.clients[ ws.id ] = ws;

        // cleanup our mess
        ws.on('close', function() {
          if (maki.debug) console.log('[SOCKETS] cleaning expired websocket: ', ws.upgradeReq.headers['sec-websocket-key'] );
          ws.redis.end();
          if (maki.clients[ ws.upgradeReq.headers['sec-websocket-key'] ]) {
            maki.clients[ ws.upgradeReq.headers['sec-websocket-key'] ].redis.end();
            delete maki.clients[ ws.upgradeReq.headers['sec-websocket-key'] ];
          }
        });

        return; // exit the 'connection' handler
        break; // break the loop
      }
    }
    if (maki.debug) console.log('[SOCKETS] unhandled socket upgrade' , ws.upgradeReq.url );
  });

  var jsonRPC = require('../jsonrpc');
  self.server.forEachClient = function(fn) {
    var self = this;
    for (var i in this.clients) {
      fn( this.clients[ i ] , i );
    }
  }
  self.server.markAndSweep = function() {
    var message = new jsonRPC('ping');
    self.server.broadcast( message.toJSON() );

    var now = (new Date()).getTime();
    this.forEachClient(function( client , id ) {
      // if the last pong from this client is less than the timeout,
      // emit a close event and let the handler clean up after us.
      if (client.pongTime < now - maki.config.sockets.timeout) {
        //console.log('would normally emit a close event here', client.id , client.pongTime , now - config.sockets.timeout );
        client.emit('close');
      }
    });
  }
  self.server.broadcast = function(data) {
    for (var i in this.clients) {
      this.clients[ i ].send( data );
    }
  };
}

module.exports = MyWebSocketServer;
