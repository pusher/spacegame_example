$(function() {
  var pusher = new Pusher('83d652b1c3204e365939');
  var sync_channel = pusher.subscribe('presence-sync');

  var directions = {
    37: 'left',
    39: 'right',
    38: 'up',
    40: 'down'
  };

  var ships = {};


  // Once we've connected to Pusher, we get a list of everyone else
  // connected and add their ships to our local game
  sync_channel.bind('pusher:subscription_succeeded', function(members) {
    members.each(function(member) {
      addShip(member.id);
    });
  });

  // Add/remove ships when people join/leave
  sync_channel.bind('pusher:member_added', function(member) {
    addShip(member.id);
    render();
  });

  sync_channel.bind('pusher:member_removed', function(member) {
    removeShip(member.id);
    render();
  });

  // Every game tick we receive the latest game state from the server,
  // and update the positions and directions of all the ships
  sync_channel.bind('client-worldstate', function(data) {
    for (i in data.positions) {
      if (ships[i]) {
        ships[i].position.x = data.positions[i].x;
        ships[i].position.y = data.positions[i].y;
        ships[i].heading = data.positions[i].heading;
      }
    }
    render();
  });


  // When we press a key locally, we send it straight to the server
  $('body').live('keydown', function(evt) {
    if (directions[evt.keyCode]) {
      sync_channel.trigger('client-keypress', {
        memberId: window['user_id'],
        direction: directions[evt.keyCode]
      });
    
      evt.preventDefault();
      return false;
    }
  });

  function addShip(memberId) {
    if (memberId === 'SERVER') return;
    
    $('#world').append('<div class="ship" id="' + memberId + '"></div>');

    var newShip = {
      id: memberId,
      position: {
        x: 0,
        y: 0
      },
      heading: 0.0,
      el: $('#' + memberId)
    };

    console.log(newShip);

    ships[memberId] = newShip;
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
      ships[i].el.css({
        left: ships[i].position.x,
        top: ships[i].position.y,
        '-webkit-transform': 'rotate(' + ships[i].heading + 'deg)'
      });
    }
  }
});
