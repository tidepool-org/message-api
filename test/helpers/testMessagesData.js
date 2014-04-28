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

var testMessagesData = {

  noteAndComments : {},
  note : {}
};

// A related set of messages
testMessagesData.noteAndComments = [
  {
    parentmessage : null,
    userid: '12121212',
    groupid: '777',
    timestamp: '2013-11-28T23:07:40+00:00',
    messagetext: 'In three words I can sum up everything I have learned about life: it goes on.'
  },
  {
    parentmessage:null,
    userid: '232323',
    groupid: '777',
    timestamp: '2013-11-29T23:05:40+00:00',
    messagetext: 'Second message.'
  },
  {
    parentmessage:null,
    userid: '232323',
    groupid: '777',
    timestamp: '2013-11-30T23:05:40+00:00',
    messagetext: 'Third message.'
  },
  {
    parentmessage:null,
    userid: '232323',
    groupid: '777',
    timestamp: '2013-11-25T23:05:40+00:00',
    messagetext: 'First message.'
  }
];

// One off group with no other related groups
testMessagesData.note = {
  parentmessage:null,
  userid: '12121212',
  groupid: '999',
  timestamp: '2013-11-28T23:07:40+00:00',
  messagetext: 'In three words I can sum up everything I have learned about life: it goes on.'
};


module.exports = testMessagesData;