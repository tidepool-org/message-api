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
var _ = require('lodash');
var sundial = require('sundial');

var log = require('../log.js')('messageApi.js');
var format = require('../validation/format');
var validate = require('../validation/validate');
var utility = require('./utility.js')();

/*
 *  Messaging API implementation
 */
module.exports = function(config, crudHandler, seagullHandler, metrics) {

  /*
   * How many days before a message is deleted
   */
  var deleteWindowTime = config.deleteWindow;

  /*
   * An empty list of messages
   */
  var noMessages = [];
  /*
   * Resolve from the userid the profile of user that created the message
   */
  function resolveUserProfiles(messages, cb){
    var ids = _(messages).map('userid').compact().uniq().valueOf();

    log.info('get [%s] different profiles',ids.length);

    if (_.isEmpty(ids)) {
      return cb(messages);
    }

    seagullHandler.resolveUsers(ids, function(resolvedUsers){

      var resolvedMessages = _.map(messages, function(message) {
        var resolvedUser = resolvedUsers[message.userid];
        if (resolvedUser) {
          message.user = resolvedUser;
        }
        return message;
      });

      log.info('messages [%s] updated with profiles',resolvedMessages.length);

      return cb(resolvedMessages);
    });
  }
  /*
   * From set when the deletion
   */
  function getDeletionWindow(){
    return sundial.futureDate(deleteWindowTime);
  }

  return {

    /*
     * status check for the API to let us know all is good or if not what is down
     *
     * @param {Object} req
     * @param {Object} res
     * @param {Function} next
     */
    status : function(req, res, next) {
      log.debug('status: query[%j], url[%s], method[%s]', req.query, req.url, req.method);
      if (req.query.status) {
        res.send(parseInt(req.query.status));
        return next();
      } else {
        crudHandler.status(function(error,result){
          log.trace('returning status ' + result.statuscode);
          res.send(result.statuscode, result.deps);
          return next();
        });
      }
    },

    /*
     * Find the message for the given id and sets res.send() with the appropriate response
     *
     * @param {Object} req
     * @param {String} req.params.msgid Id of the message to find
     * @param {Object} res
     * @param {Function} next
     * @return next
     */
    findById : function(req, res, next) {
      log.debug('findById: params[%j], url[%s], method[%s]', req.params, req.url, req.method);

      res.setHeader('content-type', 'application/json');
      var messageId = req.params.msgid;

      crudHandler.getMessage(messageId, function(error,foundMessage){
        if (error){
          log.error(error, 'Error getting message[%s]', messageId);
          res.send(500);
          return next();
        } else {
          if(foundMessage) {
            resolveUserProfiles([foundMessage], function(resolvedMessages){
              res.send(200, { message : _.first(resolvedMessages)});
              return next();
            });
          }else{
            log.info('message not found for id[%s]',messageId);
            var noMessage = {};
            res.send(404, { message : noMessage });
            return next();
          }
        }
      });
    },
    /*
     * Find all message for the given group id and sets res.send() with the appropriate response
     *
     * @param {Object} req
     * @param {String} req.params.groupid Id of the group to find messages for
     * @param {Object} res
     * @param {Function} next
     * @return next
     */
    findAllById : function(req, res, next) {
      log.debug('findAllById: params[%j], url[%s], method[%s]', req.params, req.url, req.method);

      res.setHeader('content-type', 'application/json');

      var groupId = req.params.groupid;
      var startDate;
      var endDate;

      //if a date that is passed is invalid then lets exit here
      try {
        startDate = utility.getISODate(req.params.starttime);
        endDate = utility.getISODate(req.params.endtime);
      } catch (error) {
        log.error(error, 'findAllById error parsing dates start[%s] end[%s]', startDate, endDate);
        res.send(400);
        return next();
      }

      var started = Date.now();

      crudHandler.getAllMessages(groupId, {start:startDate, end:endDate}, function(error,messages){
        if (error){
          log.error(error, 'Error getting messages for group[%s] from[%s] to[%s]', groupId, startDate, endDate);
          res.send(500);
          return next();
        }else if (_.isEmpty(messages)){
          res.send(404, { messages : noMessages });
          return next();
        }else{
          log.info('findAllById: messages (n=%d) received in [%s]millis for [%s] ', messages.length, (Date.now() - started), groupId);
          started = Date.now();
          resolveUserProfiles(messages, function(resolvedMessages){
            log.info('findAllById: profiles resolved in [%s]millis for [%s] ', (Date.now() - started), groupId);
            res.send(200, {messages : resolvedMessages});
            return next();
          });
        }
      });
    },
    /*
     * Find all the notes, i.e. top level messages that are not in response to another message,
     * for the given group id and sets res.send() with the appropriate response
     *
     * @param {Object} req
     * @param {String} req.params.groupid id of the group to find notes for
     * @param {String} req.params.starttime [startime=''] optional starttime
     * @param {String} req.params.endtime [endtime=''] optional endtime
     * @param {Object} res
     * @param {Function} next
     * @return next
     */
    getNotes : function(req, res, next) {
      log.debug('getNotes: params[%j], url[%s], method[%s]', req.params, req.url, req.method);

      res.setHeader('content-type', 'application/json');

      var groupId = req.params.groupid;
      var startDate;
      var endDate;

      //if a date that is passed is invalid then lets exit here
      try {
        startDate = utility.getISODate(req.params.starttime);
        endDate = utility.getISODate(req.params.endtime);
      } catch (error) {
        log.error(error, 'getNotes error parsing dates start[%s] end[%s]', startDate, endDate);
        res.send(400);
        return next();
      }
      var started = Date.now();

      crudHandler.getNotes(groupId, {start : startDate, end : endDate}, function(error,messages){
        if (error){
          log.error(error, 'Error getting messages for group[%s]', groupId);
          res.send(500);
          return next();
        } else if (_.isEmpty(messages)){
          res.send(404, { messages : noMessages });
          return next();
        }else{
          log.info('getNotes: messages (n=%d) received in [%s]millis for [%s] ', messages.length, (Date.now() - started) ,groupId);
          started = Date.now();
          resolveUserProfiles(messages, function(resolvedMessages){
            log.info('getNotes: profiles resolved in [%s]millis for [%s] ', (Date.now() - started), groupId);
            res.send(200, {messages : resolvedMessages});
            return next();
          });
        }
      });
    },
    /*
     * Find a message thread for the given parent notes id and sets res.send() with the appropriate response
     *
     * @param {Object} req
     * @param {String} req.params.msgid id of the parent note
     * @param {Object} res
     * @param {Function} next
     * @return next
     */
    getThread : function(req, res, next) {
      // console.log(req);
      // console.log('WE DA BEST');
      log.debug('getThread: params[%j], url[%s], method[%s]', req.params, req.url, req.method);

      res.setHeader('content-type', 'application/json');

      var messageId = req.params.msgid;

      var started = Date.now();

      crudHandler.getMessagesInThread(messageId, function(error,messages){

        if (error){
          log.error(error, 'Error getting messages for thread[%s]', messageId);
          res.send(500);
          return next();
        } else if (_.isEmpty(messages)){
          res.send(404, { messages : noMessages });
          return next();
        }else{
          log.info('getThread: thread (n=%d) received in [%s]millis for [%s] ', messages.length, (Date.now() - started), messageId);
          started = Date.now();
          resolveUserProfiles(messages, function(resolvedMessages){
            log.info('getThread: profiles resolved in [%s]millis for [%s] ', (Date.now() - started), messageId);
            res.send(200, {messages : resolvedMessages});
            return next();
          });
        }
      });
    },
    /*
     * Start a message thread by creating a parent note and sets res.send() with the appropriate response
     *
     * @param {Object} req
     * @param {Object} req.body.message the message to add that will start a thread
     * @param {String} req.body.message.userid user who created the message
     * @param {String} req.body.message.groupid the group the message is for
     * @param {String} req.body.message.timestamp ISO_8601 formated string for when the message was created
     * @param {String} req.body.message.messagetext the message
     * @param {Object} res
     * @param {Function} next
     * @return next
     */
    addThread : function(req, res, next) {
      log.debug('addThread: body[%j], url[%s], method[%s]', req.body, req.url, req.method);
      // console.log(req);
      // console.log('WE DA BEST');
      var missing = validate.incomingMessage(req.body.message);
    
      if( !_.isEmpty(missing) ){
        log.warn('Missing [%j]',missing);
        res.send(400,JSON.stringify(missing));
        return next();
      } else {

        var message = format.incomingMessage(req._tokendata.userid, req.body.groupid, req.body.message);

        crudHandler.createMessage(
          message,
          function(error,messageId){
            if(error){
              log.error(error, 'Error adding message[%j]', message);
              res.send(500);
            } else {
              res.send(201,{id : messageId});
            }
            return next();
          });
      }
    },
    /*
     * Reply to an existing message thread. sets res.send() with the appropriate response
     *
     * @param {Object} req
     * @param {Object} req.body.msgid id of the message we are replying to
     * @param {Object} req.body.message the reply to add to an existing thread
     * @param {String} req.body.message.userid user who created the reply
     * @param {String} req.body.message.groupid the group the message is for
     * @param {String} req.body.message.timestamp ISO_8601 formated string for when the message was created
     * @param {String} req.body.message.messagetext the message
     * @param {Object} res
     * @param {Function} next
     * @return next
     */
    replyToThread : function(req, res, next) {
      log.debug('replyToThread: body[%j], url[%s], method[%s]', req.body, req.url, req.method);
      // console.log(req);
      // console.log('WE DA BEST');
      var missing = validate.incomingReply(req.body.message);

      if( !_.isEmpty(missing) ){
        log.warn('Missing [%j]',missing);
        res.send(400,JSON.stringify(missing));
        return next();
      } else {

        var reply = format.incomingReply(req._tokendata.userid, req._message, req.body.message);

        crudHandler.createMessage(reply,function(error,messageId){
          if(error){
            log.error(error, 'Error adding message[%j]', reply);
            res.send(500);
          } else {
            res.send(201,{id : messageId});
          }
          return next();
        });
      }
    },
    /*
     * Edit the time and/or content of an existing message.
     *
     * @param {Object} req
     * @param {String} req.params.msgid id of the message we are editing
     * @param {Object} req.params.message content we are updating
     * @param {String} req.params.message.timestamp the updated ISO_8601 formated string
     * @param {String} req.params.message.messagetext the updated message text
     * @param {Object} res
     * @param {Function} next
     * @return next
     */
    editMessage : function(req, res, next) {
      log.debug('editMessage: body[%j], url[%s], method[%s]', req.body, req.url, req.method);

      var missing = validate.incomingEdit(req.body.message);

      if( !_.isEmpty(missing) ){
        log.warn('Missing [%j]',missing);
        res.send(400,JSON.stringify(missing));
        return next();
      } else {
        var updates = format.incomingEdit(req.body.message);

        crudHandler.editMessage(req.body.msgid,updates,function(error, details){

          if(error){
            log.error(error, 'Error editing message[%j]', req.body.msgid);
            res.send(500);
          } else {
            res.send(200);
          }
          return next();
        });
      }
    },
    /*
     * Remove the message for the given id
     *
     * @param {Object} req
     * @param {Object} req.params.msgid id of the message we are removing
     * @param {Object} res
     * @param {Function} next
     * @return next
     */
    removeMessage : function(req, res, next) {
      log.debug('removeMessage: params[%j], url[%s], method[%s]', req.params, req.url, req.method);

      res.setHeader('content-type', 'application/json');

      var updates = {
        deleteflag : getDeletionWindow(),
        modifiedtime : sundial.utcDateString()
      };

      crudHandler.deleteMessage(req.params.msgid, updates, function(error, deletionDetails){

        if(error){
          log.error(error, 'Error removing message[%s]', req.params.msgid);
          res.send(500);
        } else {
          res.send(202);
        }
        return next();
      });
    }
  };
};
