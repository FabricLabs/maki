process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

var config = require('../config');
var async = require('async');
var rest = require('restler');
var qs = require('querystring');

var home = 'http://localhost:9200';
var base = 'https://slack.com/api/users.list';
var params = {
  token: config.slack.token,
  presence: 1
};
var url = base + '?' + qs.stringify(params);

console.log('using URL:', url);

rest.get(url).on('complete', function(people) {
  console.log('people:', people.members);

  people.members.filter(function(x) {
    return (x.deleted === false);
  }).forEach(function(person) {
    var remote = home + '/people/' + person.name;
    console.log('remote:', remote);
    rest.put(remote, {
      headers: {
        'Accept': 'application/json'
      },
      data: {
        id: person.name,
        username: person.name,
        name: {
          given: person.profile.first_name,
          family: person.profile.last_name
        },
        email: person.profile.email,
        bio: person.profile.title,
        image: {
          original: person.profile.image_original,
          avatar: person.profile.image_192,
        },
        links: {
          slack: person.id
        },
        status: person.presence
      }
    }).on('complete', function(result, response) {
      console.log('person result:', person.name, result, response.statusCode);
    });
  });
});
