var MiniView = function(canvasElement){
	var ctx = canvasElement.getContext('2d');
	var xScale = canvasElement.width / mapSize.width
	var yScale = canvasElement.height / mapSize.height
	
	this.update = function(craft){
		var x = craft.position.x * xScale
		var y = craft.position.y * yScale
		ctx.clearRect(0,0,100,100);
		ctx.fillStyle = 'rgb(255,0,0)'
		ctx.fillRect(x, y, 2, 2);
		
		for (var i=0; i < actors.length; i++) {
			var x = actors[i].position.x * xScale
			var y = actors[i].position.y * yScale
			drawCircle(x, y, actors[i].width * yScale * 4);
		};
	}
	
	var drawCircle = function(x,y, radius){
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, Math.PI*2, true); 
		ctx.closePath();
		ctx.fill();
	}
}