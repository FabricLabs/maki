# What is Fabric?
Fabric is a network of components that when used together, provide a secure,
reliable, and trustworthy infrastructure for the deployment and maintenance of
specially-crafted software programs.  Users of this network enjoy economic
rewards for delivering value to the network, and in exchange the network
achieves its goal of widely distributing secure, censorship-resistant
applications.

## Components
At its core, Fabric consists of three primary components.

- Peer-to-Peer Network
- Content Storage Layer
- Component Registry

These components operate in concert to deliver all of the necessary
infrastructure a distributed application requires to function.  By using this
network, we can reliably publish an application, run it in a distributed
environment with many users, and securely distribute updates to those users.

### Peer to Peer Network
Connections between participating members of the Fabric network are coupled with
Payment Channels, a mechanism supported by the Bitcoin protocol for making
rapidly-adjusted "micropayments" between those peers.

Network clients may broadcast `request` messages, asking for the delivery of 
a particular piece of addressable content.

Message relay fees are attached to each message, providing a maximum amount of
"pool" for a fulfilled request.  Each peer along the routing path may dip from
this pool, adding their own output (and signing it) to the message chain, before
it is finally returned to the requesting party who signs and completes the final
transaction before broadcasting it on the network.

In this way, peers are incentivized to keep data on-hand, or to establish direct
relationships with other peers that keep the data they are interested in.


```js
{
  @id: 'deadbea195bebfb1b6a...',
  @root: 'dbabb652bdbebfbabgbcb702...', // root transaction available for pool
  @signature: 'abc123...',
}
```


## Resource Driven Design
Distributing arbitrary applications presents a number of challenges.  Perhaps
the most difficult of them all is the Halting Problem, which manifests itself
from any Turing-complete system.  This makes it difficult to utilize existing
programs in a distributed system, and has resulted in what we believe to be
unnecessary complexity in production networks.

We present a new approach, Resource Driven Design, which allows applications to
be constructed in such a way that their behavior can be modeled entirely at
compile time.  This model relies on previous work in Functional Programming (FP)
and extends Alan Kay's work on distributed messaging systems.

## How does Fabric work?
Alice wants to run an application that Bob has published.  Bob, having shared 
the name of his application, "melody", with Alice, is a developer that is using
Maki to describe the behavior of his application to the Fabric network.  These
behaviors are described in a registry, and bundled as a group in the application
registry.

Alice checks the registry for the latest definition of "melody", verifies the
definition against Bob's previously published identity (is the definition signed
by Bob's key?), and loads the application into the Fabric environment.  On first
load, Alice requests a specific resource that is provided by the application,
generally the root resource, or `/`.  Alice's local Fabric node also returns the
hash of the latest known state of that resource, which is subsequently requested
of the rest of the network and passed into the application renderer.  Alice,
being an enterprising individual, keeps a copy of the state in her local
database for later re-use.

Alice has just executed the `melody:root:query` method, which returns an object
representation of the underlying state for the `root` resource.





A special collection, `Messages`, is held.

Each state mutation received from the network is validated (does the signature
meet expectations), applied to the local node's database, then the overall state
recalculated.  The initial state and resulting state are now referenced by two
hashes, and the latter can be deterministically generated when the transaction
is combined with the former.  Once the process is complete, a new transaction is
constructed, signed by the observing peer, and then broadcast to the network.

As confirmations of matching results are received from the network, or from the
"swarm", the confidence in the accuracy and permanence of a particular state
mutation increase.

### Root Resources
The following Resources are exposed by _all_ Maki-powered applications, and by 
default they require a `root` token to modify (by default).

- `/components` - all components in use by the application (as a bundle, top-level, or individually at `/components/:name`)
- `/resources` - all resources in use by the application (as a bundle, top-level, or individually at `/resources/:name`)
- `/assets` - all files that might be necessary, list at index and direct download via pathed names, i.e., name: `/images/avatar.png` would be accessible via route `/assets/:name` as `/assets/images/avatar.png` as the key-tip lookup resolves to the `Assets.get` query on a resource that has a `name` field specified.
