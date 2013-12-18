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

function handleCreateMessage (message,callback) {
    log.debug('Create in mongo group[%j]', group);

}

function handleGetMessage(messageId,callback) {
    
    log.debug('Finding message for messageId[%s]', messageId);

    messagesCollection.findOne(
        { _id : mongojs.ObjectId(messageId)},
    function(error, doc) {
        if (err) {
            return callback(error,null)
        } else {
            return callback(null,setMessage(doc));
        }
    });
}

function handleGetAllMessages(userId,callback) {
    log.debug('Finding groups owned by userid[%s]', userId);

    messagesCollection.find(
        { owners : userId },
    function(error,doc){
        if (error) {
            return callback(error,null);
        } else {
            var messages = [];
            doc.forEach(function(item){
                messages.push(setMessage(item));
            });
            return callback(null,messages);
        }
    });
    
}

module.exports = mongoHandler;
