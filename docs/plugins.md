## Plugins

Maki plugins can be used to extend any Maki-rolled application.

For example, to add sessions (and basic user support, at the time of writing):
```javascript
var Sessions = require('maki-sessions');
var sessions = new Sessions({
  resource: 'Person'
});

maki.use( sessions );

maki.define('Person', {
  attributes: { name: String }
});

```

Plugins must have an `extends` property, which may contain one or more of the 
following attributes: `resources`, `services` – all of which are keyed to the 
name of the service each item extends.

`services` have the following attributes: `{function} middleware`,
`{function} setup`.  Middlewares must use the connect middleware pattern
(`request`, `response`, and `next` – don't forget to call `next()`!), while
`setup` accepts a single parameter `maki`, and will be executed before the 
service is started.

`resource` plugins should expose a Resource Plugin, and will generally be
attached to the underlying Model once created (at `attach` time).
