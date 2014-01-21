/*
 * Copyright (c) 2014, Tidepool Project
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice, this
 * list of conditions and the following disclaimer in the documentation and/or other
 * materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 * IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 * NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
 
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
        status: handleStatus,
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

function handleStatus(callback){
    var dependencyStatus = { running: false, deps: { up: [], down: [] } };
    
    if (settings.throwErrors){
        dependencyStatus.deps.down = ['mongo'];
    }

    dependencyStatus.running = (dependencyStatus.deps.down.length === 0);
    dependencyStatus.statuscode = dependencyStatus.running ? 200 : 500;

    return resolveCallbackValues(callback,dependencyStatus);
};

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

function handleGetAllMessages(groupId, startTime, endTime, callback) {
    log.debug('Finding all messages for group[%s] from[%s] to[%s] ', groupId, startTime, endTime);

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
