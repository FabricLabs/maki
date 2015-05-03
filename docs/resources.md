## Resources
Resources define the "object model" that your application exposes.  Here's how
a single resource is created:

```javascript
maki.define('Person');
```

In general, Resources should be defined as singular items – this is important as
it makes heuristics in various places much easier.  `Person` in this case will
become `/people` (automatically!) as a collection, and it contains a list of
`person` items.  That's pretty neat!

Defining a Resource in Maki has but one requirement, the list of `attributes` it
provides.  You can think of this like a Type Definition in a more strongly-typed
language:

```javascript
maki.define('Person', {
  attributes: { name: String }
});
```

The attributes associated with a Resource _will_ enforce type, too!  The names 
are used to control parameters when interacting with the resource, so choose
them wisely.

Attributes support a compact-form definition (as above), but also a long-form
declaration for more complex behaviors:

```javascript
maki.define('Person', {
  attributes: {
    name: { type: String , max: 140 }
  }
});
```

#### Defaults
Default values for a Resource attribute can be any object type, including a
function:

```javascript
maki.define('Person', {
  attributes: {
    name: { type: String , max: 140 },
    created: { type: Date , default: Date.now }
  }
});
```
Remember – do not _call_ the function here, simply set it.

#### Lengths (minimum and maximum)
The `max` attribute can be used to define a maximum value (for type `Number`) or
length (for type `String`).

Similarly, `min` can be used to specify a minimum.

#### Render
You can prevent a field from rendering in various contexts by providing a map of
boolean values and the Maki method upon which to restrict that attribute.

```javascript
maki.define('Person', {
  attributes: {
    name: { type: String , max: 140 },
    created: { type: Date , default: Date.now , render: {
      create: false
    } }
  }
});
```

#### Special Types
Certain special types of Resource attributes exist.  These control some behavior
unique to these types.

##### File
The `'File'` type will create a specially aliased attribute that exposes a raw
file stream.  Files can be uploaded to fields labeled `type: 'File'`, and are 
downloadable via a special `Files` resource (exposed over HTTP at `/files`).

These field types are rendered in HTML as file upload input elements, and offer
the user the ability to select one (or multiple) files for upload.

The default datastore for these uploads is the datastore – in the current
version of Maki (0.2.0 as of time of writing), this is a GridFS filestore that
**never touches disk**.

### Methods
All Maki Resources expose exactly five (5) methods:

- **query** to select a list of documents,
- **get** to get a single instance of a document by its identifier (ID),
- **create** to create a new instance of a document,
- **update** to change properties of a document, and
- **destroy** to remove a document.

These methods can be used to construct any more complex behavior, such as when
multiple Resources might need to be involved.  The ideal place for these types
of behaviors is in the Pipeline.

### Pipeline
The Methods exposed by Maki Resource are subject to a pipeline of "transformer"
functions, which can be used to perform authorization, transformation, or any
other number of things.  Pipeline functions can be of two types; `pre` or
`post`.

```javascript
var Person = maki.define('Person', {
  attributes: { name: String }
});

Person.pre('create', function(done) {
  var person = this;
  
  // trim any whitespace from the individual's name.
  person.name = person.name.trim();
  
  done();
});

Person.post('create', function(done) {
  var person = this;
  // create some sort of entry somewhere...
  Activity.create({ ref: person._id } , done );
});

```

### Events
All Maki Resources also emit events when certain operations take place – and
they even describe the specifics of those operations in an atomic fashion.

```javascript
var Person = maki.define('Person', {
  attributes: { name: String }
});

Person.on('create', function( data ) {
  console.log('A Person was created!', data );
});
```

#### PubSub
When using the HTTP service (enabled by default), a pub/sub architecture is
exposed via the WebSocket protocol.  This is, by default, **completely
routable:**

**Server**
```javascript
var Person = maki.define('Person', {
  attributes: { name: String }
});
```
**Client**
```javascript
var ws = new WebSocket('ws://example.com/people');
ws.onmessage = function( data ) {
  console.log('new event received!', data );
};
```

These WebSockets speak JSON-RPC, and specifically expose these methods:
- `ping`, which should be responded to with a "pong" result.
- `patch`, which provides an array of operations to execute on a resource (via 
  [the JSON-PATCH specification][json patch])
- `subscribe` will expect a `channel` parameter that matches the "collection"
name of the expected resource (see below).
- `unsubscribe` is the inverse of `subscribe`, as you've surely gathered.


##### Multiplexing
WebSockets are not limited to a single resource – you can submit a `subscribe`
(or an `unsubscribe`) RPC call to add additional subscriptions to an existing
connection:

```javascript
var ws = new WebSocket('ws://localhost:9200/people');
ws.on('open', function() {

  var JSONRPCEvent = {
    jsonrpc: '2.0',
    method: 'subscribe',
    data: {
      channel: '/examples'
    }
  };

  ws.send( JSON.stringify( JSONRPCEvent ) );
});
```

The `ws` connection will now receive updates to both the `Example` and the
`People` Resources.

### Sources
Resources can automatically be collected from outside sources, including local
files and even remote HTTP services.  This is useful for querying APIs, or
keeping some versioned data in an accessible JSON-formatted data file.

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

**Important:** Resources currently bypass any middleware.  Do not expect hooks
to work on static content.

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

#### Requirements
Any resource can have additional requirements when requested via a non-
programmatic endpoint (such as a rendered HTML view).  You can them via the 
`requires` property:

```javascript
maki.define('Example', {
  requires: {
    'Release': {
      filter: { isExample: true }
    }
  }
});
```

You can also supply a function, which will be executed at query time, with
`this` supplied as the context:

```javascript
maki.define('Example', {
  requires: {
    'Release': {
      filter: function() {
        return { _example: this._id }
      }
    }
  }
});
```

#### Population
Not unlike [Requirements](#requirements), Resources with nested objects can have
`populate()` called on it.

```javascript
maki.define('Example', {
  requires: {
    'Release': {
      populate: '_person'
    }
  }
});
```
This is passed directly to the internal query, and will be attached to the
required subdocuments.


[procure]: https://www.npmjs.com/package/procure
[json patch]: https://tools.ietf.org/html/rfc6902
