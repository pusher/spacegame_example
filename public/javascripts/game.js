$(function() {
  Pusher.host = 'ws.darling.pusher.com';
  var pusher = new Pusher('3d2c7d1f36c5047743f4'); // Replace with your key
  var updates_channel = pusher.subscribe('updates');

  var directions = {
    37: 'left',
    39: 'right',
    38: 'up',
    40: 'down'
  };

  var ships = {};

  // Add/remove ships when people join/leave
  updates_channel.bind('ship_added', function(data) {
    addShip(data.id);
    render();
  });

  updates_channel.bind('ship_removed', function(data) {
    removeShip(data.id);
    render();
  });

  // Every game tick we receive the latest game state from the server,
  // and update the positions and directions of all the ships
  updates_channel.bind('new_positions', function(data) {
    for (i in data.positions) {
      // console.log(ships[i])
      // console.log(data.positions[i])
      if (ships[i]) {
        ships[i].position.x = data.positions[i].x;
        ships[i].position.y = data.positions[i].y;
        ships[i].heading = data.positions[i].heading;
      }
    }
    render();
  });
  
  pusher.back_channel.bind('ship_list', function(members) {
    // console.log(members)
    for (i in members) {
      addShip(members[i].id);
    }
  });
  
  var input = {};
  setInterval(function(){
    pusher.back_channel.trigger('keypress', {
      input: input
    });
  }, 50)
  
  // When we press a key locally, we send it straight to the server
  $('body').live('keydown', function(evt) {
    if (directions[evt.keyCode]) {
      if (directions[evt.keyCode] == 'left')
        input.left = true
      if (directions[evt.keyCode] == 'right')
        input.right = true
      if (directions[evt.keyCode] == 'up')
        input.up = true
      if (directions[evt.keyCode] == 'down')
        input.down = true
      evt.preventDefault();
      return false;
    }
  });
  
  $('body').live('keyup', function(evt) {
    if (directions[evt.keyCode]) {
      if (directions[evt.keyCode] == 'left')
        input.left = false
      if (directions[evt.keyCode] == 'right')
        input.right = false
      if (directions[evt.keyCode] == 'up')
        input.up = false
      if (directions[evt.keyCode] == 'down')
        input.down = false
      evt.preventDefault();
      return false;
    }
  });

  function addShip(memberId) {
    if (memberId === 'SERVER') return;
    
    var el_id = new Date().getTime();
    $('#world').append('<div class="ship" id="' + el_id + '"></div>');

    ships[memberId] = {
      id: memberId,
      position: {
        x: 0,
        y: 0
      },
      heading: 0.0,
      el: $('#' + el_id)
    };
    
  }

  function removeShip(memberId) {
    if (!ships[memberId]) return;
    
    ships[memberId].el.remove()
    delete ships[memberId];
  }

  // Updating the ships on the page happens in a the gameloop below
  // which is separated from the updates we get from the server.
  // When we start doing animation between server updates this will
  // be more useful.
  function render() {
    for (i in ships) {
      // console.log(ships[i].position.x)
      // console.log(ships[i])
      ships[i].el.css({
        left: ships[i].position.x,
        top: ships[i].position.y,
        '-webkit-transform': 'rotate(' + ships[i].heading + 'deg)'
      });
    }
  }
});
