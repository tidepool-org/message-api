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
    testMessages;


describe('message API', function() {

    before(function(){
        /*
        Setup api and also load data for tests
        */

        config = require('../env');
        // just a  way of seeting the path that the fake 
        testConfig  = {
            throwErrors : false,
            returnNone : false
        };

        fakeCrud = require('./handler/fakeMongoHandler')(testConfig);

        apiEndPoint = 'http://localhost:'+config.port;

        messagesService = require('../lib/messagesService')(fakeCrud,config.port);
        messagesService.start();

    });

    after(function(){
        messagesService.stop();
    });

    describe('test when working as expected', function() {


        it('get /api/message/read/123456743 returns 200', function(done) {
            supertest(apiEndPoint)
            .get('/api/message/read/123456743')
            .expect(200,done);
        });

        
    });

    describe('test when data not returned', function() {

       
    });

    describe('test when errors occur', function() {

        
    });

   
});