---
title: "Signing Commit Messages"
---

We use `gpg` to verify the integrity of important documents.  Use the following
instructions to create your own key and use it to sign your work:

0. Generate a key with `gpg --gen-key`
1. Collect gpg key ID with `gpg --list-keys`


```
$ gpg --list-keys
pub   4096R/F78BBE1E 2016-10-11 [expires: 2018-10-11]
uid                  Eric Martindale <eric@ericmartindale.com>
sub   4096R/609B9DF2 2016-10-11 [expires: 2018-10-11]

```
