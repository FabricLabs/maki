process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

var config = require('../config');
var async = require('async');
var rest = require('restler');
var qs = require('querystring');
var speakingurl = require('speakingurl');

var home = 'http://localhost:9200';
var base = 'https://slack.com/api/channels.list';
var params = {
  token: config.slack.token
};
var url = base + '?' + qs.stringify(params);

console.log('using URL:', url);

rest.get(url).on('complete', function(topics) {
  //console.log('topics:', topics.channels);

  topics.channels.filter(function(x) {
    return (x.is_archived === false);
  }).forEach(function(channel) {
    var id = speakingurl(channel.name);
    var remote = home + '/topics/' + id;

    console.log('topic:', channel);
    console.log('remote:', remote);


    rest.put(remote, {
      headers: {
        'Accept': 'application/json'
      },
      data: {
        id: id, // TODO: reject if PUT doesn't match?
        name: channel.name,
        description: channel.purpose.value,
        topic: channel.topic.value,
        created: new Date(channel.created * 1000),
        stats: {
          subscribers: channel.num_members
        }
      }
    }).on('complete', function(result, response) {
      console.log('channel result:', channel.name, result)//response.statusCode);
    });
  });
});
