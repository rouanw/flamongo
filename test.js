const test = require('tape');
const strip = require('strip-ansi');
const flamongo = require('./lib/tester');

test('flamongo', function (t) {
  t.plan(1);

  const schema = {
    name: {
      first: 'first',
      last: 'last',
    },
    vegan: 'bool',
    birthday: 'date',
    jobTitle: {
      _type: 'enum',
      options: ['software developer', 'football player'],
    },
    friends: [{
      name: {
        first: 'first',
        last: 'last',
      },
    }],
  };

  const indexKeys = [{ 'name.first': 1 }, { birthday: 1 }];
  const queries = [{'name.first': 'Richard'}, { 'name.first': 'John', vegan: false, 'name.last': { $nin: ['Smith'] } }];

  flamongo(indexKeys, queries, schema, { verbose: false, preserveData: false })
    .then((queryResults) => {
      const indexUseRegex = /.*Examined [\d]+ keys on index name.first_1 in a forward direction.*/;
      t.ok(indexUseRegex.test(strip(queryResults[1].output)));
      t.end();
    });
});
