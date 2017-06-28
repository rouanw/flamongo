const tester = require('./lib/tester');

const indexKeys = [{ name: 1 }, { birthday: 1 }];
const queries = [{ name: /^J/, birthday: { $lte: Date() }, vegan: false, surname: { $nin: ['Smith'] } }];
const schema = {
  name: 'name',
  vegan: 'bool',
  birthday: 'date',
  surname: 'last',
};
tester(indexKeys, queries, schema, { verbose: true, stubData: true });
