'use strict';

var mongojs = require('mongojs'),
    messagesCollection,
    messagesCollectionName = 'messages',
    log = require('../log.js')('mongoHandler.js');

/*
    Handler CRUD opertaions via Mongo instance
*/
var mongoHandler = function(connectionString) {

    var dbInstance = mongojs(connectionString, [messagesCollectionName]);
    messagesCollection = dbInstance.collection(messagesCollectionName);

    return {
        createMessage : handleCreateMessage,
        getMessage : handleGetMessage,
        getAllMessages : handleGetAllMessages
    };
};

/*
    With mongo we change to use the id field
*/
function setMessage(doc){

    var message = {
        id : doc._id,
        userid : doc.userid,
        groupid : doc.groupid,
        timestamp : doc.timestamp,
        messagetext : doc.messagetext
    };

    return message;
}

/*
    Is the given Id valid for Mongo
*/
function objectIdIsValid(idString){
    try{
        mongojs.ObjectId(idString);
    }catch(error){
        log.warn('given[%j] is an invalid mongojs.ObjectId.',idString);
        return false;
    }
    return true;
}

function handleCreateMessage (message,callback) {
    log.debug('Adding message[%j]', message);

    messagesCollection.save(message, function(error, doc) {
        if (error) {
            return callback(error,null);
        } else {
            return callback(null,doc._id);
        }
    });

}

function handleGetMessage(messageId,callback) {
    
    log.debug('Finding message for messageId[%s]', messageId);

    if(objectIdIsValid(messageId)){

        messagesCollection.findOne(
            { _id : mongojs.ObjectId(messageId)},
            function(error, doc) {
            if (error) {
                return callback(error,null);
            } else if(doc){         
                return callback(null,setMessage(doc));
            }
            return callback(null,null);
        });
    }else{
        return callback(null,null);
    }
}

function handleGetAllMessages(groupId, startTime, endTime, callback) {

    log.debug('Finding all messages for group[%s] from[%s] to[%s]', groupId, startTime, endTime);   

    var timeQueryOptions;

    if(endTime){
        //using mongojs notation for query paramaeters >= <=
        timeQueryOptions = { $gte: startTime, $lte: endTime };
    }else{
        timeQueryOptions = { $gte: startTime};
    }

    messagesCollection.find(
        { timestamp : timeQueryOptions, groupid : groupId }, 
        function(error,doc){
            if (error) {
                return callback(error,null);
            } else if (doc && doc.length>0){
                var messages = [];

                doc.forEach(function(foundMessage) {
                    messages.push(setMessage(foundMessage));
                });
                return callback(null, messages);
            }
            return callback(null,null);
        });
    
}

module.exports = mongoHandler;
