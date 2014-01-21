/*
 * Copyright (c) 2014, Tidepool Project
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice, this
 * list of conditions and the following disclaimer in the documentation and/or other
 * materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 * IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 * NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
 
'use strict';
/* jshint -W079 *//* jshint -W098 */
var should = require('chai').should(),
/* jshint +W079 *//* jshint +W098 */
    supertest = require('supertest'),
    config = require('../env'),
    mongojs = require('mongojs'),
    testMessages = require('./helpers/testMessagesData').relatedSet
    messagesService,
    testDbInstance,
    crud,
    apiEndPoint;

describe('message API', function() {

    before(function(){
        /*
        Setup api and also load data for tests
        */


        config = require('../env');
        crud = require('../lib/handler/mongoHandler')(config.mongoDbConnectionString);

        apiEndPoint = 'http://localhost:'+config.port;

        messagesService = require('../lib/messagesService')(crud,config.port);
        messagesService.start();

        testDbInstance = mongojs('mongodb://localhost/tidepool-platform', ['messages']);
    
        testDbInstance.messages.remove();

        testMessages.forEach(function(message) {
            testDbInstance.messages.save(message);
        });

    });

    after(function(){
        messagesService.stop();
    });

    describe('get /api/message/:msgId', function() {

        var testMessageId;
        var testMessageContent;

        before(function(done){
            
            //Get id of existing message for tests 
            testDbInstance.messages.findOne({},function(err, doc) {
                testMessageId = doc._id;
                testMessageContent = doc;
                done();
            });
        });

        it('should not work without msgId parameter', function(done) {
            supertest(apiEndPoint).get('/api/message/read')
            .expect(404)
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });
        });

        it('returns message for given id as JSON with content we expect', function(done) {

            supertest(apiEndPoint).get('/api/message/read/'+testMessageId)
            .expect(200)
            .expect('Content-Type', 'application/json')
            .end(function(err, res) {
                if (err) return done(err);
                
                var theMessage = res.body.message;

                theMessage.id.should.equal(String(testMessageId));
                theMessage.timestamp.should.equal(String(testMessageContent.timestamp));
                theMessage.groupid.should.equal(String(testMessageContent.groupid));
                theMessage.userid.should.equal(String(testMessageContent.userid));
                theMessage.messagetext.should.equal(String(testMessageContent.messagetext));

                done();
            });
        });

        it('returns message with id, userid, groupid, timestamp , messagetext', function(done) {

            var messageFields = ['id', 'userid','groupid', 'timestamp', 'messagetext'];

            supertest(apiEndPoint).get('/api/message/read/'+testMessageId)
            .expect(200)
            .expect('Content-Type', 'application/json')
            .end(function(err, res) {
                if (err) return done(err);

                var message = res.body.message;
                var theMessage = message;

                theMessage.should.have.keys(messageFields);

                done();
            });
        });

        it('returns 204 if no message found for id', function(done) {

            var dummyId = mongojs.ObjectId().toString();

            supertest(apiEndPoint).get('/api/message/read/'+dummyId)
            .expect(204)
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });
        });

        it('returns 204 if a bad id is given', function(done) {

            supertest(apiEndPoint).get('/api/message/read/badIdGiven')
            .expect(204)
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });
        });
    });

    describe('get /api/message/all/:groupid?starttime=xxx&endtime=yyy', function() {

        it('should not work without groupid parameter', function(done) {
            supertest(apiEndPoint).get('/api/message/all')
            .expect(404)
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });
        });

        it('returns 204 when there are no messages for given groupid', function(done) {
            supertest(apiEndPoint).get('/api/message/all/12342?starttime=2013-11-25&endtime=2013-11-30')
            .expect(204)
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });
        });

        it('returns messages for given groupid 777 between the given dates', function(done) {

            supertest(apiEndPoint).get('/api/message/all/777?starttime=2013-11-25&endtime=2013-11-30')
            .expect(200)
            .expect('Content-Type', 'application/json')
            .end(function(err, res) {
                if (err) return done(err);
                res.body.should.have.property('messages').and.be.instanceof(Array);
                done();
            });
        });

    });

    describe('get /api/message/all/:groupid?starttime=xxx also works without endtime', function() {

        it('returns messages for group and from given date', function(done) {
            supertest(apiEndPoint).get('/api/message/all/777?starttime=2013-11-25')
            .expect(200)
            .expect('Content-Type','application/json')
            .end(function(err, res) {
                if (err) return done(err);
                res.body.should.have.property('messages').and.be.instanceof(Array);
                done();
            });
        });

    });

    describe('post /api/message/send/:groupid', function() {
        
        it('should not work without groupid parameter', function(done) {

            supertest(apiEndPoint).post('/api/message/send')
            .send({message:'here it is'})
            .expect(404)
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });
            
        });

        it('returns 201', function(done) {

            var testMessage = {
                userid : '12345',
                groupid : '777',
                timestamp : '2013-11-29T23:05:40+00:00',
                messagetext : 'Test put message 1.'
            };

            supertest(apiEndPoint).post('/api/message/send/12345')
            .send({message:testMessage})
            .expect(201)
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });

        });

        it('return Id when message added', function(done) {

            var testMessage = {
                userid: '12345',
                groupid: '777',
                timestamp: '2013-12-04T23:05:40+00:00',
                messagetext: 'Test put message 2.'
            };

            supertest(apiEndPoint).post('/api/message/send/12345')
            .expect(201)
            .send({message:testMessage})
            .end(function(err, res) {
                if (err) return done(err);
                res.body.should.have.property('Id');
                done();
            });
        });

        it('return 400 when messages to add does not meet the requirements', function(done) {

            var invalidMessage = {
                userid: '12345',
                timestamp: '2013-12-04T23:05:40+00:00',
                messagetext: ''
            };

            supertest(apiEndPoint).post('/api/message/send/12345')
            .expect(400)
            .send({message:invalidMessage})
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });
        });
    });
   
});