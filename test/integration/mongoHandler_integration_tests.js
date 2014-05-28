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

  describe('basics', function() {

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

    it('will get all messages for group', function(done) {

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
          edit.id = String(messageId);
          mongoHandler.editMessage(edit,function(error,details){
            expect(error).to.not.exist;
            expect(details).to.exist;
            expect(details.messagetext).to.equal(edit.messagetext);
            callback(error, messageId);
          });
        }
      ], function (err, result) {
        done(err);
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
          mongoHandler.createMessage(originalMessage, function(error,id){
            expect(error).to.not.exist;
            expect(id).to.exist;
            callback(null, id);
          });
        },
        function(messageId, callback){
          /*
           * remove the note we created
           */

          var deleteDetails = {
            id : String(messageId),
            deleteflag : new Date().toISOString()
          };

          mongoHandler.deleteMessage(deleteDetails, function(error,details){
            expect(error).to.not.exist;
            expect(details.deleteflag).to.exist;
            expect(details.deleteflag).to.equal(deleteDetails.deleteflag);
            callback(error, details);
          });
        }
      ], function (err, result) {
        done(err);
      });
    });

  });

  describe('getting messages using ', function() {

    var notesGroup = '123-456-99-100';
    var idOfParentMessage;

    function testMessages(){

      return [
        {
          parentmessage : null,
          groupid : notesGroup,
          userid : '456',
          messagetext : 'yay! this is a good one',
          timestamp : new Date().toISOString()
        },
        {
          parentmessage : null,
          groupid : notesGroup,
          userid : '456',
          messagetext : 'this is flagged for deletion',
          deleteflag : new Date().toISOString(),
          timestamp : new Date().toISOString()
        },
        {
          parentmessage : null,
          groupid : notesGroup,
          userid : '123',
          messagetext : 'this is the parentmessage',
          timestamp : new Date().toISOString()
        },
        {
          groupid : notesGroup,
          userid : '999',
          messagetext : 'this reply is flagged for deletion',
          deleteflag : new Date().toISOString(),
          timestamp : new Date().toISOString()
        }
      ];
    }

    function setParentId(mongoError,mongoDoc){
      if(mongoDoc){
        idOfParentMessage = String(mongoDoc._id);
        //console.log('parent id ',idOfParentMessage);
      }
      return;
    }

    before(function (done) {
      /*
       * Load multiple messages for testing
       */
      var messages = testMessages();

      for (var index = 0; index < messages.length; ++index) {

        if( index === 2 ){
          testDbInstance.messages.save(messages[index], setParentId);
        } else {
          messages[index].parentmessage = idOfParentMessage;
          testDbInstance.messages.save(messages[index]);
        }
      }
      done();
    });

    it('getAllMessages will not bring back those flagged for delete', function(done) {

      mongoHandler.getAllMessages(notesGroup,null,null,function(messageError,messages){
        expect(messageError).to.not.exist;
        expect(messages).to.exist;
        expect(messages).to.be.an.array;
        expect(messages.length).to.equal(2);
        expect(messages[0].deleteflag).to.not.exist;
        expect(messages[1].deleteflag).to.not.exist;
        done(messageError);
      });
    });

    it('getMessagesInThread will only return those not flagged for deletion', function(done) {

      mongoHandler.getMessagesInThread(idOfParentMessage,function(messageError,messages){
        expect(messageError).to.not.exist;
        expect(messages).to.exist;
        expect(messages).to.be.an.array;
        expect(messages.length).to.equal(1);
        expect(messages[0].deleteflag).to.not.exist;
        done(messageError);
      });
    });

    it('getNotes will only return those notes not flagged for deletion', function(done) {

      mongoHandler.getNotes(notesGroup,null,null,function(messageError,notes){
        expect(messageError).to.not.exist;
        expect(notes).to.exist;
        expect(notes).to.be.an.array;
        expect(notes.length).to.equal(2);
        expect(notes[0].deleteflag).to.not.exist;
        expect(notes[1].deleteflag).to.not.exist;
        done(messageError);
      });
    });
  });
});