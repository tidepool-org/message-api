'use strict';

var should = require('chai').should(),
    supertest = require('supertest'),
    config = require('../env'),
    api, 
    testMessage;    

    
testMessage = {
        UserId: "12121212",
        GroupId: "999",
        TimeStamp: "2013-11-28T23:07:40+00:00",
        MessageText: "In three words I can sum up everything I've learned about life: it goes on."
    };    

describe('message API', function() {

    before(function(){
        api = supertest('http://localhost:'+config.port);
    });

    describe('get /api/message/:msgId', function() {

        it('should not work without msgId parameter', function(done) {
            api.get('/api/message/read')
            .expect(404)
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });
        });

        it('returns message for given id as JSON', function(done) {
            api.get('/api/message/read/121')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
                if (err) return done(err);
                res.body.should.have.property('message').and.be.instanceof(Array);
                done();
            });
        });

        it('returns message in the described format', function(done) {

            var messageFields = ['Id', 'UserId','GroupId', 'TimeStamp', 'MessageText'];

            api.get('/api/message/read/121')
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

        it('returns messages for given id as JSON', function(done) {
            api.get('/api/message/all/12342/8766663922/8766665000')
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

        it('returns messages for given id as JSON', function(done) {
            api.get('/api/message/all/12342/8766663922')
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

            api.put('/api/message/send/12345')
            .send({message:testMessage})
            .expect(201)
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });

        });

        it('given message', function(done) {

            api.put('/api/message/send/12345')
            .expect(201)
            .send({message:testMessage}).end(function(err, res) {
                if (err) return done(err);
                console.log('id in test',res.body.id)
                res.body.should.have.property('id').and.not.be.empty;
                done();
            });
        });
    });
});