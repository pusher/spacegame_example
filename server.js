var http = require('http'),
    qs = require('querystring'),
    path = require('path'),
    connect = require('connect'),
    Pusher = require('./pusher'),
    Vectors = require('./shared/vectors');

// Constants:
var PWD = path.dirname(__filename);
var WEB_ROOT = path.join(PWD, 'public');
var SHARED_ROOT = path.join(PWD, 'shared');

// Shorthand:
var Vector = Vectors.Vector;

// Storage:
var ships = {};

/*-----------------------------------------------
  Common Functions:
-----------------------------------------------*/
function debug(msg) {
  console.log('GAME: ' + msg);
}

function addShip(member_id) {
  if (ships[member_id]) return;

  ships[member_id] = {
    id: member_id,
    position: new Vector(100.0, 100.0),
    vector: new Vector(0.0, 0.0),
    heading: 0.0
  };

  debug('New ship added: ' + member_id);
}

function thrust(ship, ts) {
  // generate a small thrust vector
  var t = new Vector(0.0, -0.55);
  // rotate thrust vector by player current heading
  t.rotate(ship.heading * Vectors.RAD);
  ship.vector.add(t);
}

function brake(ship, ts) {
  ship.vector = new Vector(0.0, 0.0);
}

/*-----------------------------------------------
  Web Server
-----------------------------------------------*/
var server = connect.createServer();

// Static files + Code sharing FTW.
server.use(connect.favicon());
server.use('/', connect.static(WEB_ROOT));
server.use('/javascripts/shared', connect.static(SHARED_ROOT));

server.use(connect.cookieParser());

server.use(connect.session({
  secret: 'Pusher is damn awesome.'
}));

server.use(function(req, res, next) {
  if (!req.session.user_id) {
    req.session.user_id = 'user-' + Math.floor(Math.random() * 0x7FFFFFF);
  }
  next();
});

server.use(connect.router(function(app) {
  app.post('/pusher/auth', function(req, res, next) {
    var ajax_data = '';

    req.setEncoding('utf8');
    req.on('data', function(data) {
      ajax_data += data;
    });

    req.on('end', function() {
      var query = qs.parse(ajax_data);
      var body = JSON.stringify(pusher.createAuthToken(
        query.channel_name,
        query.socket_id,
        {
          user_id: req.session.user_id,
          user_info: {
            name: req.session.user_id
          }
        }
      ));

      res.writeHead(200, {
        'Content-Length': body.length,
        'Content-Type': 'application/json'
      });
      res.end(body);
    });
  });

  app.get('/user_id.js', function(req, res, next) {
    var body = 'window["user_id"] = "' + req.session.user_id + '";';

    res.writeHead(200, {
      'Content-Length': body.length,
      'Content-Type': 'text/javascript'
    });

    res.end(body);
  });
}));

server.listen(9595);

/*-----------------------------------------------
  Pusher Server
-----------------------------------------------*/
var pusher = new Pusher('83d652b1c3204e365939', {
  secret_key: '5d1c2e1eef265f638e6f',
  channel_data: {
    user_id: 'SERVER',
    user_info: {}
  }
});

var sync_channel = pusher.subscribe('presence-sync');

sync_channel.bind('pusher:subscription_succeeded', function(members) {
   members.each(function(member) {
     if (member.id != 'SERVER') {
       addShip(member.id);
     }
   });
});

sync_channel.bind('pusher:member_added', function(member) {
  addShip(member.id);
});

sync_channel.bind('pusher:member_removed', function(member) {
  // ??
});

sync_channel.bind('client-keypress', function(data) {
  var ship = ships[data.memberId];

  if (!ship) {
    debug('no ship', data.memberId);
    return;
  }

  if (data.direction === 'right') {
    ship.heading += 16.0;
  }

  if (data.direction === 'left') {
    ship.heading -= 16.0;
  }

  if (data.direction === 'up') {
    thrust(ship);
  }

  if (data.direction === 'down') {
    brake(ship);
  }
});

/*-----------------------------------------------
  Game loop:
-----------------------------------------------*/

// Send out the latest worldstate (positions, headings etc..)
// to all clients a ten times a second
setInterval(function() {
  var positions = {};
  for (var id in ships) {
    // Move the ship
    ships[id].position.add(ships[id].vector);
    // Create a collection with all positions
    positions[id] = {
      x: ships[id].position.x,
      y: ships[id].position.y,
      heading: ships[id].heading
    };

    debug('ship: ' + id + 'x:' + positions[id].x + ', y:' + positions[id].y);
  }
  // Send latest positions to all clients
  sync_channel.trigger('client-worldstate', {
    positions: positions
  });
}, 100);
