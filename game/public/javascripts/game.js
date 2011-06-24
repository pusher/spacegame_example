// $(function() {
var pusher = new Pusher('83d652b1c3204e365939');
var sync_channel = pusher.subscribe('presence-sync');

// Once we've connected to Pusher, we get a list of everyone else connected and add their ships to our local game
sync_channel.bind('pusher:subscription_succeeded', function(members){
   members.each(function(member) {
     if (member.id != 'SERVER')
       addShip(member.id);
   })
});

// Add/remove ships when people join/leave
sync_channel.bind('pusher:member_added', function(member) {
  addShip(member.id)
})

sync_channel.bind('pusher:member_removed', function(member) {
  removeShip(member.id)
})

// Every game tick we receive the latest game state from the server, and update the positions and directions of all the ships
sync_channel.bind('client-worldstate', function(data) {
  console.log(data.positions)
  for (i in data.positions) {
    if (ships[i]) {
      ships[i].position.x = data.positions[i].x
      ships[i].position.y = data.positions[i].y
      ships[i].heading = data.positions[i].heading
    }
  }
});

// When we press a key locally, we send it straight to the server
$('body').live('keydown',function(evt){
  console.log(evt.keyCode)
  sync_channel.trigger('client-keypress', {memberId:myUserId, keyCode:evt.keyCode})
})

var ships = {};

function addShip(memeberId){
  $('#world').append('<div class="ship" id="'+memeberId+'"></div>')
	var newShip = {
	  id: memeberId,
	  position: {x:0, y:0},
	  heading: 0.0,
	  el: $('#'+memeberId)
	};
	ships[memeberId] = newShip;
}

function removeShip(memeberId){
  ships[memeberId].el.remove()
  delete ships[memeberId]
}

// Updating the ships on the page happens in a the gameloop below which is separated from the updates we get from the server. When we start doing animation between server updates this will be more useful.
function render() {
  for (i in ships) {
    ships[i].el.css({left:ships[i].position.x, top:ships[i].position.y, '-webkit-transform': 'rotate('+ships[i].heading+'deg)'})
    // console.log({left:ships[i].position.x, top:ships[i].position.y})
  }
}

// Main gameloop
setInterval(function(){
  render()
}, 50)
// })