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

### Middlewares
Much like the Resource Pipeline, Services also support middlewares.  These
middlewares will only execute when a method is invoked via that specific 
Service.

You can apply Middlewares to an entire service:
```javascript
var Analytics = require('maki-analytics');
var analytics = new Analytics({ id: 'UA-57746323-2' });

maki.use( analytics ).serve(['http']).start();

```

Service middlewares, in particular the HTTP middlewares, use the standard
connect-style middleware pattern (`request`, `response`, and `next`).
