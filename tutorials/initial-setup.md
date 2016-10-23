---
title: Initial Setup
description: Get the tools you need to start making things with Maki.
source: https://github.com/martindale/maki/blob/maki.io/source/tutorials/initial-setup.md
edit: https://github.com/martindale/maki/edit/maki.io/source/tutorials/initial-setup.md
masthead: /img/digital-texture.jpg
---

<div class="ui top attached fluid three tablet stackable steps">
  <a class="active step" href="/tutorials/initial-setup">
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
  <a class="step" href="/tutorials/adding-resources">
    <i class="settings icon"></i>
    <div class="content">
      <div class="title">Resources</div>
      <div class="description">Add more functionality.</div>
    </div>
  </a>
</div>

# Initial Setup
If you're already familiar with [the developer
basics](/tutorials/developer-basics), you're ready to get your [developer
environment](/tutorials/developer-basics#environment) set up.

This process will consist of installing several new applications on your
computer that will become part of your toolbox, which you will use to craft new
applications.  Don't worry if you feel uncomfortable with your new tools,
experience will come with time and use.

This process can also be very different depending on which [operating
system](/tutorials/developer-basics#operating-system) you're using, so we
encourage you to <abbr class="tooltipped" title="Check out the Slack for help,
link above!">ask for help</abbr> if you need it.  We're going to be writing
these guides for the Mac OSX operating system.

<div class="ui info icon message">
  <i class="inbox icon"></i>
  <div class="content">
    <div class="header">Quick Tip</div>
    <p>If something doesn't work, try closing the Terminal and re-opening it!  If you still get an error on the step you're on, <a href="/topics/learning">ask for help in #learning</a>.</p>
  </div>
</div>

## Step 1: Package Manager
OSX doesn't come with an easy way of managing applications by default, so we
need to install one.  A "Package Manager" is a phrase used to describe an
application that manages the updates and upgrades to other applications – we're
going to use one called **Homebrew**, which you can learn more about at
[brew.sh](http://brew.sh/).

Installing Homebrew is simple.  Open your Terminal<sup>1</sup>, and paste the
following into it<sup>2</sup>:

```bash
ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
```

It will probably ask you for your password, which you should enter.  It will
work for some time and provide some output, with a few questions – watch and
wait, until it gives you a blinking cursor again.  At the end, it will give you
some instructions (probably to run `brew doctor`), and you should follow them.

At this point, you're done with Step 1.

<div style="font-size: 0.8em;">
  <ol>
    <li>CMD+Space, then type "terminal", and press enter.</li>
    <li>Copy and pasting from a webpage into the command line is <strong>very dangerous</strong>, so be wary when someone asks you to do it.  For now, it is the easiest way to help you!  _Some_ developers provide instructions on how to safely follow instructions such as pasting into your terminal, but not all – you'll want to learn about cryptography, TLS, and PGP if you want to be a responsible developer.  That's for a later tutorial, though.</li>
  </ol>
</div>

## Step 2: Application Runtime
Maki is an application framework built primarily with a programming language and
application runtime named **Node.js**, or just Node for short.  Node will run our
programs exactly as we instruct it to, and it gives us some features that basic
JavaScript cannot.  You can learn more about Node on its website,
[nodejs.org](https://nodejs.org).

The best way to install and manage the Node application is <abbr
class="tooltipped" title="Node Version Manager">NVM</abbr>.  Since we installed
a package manager (`brew`) in Step 1, all we need to do is type the following
into our terminal:

```bash
brew install nvm
```

Again, if it asks for your password, you should enter it to give Homebrew
permission to install NVM.  Some work will take place, and eventually you will
get a blinking cursor again.

<div class="ui message">**Protip:** if you're using Linux, use [the NVM install script](https://github.com/creationix/nvm#install-script).</div>


Now we can install a specific version of Node.  We want 4.2, so we'll instruct
NVM to give it to us:
```bash
nvm install 4.2
```

Some work will be completed, and you'll eventually be left with our friendly
blinking cursor.  Now let's make sure every time we use Node, we use this
version by default:

```bash
nvm alias default 4.2
```

You can test that Node is now correctly installed and working with the following
JavaScript "Hello World":
```bash
echo "console.log('Hello, world.');" | node
```

If it responds with a simple "Hello, world.", your work here is done.

## Step 3: Requirements
Maki currently requires a specific database, so we need to install that too:

```bash
brew install mongodb
```

**Careful:** some instructions will be output after this command that you should
read and follow.  We recommend you start MongoDB automatically, _and_ start it
immediately:

```
("code missing from tutorial")
```

<div class="ui message">**Disclaimer:** we don't know exactly what the command is, so someone will have to tell us or edit this file directly by clicking the "edit" button at the top of this page!</div>

## Step 4: Hello World
You're done, and ready to follow [the Hello World
tutorial](/tutorials/hello-world).
