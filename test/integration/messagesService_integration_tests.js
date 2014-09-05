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
var dummyMetrics = mockableObject.make('postThisUser');
var gatekeeperHandler = require('../helpers/mockGatekeeperHandler')();

//mock metrics

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

describe('message service', function() {

  var fakeRootId = String(testDbInstance.ObjectId());

  function setupToken(user) {
    sinon.stub(userApiClient, 'checkToken').callsArgWith(1, null, user);
  }

  function expectToken(token) {
    expect(userApiClient.checkToken).to.have.been.calledOnce;
    expect(userApiClient.checkToken).to.have.been.calledWith(token, sinon.match.func);
  }

  function mockMetrics() {
    sinon.stub(dummyMetrics,'postThisUser');
  }

  function expectMetricsToBeCalled() {
    expect(dummyMetrics.postThisUser).to.have.been.calledOnce;
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
      'createdtime',
      'timestamp'
    );
    //and only 8 properties
    expect(Object.keys(message).length).to.equal(8);
    //these properties must be returned with a value
    expect(message.id).to.exist;
    expect(message.groupid).to.exist;
    expect(message.userid).to.exist;
    expect(message.timestamp).to.exist;
    expect(message.createdtime).to.exist;
    expect(message.messagetext).to.exist;

  }

  /*
   * Mocks reset each time
   */
  beforeEach(function () {
    mockableObject.reset(userApiClient);
    mockableObject.reset(dummyMetrics);
    setupToken(messageUser);
    mockMetrics();
  });

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
  });

  after(function () {
    /*
     * Close things down
     */
    messageService.close();
  });

  describe('/read', function() {

    var messageFromMongo;

    before(function(done){
      // grab a message that has been saved already
      testDbInstance.messages.findOne({},function(err, doc) {
        messageFromMongo = doc;
        done();
      });
    });

    it('metrics are called', function(done) {

      supertest
      .get('/read/'+String(messageFromMongo._id))
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        expectMetricsToBeCalled();
        done();
      });
    });

    it('the token is used', function(done) {

      supertest
      .get('/read/'+String(messageFromMongo._id))
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        expectToken(sessionToken);
        done();
      });
    });

    it('returns one message with all expected fields', function(done) {
      supertest
      .get('/read/'+String(messageFromMongo._id))
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(200)
      .expect('Content-Type', 'application/json')
      .end(function(err, res) {
        if (err) return done(err);
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

    it('returns 404 for an invalid path', function(done) {

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
  describe('/all', function() {

    it('metrics are called', function(done) {

      supertest
      .get('/all/777?starttime=2013-11-25&endtime=2013-11-30')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        done();
      });
    });

    it('the token is used', function(done) {

      supertest
      .get('/all/777?starttime=2013-11-25&endtime=2013-11-30')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        done();
      });
    });

    it('finds messages between given start and end time', function(done) {
      supertest
      .get('/all/777?starttime=2013-11-25&endtime=2013-11-30')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(200)
      .expect('Content-Type', 'application/json')
      .end(function(err, res) {
        if (err) return done(err);
        expect(res.body).to.have.property('messages').and.be.instanceof(Array);
        expect(res.body.messages.length).to.equal(3);

        res.body.messages.forEach(function(message){
          testMessageContent(message);
        });
        done();
      });
    });

    it('find messages before the given endtime', function(done) {
      supertest
      .get('/all/777?endtime=2013-11-30')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(200)
      .expect('Content-Type','application/json')
      .end(function(err, res) {
        if (err) return done(err);
        expect(res.body).to.have.property('messages').and.be.instanceof(Array);
        expect(res.body.messages.length).to.equal(3);

        res.body.messages.forEach(function(message){
          testMessageContent(message);
        });

        done();
      });
    });

    it('returns 404 an unspecified path', function(done) {
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

    it('returns 404 when there are no messages', function(done) {
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

    it('returns 400 when an invalid starttime is given', function(done) {
      supertest
      .get('/all/12342?starttime=not-a-date&endtime=2013-11-30')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(400,done);
    });

    it('returns 400 when the endtime is invalid', function(done) {
      supertest.get('/all/777?endtime=not-a-date')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(400,done);
    });
  });
  describe('/notes', function() {

    it('metrics are called', function(done) {

      supertest
      .get('/notes/777')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        expectMetricsToBeCalled();
        done();
      });
    });

    it('the token is used', function(done) {

      supertest
      .get('/notes/777')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        expectToken(sessionToken);
        done();
      });
    });

    it('returns valid messages', function(done) {
      supertest
      .get('/notes/777')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(200)
      .expect('Content-Type','application/json')
      .end(function(err, res) {
        if (err) return done(err);
        expect(res.body).to.have.property('messages').and.be.instanceof(Array);
        expect(res.body.messages.length).to.equal(1);

        res.body.messages.forEach(function(message){
          testMessageContent(message);
        });

        done();
      });
    });

    it('returns 404 when no there are no messages', function(done) {
      supertest.get('/notes/99977777')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(404)
      .end(function(err, res) {
        if (err) return done(err);
        expect(res.body.messages).to.be.empty;
        done();
      });
    });

    it('returns 401 when you do not have permisson to see the notes', function(done) {
      supertest.get('/notes/no-permission')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(401,done);
    });

    it('takes a starttime and returns matching messages', function(done) {
      supertest
      .get('/notes/777?starttime=2013-11-25')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(200)
      .expect('Content-Type','application/json')
      .end(function(err, res) {
        if (err) return done(err);
        expect(res.body).to.have.property('messages').and.be.instanceof(Array);
        expect(res.body.messages.length).to.equal(1);

        res.body.messages.forEach(function(message){
          testMessageContent(message);
        });

        done();
      });
    });

    it('takes a starttime and endtime returning matching messages', function(done) {
      supertest
      .get('/notes/777?starttime=2013-11-25&endtime=2013-11-30')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(200)
      .expect('Content-Type','application/json')
      .end(function(err, res) {
        if (err) return done(err);
        expect(res.body).to.have.property('messages').and.be.instanceof(Array);
        expect(res.body.messages.length).to.equal(1);

        res.body.messages.forEach(function(message){
          testMessageContent(message);
        });

        done();
      });
    });

    it('returns 400 for invalid starttime param', function(done) {
      supertest.get('/notes/99977777?starttime=not-a-date')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(400,done);
    });

    it('returns 400 for invalid endtime param', function(done) {
      supertest.get('/notes/777?starttime=2013-11-25&endtime=not-a-date')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(400,done);
    });

    it('allows only an endtime returning matching messages', function(done) {
      supertest
      .get('/notes/777?endtime=2013-11-30')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(200)
      .expect('Content-Type','application/json')
      .end(function(err, res) {
        if (err) return done(err);
        expect(res.body).to.have.property('messages').and.be.instanceof(Array);
        expect(res.body.messages.length).to.equal(1);

        res.body.messages.forEach(function(message){
          testMessageContent(message);
        });

        done();
      });
    });

  });
  describe('/thread', function() {

    it('metrics are called', function(done) {

      supertest
      .get('/thread/'+fakeRootId)
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        expectMetricsToBeCalled();
        done();
      });
    });

    it('the token is used', function(done) {

      supertest
      .get('/thread/'+fakeRootId)
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        expectToken(sessionToken);
        done();
      });
    });

    it('returns an array of messages', function(done) {
      supertest
      .get('/thread/'+fakeRootId)
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(200)
      .expect('Content-Type','application/json')
      .end(function(err, res) {
        if (err) return done(err);
        expect(res.body).to.have.property('messages').and.be.instanceof(Array);
        expect(res.body.messages.length).equal(3);

        res.body.messages.forEach(function(message){
          testMessageContent(message);
        });

        done();
      });
    });

    it('returns 404 when there are no messages', function(done) {

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
  describe('/send', function() {

    it('metrics are called', function(done) {
      var testMessage = require('../helpers/testMessagesData').note;

      supertest
      .post('/send/12345')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(201)
      .send({message:testMessage})
      .end(function(err, res) {
        if (err) return done(err);
        expectMetricsToBeCalled();
        done();
      });
    });

    it('the token is used', function(done) {
      var testMessage = require('../helpers/testMessagesData').note;

      supertest
      .post('/send/12345')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(201)
      .send({message:testMessage})
      .end(function(err, res) {
        if (err) return done(err);
        expectToken(sessionToken);
        done();
      });
    });

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

    it('returns 201 and an id for success', function(done) {

      var testMessage = require('../helpers/testMessagesData').note;

      supertest
      .post('/send/12345')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(201)
      .send({message:testMessage})
      .end(function(err, res) {
        if (err) return done(err);
        expect(res.body).to.have.property('id');
        done();
      });

    });

    it('returns 400 and a message in the body when the given message is invalid', function(done) {

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

    it('returns 401 when we do not have permission to add a message', function(done) {

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
      .expect(401)
      .end(function(err, res) {
        if (err) return done(err);
        console.log(res.body);
        done();
      });
    });
  });
  describe('/reply', function() {

    it('metrics are called', function(done) {

      var testMessage = require('../helpers/testMessagesData').note;

      supertest
      .post('/reply/12345')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(201)
      .send({message:testMessage})
      .end(function(err, res) {
        if (err) return done(err);
        expectMetricsToBeCalled();
        done();
      });
    });

    it('the token is used', function(done) {

      var testMessage = require('../helpers/testMessagesData').note;

      supertest
      .post('/reply/12345')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(201)
      .send({message:testMessage})
      .end(function(err, res) {
        if (err) return done(err);
        expectToken(sessionToken);
        done();
      });
    });

    it('will not work without msgid parameter', function(done) {

      supertest
      .post('/reply')
      .set('X-Tidepool-Session-Token', sessionToken)
      .send({message:'here it is'})
      .expect(404,done);

    });
    it('returns an id on success', function(done) {

      var testMessage = require('../helpers/testMessagesData').note;

      supertest
      .post('/reply/12345')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(201)
      .send({message:testMessage})
      .end(function(err, res) {
        if (err) return done(err);
        expectToken(sessionToken);
        expectMetricsToBeCalled();
        expect(res.body).to.have.property('id');
        done();
      });
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
    it('returns 400 when given an invalid message and an appropriate message as to why', function(done) {

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
    it('returns 401 when we do not have permission to reply to a message', function(done) {

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
  describe('/edit', function() {

    var messageToEdit;

    before(function(done){
      // grab a message that has been saved already
      testDbInstance.messages.findOne({},function(err, doc) {
        messageToEdit = String(doc._id);
        done();
      });
    });

    it('metrics are called', function(done) {

      var updatedNoteText = {
        messagetext: 'some updated text'
      };

      supertest
      .put('/edit/'+messageToEdit)
      .set('X-Tidepool-Session-Token', sessionToken)
      .send({message:updatedNoteText})
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        expectMetricsToBeCalled();
        done();
      });
    });
    it('the token is used', function(done) {

      var updatedNoteText = {
        messagetext: 'some updated text'
      };

      supertest
      .put('/edit/'+messageToEdit)
      .set('X-Tidepool-Session-Token', sessionToken)
      .send({message:updatedNoteText})
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        expectToken(sessionToken);
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
  describe('/remove', function() {

    var messageToRemove;

    beforeEach(function(done){
      // grab a message that has been saved already
      testDbInstance.messages.findOne({},function(err, doc) {
        messageToRemove = String(doc._id);
        done();
      });
    });

    it('metrics are called', function(done) {

      supertest
      .del('/remove/'+messageToRemove)
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(202)
      .end(function(err, res) {
        if (err) return done(err);
        expectMetricsToBeCalled();
        done();
      });
    });

    it('the token is used', function(done) {

      supertest
      .del('/remove/'+messageToRemove)
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(202)
      .end(function(err, res) {
        if (err) return done(err);
        expectToken(sessionToken);
        done();
      });
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

    it('allows you to start a delete on a message and means you can no loger get that message', function(done) {

      expect(messageToRemove).to.exist;

      supertest
      .del('/remove/'+messageToRemove)
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(202)
      .end(function(err, res) {
        if (err) return done(err);
        supertest
          .get('/read/'+messageToRemove)
          .set('X-Tidepool-Session-Token', sessionToken)
          .expect(404,done);

      });
    });

  });
  describe('/status', function() {

    it('metrics are NOT called', function(done) {
      supertest
      .get('/status')
      .set('X-Tidepool-Session-Token', sessionToken)
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        expect(dummyMetrics.postThisUser).to.have.not.been.called;
        done();
      });
    });

    it('the token is NOT used', function(done) {
      supertest
      .get('/status')
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        expect(userApiClient.checkToken).to.have.not.been.called;
        done();
      });
    });

  });

});