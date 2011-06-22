var craft;

channel.bind('worldstate', function(data) {
  console.log(data)
  for (i in data.ships) {
    var updated_craft = data.ships[i];
    var local_craft = ships[i]
    if (data.id == myUserId) {
      // craft.position = data.position;
      craft.vector = data.vector;
      craft.heading = data.heading;
    } else if (enemyCraft[data.id] === undefined) {
      // console.log('received data for unknown client '+data.id)
    } else {
      // enemyCraft[data.id].position = data.position;
      enemyCraft[data.id].vector = data.vector;
      enemyCraft[data.id].heading = data.heading;
    }
  }
});


$().ready(function(){
  
	var craftEl = $('<div id="craft"></div>');	
	// add the planet		
	addPlanet();
	
	$('#holder').append(craftEl);
	// initialise my own craft
	craft = {
		position: new Vector(mapSize.width / 2, mapSize.height / 2),	
		width: 50, 
		height: 50,
		heading: 0.0,
		vector: new Vector(0.0, 0),
		engineThrust: false
	};
	
	setInterval(function(){
	  for (i in enemyCraft) {
    	enemyCraft[i].position.add(enemyCraft[i].vector);
    }
    craft.position.add(craft.vector);
    
		var headingRad = craft.heading * RAD;
		
		craftEl.css('-webkit-transform','rotate('+headingRad+'rad)')
		if (craft.engineThrust){
			craftEl.css('background-position', '50px 0');
			craft.engineThrust = false;
		} else {
			craftEl.css('background-position', '0 0');
		}
						
		for (var i=0; i < actors.length; i++) {
			actors[i].onEnterFrame();
		};
		// miniView.update(craft);
		mainView.clear()
    mainView.drawStars(stars, craft);
		mainView.drawActors(actors, craft);
		// channel.trigger('client-move', {id: myUserId, position: craft.position })
		
    last_frame_ts = +new Date();
	}, 50)
	
	craftEl.css({
		left: (viewPortal.width / 2) - craft.width / 2, 
		top: (viewPortal.height / 2) - craft.height / 2
	});
	
	// var miniView = new MiniView(document.getElementById('miniCanvas'))
	var mainView = new MainView(document.getElementById('mainCanvas'))
	// mainView.drawStars(stars, craft);

	$('body').keydown(function(event) {
	  channel.trigger('client-keypress', {id:myUserId, keyCode:event.keyCode, ts:ping_server.ts()});
    // console.log('ping_server.ts()'+ping_server.ts());
	})
});

var MainView = function(canvasElement){
	var ctx = canvasElement.getContext('2d');
	var xScale = canvasElement.width / mapSize.width
	var yScale = canvasElement.height / mapSize.height
	
	this.drawActors = function(actors, craft){
		ctx.fillStyle = "rgb(255,255,255)"
		for (var i=0; i < actors.length; i++) {
			drawSprite(actors[i])
		};
	}
	
	this.clear = function(){
	  ctx.clearRect(0,0, 500, 500);
	}
	
	this.drawStars = function(stars, craft){
		ctx.fillStyle = "rgb(255,255,255)"
		for (var i=0; i < stars.length; i++) {
			drawSprite(stars[i])
		};
	}
	
	var drawSprite = function(sprite){
		var x = sprite.position.x - (craft.position.x - viewPortal.width/2)
		var y = sprite.position.y - (craft.position.y - viewPortal.height/2)
		if (sprite.colour)
			ctx.fillStyle = sprite.colour;
		drawCircle(x,y, sprite.width)
	}
	
	var drawCircle = function(x,y, radius){
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, Math.PI*2, true); 
		ctx.closePath();
		ctx.fill();
	}
}