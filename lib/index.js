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

var logMaker = require('./log.js');
var log = logMaker('lib/index.js');

(async function() {
  var config = require('../env');
  var amoeba = require('amoeba');
  var events = require('./handler/events.js');
  var lifecycle = amoeba.lifecycle();
  var hakken = require('hakken')(config.discovery).client();
  lifecycle.add('hakken', hakken);


  var httpClient = amoeba.httpClient();

  var userApiClient = require('user-api-client').client(
    config.userApi,
    lifecycle.add('user-api-watch', hakken.watchFromConfig(config.userApi.serviceSpec))
  );

  var seagullClient = require('tidepool-seagull-client')(
    lifecycle.add('seagull-watch', hakken.watchFromConfig(config.seagull.serviceSpec)),
    {},
    httpClient
  );

  var metrics = require('user-api-client').metrics(
    lifecycle.add('user-api-watch', hakken.watchFromConfig(config.metrics.serviceSpec)),
    config,
    log
  );

  var gatekeeper = require('tidepool-gatekeeper');
  var gatekeeperClient = gatekeeper.client(
    httpClient,
    userApiClient.withServerToken.bind(userApiClient),
    lifecycle.add('gatekeeper-watch', hakken.watchFromConfig(config.gatekeeper.serviceSpec))
  );
  var permsClient = gatekeeper.authorizationClient(gatekeeperClient);

  var crudHandler = require('./handler/mongoHandler')(config.mongoDbConnectionString);

  var messageApi = require('./routes/messageApi')(
    config,
    crudHandler,
    require('./handler/seagullHandler')(seagullClient, userApiClient),
    metrics
  );

  var messagesService = require('./messagesService')(
    config,
    messageApi,
    userApiClient,
    require('./handler/gatekeeperHandler')(permsClient, crudHandler)
  );

  const eventsLogger = logMaker('handler/events.js');
  const eventsConfig = amoeba.events.loadConfigFromEnv();
  const userEventsHandler = events.createUserEventsHandler(crudHandler, eventsLogger);
  const consumer = await amoeba.events.createEventConsumer(eventsConfig, userEventsHandler, eventsLogger);

  lifecycle.add('eventConsumer', {
    start: function() {
      consumer.start();
    },
    close: function() {
      consumer.close();
    },
  });

  lifecycle.add('server', messagesService);

  lifecycle.add(
  'servicePublish!',
  {
    start: function(cb) {
      var serviceDescriptor = { service: config.serviceName };
      if (config.httpsPort != null) {
        serviceDescriptor.host = config.publishHost + ':' + config.httpsPort;
        serviceDescriptor.protocol = 'https';
      } else if (config.httpPort != null) {
        serviceDescriptor.host = config.publishHost + ':' + config.httpPort;
        serviceDescriptor.protocol = 'http';
      }

      log.info('Publishing service[%j]', serviceDescriptor);
      hakken.publish(serviceDescriptor);

      if (cb != null) {
        cb();
      }
    },
    close: function(cb) {
      if (cb!= null) {
        cb();
      }
    }
  });

  lifecycle.start();
  lifecycle.join();

})();
