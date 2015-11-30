# Adding Resources
Resources are the most fundamental abstraction of your application's design.  Maki
makes managing Resources extremely simple, and is in fact as simple as a single
line in your Maki app.

```javascript
app.define('Widget', { attributes: { name: String } });
```

This one line is incredibly powerful.  Not only have we now provided a form of
type definition, but Maki takes this input and builds out an entire API for us.

[Full Resource Documentation](/docs/resources)
