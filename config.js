/* This file is a config, that exposes various
   meaningful values to the rest of the application.
   This is done using the module.exports function,
   which sets them when require('./thisfile') is run. */

module.exports = {
    appPort: 9200
  , callbackURL: "http://yourapp.com:9200" // set this to the public address of your app
  , cookieSecret: 'this can be any random string, you can even use this one. :)'
  , databaseName: 'tswedu'
};