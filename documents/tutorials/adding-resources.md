---
title: Adding Resources
description: Increase the power of your Maki app by adding Resources.  Learn how.
source: https://github.com/martindale/maki/blob/better-splash/source/tutorials/adding-resources.md
edit: https://github.com/martindale/maki/edit/better-splash/source/tutorials/adding-resources.md
masthead: /img/digital-texture.jpg
---

<div class="ui top attached fluid three tablet stackable steps">
  <a class="step" href="/tutorials/initial-setup">
    <i class="plug icon"></i>
    <div class="content">
      <div class="title">Setup</div>
      <div class="description">Get the tools you need.</div>
    </div>
  </a>
  <a class="step" href="/tutorials/hello-world">
    <i class="power icon"></i>
    <div class="content">
      <div class="title">Hello, world.</div>
      <div class="description">Create your first app.</div>
    </div>
  </a>
  <a class="active step" href="/tutorials/adding-resources">
    <i class="settings icon"></i>
    <div class="content">
      <div class="title">Resources</div>
      <div class="description">Add more functionality.</div>
    </div>
  </a>
</div>

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
