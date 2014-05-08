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

var log = require('../log.js')('messageApi.js');

/*
  Messaging API implementation
*/
module.exports = function(crudHandler, seagullHandler, metrics) {

  /*
  HELPER METHODS
  */

  var messageToSave = function(inBoundMessage){

    if (isSet(inBoundMessage.userid) &&
      isSet(inBoundMessage.groupid) &&
      isSet(inBoundMessage.timestamp) &&
      isSet(inBoundMessage.messagetext)){

      return {
        userid : inBoundMessage.userid ,
        groupid : inBoundMessage.groupid ,
        parentmessage : null,
        timestamp : inBoundMessage.timestamp,
        messagetext : inBoundMessage.messagetext
      };
    }
    log.warn('message format[%j] is invalid and will not be saved.',inBoundMessage);
    return null;
  };

  var replyToSave = function(inBoundReply,parentId){

    inBoundReply.parentmessage = parentId;

    if (isSet(inBoundReply.userid) &&
      isSet(inBoundReply.groupid) &&
      isSet(inBoundReply.parentmessage) &&
      isSet(inBoundReply.timestamp) &&
      isSet(inBoundReply.messagetext)){

      return {
        userid : inBoundReply.userid ,
        groupid : inBoundReply.groupid ,
        parentmessage : inBoundReply.parentmessage,
        timestamp : inBoundReply.timestamp,
        messagetext : inBoundReply.messagetext
      };
    }
    log.warn('reply format[%j] is invalid and will not be saved',inBoundReply);
    return null;
  };

  var sessionToken = function(req){
    return req.headers['x-tidepool-session-token'];
  };

  var isSet = function(toCheck){
    return !_.isEmpty(toCheck);
  };

  var noMessages = [];

  /*
   * using the seagull handler to resolve the user profiles
   */
  var resolveUserProfiles = function(messages,token,cb){
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
  };

  var getDateFromParam = function(datetime){
    if(datetime){
      return new Date(datetime).toISOString();
    }
    return;
  };

  return {

    /*
    API HEALTH CHECK END-POINTS
    */

    //status check for the API to let us know all is good or if not what is down
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
    API STANDARD END-POINTS
    */

    findById : function(req, res, next) {
      log.debug('findById: params[%j], url[%s], method[%s]', req.params, req.url, req.method);
      metrics.postServer('findById', {}, req._sessionToken);

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

    findAllById : function(req, res, next) {
      log.debug('findAllById: params[%j], url[%s], method[%s]', req.params, req.url, req.method);
      metrics.postServer('findAllById', {}, req._sessionToken);

      res.setHeader('content-type', 'application/json');

      var groupId = req.params.groupid;
      var start;
      var end;

      //if a date that is passed is invalid then lets exit here
      try {
        start = getDateFromParam(req.params.starttime);
        end = getDateFromParam(req.params.endtime);
      } catch (error) {
        res.send(400);
        return next();
      }

      crudHandler.getAllMessages(groupId, start, end, function(error,messages){
        if (error){
          log.error(error, 'Error getting messages for group[%s] from[%s] to[%s]', groupId, start, end);
          res.send(500);
          return next();
        }else{
          if (messages && messages.length>0){
            resolveUserProfiles(messages, sessionToken(req), function(resolvedMessages){
              res.send(200, {messages : resolvedMessages});
              return next();
            });
          }else{
            res.send(404, { messages : noMessages });
            return next();
          }
        }
      });
    },

    getNotes : function(req, res, next) {
      log.debug('getNotes: params[%j], url[%s], method[%s]', req.params, req.url, req.method);
      metrics.postServer('getNotes', {}, req._sessionToken);

      res.setHeader('content-type', 'application/json');

      var groupId = req.params.groupid;
      var start;
      var end;

      //if a date that is passed is invalid then lets exit here
      try {
        start = getDateFromParam(req.params.starttime);
        end = getDateFromParam(req.params.endtime);
      } catch (error) {
        res.send(400);
        return next();
      }

      crudHandler.getNotes(groupId, start, end, function(error,messages){
        if (error){
          log.error(error, 'Error getting messages for group[%s]', groupId);
          res.send(500);
          return next();
        }else{
          if (messages && messages.length>0){
            resolveUserProfiles(messages, sessionToken(req), function(resolvedMessages){
              res.send(200, {messages : resolvedMessages});
              return next();
            });
          }else{
            res.send(404, { messages : noMessages });
            return next();
          }
        }
      });
    },

    getThread : function(req, res, next) {
      log.debug('getThread: params[%j], url[%s], method[%s]', req.params, req.url, req.method);
      metrics.postServer('getThread', {}, req._sessionToken);

      res.setHeader('content-type', 'application/json');

      var messageId = req.params.msgid;

      crudHandler.getMessagesInThread(messageId, function(error,messages){
        if (error){
          log.error(error, 'Error getting messages for thread[%s]', messageId);
          res.send(500);
          return next();
        } else{
          if (messages && messages.length>0){
            resolveUserProfiles(messages, sessionToken(req), function(resolvedMessages){
              res.send(200, {messages : resolvedMessages});
              return next();
            });
          }else{
            res.send(404, { messages : noMessages });
            return next();
          }
        }
      });
    },

    addThread : function(req, res, next) {
      log.debug('add: params[%j], url[%s], method[%s]', req.params, req.url, req.method);
      metrics.postServer('addThread', {}, req._sessionToken);

      var toSave = messageToSave(req.params.message);

      if(_.isEmpty(toSave)){
        res.send(400);
        return next();
      } else {
        crudHandler.createMessage(toSave,function(error,messageId){
          if(error){
            log.error(error, 'Error adding message[%j]', toSave);
            res.send(500);
          } else {
            res.send(201,{id : messageId});
          }
          return next();
        });
      }
    },

    replyToThread : function(req, res, next) {
      log.debug('add: params[%j], url[%s], method[%s]', req.params, req.url, req.method);
      metrics.postServer('replyToThread', {}, req._sessionToken);

      var toSave = replyToSave(req.params.message,req.params.msgid);

      if( _.isEmpty(toSave)){
        res.send(400);
        return next();
      } else {
        crudHandler.createMessage(toSave,function(error,messageId){
          if(error){
            log.error(error, 'Error adding message[%j]', toSave);
            res.send(500);
          } else {
            res.send(201,{id : messageId});
          }
          return next();
        });
      }
    }
  };
};
