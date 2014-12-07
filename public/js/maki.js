// staged back-off strategy for websockets
var retryTimes = [ 50, 250, 1000, 2500, 5000, 10000, 30000, 60000, 120000, 300000, 600000, 86400000 ]; //in ms
var retryIndex = 0;

// stub for a proper class
var maki = {
    config: null
  , templates: {}
  , routes: []
  , socket: null // only one connected socket at a time (for now)
  , sockets: {
      subscriptions: [],
      subscribe: function( channel ) {
        if (!channel) { var channel = window.location.pathname; }
        if (!maki.socket) { maki.sockets.connect(); }
        if (maki.sockets.subscriptions.indexOf( channel ) >= 0) { return; }

        maki.sockets.subscriptions.push( channel );
        var message = new jsonRPC('subscribe', { channel: channel });
        return maki.socket.send( message.toJSON() );
      },
      unsubscribe: function( channel ) {
        if (!channel) { var channel = window.location.pathname; }
        if (!maki.socket) { maki.sockets.connect(); }
        if (maki.sockets.subscriptions.indexOf( channel ) == -1) { return; }

        var i = maki.sockets.subscriptions.indexOf( channel );
        maki.sockets.subscriptions.splice( i , 1 );

        var message = new jsonRPC('unsubscribe', { channel: channel });
        return maki.socket.send( message.toJSON() );
      },
      publish: function( channel , message ) {
        if (!maki.socket) { maki.sockets.connect(); }


      },
      disconnect: function() {
        if (maki.socket) {
          // unbind onclose, onmessage
          maki.socket.onclose = null;
          maki.socket.onmessage = null;

          // must happen after onclose event is unbound
          maki.socket.close();
          maki.socket = null;
        }
      },
      connect: function() {
        maki.sockets.disconnect();
        
        var path = 'ws://' + window.location.host + window.location.pathname;
        maki.socket = new WebSocket( path );
        maki.socket.onclose = function onClose() {
          console.log('lost connection, reconnect... ');
          // TODO: randomize reconnection timeout buffer
          if (retryIndex < retryTimes.length) {
            console.log('retrying in ' + retryTimes[ retryIndex ] + 'ms');
            setTimeout( maki.sockets.connect , retryTimes[ retryIndex++ ] );
          } else {
            console.log('failed for the last time.  not attempting again.');
          }
        };
        maki.socket.onmessage = function onMessage(msg) {
          try {
            var data = JSON.parse( msg.data );
          } catch (e) {
            var data = {};
          }
          // experimental JSON-RPC implementation
          if (data.jsonrpc === '2.0') {
            switch (data.method) {
              case 'ping':
                console.log('was ping, playing pong');
                maki.socket.send(JSON.stringify({
                  'jsonrpc': '2.0',
                  'result': 'pong',
                  'id': data.id
                }));
              break;
              case 'patch':
                console.log('received patch event', data );
                
                var uri = data.params.channel;
                var ops = data.params.ops;
                
                if (!maki._resources[ uri ]) maki._resources[ uri ] = {};
                
                jsonpatch.apply( maki._resources[ uri ] , ops );
                
              break;
              default:
                console.log('unhandled jsonrpc method ' , data.method);
              break;
            }
          } else {
            
          }
        };
        maki.socket.onopen = function onOpen() {
          retryIndex = 0;
          // this is redundant, as the connection will already be subscribed
          // however, we need to modify internal stores, so call it anyways
          maki.sockets.subscribe( window.location.pathname );
        };
      }
    }
};

function DataBinder( objectID ) {
  var pubSub = $({});
  
  var attribute = 'bind-' + objectID;
  var message = objectID + ':change';
  
  $(document).on('change', '[data-' + attribute + ']', function(e) {
    var $input = $(this);
    pubSub.trigger( message , [ $input.data( attribute ) ] , $input.val() );
  });
  
  pubSub.on( message , function(e, property, value) {
    $('[data-' + attribute + '=' + property + ']').each(function() {
      var $bound = $(this);
      if ( $bound.is('input, textarea, select') ) {
        $bound.val( value );
      } else {
        $bound.html( value );
      }
    });
  });
}

var renderer = function( context , next ) {

  var obj = {};
  obj[ context.state.template ] = context.state.obj;
  
  // merge in always available vars...
  obj = _.merge( obj , maki.always );
  
  console.log('seeking', context.state.template , 'in', jade.templates );
  console.log( jade.templates[ context.state.template + '.jade' ] );
  console.log('will render with', obj );
  
  var render = jade.templates[ context.state.template + '.jade' ];
  
  if (!render) {
    var render = jade.templates[ 'resource.jade' ];
    var subject = context.state.obj;
    
    // TODO: fix
    var resource = context.state.resource;
    console.log('found resource', resource);
    obj['resource'] = resource;

    if (subject && !Array.isArray(subject)) {
      obj['item'] = subject;
    } else {
      obj['collection'] = subject;
    }
    
  }
  
  var output = render( obj );
  
  console.log('rendered output', output);
  
  // TODO: proper data binding, shadow dom, etc.
  //maki.$viewport.html( jade.render( context.state.template , obj ) );
  maki.$viewport.html( output );
  
  $('a.active').removeClass('active');
  $('a[href="'+context.path+'"]').addClass('active');
  
  //return next();
};

