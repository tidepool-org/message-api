'use strict';

var should = require('chai').should(),
    supertest = require('supertest'),
    config = require('../env'),
    api;

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

    describe('get /api/message/all/:patientid/:starttime', function() {


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
            .send({message:'here it is'})
            .expect(201)
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });

        });

    });
});