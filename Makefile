TESTS=test/*.js
OPTS=-R tap

all: build install

install:
	npm install

mongo-setup:
	mongod
	mongo

start-api:
	source config/local.sh
	node lib/index.js

test:
	mocha --timeout 5000 --reporter $(TESTS)

build:
	jshint test/*.js
	jshint lib/*.js

.PHONY: test

