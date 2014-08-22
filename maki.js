var config = require('./config');

var Maki = require('./lib/Maki');
var maki = new Maki( config );

var resources = [
  {
    name: 'Page',
    attributes: {
      name: { type: String , max: 80 },
      slug: { type: String , max: 80 , id: true },
      content: { type: String }
    }
  }/*/,
  {
    name: 'Example',
    attributes: {
      name: { type: String , max: 80 },
      slug: { type: String , max: 80 , id: true },
      content: { type: String }
    }
  }/*/
];

resources.forEach(function(resource) {
  maki.define( resource.name , resource );
});

maki.start();

console.log( maki.routes );
