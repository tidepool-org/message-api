// == BSD2 LICENSE ==
// Copyright (c) 2014, Tidepool Project
//
// This program is free software; you can redistribute it and/or modify it under
// the terms of the associated License, which is identical to the BSD 2-Clause
// License as published by the Open Source Initiative at opensource.org.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
// FOR A PARTICULAR PURPOSE. See the License for more details.
//
// You should have received a copy of the License along with this program; if
// not, you can obtain one from Tidepool Project at tidepool.org.
// == BSD2 LICENSE ==

'use strict';

var log,
settings;

log = require('../../lib/log.js')('mockMongoHandler.js');

/*
    Handler CRUD opertaions via Mongo instance,
    takes testing config that allows the hadler to follow
    different paths.

    1) settings.throwErrors will throw errors so we can test that path
    2) settings.returnNone will return nothing so we can test nothing found
    3) other wise we just return dummy data

*/
var mockMongoHandler = function(testingConfig) {

  settings = testingConfig;

  return {
    status: handleStatus,
    createMessage : handleCreateMessage,
    getMessage : handleGetMessage,
    getAllMessages : handleGetAllMessages,
    getMessagesInThread : handleGetMessagesInThread
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
}

function handleCreateMessage (message,callback) {
  log.debug('Create in mongo message[%j]', message);

  return resolveCallbackValues(callback,77777777777);
}

function handleGetMessage(messageId,callback) {
  log.debug('Get message[%s]', messageId);

  var message = {
    id : '1299999299',
    parentmessage: '',
    userid: '12121212',
    groupid: '44J88FD76',
    timestamp: '2013-11-28T23:07:40+00:00',
    messagetext: 'In three words I can sum up everything I have learned about life: it goes on.'
  };

  return resolveCallbackValues(callback,message);
}

function handleGetMessagesInThread(messageId, callback) {
  log.debug('Finding all messages for thread[%s] ', messageId);

  var messages =
  [{
    id : messageId,
    parentmessage :null,
    userid: '12121212',
    groupid: '999777',
    timestamp: '2013-11-28T23:07:40+00:00',
    messagetext: 'In three words I can sum up everything I have learned about life: it goes on.'
  },
  {
    id : '12999333444',
    parentmessage :messageId,
    userid: '232323',
    groupid: '999777',
    timestamp: '2013-11-29T23:05:40+00:00',
    messagetext: 'Second message.'
  },
  {
    id : '12990000000',
    parentmessage :messageId,
    userid: '232323',
    groupid: '999777',
    timestamp: '2013-11-30T23:05:40+00:00',
    messagetext: 'Third message.'
  },
  {
    id : '1299554433',
    parentmessage :messageId,
    userid: '232323',
    groupid: '999777',
    timestamp: '2013-11-25T23:05:40+00:00',
    messagetext: 'First message.'
  }];

  return resolveCallbackValues(callback,messages);
}

function handleGetAllMessages(groupId, startTime, endTime, callback) {
  log.debug('Finding all messages for group[%s] from[%s] to[%s] ', groupId, startTime, endTime);

  var messages =
  [{
    id : '1299999299',
    parentmessage: null,
    userid: '12121212',
    groupid: groupId,
    timestamp: '2013-11-28T23:07:40+00:00',
    messagetext: 'In three words I can sum up everything I have learned about life: it goes on.'
  },
  {
    id : '12999333444',
    parentmessage: null,
    userid: '232323',
    groupid: groupId,
    timestamp: '2013-11-29T23:05:40+00:00',
    messagetext: 'Second message.'
  },
  {
    id : '12990000000',
    parentmessage: null,
    userid: '232323',
    groupid: groupId,
    timestamp: '2013-11-30T23:05:40+00:00',
    messagetext: 'Third message.'
  },
  {
    id : '1299554433',
    parentmessage: null,
    userid: '232323',
    groupid: groupId,
    timestamp: '2013-11-25T23:05:40+00:00',
    messagetext: 'First message.'
  }];

  return resolveCallbackValues(callback,messages);
}

module.exports = mockMongoHandler;
