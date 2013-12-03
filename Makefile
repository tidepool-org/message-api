OPTS=-R tap

build:
	@$(shell npm install .)

test-setup:
	@$(shell mongod &)
	@$(shell mongo)

test:	build test-setup start
	mocha test

start:
	@$(source config/env.sh)
	@$(shell node lib/index.js & )

.PHONY: test

