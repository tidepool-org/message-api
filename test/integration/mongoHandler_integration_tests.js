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
var sundial = require('sundial');

var _ = require('lodash');

/*
 * SETUP
 */
var mongoConnectionString = 'mongodb://localhost/test_messages';

var mongoHandler = require('../../lib/handler/mongoHandler')(mongoConnectionString);
var testDbInstance = require('mongojs')(mongoConnectionString, ['messages']);

describe('mongo handler', function() {

  this.timeout(4000);

  describe('basics', function() {

    function messageContentToReturn(saved,toReturn,cb){
      //should be these properties
      expect(Object.keys(toReturn).length).to.equal(8);

      expect(toReturn).to.contain.keys(
        'id',
        'guid',
        'parentmessage',
        'groupid',
        'userid',
        'messagetext',
        'createdtime',
        'timestamp'
      );

      //these properties must be returned with a value
      expect(toReturn.id).to.exist;
      expect(toReturn.guid).to.exist;
      expect(toReturn.groupid).to.exist;
      expect(toReturn.userid).to.exist;
      expect(toReturn.timestamp).to.exist;
      expect(toReturn.createdtime).to.exist;
      expect(toReturn.messagetext).to.exist;

      //equals what was saved
      expect(toReturn.guid).to.equal(saved.guid);
      expect(toReturn.timestamp).to.equal(saved.timestamp);
      expect(toReturn.createdtime).to.equal(saved.createdtime);
      expect(toReturn.messagetext).to.equal(saved.messagetext);
      return cb();
    }

    it('will return the id of the saved message', function(done) {

      var message = {
        parentmessage : null,
        groupid : '123',
        userid : '456',
        messagetext : 'yay!',
        timestamp : sundial.utcDateString(),
        createdtime : sundial.utcDateString()
      };

      mongoHandler.createMessage(message,function(error,id){
        expect(error).to.not.exist;
        expect(id).to.exist;
        expect(id).to.exist;
        done();
      });
    });

    it('will get message with requested id', function(done) {

      var messageToSave = {
        guid: 'abcde',
        parentmessage : null,
        groupid : '123',
        userid : '456',
        messagetext : 'yay!',
        timestamp : sundial.utcDateString(),
        createdtime : sundial.utcDateString()
      };

      mongoHandler.createMessage(messageToSave,function(error,id){
        if(error){
          done(error);
        }
        mongoHandler.getMessage(String(id),function(messageError,foundMessage){
          expect(messageError).to.not.exist;
          expect(foundMessage).to.exist;
          messageContentToReturn(messageToSave,foundMessage,done);
        });
      });
    });

    it('will get all messages for group', function(done) {

      var notesGroup = '99-100';
      var theTime = sundial.utcDateString();

      var toSave = {
        parentmessage : null,
        groupid : notesGroup,
        userid : '456',
        messagetext : 'yay!',
        timestamp : theTime,
        createdtime : theTime
      };

      mongoHandler.createMessage(toSave, function(createError, createdId){
        if(createError){
          done(createError);
        }
        mongoHandler.getNotes(notesGroup,function(notesError,notes){
          expect(notesError).to.not.exist;
          expect(notes).to.exist;
          done();
        });
      });

    });

    it('will edit an existing note', function(done) {

      var theTime = sundial.utcDateString();

      var originalMessage = {
        parentmessage : null,
        groupid : '98-99-100',
        userid : '456-234',
        messagetext : 'yay!',
        timestamp : theTime,
        createdtime : theTime
      };

      var edits = {
        messagetext : 'we just edited this',
        modifiedtime : sundial.utcDateString() //would have been set in api
      };

      mongoHandler.createMessage(originalMessage, function(createError,createdId){
        if(createError){
          done(createError);
        }

        mongoHandler.editMessage(String(createdId), edits, function(error,updatedMessage){
          expect(error).to.not.exist;
          expect(updatedMessage).to.exist;
          expect(updatedMessage.messagetext).to.equal(edits.messagetext);
          expect(updatedMessage.modifiedtime).to.equal(edits.modifiedtime);
          done();
        });
      });

    });

    it('will remove an existing note', function(done) {

      var originalMessage = {
        parentmessage : null,
        groupid : '98-99-100',
        userid : '456-234',
        messagetext : 'yay! yay!',
        timestamp : sundial.utcDateString()
      };

      mongoHandler.createMessage(originalMessage, function(createError,createdId){
        if(createError){
          done(createError);
        }
        var deleteDetails = {
          modifiedtime : sundial.utcDateString(), //would have been set in api
          deleteflag : sundial.utcDateString()
        };

        mongoHandler.deleteMessage(String(createdId),deleteDetails, function(error,details){
            expect(error).to.not.exist;
            expect(details.deleteflag).to.exist;
            expect(details.deleteflag).to.equal(deleteDetails.deleteflag);
            expect(details.modifiedtime).to.equal(deleteDetails.modifiedtime);
            done();
          });
      });

    });

  });

  describe('getting messages using ', function() {

    var groupId = '123-456-99-100';
    var idOfParentMessage;

    function testMessages(){

      var created = sundial.utcDateString();
      var time = sundial.utcDateString();

      return [
        {
          parentmessage : null,
          groupid : groupId,
          userid : '456',
          messagetext : 'yay! this is a good one',
          timestamp : time,
          createdtime : created,
        },
        {
          parentmessage : null,
          groupid : groupId,
          userid : '456',
          messagetext : 'this is flagged for deletion',
          deleteflag : sundial.utcDateString(),
          timestamp : time,
          createdtime : created
        },
        {
          parentmessage : null,
          groupid : groupId,
          userid : '123',
          messagetext : 'this is the parentmessage',
          timestamp : time,
          createdtime : created
        },
        {
          parentmessage : null,
          groupid : groupId,
          userid : '999',
          messagetext : 'this reply is flagged for deletion',
          deleteflag : sundial.utcDateString(),
          timestamp : time,
          createdtime : created
        }
      ];
    }

    before(function (done) {
      /*
       * Load multiple messages for testing
       */
      testDbInstance.messages.remove();
      var messages = testMessages();

      _.forEach(messages, function(message){
        if(message.messagetext === 'this is the parentmessage'){
          testDbInstance.messages.save(message,function(err,doc){
            idOfParentMessage = String(doc._id);
            done();
          });
        } else {
          testDbInstance.messages.save(message);
        }
      });

    });

    it('getAllMessages will not bring back those flagged for delete', function(done) {

      mongoHandler.getAllMessages(groupId, function(messageError,messages){
        expect(messageError).to.not.exist;
        expect(messages).to.exist;
        expect(messages).to.be.an.array;
        expect(messages.length).to.equal(2);
        expect(messages[0].deleteflag).to.not.exist;
        expect(messages[1].deleteflag).to.not.exist;
        done();
      });
    });

    it('getMessagesInThread will only return those not flagged for deletion', function(done) {

      mongoHandler.getMessagesInThread(idOfParentMessage, function(messageError,messages){
        expect(messageError).to.not.exist;
        expect(messages).to.exist;
        expect(messages).to.be.an.array;
        expect(messages.length).to.equal(1);
        expect(messages[0].deleteflag).to.not.exist;
        done();
      });
    });

    it('getNotes will only return those notes not flagged for deletion', function(done) {

      mongoHandler.getNotes(groupId, function(messageError,notes){
        expect(messageError).to.not.exist;
        expect(notes).to.exist;
        expect(notes).to.be.an.array;
        expect(notes.length).to.equal(2);
        expect(notes[0].deleteflag).to.not.exist;
        expect(notes[1].deleteflag).to.not.exist;
        done();
      });
    });
  });
});