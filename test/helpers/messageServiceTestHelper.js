/*
== BSD2 LICENSE ==
Copyright (c) 2014, Tidepool Project

This program is free software; you can redistribute it and/or modify it under
the terms of the associated License, which is identical to the BSD 2-Clause
License as published by the Open Source Initiative at opensource.org.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE. See the License for more details.

You should have received a copy of the License along with this program; if
not, you can obtain one from Tidepool Project at tidepool.org.
== BSD2 LICENSE ==
*/

'use strict';

var messagesService = require('../../lib/messagesService'),
userApi = require('./mockUserApi'),
service;

var messagingTestHelper = {};

messagingTestHelper.testConfig = {
  httpPort : 10001,
  userApiPort: 10004,
  mongoDbConnectionString : 'mongodb://localhost/tidepool-platform',
  userApi: { serverName: 'messageService', serverSecret: 'sharedMachineSecret' }
};

messagingTestHelper.sessiontoken = '99406ced-8052-49c5-97ee-547cc3347da6';

messagingTestHelper.createMongoInstance = function(){
  var mongojs = require('mongojs');
  var testDbInstance = mongojs(messagingTestHelper.testConfig.mongoDbConnectionString, ['messages']);
  return testDbInstance;
};

messagingTestHelper.initMessagesService = function(crudHandler, hostGetter){
  service = new messagesService(crudHandler, hostGetter ,messagingTestHelper.testConfig);
  service.start();
  userApi.listen(messagingTestHelper.testConfig.userApiPort);
};

messagingTestHelper.stopTestService = function(){
  service.stop();
  userApi.close();
};

messagingTestHelper.testServiceEndpoint = function(){
  return 'http://localhost:'+messagingTestHelper.testConfig.httpPort;
};

messagingTestHelper.isValidId = function(id){
  if(id){
    return true;
  }
  return false;
};

module.exports = messagingTestHelper;
