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

var _ = require('lodash');
var restify = require('restify');

var log = require('./log.js')('messagesService.js');

var server, servicePort;

var messagesService = function(envConfig, messageApi, userApiClient, gatekeeperHandler) {
  //create the server depending on the type
  if (envConfig.httpPort != null) {
    servicePort = envConfig.httpPort;
    createServer(
      { name: 'TidepoolMessageHttp' },
      messageApi,
      userApiClient,
      gatekeeperHandler
    );
  }

  if (envConfig.httpsPort != null) {
    servicePort = envConfig.httpsPort;
    createServer(
      _.extend({ name: 'TidepoolMessageHttps'}, envConfig.httpsConfig),
      messageApi,
      userApiClient,
      gatekeeperHandler
    );
  }

  return {
    close : stopService,
    start : startService
  };
};


function createServer(serverConfig, messageApi, userApiClient, gatekeeperHandler){

  log.info('Creating server[%s]', serverConfig.name);
  server = restify.createServer(serverConfig);

  server.use(restify.plugins.fullResponse());
  server.use(restify.plugins.bodyParser());
  server.use(restify.plugins.queryParser());

  //setup user client for checking the token
  var userApiMiddleware = require('user-api-client').middleware;
  var checkToken = userApiMiddleware.checkToken(userApiClient);

  //health checks
  server.get('/message/status', messageApi.status);
  server.get('/status', messageApi.status);

  //finding of message(s)
  server.get('/message/read/:msgid', checkToken, gatekeeperHandler.checkPermissionsFromMessage, messageApi.findById);
  server.get('/read/:msgid', checkToken, gatekeeperHandler.checkPermissionsFromMessage, messageApi.findById);
  server.get('/message/thread/:msgid', checkToken, gatekeeperHandler.checkPermissionsFromMessage, messageApi.getThread);
  server.get('/thread/:msgid', checkToken, gatekeeperHandler.checkPermissionsFromMessage, messageApi.getThread);

  server.get('/message/all/:groupid', checkToken, gatekeeperHandler.checkPermissionsFromGroup, messageApi.findAllById);
  server.get('/all/:groupid', checkToken, gatekeeperHandler.checkPermissionsFromGroup, messageApi.findAllById);
  server.get('/message/notes/:groupid', checkToken, gatekeeperHandler.checkPermissionsFromGroup, messageApi.getNotes);
  server.get('/notes/:groupid', checkToken, gatekeeperHandler.checkPermissionsFromGroup, messageApi.getNotes);

  //adding messages
  server.post('/message/send/:groupid', checkToken, gatekeeperHandler.checkPermissionsFromGroup, messageApi.addThread);
  server.post('/send/:groupid', checkToken, gatekeeperHandler.checkPermissionsFromGroup, messageApi.addThread);
  server.post('/message/reply/:msgid', checkToken, gatekeeperHandler.checkPermissionsFromMessage, messageApi.replyToThread);
  server.post('/reply/:msgid', checkToken, gatekeeperHandler.checkPermissionsFromMessage, messageApi.replyToThread);

  //edit
  server.put('/message/edit/:msgid', checkToken, gatekeeperHandler.checkPermissionsFromMessage, messageApi.editMessage);
  server.put('/edit/:msgid', checkToken, gatekeeperHandler.checkPermissionsFromMessage, messageApi.editMessage);

  //delete
  server.del('/message/remove/:msgid', checkToken, gatekeeperHandler.checkPermissionsFromMessage, messageApi.removeMessage);
  server.del('/remove/:msgid', checkToken, gatekeeperHandler.checkPermissionsFromMessage, messageApi.removeMessage);
}

function stopService() {
  log.info('Stopping the Messages API server');
  server.close();
  // force-shutdown if it doesn't shut down by itself
  setTimeout(process.exit.bind(0), 2000);
}

function startService(cb) {
  log.info('Messages API server serving on port[%s]', servicePort);
  server.listen(servicePort,cb);
}

module.exports = messagesService;
