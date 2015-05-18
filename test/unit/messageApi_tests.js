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

var supertest = require('supertest');
var restify = require('restify');
var salinity = require('salinity');

var expect = salinity.expect;

var testNote = require('../helpers/testMessagesData').note;
var testReply = require('../helpers/testMessagesData').noteAndComments[1];
var seagullHandler = require('../helpers/mockSeagullHandler')();

var config = { deleteWindow : 5 };

describe('message API', function() {

  /*
    minimise the components to just groups API and mocked crud handler
  */
  var setupAPI = function(crudHandler){

    var server = restify.createServer({name:'Message API Tests'});
    server.use(restify.queryParser());
    server.use(restify.bodyParser());

    function doNothing() { return null; }

    var dummyMetrics = {
      postServer: doNothing,
      postThisUser: doNothing,
      postWithUser:doNothing
    };

    var messageApi = require('../../lib/routes/messageApi')(
      config,
      crudHandler,
      seagullHandler,
      dummyMetrics
    );

    server.get('/status',messageApi.status);

    server.get('/read/:msgid', messageApi.findById);
    server.get('/all/:groupid?starttime&endtime', messageApi.findAllById);
    server.get('/thread/:msgid', messageApi.getThread);
    server.get('/notes/:groupid?starttime&endtime', messageApi.getNotes);

    //adding messages
    server.post('/send/:groupid', messageApi.addThread);
    server.post('/reply/:msgid',messageApi.replyToThread);

    //updates
    server.put('/edit/:msgid', messageApi.editMessage);
    server.del('/remove/:msgid',messageApi.removeMessage);

    return server;
  };

  describe('under normal conditions', function() {

    var messaging;

    before(function(){

      var mockMongoHandler = require('../helpers/mockMongoHandler')({
        throwErrors : false,
        returnNone : false
      });

      messaging = setupAPI(mockMongoHandler);

    });

    it('returns 404 for invalid path', function(done) {
      supertest(messaging)
      .get('/doesnotexist')
      .expect(404,done);
    });

    describe('status', function() {
      it('returns 200', function(done) {
        supertest(messaging)
        .get('/status')
        .expect(200,done);
      });
      it('returns thes status code that was passed as the status param', function(done) {
        supertest(messaging)
        .get('/status?status=201')
        .expect(201,done);
      });
      it('ignores other passed params', function(done) {
        supertest(messaging)
        .get('/status?randomParam=401')
        .expect(200,done);
      });
    });
    describe('send', function() {

      it('rejects an invalid parent message', function(done) {

        var invalidParentNoMessageText = {
          userid: '12345',
          groupid: '4567',
          parentmessage:'',
          timestamp:'2013-11-28T23:07:40+00:00',
          messagetext:''
        };

        supertest(messaging)
        .post('/send/88883288')
        .send({message:invalidParentNoMessageText})
        .expect(400)
        .end(function(err, res) {
          if (err) return done(err);
          expect(res.body).to.not.have.property('id');
          done();
        });
      });

      it('ignores the parentmessage as it will be created the parent', function(done) {

        var parentMessage = {
          guid: 'abcde',
          userid: '12345',
          groupid: '4567',
          parentmessage:'',
          timestamp:'2013-11-28T23:07:40+00:00',
          messagetext:'my new message thread'
        };

        supertest(messaging)
        .post('/send/88883288')
        .send({message:parentMessage})
        .expect(201)
        .end(function(err, res) {
          if (err) return done(err);
          expect(res.body).to.have.property('id');
          done();
        });
      });

      it('returns 201 and the id of the message', function(done) {

        supertest(messaging)
        .post('/send/88883288')
        .send({message:testNote})
        .expect(201)
        .end(function(err, res) {
          if (err) return done(err);
          expect(res.body).to.have.property('id');
          done();
        });
      });
    });
    describe('reply', function() {

      it('does not require the parentmessage to be set', function(done) {

        var replyWithParentNotSet = {
          guid: 'abcde',
          userid: '12345',
          groupid: '4567',
          parentmessage: null ,
          timestamp:'2013-11-28T23:07:40+00:00',
          messagetext:'my reply'
        };

        supertest(messaging)
        .post('/reply/123456743')
        .send({message:replyWithParentNotSet})
        .expect(201)
        .end(function(err, res) {
          if (err) return done(err);
          expect(res.body).to.have.property('id');
          done();
        });
      });

      it('rejects an invalid reply', function(done) {

        var invalidReplyNoTimeStamp = {
          userid: '12345',
          groupid: '4567',
          parentmessage:'123456743',
          timestamp:'',
          messagetext:'my reply'
        };

        supertest(messaging)
        .post('/reply/123456743')
        .send({message:invalidReplyNoTimeStamp})
        .expect(400)
        .end(function(err, res) {
          if (err) return done(err);
          expect(res.body).to.not.have.property('id');
          done();
        });
      });

      it('returns 201 and the id of the message', function(done) {

        supertest(messaging)
        .post('/reply/123456743')
        .send({message:testReply})
        .expect(201)
        .end(function(err, res) {
          if (err) return done(err);
          expect(res.body).to.have.property('id');
          done();
        });
      });
    });
    describe('notes', function() {
      it('returns 200 and an array if successful', function(done) {

        supertest(messaging)
        .get('/notes/88883288')
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          var messages = res.body.messages;
          expect(messages).to.be.instanceOf(Array);
          done();
        });
      });
      it('allows a starttime', function(done) {

        var start = new Date();

        supertest(messaging)
        .get('/notes/88883288?starttime='+start)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          var messages = res.body.messages;
          expect(messages).to.be.instanceOf(Array);
          done();
        });
      });
      it('allows a start and endtime', function(done) {

        var start = new Date();
        var end = new Date();

        supertest(messaging)
        .get('/notes/88883288?starttime='+start+'&endtime='+end)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          var messages = res.body.messages;
          expect(messages).to.be.instanceOf(Array);
          done();
        });
      });
    });
    describe('read', function() {
      it('returns 200 and a message', function(done) {
        supertest(messaging)
        .get('/read/123456743')
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          expect(res.body.message).to.be.exist;
          done();
        });
      });
    });
    describe('all', function() {
      it('allows a starttime and returns an array of messages', function(done) {

        var start = new Date();

        supertest(messaging)
        .get('/all/88883288?starttime='+start)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          expect(res.body.messages).to.be.instanceOf(Array);

          done();
        });
      });
      it('allows both a start and endtime', function(done) {

        var start = new Date();
        var end = new Date();

        supertest(messaging)
        .get('/all/88883288?starttime='+start+'&endtime='+end)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          var messages = res.body.messages;
          expect(messages).to.be.instanceOf(Array);
          done();
        });
      });
    });
    describe('thread', function() {
      it('returns an array of messages', function(done) {
        supertest(messaging)
        .get('/thread/123456743')
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          var messages = res.body.messages;
          expect(messages).to.be.instanceOf(Array);
          done();
        });
      });
    });
    describe('edit', function() {
      it('returns 200', function(done) {

        var updates = {
          messagetext : 'correction - should have been 12 units'
        };

        supertest(messaging)
        .put('/edit/123456')
        .send({message:updates})
        .expect(200,done);
      });
    });
    describe('remove', function() {
      it('returns 202', function(done) {

        supertest(messaging)
        .del('/remove/123456')
        .expect(202,done);
      });
    });
  });

  /*
  GOAL: To test we get the correct return code when no data match's what we requested.
  */
  describe('when no match', function() {
    var messaging;

    before(function(){

      var mockMongoHandler = require('../helpers/mockMongoHandler')({
        throwErrors : false,
        returnNone : true
      });

      messaging = setupAPI(mockMongoHandler);

    });

    it('read returns 404', function(done) {
      supertest(messaging)
      .get('/read/123456743')
      .expect(404,done);
    });

    it('notes returns 404', function(done) {
      supertest(messaging)
      .get('/notes/2222233445')

      .expect(404,done);
    });

    it('all returns 404', function(done) {
      var start = new Date();
      var end = new Date();
      supertest(messaging)
      .get('/all/88883288?starttime='+start+'&endtime='+end)
      .expect(404,done);
    });

  });

  /*
  GOAL: To test that when excepetions occur when are give the correct return code and
  that no implementation details are leaked.
  */
  describe('under error conditions', function() {
    var messaging;

    before(function(){

      var mockMongoHandler = require('../helpers/mockMongoHandler')({
        throwErrors : true,
        returnNone : false
      });

      messaging = setupAPI(mockMongoHandler);

    });

    it('read will return 500', function(done) {
      supertest(messaging)
      .get('/read/123456743')
      .expect(500,done);
    });

    it('notes will return 500', function(done) {
      supertest(messaging)
      .get('/notes/2222233445')
      .expect(500,done);
    });

    it('all will return 500', function(done) {
      var start = new Date();
      supertest(messaging)
      .get('/all/88883288?starttime='+start)
      .expect(500,done);
    });

    it('send will return 500', function(done) {
      supertest(messaging)
      .post('/send/88883288')
      .send({message:testNote})
      .expect(500,done);
    });

    it('reply will return 500', function(done) {
      supertest(messaging)
      .post('/reply/123456743')
      .send({message:testNote})
      .expect(500,done);
    });

    it('status will return 500', function(done) {
      supertest(messaging)
      .get('/status')
      .expect(500,done);
    });

    it('edit will return 500', function(done) {

      var edits = {
        messagetext: 'updated'
      };

      supertest(messaging)
      .put('/edit/123-99-100')
      .send({message:edits})
      .expect(500,done);
    });

    it('remove will return 500', function(done) {
      supertest(messaging)
      .del('/remove/1234088')
      .expect(500,done);
    });

  });

});