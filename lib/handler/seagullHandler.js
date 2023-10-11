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

var log = require('../log.js')('seagullHandler.js');

/*
 Handler for seagull interactions
*/
module.exports = function (seagullClient, userClient) {
  var dependencyStatus = { running: false, deps: { up: [], down: [] } };

  //assume its up to start with
  dependencyStatus = isUp(dependencyStatus);

  /*
    Seagull is down
  */
  function isDown(status) {
    status.deps.up = _.without(status.deps.up, 'seagull');
    status.deps.down = _.union(status.deps.down, ['seagull']);
    return status;
  }

  /*
    Seagull is up
  */
  function isUp(status) {
    status.deps.down = _.without(status.deps.down, 'seagull');
    status.deps.up = _.union(status.deps.up, ['seagull']);
    return status;
  }

  return {
    /**
     * status for the underlying seagull service
     * @returns callback
     */
    status: function status(callback) {
      log.debug('checking status');
      return callback(null, dependencyStatus);
    },
    /**
     * For each unique userid get the associated users profile
     * @returns {Array} resolvedUsers
     */
    resolveUsers: function (userIds, callback) {
      log.debug('resolving names [%j]', userIds);
      try {
        var resolvedUsers = {};

        //call back once all finished
        var done = _.after(userIds.length, function () {
          return callback(resolvedUsers);
        });

        //Use a server token
        userClient.withServerToken(function (error, serverToken) {
          if (error) {
            log.error('getting server token', error);
            return callback();
          }
          _.forEach(userIds, function (userId) {
            //call through to seagull and get the required profiles
            seagullClient.getProfile(
              userId,
              serverToken,
              function (error, profile) {
                if (error) {
                  log.error('getting profile ', error);
                  return callback();
                }
                resolvedUsers[userId] = _.pick(profile, 'fullName');
                done();
              }
            );
          });
        });
      } catch (error) {
        log.error('while using seagull client ', error);
        dependencyStatus = isDown(dependencyStatus);
        return callback();
      }
    },
  };
};
