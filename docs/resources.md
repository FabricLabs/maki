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
