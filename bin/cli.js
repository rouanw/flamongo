#! /usr/bin/env node
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));
const _ = require('lodash');
const flamongo = require('../lib');

const opts = _.omit(argv, '_');
const { indexKeys, queries, schema } = require(path.join(process.cwd(), argv._[0]));
flamongo({ indexKeys, queries, schema }, opts, console.log)
  .catch(console.error);
