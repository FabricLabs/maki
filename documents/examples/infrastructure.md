---
title: Using Maki for Infrastructure Projects
description: Quickly build APIs and services!
masthead: false
---

Maki makes a pretty darn good&trade; server for REST APIs.  By creating Resources for each type of "object" in your infrastructure, you can spin up an API pretty quickly.

```js
var Maki = require('maki');
var app = new Maki();

app.define('Item', {
  attributes: {
    name: String
  }
});

app.start();
```

You can view your newly created app's API at https://localhost:9200/api.

Add resources as per your desire.  That's it!
