/*!
 * Pusher JavaScript Library v1.8.5
 * http://pusherapp.com/
 *
 * Copyright 2011, Pusher
 * Released under the MIT licence.
 */

if (typeof window === 'undefined') {
  var crypto = require('crypto');
  var global = {
    WebSocket: require('websocket-client').WebSocket
  };
} else {
  var global = window;
}

;(function(module, global) {
  var WebSocket = global['WebSocket'];
  
  if (typeof Function.prototype.scopedTo == 'undefined') {
    Function.prototype.scopedTo = function(context, args) {
      var f = this;
      return function() {
        return f.apply(context, Array.prototype.slice.call(args || [])
          .concat(Array.prototype.slice.call(arguments)));
      };
    };
  }

  var Pusher = function(app_key, options) {
    this.options = options || {};
    this.path = '/app/' + app_key + '?client=js&version=' + Pusher.VERSION;
    this.key = app_key;
    this.socket_id;
    this.channels = new Pusher.Channels();
    this.global_channel = new Pusher.Channel('pusher_global_channel');
    this.global_channel.global = true;
    this.secure = false;
    this.connected = false;
    this.retry_counter = 0;
    this.encrypted = this.options.encrypted ? true : false;

    if (Pusher.isReady) this.connect();

    Pusher.instances.push(this);

    //This is the new namespaced version
    this.bind('pusher:connection_established', function(data) {
      this.connected = true;
      this.retry_counter = 0;
      this.socket_id = data.socket_id;
      this.subscribeAll();
    }.scopedTo(this));

    this.bind('pusher:connection_disconnected', function() {
      for (var channel_name in this.channels.channels) {
        this.channels.channels[channel_name].disconnect();
      }
    }.scopedTo(this));

    this.bind('pusher:error', function(data) {
      Pusher.debug('ERROR', data.message);
    });

  };

  Pusher.instances = [];
  Pusher.prototype = {
    channel: function(name) {
      return this.channels.find(name);
    },

    connect: function() {
      if (this.encrypted || this.secure) {
        var url = 'wss://' + Pusher.host + ':' + Pusher.wss_port + this.path;
      } else {
        var url = 'ws://' + Pusher.host + ':' + Pusher.ws_port + this.path;
      }

      Pusher.allow_reconnect = true;
      Pusher.debug('Connecting', url);

      var self = this;

      var ws = new WebSocket(url);

      // Timeout for the connection to handle silently hanging connections
      // Increase the timeout after each retry in case of extreme latencies
      var timeout = Pusher.connection_timeout + (self.retry_counter * 1000);
      var connectionTimeout = setTimeout(function() {
        Pusher.debug('Connection timeout after', timeout + 'ms');
        ws.close();
      }, timeout);

      ws.onmessage = function() {
        self.onmessage.apply(self, arguments);
      };
      ws.onclose = function() {
        clearTimeout(connectionTimeout);
        self.onclose.apply(self, arguments);
      };
      ws.onopen = function() {
        clearTimeout(connectionTimeout);
        self.onopen.apply(self, arguments);
      };

      this.connection = ws;
    },

    toggle_secure: function() {
      if (this.secure == false) {
        this.secure = true;
        Pusher.debug('Switching to wss:// connection');
      } else {
        this.secure = false;
        Pusher.debug('Switching to ws:// connection');
      }
    },

    disconnect: function() {
      Pusher.debug('Disconnecting');
      Pusher.allow_reconnect = false;
      this.retry_counter = 0;
      this.connection.close();
    },

    bind: function(event_name, callback) {
      this.global_channel.bind(event_name, callback);
      return this;
    },

    bind_all: function(callback) {
      this.global_channel.bind_all(callback);
      return this;
    },

    subscribeAll: function() {
      for (var channel in this.channels.channels) {
        if (this.channels.channels.hasOwnProperty(channel)) {
          this.subscribe(channel);
        }
      }
    },

    subscribe: function(channel_name) {
      var channel = this.channels.add(channel_name, this);
      if (this.connected) {
        channel.authorize(this, function(data) {
          this.send_event('pusher:subscribe', {
            channel: channel_name,
            auth: data.auth,
            channel_data: data.channel_data
          });
        }.scopedTo(this));
      }
      return channel;
    },

    unsubscribe: function(channel_name) {
      this.channels.remove(channel_name);

      if (this.connected) {
        this.send_event('pusher:unsubscribe', {
          channel: channel_name
        });
      }
    },

    send_event: function(event_name, data, channel) {
      Pusher.debug(
        'Event sent (channel,event,data)',
        channel,
        event_name,
        data
      );

      var payload = {
        event: event_name,
        data: data
      };

      if (channel) {
        payload['channel'] = channel;
      }

      this.connection.send(JSON.stringify(payload));
      return this;
    },

    send_local_event: function(event_name, event_data, channel_name) {
      event_data = Pusher.data_decorator(event_name, event_data);
      if (channel_name) {
        var channel = this.channel(channel_name);
        if (channel) {
          channel.dispatch_with_all(event_name, event_data);
        }
      } else {
        // Bit hacky but these events won't get logged otherwise
        Pusher.debug('Event recd (event,data)', event_name, event_data);
      }

      this.global_channel.dispatch_with_all(event_name, event_data);
    },

    onmessage: function(evt) {
      var params = JSON.parse(evt.data);
      if (params.socket_id && params.socket_id == this.socket_id) return;
      // Try to parse the event data unless it has already been decoded
      if (typeof(params.data) == 'string') {
        params.data = Pusher.parser(params.data);
      }

      this.send_local_event(params.event, params.data, params.channel);
    },

    reconnect: function() {
      var self = this;
      setTimeout(function() {
        self.connect();
      }, 0);
    },

    retry_connect: function() {
      // Unless we're ssl only, try toggling between ws & wss
      if (!this.encrypted) {
        this.toggle_secure();
      }

      // Retry with increasing delay, with a maximum interval of 10s
      var retry_delay = Math.min(this.retry_counter * 1000, 10000);
      Pusher.debug('Retrying connection in ' + retry_delay + 'ms');
      var self = this;
      setTimeout(function() {
        self.connect();
      }, retry_delay);

      this.retry_counter = this.retry_counter + 1;
    },

    onclose: function() {
      this.global_channel.dispatch('close', null);
      Pusher.debug('Socket closed');
      if (this.connected) {
        this.send_local_event('pusher:connection_disconnected', {});
        if (Pusher.allow_reconnect) {
          Pusher.debug('Connection broken, trying to reconnect');
          this.reconnect();
        }
      } else {
        this.send_local_event('pusher:connection_failed', {});
        this.retry_connect();
      }
      this.connected = false;
    },

    onopen: function() {
      this.global_channel.dispatch('open', null);
    }
  };

  Pusher.Util = {
    extend: function extend(target, extensions) {
      for (var property in extensions) {
        if (extensions[property] && extensions[property].constructor &&
          extensions[property].constructor === Object) {

          target[property] = extend(
            target[property] || {},
            extensions[property]
          );
        } else {
          target[property] = extensions[property];
        }
      }
      return target;
    }
  };

  // To receive log output provide a Pusher.log function, for example
  // Pusher.log = function(m) {console.log(m)}
  Pusher.debug = function() {
    var m = ['Pusher'];
    for (var i = 0; i < arguments.length; i++) {
      if (typeof arguments[i] === 'string') {
        m.push(arguments[i]);
      } else {
        m.push(JSON.stringify(arguments[i]));
      }
    }
    console.log(m.join(' : '));
  }

  // Pusher defaults
  Pusher.VERSION = '1.8.5';

  Pusher.host = 'ws.pusherapp.com';
  Pusher.ws_port = 80;
  Pusher.wss_port = 443;
  Pusher.channel_auth_endpoint = '/pusher/auth';
  Pusher.connection_timeout = 5000;
  Pusher.cdn_http = 'http://js.pusherapp.com/';
  Pusher.cdn_https = 'https://d3ds63zw57jt09.cloudfront.net/';

  // wrap event_data before dispatching
  Pusher.data_decorator = function(event_name, event_data) {
    return event_data;
  };

  Pusher.allow_reconnect = true;
  Pusher.channel_auth_transport = 'node';
  Pusher.parser = function(data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      Pusher.debug(
        'Data attribute not valid JSON - you may wish to implement your own Pusher.parser'
      );
      return data;
    }
  };

  Pusher.isReady = false;
  Pusher.ready = function() {
    Pusher.isReady = true;
    for (var i = 0; i < Pusher.instances.length; i++) {
      if (!Pusher.instances[i].connected) {
        Pusher.instances[i].connect();
      }
    }
  };


  // Create an AuthToken given channel name, socket id,
  // and optional channel data.
  Pusher.prototype.createAuthToken = function(channel, socket_id, data) {
    var secret_key = this.options.secret_key,
        public_key = this.key,
        sig_data = [socket_id, channel],
        channel_data = JSON.stringify(data);

    if (channel_data !== undefined) {
      sig_data.push(channel_data);
    }

    var signature = crypto.createHmac('SHA256', secret_key)
      .update(sig_data.join(':'))
      .digest('hex');

    var response = {
      auth: public_key + ':' + signature
    };

    if (channel_data) {
      response['channel_data'] = channel_data;
    }

    return response;
  };



  Pusher.Channels = function() {
    this.channels = {};
  };

  Pusher.Channels.prototype = {
    add: function(channel_name, pusher) {
      var existing_channel = this.find(channel_name);
      if (!existing_channel) {
        var channel = Pusher.Channel.factory(channel_name, pusher);
        this.channels[channel_name] = channel;
        return channel;
      } else {
        return existing_channel;
      }
    },

    find: function(channel_name) {
      return this.channels[channel_name];
    },

    remove: function(channel_name) {
      delete this.channels[channel_name];
    }
  };

  Pusher.Channel = function(channel_name, pusher) {
    this.pusher = pusher;
    this.name = channel_name;
    this.callbacks = {};
    this.global_callbacks = [];
    this.subscribed = false;
  };

  Pusher.Channel.prototype = {
    // inheritable constructor
    init: function() {

    },

    disconnect: function() {

    },

    // Activate after successful subscription. Called on top-level
    // pusher:subscription_succeeded
    acknowledge_subscription: function(data) {
      this.subscribed = true;
    },

    bind: function(event_name, callback) {
      this.callbacks[event_name] = this.callbacks[event_name] || [];
      this.callbacks[event_name].push(callback);
      return this;
    },

    bind_all: function(callback) {
      this.global_callbacks.push(callback);
      return this;
    },

    trigger: function(event_name, data) {
      this.pusher.send_event(event_name, data, this.name);
      return this;
    },

    dispatch_with_all: function(event_name, data) {
      if (this.name != 'pusher_global_channel') {
        Pusher.debug('Event recd (channel,event,data)', this.name, event_name, data);
      }
      this.dispatch(event_name, data);
      this.dispatch_global_callbacks(event_name, data);
    },

    dispatch: function(event_name, event_data) {
      var callbacks = this.callbacks[event_name];

      if (callbacks) {
        for (var i = 0; i < callbacks.length; i++) {
          callbacks[i](event_data);
        }
      } else if (!this.global) {
        Pusher.debug('No callbacks for ' + event_name);
      }
    },

    dispatch_global_callbacks: function(event_name, event_data) {
      for (var i = 0; i < this.global_callbacks.length; i++) {
        this.global_callbacks[i](event_name, event_data);
      }
    },

    is_private: function() {
      return false;
    },

    is_presence: function() {
      return false;
    },

    authorize: function(pusher, callback) {
      callback({}); // normal channels don't require auth
    }
  };


  Pusher.auth_callbacks = {};

  Pusher.authorizers = {
    node: function(pusher, callback) {
      var response = pusher.createAuthToken(
        this.name,
        pusher.socket_id,
        pusher.options.channel_data
      );
      callback(response);
    }
  };

  Pusher.Channel.PrivateChannel = {
    is_private: function() {
      return true;
    },

    authorize: function(pusher, callback) {
      Pusher.authorizers[Pusher.channel_auth_transport].scopedTo(this)(pusher, callback);
    }
  };

  Pusher.Channel.PresenceChannel = {

    init: function() {
      this.bind('pusher_internal:subscription_succeeded', function(sub_data) {
        this.acknowledge_subscription(sub_data);
        this.dispatch_with_all('pusher:subscription_succeeded', this.members);
      }.scopedTo(this));

      this.bind('pusher_internal:member_added', function(data) {
        var member = this.members.add(data.user_id, data.user_info);
        this.dispatch_with_all('pusher:member_added', member);
      }.scopedTo(this));

      this.bind('pusher_internal:member_removed', function(data) {
        var member = this.members.remove(data.user_id);
        if (member) {
          this.dispatch_with_all('pusher:member_removed', member);
        }
      }.scopedTo(this));
    },

    disconnect: function() {
      this.members.clear();
    },

    acknowledge_subscription: function(sub_data) {
      this.members._members_map = sub_data.presence.hash;
      this.members.count = sub_data.presence.count;
      this.subscribed = true;
    },

    is_presence: function() {
      return true;
    },

    members: {
      _members_map: {},
      count: 0,

      each: function(callback) {
        for (var i in this._members_map) {
          callback({
            id: i,
            info: this._members_map[i]
          });
        }
      },

      add: function(id, info) {
        this._members_map[id] = info;
        this.count++;
        return this.get(id);
      },

      remove: function(user_id) {
        var member = this.get(user_id);
        if (member) {
          delete this._members_map[user_id];
          this.count--;
        }
        return member;
      },

      get: function(user_id) {
        var user_info = this._members_map[user_id];
        if (user_info) {
          return {
            id: user_id,
            info: user_info
          };
        } else {
          return null;
        }
      },

      clear: function() {
        this._members_map = {};
        this.count = 0;
      }
    }
  };

  Pusher.Channel.factory = function(channel_name, pusher) {
    var channel = new Pusher.Channel(channel_name, pusher);
    if (channel_name.indexOf(Pusher.Channel.private_prefix) === 0) {
      Pusher.Util.extend(channel, Pusher.Channel.PrivateChannel);
    } else if (channel_name.indexOf(Pusher.Channel.presence_prefix) === 0) {
      Pusher.Util.extend(channel, Pusher.Channel.PrivateChannel);
      Pusher.Util.extend(channel, Pusher.Channel.PresenceChannel);
    }
    channel.init();// inheritable constructor
    return channel;
  };

  Pusher.Channel.private_prefix = 'private-';
  Pusher.Channel.presence_prefix = 'presence-';

  Pusher.ready();

  module.exports = Pusher;
})(module, global);
