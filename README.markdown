# Pusher realtime game prototype with server side physics

If you've ever played around with building games in the browser, you'll soon hit up against the problem of how to synchronize your clients and enforce fair play on the server side.

This is a prototype using the new [Pusher Pipe](http://pusher.com/docs/pipe) to sync the players moves and game state. All the physics (pretty simple in this case) happens on the server side and is broadcast out to the clients who render the scene. The backend is written in Node. We've aimed to make the front and backend compatible so that it will be possible to share code between the two (e.g. you may want to run the physics on both the client and backend).

When people visit the game everyone will see their spaceship. All players can then fly around using the arrow keys.

We've kept the code as simple as possible, which means that it's quite inefficient (e.g. sending out the whole world state on every game tick).

# Running the game

To use the demo you will need to be part of the Pusher Pipe early access program. If you would like to take part please email info@pusher.com with your details.

Once you're signed up, log in to the special dashboard and copy the key and secret for your app into both `server.js` and `public/javascripts/game.js`

You'll need to have http://nodejs.org installed to run the server side.

    node server.js

Then go to http://localhost:9595 and open it in two different browsers (so the sessions are different). Use the arrow keys to move around and enjoy!

# What is going on here?

## On the server

We're using some special new features of the Pusher Pipe to connect directly to Pusher from our Node server. The [Pusher Pipe Quickstart doc](http://pusher.com/docs/pipe_quickstart) has an overview of how you connect. If you take a look in `server.js`, at the top we include the node module `Pusher = require('pusher-pipe');` (which can be installed with `npm install pusher-pipe`). Then we initiate the Pusher connection like so:

    var pipe = Pusher.createClient({
      key: '3d2c7d1f36c5347743f4',
      secret: 'fdaa0457d364e7036bf8',
      app_id: 0
      // debug: true
    });

You will need to replace the key, secret and app_id from the ones in your Pusher Pipe account (different from your normal Pusher account during the early access program).

Next we want to know when a browser client connects to Pusher. We bind to the socket open event.

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

When the browser window is closed, we need to remove the player from the game:

    // Triggered when a player disconnects
    pipe.sockets.on('close', function(socket_id) {
      removeShip(socket_id);
      // As above, we send a message to all current players to let them know that this player has now left and should be removed from the game.
      pipe.channel('updates').trigger('ship_removed', {id:socket_id})
    });

When a client presses an arrow key to move, we receive a msgs and apply to move to their ship. They then receive the new location of all ships including theirs when it's broadcast from the gameloop in the next section.

The `pipe.sockets.on('event:myeventname', function(socket_id, data) {...})` functionality being used here allows you to bind to events sent from clients via the a special new backchannel. The backchannel is a way for browser clients to send msgs directly to your Node server via Pusher. To see how msgs are pushed to the backchannel, skip to the section below about our client side code.

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

Finally, we put our gameloop inside `pipe.on('connected', function() {...}` so it is only called when the connection is established to the Pusher Pipe. The important part of our gameloop is when we send the latest ship positions to all players:

    pipe.channel('updates').trigger('new_positions', {
      positions: positions
    });

After we've setup all the Pusher bindings and triggers we want, we call the following to actually connect to the Pipe.

    pipe.connect();

## On the client

The `index.html` is fairly simple:

   <html>
   <head>
   	<title>space</title>
   	<script src="http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js"></script>
   	<script src="http://js.pusherapp.com/1.10.0-pre/pusher.min.js"></script>
   	<script src="/javascripts/game.js"></script>

   	<style type="text/css" media="screen">
   	  .ship {
   	    width: 20px;
   	    height: 20px;
   	    position: relative;
   	    top: 20px;
   	    left: 20px;
   	    background: url('/images/ship.png') left top no-repeat;
   	  }
   	  #world {
   	    display: absolute;
   	    width: 900px;
   	    height: 500px;
   	    background: #eee;
   	  }
   	</style>
   </head>
   <body>
   <div id="debug"></div>
   <div id="world"></div>
   </body>
   </html>

The exciting stuff is in the `public/javascripts/game.js`

First we connect to Pusher. Because the Pipe is in early access, you need to connect to our 'darling' server.

    Pusher.host = 'ws.darling.pusher.com';
    var pusher = new Pusher('3d2c7d1f36c5047743f4'); // Replace with your key

The we subscribe to our 'updates' channel to receive events send to it.

    var updates_channel = pusher.subscribe('updates');

The `updates_channel` object can then be used to bind to channel events.

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

We also need to bind to a special backchannel event. When we join the game, the server will send a backchannel message (which doesn't need to be broadcast to the other players) with the list of other players in the game.

    pusher.back_channel.bind('ship_list', function(members) {
      for (i in members) {
        addShip(members[i].id);
      }
    });

To send the keypress events from the client to the server, it's going to be best if we sample the keyboard input. We bind to the jQuery live events for keyup and keydown, and then every 50ms, send the sampled input to the server via the backchannel (which sends the msg directly to the Node server via the Pipe).

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

# And that's all!

Now get to work improving this app and build and awesome realtime game!

PS: The Pusher Pipe is still alpha software, so send to you feedback to support@pusher.com
