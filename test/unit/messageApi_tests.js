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
    testMessage = require('../helpers/testMessagesData').individual,
    supertest = require('supertest'),
    restify = require('restify');


describe('message API', function() {

    /*
        minimise the components to just groups API and mocked crud handler
    */
    var setupAPI = function(crudHandler){
    
        var server = restify.createServer({name:'Message API Tests'});
        server.use(restify.queryParser());
        server.use(restify.bodyParser());

        var messageApi = require('../../lib/routes/messageApi')(crudHandler);

        server.get('/api/message/status',messageApi.status);

        server.get('/api/message/read/:msgid', messageApi.findById);
        server.get('/api/message/all/:groupid?starttime&endtime', messageApi.findAllById);
    
        //adding messages
        server.post('/api/message/send/:groupid', messageApi.add);

        return server;
    }

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
            .get('/api/message/doesnotexist')
            .expect(404,done);
        });

        it('GET read/:msgid returns 200', function(done) {
            supertest(messaging)
            .get('/api/message/read/123456743')
            .expect(200)
            .end(function(err, res) {
                if (err) return done(err);
                var message = res.body.message;
                message.should.have.property('id');
                message.should.have.property('userid');
                message.should.have.property('groupid');
                message.should.have.property('messagetext');
                message.should.have.property('timestamp');
                done();
            });
        });

        it('GET all/:groupid with a starttime returns 200', function(done) {
            supertest(messaging)
            .get('/api/message/all/88883288?starttime=2013-11-25')
            .expect(200)
            .end(function(err, res) {
                if (err) return done(err);
                var messages = res.body.messages;
                messages.should.be.instanceOf(Array);

                messages.forEach(function(message){
                    message.should.have.property('id');
                    message.should.have.property('userid');
                    message.should.have.property('groupid');
                    message.should.have.property('messagetext');
                    message.should.have.property('timestamp');
                });

                done();
            });
        });

        it('GET all/:groupid with a starttime and end time returns 200', function(done) {
            supertest(messaging)
            .get('/api/message/all/88883288?starttime=2013-11-25&endtime=2013-12-25')
            .expect(200)
            .end(function(err, res) {
                if (err) return done(err);
                var messages = res.body.messages;
                messages.should.be.instanceOf(Array);

                messages.forEach(function(message){
                    message.should.have.property('id');
                    message.should.have.property('userid');
                    message.should.have.property('groupid');
                    message.should.have.property('messagetext');
                    message.should.have.property('timestamp');
                });

                done();
            });
        });

        it('POST send/:groupid returns 201', function(done) {

            supertest(messaging)
            .post('/api/message/send/88883288')
            .send({message:testMessage})
            .expect(201)
            .end(function(err, res) {
                if (err) return done(err);
                res.body.should.have.property('id');
                done();
            });
        });

        it('GET /status', function(done) {
            supertest(messaging)
            .get('/api/message/status')
            .expect(200,done);
        });

        it('GET /status?status=201 returns 201 ', function(done) {

            supertest(messaging)
            .get('/api/message/status?status=201')
            .expect(201,done);
        });

        it('GET /status?randomParam=401 returns 200 as randomParam is ignored', function(done) {

            supertest(messaging)
            .get('/api/message/status?randomParam=401')
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
            .get('/api/message/read/123456743')
            
            .expect(204,done);
        });

        it('GET all/:groupid with a starttime returns 404', function(done) {
            supertest(messaging)
            .get('/api/message/all/88883288?starttime=2013-11-25')
            
            .expect(204,done);
        });

        it('GET all/:groupid with a starttime and end time returns 404', function(done) {
            supertest(messaging)
            .get('/api/message/all/88883288?starttime=2013-11-25&endtime=2013-12-25')
            
            .expect(204,done);
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
            .get('/api/message/read/123456743')
            
            .expect(500,done);
        });

        it('GET all/:groupid?starttime=xxx returns 500', function(done) {
            supertest(messaging)
            .get('/api/message/all/88883288?starttime=2013-11-25')
            .expect(500,done);
        });

        it('GET all/:groupid?starttime=xxx&endtime=yyy returns 500', function(done) {
            supertest(messaging)
            .get('/api/message/all/88883288?starttime=2013-11-25&endtime=2013-12-25')
            .expect(500,done);
        });

        it('POST send/:groupid returns 500', function(done) {

            var message = {
                userid: '12121212',
                groupid: '999',
                timestamp: '2013-11-28T23:07:40+00:00',
                messagetext: 'In three words I can sum up everything I have learned about life: it goes on.'
            };

            supertest(messaging)
            .post('/api/message/send/88883288')
            .send({message:message})
            .expect(500,done);
        });

        it('GET status returns 500', function(done) {
            supertest(messaging)
            .get('/api/message/status')
            .expect(500,done);
        });
        
    });

   
});