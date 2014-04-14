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

describe('message API', function() {

  /*
    minimise the components to just groups API and mocked crud handler
  */
  var setupAPI = function(crudHandler){

    var server = restify.createServer({name:'Message API Tests'});
    server.use(restify.queryParser());
    server.use(restify.bodyParser());

    var messageApi = require('../../lib/routes/messageApi')(crudHandler,seagullHandler);

    server.get('/status',messageApi.status);

    server.get('/read/:msgid', messageApi.findById);
    server.get('/all/:groupid?starttime&endtime', messageApi.findAllById);
    server.get('/thread/:msgid', messageApi.getThread);
    server.get('/notes/:groupid', messageApi.getNotes);

    //adding messages
    server.post('/send/:groupid', messageApi.addThread);
    server.post('/reply/:msgid',messageApi.replyToThread);

    return server;
  };

  /*
    All expectations for a message
  */
  var testMessageContent = function(message){
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
  };

  describe('validity of messages being added', function() {

    var messaging;

    before(function(){

      var mockMongoHandler = require('../helpers/mockMongoHandler')({
        throwErrors : false,
        returnNone : false
      });

      messaging = setupAPI(mockMongoHandler);

    });

    it('POST send/:groupid rejects an invalid parent message', function(done) {

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

    it('POST send/:groupid accepts a parent message with the parentmessage set as the parentmessage will be made to equal null', function(done) {

      var parentMessage = {
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

    it('POST reply/:msgid allows with no parent set as it will be set to the reply msgid', function(done) {

      var invalidReplyParentNotSet = {
        userid: '12345',
        groupid: '4567',
        parentmessage: null ,
        timestamp:'2013-11-28T23:07:40+00:00',
        messagetext:'my reply'
      };

      supertest(messaging)
      .post('/reply/123456743')
      .send({message:invalidReplyParentNotSet})
      .expect(201)
      .end(function(err, res) {
        if (err) return done(err);
        expect(res.body).to.have.property('id');
        done();
      });
    });

    it('POST reply/:msgid rejects an invalid reply', function(done) {

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

  });

  /*
  GOAL: To test that under normal operation that we get the return codes
  and any data (where applicable) that we would expect.
  */
  describe('when the request has been fulfilled', function() {

    var messaging;

    before(function(){

      var mockMongoHandler = require('../helpers/mockMongoHandler')({
        throwErrors : false,
        returnNone : false
      });

      messaging = setupAPI(mockMongoHandler);

    });


    it('GET /doesnotexist should return 404', function(done) {
      supertest(messaging)
      .get('/doesnotexist')
      .expect(404,done);
    });

    it('GET notes/:groupid returns 200', function(done) {

      supertest(messaging)
      .get('/notes/88883288')
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        var messages = res.body.messages;
        expect(messages).to.be.instanceOf(Array);

        messages.forEach(function(message){
          testMessageContent(message);
        });

        done();
      });
    });

    it('GET read/:msgid returns 200', function(done) {
      supertest(messaging)
      .get('/read/123456743')
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        var message = res.body.message;
        testMessageContent(message);
        done();
      });
    });

    it('GET all/:groupid with a starttime returns 200', function(done) {

      var start = new Date();

      supertest(messaging)
      .get('/all/88883288?starttime='+start)
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        var messages = res.body.messages;
        expect(messages).to.be.instanceOf(Array);

        messages.forEach(function(message){
          testMessageContent(message);
        });

        done();
      });
    });

    it('GET all/:groupid with a starttime and end time returns 200', function(done) {


      var start = new Date();
      var end = new Date();

      supertest(messaging)
      .get('/all/88883288?starttime='+start+'&endtime='+end)
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        var messages = res.body.messages;
        expect(messages).to.be.instanceOf(Array);

        messages.forEach(function(message){
          testMessageContent(message);
        });

        done();
      });
    });

    it('GET thread/:msgid return 200', function(done) {
      supertest(messaging)
      .get('/thread/123456743')
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        var messages = res.body.messages;
        expect(messages).to.be.instanceOf(Array);

        messages.forEach(function(message){
          testMessageContent(message);
        });

        done();
      });
    });

    it('POST send/:groupid returns 201 and the id of the message', function(done) {

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

    it('POST reply/:msgid returns 201 and the id of the message', function(done) {

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

    it('GET /status', function(done) {
      supertest(messaging)
      .get('/status')
      .expect(200,done);
    });

    it('GET /status?status=201 returns 201 ', function(done) {

      supertest(messaging)
      .get('/status?status=201')
      .expect(201,done);
    });

    it('GET /status?randomParam=401 returns 200 as randomParam is ignored', function(done) {

      supertest(messaging)
      .get('/status?randomParam=401')
      .expect(200,done);
    });

  });

  /*
  GOAL: To test we get the correct return code when no data match's what we requested.
  */
  describe('when no match for Request-URI', function() {
    var messaging;

    before(function(){

      var mockMongoHandler = require('../helpers/mockMongoHandler')({
        throwErrors : false,
        returnNone : true
      });

      messaging = setupAPI(mockMongoHandler);

    });

    it('GET read/:msgid returns 404', function(done) {
      supertest(messaging)
      .get('/read/123456743')

      .expect(404,done);
    });

    it('GET notes/:groupid returns 404', function(done) {
      supertest(messaging)
      .get('/notes/2222233445')

      .expect(404,done);
    });

    it('GET all/:groupid with a starttime returns 404', function(done) {
      var start = new Date();
      supertest(messaging)
      .get('/all/88883288?starttime='+start)
      .expect(404,done);
    });

    it('GET all/:groupid with a starttime and end time returns 404', function(done) {
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
  describe('when an error occurs', function() {
    var messaging;

    before(function(){

      var mockMongoHandler = require('../helpers/mockMongoHandler')({
        throwErrors : true,
        returnNone : false
      });

      messaging = setupAPI(mockMongoHandler);

    });

    it('GET read/:msgid returns 500', function(done) {
      supertest(messaging)
      .get('/read/123456743')

      .expect(500,done);
    });

    it('GET notes/:groupid returns 500', function(done) {
      supertest(messaging)
      .get('/notes/2222233445')

      .expect(500,done);
    });

    it('GET all/:groupid?starttime=xxx returns 500', function(done) {
      var start = new Date();
      supertest(messaging)
      .get('/all/88883288?starttime='+start)
      .expect(500,done);
    });

    it('GET all/:groupid?starttime=xxx&endtime=yyy returns 500', function(done) {
      var start = new Date();
      var end = new Date();
      supertest(messaging)
      .get('/all/88883288?starttime='+start+'&endtime='+end)
      .expect(500,done);
    });

    it('POST send/:groupid returns 500', function(done) {

      supertest(messaging)
      .post('/send/88883288')
      .send({message:testNote})
      .expect(500,done);
    });

    it('POST /reply/:msgid returns 500', function(done) {

      supertest(messaging)
      .post('/reply/123456743')
      .send({message:testNote})
      .expect(500,done);
    });

    it('GET status returns 500', function(done) {
      supertest(messaging)
      .get('/status')
      .expect(500,done);
    });

  });

});