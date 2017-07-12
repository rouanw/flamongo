const tester = require('./lib/tester');

const indexKeys = [{ 'name.first': 1 }, { birthday: 1 }];
const queries = [{'name.first': 'Richard'}, { 'name.first': 'John', vegan: false, 'name.last': { $nin: ['Smith'] } }];
const schema = {
  name: {
    first: 'first',
    last: 'last',
  },
  vegan: 'bool',
  birthday: 'date',
  jobTitle: {
    _type: 'enum',
    _missing: 30,
    options: ['software developer', 'football player'],
  },
  friends: [{
    name: {
      first: 'first',
      last: 'last',
    },
  }],
};
tester(indexKeys, queries, schema, { verbose: false, stubData: true });
