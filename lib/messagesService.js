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

var messagesService = function(envConfig, messageApi, userApiClient, authorizationHandler) {
  //create the server depending on the type
  if (envConfig.httpPort != null) {
    servicePort = envConfig.httpPort;
    createServer(
      { name: 'TidepoolMessageHttp' },
      messageApi,
      userApiClient,
      authorizationHandler
    );
  }

  if (envConfig.httpsPort != null) {
    servicePort = envConfig.httpsPort;
    createServer(
      _.extend({ name: 'TidepoolMessageHttps'}, envConfig.httpsConfig),
      messageApi,
      userApiClient,
      authorizationHandler
    );
  }

  return {
    close : stopService,
    start : startService
  };
};


function createServer(serverConfig, messageApi, userApiClient, authorizationHandler){

  log.info('Creating server[%s]', serverConfig.name);
  server = restify.createServer(serverConfig);

  server.use(restify.plugins.fullResponse());
  server.use(restify.plugins.bodyParser());
  server.use(restify.plugins.queryParser());

  //setup user client for checking the token
  var userApiMiddleware = require('user-api-client').middleware;
  var checkToken = userApiMiddleware.checkToken(userApiClient);

  //health checks
  server.get('/status', messageApi.status);

  //finding of message(s)
  server.get('/read/:msgid', checkToken, authorizationHandler.authorizeFromMessage, messageApi.findById);
  server.get('/thread/:msgid', checkToken, authorizationHandler.authorizeFromMessage, messageApi.getThread);

  server.get('/all/:groupid', checkToken, authorizationHandler.authorize, messageApi.findAllById);
  server.get('/notes/:groupid', checkToken, authorizationHandler.authorize, messageApi.getNotes);

  //adding messages
  server.post('/send/:groupid', checkToken, authorizationHandler.authorize, messageApi.addThread);
  server.post('/reply/:msgid', checkToken, authorizationHandler.authorizeFromMessage, messageApi.replyToThread);

  //edit
  server.put('/edit/:msgid', checkToken, authorizationHandler.authorizeFromMessage, messageApi.editMessage);

  //delete
  server.del('/remove/:msgid', checkToken, authorizationHandler.authorizeFromMessage, messageApi.removeMessage);
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
