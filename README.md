Maki
==============

Maki is a framework for hand-rolling web applications in a way that makes sense.

- **REST API built-in.**  All URIs are semantic and indempotent, automatically.
- **Client-Responsiveness.**  Don't rely on user-agents or referers, but instead respond to what the client supports.  Make a request that only accepts JSON?  Get JSON back.  Accept HTML?  Get HTML back.
- **Javascript _optional_.**  If the client doesn't have Javascript enabled, applications built with Maki will continue to work using pure HTML.  When Javascript _is_ available, a performant and well-designed client-side application takes over to eliminate full-page loads.

## Instructions
You'll need [node.js](http://nodejs.org) and [mongodb](http://mongodb.org) to run this application.  Installing these is out-of-scope, and instructions are contained on the links to the left.

1. Clone the project (you can download the zip above or use git)
2. In the project's folder, run `npm install`.  Wait for it to install all necessary components.
3. Run `node maki.js`.

You'll now, by default, have a web application running at http://localhost:9200 -- you can edit the port by changing config.js.

## Spirit
Please feel free to submit changes to this repo via pull requests!  We're trying to keep this as general and flexible as possible, so anyone can take the project and run with it.
