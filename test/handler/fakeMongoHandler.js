'use strict';

var log,
settings;

log = require('../../lib/log.js')('fakeMongoHandler.js');

/*
    Handler CRUD opertaions via Mongo instance, 
    takes testing config that allows the hadler to follow
    different paths.

    1) settings.throwErrors will throw errors so we can test that path
    2) settings.returnNone will return nothing so we can test nothing found
    3) other wise we just return dummy data

*/
var fakeMongoHandler = function(testingConfig) {

    settings = testingConfig;

    return {
        createMessage : handleCreateMessage,
        getMessage : handleGetMessage,
        getAllMessages : handleGetAllMessages
    };

};

function resolveCallbackValues(callback,data){
    
    if (settings.throwErrors){
        return callback(new Error('fake error'),null);
    }else if (settings.returnNone){
        //if expecting an array return empty array
        if( Object.prototype.toString.call( data ) === '[object Array]' ) {
            return callback(null,[]);
        }
        return callback(null,'');
    }

    return callback(null,data);
}

function handleCreateMessage (message,callback) {
    log.debug('Create in mongo message[%j]', message);

    return resolveCallbackValues(callback,77777777777);
}

function handleGetMessage(messageId,callback) {
    log.debug('Get message[%s]', messageId);

    var message = {
        userid: '12121212',
        groupid: '44J88FD76',
        timestamp: '2013-11-28T23:07:40+00:00',
        messagetext: 'In three words I can sum up everything I have learned about life: it goes on.'
    };

    return resolveCallbackValues(callback,message);
}

function handleGetAllMessages(groupId,callback) {
    log.debug('Finding all messages for group[%s]', groupId);

    var messages = 
    [{
        userid: '12121212',
        groupid: groupId,
        timestamp: '2013-11-28T23:07:40+00:00',
        messagetext: 'In three words I can sum up everything I have learned about life: it goes on.'
    },
    {
        userid: '232323',
        groupid: groupId,
        timestamp: '2013-11-29T23:05:40+00:00',
        messagetext: 'Second message.'
    },
    {
        userid: '232323',
        groupid: groupId,
        timestamp: '2013-11-30T23:05:40+00:00',
        messagetext: 'Third message.'
    },
    {
        userid: '232323',
        groupid: groupId,
        timestamp: '2013-11-25T23:05:40+00:00',
        messagetext: 'First message.'
    }];

    return resolveCallbackValues(callback,messages);
}

module.exports = fakeMongoHandler;
