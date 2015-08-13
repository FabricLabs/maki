/* This file is a config, that exposes various
   meaningful values to the rest of the application.
   This is done using the module.exports function,
   which sets them when require('./thisfile') is run. */

var NAMESPACE = process.env.MAKI_SERVICE_NAMESPACE || 'maki';
var DATABASE  = process.env.MAKI_DATABASE_NAME || NAMESPACE;

module.exports = {
  service: {
    name: process.env.MAKI_SERVICE_NAME || 'Maki' ,
    authority: process.env.MAKI_SERVICE_AUTHORITY || 'localhost:9200' ,
    namespace: NAMESPACE ,
    mission: process.env.MAKI_SERVICE_MISSION || 'A simple framework for quickly building apps.',
    description: process.env.MAKI_SERVICE_DESCRIPTION || 'Maki allows you to focus on your project, rather than laboring over architecture decisions.  With true isomorphism, you control how your application behaves, and can then customize how your features are exposed on specific platforms.',
    source: 'https://github.com/martindale/maki',
    points: [
      {
        header: 'Build Once, Deploy Everywhere',
        description: 'Maki can build desktop and <strong>native</strong> mobile apps directly from your web app.  All with the same code.',
        action: {
          text: 'Read the Docs &raquo;',
          link: '/docs'
        }
      },
      {
        header: 'Self-Documenting',
        description: 'Once you\'ve defined your resources, the API builds itself!  It works the same way everywhere.',
        action: {
          text: 'See the API &raquo;',
          link: '/api'
        }
      },
      {
        header: 'Plugin Ecosystem',
        description: 'There\'s already <em>tons</em> of plugins for Maki that implement common application functionality.',
        action: {
          text: 'Browse the Plugins &raquo;',
          link: '/plugins'
        }
      }
    ],
    icon: 'lab'
  },
  dns: {
    name: process.env.MAKI_DNS_NAME || 'localhost'
  },
  services: {
    http: {
      port: process.env.MAKI_HTTP_PORT || 9200 ,
      host: process.env.MAKI_HTTP_HOST || 'localhost'
    },
    spdy: {
      host: process.env.MAKI_HTTP_HOST || 'localhost',
      port: process.env.MAKI_SPDY_PORT || 9643
    }
  },
  database: {
    name: DATABASE ,
    masters: (process.env.MAKI_DATABASE_MASTERS)
      ? JSON.parse(process.env.MAKI_DATABASE_MASTERS)
      : [ 'localhost' ]
  },
  sessions: {
    enabled: process.env.MAKI_SESSIONS_ENABLE || true ,
    secret:  process.env.MAKI_SESSIONS_SECRET || 'this can be any random string, you can even use this one. :)'
  },
  redis: {
    host: process.env.MAKI_REDIS_HOST || 'localhost',
    port: process.env.MAKI_REDIS_PORT || 6379
  },
  sockets: {
    timeout: process.env.MAKI_SOCKETS_TIMEOUT || 30000
  },
  auth: {
    local: {
      enabled: true
    }
  },
  views: {
    plugins: {
      'moment': require('moment')
    },
    client: {
      render: process.env.MAKI_VIEWS_CLIENT_RENDER || false
    }
  }
};
