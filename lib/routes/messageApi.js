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

  function messageToSave(inBoundMessage){
    return {
      userid : inBoundMessage.userid ,
      groupid : inBoundMessage.groupid ,
      parentmessage : null,
      timestamp : inBoundMessage.timestamp,
      messagetext : inBoundMessage.messagetext
    };
  }

  function replyToSave(inBoundReply,parentId){
    return {
      userid : inBoundReply.userid ,
      groupid : inBoundReply.groupid ,
      parentmessage : parentId,
      timestamp : inBoundReply.timestamp,
      messagetext : inBoundReply.messagetext
    };
  }

  function hasProperties(obj, properties){
    var missing = {};

    _.forEach(properties,function(property){
      if (_.isEmpty(obj[property])) {
        missing[property] = 'property is required';
      }
    });
    return missing;
  }

  function sessionToken(req){
    return req.headers['x-tidepool-session-token'];
  }

  var noMessages = [];

  /*
   * using the seagull handler to resolve the user profiles
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

  function getDateFromParam(datetime){
    if(datetime){
      return new Date(datetime).toISOString();
    }
    return;
  }

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

      var message = messageToSave(req.params.message);

      var missingFromMessage = hasProperties(
        message,
        ['userid','groupid','timestamp','messagetext']
      );

      if(_.isEmpty(missingFromMessage)){
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
      }else {
        log.warn('reply format[%j] is invalid and will not be saved. Missing[%j]',message,missingFromMessage);
        res.send(400,JSON.stringify(missingFromMessage));
        return next();
      }
    },

    replyToThread : function(req, res, next) {
      log.debug('add: params[%j], url[%s], method[%s]', req.params, req.url, req.method);
      metrics.postServer('replyToThread', {}, req._sessionToken);

      var reply = replyToSave(req.params.message,req.params.msgid);

      var missingFromReply = hasProperties(
        reply,
        ['userid','groupid','parentmessage','timestamp','messagetext']
      );

      if(_.isEmpty(missingFromReply)){
        crudHandler.createMessage(reply,function(error,messageId){
          if(error){
            log.error(error, 'Error adding message[%j]', reply);
            res.send(500);
          } else {
            res.send(201,{id : messageId});
          }
          return next();
        });
      } else {
        log.warn('reply format[%j] is invalid and will not be saved. Missing[%j]',reply,missingFromReply);
        res.send(400,JSON.stringify(missingFromReply));
        return next();
      }
    },
    editNote : function(req, res, next) {
      log.debug('getNotes: params[%j], url[%s], method[%s]', req.params, req.url, req.method);
      metrics.postServer('editNote', {}, req._sessionToken);

      res.setHeader('content-type', 'application/json');

      res.send(501,'Cannot edit note');
      return next();
    },
    removeNote : function(req, res, next) {
      log.debug('getNotes: params[%j], url[%s], method[%s]', req.params, req.url, req.method);
      metrics.postServer('removeNote', {}, req._sessionToken);

      res.setHeader('content-type', 'application/json');

      var messageId = req.params.msgid;

      res.send(501,'Cannot remove note ' +messageId);
      return next();
    }
  };
};
