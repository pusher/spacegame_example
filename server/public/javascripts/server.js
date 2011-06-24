var pusher = new Pusher('83d652b1c3204e365939');
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
  console.log(positions)
  sync_channel.trigger('client-worldstate', {positions:positions})
}, 100)

var debug = function(msg){
	$('#debug').prepend('<p>'+msg+'</p>')
}