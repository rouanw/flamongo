#! /usr/bin/env node
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));
const _ = require('lodash');
const flamongo = require('../lib');

const getCommand = (argv) => {
  const c = argv._[0];
  if (flamongo[c]) {
    return flamongo[c];
  }
  console.error(`${c} is not a valid flamongo command`);
  process.exit(1);
};

const command = getCommand(argv);
const input = argv._[1];
const opts = _.omit(argv, '_');

const { indexKeys, queries, schema } = require(path.join(process.cwd(), input));
command({ indexKeys, queries, schema }, opts, console.log)
  .catch(console.error);