var subscriber = function( context , next ) {
  
  maki.sockets.unsubscribe( window.location.pathname );
  maki.sockets.subscribe( context.path );

  return next();

};

var builder = function( route , resource ) {
  return function( context , next ) {
    
    console.log( context );
    
    // TODO: use local factory / caching mechanism
    $.ajax({
        url: context.path
      , dataType: 'json'
    }).always(function( results ) {
      if (!results) template = '500';

      console.log('builder', context.path , maki.templates );
      console.log('results is...', results);

      context.state.route = route;
      context.state.resource = resource;
      context.state.template = maki.templates[ route ];
      context.state.obj = results;
      
      return next();

    });
  };
};

$(window).on('ready', function() {

  // update classes for links
  // note: only anchor tags are updated here.
  // don't create links that aren't anchor tags.  that's what they're for.
  $('a:not([href="'+window.location.pathname+'"])').removeClass('active');
  $('a[href="'+window.location.pathname+'"]').addClass('active');

  $.ajax({
    type: 'OPTIONS',
    url: '/'
  }).done(function(data) {
    console.log('OPTIONS, data:', data );
    
    if (!data || !data.resources) return console.log('failed to acquire resource list; disabling fancy stuff.');
    if (!data.config) return console.log('failed to acquire server config; disabling fancy stuff.');
    if (!data.always) return console.log('failed to acquire server always; disabling fancy stuff.');
    
    maki.config = data.config;
    maki.always = data.always;
    maki.db = new loki( maki.config.service.namespace );
    
    maki.collections = {};
    maki._resources = {};
    
    // server is online!
    maki.$viewport = $('[data-for=viewport]');
    maki.sockets.connect();
    
    maki.resources = data.resources;
    maki.resources.forEach(function(resource) { // duplicated below, not DRY for easy debug
      var fields = ( resource.options.attributes ) ? Object.keys( resource.options.attributes ) : [];
      var indices = _.union( ['_id'] , fields.filter(function(x) {
        return resource.options.attributes[ x ].index === true;
      }) );
      
      console.log('creating collection', resource.name , 'with indices' , indices);
      maki.collections[ resource.name ] = maki.db.addCollection( resource.name , indices );
      
      // in-memory stub for basic patch events, without persistence
      maki._resources[ resource.routes.query ] = [];
      
      console.log( resource );
      
      // only support routing for lists and singles
      [ 'query', 'get' ].forEach(function(m) {
        var route = resource.routes[ m ];
        
        if (route) maki.templates[ route ] = resource.templates[ m ];
        if (route) page( route , builder( route , resource ) , subscriber , renderer );
      });
    });
    
    page.start();
    
    // exit instead of binding client view handler
    console.log(maki.config);
    if (!maki.config.views || !maki.config.views.client || maki.config.views.client.render !== true) return console.log('client view rendering disabled.');

    maki.resources = data.resources;
    maki.resources.forEach(function(resource) {
      // only support routing for lists and singles
      [ 'query', 'get' ].forEach(function(m) {
        var path = resource.paths[ m ];
        if (path) maki.templates[ path ] = resource.templates[ m ];
      });
    });
    
    // bind pushState stuff
    $( document ).on('click', 'a', function(e) {
      e.preventDefault();
      var $a = $(this);
      var href = $a.attr('href');
      
      var template;
      Object.keys(maki.templates).forEach(function(route) {
        // HACK: don't bother matching routes of almost-zero length
        // TODO: fix this
        if (href.length <= 1) return template = 'index';
        
        console.log('link clicked...', href );
        console.log('regex string...', route );
        
        var string = route;
        var regex = new RegExp( eval( string ) );
        
        console.log( regex , 'test', regex.test(href) , '->', maki.templates[ route ]);
        
        // TODO: do not match '/' –- see bugfix at top of this loop
        if (regex.test( href )) template = maki.templates[ route ];
      });
      
      // TODO: use local factory / caching mechanism
      $.ajax({
          url: href
        , async: false
      }).always(function( results ) {
        if (!results) template = '500';

        maki.sockets.unsubscribe( window.location.pathname );
        maki.sockets.subscribe( href );

        var obj = {};
        obj[ template ] = results;
        
        // merge in always available vars...
        obj = _.merge( obj , maki.always );
        
        console.log('seeking', template);
        
        // TODO: proper data binding, shadow dom, etc.
        maki.$viewport.html( jade.render( template , obj ) );
        
        $('a.active').removeClass('active');
        $a.addClass('active');
        
        history.pushState({}, '', href );
      });

      return false;
    });
    
    $('.message .close').on('click', function() {
      $(this).closest('.message').fadeOut();
    });
    
  });
});
