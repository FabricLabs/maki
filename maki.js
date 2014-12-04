var config = require('./config');

var Maki = require('./lib/Maki');
var maki = new Maki( config );

maki.define('Example', {
  attributes: {
    name:    { type: String , max: 80 },
    slug:    { type: String , max: 80 , id: true },
    content: { type: String }
  },
  source: 'data/examples.json',
  icon: 'idea'
});

maki.serve(['http']).start();
