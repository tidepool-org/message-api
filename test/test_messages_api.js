'use strict';

var should = require('chai').should(),
    supertest = require('supertest'),
    config = require('../env'),
    api;

describe('message API', function() {

    before(function(){
        api = supertest('http://localhost:'+config.port);
    });

    describe('/api/v1/message/:msgId', function() {

        it('should not work without msgId parameter', function(done) {
            api.get('/api/v1/message')
            
            .end(function(err, res) {
                if (err) return done(err);
                res.body.should.have.property('code').and.be.equal('ResourceNotFound');
                done();
            });
        });

        it('returns message for given id as JSON', function(done) {
            api.get('/api/v1/message/121')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(function(err, res) {
                if (err) return done(err);
                res.body.should.have.property('message').and.be.instanceof(Array);
                done();
            });
        });

    });

    describe('/api/v1/message/send/:groupId', function() {

        it('should not work without msgId parameter', function(done) {
            api.get('/api/v1/message/send/')
            
            .end(function(err, res) {
                if (err) return done(err);
                res.body.should.have.property('code').and.be.equal('ResourceNotFound');
                done();
            });
        });

    });
});