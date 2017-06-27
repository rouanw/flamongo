const tester = require('./lib/tester');

const indexKeys = [{ name: 1 }];
const queries = [{ name: /^Jo/, birthday: { $lte: Date() } }];
const schema = {
  name: 'name',
  vegan: 'bool',
  birthday: 'date',
};
tester(indexKeys, queries, schema, {});
