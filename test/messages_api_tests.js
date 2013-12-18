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