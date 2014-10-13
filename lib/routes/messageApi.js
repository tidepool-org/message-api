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

/*
 *  Messaging API implementation
 */
module.exports = function(config, crudHandler, seagullHandler, metrics) {

  /*
   * How many days before a message is deleted
   */
  var deleteWindowTime = config.deleteWindow;

  /*
   * Get the session token from given request
   */
  function sessionToken(req){
    return req.headers['x-tidepool-session-token'];
  }
  /*
   * An empty list of messages
   */
  var noMessages = [];
  /*
   * Resolve from the userid the profile of user that created the message
   */
  function resolveUserProfiles(messages,token,cb){
    var ids = _(messages).pluck('userid').uniq().valueOf();

    log.debug('resolveUserProfiles: resolving ...');

    seagullHandler.resolveUsers(ids, token, function(resolvedUsers){

      log.debug('resolveUserProfiles: resolved');

      var resolvedMessages = _.map(messages, function(message) {
        message.user = resolvedUsers[message.userid];
        return message;
      });

      return cb(resolvedMessages);
    });
  }
  /*
   * Get the ISO String from the given date param
   */
  function getDateFromParam(datetime){
    if(datetime){
      return new Date(datetime).toISOString();
    }
    return null;
  }
  /*
   * From set when the deletion
   */
  function getDeletionWindow(){
    var instanceOfMoment = sundial.momentInstance();
    var theDate =  instanceOfMoment().utc().add('days', deleteWindowTime);
    return theDate.toISOString();
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
      log.debug('status: params[%j], url[%s], method[%s]', req.params, req.url, req.method);

      if (req.params.status) {
        res.send(parseInt(req.params.status));
        return next();
      } else {
        crudHandler.status(function(error,result){
          log.info('returning status ' + result.statuscode);
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
      metrics.postThisUser('findById', {}, req._sessionToken);

      res.setHeader('content-type', 'application/json');
      var messageId = req.params.msgid;

      crudHandler.getMessage(messageId, function(error,foundMessage){
        if (error){
          log.error(error, 'Error getting message[%s]', messageId);
          res.send(500);
          return next();
        } else {
          if(foundMessage) {
            resolveUserProfiles([foundMessage], sessionToken(req), function(resolvedMessages){
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
      metrics.postThisUser('findAllById', {}, req._sessionToken);

      res.setHeader('content-type', 'application/json');

      var groupId = req.params.groupid;
      var startDate;
      var endDate;

      //if a date that is passed is invalid then lets exit here
      try {
        startDate = getDateFromParam(req.params.starttime);
        endDate = getDateFromParam(req.params.endtime);
      } catch (error) {
        res.send(400);
        return next();
      }

      var started = Date.now();

      crudHandler.getAllMessages(groupId, {start:startDate, end:endDate}, function(error,messages){
        log.info('All messages received in ' + (Date.now() - started) + ' millis.');
        if (error){
          log.error(error, 'Error getting messages for group[%s] from[%s] to[%s]', groupId, startDate, endDate);
          res.send(500);
          return next();
        }else if (_.isEmpty(messages)){
          res.send(404, { messages : noMessages });
          return next();
        }else{
          started = Date.now();
          resolveUserProfiles(messages, sessionToken(req), function(resolvedMessages){
            log.info('Profiles resolved in ' + (Date.now() - started) + ' millis.');
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
      metrics.postThisUser('getNotes', {}, req._sessionToken);

      res.setHeader('content-type', 'application/json');

      var groupId = req.params.groupid;
      var startDate;
      var endDate;

      //if a date that is passed is invalid then lets exit here
      try {
        startDate = getDateFromParam(req.params.starttime);
        endDate = getDateFromParam(req.params.endtime);
      } catch (error) {
        res.send(400);
        return next();
      }
      var started = Date.now();

      crudHandler.getNotes(groupId, {start : startDate, end : endDate}, function(error,messages){
        log.info('Notes received in ' + (Date.now() - started) + ' millis.');
        if (error){
          log.error(error, 'Error getting messages for group[%s]', groupId);
          res.send(500);
          return next();
        }else if (_.isEmpty(messages)){
          res.send(404, { messages : noMessages });
          return next();
        }else{
          started = Date.now();
          resolveUserProfiles(messages, sessionToken(req), function(resolvedMessages){
            log.info('Profiles resolved in ' + (Date.now() - started) + ' millis.');
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

      log.debug('getThread: params[%j], url[%s], method[%s]', req.params, req.url, req.method);
      metrics.postThisUser('getThread', {}, req._sessionToken);

      res.setHeader('content-type', 'application/json');

      var messageId = req.params.msgid;

      var started = Date.now();

      crudHandler.getMessagesInThread(messageId, function(error,messages){

        log.info('Thread received in ' + (Date.now() - started) + ' millis.');

        if (error){
          log.error(error, 'Error getting messages for thread[%s]', messageId);
          res.send(500);
          return next();
        } else if (_.isEmpty(messages)){
          res.send(404, { messages : noMessages });
          return next();
        }else{
          started = Date.now();
          resolveUserProfiles(messages, sessionToken(req), function(resolvedMessages){
            log.info('Profiles resolved in ' + (Date.now() - started) + ' millis.');
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
     * @param {Object} req.params.message the message to add that will start a thread
     * @param {String} req.params.message.userid user who created the message
     * @param {String} req.params.message.groupid the group the message is for
     * @param {String} req.params.message.timestamp ISO_8601 formated string for when the message was created
     * @param {String} req.params.message.messagetext the message
     * @param {Object} res
     * @param {Function} next
     * @return next
     */
    addThread : function(req, res, next) {
      log.debug('addThread: params[%j], url[%s], method[%s]', req.params, req.url, req.method);
      metrics.postThisUser('addThread', {}, req._sessionToken);

      var missing = validate.incomingMessage(req.params.message);

      if( !_.isEmpty(missing) ){
        log.warn('Missing [%j]',missing);
        res.send(400,JSON.stringify(missing));
        return next();
      } else {

        var message = format.incomingMessage(req.params.message);

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
     * @param {Object} req.params.msgid id of the message we are replying to
     * @param {Object} req.params.message the reply to add to an existing thread
     * @param {String} req.params.message.userid user who created the reply
     * @param {String} req.params.message.groupid the group the message is for
     * @param {String} req.params.message.timestamp ISO_8601 formated string for when the message was created
     * @param {String} req.params.message.messagetext the message
     * @param {Object} res
     * @param {Function} next
     * @return next
     */
    replyToThread : function(req, res, next) {
      log.debug('replyToThread: params[%j], url[%s], method[%s]', req.params, req.url, req.method);
      metrics.postThisUser('replyToThread', {}, req._sessionToken);

      var missing = validate.incomingMessage(req.params.message);

      if( !_.isEmpty(missing) ){
        log.warn('Missing [%j]',missing);
        res.send(400,JSON.stringify(missing));
        return next();
      } else {

        var reply = format.incomingReply(req.params.message,req.params.msgid);

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
      log.debug('editMessage: params[%j], url[%s], method[%s]', req.params, req.url, req.method);
      metrics.postThisUser('editMessage', {}, req._sessionToken);

      var missing = validate.incomingEdit(req.params.message);

      if( !_.isEmpty(missing) ){
        log.warn('Missing [%j]',missing);
        res.send(400,JSON.stringify(missing));
        return next();
      } else {
        var updates = format.incomingEdit(req.params.message);

        crudHandler.editMessage(req.params.msgid,updates,function(error, details){

          if(error){
            log.error(error, 'Error editing message[%j]', req.params.msgid);
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
      metrics.postThisUser('removeMessage', {}, req._sessionToken);

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
