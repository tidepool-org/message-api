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
module.exports = function(seagullClient) {

  var dependencyStatus = { running: false, deps: { up: [], down: [] } };

  //assume its up to start with
  dependencyStatus = isUp(dependencyStatus);

  /*
    Seagull is down
  */
  function isDown(status){
    status.deps.up = _.without(status.deps.up, 'seagull');
    status.deps.down = _.union(status.deps.down, ['seagull']);
    return status;
  }

  /*
    Seagull is up
  */
  function isUp(status){
    status.deps.down = _.without(status.deps.down, 'seagull');
    status.deps.up = _.union(status.deps.up, ['seagull']);
    return status;
  }

  return {

    status: function status(callback) {
      log.debug('checking status');
      return callback(null, dependencyStatus);
    },

    resolveNames:  function(userIds, token, callback) {
      log.debug('resolving names [%j]', userIds);
      try {

        var resolvedNames = [];

        //call back once all finished
        var done = _.after(userIds.length, function() {
          return callback(resolvedNames);
        });

        //call through to seagull and get the required profiles
        _.forEach(userIds, function(userId) {
          seagullClient.getProfile(userId, token, function(error,profile){
            if(error){
              log.error('getting profile ',error);
              return callback();
            }
            resolvedNames.push({ userid: userId , username : profile.shortname });
            done();
          });
        });

      } catch(error) {
        log.error('while using seagull client ',error);
        dependencyStatus = isDown(dependencyStatus);
      }
    }
  };
};