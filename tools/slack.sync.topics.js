process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

var config = require('../config');
var async = require('async');
var rest = require('restler');
var qs = require('querystring');
var crypto = require('crypto');
var speakingurl = require('speakingurl');

var home = 'http://localhost:9200';
var base = 'https://slack.com/api/channels.list';
var params = {
  token: config.slack.token
};
var url = base + '?' + qs.stringify(params);

console.log('using URL:', url);

function put (url, data, cb) {
  rest.put(url, {
    headers: {
      'Accept': 'application/json'
    },
    data: data
  }).on('complete', function(result, response) {
    cb(null, result);
  });
}

rest.get(url).on('complete', function(topics) {
  //console.log('topics:', topics.channels);
  
  rest.get(home + '/people', {
    headers: {
      Accept: 'application/json'
    }
  }).on('complete', function(people) {
    var peopleMap = {};
    people.forEach(function(person) {
      if (!person.links) {
        console.error('person has no links:', person.id);
        return;
      }
      
      peopleMap[person.links.slack] = person;
    });

    topics.channels.filter(function(x) {
      return (x.is_archived === false);
    }).forEach(function(channel) {
      var channelID = speakingurl(channel.name);
      var remote = home + '/topics/' + channelID;

      var peopleArray = channel.members.filter(function(id) {
        return peopleMap[id];
      }).map(function(id) {
        return peopleMap[id]._id;
      });

      put(remote, {
        id: channelID, // TODO: reject if PUT doesn't match?
        name: channel.name,
        description: channel.purpose.value,
        topic: channel.topic.value,
        created: new Date(channel.created * 1000),
        people: peopleArray,
        links: {
          slack: channel.id
        },
        stats: {
          subscribers: channel.num_members
        }
      }, function(err, result) {
        if (err) return console.error(err);
        
        console.log('created remote topic:', result.id , result.created);
        
        var base = 'https://slack.com/api/channels.history';
        var params = {
          token: config.slack.token,
          channel: channel.id,
          count: 1000
        };
        var url = base + '?' + qs.stringify(params);

        rest.get(url).on('complete', function(data) {
          data.messages.filter(function(m) {
            //return (m.reactions && m.reactions.length);
            return (!m.subtype);
          }).forEach(function(message) {
            var state = JSON.stringify(message);
            var key = [channelID, message.user, message.ts].join(':');
            var hash = crypto.createHash('sha256').update(key).digest('hex');
            var remote = home + '/messages/' + hash;

            var timestamp = new Date(message.ts * 1000);
            var reactions = {};

            if (!message.reactions) message.reactions = [];
            message.reactions.forEach(function(r) {
              reactions[r.name] = parseInt(r.count);
            });

            var msg = {
              id: hash,
              topic: channelID,
              author: message.user,
              content: message.text,
              created: timestamp,
              reactions: reactions,
              links: {
                slack: hash // no IDs given by Slack!  uh-oh!
              },
              stats: {}
            };

            if (message.reactions && message.reactions.length) {
              msg.stats.reactions = message.reactions.map(function(x) {
                return x.count;
              }).reduce(function(prev, curr, i) {
                return prev + curr;
              });
            }
            //console.log('msg:', msg);
            put(remote, msg, function(err, result) {
              if (err) return console.error(err);
              console.log('created remote message:', '#' + channelID , result.id, result.created , remote);
            });
          });
        });



        /*var base = 'https://slack.com/api/emoji.list';
        var params = {
          token: config.slack.token
        };
        var url = base + '?' + qs.stringify(params);
        rest.get(url).on('complete', function(emoji) {
          console.log('emoji:', emoji);
        });*/

      });
    });
  
  
  });

});
