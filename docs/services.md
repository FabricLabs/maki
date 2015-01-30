## Services

### Handlers

Handlers are middlewares for specific operations that take place through a
specific Service.  You can attach them to a resource as follows:

```javascript
maki.define('People', {
  attributes: { name: String },
  handlers: {
    html: {
      query: function(req, res) {
        console.log('do something special here...');
      }
    }
  }
})
```

### Plugins
Plugins for Services are exposed as `pre` and `post` middlewares for various
Services. These middlewares will only execute when a method is invoked via that
specific Service.

You can apply Middlewares to an entire Service:
```javascript
var Analytics = require('maki-analytics');
var analytics = new Analytics({ id: 'UA-57746323-2' });

maki.use( analytics ).serve(['http']).start();

```

Service middlewares, in particular the HTTP middlewares, use the standard
connect-style middleware pattern (`request`, `response`, and `next`).

#### Building Plugins
The HTTP plugin currently looks for the very specific `extends` attribute:
```javascript
var plugin = {
  extends: {
    services: { // this plugin extends the following services...
      http: { // http, by named key...
        pre: { // pre middleware
          query: function(req, res, next) {
            // do something here. just don't forget to...
            next();
          }
        }
      }
    }
  }
}
```
