require 'rubygems'
require 'pusher'
require 'sinatra'
require 'uuid'

Pusher.app_id = '6477'
Pusher.key = '83d652b1c3204e365939'
Pusher.secret = '5d1c2e1eef265f638e6f'

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