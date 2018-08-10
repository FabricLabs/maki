---
title: Quickly Publish Web Content with Maki
description: Launch an idea just as quickly as you can write it down.
---

Have something you want the world to know?  Great!  We're here to help.

Maki can be used to build a simple content-oriented website, displaying written
and visual content to the user without any complex functionality necessary of
larger applications.

Let's create a new Maki application, following the [Hello World][hello-world]
example.  We've added a plugin that you'll use, `maki-cms-local`, to configure
Maki resources simply by reading the `pages` folder:

### `app.js`
```js
var app = require('maki')();

var CMS = require('maki-cms-local');
var cms = new CMS({
  path: '/pages'
});

app.use(cms).start();
```

