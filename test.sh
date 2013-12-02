#! /bin/bash -eu

exec mongod &
wait
mongo &
wait
. start.sh &
wait
mocha test &


