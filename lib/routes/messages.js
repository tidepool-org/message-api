'use strict';

module.exports = function(config) {

    var mongojs,
        dbInstance, 
        messagesCollectionName, 
        messagesCollection;

    messagesCollectionName = 'messages';
    mongojs = require('mongojs');
    dbInstance = mongojs(config.mongodb_connection_string, [messagesCollectionName]);
    messagesCollection = dbInstance.collection(messagesCollectionName);

    /*
        How we want to represent a message
    */
    var returnMessage = function(doc){

        var message = {
            Id:doc._id,
            UserId:doc.UserId,
            GroupId:doc.GroupId,
            TimeStamp:doc.TimeStamp,
            MessageText: doc.MessageText
        };

        return message;
    };

    var validObjectId = function(idString){
        return idString.match(/^[0-9a-fA-F]{24}$/);
    };

    var findById = function(req, res, next) {
        console.log('request', req.params, req.url, req.method);
        
        res.setHeader('content-type', 'application/json');
        var messageId = req.params.msgid;

        if(validObjectId(messageId)){

            messagesCollection.findOne({
                _id:mongojs.ObjectId(messageId)
            }, function(err, doc) {
                if (err) {
                    res.send({'error':err});
                } else {
                    if(doc && doc._id.toString() === messageId){
                        res.send(200,{message:[returnMessage(doc)]});
                    }else{
                        res.send(204);
                    }
                }
            });
        }else{
            res.send(417);
        }

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

        messagesCollection.save(message, function(err, doc) {
            if (err) {
                res.send({'error':err});
            } else {
                res.send(201,{Id:doc._id});
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

