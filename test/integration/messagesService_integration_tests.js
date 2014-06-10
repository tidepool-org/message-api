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
var sinon = salinity.sinon;
var mockableObject = salinity.mockableObject;

var env = {
  httpPort: 21000,
  mongoConnectionString: 'mongodb://localhost/test_messages',
  deleteWindow : 5
};

var userApiClient = mockableObject.make('checkToken');
var metrics = mockableObject.make('postServer', 'postThisUser', 'postWithUser');
var gatekeeperHandler = require('../helpers/mockGatekeeperHandler')();

function doNothing() { return null; }

var dummyMetrics = {
  postServer: doNothing,
  postThisUser: doNothing,
  postWithUser:doNothing
};

var mongoHandler = require('../../lib/handler/mongoHandler')(env.mongoConnectionString);

var messageApi = require('../../lib/routes/messageApi')(
  env,
  mongoHandler,
  require('../helpers/mockSeagullHandler')(),
  dummyMetrics
);

var messageService = require('../../lib/messagesService')(
  env,
  messageApi,
  userApiClient,
  gatekeeperHandler
);

var supertest = require('supertest')('http://localhost:' + env.httpPort);
var testDbInstance = require('mongojs')(env.mongoConnectionString, ['messages']);

var messageUser = { userid: 'message', isserver: true };
var noteAndComments = require('../helpers/testMessagesData').noteAndComments;
var sessionToken = '99406ced-8052-49c5-97ee-547cc3347da6';

