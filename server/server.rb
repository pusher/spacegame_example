require 'rubygems'
require 'pusher'
require 'sinatra'
require 'uuid'

Pusher.app_id = '5207'
Pusher.key = '5d01c573aff20a7f976b'
Pusher.secret = '8b8ad0d9fbb525c05579'

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