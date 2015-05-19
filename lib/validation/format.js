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

exports.incomingMessage = function(inBound)
{
  return {
    guid : inBound.guid,
    userid : inBound.userid,
    groupid : inBound.groupid,
    parentmessage : null,
    timestamp : inBound.timestamp,
    createdtime : sundial.utcDateString(),
    modifiedtime : null,
    messagetext : inBound.messagetext
  };
};

exports.incomingReply = function(inBound,parentId)
{
  return {
    guid: inBound.guid,
    userid : inBound.userid,
    groupid : inBound.groupid,
    parentmessage : parentId,
    timestamp : inBound.timestamp,
    createdtime : sundial.utcDateString(),
    modifiedtime : null,
    messagetext : inBound.messagetext
  };
};

exports.incomingEdit = function(edits)
{
  var toEdit = {
    modifiedtime : sundial.utcDateString(),
  };

  if(!_.isEmpty(edits.messagetext)){
    toEdit.messagetext = edits.messagetext;
  }

  if(!_.isEmpty(edits.timestamp)){
    toEdit.timestamp = edits.timestamp;
  }

  return toEdit;
};

exports.outgoingMessage = function(data,id)
{
  return {
    id : id,
    guid : data.guid,
    parentmessage : data.parentmessage,
    userid : data.userid,
    groupid : data.groupid,
    timestamp : data.timestamp,
    createdtime : data.createdtime,
    messagetext : data.messagetext
  };
};

