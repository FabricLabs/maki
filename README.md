Maki
==============
[![Build Status](https://travis-ci.org/martindale/maki.svg)](https://travis-ci.org/martindale/maki)
[![Coverage Status](https://coveralls.io/repos/martindale/maki/badge.png?branch=master)](https://coveralls.io/r/martindale/maki?branch=master)

Maki is a framework for hand-rolling web applications in a way that makes sense to a human.

- **REST API built-in.**  All URIs are semantic and indempotent, automatically.
- **Client-Responsiveness.**  Don't rely on user-agents or referers, but instead respond to what the client supports.  Make a request that only accepts JSON?  Get JSON back.  Accept HTML?  Get HTML back.
- **Javascript _optional_.**  If the client doesn't have Javascript enabled, applications built with Maki will continue to work using pure HTML.  When Javascript _is_ available, a performant and well-designed client-side application takes over to eliminate full-page loads.  See also [Modules](#modules).

### Definitions
In general, we'll be using the proper noun form of these definitions when referring to them explicitly.

- **Application:** the executable process that binds Resources and their associated Models, Controllers, and Views into a deliverable Service.
- **Resource:** the abstract concept of an interactive object.  For example, a "user" of a website is a Resource, and can be interacted with; created (registered), listed (page displaying a list of users), and viewed (profile page).  Resources generally expose one or more identifiers, or Uniform Resource Identifiers (URI).
- **Module:** a collection of **renderables** (html, lexers, etc.) and **their associated styling**.  For example, in an HTML context, a **Module** consists of HTML, Javascript, and associated CSS for styling.
- **Model:** the abstract class that exposes a Resource's Schema and associated validators, methods, and statics.
- **Controller:** the code associated with specific interactions on a Resource and the behavior of the Application.
- **View:** logic and template for displaying a specific Resource.  This generally contains logic and is dependent on context.  A View MAY compose several Modules.
- **Service:** the offering of your app / website / api via various protocols (HTTP, WebSockets, gopher, etc.)

## Resource-Driven Development (RDD)
Generally, programming web applications involves writing logic around a series of Resources to control their behavior and deliver an experience with the application's "Scope".  Maki aims to _start_ with that mental model of your application's "Scope", allow you to **hand-roll** (get it?) extensions (read: add business logic) to that mental model, and then deliver that model as a Service.

**Example Maki Application**
All URIs are automatically derived from the the Resource definition.
```javascript
var config = require('./config');

var Maki = require('maki');
var maki = new Maki( config );

maki.define('Person', {
  attributes: {
    name: { type: String , max: 80 },
    slug: { type: String , max: 80 , id: true }
  }
});

maki.start();
```
That's it.  That's all you need.  A `GET` request to `/people` will now provide a list of people:

```bash
> curl http://localhost:9200/people
[{"slug": "martindale", "name": "martindale"}]
```
Requesting an HTML version of that Resource will give you exactly that:
```bash
> curl -H "Accept: text/html" http://localhost:9200/people
<!DOCTYPE html>
<html>
<!-- rendered version of the resource snipped -->
...
```
Similarly, you can subscribe to updates to that same Resource by switching to the `ws://` protocol:
```javascript
var socket = new WebSocket( 'ws://localhost:9200/people' );
socket.onmessage = function(msg) {
  // receive an event here
  console.log('received event, method: ' + JSON.parse(msg).method );
}
```
This newly-opened websocket will, by default, be subscribed to all updates to the `people` Resource, including new additions to the underlying collection, or modifications to the elements contained therein.

For convenience, Maki exposes some basic methods to the client. Here's the same request using the convenience methods:
```javascript
maki.sockets.subscribe('/people');
```
You can subscribe to multiple resources on a single socket, as follows:
```javascript
maki.sockets.subscribe('/people');
maki.sockets.subscribe('/examples');
```
Maki's events utilize [JSON-RPC 2.0](http://www.jsonrpc.org/specification), allowing for a clearly defined interaction model with error handling and simple concurrency.

Updates from the server are additionally encapsulated using [RFC 5789, PATCH Method for HTTP](http://tools.ietf.org/html/rfc5789).  This allows for complex, but _atomic_ updates of specific resources that might be cached locally (server -> client) or updated remotely (client -> server).  For further explanation HTTP PATCH, see [Mark Nottingham's explanation of the problem](https://www.mnot.net/blog/2012/09/05/patch).

#### Reconnection
Maki's sockets are resilient to latency, network connectivity issues, and multiple-tenant environments, for up to 24 hours (configurable).  The server will intelligently clean up idle sockets, and clients will intelligently reconnect using a pre-configured back-off strategy.

### Dependency Injection
Often, a single Resource we need other Resources to be contextualized into a View.  For example, viewing a "Person" (viewing a profile page) may require collecting a list of "Projects" (another resource, a subcollection of documents _owned_ by a Person), but the JSON representation of that View is not an accurate representation of the Resource.  For this case, _only_ the HTML context of the View will collect the necessary dependencies.

**person.jade**
```jade
extends layouts/default

block content

  h1 #{person.name}
  
  h2 Projects
  ul
    each project in projects
      include partials/project
  
```

This will allow Maki to collect the "projects" Resource as a subcollection of the Person Resource, or more specifically, only within this View.  The JSON View will _not_ collect Projects, and subsequently spare [precious] server time.

### PubSub
WebSockets exposed by Maki are, by default, subscribed to the Resource exposed by the path you're connecting to.  For example, `ws://localhost:9200/people` will subscribe to the People resource, as defined by Maki.  This may not be ideal for subscribing to multiple (or _many_ resources), so Maki allows for multi-plexing on single websocket connections:

```javascript
maki.sockets.subscribe('/examples');
```

In pure Javascript (without Maki):
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

In both of the above examples, the currently open WebSocket will now receive events for both the `/people` and the `/examples` paths (or rather, the Resources _exposed_ by those paths).

## Architecture
Maki's architecture is Resource-centric.  All aspects of the datastore, its query pipeline, the business logic, and view layer are derived from the definition of the Resources your application exposes.

TODO: IMAGE HERE

TODO: explanation here.


## Instructions
You'll need [node.js](http://nodejs.org) and [mongodb](http://mongodb.org) to run this application.  Installing these is out-of-scope, and instructions are contained on the links to the left.

1. Clone the project (you can download the zip above or use git)
2. In the project's folder, run `npm install`.  Wait for it to install all necessary components.
3. Run `node maki.js`.

You'll now, by default, have a web application running at http://localhost:9200 -- you can edit the port by changing config.js.

## Default Directory Structure
Maki is meant to be understood without context or documentation, and as such the directory structure [and the code itself, for that matter] _should_ be fairly self-explanatory.  Nevertheless, here's an explicit declaration for each of the default folders and their intended use.
```bash
.
├── app             # contains the traditional MVC "app"
│   ├── controllers # application-specific logic
│   ├── models      # models (schemas, their validators, methods, and statics)
│   └── views       # composable elements for rendering HTML, JSON, or XML
├── config          # configuration files (generally overridden by environment variables)
├── data            # data files for use in various places.
├── lib             # various classes / prototypes
├── private         # resources not exposed to the client (LESS, etc.).  This is a 1:1 map of the public folder
│   └── css         # contains the LESS files used to generate the **public** CSS files (currently, autogenerated using asset-rack)
├── public          # resources exposed to the client (images, CSS, etc)
│   ├── css         # CSS
│   ├── fonts       # Fonts (.woff, etc.)     
│   ├── img         # Images   
│   └── js          # JavaScript  
└── tests           # Tests.  Write them.
```

### NPM
We use NPM for package management, exclusively.  You will see in the above folder that `node_modules` is not present; that's because you should consider it ephemeral and **never touch it**.  Let NPM do what it does best: manage packages.

## Recommended Deployment
I use [pm2](https://github.com/unitech/pm2) (`npm install pm2 -g`) to manage node apps in production, and I strongly recommend you do, too.  It's got awesome features like log management, process clustering, and automatic startup scripts.

For Maki by itself, `pm2 start maki.js` will produce the following:
```bash
> pm2 start maki.js 
PM2 Process launched
┌──────────┬────┬─────────┬───────┬────────┬───────────┬────────┬─────────────┬─────────────┐
│ App name │ id │ mode    │ PID   │ status │ restarted │ uptime │      memory │    watching │
├──────────┼────┼─────────┼───────┼────────┼───────────┼────────┼─────────────┼─────────────┤
│ maki     │ 0  │ cluster │ 93966 │ online │         0 │ 0s     │ 25.652 MB   │ unactivated │
└──────────┴────┴─────────┴───────┴────────┴───────────┴────────┴─────────────┴─────────────┘
 Use `pm2 desc[ribe] <id>` to get more details
```

You can check on running processes using `pm2 ls`.  For example, on a server with multiple running services:
```bash
> pm2 ls
┌────────────┬────┬─────────┬───────┬────────┬───────────┬────────┬──────────────┬─────────────┐
│ App name   │ id │ mode    │ PID   │ status │ restarted │ uptime │       memory │    watching │
├────────────┼────┼─────────┼───────┼────────┼───────────┼────────┼──────────────┼─────────────┤
│ para       │ 0  │ cluster │ 21140 │ online │         0 │ 14d    │  69.734 MB   │ unactivated │
│ worker     │ 1  │ cluster │ 21142 │ online │         0 │ 14d    │  83.996 MB   │ unactivated │
│ bot        │ 2  │ cluster │ 21223 │ online │         1 │ 14d    │ 115.543 MB   │ unactivated │
│ maki       │ 3  │ cluster │ 21154 │ online │         0 │ 14d    │  92.676 MB   │ unactivated │
│ soundtrack │ 4  │ cluster │ 32655 │ online │         3 │ 18h    │ 324.176 MB   │ unactivated │
└────────────┴────┴─────────┴───────┴────────┴───────────┴────────┴──────────────┴─────────────┘
 Use `pm2 desc[ribe] <id>` to get more details
```

For production monitoring, see also `pm2 monit`, `vtop` (available via `npm install vtop -g`), and [StrongLoop](http://strongloop.com/).

Use environment variables for configuration.  See `config/index.js` for a list of configurable values.

## Spirit
Please feel free to submit changes to this repo via pull requests!  We're trying to keep this as general and flexible as possible, so anyone can take the project and run with it.
