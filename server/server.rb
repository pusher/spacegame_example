require 'rubygems'
require 'pusher'
require 'sinatra'
require 'uuid'

<<<<<<< HEAD
Pusher.app_id = '5207'
Pusher.key = '5d01c573aff20a7f976b'
Pusher.secret = '8b8ad0d9fbb525c05579'
=======
Pusher.app_id = '6477'
Pusher.key = '83d652b1c3204e365939'
Pusher.secret = '5d1c2e1eef265f638e6f'
>>>>>>> 40c90d4fe300cad34889834df53ece74f812b838

set :port, 9494
enable :sessions
set :public, File.join(File.dirname(__FILE__), 'public')

get '/' do
  template = File.open("public/index.html").read
  return template
end

post '/pusher/auth' do
  Pusher[params[:channel_name]].authenticate(params[:socket_id], {
    :user_id => 'SERVER',
    :user_info => {
      :name => session['name']
    }
  }).to_json
end