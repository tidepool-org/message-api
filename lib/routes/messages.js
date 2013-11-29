'use strict';

module.exports = function(config) {

    var mongojs, dbInstance, messagesCollectionName, messagesCollection;

    messagesCollectionName = 'messages';
    mongojs = require('mongojs');
    dbInstance = mongojs(config.mongodb_connection_string, [messagesCollectionName]);
    messagesCollection = dbInstance.collection(messagesCollectionName);

    var findById = function(req, res, next) {
        console.log('request', req.params, req.url, req.method);
        //TODO:
        res.setHeader('content-type', 'application/json');

        var dummyMessage = {
            Id : "5297f93c6e9f1a420a000004",
            UserId: "12121212",
            GroupId: "999",
            TimeStamp: "2013-11-28T23:07:40+00:00",
            MessageText: "In three words I can sum up everything I've learned about life: it goes on."
        };

        res.send({message:[dummyMessage]});
        return next();
    };

    var findAllById = function(req, res, next) {
        console.log('request', req.params, req.url, req.method);
    	res.setHeader('content-type', 'application/json');
        //TODO:
        res.send({messages:['one message', 'two message']});
        return next();
    };

    var add = function(req, res, next) {
        console.log('request', req.params, req.url, req.method);

        var message = req.params.message;

        messagesCollection.save(message, function(err, result) {
            if (err) {
                res.send({'error':err});
            } else {
                res.send(201,{id:result._id});
            }
        });
        return next();
    };

    return {
        add: add,
        findAllById: findAllById,
        findById: findById
    }
};

