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

/*
 Mock handler for gatekeeper interactions
*/
module.exports = function() {

  return {

    checkPermissionsFromGroup: function(req, res, next) {
      if(req.params.groupid == 'no-permission'){
        res.send(401);
        return next(false);
      }
      return next();
    },

    checkPermissionsFromMessage: function(req, res, next) {
      if(req.params.msgid == 'no-permission'){
        res.send(401);
        return next(false);
      }
      req._message = {
        id: '9876598765',
        guid: 'abcde',
        userid: 'message',
        groupid: '12345',
        parentmessage: null,
        timestamp: '2013-11-28T23:07:40+00:00',
        createdtime: '2013-11-28T23:07:40+00:00',
        messagetext: 'checkPermissionsFromMessage message text'
      };
      return next();
    }

  };
};
