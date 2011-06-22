var debug = function(msg){
	$('#debug').prepend('<p>'+msg+'</p>')
}
// Pusher.log = function(message) {
//     if (window.console && window.debug) window.debug(message);
//   };
var pusher = new Pusher('5d01c573aff20a7f976b');
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

var dir = {left: 37, right: 39, up: 38, down: 40}

channel.bind('client-keypress', function(keyCode) {
	debug('keypress' + data)
  var ship = ships[data.id];
	if (!ship){
		debug('no ship', data.id)
  	return
	}
  
  if (keyCode == dir.right) { ship.heading += 8.0 }
	if (keyCode == dir.left)  { ship.heading -= 8.0 }
	if (keyCode == dir.up)    { thrust(ship)	}
});

function thrust(ship, ts){
  // generate a small thrust vector
  var t = new Vector(0.0, -0.75)
  // rotate thrust vector by player current heading
  t.rotate(ship.heading * RAD)
  ship.vector.add(t)
}

// Send out the latest worldstate (positions, headings etc..) to all clients a few times a second
setInterval(function(){
  var positions = [];
  for (i in ships) {
    var ship = ships[i];
      positions[i] = {x:ship.position.x, y:ship.position.y}
      debug('pos:'+ship.position.x+'x'+ship.position.y)
  }
  channel.trigger('worldstate', {positions:positions})
}, 400)

setInterval(function(){
  for (i in ships) {    
  	ships[i].position.add(ships[i].vector);
  }
  last_frame_ts = +new Date();
}, 50)