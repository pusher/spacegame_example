var fire = function(craft){
	var initialVector = new Vector(craft.position.x, craft.position.y)
	var t = new Vector(0.0, -10);
        // rotate thrust vector by player current heading
        t.rotate(craft.heading * RAD);
	var bullet = {
		position: initialVector,	
		width: 5, 
		height: 5,
		heading: craft.heading,
		vector: t,
		onEnterFrame: function(){
			this.position.add(this.vector)
		},
		colour: 'rgb(255,255,0)'
	}
	actors.push(bullet);
}


var generateAsteroids = function(){
	for (var i=0; i < 100; i++) {
		var vector1 = new Vector(
			Math.random() * mapSize.width,
			Math.random() * mapSize.height
		)
          var vector2 = new Vector(0.0, -13);
          vector2.rotate((Math.random()*180) * RAD);
		actors.push({
			position: vector1,
			heading: 0.0, // TODO: is this right?
			vector: vector2,
			width: 15 + (Math.random() * 5),
			colour: 'rgb(150,150,150)',
			onEnterFrame: function() {
				this.position.add(this.vector)
			}
		})
	};
}