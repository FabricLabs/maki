var test = require('tape');

test('basic structure', function (t) {
  var FakeData = require('./fake/data');
  var FakeState = require('./fake/state');
  var FakeUX = require('./fake/ux');
  var Maki = require('../');

  var app = Maki({
    data: FakeData,
    state: FakeState,
    ux: FakeUX
  });

  t.ok(app, 'creates an app');
  t.ok(app.data, 'has data');
  t.ok(app.state, 'has state');
  t.ok(app.ux, 'has ux');

  t.end();
});
