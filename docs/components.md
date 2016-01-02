---
title: Maki Components
description: Client-side architecture for a new, distributed web.
---

Maki's client-side architecture requires the use of several familiar
technologies, but combined in a unique way.  We are aiming first and foremost
for to portability of Maki applications, which includes several features in our
roadmap, including an offline-first architecture.

The first and most important factor in our design is extending [Maki
Resources][resources] with a **Component Architecture**.  For each Resource in a
Maki application, a single bundle of isolated markup and JavaScript should
represent the basic UI control for interacting with instances of that Resource.
We will call these Components.

We can use any combination of technologies to define what a Maki "Component" is,
including Web Components (even through Polymer), React JSX, or Angular modules,
but **they must be isolated and portable**.  Ideally, a single file can
represent a Component, but also be broken out into a folder structure to
separate markup, style, and behavior.

The most novel addition we provide to the Component is **the context URI**,
which is a single identifier that the Component will "bind" to.  It should only
require this URI to subscribe to updates to the Resource instance behind the
Component, and serve events to that Resource instance as the user interacts with
it.

Our initial prototype **does not require a robust implementation**, though we
may be able to achieve one with some combination of React or pure Web
Components.  Our initial prototype _does_ require real-time updates, and ideally
would also result in a "master" Component that includes several sub-Components
to implement what is, in effect, a SPA (single page application).  Discussion on
this item pending.

**Current Status**
Currently, Maki Resources have a single Jade template dedicated to each "method"
available to that Resource; the "view" method is the most obvious, while "query"
(read: list) and "edit" are separated.  We'd like to unify at least the "view"
and "edit" methods in a default auto-generated Component, which will perhaps use
a local HTML `contenteditable` value when switched into an "edit" mode
(hopefully, a clever UX designer will figure out the best interaction model for
this).

**Future Goals**
Every Maki Resource will have at least one Component, but can be extended with
more customized Components for differing views, specific to the application
designer.

Components should operate within a context, and have the ability to communicate
with both Web Workers and Service Workers through a common plugin / messaging
interface.  All Components must share the same messaging interface, in much the
same way they must share the ability to use a context URI.

[resources]: https://maki.io/docs/resources
