const mongo = require('mongodb').MongoClient;
const chance = new require('chance')();
const _ = require('lodash');

module.exports = (overrides) => {
  const options = Object.assign({
    url: 'mongodb://localhost:27017',
    databaseName: 'test_indexes_db',
    collectionName: 'test_index_collection',
    explainMode: 'executionStats',
    numberOfRecords: 90000,
  }, overrides);

  const url = `${options.url}/${options.databaseName}`;

  const exampleRecord = () => ({
    name: chance.name(),
  });

  const query = { name: /^Jo/ };

  mongo.connect(url)
    .then((db) => {
      console.log('Connection open');
      const testCollection = db.collection(options.collectionName);
      testCollection.remove({});
      const documents = _.times(options.numberOfRecords, exampleRecord);
      return testCollection.createIndex({ name: 1 })
        .then(() => testCollection.insertMany(documents))
        .then(() => testCollection.find(query).explain({ verbose: options.explainMode }))
        .then((results) => {
          console.log('results', results);
          return db.close();
        });
    })
    .catch(console.error);
};
