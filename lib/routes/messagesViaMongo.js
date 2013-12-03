'use strict';

/*
    Mongo instance of messaging-api CRUD operations
*/
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
            id : doc._id,
            userid : doc.userid,
            groupid : doc.groupid,
            timestamp : doc.timestamp,
            messagetext : doc.messagetext
        };

        return message;
    };

    /*
        Id the given Id valid for Mongo
    */
    var objectIdIsValid = function(idString){
        try{
            var id = mongojs.ObjectId(idString);
        }catch(error){
            return false;
        }
        return true;
    };

    /*
        Does this message have all the fields we require?
    */
    var messageToSaveIsValid = function(message){
        return message.userid != ''
        && message.groupid != ''
        && message.timestamp != ''
        && message.messagetext !='';
    };

    var findById = function(req, res, next) {
        console.log("Request came in!  params[%j], url[%s], method[%s]", req.params, req.url, req.method);
        
        res.setHeader('content-type', 'application/json');
        var messageId = req.params.msgid;

        if(objectIdIsValid(messageId)){
       
            messagesCollection.findOne({
                _id : mongojs.ObjectId(messageId)
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
            res.send(400);
        }

        return next();
        
    };

    var findAllById = function(req, res, next) {
        console.log("Request came in!  params[%j], url[%s], method[%s]", req.params, req.url, req.method);
    	res.setHeader('content-type', 'application/json');

        var timeQueryOptions;

        if(req.params.endtime){
            //using mongojs notation for query paramaeters >= <=
            timeQueryOptions = { $gte: req.params.starttime, $lte: req.params.endtime };
        }else{
            timeQueryOptions = { $gte: req.params.starttime};
        }

        messagesCollection.find({ 
            timestamp: timeQueryOptions,
            groupid: req.params.groupid
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
        console.log("Request came in!  params[%j], url[%s], method[%s]", req.params, req.url, req.method);

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
            res.send(400);
        }
        return next();
    };

    return {
        add: add,
        findAllById: findAllById,
        findById: findById
    }
};

