/* This file is a config, that exposes various
   meaningful values to the rest of the application.
   This is done using the module.exports function,
   which sets them when require('./thisfile') is run. */

const NAMESPACE = process.env.MAKI_SERVICE_NAMESPACE || 'maki';
const DATABASE  = process.env.MAKI_DATABASE_NAME || NAMESPACE;

module.exports = {
  service: {
    name: process.env.MAKI_SERVICE_NAME || 'Maki' ,
    source: 'https://github.com/FabricLabs/maki',
    // heh.  this silly RFC.
    authority: process.env.MAKI_SERVICE_AUTHORITY || 'localhost:9200',
    namespace: NAMESPACE ,
    pitch: 'an experimental full-stack framework for cross-platform apps.',
    mission: process.env.MAKI_SERVICE_MISSION || 'Maki makes building beautiful apps a breeze.',
    description: process.env.MAKI_SERVICE_DESCRIPTION || 'From 0 to MVP in 15 minutes.  By building your app with Maki, you\'ll have builds for all major platforms right out of the box.  Write once, deploy everywhere!',
    about: 'We built Maki as a rapid-prototyping tool for <a href="https://fabric.pub">Fabric</a> apps.  We\'ve found it fairly useful, so we hope you enjoy. <i class="heart icon"></i>',
    copyright: 'We encourage you to copy, clone, and <em>create</em>.  After all, without a rich public domain, how else can we innovate?  By all means, go forth and <em>build</em>.',
    //masthead: '/img/breeze.gif',
    cta: {
      link: '/examples',
      // This example includes more complex markup
      //- TODO: consider converting to markdown?
      text: 'Browse the Examples',
      icon: 'right chevron'
    },
    points: [
      {
        header: 'Deploy Everywhere',
        description: 'Maki can build web, desktop, <em>and</em> native mobile apps, directly from your definitions.  With consistent interactions across them all.',
        action: {
          text: 'Read the Docs &raquo;',
          link: '/docs'
        }
      },
      {
        header: 'Consistent, Transparent API',
        description: 'Once you\'ve defined your resources, the API builds itself!  It works the same everywhere – even real-time updates over sockets.',
        action: {
          text: 'View Sample API &raquo;',
          link: '/api'
        }
      },
      {
        header: 'Plugin Ecosystem',
        description: 'There\'s already a plethora of plugins for Maki that implement common application functionality.  They\'re easy to build, too.',
        action: {
          text: 'Browse the Plugins &raquo;',
          link: '/plugins'
        }
      }
    ],
    icon: 'lab',
    logo: '/img/maki-icon.png'
  },
  dns: {
    name: process.env.MAKI_DNS_NAME || 'localhost'
  },
  fabric: {
    port: 1337
  },
  services: {
    http: {
      port: process.env.MAKI_HTTP_PORT || 9200 ,
      host: process.env.MAKI_HTTP_HOST || 'localhost'
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
  slack: {
    token: process.env.MAKI_SLACK_TOKEN || 'https://api.slack.com/docs/oauth-test-tokens'
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
