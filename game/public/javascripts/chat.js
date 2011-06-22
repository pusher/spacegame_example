var chatting = false;
var hailChannel = pusher.subscribe('private-'+myUserId);
var bindToChannelMessages = function(channel){
	channel.bind('client-message', function(data){
		if (!chatting){
			chatting = true;
			$('#chat').html('<input id="foobar">');
			otherHailChannel = channel;
		}
		addMessage(data.name, data.message)
	});
}
bindToChannelMessages(hailChannel);

var otherHailChannel
var updateUserList = function(){
	$('#hailScreen').empty();
	channel.members.each(function(member){
		if (member.id != myUserId && member.id != 'SERVER'){
			var el = $('<p>'+member.info.name+'</p>')
			el.data('id', member.id)
			$('#hailScreen').append(el)
		}
	});
};
$('#hailScreen p').live('click', function(){
	chatting = true;
	otherHailChannel = pusher.subscribe('private-' + $(this).data('id'));
	$('#chat').html('<input id="foobar">')
	bindToChannelMessages(otherHailChannel)
})
$('#foobar').live('keydown',function(evt){
	if (evt.keyCode == 13 && $(this).val() != ''){
		var data = {name: myUserName, message: $(this).val()}
		otherHailChannel.trigger('client-message', data);
		addMessage('ME', data.message)
		$(this).val('')
	}
})

var addMessage = function(name, msg){
	$('#messageList').prepend('<p>'+name+ ' : ' + msg+'</p>');
}
