const test = require('tape');
const strip = require('strip-ansi');
const flamongo = require('./lib/tester');

const schema = {
    name: {
      first: 'first',
      last: 'last',
    },
    vegan: 'bool',
    happy: {
      _type: 'bool',
      args: { likelihood: 10 },
    },
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

test('check performance of provided indexes', function (t) {
  t.plan(1);

  const indexKeys = [
    { 'name.last': 1 },
    { 'name.last': 1, vegan: 1 },
    { 'name.first': 1, vegan: 1 },
  ];

  const queries = [
    { 'name.first': 'Richard' },
    { 'name.first': 'John', vegan: false, 'name.last': { $nin: ['Smith'] } }
  ];

  flamongo(indexKeys, queries, schema, { verbose: false, preserveData: false }, console.log)
    .then((queryResults) => {
      const indexUseRegex = /.*Examined [\d]+ keys on index name.first_1_vegan_1 in a forward direction.*/;
      t.ok(indexUseRegex.test(strip(queryResults[1].output)));
      t.end();
    });
});

test('check performance of all possible indexes', function (t) {
  t.plan(2);

  const queries = [
    { 'name.first': 'Richard' },
    { 'name.first': 'Richard', vegan: false, birthday: { $gt: new Date() } },
    { 'name.first': 'Richard', $or: [{ vegan: false }, { happy: true }] },
  ];

  flamongo([], queries, schema, { bestIndex: true, preserveData: true }, console.log)
    .then((indexResults) => {
      t.ok(indexResults[0][0].metadata.name);
      t.ok(indexResults[0][0].time || indexResults[0][0].time === 0);
      t.end();
    })
});
