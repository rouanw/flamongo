const mongo = require('mongodb').MongoClient;
const chance = new require('chance')();
const _ = require('lodash');

const url = 'mongodb://localhost:27017/test_indexes';

const exampleRecord = () => ({
  name: chance.name(),
});

const query = { name: /^Br/ };

mongo.connect(url)
  .then((db) => {
    console.log('Connection open');
    const testCollection = db.collection('test_collection');
    testCollection.remove({});
    _.times(10000, () => { testCollection.insert(exampleRecord()); });
    testCollection.createIndex({ name: 1 });
    testCollection.find(query).explain({ verbose: 'executionStats' })
      .then((results) => {
        console.log('results', results);
      });
    db.close();
  })
  .catch(console.error);
