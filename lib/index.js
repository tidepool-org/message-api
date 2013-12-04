/*
 * == TIDEPOOL LICENSE ==
 * Copyright (C) 2013 Tidepool Project
 * 
 * This source code is subject to the terms of the Tidepool Open Data License, v. 1.0.
 * If a copy of the license was not provided with this file, you can obtain one at:
 *     http://tidepool.org/license/
 * 
 * == TIDEPOOL LICENSE ==
 */
 
(function() {
    'use strict';

    var messages,
        config, 
        restify, 
        server,
        port, 
        log;

    config = require('../env');
    restify = require('restify');
    messages = require('./routes/messagesViaMongo')(config);
    log = require('./log.js')('index.js');
    port = config.port;

    server = restify.createServer({
        name: 'TidepoolMessages'
    });

    server.use(restify.fullResponse());
    server.use(restify.bodyParser());

    server.post('/api/message/send/:groupid', messages.add);
    server.get('/api/message/read/:msgid', messages.findById);
    server.get('/api/message/all/:groupid/:starttime/:endtime', messages.findAllById);
    server.get('/api/message/all/:groupid/:starttime', messages.findAllById);

    log.info('messages API server serving on port[%s]', port);
    server.listen(port);

}).call(this);
