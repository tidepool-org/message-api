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

var messagesService = function(envConfig, crudHandler, userApiClient, seagullHandler, gatekeeperHandler, metrics) {
  //create the server depending on the type
  if (envConfig.httpPort != null) {
    servicePort = envConfig.httpPort;
    createServer({ name: 'TidepoolMessageHttp' },
      crudHandler,
      userApiClient,
      seagullHandler,
      gatekeeperHandler,
      metrics
    );
  }

  if (envConfig.httpsPort != null) {
    servicePort = envConfig.httpsPort;
    createServer(
      _.extend({ name: 'TidepoolMessageHttps'}, envConfig.httpsConfig),
      crudHandler,
      userApiClient,
      seagullHandler,
      gatekeeperHandler,
      metrics
    );
  }

  return {
    stop : stopService,
    start : startService
  };
};


function createServer(serverConfig, crudHandler, userApiClient, seagullHandler, gatekeeperHandler, metrics){

    log.info('Creating server[%s]', serverConfig.name);
    server = restify.createServer(serverConfig);

    server.use(restify.fullResponse());
    server.use(restify.bodyParser());
    server.use(restify.queryParser());
    var messages = require('./routes/messageApi')(crudHandler, seagullHandler, metrics);
    //setup user client for checking the token
    var userApiMiddleware = require('user-api-client').middleware;
    var checkToken = userApiMiddleware.checkToken(userApiClient);

    //health checks
    server.get('/status', messages.status);

    //finding of message(s)
    server.get('/read/:msgid', checkToken, messages.findById);
    server.get('/thread/:msgid', checkToken, messages.getThread);

    server.get('/all/:groupid?starttime&endtime', checkToken, gatekeeperHandler.checkPermissionsFromGroup, messages.findAllById);
    server.get('/notes/:groupid?starttime&endtime', checkToken, gatekeeperHandler.checkPermissionsFromGroup, messages.getNotes);

    //adding messages
    server.post('/send/:groupid', checkToken, gatekeeperHandler.checkPermissionsFromMessage, messages.addThread);
    server.post('/reply/:msgid', checkToken, gatekeeperHandler.checkPermissionsFromMessage, messages.replyToThread);
  }

function stopService() {
  log.info('Stopping the Messages API server');
  server.close();
}

function startService(cb) {
  log.info('Messages API server serving on port[%s]', servicePort);
  server.listen(servicePort,cb);
}

module.exports = messagesService;