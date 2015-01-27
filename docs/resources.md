## Resources

### Sources
Resources can automatically be collected from outside sources, including local
files and even remote HTTP services.  This is useful for querying APIs, or
keeping some versions

Sources are added via the `source` parameter on a resource:
```javascript
maki.define('Example', {
  attributes: { name: String , description: String },
  source: './data/examples.json'
});
```
The content in this attribute will be passed to [procure][procure], which will
then collect the data and cache it locally.

Currently, this is done _one time_, at Maki startup.  The data is never again
queried, and the in-memory version is kept until the worker restarts.

#### Mappers
Sourced data can have a transformation function, or a `mapper`, applied to it at
runtime:

```javascript
maki.define('Release', {
  attributes: { name: String },
  source: 'https://api.github.com/repos/martindale/maki/releases',
  map: function( release ) {
    return {
      name: release.name
    };
  }
});
```

Mappers expect a single parameter, and expect a single return parameter –
identical to `Array.prototype.map`.

#### Renderers
Sourced data can be formatted in a number of ways.  For example, as Markdown:
```javascript
maki.define('Release', {
  attributes: {
    name: { type: String , render: 'markdown' }
  },
  source: 'https://api.github.com/repos/martindale/maki/releases',
  map: function( release ) {
    return {
      name: release.name
    };
  }
});
```
`markdown` is currently the only supported renderer.  Future versions of Maki
will likely include the ability to pass a function in this field.

[procure]: https://www.npmjs.com/package/procure
