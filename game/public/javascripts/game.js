var actors = [];
var enemyCraft = {};
var mapSize = {
	width: 10000,
	height: 10000
}

// Pusher.log = function(message) {
//     if (window.console && window.console.log) window.console.log(message);
//   };
var pusher = new Pusher('5d01c573aff20a7f976b');
var channel = pusher.subscribe('presence-spacegame');

channel.bind('pusher:subscription_succeeded', function(members){
  members.each(function(member) {
    console.log(member.id)
    if (member.id != 'SERVER')
      addEnemy(member.id);
  })
});

channel.bind('pusher:member_added', function(member) {
  addEnemy(member.id)
	updateUserList();
})

channel.bind('pusher:member_removed', function(member) {
  updateUserList();
})
  
var addEnemy = function(member_id){
  var newEnemy = {
    id: member_id,
    position: new Vector(mapSize.width / 2, mapSize.height / 2),  
    width: 25, 
    height: 25,
    heading: 0.0,
    vector: new Vector(0.0, 0),
    onEnterFrame: function(){},
    colour: 'rgb(255, 255,0)'
  };
  enemyCraft[member_id] = newEnemy;
  actors.push( newEnemy );
}
  
var RAD = Math.PI/180.0;
var TWOPI = Math.PI*2;

var bullets = [];

var dir = {
	left: 37,
	right: 39,
	up: 38,
	down: 40
}

var viewPortal = {
	width: 500,
	height: 500
}
var craft;
	
function print_craft(craft,ts) {
  console.log('ts:'+ts+', pos:'+craft.position.x+'x'+craft.position.y)
}
