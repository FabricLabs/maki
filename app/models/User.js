var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.SchemaTypes.ObjectId
  , passportLocalMongoose = require('passport-local-mongoose')
  , slug = require('mongoose-slug');

// this defines the fields associated with the model,
// and moreover, their type.
var UserSchema = new Schema({
    username: { type: String, required: true }
  , email: { type: String, required: true }
  , created: { type: Date, required: true, default: Date.now }
});

// attach the passport fields to the model
UserSchema.plugin(passportLocalMongoose);

// attach a URI-friendly slug
UserSchema.plugin( slug( 'username' , {
  required: true
}) );

UserSchema.pre('save', function (next) {
  this.meta = {};

  this.meta.wasNew      = this.isNew;
  this.meta.wasModified = this.isModified();

  // test
  if (this.meta.wasModified) {
    this.meta.modifiedPaths = this.modifiedPaths();
    this.meta.old = this.toObject();
  }

  next();
})

UserSchema.post('save', function(doc) {
  var path = '/people';

  if (doc.meta.wasNew) {
    console.log('WAS NEW');

    // stub the pre-condition as an empty set
    var collection = [];
    // observe the empty set
    var observer = patch.observe( collection );
    // add our "new" doc
    collection.push( doc );
    // generate our patch set from the stub
    var patches = patch.generate( observer );
    // publish the patch set
    app.redis.publish( path , JSON.stringify(patches) );
  } else if (doc.meta.wasModified) {
    console.log('MODIFIED:' , doc.meta.modifiedPaths );

    var observer = patch.observe( doc.meta.old );

    // generate our patch set from the doc
    var patches = patch.generate( observer );
    // publish the patch set
    app.redis.publish( path , JSON.stringify(patches) );

  }
});

var User = mongoose.model('User', UserSchema);

// export the model to anything requiring it.
module.exports = {
  User: User
};