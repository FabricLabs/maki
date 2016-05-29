var config = require('../config');
var async = require('async');
var rest = require('restler');
var qs = require('querystring');

var base = 'https://slack.com/api/users.list';
var params = {
  token: config.slack.token
};
var url = base + '?' + qs.stringify(params);

console.log('using URL:', url);

rest.get(url).on('complete', function(people) {
  console.log('people:', people.members);

  people.members.forEach(function(person) {
    rest.patch('https://maki.io/people/' + person.name, {
      headers: {
        'Accept': 'application/json'
      },
      data: {
        username: person.name,
        name: {
          given: person.profile.first_name,
          family: person.profile.last_name
        },
        email: person.profile.email,
        bio: person.profile.title
      }
    }).on('complete', function(result) {
      console.log('person result:', person.name, result);
    });
  });
});
