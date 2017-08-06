#! /usr/bin/env node
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));
const _ = require('lodash');
const flamongo = require('../lib');

/* eslint-disable import/no-dynamic-require, no-console */
const getCommand = (c) => {
  if (flamongo[c]) {
    return flamongo[c];
  }
  console.error(`${c} is not a valid flamongo command`);
  return process.exit(1);
};

const command = getCommand(argv._[0]);
const input = argv._[1];
const opts = _.omit(argv, '_');

const { indexKeys, queries, schema } = require(path.join(process.cwd(), input));
command({ indexKeys, queries, schema }, opts, console.log)
  .catch(console.error);
/* eslint-enable import/no-dynamic-require, no-console */
