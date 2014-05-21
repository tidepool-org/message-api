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

var salinity = require('salinity');
var expect = salinity.expect;
var async = require('async');

/*
 * SETUP
 */
var mongoConnectionString = 'mongodb://localhost/test_messages';

var mongoHandler = require('../../lib/handler/mongoHandler')(mongoConnectionString);
var testDbInstance = require('mongojs')(mongoConnectionString, ['messages']);

describe('mongo handler', function() {

  function messageContentToReturn(saved,toReturn,cb){
    //should be these properties
    expect(toReturn).to.contain.keys(
      'id',
      'parentmessage',
      'groupid',
      'userid',
      'messagetext',
      'timestamp'
    );
    //and only 6 properties
    expect(Object.keys(toReturn).length).to.equal(6);
    //these properties must be returned with a value
    expect(toReturn.id).to.exist;
    expect(toReturn.groupid).to.exist;
    expect(toReturn.userid).to.exist;
    expect(toReturn.timestamp).to.exist;
    expect(toReturn.messagetext).to.exist;
    //equals what was saved
    expect(toReturn.groupid).to.equal(saved.groupid);
    expect(toReturn.userid).to.equal(saved.userid);
    expect(toReturn.timestamp).to.equal(saved.timestamp);
    expect(toReturn.messagetext).to.equal(saved.messagetext);
    return cb();
  }

  afterEach(function (done) {
    //cleanup each time
    testDbInstance.messages.remove();
    done();
  });

  it('will return the id of the saved message', function(done) {

    var message = {
      parentmessage : null,
      groupid : '123',
      userid : '456',
      messagetext : 'yay!',
      timestamp : new Date().toISOString()
    };

    mongoHandler.createMessage(message,function(error,id){
      expect(error).to.not.exist;
      expect(id).to.exist;
      done();
    });
  });

  it('will get message with requested id', function(done) {

    var messageToSave = {
      parentmessage : null,
      groupid : '123',
      userid : '456',
      messagetext : 'yay!',
      timestamp : new Date().toISOString()
    };

    mongoHandler.createMessage(messageToSave,function(error,id){
      expect(error).to.not.exist;
      expect(id).to.exist;
      mongoHandler.getMessage(String(id),function(messageError,foundMessage){
        expect(messageError).to.not.exist;
        expect(foundMessage).to.exist;
        messageContentToReturn(messageToSave,foundMessage,done);
      });
    });
  });

  it('will get all notes for group', function(done) {

    var notesGroup = '99-100';

    var toSave = {
      parentmessage : null,
      groupid : notesGroup,
      userid : '456',
      messagetext : 'yay!',
      timestamp : new Date().toISOString()
    };

    mongoHandler.createMessage(toSave,function(error,id){
      expect(error).to.not.exist;
      expect(id).to.exist;
      mongoHandler.getNotes(notesGroup,null,null,function(messageError,notes){
        expect(messageError).to.not.exist;
        expect(notes).to.exist;
        expect(notes).to.be.an.array;
        expect(notes.length).to.equal(1);
        messageContentToReturn(toSave,notes[0],done);
      });
    });
  });

  it('will edit an existing note', function(done) {

    var originalMessage = {
      parentmessage : null,
      groupid : '98-99-100',
      userid : '456-234',
      messagetext : 'yay!',
      timestamp : new Date().toISOString()
    };

    var edit = {
      messagetext : 'we just edited this',
      id : null
    };

    async.waterfall([
      function(callback){
        /*
         * create note
         */
        mongoHandler.createMessage(originalMessage,function(error,id){
          expect(error).to.not.exist;
          expect(id).to.exist;
          callback(null, id);
        });
      },
      function(messageId, callback){
        /*
         * edit the note we created
         */
        edit.id = messageId;
        mongoHandler.editMessage(edit,function(error,details){
          expect(error).to.not.exist;
          expect(details).to.exist;
          expect(details.statuscode).to.equal(200);
          callback(null, messageId);
        });
      },
      function(messageId, callback){
        /*
         * get the note and make sure it is updated
         */
        mongoHandler.getMessage(messageId,function(error,message){
          expect(error).to.not.exist;
          expect(message.id).to.equal(messageId);
          expect(message.messagetext).to.equal(edit.messagetext);
          callback(null, null);
        });
      }
    ], function (err, result) {
      done();
    });
  });

  it('will remove an existing note', function(done) {

    var originalMessage = {
      parentmessage : null,
      groupid : '98-99-100',
      userid : '456-234',
      messagetext : 'yay! yay!',
      timestamp : new Date().toISOString()
    };

    async.waterfall([
      function(callback){
        /*
         * create note
         */
        mongoHandler.createMessage(originalMessage,function(error,id){
          expect(error).to.not.exist;
          expect(id).to.exist;
          callback(null, id);
        });
      },
      function(messageId, callback){
        /*
         * remove the note we created
         */
        mongoHandler.removeMessage(messageId,function(error,details){
          expect(error).to.not.exist;
          expect(details).to.exist;
          expect(details.statuscode).to.equal(200);
          callback(null, messageId);
        });
      },
      function(messageId, callback){
        /*
         * try and get the note we just removed
         */
        mongoHandler.getMessage(messageId,function(error,message){
          expect(error).to.not.exist;
          expect(message).not.exist;
          callback(null, null);
        });
      }
    ], function (err, result) {
      done();
    });
  });

});