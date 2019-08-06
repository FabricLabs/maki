---
title: What is Maki?
description: Maki is something new, unlike anything you've ever seen.  Read on to learn more.
masthead: false
---

**Maki** means _handroll_ in Japanese.  We've chosen this word because it was our
inspiration to create a **hand-rolled framework** that met our needs without unnecessary
cruft.

## The Idea
We model everything around the idea of a Resource, a form of contract that describes how
a particular idea can be represented.  We're calling this **Resource Driven Design**, or
RDD for short.

On the Web, these "Resources" have identifiers, or URIs — `/people/martindale` is one
such example.  Using HTTP, we can execute a method on a remote resource:

```
GET /people/martindale
```

In Maki, we call these URIs "Channels", because we use them to name streams of
events that are related to the underlying Resource.  We also use these names to
identify objects in the system.  More on that later.

### Interacting With Channels
The Maki application exposes several methods which can be used to interact with
its data.  You can use a channel name to designate what you'd like to interact
with.

For example, updating the `bio` field of the `/people/martindale` resource:

```
PATCH /people/martindale {
  "bio": "relentless maker."
}
```

#### Channel Subscriptions
By using WebSockets, any channel can be connected to over HTTP.

```js
var channel = new WebSocket('wss:///people');
```

## Components
Maki offers a library of interface components that directly bind to the
application's data.  These components can be extended and customized, and it is
recommended that all applications built with Maki replicate their design.

Components look like this:
```jade
dom-module#maki-example-component
  template
    h1 {{data.title}}
  script.
    Polymer({
      is: 'maki-example-component',
      properties: {
        src: { type: String , observer: '_load' },
        data: { type: Object },
        state: { type: String },
        source: { type: String },
        output: { type: String }
      },
      _load: function(uri, back) {
        var self = this;
        fabric.get(uri, function(data) {
          self.data = data;
        });
      },
      ready: function() {
        console.log('[MAKI:EXAMPLE]', 'ready');
      }
    });

```

We think we've created something cool, but we're still experimenting.  We'd love
<a href="/people">your contributions</a>.  Come join the Maki Makers!