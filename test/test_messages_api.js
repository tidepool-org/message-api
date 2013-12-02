'use strict';

var should = require('chai').should(),
    supertest = require('supertest'),
    config = require('../env'),
    mongojs = require('mongojs'),
    testDbInstance,
    api, 
    testMessages, 
    messageIds;   

/*
Dummy messages that we load for tests
*/    
testMessages = [{
        UserId: "12121212",
        GroupId: "999",
        TimeStamp: "2013-11-28T23:07:40+00:00",
        MessageText: "In three words I can sum up everything I've learned about life: it goes on."
    },
    {
        UserId: "232323",
        GroupId: "777",
        TimeStamp: "2013-11-29T23:05:40+00:00",
        MessageText: "Second message."
    },
    {
        UserId: "232323",
        GroupId: "777",
        TimeStamp: "2013-11-30T23:05:40+00:00",
        MessageText: "Third message."
    },
    {
        UserId: "232323",
        GroupId: "777",
        TimeStamp: "2013-11-25T23:05:40+00:00",
        MessageText: "First message."
    }];

describe('message API', function() {

    before(function(){
        /*
        Setup api and also load data for tests
        */
        api = supertest('http://localhost:'+config.port);

        testDbInstance = mongojs('mongodb://localhost/message-api', ['messages']);
    
        testDbInstance.messages.remove();

        testMessages.forEach(function(message) {
            testDbInstance.messages.save(message);
        });

    });

    describe('get /api/message/:msgId', function() {

        var testMessageId;

        beforeEach(function(done){
            
            //Get id of existing message for tests 
            testDbInstance.messages.findOne({},function(err, doc) {
                testMessageId = doc._id;
                done();                
            });
        });

        it('should not work without msgId parameter', function(done) {
            api.get('/api/message/read')
            .expect(404)
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });
        });

        it('returns message for given id as JSON', function(done) {

            api.get('/api/message/read/'+testMessageId)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
                if (err) return done(err);
                res.body.should.have.property('message').and.be.instanceof(Array);
                done();
            });
        });

        it('returns message with Id, UserId, GroupId, TimeStamp , MessageText', function(done) {

            var messageFields = ['Id', 'UserId','GroupId', 'TimeStamp', 'MessageText'];

            api.get('/api/message/read/'+testMessageId)
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
                if (err) return done(err);

                var message = res.body.message;
                var theMessage = message[0];

                theMessage.should.have.keys(messageFields);

                done();
            });
        });

        it('returns 204 if no message found for id', function(done) {

            api.get('/api/message/read/529bbc61094d17a104066001')
            .expect(204)
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });
        });

        it('returns 417 if a bad id is given', function(done) {

            api.get('/api/message/read/badIdGiven')
            .expect(417)
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });
        });

    });

    describe('get /api/message/all/:patientid/:starttime/:endtime', function() {

        it('should not work without patientid parameter', function(done) {
            api.get('/api/message/all')
            .expect(404)
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });
        });

        it('returns 204 when there are no messages for given id', function(done) {
            api.get('/api/message/all/12342/2013-11-25/2013-11-30')
            .expect(204)
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });
        });

        it('returns messages for given id 777 between the given dates', function(done) {

            api.get('/api/message/all/777/2013-11-25/2013-11-30')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
                if (err) return done(err);
                res.body.should.have.property('messages').and.be.instanceof(Array);
                done();
            });
        });

    });

    describe('get /api/message/all/:patientid/:starttime also works without endtime', function() {

        it('returns messages for group and from given date', function(done) {
            api.get('/api/message/all/777/2013-11-25')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
                if (err) return done(err);
                res.body.should.have.property('messages').and.be.instanceof(Array);
                done();
            });
        });

    });

    describe('put /api/message/send/:groupId', function() {


        
        it('should not work without groupId parameter', function(done) {

            api.put('/api/message/send')
            .send({message:'here it is'})
            .expect(404)
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });
            
        });

        it('returns 201', function(done) {

            var testMessage = {
                UserId: "12345",
                GroupId: "777",
                TimeStamp: "2013-11-29T23:05:40+00:00",
                MessageText: "Test put message 1."
            };

            api.put('/api/message/send/12345')
            .send({message:testMessage})
            .expect(201)
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });

        });

        it('return Id when message added', function(done) {

            var testMessage = {
                UserId: "12345",
                GroupId: "777",
                TimeStamp: "2013-12-04T23:05:40+00:00",
                MessageText: "Test put message 2."
            };

            api.put('/api/message/send/12345')
            .expect(201)
            .send({message:testMessage})
            .end(function(err, res) {
                if (err) return done(err);
                res.body.should.have.property('Id').and.not.be.empty;
                done();
            });
        });

        it('return 417 when messages to add does not meet the requirements', function(done) {

            var invalidMessage = {
                UserId: "12345",
                TimeStamp: "2013-12-04T23:05:40+00:00",
                MessageText: ""
            };

            api.put('/api/message/send/12345')
            .expect(417)
            .send({message:invalidMessage})
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });
        });
    });
});