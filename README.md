message-api
===========

Repository for the message API

The documentation for the API lives here: [http://docs.tidepoolmessages.apiary.io/](http://docs.tidepoolmessages.apiary.io/)


## Install

Requirements:

- [Node.js](http://nodejs.org/)
- [MongoDB](http://www.mongodb.org/)

Clone this repo then install dependencies:

```bash
$ npm install
```

## Quick start

Assuming you have a set of config values (see **"Config"** below), load them with:

```bash
source config/local.sh
```

If running locally, you will need to start a local instance of MongoDB:

```bash
grunt start-mongo
```

Start the server for the API with:

```bash
grunt start-api
```


## Running Integration Tests

To run the integration tests in three seperate terminal windows do the following

```bash
grunt start-mongo
```

```bash
grunt start-api
```

```bash
grunt test
```

## Config

By default, the message-api runs on port **3002**. You can change this by setting the `PORT` environment variable.

Configuration is handled by `env.js` and loads environment variables. Check the file for defaults and documentatio.

You can set environment variables manually, or use a bash script. For example:

```bash
source config/dev.sh
```

Ask the project owners to provide you with config scripts for different environments, or you can create one of your own. It is recommended to put them in the `config/` directory, where they will be ignored by Git.
