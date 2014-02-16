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

var mongojs = require('mongojs');
var _ = require('lodash');

var log = require('../log.js')('mongoHandler.js');

var messagesCollectionName = 'messages';

/*
Handler CRUD opertaions via Mongo instance
*/
module.exports = function(connectionString) {

  var dependencyStatus = { running: false, deps: { up: [], down: [] } };

  var dbInstance = mongojs(connectionString, [messagesCollectionName],function(err){
    log.error('error opening mongo');
    dependencyStatus.deps.up = _.without(dependencyStatus.deps.up, 'mongo');
    dependencyStatus.deps.down = _.union(dependencyStatus.deps.down, ['mongo']);
  });

  dependencyStatus.deps.down = _.without(dependencyStatus.deps.down, 'mongo');
  dependencyStatus.deps.up = _.union(dependencyStatus.deps.up, ['mongo']);

  var messagesCollection = dbInstance.collection(messagesCollectionName);

  //With mongo we change to use the id field
  function setMessage(doc){

    var message = {
      id : doc._id,
      parentmessage: doc.parentmessage,
      userid : doc.userid,
      groupid : doc.groupid,
      timestamp : doc.timestamp,
      messagetext : doc.messagetext
    };

    return message;
  }

  //Is the given Id valid for Mongo
  function objectIdIsValid(idString){
    try{
      mongojs.ObjectId(idString);
    }catch(error){
      log.warn('given[%j] is an invalid mongojs.ObjectId.',idString);
      return false;
    }
    return true;
  }

  return {

    status: function status(callback) {
      log.debug('checking status');
      return callback(null, dependencyStatus);
    },

    createMessage:  function(message,callback) {
      log.debug('Adding message[%j]', message);

      messagesCollection.save(message, function(error, doc) {
        if (error) {
          return callback(error,null);
        } else {
          return callback(null,doc._id);
        }
      });
    },

    getMessage: function(messageId,callback) {

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
    },

    getAllMessages: function(groupId, start, end, callback) {

      log.debug('Finding all messages for group[%s] from[%s] to[%s]', groupId, start, end);

      var timeQueryOptions;

      if(end){
        //using mongojs notation for query paramaeters >= <=
        timeQueryOptions = { $gte: start, $lte: end };
      }else{
        timeQueryOptions = { $gte: start};
      }
      messagesCollection.find(
        { timestamp : timeQueryOptions, groupid : groupId },
        function(error,docs){
          if (error) {
            return callback(error,null);
          } else if (docs && docs.length>0){
            var messages = [];

            docs.forEach(function(foundMessage) {
              messages.push(setMessage(foundMessage));
            });
            return callback(null, messages);
          }
          return callback(null,[]);
        });
    },

    getMessagesInThread: function(messageId, callback) {
      log.debug('Finding all messages for thread[%s]', messageId);

      messagesCollection.find(
        { $or: [ { _id : mongojs.ObjectId(messageId) }, { parentmessage : messageId } ] },
        function(error,docs){
          log.debug('looked ',error);
          if (error) {
            return callback(error,null);
          } else if (docs && docs.length>0){
            var messages = [];

            docs.forEach(function(foundMessage) {
              messages.push(setMessage(foundMessage));
            });
            return callback(null, messages);
          }
          return callback(null,[]);
        });
    }
  };
};