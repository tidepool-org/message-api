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
  const pre = amoeba.pre;
  var events = require('./handler/events.js');

  var httpClient = amoeba.httpClient();

  var userApiSpec = {
    get: () => {
      return pre.hasProperty(config.userApi.serviceSpec, 'hosts');
    }
  };

  var userApiClient = require('user-api-client').client(
    config.userApi,
    userApiSpec
  );

  var seagullSpec = {
    get: () => {
      return pre.hasProperty(config.seagull.serviceSpec, 'hosts');
    }
  };

  var seagullClient = require('tidepool-seagull-client')(
    seagullSpec,
    {},
    httpClient
  );

  var metricsSpec = {
    get: () => {
      return pre.hasProperty(config.metrics.serviceSpec, 'hosts');
    }
  };

  var metrics = require('user-api-client').metrics(
    metricsSpec,
    config,
    log
  );

  var gatekeeperSpec = {
    get: () => {
      return pre.hasProperty(config.gatekeeper.serviceSpec, 'hosts');
    }
  };

  var gatekeeper = require('tidepool-gatekeeper');
  var gatekeeperClient = gatekeeper.client(
    httpClient,
    userApiClient.withServerToken.bind(userApiClient),
    gatekeeperSpec
  );

  var permsClient = gatekeeper.authorizationClient(gatekeeperClient);

  var crudHandler = require('./handler/mongoHandler')(config.mongoDbConnectionString);

  const eventsLogger = logMaker('handler/events.js');
  const eventsConfig = amoeba.events.loadConfigFromEnv();
  const userEventsHandler = events.createUserEventsHandler(crudHandler, eventsLogger);
  const consumer = await amoeba.events.createEventConsumer(eventsConfig, userEventsHandler, eventsLogger);

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
    require('./handler/gatekeeperHandler')(permsClient, crudHandler),
    consumer
  );

  messagesService.start();

})().catch( e => { console.error(e); } );
