var Pusher = require('./pusher');
var Vector = require('./vector').Vector;

var pusher = new Pusher('83d652b1c3204e365939', {
  secret_key: '5d1c2e1eef265f638e6f',
  channel_data: {
    user_id: 'SERVER',
    user_info: {}
  }
});

var sync_channel = pusher.subscribe('presence-sync');

sync_channel.bind('pusher:subscription_succeeded', function(members){
   members.each(function(member) {
     if (member.id != 'SERVER')
       addShip(member.id);
   })
});

sync_channel.bind('pusher:member_added', function(member) {
  addShip(member.id)
})

sync_channel.bind('pusher:member_removed', function(member) {
})

var dir = {left: 37, right: 39, up: 38, down: 40}

sync_channel.bind('client-keypress', function(data) {
  debug('keypress' + data.keyCode)
  var ship = ships[data.memberId];
  if (!ship){ debug('no ship', data.memberId); return  }
  
  if (data.keyCode == dir.right) { ship.heading += 16.0 }
  if (data.keyCode == dir.left)  { ship.heading -= 16.0 }
  if (data.keyCode == dir.up)    { thrust(ship) }
  if (data.keyCode == dir.down)    { brake(ship) }
});

var ships = {};

var addShip = function(member_id){
  var newShip = {
    id: member_id,
    position: new Vector(100.0, 100.0),
    vector: new Vector(0.0, 0.0),
    heading: 0.0
  };
  ships[member_id] = newShip;
  debug('New ship added: ' + member_id)
}
  
// var ship = new Ship();
var RAD = Math.PI/180.0;
var TWOPI = Math.PI*2;



function thrust(ship, ts){
  // generate a small thrust vector
  var t = new Vector(0.0, -0.55)
  // rotate thrust vector by player current heading
  t.rotate(ship.heading * RAD)
  ship.vector.add(t)
}
function brake(ship, ts){
  ship.vector = new Vector(0.0, 0.0)
}

// MAIN GAME LOOP
// Send out the latest worldstate (positions, headings etc..) to all clients a few times a second
setInterval(function(){
  var positions = {};
  for (i in ships) {
    // Move the ship
    ships[i].position.add(ships[i].vector);
    // Create a collection with all positions
    positions[i] = {x:ships[i].position.x, y:ships[i].position.y, heading:ships[i].heading}
    debug('x:'+positions[i].x+',y:'+positions[i].y)
  }
  // Send latest positions to all clients
//  console.log(positions)
  sync_channel.trigger('client-worldstate', {positions:positions})
}, 100)

var debug = function(msg){
//  console.log(msg)
}


var http = require('http'),
    qs = require('querystring'),
    path = require('path'),
    connect = require('connect');

var WEBROOT = path.join(path.dirname(__filename), 'public')

var server = connect.createServer(
  connect.favicon(),
  connect.cookieParser(),
  connect.session({secret: 'Pusher is damn awesome.'}),
  (function(req, res, next) {
    if (!req.session.user_id) {
      req.session.user_id = "user-" + Math.floor(Math.random() * 0x7FFFFFF);
    }
    next();
  }),
  connect.router(function(app) {
    app.post('/pusher/auth', function(req, res, next) {
      var ajax_data = '';

      req.setEncoding('utf8');
      req.on('data', function(data) {
        ajax_data += data;
      });

      req.on('end', function() {
        var querystring = qs.parse(ajax_data);

        var token = pusher.createAuthToken(querystring.channel_name, querystring.socket_id, {
          user_id: req.session.user_id,
          user_info: {
            name: req.session.user_id
          }
        });

        var body = JSON.stringify(token);

        res.writeHead(200, {
          'Content-Length': body.length,
          'Content-Type': 'application/json'
        });

        res.end(body);
      });
    });
    
    app.get('/user_id.js', function(req, res, next) {
      var body = "window['user_id'] = '" + req.session.user_id +"';";
      
      res.writeHead(200, {
        'Content-Length': body.length,
        'Content-Type': 'text/javascript'
      });
      
      res.end(body);
    });
  }),
  connect.static(WEBROOT)
);

server.listen(9595);