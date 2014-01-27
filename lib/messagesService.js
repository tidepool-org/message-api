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

var restify,
    server,
    log,
    servicePort;

restify = require('restify');

log = require('./log.js')('messagesService.js');

var messagesService = function(crudHandler, userApiHostGetter, envConfig) {

    //create the server depending on the type
    if (envConfig.httpPort != null) {
        servicePort = envConfig.httpPort;
        createServer({ name: 'TidepoolMessagesHttp' },envConfig,crudHandler,userApiHostGetter);
    }

    if (envConfig.httpsPort != null) {
        servicePort = envConfig.httpsPort;
        createServer(_.extend({ name: 'TidepoolMessagesHttps'},envConfig,crudHandler,userApiHostGetter));
    }

    return {
        stop : stopService,
        start : startService
    };

};


function createServer(serverConfig, envConfig, crudHandler, userApiHostGetter){
    log.info('Creating server[%s]', serverConfig.name);
    server = restify.createServer(serverConfig);

    server.use(restify.fullResponse());
    server.use(restify.bodyParser());
    server.use(restify.queryParser());

    var messages = require('./routes/messageApi')(crudHandler);
    var userApi = require('./routes/userApi')(envConfig, userApiHostGetter);

    //health checks
    server.get('/api/message/status', messages.status);

    //finding of message(s)
    server.get('/api/message/read/:msgid', userApi.checkToken, userApi.getToken, messages.findById);
    server.get('/api/message/all/:groupid?starttime&endtime', userApi.checkToken, userApi.getToken, messages.findAllById);
    
    //adding messages
    server.post('/api/message/send/:groupid', userApi.checkToken, userApi.getToken, messages.add);
    
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