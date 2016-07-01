#!/usr/bin/env node
var config = require('../config');
var async = require('async');
var rest = require('restler');
var fs = require('fs');
var qs = require('querystring');
var crypto = require('crypto');
var speakingurl = require('speakingurl');

var home = 'http://localhost:9200';
var target = process.argv[2];
console.log('target:', target);

fs.readdir(target, function(err, files) {
  if (err) console.error(err);
  files.forEach(function(channelID) {
    var path = target + channelID;
    fs.stat(path, function(err, stats) {
      if (err || !stats.isDirectory()) {
        return;
      }

      fs.readdir(path, function(err, archives) {
        archives.forEach(function(day) {
          var bundle = path + '/' + day;
          var messages = require(bundle);

          console.log('messages:', messages.length);

          messages.filter(function(m) {
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
              console.log('message result:', result.id, 'has:', result.created);
            });
          });

        });
      });
    });
  });

});

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
