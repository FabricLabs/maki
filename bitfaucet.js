var config = require('./config');

var Maki = require('./lib/Maki');
var maki = new Maki( config );

var bitcoin = require('bitcoin');

var Faucet = maki.define('Faucet', {
  attributes: {
    name:    { type: String , default: 'Default' , required: true },
    balance: { type: String , default: 0 , required: true },
    host:    { type: String , default: 'localhost', required: true },
    port:    { type: Number , default: 8332, required: true },
    user:    { type: String , default: 'default' },
    pass:    { type: String , default: 'default' },
    timeout: { type: Number , default: 30000 }
  },
  methods: {
    btcClient: function() {
      var faucet = this;
      return new bitcoin.Client( faucet );
    }
  }
});

var Pour = maki.define('Pour', {
  name: 'Pour',
  attributes: {
    _faucet: { type: maki.mongoose.SchemaTypes.ObjectId , required: true },
    address: { type: String , max: 80 },
    amount:  { type: String , max: 80 },
    ip:      { type: String , private: true },
    date:    { type: Date , default: Date.now , restricted: true },
    comment: { type: String },
    status:  { type: String , enum: [
      'pending',
      'broadcast',
      'failed'
    ], default: 'pending', required: true }
  }
});

Faucet.post('init', function( faucet , next ) {
  // TODO: debounce / singleton
  faucet.btcClient().getBalance('*', 1, function(err, balance, resHeaders) {
    if (err) console.log(err);

    faucet.balance = balance;
    faucet.save(function(err) {
      next( err , 'faucet stuff' );
    });
    
  });
});

Pour.pre('save', function( done ) {
  var pour = this;
  console.log('TODO: implement ratelimiter.  pre-save() called.', pour );
  done();
});

// perform actions when new pours are created
Pour.on('create', function( pour ) {

  pour.populate({
    path: '_faucet',
    model: 'Faucet'
  }, function(err, pour) {
    pour._faucet.btcClient().sendToAddress( pour.address , parseFloat(pour.amount) , function(err, txid) {
      if (err) {
        console.error(err);
        Pour.update( pour._id , {
          status: 'failed'
        } , function(err) {
          console.log('could not commit failure to database');
        });
      } else {
        Pour.update( pour._id , {
          status: 'broadcast'
        } , function(err) {
          
        });
      }
    });
  });
});

maki.app.get('/', function(req, res, next) {
  Faucet.query( {} , function(err, faucets) {
    if (!faucets.length) {
      Faucet.create({}, function(err, faucet) {
        return res.render('Index', {
          faucet: faucet,
          index: {}
        });
      });
    } else {
      return res.render('Index', {
        faucet: faucets[ 0 ],
        index: {}
      });
    }
  });
});

maki.start();
