---
title: Maki, Fabric, and How to Contribute
description: Plug yourself into the Maki community.  Here's how.
source: https://github.com/martindale/maki/blob/community/source/snippets/introduction.md
edit: https://github.com/martindale/maki/edit/community/source/snippets/introduction.md
masthead: /img/digital-texture.jpg
---

**Great.  You've made it! Now what?**  No matter what kind of person you are, or
what skills you bring to the table, **there's something you can contribute**.
We're taking great care to organize things in a way that allows you to bite
things off in five-minute chunks, or to dedicate entire weeks of work at a time. 

## Important Links
- [Why are we here?][why-are-we-here]
- [Maki vs. Fabric: What's the Difference?][maki-vs-fabric]
- [Fabric Protocol Specification][fabric-protocol]
- [[DRAFT] Community Guidelines][community-guidelines]
- [Outstanding Community Tasks][outstanding-tasks]

## The Basics
Right now, the core of our community is in [the Maki Slack][chat].  Slack is a
convenient tool that helps us all tune in, without being overwhelmed — and for a
project of _our_ scale, that's incredibly important<sup>1</sup>.

First and foremost, install both [the Desktop and Mobile apps][slack-apps].
You'll need to enter our team domain, which is `maki-dev` for your reference!
It'll look something like this:

![Enter Team Domain](http://i.imgur.com/2IOfy31.png) ![Maki Community Slack](http://i.imgur.com/fHuhMvW.png)

Follow the flow until you're signed in and looking at [the #community
channel][#community].  This is the heart and soul of who we are, so take a
moment and breathe it all in — then **say hello to everyone!**

Your first message should tell us a bit about who you are, what excites you, and
what you're working on.  If you don't have a project yet, check [the #projects 
channel][#projects] for some ideas.

<small>1: Slack is _nailing_ the user experience for team chat.  Check out [this
amazing Slack pitch](https://www.youtube.com/watch?v=W8_tGC8pNvI) they put
together.  We're already building a replacement for Slack, powered by Maki and
Fabric, but we won't launch it until we're supremely satisfied with it!  If
that's something you want to help with, check [the #product
discussion][#product]!</small>

### Notifications
Now, you'll want to take a moment to familiarize yourself with the notification
preferences:

![Notification Options](http://i.imgur.com/IG4Jglp.png)

You can configure this for your devices individually, so you can fine-tune your
level of engagement to suit your own personal needs.  **We recommend keeping the
default configuration for at least a week or two before deciding to turn down
the volume!**

Now that we're acquainted, let's find some interesting conversations!

### Channels as Topics of Interest
Since we're not a company, or even a formalized entity at all, the Maki
Community organizes its Slack channels topically.  Click the "Channels" header
on the left to see a list of the subjects we're interested in:

![Channels List](http://i.imgur.com/h5BWt5q.png)

Each and every one of these topics are important areas of discussion for the
broader vision.  We're looking for leaders in each of these areas, so go ahead
and join whatever subjects you find interesting.

#### Some Special Channels
There's a few special channels that aren't topical, but do have a specific
purpose.

- [#community][#community]: the watercooler where everyone hangs out!  Introductions and general chatter.
- [#meta][#meta]: discussion about how to grow the community itself.
- [#projects][#projects]: we announce and discuss the creation of new Maki-powered projects here.
- [#hacking][#hacking]: when we're coordinating on a weekend hack, we'll chat here!
- [#development][#development]: this is where engineering work on Maki and Fabric take place.  Try not to tap on the glass, there are engineers at work!
- [#meetups][#meetups]: most of us met each other through the Internet.  This is where we organize in-person gatherings, to grab a [#beer][#beer] or three together!
- [#random][#random]: like [#community][#community] but with more of a "look what I found while browsing" feel. If you can't figure out where to share a meme or an article, try putting it here.

For each of these channels, you can check the "topic" and "purpose" by clicking
the link.  These will change from time-to-time, so make sure to glance at them!

#### Keeping Track: Starring Channels
We know there's a lot going on.  For that reason, we like to use the "Starred
Channel" feature to keep the topics we're most interested in at the top of our
list:

![Starring a channel](http://i.imgur.com/65p57Dc.png)

Just click the little star icon to keep a channel at the top!

#### Purpose, Topic, and Pinned Items
Each channel in the Maki Slack is a conversation, with its own community and
objectives.  The best way to get a feel for what's going on is to check these
three items.
    sender: { type: String },
    content: { type: String }
If you're trying to build your own community in one of our channels, keeping
these up-to-date is the most important part of your work!

- **Channel Purpose:** this can be found in the main channel list.  It describes what a channel's objective is, and probably doesn't change very much.  Useful when describing to new users what your channel is all about!
- **Channel Topic:** what is this channel currently discussing?  Upcoming dates, useful links, and newsworthy content should be placed here by the moderators.
- **Pinned Items:** if a channel has something it is currently working on, it usually can be found in Pinned Items.

![Show Channel Details](http://i.imgur.com/Pd1RxYt.png) ![Pinned Items](http://i.imgur.com/iG1Ao6v.png)

## Getting Started, for...

### Community Organizers

### Software Developers
Like any open-source project, there's a lot to do.  Especially writing code.  To keep things organized, [we use GitHub to keep track of our work](https://github.com/martindale/maki).

- **Current Work:** you'll find [a four-column KANBAN board on Waffle][waffle].  Waffle uses GitHub issues as its backend, simply adding labels to each issue to reflect its current state.
- **Assignments:** if someone has claimed something, it will be reflected in the "Assigned" field for the issue.  If an issue is interesting to you, and no one has claimed it, **comment that you'd like to take it on!**  A project maintainer will help you get started.
- **Submit Early, Commit Often!** If you start working on something, go ahead and open a Pull Request, prefixed with either `WIP: ` or `RFC: ` to reflect its "Work In Progress" or "Request For Comments" status.  This lets us engage with you at an early stage in development, and save everyone a little time later on.

#### Milestones
To keep track of our priorities and objectives, we use Milestones to group
issues into staged releases.  Upcoming is Maki 0.3, and there are a few
unclaimed tasks needing to be completed.  You can grab one of these and
contribute, if you'd like!

- [List of Maki's Milestones](https://github.com/martindale/maki/milestones)

#### Important Projects
Maki is a robust software library with several subcomponents and an entire
ecosystem of related libraries.  Here are some of the more important projects,
each with their own repository and project management process.

- [`maki-remote`][maki-remote]: the glue that holds Maki services together.  This
library connects to a remote API and makes it easy to interact with; almost like
an API client.

  ```js
  var Remote = require('maki-remote');
  var remote = new Remote('https://maki.io');
  
  remote.on('patch', function(path, ops) {
  
  });
  ```
- [`maki-auth-flex`][maki-auth-flex]: the primary authentication tool for Maki apps.  This is like an "authentication router", which lets you configure an array of login methods and identity services for any Maki application.  There are dozens of plugins, and this project will direct you to the one of your choice (or show you how to create one and contribute it to the ecosystem!)
- [`snarl`][snarl]: the default template for an agent built in the Maki ecosystem.  Snarl, in his current form, is a simple bot with an extensible plugin architecture that is used to coordinate with Maki services.

[chat]: https://chat.maki.io/
[slack]: https://www.youtube.com/watch?v=W8_tGC8pNvI
[slack-apps]: https://slack.com/downloads
[why-are-we-here]: https://maki-dev.slack.com/files/martindale/F1827U79U/Why_are_we_here_
[maki-vs-fabric]: https://maki-dev.slack.com/files/chrisinajar/F16EBB88K/Elevator_Speach
[fabric-protocol]: https://maki-dev.slack.com/files/martindale/F170LP2HL/fabric_protocol_specification.md
[community-guidelines]: https://maki-dev.slack.com/files/martindale/F1565BS5P/Community_Guidelines.md
[outstanding-tasks]: https://maki-dev.slack.com/files/martindale/F1ARP5JKV/Outstanding_Community_Tasks
[maki-remote]: https://github.com/martindale/maki-remote
[waffle]: https://waffle.io/martindale/maki
[snarl]: https://github.com/martindale/snarl

[#product]: https://maki.io/topics/product
[#community]: https://maki.io/topics/community
[#projects]: https://maki.io/topics/projects
[#meta]: https://maki.io/topics/meta 
[#hacking]: https://maki.io/topics/hacking 
[#development]: https://maki.io/topics/development 
[#meetups]: https://maki.io/topics/meetups 
[#beer]: https://maki.io/topics/beer 
