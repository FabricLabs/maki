/* This file is a config, that exposes various
   meaningful values to the rest of the application.
   This is done using the module.exports function,
   which sets them when require('./thisfile') is run. */

module.exports = {
  services: {
    http: {
      port: process.env.MAKI_HTTP_PORT || 9200
    }
  },
  database: {
      name: process.env.MAKI_DATABASE_NAME || 'maki'
    , uri:  process.env.MAKI_DATABASE_URI  || 'localhost' 
  },
  sessions: {
      enabled: process.env.MAKI_SESSIONS_ENABLE || true
    , secret:  process.env.MAKI_SESSIONS_SECRET || 'this can be any random string, you can even use this one. :)'
  },
  redis: {
      host: process.env.MAKI_REDIS_HOST || 'localhost'
    , port: process.env.MAKI_REDIS_PORT || 6379
  },
  auth: {
    local: {
      enabled: true
    }
  }
};
