---
title: "Signing Commit Messages"
---

We use `gpg` to verify the integrity of important documents.  Use the following
instructions to create your own key and use it to sign your work:

0. Generate a key with `gpg --gen-key`
1. Collect gpg key ID with `gpg --list-keys`
  ```
  $ gpg --list-keys
  /home/eric/.gnupg/pubring.gpg
  -----------------------------
  pub   4096R/F78BBE1E 2016-10-11 [expires: 2018-10-11]
  uid                  Eric Martindale <eric@ericmartindale.com>
  sub   4096R/609B9DF2 2016-10-11 [expires: 2018-10-11]
  ```
2. Set git to use signing key: `git config --global user.signingkey F78BBE1E`

Now, simply add the `-S` flag to your commit command:
```
$ git commit -S

You need a passphrase to unlock the secret key for
user: "Eric Martindale <eric@ericmartindale.com>"
4096-bit RSA key, ID F78BBE1E, created 2016-10-11

[0.3 0e105a9] Add new instructions for signing commits
 1 file changed, 18 insertions(+)
 create mode 100644 source/developers/signing-commits.md
```

That's it!  Your commit has now been created and signed.

You can use these signatures to verify the integrity of imported work by using the `--verify-signatures` flag:

```
$ git pull --verify-signatures upstream master
```

Git will now reject any work that is incorrectly signed.  You can also use this with the `git merge` command directly.

Enjoy!
