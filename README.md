message-api
===========

Repository for the message API

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
$ mongod
```

Start the server for the API with:

```bash
$ npm start
```

## Config

By default, the message-api runs on port **3000**. You can change this by setting the `PORT` environment variable.

Configuration is handled by `env.js` and loads environment variables. Check the file for defaults and documentation.

You can set environment variables manually, or use a bash script. For example:

```bash
source config/dev.sh
```

Ask the project owners to provide you with config scripts for different environments, or you can create one of your own. It is recommended to put them in the `config/` directory, where they will be ignored by Git.
