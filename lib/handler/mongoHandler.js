/*
 * Copyright (c) 2014, Tidepool Project
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice, this
 * list of conditions and the following disclaimer in the documentation and/or other
 * materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 * IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 * NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
 
'use strict';

var mongojs = require('mongojs'),
    messagesCollection,
    messagesCollectionName = 'messages',
    dependencyStatus = { running: false, deps: { up: [], down: [] } },
    log = require('../log.js')('mongoHandler.js');

/*
    Handler CRUD opertaions via Mongo instance
*/
var mongoHandler = function(connectionString) {

    var dbInstance = mongojs(connectionString, [messagesCollectionName]);
    messagesCollection = dbInstance.collection(messagesCollectionName);

    return {
        status : handleStatus,
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

function handleStatus(callback){
    log.debug('checking status');
    dependencyStatus.running = (dependencyStatus.deps.down.length === 0);
    dependencyStatus.statuscode = dependencyStatus.running ? 200 : 500;
    return callback(null,dependencyStatus);
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
