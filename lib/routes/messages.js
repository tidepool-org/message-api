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

    var objectIdIsValid = function(idString){
        return idString.match(/^[0-9a-fA-F]{24}$/);
    };

    var messageToSaveIsValid = function(message){
        return message.UserId != ''
        && message.GroupId != ''
        && message.TimeStamp != ''
        && message.MessageText !='';
    };

    var findById = function(req, res, next) {
        console.log('request', req.params, req.url, req.method);
        
        res.setHeader('content-type', 'application/json');
        var messageId = req.params.msgid;

        if(objectIdIsValid(messageId)){

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

        var foundMessages,
            returnMessages,
            patientId,
            startTime,
            endTime;

        patientId = req.params.patientid;
        startTime = req.params.starttime;
        endTime = req.params.endtime;

        foundMessages = messagesCollection.find({ 
            TimeStamp: { $gte: startTime, $lte: endTime },
            GroupId: patientId
        }, function(err,doc){
            if (err) {
                res.send({'error':err});
            } else {
                if(doc && doc.length>0){
                    var returnMessages = [];

                    doc.forEach(function(foundMessage) {
                        returnMessages.push(returnMessage(foundMessage));
                    });

                    res.send(200,{messages:returnMessages});
                }else{
                    res.send(204);
                }
            }
        });

        return next();
    };

    var add = function(req, res, next) {
        console.log('request', req.params, req.url, req.method);

        var message = req.params.message;

        if(messageToSaveIsValid(message)){

            messagesCollection.save(message, function(err, doc) {
                if (err) {
                    res.send({'error':err});
                } else {
                    res.send(201,{Id:doc._id});
                }
            });
        }else{
            res.send(417);
        }
        return next();
    };

    return {
        add: add,
        findAllById: findAllById,
        findById: findById
    }
};

