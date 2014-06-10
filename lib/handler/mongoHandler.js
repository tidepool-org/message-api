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
    dependencyStatus = isDown(dependencyStatus);
  });

  dependencyStatus = isUp(dependencyStatus);

  dbInstance.on('error',function (err) {
    log.error('error with mongo connection',err);
    dependencyStatus = isDown(dependencyStatus);
  });

  dbInstance.on('disconnected', function () {
    log.warn('we lost the mongo connection');
    dependencyStatus = isDown(dependencyStatus);
  });

  var messagesCollection = dbInstance.collection(messagesCollectionName);

  /*
    Mongo is down
  */
  function isDown(status){
    status.deps.up = _.without(status.deps.up, 'mongo');
    status.deps.down = _.union(status.deps.down, ['mongo']);
    return status;
  }

  /*
    Mongo is up
  */
  function isUp(status){
    status.deps.down = _.without(status.deps.down, 'mongo');
    status.deps.up = _.union(status.deps.up, ['mongo']);
    return status;
  }

  /*
   * Control excatly what is returned
   */
  function setMessage(doc){
    return {
      id : doc._id,
      parentmessage: doc.parentmessage,
      userid : doc.userid,
      groupid : doc.groupid,
      timestamp : doc.timestamp,
      messagetext : doc.messagetext
    };
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

  function createTimeQuery(start,end){
    //using mongojs notation for query paramaeters > <
    var retVal = {};

    if (start != null) {
      retVal.$gte = start;
    }

    if (end != null) {
      retVal.$lt = end;
    }

    return retVal;
  }

  function setUpdateFields(message){
    var fields = {};

    if (!_.isEmpty(message.timestamp)) {
      fields.timestamp = message.timestamp;
    }

    if (!_.isEmpty(message.messagetext)) {
      fields.messagetext = message.messagetext;
    }

    return fields;
  }

  function getMessagesForOptions(findOptions, callback){

    /* NOTES:
     *
     * 1) -1 to sort in descending order or a 1 to sort in ascending
     * 2) the default is to filter out the deleted messages unless otherwise specified
     */

    findOptions = _.assign({deleteflag : null}, findOptions);

    messagesCollection
      .find(findOptions)
      .sort({timestamp:-1},
      function(error,docs){
        if (error) {
          return callback(error,null);
        } else if (_.isEmpty(docs)){
          return callback(null,[]);
        }
        var messages = [];

        docs.forEach(function(foundMessage) {
          messages.push(setMessage(foundMessage));
        });
        return callback(null, messages);
      });
  }

  function updateExistingMessage(id,updates,callback){

    messagesCollection
      .findAndModify({
      query: {  _id : mongojs.ObjectId(id) },
      update: { $set : updates },
      new: true //returns the updated document
    }, function(err, update) {

      //clone and set the id
      var updatedMessage = _.clone(_.omit(update,'_id'));
      updatedMessage.id = update._id;

      return callback(err,updatedMessage);
    });
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

    getMessage: function(messageId, options, callback) {

      log.debug('Finding message for messageId[%s]', messageId);

      if(typeof options === 'function'){
        callback = options;
        options = null;
      }

      options = _.assign({deleteflag : null}, options);

      if(objectIdIsValid(messageId)){

        options._id = mongojs.ObjectId(messageId);

        messagesCollection
        .findOne(options, function(error, doc) {
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

    editMessage: function(updateDetails, callback) {

      log.debug('Updating message with messageId[%s]', updateDetails.id);

      var updates = setUpdateFields(updateDetails);

      return updateExistingMessage(updateDetails.id, updates, callback);
    },

    deleteMessage: function(deletionDetails,callback) {

      log.debug('Deleting message with messageId[%s]', deletionDetails.id);

      var updates = { deleteflag : deletionDetails.deleteflag };

      return updateExistingMessage(deletionDetails.id, updates, callback);
    },

    getAllMessages: function(groupId, options, callback) {

      if(typeof options === 'function'){
        callback = options;
        options = { start:null, end: null };
      }

      log.debug('Finding all messages for group[%s] from[%s] to[%s]', groupId, options.start, options.end);

      var timeQueryOptions = createTimeQuery(options.start,options.end);

      var findOptions = {groupid : groupId};

      if(!_.isEmpty(timeQueryOptions)){
        findOptions.timestamp = timeQueryOptions;
      }

      return getMessagesForOptions(findOptions,callback);
    },

    getNotes: function(groupId, options, callback) {

      if(typeof options === 'function'){
        callback = options;
        options = { start:null, end: null };
      }

      log.debug('Finding all notes for group[%s] from[%s] to[%s]', groupId, options.start, options.end);
      var timeQueryOptions = createTimeQuery(options.start, options.end);
      var findOptions = { parentmessage : null, groupid : groupId };

      if(!_.isEmpty(timeQueryOptions)){
        findOptions.timestamp = timeQueryOptions;
      }

      return getMessagesForOptions(findOptions,callback);
    },

    getMessagesInThread: function(messageId, callback) {
      log.debug('Finding all messages for thread[%s]', messageId);

      var findOptions = { $or: [ { _id : mongojs.ObjectId(messageId) }, { parentmessage : messageId } ] };
      return getMessagesForOptions(findOptions,callback);
    }
  };
};