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
  mongoConnectionString: 'mongodb://localhost/test_messages'
};

var userApiClient = mockableObject.make('checkToken','checkPermissons');
var metrics = mockableObject.make('postServer', 'postThisUser', 'postWithUser');

function doNothing() { return null; }
var dummyMetrics = {
  postServer: doNothing,
  postThisUser: doNothing,
  postWithUser:doNothing
};

var messageService = require('../../lib/messagesService')(
  env,
  require('../../lib/handler/mongoHandler')(env.mongoConnectionString),
  userApiClient,
  require('../helpers/mockSeagullHandler')(),
  dummyMetrics
);

var supertest = require('supertest')('http://localhost:' + env.httpPort);
var testDbInstance = require('mongojs')(env.mongoConnectionString, ['messages']);

var messageUser = { userid: 'message', isserver: true };
var noteAndComments = require('../helpers/testMessagesData').noteAndComments;
var sessionToken = '99406ced-8052-49c5-97ee-547cc3347da6';

describe('message API', function() {

  var parentmessageId;

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
    All expectations for a message
  */
  function testMessageContent(message){
    expect(message).to.have.property('id');
    expect(message.id).to.exist;
    expect(message).to.have.property('parentmessage');
    expect(message).to.have.property('userid');
    expect(message.userid).to.exist;
    expect(message).to.have.property('user');
    expect(message.user).to.exist;
    expect(message).to.have.property('groupid');
    expect(message.groupid).to.exist;
    expect(message).to.have.property('messagetext');
    expect(message.messagetext).to.exist;
    expect(message).to.have.property('timestamp');
    expect(message.timestamp).to.exist;
    expect(message).to.have.property('comments');
  }

  function saveMessages(){
    testDbInstance.messages.remove();

    //save the first as a note

    var note = noteAndComments[0];
    var comments = noteAndComments.slice(1);

    testDbInstance.messages.save(note,function(error,details){
      parentmessageId = details._id;
      comments.forEach(function(comment){
        comment.parentmessage = String(parentmessageId);
        testDbInstance.messages.save(comment);
      });
    });
  }

  before(function (done) {

    saveMessages();

    messageService.start(done);

    setupToken(messageUser);
    mockMetrics();

  });

  after(function () {
    messageService.stop();
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

    it('returns 1 message and has three comments', function(done) {
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
          expect(message.comments).to.equal(3);
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

  });

  describe('GET /notes/:groupid?starttime=xxx ', function() {

    it('returns 1 note with three comments', function(done) {
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
          expect(message.comments).to.equal(3);
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

    it('returns 1 note with three comments', function(done) {
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
          expect(message.comments).to.equal(3);
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

    it('returns 400 when one date param is invalid', function(done) {
      supertest.get('/notes/99977777?starttime=2013-11-25&endtime=not-a-date')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(400,done);
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
          expect(message.comments).to.equal(3);
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

    it('returns 4 messages with thread id', function(done) {
      supertest
      .get('/thread/'+parentmessageId)
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(200)
      .expect('Content-Type','application/json')
      .end(function(err, res) {
        if (err) return done(err);
        expectToken(sessionToken);
        expect(res.body).to.have.property('messages').and.be.instanceof(Array);
        expect(res.body.messages.length).equal(4);

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

    it('returns 201', function(done) {

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
      .expect(400,done);
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
      .expect(400,done);
    });
  });

});