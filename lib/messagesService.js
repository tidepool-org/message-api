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
    crud,
    servicePort;

restify = require('restify');

log = require('./log.js')('messagesService.js');

var messagesService = function(crudHandler,port) {

    crud = crudHandler;
    servicePort = port;

    server = restify.createServer({
        name: 'TidepoolMessages'
    });

    server.use(restify.fullResponse());
    server.use(restify.bodyParser());
    server.use(restify.queryParser());

    return {
        stop : stopService,
        start : startService
    };

};

function stopService() {
    log.info('Stopping the Messages API server');
    server.close();
}

function startService() {
    var messages = require('./routes/messagesRoute')(crud);

    //health checks
    server.get('/api/message/status', messages.status);

    //finding of message(s)
    server.get('/api/message/read/:msgid', messages.findById);
    server.get('/api/message/all/:groupid?starttime&endtime', messages.findAllById);
    
    //adding messages
    server.post('/api/message/send/:groupid', messages.add);

    
    log.info('Messages API server serving on port[%s]', servicePort);
    server.listen(servicePort);
}

module.exports = messagesService;