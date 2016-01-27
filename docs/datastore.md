# Datastore
Maki currently supports a single datastore, MongoDB.

## Connection String
You can supply the `config.database.masters` array, or simply pass a connection
string via `config.database.string`.

## Future Plans
We will remove MongoDB as a requirement of Maki and replace it with a more
abstract datastore.
