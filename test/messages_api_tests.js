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
    messagesService,
    testConfig,
    fakeCrud,
    apiEndPoint,
    testMessage = require('./helpers/testMessagesData').individual;


describe('message API', function() {

    /*
        GOAL: To test that under normal operation that we get the return codes
        and any data (where applicable) that we would expect.
    */
    describe('test results when all is OK', function() {

        before(function(){
            /*
            Setup api and also load data for tests
            */

            config = require('../env');

            // just a  way of setting the path that the fake 
            testConfig  = {
                throwErrors : false,
                returnNone : false
            };

            fakeCrud = require('./helpers/fakeMongoHandler')(testConfig);

            apiEndPoint = 'http://localhost:'+config.port;

            messagesService = require('../lib/messagesService')(fakeCrud,config.port);
            messagesService.start();

        });

        after(function(){
            messagesService.stop();
        });

        it('GET /api/message/doesnotexist should return 404', function(done) {
            supertest(apiEndPoint)
            .get('/api/message/doesnotexist')
            .expect(404,done);
        });

        it('GET /api/message/read/:msgid returns 200', function(done) {
            supertest(apiEndPoint)
            .get('/api/message/read/123456743')
            .expect(200,done);
        });

        it('GET /api/message/all/:groupid with a starttime returns 200', function(done) {
            supertest(apiEndPoint)
            .get('/api/message/all/88883288?starttime=2013-11-25')
            .expect(200,done);
        });

        it('GET /api/message/all/:groupid with a starttime and end time returns 200', function(done) {
            supertest(apiEndPoint)
            .get('/api/message/all/88883288?starttime=2013-11-25&endtime=2013-12-25')
            .expect(200,done);
        });

        it('POST /api/message/send/:groupid returns 201', function(done) {

            supertest(apiEndPoint)
            .post('/api/message/send/88883288')
            .send({message:testMessage})
            .expect(201,done);
        });

        it('GET /api/message/status', function(done) {
            supertest(apiEndPoint)
            .get('/api/message/status')
            .expect(200,done);
        });

        it('GET /status returns 401 when status is passed as 401', function(done) {

            supertest(apiEndPoint)
            .get('/api/message/status?status=401')
            .expect(401,done);
        });

    });

    /*
        GOAL: To test we get the correct return code when no data match's what we requested.
    */
    describe('test results when data is not found', function() {
        before(function(){
            /*
            Setup api and also load data for tests
            */

            config = require('../env');

            // just a  way of setting the path that the fake 
            testConfig  = {
                throwErrors : false,
                returnNone : true
            };

            fakeCrud = require('./helpers/fakeMongoHandler')(testConfig);

            apiEndPoint = 'http://localhost:'+config.port;

            messagesService = require('../lib/messagesService')(fakeCrud,config.port);
            messagesService.start();

        });

        after(function(){
            messagesService.stop();
        });

        it('GET /api/message/read/:msgid returns 204', function(done) {
            supertest(apiEndPoint)
            .get('/api/message/read/123456743')
            .expect(204,done);
        });

        it('GET /api/message/all/:groupid with a starttime returns 204', function(done) {
            supertest(apiEndPoint)
            .get('/api/message/all/88883288?starttime=2013-11-25')
            .expect(204,done);
        });

        it('GET /api/message/all/:groupid with a starttime and end time returns 204', function(done) {
            supertest(apiEndPoint)
            .get('/api/message/all/88883288?starttime=2013-11-25&endtime=2013-12-25')
            .expect(204,done);
        });
       
    });

    /*
        GOAL: To test that when excepetions occur when are give the correct return code and 
        that no implementation details are leaked. 
    */
    describe('test results when errors occur', function() {
        before(function(){
            /*
            Setup api and also load data for tests
            */

            config = require('../env');

            // just a  way of setting the path that the fake 
            testConfig  = {
                throwErrors : true,
                returnNone : false
            };

            fakeCrud = require('./helpers/fakeMongoHandler')(testConfig);

            apiEndPoint = 'http://localhost:'+config.port;

            messagesService = require('../lib/messagesService')(fakeCrud,config.port);
            messagesService.start();

        });

        after(function(){
            messagesService.stop();
        });

        it('GET /api/message/read/:msgid returns 500', function(done) {
            supertest(apiEndPoint)
            .get('/api/message/read/123456743')
            .expect(500,done);
        });

        it('GET /api/message/all/:groupid with a starttime returns 500', function(done) {
            supertest(apiEndPoint)
            .get('/api/message/all/88883288?starttime=2013-11-25')
            .expect(500,done);
        });

        it('GET /api/message/all/:groupid with a starttime and end time returns 500', function(done) {
            supertest(apiEndPoint)
            .get('/api/message/all/88883288?starttime=2013-11-25&endtime=2013-12-25')
            .expect(500,done);
        });

        it('POST /api/message/send/:groupid returns 500', function(done) {

            var message = {
                userid: '12121212',
                groupid: '999',
                timestamp: '2013-11-28T23:07:40+00:00',
                messagetext: 'In three words I can sum up everything I have learned about life: it goes on.'
            };

            supertest(apiEndPoint)
            .post('/api/message/send/88883288')
            .send({message:message})
            .expect(500,done);
        });

        it('GET /api/message/status', function(done) {
            supertest(apiEndPoint)
            .get('/api/message/status')
            .expect(500,done);
        });
        
    });

   
});