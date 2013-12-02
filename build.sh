#! /bin/bash -eu

npm install . &
wait
. test.sh &