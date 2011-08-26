var http = require('http'),
    qs = require('querystring'),
    path = require('path'),
    connect = require('connect'),
    Vectors = require('./shared/vectors'),
    Pusher = require('pusher-pipe');

// Constants:
var PWD = path.dirname(__filename);
var WEB_ROOT = path.join(PWD, 'public');
var SHARED_ROOT = path.join(PWD, 'shared');

// Shorthand:
var Vector = Vectors.Vector;

// Storage:
var ships = {};

/*-----------------------------------------------
  Pusher Server
-----------------------------------------------*/
var pipe = Pusher.createClient({
  key: '3d2c7d1f36c5047743f4',
  secret: 'fdaa0451d364e7036bf8',
  app_id: 5
  // debug: true
});

// Triggered when a new player connects
pipe.sockets.on('open', function(socket_id) {
  // Send new player a list of everyone already connected
  // The pipe.socket(socket_id).trigger() function allows us to send a msg to a specific browser client
  pipe.socket(socket_id).trigger('ship_list', ships)
  // Once the newly connected player has a list of everyone else already connected,
  // we need to tell the existing players about the newly connected player
  addShip(socket_id);
  // The pipe.channel('my_channel_name').trigger() broadcasts a msg all the browser clients subscribed to the channel. This is what the current REST API for Pusher does
  pipe.channel('updates').trigger('ship_added', {id:socket_id})
});

// Triggered when a player disconnects
pipe.sockets.on('close', function(socket_id) {
  removeShip(socket_id);
  // As above, we send a message to all current players to let them know that this player has now left and should be removed from the game.
  pipe.channel('updates').trigger('ship_removed', {id:socket_id})
});

// When a client presses an arrow key to move, we receive a msgs and apply to move to their ship. They then receive the new location of all ships including theirs when it's broadcast from the gameloop in the next section.
pipe.sockets.on('event:keypress', function(socket_id, data) {
  console.log(data)
  var ship = ships[socket_id];

  if (!ship) {
    debug('no ship', socket_id);
    return;
  }

  if (data.input.right)
    ship.heading += 8.0;
  if (data.input.left) 
    ship.heading -= 8.0;
  if (data.input.up) 
    thrust(ship);
  if (data.input.down) 
    brake(ship);
});


/*-----------------------------------------------
  Game loop:
-----------------------------------------------*/

// Only start the gameloop once we've connected to the Pusher Pipe
pipe.on('connected', function() {
  // Send out the latest worldstate (positions, headings etc..)
  // to all clients a ten times a second
  setInterval(function() {
    var positions = {};
    var any_ships = false;
    for (var id in ships) {
      any_ships = true;
      // Move the ship
    
      ships[id].position.x = dial(ships[id].position.x, ships[id].vector.x, 800);
      ships[id].position.y = dial(ships[id].position.y, ships[id].vector.y, 500);
    
      // Create a collection with all positions
      positions[id] = {
        x: ships[id].position.x,
        y: ships[id].position.y,
        heading: ships[id].heading
      };

      debug('ship: ' + id + 'x:' + positions[id].x + ', y:' + positions[id].y);
    }
    // Send latest positions to all clients
  
    if (any_ships) {
      // Here is we sent out the latest ship postitions to all of the connected players who are subscribed to the updates channel.
      pipe.channel('updates').trigger('new_positions', {
        positions: positions
      });
    }
  }, 50);
});

// Last, but not least, actually connect to the Pusher Pipe!
pipe.connect();

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

function removeShip(member_id) {
  delete ships[member_id];
}

function thrust(ship, ts) {
  // generate a small thrust vector
  var t = new Vector(0.0, -0.05);
  // rotate thrust vector by player current heading
  t.rotate(ship.heading * Vectors.RAD);
  ship.vector.add(t);
}

function brake(ship, ts) {
  ship.vector = new Vector(0.0, 0.0);
}


var dial = function(current, change, limit) {
  var absolute = current + change;
  if(change < 0 && absolute < 0) // gone over
    return limit + absolute % limit;
  else if(change > 0 && absolute > limit)
    return absolute % limit
  else
    return absolute;
}


/*-----------------------------------------------
  Web Server
-----------------------------------------------*/
var server = connect.createServer();
server.use('/', connect.static(WEB_ROOT));
server.use('/javascripts/shared', connect.static(SHARED_ROOT));
server.listen(9595);