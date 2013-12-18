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

    server.post('/api/message/send/:groupid', messages.add);
    server.get('/api/message/read/:msgid', messages.findById);
    
    server.get('/api/message/all/:groupid?starttime&endtime', messages.findAllById);

    
    log.info('Messages API server serving on port[%s]', servicePort);
    server.listen(servicePort);
}

module.exports = messagesService;