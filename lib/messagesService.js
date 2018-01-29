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

  server.use(restify.fullResponse());
  server.use(restify.bodyParser());
  server.use(restify.queryParser());

  //setup user client for checking the token
  var userApiMiddleware = require('user-api-client').middleware;
  var checkTokenInternal = userApiMiddleware.checkToken(userApiClient, 'tidepool:internal');
  var checkTokenPublic = userApiMiddleware.checkToken(userApiClient, 'tidepool:public');

  //health checks
  server.get('/status', messageApi.status);

  //finding of message(s)
  server.get('/read/:msgid', checkTokenPublic, gatekeeperHandler.checkPermissionsFromMessage, messageApi.findById);
  server.get('/thread/:msgid', checkTokenPublic, gatekeeperHandler.checkPermissionsFromMessage, messageApi.getThread);

  server.get('/all/:groupid?starttime&endtime', checkTokenPublic, gatekeeperHandler.checkPermissionsFromGroup, messageApi.findAllById);
  server.get('/notes/:groupid?starttime&endtime', checkTokenPublic, gatekeeperHandler.checkPermissionsFromGroup, messageApi.getNotes);

  //adding messages
  server.post('/send/:groupid', checkTokenInternal, gatekeeperHandler.checkPermissionsFromGroup, messageApi.addThread);
  server.post('/reply/:msgid', checkTokenInternal, gatekeeperHandler.checkPermissionsFromMessage, messageApi.replyToThread);

  //edit
  server.put('/edit/:msgid', checkTokenInternal, gatekeeperHandler.checkPermissionsFromMessage, messageApi.editMessage);

  //delete
  server.del('/remove/:msgid', checkTokenInternal, gatekeeperHandler.checkPermissionsFromMessage, messageApi.removeMessage);
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