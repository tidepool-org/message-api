'use strict';

var should = require('chai').should(),
    supertest = require('supertest'),
    config = require('../env'),
    api;

describe('message API', function() {

    
    describe('get /api/message/:msgId', function() {

        before(function(){
            api = supertest('http://localhost:'+config.port);
        });

        it('should not work without msgId parameter', function(done) {
            api.get('/api/message')
            .expect(404)
            .end(function(err, res) {
                if (err) return done(err);
                done();
            });
        });

        it('returns message for given id as JSON', function(done) {
            api.get('/api/message/121')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
                if (err) return done(err);
                res.body.should.have.property('message').and.be.instanceof(Array);
                done();
            });
        });

    });

    describe('put /api/message/send/:groupId', function() {

        before(function(){
            api = supertest('http://localhost:'+config.port);
        });

        it('should not work without groupId parameter', function(done) {

            api.put('/api/message/send')
            .send({message:'here it is'})
            .expect(405)
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