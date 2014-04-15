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
module.exports = function(crudHandler,seagullHandler) {

  /*
  HELPER METHODS
  */

  var messageIsValid = function(message){

    if (isSet(message.userid) &&
      isSet(message.groupid) &&
      isNotSet(message.parentmessage) &&
      isSet(message.timestamp) &&
      isSet(message.messagetext)){
      return true;
    } else {
      log.warn('message format[%j] is invalid.',message);
      return false;
    }
  };

  var replyToMessageIsValid = function(message){
    if (isSet(message.userid) &&
      isSet(message.groupid) &&
      isSet(message.parentmessage) &&
      isSet(message.timestamp) &&
      isSet(message.messagetext)){
      return true;
    } else {
      log.warn('message format[%j] is invalid.',message);
      return false;
    }
  };

  var sessionToken = function(req){
    var sessionToken = req.headers['x-tidepool-session-token'];
    return sessionToken;
  };

  var isSet = function(toCheck){
    return (toCheck && toCheck.length > 0);
  };

  var isNotSet = function(toCheck){
    return (!toCheck || toCheck.length === 0);
  };

  var noMessages = [];

  /*
    using the seagull handler to resolve the user profiles
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
      } else {
        crudHandler.status(function(error,result){
          log.info('returning status ' + result.statuscode);
          res.send(result.statuscode, result.deps);
        });
      }
      return next();
    },

    /*
    API STANDARD END-POINTS
    */

    findById : function(req, res, next) {
      log.debug('findById: params[%j], url[%s], method[%s]', req.params, req.url, req.method);

      res.setHeader('content-type', 'application/json');
      var messageId = req.params.msgid;

      crudHandler.getMessage(messageId, function(error,foundMessage){
        if (error){
          log.error(error, 'Error getting message[%s]', messageId);
          res.send(500);
        } else {

          if(foundMessage) {
            resolveUserProfiles([foundMessage], sessionToken(req), function(resolvedMessages){
              res.send(200, { message : _.first(resolvedMessages)});
            });
          }else{
            log.info('message not found for id[%s]',messageId);
            var noMessage = {};
            res.send(404, { message : noMessage });
          }
        }
      });

      return next();

    },

    findAllById : function(req, res, next) {
      log.debug('findAllById: params[%j], url[%s], method[%s]', req.params, req.url, req.method);

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
        }else{
          if (messages && messages.length>0){
            resolveUserProfiles(messages, sessionToken(req), function(resolvedMessages){
              res.send(200, {messages : resolvedMessages});
            });
          }else{
            res.send(404, { messages : noMessages });
          }
        }
      });

      return next();

    },

    getNotes : function(req, res, next) {
      log.debug('getNotes: params[%j], url[%s], method[%s]', req.params, req.url, req.method);

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
        }else{
          if (messages && messages.length>0){
            resolveUserProfiles(messages, sessionToken(req), function(resolvedMessages){
              res.send(200, {messages : resolvedMessages});
            });
          }else{
            res.send(404, { messages : noMessages });
          }
        }
      });

      return next();

    },

    getThread : function(req, res, next) {
      log.debug('getThread: params[%j], url[%s], method[%s]', req.params, req.url, req.method);

      res.setHeader('content-type', 'application/json');

      var messageId = req.params.msgid;

      crudHandler.getMessagesInThread(messageId, function(error,messages){
        if (error){
          log.error(error, 'Error getting messages for thread[%s]', messageId);
          res.send(500);
        }else{
          if (messages && messages.length>0){
            resolveUserProfiles(messages, sessionToken(req), function(resolvedMessages){
              res.send(200, {messages : resolvedMessages});
            });
          }else{
            res.send(404, { messages : noMessages });
          }
        }
      });

      return next();

    },

    addThread : function(req, res, next) {
      log.debug('add: params[%j], url[%s], method[%s]', req.params, req.url, req.method);

      var message = req.params.message;
      //ensure the parent is NOT set
      message.parentmessage = null;

      if(messageIsValid(message)){

        crudHandler.createMessage(message,function(error,messageId){
          if(error){
            log.error(error, 'Error adding message[%j]', message);
            res.send(500);
          } else {
            res.send(201,{id : messageId});
          }
        });

      } else {
        res.send(400);
      }

      return next();
    },

    replyToThread : function(req, res, next) {
      log.debug('add: params[%j], url[%s], method[%s]', req.params, req.url, req.method);

      var message = req.params.message;
      var msgid = req.params.msgid;
      //ensure the parent has been set
      message.parentmessage = msgid;

      if(replyToMessageIsValid(message)){

        crudHandler.createMessage(message,function(error,messageId){
          if(error){
            log.error(error, 'Error adding message[%j]', message);
            res.send(500);
          } else {
            res.send(201,{id : messageId});
          }
        });

      } else {
        res.send(400);
      }

      return next();
    }
  };
};
