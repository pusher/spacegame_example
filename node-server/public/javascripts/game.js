// $(function() {
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
  removeShip(member.id)
})

sync_channel.bind('client-worldstate', function(data) {
  //console.log(data.positions)
  for (i in data.positions) {
    if (ships[i]) {
      ships[i].position.x = data.positions[i].x
      ships[i].position.y = data.positions[i].y
      ships[i].heading = data.positions[i].heading
    }
  }
});

$('body').live('keydown',function(evt){
  //console.log(evt.keyCode)
  sync_channel.trigger('client-keypress', {memberId: window['user_id'], keyCode:evt.keyCode})
})

var ships = {};

function addShip(memeberId){
	var newShip = {
	  id: memeberId,
	  position: {x:0, y:0},
	  heading: 0.0
	};
	ships[memeberId] = newShip;
	$('#world').append('<div class="ship" id="'+memeberId+'"></div>')
}

function removeShip(memeberId){
  $('#'+memeberId).remove()
  delete ships[memeberId]
}

function render() {
  for (i in ships) {
    var shipDiv = $('#'+i)
    shipDiv.css({left:ships[i].position.x, top:ships[i].position.y, '-webkit-transform': 'rotate('+ships[i].heading+'deg)'})
    // console.log({left:ships[i].position.x, top:ships[i].position.y})
  }
}

// Main gameloop
setInterval(function(){
  render()
}, 50)
// })