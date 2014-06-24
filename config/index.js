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
  },
  sessions: {
      enabled: process.env.MAKI_SESSION_ENABLE || true
    , secret:  process.env.MAKI_SESSION_SECRET || 'this can be any random string, you can even use this one. :)'
  },
  auth: {
    local: {
      enabled: true
    }
  }
};
