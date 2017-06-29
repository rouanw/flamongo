const tester = require('./lib/tester');

const indexKeys = [{ 'name.first': 1 }, { birthday: 1 }];
const queries = [{ 'name.first': /^J/, birthday: { $lte: Date() }, vegan: false, 'name.last': { $nin: ['Smith'] } }];
const schema = {
  name: {
    first: 'first',
    last: 'last',
  },
  vegan: 'bool',
  birthday: 'date',
  friends: [{
    name: 'name',
  }],
};
tester(indexKeys, queries, schema, { verbose: true, stubData: true, numberOfRecords: 10 });
