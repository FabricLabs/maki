
module.exports = Maki;

function Maki (opts) {
  // expect data, state, ux
  // i dunno about ui... i'm not sure if it connects here
  // it might connect to a running instance
  // as opposed to at application definition time
  if (!opts.data) {
    throw new Error('You must specify a data layer');
  }
  if (!opts.state) {
    throw new Error('You must specify a state layer');
  }
  if (!opts.ux) {
    throw new Error('You must specify a ux layer');
  }
  var Data = opts.data;
  var State = opts.state;
  var UX = opts.ux;

  var app = {
    data: Data(),
    state: State(),
    ux: UX()
  };

  app.state.loadBindings(app.data);

  // connect the state to the UX layer
  app.state.onUpdate(app.ux.update);

  return app;
}

Maki.something = 'nothing';
