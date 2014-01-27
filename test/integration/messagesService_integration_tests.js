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
/* jshint -W079 *//* jshint -W098 */
var should = require('chai').should(),
/* jshint +W079 *//* jshint +W098 */
    mongojs = require('mongojs'),
    messagesToSave = require('../helpers/testMessagesData').relatedSet,
    messageServiceTestHelper = require('../helpers/messageServiceTestHelper'),
    supertest = require('supertest')(messageServiceTestHelper.testServiceEndpoint()),
    sessionToken = messageServiceTestHelper.sessiontoken,
    testDbInstance,
    apiEndPoint,
    crud;

describe('message API', function() {

    before(function(done){
        
        var config = messageServiceTestHelper.testConfig;

        //fake hakken functionality 
        var fakeHostGetter = {};
        fakeHostGetter.get = function(){
            return [{host:'http://localhost:'+config.userApiPort}];
        };

        crud = require('../../lib/handler/mongoHandler')(config.mongoDbConnectionString);

        //using the test helper setup the service and load test data
        messageServiceTestHelper.initMessagesService(crud,fakeHostGetter);
        testDbInstance = messageServiceTestHelper.createMongoInstance();
        apiEndPoint = messageServiceTestHelper.testServiceEndpoint();

        console.log('sessionToken ',sessionToken);

        
        testDbInstance.messages.remove();

        var fakeRootId = '8c4159e8-cf2d-4b28-b862-2c06f6aa9f93'

        for (var index = 0; index < messagesToSave.length; ++index) {
            
            if(index === 0){
                testDbInstance.messages.save(messagesToSave[index]);
            }else{
                messagesToSave[index].parentmessage = fakeRootId;
                testDbInstance.messages.save(messagesToSave[index]);
            }
        }
        done();

    });

    after(function(){
        messageServiceTestHelper.stopTestService();
    });

    describe('GET /api/message/:msgId', function() {

        var messageFromMongo;

        before(function(done){

            // grab a message that has been saved already
            testDbInstance.messages.findOne({},function(err, doc) {
                messageFromMongo = doc;
                console.log('message to test wth ',messageFromMongo);
                done();
            });

        });

        it('404 when path is incorrect', function(done) {
            supertest.get('/api/message/read')
            .set('X-Tidepool-Session-Token', sessionToken)
            .expect(404,done);
        });

        it('returns 200 and valid message', function(done) {

            supertest.get('/api/message/read/'+messageFromMongo._id)
            .set('X-Tidepool-Session-Token', sessionToken)
            .expect(200)
            .expect('Content-Type', 'application/json')
            .end(function(err, res) {
                if (err) return done(err);
                
                var theMessage = res.body.message;

                theMessage.id.should.equal(String(messageFromMongo._id));
                theMessage.parentmessage.should.equal(String(messageFromMongo.parentmessage));
                theMessage.timestamp.should.equal(String(messageFromMongo.timestamp));
                theMessage.groupid.should.equal(String(messageFromMongo.groupid));
                theMessage.userid.should.equal(String(messageFromMongo.userid));
                theMessage.messagetext.should.equal(String(messageFromMongo.messagetext));

                done();
            });
        });

        it('returns message all required feilds', function(done) {

            var messageFields = ['id', 'parentmessage', 'userid','groupid', 'timestamp', 'messagetext'];

            supertest.get('/api/message/read/'+String(messageFromMongo._id))
            .set('X-Tidepool-Session-Token', sessionToken)
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

            supertest.get('/api/message/read/'+dummyId)
            .set('X-Tidepool-Session-Token', sessionToken)
            .expect(204)
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });
        });

        it('returns 204 if a bad id is given', function(done) {

            supertest.get('/api/message/read/badIdGiven')
            .set('X-Tidepool-Session-Token', sessionToken)
            .expect(204)
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });
        });
    });

    describe('GET /api/message/all/:groupid?starttime=xxx&endtime=yyy', function() {

        it('returns 404 for invalid path', function(done) {
            
            supertest.get('/api/message/all')
            .set('X-Tidepool-Session-Token', sessionToken)
            .expect(404,done);
        });

        it('returns 204 when there are no messages for path', function(done) {
            
            supertest.get('/api/message/all/12342?starttime=2013-11-25&endtime=2013-11-30')
            .set('X-Tidepool-Session-Token', sessionToken)
            .expect(204,done);
        });

        it('returns 3 messages', function(done) {

            supertest.get('/api/message/all/777?starttime=2013-11-25&endtime=2013-11-30')
            .set('X-Tidepool-Session-Token', sessionToken)
            .expect(200)
            .expect('Content-Type', 'application/json')
            .end(function(err, res) {
                if (err) return done(err);
                res.body.should.have.property('messages').and.be.instanceof(Array);
                res.body.messages.length.should.equal(3);

                res.body.messages.forEach(function(message){
                    message.should.have.property('id');
                    message.should.have.property('userid');
                    message.should.have.property('groupid');
                    message.should.have.property('messagetext');
                    message.should.have.property('timestamp');
                });

                done();
            });
        });

    });

    describe('GET /api/message/all/:groupid?starttime=xxx ', function() {

        it('returns 4 messages', function(done) {
            supertest.get('/api/message/all/777?starttime=2013-11-25')
            .set('X-Tidepool-Session-Token', sessionToken)
            .expect(200)
            .expect('Content-Type','application/json')
            .end(function(err, res) {
                if (err) return done(err);
                res.body.should.have.property('messages').and.be.instanceof(Array);
                res.body.messages.length.should.equal(4);

                res.body.messages.forEach(function(message){
                    message.should.have.property('id');
                    message.should.have.property('userid');
                    message.should.have.property('groupid');
                    message.should.have.property('messagetext');
                    message.should.have.property('timestamp');
                });

                done();
            });
        });

        it('returns 204 when no messages', function(done) {
            supertest.get('/api/message/all/99977777?starttime=2013-11-25')
            .set('X-Tidepool-Session-Token', sessionToken)
            .expect(204,done);
        });

    });

    describe('POST /api/message/send/:groupid', function() {
        
        it('should not work without groupid parameter', function(done) {

            supertest.post('/api/message/send')
            .set('X-Tidepool-Session-Token', sessionToken)
            .send({message:'here it is'})
            .expect(404)
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });
            
        });

        it('returns 201', function(done) {

            var testMessage = require('../helpers/testMessagesData').individual;

            supertest.post('/api/message/send/12345')
            .set('X-Tidepool-Session-Token', sessionToken)
            .send({message:testMessage})
            .expect(201)
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });

        });

        it('return Id when message added', function(done) {

            var testMessage = require('../helpers/testMessagesData').individual;

            supertest.post('/api/message/send/12345')
            .set('X-Tidepool-Session-Token', sessionToken)
            .expect(201)
            .send({message:testMessage})
            .end(function(err, res) {
                if (err) return done(err);
                res.body.should.have.property('id');
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

            supertest.post('/api/message/send/12345')
            .set('X-Tidepool-Session-Token', sessionToken)
            .expect(400)
            .send({message:invalidMessage})
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });
        });
    });
   
});