Maki
==============
![Project Status](https://img.shields.io/badge/status-alpha-red.svg?style=flat-square)
[![Build Status](https://img.shields.io/travis/martindale/maki.svg?branch=master&style=flat-square)](https://travis-ci.org/martindale/maki)
[![Coverage Status](https://img.shields.io/coveralls/martindale/maki.svg?style=flat-square)](https://coveralls.io/r/martindale/maki)
[![Total Contributors](https://img.shields.io/github/contributors/martindale/maki.svg?style=flat-square)](https://github.com/martindale/maki/contributors)
[![Community](https://img.shields.io/matrix/maki:fabric.pub.svg?style=flat-square)](https://chat.fabric.pub)

The complete stack for building extensible apps, faster than ever.  Hand-roll your application by telling Maki what your application does, and it takes care of the rest – without getting in your way if you want to customize it.

## Heads Up!
We're still in `alpha`!  For the latest work, please use [the `0.3` branch](https://github.com/martindale/maki/tree/0.3).  Our progress can be tracked against [the `0.3` milestone](https://github.com/martindale/maki/milestone/4), and you can [join the #development channel](https://maki.io/topics/development) to speak with the developers.

- **Write Once, Deploy Everywhere** Maki enables a standard definition for applications beyond simply web apps.  Because of our resource grammar, we can build desktop and native mobile applications directly – all in supplement to your web application.  All with the same code.
- **Resource-Derived Infrastructure**  REST makes a lot of sense for APIs – we take it one step further and build the entire application around Resources as named channels, serving events and static documents alike.  Even Desktop applications built with Maki use the same, familiar API!
- **Robust Plugin Ecosystem** Maki is an extensible framework – and there's already a huge list of plugins to provide common (and some not so common!) functionality to your application with almost zero-configuration.  For example, Maki's identity protocol allows us to support both username/password auth and cryptographic identity!

## Quick Start
You'll need [node.js](http://nodejs.org) to build a Maki application.

1. Install Maki: `npm install --save @fabric/maki`
2. Create your application, perhaps in `app.js`:
  ```javascript
  const Maki = require('@fabric/maki');

  async function main () {
    const app = new Maki();
    await app.define('Widget', {
      attributes: {
        name: { type: String }
      }
    });

    await app.start();
  }

  main();
  ```
3. Start your app: `node yourapp.js` – by default, accessible at [http://localhost:9200](http://localhost:9200)

## Behaviors
Maki applications allow you to construct pipelines, as follows:

```javascript
// same as above...
const Widget = await app.define('Widget', {
  attributes: {
    name: { type: String }
  }
});

Widget.pre('create', function(next, done) {
  var widget = this;
  // do something before creation...
  // call next() to continue creation, or done() to complete.  Pass done(err) to
  // abort the pipeline!  Useful for custom validation rules. :)
});

Widget.post('create', function() {
  var widget = this;
  // do something after creation!  This too is a pipeline – the tasks are
  // executed in the order they are injected.
});
```

### Methods
All Maki resources expose these five methods, all of which follow the above pipeline:

- **query** to select a list of documents,
- **get** to get a single instance of a document by its identifier (ID),
- **create** to create a new instance of a document,
- **update** to change properties of a document, and
- **destroy** to remove a document.

## Plugins & Modules
Maki aims to be as lightweight as possible while still offering a base stack that implements #1.  We've split out as many components as possible, and offer a list of plugins that can be used to add functionality to any Maki-powered app.

### Core Modules
| Name              | Version  |   Build Status | Coverage |
|-------------------|----------|----------------|----------|
| [maki-queue](https://github.com/martindale/maki-queue) | [![NPM Package](https://img.shields.io/npm/v/maki-queue.svg?style=flat-square)](https://www.npmjs.org/package/maki-queue) | [![Build Status](https://img.shields.io/travis/martindale/maki-queue.svg?branch=master&style=flat-square)](https://travis-ci.org/martindale/maki-queue) | [![Coverage Status](https://img.shields.io/coveralls/martindale/maki-queue.svg?style=flat-square)](https://coveralls.io/r/martindale/maki-queue) |
| [maki-mongoose-hooks](https://github.com/martindale/maki-mongoose-hooks) | [![NPM Package](https://img.shields.io/npm/v/maki-mongoose-hooks.svg?style=flat-square)](https://www.npmjs.org/package/maki-mongoose-hooks) | [![Build Status](https://img.shields.io/travis/martindale/maki-mongoose-hooks.svg?branch=master&style=flat-square)](https://travis-ci.org/martindale/maki-mongoose-hooks) | [![Coverage Status](https://img.shields.io/coveralls/martindale/maki-mongoose-hooks.svg?style=flat-square)](https://coveralls.io/r/martindale/maki-mongoose-hooks) |
| [maki-service-websockets](https://github.com/martindale/maki-service-websockets) | [![NPM Package](https://img.shields.io/npm/v/maki-service-websockets.svg?style=flat-square)](https://www.npmjs.org/package/maki-service-websockets) | [![Build Status](https://img.shields.io/travis/martindale/maki-service-websockets.svg?branch=master&style=flat-square)](https://travis-ci.org/martindale/maki-service-websockets) | [![Coverage Status](https://img.shields.io/coveralls/martindale/maki-service-websockets.svg?style=flat-square)](https://coveralls.io/r/martindale/maki-service-websockets) |
| [maki-forms](https://github.com/martindale/maki-forms) | [![NPM Package](https://img.shields.io/npm/v/maki-forms.svg?style=flat-square)](https://www.npmjs.org/package/maki-forms) | [![Build Status](https://img.shields.io/travis/martindale/maki-forms.svg?branch=master&style=flat-square)](https://travis-ci.org/martindale/maki-forms) | [![Coverage Status](https://img.shields.io/coveralls/martindale/maki-forms.svg?style=flat-square)](https://coveralls.io/r/martindale/maki-forms) |

### Plugins
| Name              | Version  |   Build Status | Coverage |
|-------------------|----------|----------------|----------|
| [maki-sessions](https://github.com/martindale/maki-sessions) | [![NPM Package](https://img.shields.io/npm/v/maki-sessions.svg?style=flat-square)](https://www.npmjs.org/package/maki-sessions) | [![Build Status](https://img.shields.io/travis/martindale/maki-sessions.svg?branch=master&style=flat-square)](https://travis-ci.org/martindale/maki-sessions) | [![Coverage Status](https://img.shields.io/coveralls/martindale/maki-sessions.svg?style=flat-square)](https://coveralls.io/r/martindale/maki-sessions) |
| [maki-passport-local](https://github.com/martindale/maki-passport-local) | [![NPM Package](https://img.shields.io/npm/v/maki-passport-local.svg?style=flat-square)](https://www.npmjs.org/package/maki-passport-local) | [![Build Status](https://img.shields.io/travis/martindale/maki-passport-local.svg?branch=master&style=flat-square)](https://travis-ci.org/martindale/maki-passport-local) | [![Coverage Status](https://img.shields.io/coveralls/martindale/maki-passport-local.svg?style=flat-square)](https://coveralls.io/r/martindale/maki-passport-local) |
| [maki-passport-github](https://github.com/martindale/maki-passport-github) | [![NPM Package](https://img.shields.io/npm/v/maki-passport-github.svg?style=flat-square)](https://www.npmjs.org/package/maki-passport-github) | [![Build Status](https://img.shields.io/travis/martindale/maki-passport-github.svg?branch=master&style=flat-square)](https://travis-ci.org/martindale/maki-passport-github) | [![Coverage Status](https://img.shields.io/coveralls/martindale/maki-passport-github.svg?style=flat-square)](https://coveralls.io/r/martindale/maki-passport-github) |
| [maki-passport-soundcloud](https://github.com/martindale/maki-passport-soundcloud) | [![NPM Package](https://img.shields.io/npm/v/maki-passport-soundcloud.svg?style=flat-square)](https://www.npmjs.org/package/maki-passport-soundcloud) | [![Build Status](https://img.shields.io/travis/martindale/maki-passport-soundcloud.svg?branch=master&style=flat-square)](https://travis-ci.org/martindale/maki-passport-soundcloud) | [![Coverage Status](https://img.shields.io/coveralls/martindale/maki-passport-soundcloud.svg?style=flat-square)](https://coveralls.io/r/martindale/maki-passport-soundcloud) |
| [maki-analytics](https://github.com/martindale/maki-analytics) | [![NPM Package](https://img.shields.io/npm/v/maki-analytics.svg?style=flat-square)](https://www.npmjs.org/package/maki-analytics) | [![Build Status](https://img.shields.io/travis/martindale/maki-analytics.svg?branch=master&style=flat-square)](https://travis-ci.org/martindale/maki-analytics) | [![Coverage Status](https://img.shields.io/coveralls/martindale/maki-analytics.svg?style=flat-square)](https://coveralls.io/r/martindale/maki-analytics) |
| [maki-forms](https://github.com/martindale/maki-forms) | [![NPM Package](https://img.shields.io/npm/v/maki-forms.svg?style=flat-square)](https://www.npmjs.org/package/maki-forms) | [![Build Status](https://img.shields.io/travis/martindale/maki-forms.svg?branch=master&style=flat-square)](https://travis-ci.org/martindale/maki-forms) | [![Coverage Status](https://img.shields.io/coveralls/martindale/maki-forms.svg?style=flat-square)](https://coveralls.io/r/martindale/maki-forms) |
| [maki-types-file](https://github.com/martindale/maki-types-file) | [![NPM Package](https://img.shields.io/npm/v/maki-types-file.svg?style=flat-square)](https://www.npmjs.org/package/maki-types-file) | [![Build Status](https://img.shields.io/travis/martindale/maki-types-file.svg?branch=master&style=flat-square)](https://travis-ci.org/martindale/maki-types-file) | [![Coverage Status](https://img.shields.io/coveralls/martindale/maki-types-file.svg?style=flat-square)](https://coveralls.io/r/martindale/maki-types-file) |
| [maki-assets](https://github.com/martindale/maki-assets) | [![NPM Package](https://img.shields.io/npm/v/maki-assets.svg?style=flat-square)](https://www.npmjs.org/package/maki-assets) | [![Build Status](https://img.shields.io/travis/martindale/maki-assets.svg?branch=master&style=flat-square)](https://travis-ci.org/martindale/maki-assets) | [![Coverage Status](https://img.shields.io/coveralls/martindale/maki-assets.svg?style=flat-square)](https://coveralls.io/r/martindale/maki-assets) |
| [maki-client](https://github.com/martindale/maki-client) | [![NPM Package](https://img.shields.io/npm/v/maki-client.svg?style=flat-square)](https://www.npmjs.org/package/maki-client) | [![Build Status](https://img.shields.io/travis/martindale/maki-client.svg?branch=master&style=flat-square)](https://travis-ci.org/martindale/maki-client) | [![Coverage Status](https://img.shields.io/coveralls/martindale/maki-client.svg?style=flat-square)](https://coveralls.io/r/martindale/maki-client) |
| [maki-cms-local](https://github.com/martindale/maki-cms-local) | [![NPM Package](https://img.shields.io/npm/v/maki-cms-local.svg?style=flat-square)](https://www.npmjs.org/package/maki-cms-local) | [![Build Status](https://img.shields.io/travis/martindale/maki-cms-local.svg?branch=master&style=flat-square)](https://travis-ci.org/martindale/maki-cms-local) | [![Coverage Status](https://img.shields.io/coveralls/martindale/maki-cms-local.svg?style=flat-square)](https://coveralls.io/r/martindale/maki-cms-local) |

## Documentation
For our documentation, see the `docs/` subfolder.

## Contributors
- [@martindale](https://github.com/martindale)
- [@chrisinajar](https://github.com/chrisinajar)
- [@jlukic](https://github.com/jlukic)
- [@unusualbob](https://github.com/unusualbob)
- [@overra](https://github.com/overra)
- [@unChaz](https://github.com/unChaz)
- [@toriborealis](https://github.com/toriborealis)

Special thanks to [the whole Maki community](https://maki.io/people) for supporting this project with their presence and more.

Many, many other contributors deserve recognition for their work on the open source projects that have made Maki possible.  See `package.json` for just a few of them.

## Spirit
Please feel free to submit changes to this repo via pull requests!  We're trying to keep this as general and flexible as possible, so anyone can take the project and run with it.
