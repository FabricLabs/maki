// BitFaucet is a simple example of a Maki-powered application.  
// It implements some basic Resources with external lookups, and overrides some
// of Maki's built-in behaviors.

// First, we'll retrieve the Maki class.  
// In a real application, this could simply be `require('maki')`.
var Maki = require('../../lib/Maki');
// Create an instance of Maki – named according to our app.  
// As shorthand, this could be `var bitfaucet = require('maki')();`
var bitfaucet = new Maki();

// Let's define a few requirements.  
// In our case, we need a Bitcoin client.
var bitcoin = require('bitcoin');

// ## Resource Definitions  
// Maki starts with definitions of "Resources" that your application exposes.
// Our first Resource is, well, a "Faucet".
var Faucet = bitfaucet.define('Faucet', {
  // ### Resource Attributes
  attributes: {
    // Attributes can have enforced types, validators, behaviors...  
    // Most of these should be self-descriptive.  For a full reference, check
    // [the documentation]().
    name:    { type: String , default: 'Default' , required: true },
    balance: { type: String , default: 0 , required: true },
    host:    { type: String , default: 'localhost', required: true },
    port:    { type: Number , default: 8332, required: true },
    user:    { type: String , default: 'default' },
    pass:    { type: String , default: 'default' },
    timeout: { type: Number , default: 30000 }
  },
  // ### Resource Methods
  // Maki Resources can expose "methods".  These exist as functions on every
  // instance of such a resource.  
  // In the case of a "Faucet", each faucet needs a bitcoind instance.
  methods: {
    btcClient: function() {
      var faucet = this;
      return new bitcoin.Client( faucet );
    }
  }
});

// We're also going to create another Resource, a "Pour".  
// When a user wants to take money from the Faucet, they want to "create a new
// pour". 
var Pour = bitfaucet.define('Pour', {
  name: 'Pour',
  attributes: {
    // **Our first "special" attribute!**  
    // This is a special type, an ObjectId, which is a "pointer" (like in C++)
    // to another Resource.  
    //   
    // As you might imagine, a Pour cannot be created without a Faucet to Pour
    // from.
    _faucet: { type: require('mongoose').SchemaTypes.ObjectId , required: true },
    address: { type: String , max: 80 },
    amount:  { type: String , max: 80 },
    ip:      { type: String , private: true },
    date:    { type: Date , default: Date.now , restricted: true },
    txid:    { type: String },
    comment: { type: String },
    status:  { type: String , enum: [
      'pending',
      'broadcast',
      'failed'
    ], default: 'pending', required: true }
  },
  // ### Resource Handlers
  // Handlers can be used to override internal behaviors for specific contexts.
  // In the case of the Faucet, we want to change the default behavior for the
  // 'create' method of a Pour, but _only_ for the `html` transformer.  More
  // detail on this later.
  handlers: {
    'html': {
      create: function( req , res , next) {
        console.log('handler called');

        req.flash('success', 'Pour created successfully!');
        return res.redirect('/');
      }
    }
  }
});

// The Index Resource has a few extra custom options provided.
var Index = bitfaucet.define('Index', {
  name: 'Index',
  // First, we're going to override the default route for the `query` method.
  // By default, this would be `/indices` due to Maki's semantics, but we want
  // the Index resource to simply replace the front page.
  routes: {
    query: '/'
  },
  // Let's also change the default template (again, defaulting to
  // `indices.jade`)
  templates: {
    query: 'index'
  },
  // ### Resource Requirements
  // Requirement are additional Resources that must be collected when rendering 
  // non-pure (i.e., non-JSON) views.  For example, when rendering the Index,
  // we'll need to collect a Faucet.
  requires: {
    // Requirements are key->value pairs, where key is a defined (!) resource,
    // and the pair is an hashmap with some expected values.
    'Faucet': {
      // `filter` defines what query to pass to the Resource engine.
      filter: {},
      // `single` tells Maki that we are collecting exactly one instance of this
      // requirement.
      single: true
    }
  },
  // This is a static Resource, so don't attempt to persist it to the database.
  // This is useful for content pages that can't be interacted with.
  static: true
})

// ## Resource Hooks
// Hooks can be attached to Resources in the form of both `pre` and `post`
// middlewares.  
//   
// In our case, every time a Faucet is retrieved from the datastore, issue a
// call to the underlying bitcoind (wherever it may be) to get the current
// balance, and then update our copy of it.
//
// There is almost certainly a more scalable way of doing this (a cache), but
// this is left as an exercise to the reader.
Faucet.post('init', function( faucet , next ) {
  // Get balance from this faucet's instance of btcClient().  
  // Underlying, this is an RPC call to the backing bitcoind instance.
  faucet.btcClient().getBalance('*', 1, function(err, balance, resHeaders) {
    if (err) return console.log(err);
    // Set and persist the updated balance to the storage engine.
    faucet.balance = balance;
    faucet.save(function(err) {
      next( err , 'faucet stuff' );
    });
    
  });
});

// Before saving a Pour, validate that it is authorized.  
// In our simple example, all Pours are allowed (without a rate-limit), but in a
// real-world example you will clearly want to implement some sort of validator.
Pour.pre('save', function( done ) {
  var pour = this;
  console.log('TODO: implement ratelimiter.  pre-save() called.', pour );
  done();
});

// ## Resource Events
// All Maki resources are also event emitters.  This allows you to subscribe to 
// events from any part of your application, and trigger custom behavior.
//   
// In BitFaucet's case, let's initiate the Bitcoin transfer!
Pour.on('create', function( pour ) {
  // `.populate` collects other resources automatically.  Remember that
  // "special" field?  This is why it exists.
  pour.populate({
    path: '_faucet',
    model: 'Faucet' // This defines the "Model" that we're expecting.
  }, function(err, pour) {
    
    // Initiate the Bitcoin transfer...
    pour._faucet.btcClient().sendToAddress( pour.address , parseFloat(pour.amount) , function(err, txid) {
      if (err) {
        console.error(err);
        // Resources in Maki expose an `update` method, which accepts a query
        // and will update all matching documents.
        Pour.update( pour._id , {
          status: 'failed'
        } , function(err) {
          console.log('could not commit failure to database');
        });
      } else {
        Pour.update( pour._id , {
          // Let's update the `status` attribute (as previously defined).
          status: 'broadcast',
          txid: txid
        } , function(err) {
          
        });
      }
    });
  });
});

// ## Start
// `maki.start()` opens the sockets and listens for new connections for each of 
// the enabled Services.  By default, `http`, `https`, `ws`, and `wss` are 
// available.
bitfaucet.start();
