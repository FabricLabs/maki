---
title: Running Maki in Production
description: How to run a Maki-built app in a production environment.
source: https://github.com/martindale/maki/blob/community/source/snippets/production.md
edit: https://github.com/martindale/maki/edit/community/source/snippets/production.md
---

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
