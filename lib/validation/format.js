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

exports.incomingMessage = function (userId, groupId, incomingMessage) {
  return {
    guid: incomingMessage.guid,
    userid: userId,
    groupid: groupId,
    parentmessage: null,
    timestamp: incomingMessage.timestamp,
    createdtime: sundial.utcDateString(),
    modifiedtime: null,
    messagetext: incomingMessage.messagetext,
  };
};

exports.incomingReply = function (userId, parentMessage, incomingReply) {
  return {
    guid: incomingReply.guid,
    userid: userId,
    groupid: parentMessage.groupid,
    parentmessage: parentMessage.id.toString(),
    timestamp: incomingReply.timestamp,
    createdtime: sundial.utcDateString(),
    modifiedtime: null,
    messagetext: incomingReply.messagetext,
  };
};

exports.incomingEdit = function (edits) {
  var toEdit = {
    modifiedtime: sundial.utcDateString(),
  };

  if (!_.isEmpty(edits.messagetext)) {
    toEdit.messagetext = edits.messagetext;
  }

  if (!_.isEmpty(edits.timestamp)) {
    toEdit.timestamp = edits.timestamp;
  }

  return toEdit;
};

exports.outgoingMessage = function (data, id) {
  var message = {
    id: id,
    guid: data.guid,
    parentmessage: data.parentmessage,
    userid: data.userid,
    groupid: data.groupid,
    timestamp: data.timestamp,
    createdtime: data.createdtime,
    messagetext: data.messagetext,
  };

  if (!_.isEmpty(data.user)) {
    message.user = data.user;
  }

  return message;
};
