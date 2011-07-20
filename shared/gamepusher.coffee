class GamePusher

  class Client
    @d = {}
    @keys = {}
    connect: (key, channel, user_id) ->
      @user_id = user_id
      @pusher = new Pusher key
      @sync_channel = pusher.subscribe(channel)
      
      bind_incoming()
      bind_outgoing()
    
    bind_incoming: ->
      @sync_channel.bind 'client-worldstate', (data) =>
        console.log data
    
    key_controls(keys): ->
      @keys = keys
      $('body').live 'keydown', (evt) =>
        if @keys[evt.keyCode]
          trigger @keys[evt.keyCode]
        evt.preventDefault();
        return false;
    
    trigger(evt, data): ->
      sync_channel.trigger 'client-playerevent', {
        memberId: user_id,
        event: @keys[evt.keyCode]
      }
  
  class Server
    @d = {}
    connect: (key, secret, channel) ->
      @user_id = 'SERVER'
      @pusher = new Pusher key, {
        secret_key: secret,
        channel_data: {
          user_id: 'SERVER',
          user_info: {}
        }
      }
      @sync_channel = pusher.subscribe(channel)
      
      bind_incoming()
      outgoing_syncloop()
      bind_presence()
    
    bind_incoming: ->
      @sync_channel.bind 'client-playerevent', (data) =>
        console.log data
        
    outgoing_syncloop: ->
      setInterval =>
        @sync_channel.trigger 'client-worldstate', { d:@d }
