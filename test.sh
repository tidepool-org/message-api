#! /bin/bash -eu


(. start.sh &)
(exec mongod mongo &)
(mocha test &)


