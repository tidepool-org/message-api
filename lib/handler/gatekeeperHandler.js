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

var log = require('../log.js')('gatekeeperHandler.js');

/*
 Handler for gatekeeper interactions
*/
module.exports = function(gatekeeperClient, crudHandler) {

  return {
    /**
     * Does this user have permission to see the requested users messages
     */
    checkPermissionsFromGroup: function(req, res, next) {

      log.debug('checking permission [%j]', req.params);

      if(req.params.groupid && req._tokendata.userid){
        var presentUser = req._tokendata.userid;
        var requestedUser = req.params.groupid;

        gatekeeperClient.canViewData(presentUser, requestedUser,function(error,canView){
          if (canView) {
            log.debug('user permission [%s] has permission to see [%s]',presentUser, requestedUser);
            return next();
          }
          log.warn('no permission [%s] for requested user [%s]', presentUser, requestedUser);
          res.send(401, 'You are a Balrog and I am Gandalf. EOM');
          return next(false);
        });
      } else {
        log.error('do not have the required information to check permissions');
        res.send(401, 'You are a Balrog and I am Gandalf. EOM');
        return next(false);
      }
    },
    /**
     * Does this user have permission to add message
     */
    checkPermissionsFromMessage: function(req, res, next) {

      log.debug('checking permission [%j]', req.params);

      if(req.params.msgid && req._tokendata.userid) {
        var messageId = req.params.msgid;
        crudHandler.getMessage(messageId, function(error, foundMessage) {
          if (error) {
            log.error(error, 'Error getting message[%s]', messageId);
            res.send(500);
            return next(false);
          } else if (foundMessage) {
            var presentUser = req._tokendata.userid;
            var requestedUser = foundMessage.groupid;

            gatekeeperClient.canViewData(presentUser, requestedUser, function(error, canView) {
              if (canView) {
                log.debug('user permission [%s] has permission to see [%s]',presentUser, requestedUser);
                req._message = foundMessage;
                return next();
              }
              log.warn('no permission [%s] for requested user [%s]', presentUser, requestedUser);
              res.send(401, 'You are a Balrog and I am Gandalf. EOM');
              return next(false);
            });
          } else {
            log.info('message not found for id[%s]',messageId);
            res.send(404, {message: {}});
            return next(false);
          }
        });
      } else {
        log.error('do not have the required information to check permissions');
        res.send(401, 'You are a Balrog and I am Gandalf. EOM');
        return next(false);
      }
    }
  };
};