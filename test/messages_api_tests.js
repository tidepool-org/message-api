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
    testHandlerConfig,
    fakeCrud,
    testingHelper = require('./helpers/testingHelper')({integrationTest:false}),
    testMessage = require('./helpers/testMessagesData').individual,
    supertest = require('supertest')(testingHelper.serviceEndpoint()),
    sessionToken = testingHelper.sessionToken;


describe('message API', function() {

    /*
        GOAL: To test that under normal operation that we get the return codes
        and any data (where applicable) that we would expect.
    */
    describe('when the request has been fulfilled', function() {

        before(function(){
            
            //setting how the fake mongo handler will behave
            testHandlerConfig  = {
                throwErrors : false,
                returnNone : false
            };

            fakeCrud = require('./helpers/fakeMongoHandler')(testHandlerConfig);
            testingHelper.initAndStartService(fakeCrud);
        });

        after(function(){
            testingHelper.stopService();
        });

        

        it('GET /doesnotexist should return 404', function(done) {
            supertest
            .get('/api/message/doesnotexist')
            .set('X-Tidepool-Session-Token', sessionToken)
            .expect(404,done);
        });

        it('GET read/:msgid returns 401 when session token not used', function(done) {
            supertest
            .get('/api/message/read/123456743')
            .expect(401,done);
        });

        it('GET read/:msgid returns 200', function(done) {
            supertest
            .get('/api/message/read/123456743')
            .set('X-Tidepool-Session-Token', sessionToken)
            .expect(200,done);
        });

        it('GET all/:groupid with no sessionToken returns 401', function(done) {
            supertest
            .get('/api/message/all/88883288?starttime=2013-11-25')
            .expect(401,done);
        });

        it('GET all/:groupid with a starttime returns 200', function(done) {
            supertest
            .get('/api/message/all/88883288?starttime=2013-11-25')
            .set('X-Tidepool-Session-Token', sessionToken)
            .expect(200,done);
        });

        it('GET all/:groupid with a starttime and end time returns 200', function(done) {
            supertest
            .get('/api/message/all/88883288?starttime=2013-11-25&endtime=2013-12-25')
            .set('X-Tidepool-Session-Token', sessionToken)
            .expect(200,done);
        });

        it('POST send/:groupid returns 201', function(done) {

            supertest
            .post('/api/message/send/88883288')
            .set('X-Tidepool-Session-Token', sessionToken)
            .send({message:testMessage})
            .expect(201,done);
        });

        it('GET /status with no token returns 401 ', function(done) {
            supertest
            .get('/api/message/status')
            .expect(401,done);
        });

        it('GET /status', function(done) {
            supertest
            .get('/api/message/status')
            .set('X-Tidepool-Session-Token', sessionToken)
            .expect(200,done);
        });

        it('GET /status?status=201 returns 201 ', function(done) {

            supertest
            .get('/api/message/status?status=201')
            .set('X-Tidepool-Session-Token', sessionToken)
            .expect(201,done);
        });

        it('GET /status?randomParam=401 returns 200 as randomParam is ignored', function(done) {

            supertest
            .get('/api/message/status?randomParam=401')
            .set('X-Tidepool-Session-Token', sessionToken)
            .expect(200,done);
        });

    });

    /*
        GOAL: To test we get the correct return code when no data match's what we requested.
    */
    describe('when no match for Request-URI', function() {
        before(function(){
           

            // just a  way of setting the path that the fake 
            testHandlerConfig  = {
                throwErrors : false,
                returnNone : true
            };

            fakeCrud = require('./helpers/fakeMongoHandler')(testHandlerConfig);
            testingHelper.initAndStartService(fakeCrud);

        });

        after(function(){
           testingHelper.stopService();
        });

        it('GET read/:msgid returns 404', function(done) {
            supertest
            .get('/api/message/read/123456743')
            .set('X-Tidepool-Session-Token', sessionToken)
            .expect(404,done);
        });

        it('GET all/:groupid with a starttime returns 404', function(done) {
            supertest
            .get('/api/message/all/88883288?starttime=2013-11-25')
            .set('X-Tidepool-Session-Token', sessionToken)
            .expect(404,done);
        });

        it('GET all/:groupid with a starttime and end time returns 404', function(done) {
            supertest
            .get('/api/message/all/88883288?starttime=2013-11-25&endtime=2013-12-25')
            .set('X-Tidepool-Session-Token', sessionToken)
            .expect(404,done);
        });
       
    });

    /*
        GOAL: To test that when excepetions occur when are give the correct return code and 
        that no implementation details are leaked. 
    */
    describe('when an error occurs', function() {
        before(function(){
            
            // just a  way of setting the path that the fake 
            testHandlerConfig  = {
                throwErrors : true,
                returnNone : false
            };

            fakeCrud = require('./helpers/fakeMongoHandler')(testHandlerConfig);
            testingHelper.initAndStartService(fakeCrud);

        });

        after(function(){
            testingHelper.stopService();
        });

        it('GET read/:msgid returns 500', function(done) {
            supertest
            .get('/api/message/read/123456743')
            .set('X-Tidepool-Session-Token', sessionToken)
            .expect(500,done);
        });

        it('GET all/:groupid with a starttime returns 500', function(done) {
            supertest
            .get('/api/message/all/88883288?starttime=2013-11-25')
            .set('X-Tidepool-Session-Token', sessionToken)
            .expect(500,done);
        });

        it('GET all/:groupid with a starttime and end time returns 500', function(done) {
            supertest
            .get('/api/message/all/88883288?starttime=2013-11-25&endtime=2013-12-25')
            .set('X-Tidepool-Session-Token', sessionToken)
            .expect(500,done);
        });

        it('POST send/:groupid returns 500', function(done) {

            var message = {
                userid: '12121212',
                groupid: '999',
                timestamp: '2013-11-28T23:07:40+00:00',
                messagetext: 'In three words I can sum up everything I have learned about life: it goes on.'
            };

            supertest
            .post('/api/message/send/88883288')
            .set('X-Tidepool-Session-Token', sessionToken)
            .send({message:message})
            .expect(500,done);
        });

        it('GET status', function(done) {
            supertest
            .get('/api/message/status')
            .set('X-Tidepool-Session-Token', sessionToken)
            .expect(500,done);
        });
        
    });

   
});