describe('message API integration', function() {

  var fakeRootId = String(testDbInstance.ObjectId());

  function setupToken(user) {
    sinon.stub(userApiClient, 'checkToken').callsArgWith(1, null, user);
  }

  function expectToken(token) {
    expect(userApiClient.checkToken).to.have.been.calledWith(token, sinon.match.func);
  }

  function mockMetrics() {
    sinon.stub(metrics, 'postServer').callsArg(3);
    sinon.stub(metrics, 'postWithUser').callsArg(3);
    sinon.stub(metrics, 'postThisUser').callsArg(3);
  }

  /*
  * The expectations for a message
  */
  function testMessageContent(message){
    //should be these properties
    expect(message).to.contain.keys(
      'id',
      'parentmessage',
      'groupid',
      'userid',
      'user',
      'messagetext',
      'timestamp'
    );
    //and only 7 properties
    expect(Object.keys(message).length).to.equal(7);
    //these properties must be returned with a value
    expect(message.id).to.exist;
    expect(message.groupid).to.exist;
    expect(message.userid).to.exist;
    expect(message.timestamp).to.exist;
    expect(message.messagetext).to.exist;

  }

  before(function (done) {
    /*
     * Refresh data for each test
     */
    testDbInstance.messages.remove();

    for (var index = 0; index < noteAndComments.length; ++index) {

      if(index === 0){
        testDbInstance.messages.save(noteAndComments[index]);
      }else{
        noteAndComments[index].parentmessage = fakeRootId;
        testDbInstance.messages.save(noteAndComments[index]);
      }
    }
    /*
     * Start things up
     */
    messageService.start(done);
    setupToken(messageUser);
    mockMetrics();
  });

  after(function () {
    /*
     * Close things down
     */
    messageService.close();
  });

  describe('GET /read/:msgId', function() {

    var messageFromMongo;

    before(function(done){
      // grab a message that has been saved already
      testDbInstance.messages.findOne({},function(err, doc) {
        messageFromMongo = doc;
        done();
      });
    });

    it('404 when no data for path', function(done) {
      supertest
      .get('/read')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(404,done);
    });

    it('returns 200 and valid message', function(done) {

      supertest
      .get('/read/'+String(messageFromMongo._id))
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(200)
      .expect('Content-Type', 'application/json')
      .end(function(err, res) {
        if (err) return done(err);

        expectToken(sessionToken);

        var theMessage = res.body.message;

        expect(theMessage.id).to.equal(String(messageFromMongo._id));
        expect(theMessage.parentmessage).to.equal(messageFromMongo.parentmessage);
        expect(theMessage.timestamp).to.equal(String(messageFromMongo.timestamp));
        expect(theMessage.groupid).to.equal(String(messageFromMongo.groupid));
        expect(theMessage.userid).to.equal(String(messageFromMongo.userid));
        expect(theMessage.messagetext).to.equal(String(messageFromMongo.messagetext));

        done();
      });
    });

    it('returns message all required fields', function(done) {

      supertest
      .get('/read/'+String(messageFromMongo._id))
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(200)
      .expect('Content-Type', 'application/json')
      .end(function(err, res) {
        if (err) return done(err);
        expectToken(sessionToken);
        testMessageContent(res.body.message);
        done();
      });
    });

    it('returns 404 if no message found for id', function(done) {

      supertest
      .get('/read/3344556754')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(404)
      .end(function(err, res) {
        if (err) return done(err);
        expect(res.body.message).to.be.empty;
        done();
      });

    });

    it('returns 404 and no message if a non existant id is given', function(done) {

      supertest
      .get('/read/noMessageId')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(404)
      .end(function(err, res) {
        if (err) return done(err);
        expect(res.body.message).to.be.empty;
        done();
      });

    });
  });

  describe('GET /all/:groupid?starttime=xxx&endtime=yyy', function() {

    it('returns 404 for invalid path', function(done) {

      supertest
      .get('/all')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(404)
      .end(function(err, res) {
        if (err) return done(err);
        expect(res.body.messages).to.be.empty;
        done();
      });

    });

    it('returns 404 when there are no messages for path', function(done) {

      supertest
      .get('/all/12342?starttime=2013-11-25&endtime=2013-11-30')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(404)
      .end(function(err, res) {
        if (err) return done(err);
        expect(res.body.messages).to.be.empty;
        done();
      });

    });

    it('returns 400 when an invalid date param is give', function(done) {
      supertest
      .get('/all/12342?starttime=not-a-date&endtime=2013-11-30')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(400,done);
    });

    it('returns 3 messages', function(done) {

      supertest
      .get('/all/777?starttime=2013-11-25&endtime=2013-11-30')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(200)
      .expect('Content-Type', 'application/json')
      .end(function(err, res) {
        if (err) return done(err);
        expectToken(sessionToken);
        expect(res.body).to.have.property('messages').and.be.instanceof(Array);
        expect(res.body.messages.length).to.equal(3);

        res.body.messages.forEach(function(message){
          testMessageContent(message);
        });

        done();
      });
    });

  });

  describe('GET /all/:groupid?starttime=xxx ', function() {

    it('returns 4 messages', function(done) {
      supertest
      .get('/all/777?starttime=2013-11-25')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(200)
      .expect('Content-Type','application/json')
      .end(function(err, res) {
        if (err) return done(err);
        expectToken(sessionToken);
        expect(res.body).to.have.property('messages').and.be.instanceof(Array);
        expect(res.body.messages.length).to.equal(4);

        res.body.messages.forEach(function(message){
          testMessageContent(message);
        });

        done();
      });
    });

    it('returns 404 when no messages', function(done) {
      supertest.get('/all/99977777?starttime=2013-11-25')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(404)
      .end(function(err, res) {
        if (err) return done(err);
        expect(res.body.messages).to.be.empty;
        done();
      });
    });

  });

  describe('GET /all/:groupid?endtime=yyy ', function() {

    it('returns all messages before endtime', function(done) {
      supertest
      .get('/all/777?endtime=2013-11-30')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(200)
      .expect('Content-Type','application/json')
      .end(function(err, res) {
        if (err) return done(err);
        expectToken(sessionToken);
        expect(res.body).to.have.property('messages').and.be.instanceof(Array);
        expect(res.body.messages.length).to.equal(3);

        res.body.messages.forEach(function(message){
          testMessageContent(message);
        });

        done();
      });
    });

    it('returns 400 when the endtime is invalid', function(done) {
      supertest.get('/all/777?endtime=not-a-date')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(400,done);
    });

  });

  describe('GET /notes/:groupid ', function() {

    it('returns 1 message', function(done) {
      supertest
      .get('/notes/777')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(200)
      .expect('Content-Type','application/json')
      .end(function(err, res) {
        if (err) return done(err);
        expectToken(sessionToken);
        expect(res.body).to.have.property('messages').and.be.instanceof(Array);
        expect(res.body.messages.length).to.equal(1);

        res.body.messages.forEach(function(message){
          testMessageContent(message);
        });

        done();
      });
    });

    it('returns 404 when no messages', function(done) {
      supertest.get('/notes/99977777')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(404)
      .end(function(err, res) {
        if (err) return done(err);
        expect(res.body.messages).to.be.empty;
        done();
      });
    });

    it('returns 401 when the user does not have permission', function(done) {
      supertest.get('/notes/no-permission')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(401,done);
    });

  });

  describe('GET /notes/:groupid?starttime=xxx ', function() {

    it('returns 1 note', function(done) {
      supertest
      .get('/notes/777?starttime=2013-11-25')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(200)
      .expect('Content-Type','application/json')
      .end(function(err, res) {
        if (err) return done(err);
        expectToken(sessionToken);
        expect(res.body).to.have.property('messages').and.be.instanceof(Array);
        expect(res.body.messages.length).to.equal(1);

        res.body.messages.forEach(function(message){
          testMessageContent(message);
        });

        done();
      });
    });

    it('returns 400 for invalid date param', function(done) {
      supertest.get('/notes/99977777?starttime=not-a-date')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(400,done);
    });

    it('returns 404 when no notes', function(done) {
      supertest.get('/notes/99977777?starttime=2013-11-25')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(404)
      .end(function(err, res) {
        if (err) return done(err);
        expect(res.body.messages).to.be.empty;
        done();
      });
    });

  });

  describe('GET /notes/:groupid?starttime=xxx&endtime=yyy ', function() {

    it('returns 1 note', function(done) {
      supertest
      .get('/notes/777?starttime=2013-11-25&endtime=2013-11-30')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(200)
      .expect('Content-Type','application/json')
      .end(function(err, res) {
        if (err) return done(err);
        expectToken(sessionToken);
        expect(res.body).to.have.property('messages').and.be.instanceof(Array);
        expect(res.body.messages.length).to.equal(1);

        res.body.messages.forEach(function(message){
          testMessageContent(message);
        });

        done();
      });
    });

    it('returns 404 when no notes', function(done) {
      supertest.get('/notes/99977777?starttime=2013-11-25&endtime=2013-11-30')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(404)
      .end(function(err, res) {
        if (err) return done(err);
        expect(res.body.messages).to.be.empty;
        done();
      });
    });

    it('returns 401 when one date param is invalid', function(done) {
      supertest.get('/notes/no-permission?starttime=2013-11-25&endtime=not-a-date')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(401,done);
    });

  });

  describe('GET /notes/:groupid?endtime=yyy ', function() {

    it('allows only an endtime param', function(done) {
      supertest
      .get('/notes/777?endtime=2013-11-30')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(200)
      .expect('Content-Type','application/json')
      .end(function(err, res) {
        if (err) return done(err);
        expectToken(sessionToken);
        expect(res.body).to.have.property('messages').and.be.instanceof(Array);
        expect(res.body.messages.length).to.equal(1);

        res.body.messages.forEach(function(message){
          testMessageContent(message);
        });

        done();
      });
    });

    it('returns 400 when the endtime is invalid', function(done) {
      supertest.get('/notes/99977777?endtime=not-a-date')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(400,done);
    });

  });

  describe('GET /thread/:msgid ', function() {

    it('returns 3 messages with thread id', function(done) {
      supertest
      .get('/thread/'+fakeRootId)
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(200)
      .expect('Content-Type','application/json')
      .end(function(err, res) {
        if (err) return done(err);
        expectToken(sessionToken);
        expect(res.body).to.have.property('messages').and.be.instanceof(Array);
        expect(res.body.messages.length).equal(3);

        res.body.messages.forEach(function(message){
          testMessageContent(message);
        });

        done();
      });
    });

    it('returns 404 when no messages', function(done) {

      supertest
      .get('/thread/'+String(testDbInstance.ObjectId()))
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(404)
      .end(function(err, res) {
        if (err) return done(err);
        expect(res.body.messages).to.be.empty;
        done();
      });
    });

  });

  describe('POST /send/:groupid', function() {

    it('should not work without groupid parameter', function(done) {

      supertest.post('/send')
      .set('X-Tidepool-Session-Token', sessionToken)
      .send({message:'here it is'})
      .expect(404,done);

    });

    it('only saves core message fields', function(done) {

      var messageWithExtras = {
        parentmessage : null,
        userid: '12121212',
        groupid: '777',
        timestamp: '2013-11-28T23:07:40+00:00',
        messagetext: 'In three words I can sum up everything I have learned about life: it goes on.',
        stuff : {one:'one',two:'two'}
      };

      /*
       * Save message with extra data
       */
      supertest
      .post('/send/12345')
      .set('X-Tidepool-Session-Token', sessionToken)
      .send({message:messageWithExtras})
      .expect(201)
      .end(function(err, res) {
        if (err) return done(err);

        /*
         * Now lets see what we get back
         */
        var extrasId = res.body.id;
        expect(extrasId).to.exist;

        mongoHandler.getMessage(extrasId,function(error,inMongo){
          if (error) return done(error);
          expect(inMongo.stuff).to.not.exist;
          done();
        });

      });

    });

    it('returns 201 for success', function(done) {

      var testMessage = require('../helpers/testMessagesData').note;

      supertest
      .post('/send/12345')
      .set('X-Tidepool-Session-Token', sessionToken)
      .send({message:testMessage})
      .expect(201,done);

    });

    it('return Id when message added', function(done) {

      var testMessage = require('../helpers/testMessagesData').note;

      supertest
      .post('/send/12345')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(201)
      .send({message:testMessage})
      .end(function(err, res) {
        if (err) return done(err);
        expectToken(sessionToken);
        expect(res.body).to.have.property('id');
        done();
      });
    });

    it('return 400 when messages to add does not meet the requirements', function(done) {

      var invalidMessage = {
        parentmessage : '',
        userid: '12345',
        timestamp: '2013-12-04T23:05:40+00:00',
        messagetext: ''
      };

      supertest
      .post('/send/12345')
      .set('X-Tidepool-Session-Token', sessionToken)
      .send({message:invalidMessage})
      .expect(400)
      .end(function(err, res) {
        if (err) return done(err);
        var message = res.body;
        expect(message).equal('{"groupid":"property is required","messagetext":"property is required"}');
        done();
      });
    });

    it('return 401 when we do not have permission to add a message', function(done) {

      var message = {
        userid: '12345',
        groupid: 'no-permission',
        timestamp: '2013-12-04T23:05:40+00:00',
        messagetext: 'no permission'
      };

      supertest
      .post('/send/12345')
      .set('X-Tidepool-Session-Token', sessionToken)
      .send({message:message})
      .expect(401,done);
    });
  });

  describe('POST /reply/:msgid', function() {

    it('should not work without msgid parameter', function(done) {

      supertest
      .post('/reply')
      .set('X-Tidepool-Session-Token', sessionToken)
      .send({message:'here it is'})
      .expect(404,done);

    });

    it('returns 201', function(done) {

      var testMessage = require('../helpers/testMessagesData').note;

      supertest
      .post('/reply/12345')
      .set('X-Tidepool-Session-Token', sessionToken)
      .send({message:testMessage})
      .expect(201,done);

    });

    it('only saves core message fields', function(done) {

      var replyWithExtras = {
        userid: '12121212',
        groupid: '777',
        timestamp: '2013-11-28T23:07:40+00:00',
        messagetext: 'In three words I can sum up everything I have learned about life: it goes on.',
        stuff : {one:'one',two:'two'},
        morestuff : 'some more stuff we should not save'
      };

      /*
       * Save a reply to a message with extras attached
       */
      supertest
      .post('/reply/12345')
      .set('X-Tidepool-Session-Token', sessionToken)
      .send({message:replyWithExtras})
      .expect(201)
      .end(function(err, res) {
        if (err) return done(err);

        var extrasId = res.body.id;

        /*
         * Now test what was saved
         */
        mongoHandler.getMessage(extrasId,function(error,inMongo){
          if (error) return done(error);
          expect(inMongo.stuff).to.not.exist;
          expect(inMongo.morestuff).to.not.exist;
          done();
        });

      });

    });

    it('return Id when message added', function(done) {

      var testMessage = require('../helpers/testMessagesData').note;

      supertest
      .post('/reply/12345')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(201)
      .send({message:testMessage})
      .end(function(err, res) {
        if (err) return done(err);
        expectToken(sessionToken);
        expect(res.body).to.have.property('id');
        done();
      });
    });

    it('return 400 when messages to add does not meet the requirements', function(done) {

      var invalidMessage = {
        userid: '12345',
        timestamp: '2013-12-04T23:05:40+00:00',
        messagetext: ''
      };

      supertest
      .post('/reply/12345')
      .set('X-Tidepool-Session-Token', sessionToken)
      .send({message:invalidMessage})
      .expect(400)
      .end(function(err, res) {
        if (err) return done(err);
        var message = res.body;
        expect(message).equal('{"groupid":"property is required","messagetext":"property is required"}');
        done();
      });
    });

    it('return 401 when we do not have permission to reply to a message', function(done) {

      var replyWithNoPermission = {
        userid: '12345',
        groupid: 'no-permission',
        timestamp: '2013-12-04T23:05:40+00:00',
        messagetext: 'no permission to reply'
      };

      supertest
      .post('/reply/12345')
      .set('X-Tidepool-Session-Token', sessionToken)
      .send({message:replyWithNoPermission})
      .expect(401,done);
    });
  });

  describe('PUT /edit/:msgid', function() {

    var messageToEdit;

    before(function(done){
      // grab a message that has been saved already
      testDbInstance.messages.findOne({},function(err, doc) {
        messageToEdit = String(doc._id);
        done();
      });
    });

    it('allows us to update the text of a message', function(done) {

      var updatedNoteText = {
        messagetext: 'some updated text'
      };

      supertest
      .put('/edit/'+messageToEdit)
      .set('X-Tidepool-Session-Token', sessionToken)
      .send({message:updatedNoteText})
      .expect(200,done);

    });
    it('allows us to update the time of a message', function(done) {

      var updatedNoteTime = {
        timestamp : new Date().toISOString()
      };

      supertest
      .put('/edit/'+messageToEdit)
      .set('X-Tidepool-Session-Token', sessionToken)
      .send({message:updatedNoteTime})
      .expect(200,done);

    });

    it('does not return a message body', function(done) {

      var updatedNoteTime = {
        timestamp : new Date().toISOString()
      };

      supertest
      .put('/edit/'+messageToEdit)
      .set('X-Tidepool-Session-Token', sessionToken)
      .send({message:updatedNoteTime})
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        expect(res.body).to.be.empty;
        done();
      });

    });
  });

  describe('DELETE /remove/:msgid', function() {

    var messageToRemove;

    before(function(done){
      // grab a message that has been saved already
      testDbInstance.messages.findOne({},function(err, doc) {
        messageToRemove = String(doc._id);
        done();
      });
    });

    it('allows you to start a delete on a message', function(done) {

      expect(messageToRemove).to.exist;

      supertest
      .del('/remove/'+messageToRemove)
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(202,done);

    });

    it('does not return a message body', function(done) {

      expect(messageToRemove).to.exist;

      supertest
      .del('/remove/'+messageToRemove)
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(202)
      .end(function(err, res) {
        if (err) return done(err);
        expect(res.body).to.be.empty;
        done();
      });

    });

    it('means you will not get the deleted message back if you try to find it', function(done) {

      expect(messageToRemove).to.exist;

      supertest
      .get('/read/'+messageToRemove)
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(404,done);

    });
  });

});