var Ping = function() {
  var ping_id;
  var ping_sent;
  var ping_received;
  var ping_times = [];
  var offset;
  var self = this;
  
  this.ts = function() {
    return +new Date() + self.average_offset();
  }
  
  this.average_latency = function() {
    var n = 0;
    var tot = 0;
    for (i in ping_times) {
      if (ping_times[i].roundtrip > 0) {
        n++;
        tot = tot + ping_times[i].roundtrip
      }
    }
    return (tot/n)/2;
  }
  
  this.average_offset = function() {
    var n = 0;
    var tot = 0;
    for (i in ping_times) {
      
      // console.log(ping_times[i].offset);
      if (ping_times[i].offset > 0) {
        n++;
        tot = tot + ping_times[i].offset
      }
    }
    return tot/n;
  }
  
  this.send_ping = function() {
    ping_sent = +new Date();
    ping_id = ping_sent + '_' + myUserId;
    ping_times.push({id:ping_id, sent:ping_sent, roundtrip:null, offset:null});
    channel.trigger('client-ping', {id:ping_id});
    
    // Remove old values
    var n = 0;
    for (i in ping_times) {
      if (ping_times[i].roundtrip > 0) {
        n++;
      }
    }
    if (n > 5) { ping_times.shift() }
    // console.log('average offset is '+self.average_offset());
  }
  
  this.send_burst = function() {
    for (var i=0; i < 5; i++) {
  		this.send_ping();
  	};
  }
  
  this.listen = function() {
    channel.bind('client-pong', function(data) {
      ping_received = +new Date();
      for (i in ping_times) {
        if (ping_times[i].id == data.id) {
          ping_times[i].roundtrip = ping_received - ping_times[i].sent;
          ping_times[i].offset = data.server_time - ping_received + (ping_times[i].roundtrip/2);
          // console.log(self.average_offset())
        }
      }
    });
    
    setInterval(function(){
      self.send_ping();
    }, 900)
  }
}

var ping_server = new Ping();
ping_server.listen();