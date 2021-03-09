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

const { createTerminus } = require('@godaddy/terminus');

function createServer(serverConfig, messageApi, userApiClient, gatekeeperHandler){

  log.info('Creating server[%s]', serverConfig.name);
  var server = restify.createServer(serverConfig);

  server.use(restify.plugins.fullResponse());
  server.use(restify.plugins.bodyParser());
  server.use(restify.plugins.queryParser());

  //setup user client for checking the token
  var userApiMiddleware = require('user-api-client').middleware;
  var checkToken = userApiMiddleware.checkToken(userApiClient);

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

  return server;
}

var messagesService = function(envConfig, messageApi, userApiClient, gatekeeperHandler, kafkaConsumer) {

  var server, servicePort;
  //create the server depending on the type
  if (envConfig.httpPort != null) {
    servicePort = envConfig.httpPort;
    server = createServer(
      { name: 'TidepoolMessageHttp' },
      messageApi,
      userApiClient,
      gatekeeperHandler
    );
  }
  else if (envConfig.httpsPort != null) {
    servicePort = envConfig.httpsPort;
    server = createServer(
      _.extend({ name: 'TidepoolMessageHttps'}, envConfig.httpsConfig),
      messageApi,
      userApiClient,
      gatekeeperHandler
    );
  }

  function beforeShutdown() {
    // avoid running into any race conditions
    // https://github.com/godaddy/terminus#how-to-set-terminus-up-with-kubernetes
    return new Promise(resolve => setTimeout(resolve, 5000));
  }

  async function onShutdown() {
    log.info('Stopping the Message API server');
    server.close();
    log.info('Stopping the Kafka producer');
    await kafkaConsumer.stop();
    return;
  }

  async function status() {
    return;
  }

  return {
    onShutdown,
    start: function (cb) {
      log.info('Starting the Kafka consumer');
      kafkaConsumer.start();
      createTerminus(server.server, {
        healthChecks: {
          '/status': status,
          '/message/status': status
        },
        beforeShutdown,
        onShutdown,
      });
      log.info('Start Seagull API server serving on port[%s]', servicePort);
      server.listen(servicePort, cb);
    }
  };
};

module.exports = messagesService;
