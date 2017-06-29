const mongo = require('mongodb').MongoClient;
const _ = require('lodash');
const Promise = require('bluebird');
const parseResult = require('./parser');
const print = require('./printer');
const exampleRecord = require('./data-generator');

module.exports = (indexKeys, queries, schema, overrides) => {
  const options = Object.assign({
    url: 'mongodb://localhost:27017',
    databaseName: 'test_indexes_db',
    collectionName: 'test_indexes_collection',
    explainMode: 'executionStats',
    numberOfRecords: 90000,
    verbose: false,
  }, overrides);

  const url = `${options.url}/${options.databaseName}`;

  const indexes = indexKeys.map((key) => ({ key }));

  const queryCollection = (collection) => (query) =>
    collection.find(query).explain({ verbose: options.explainMode })
      .then(parseResult)
      .then(({ result, parsedResult }) => {
        console.log(print(query, parsedResult));

        if (options.verbose) {
          console.log('Full explain result:');
          console.log(JSON.stringify(result, null, 2));
        }
      });

  const stubData = (collection) => () => {
    collection.remove({});
    const documents = _.times(options.numberOfRecords, () => exampleRecord(schema));
    return collection.insertMany(documents);
  };

  mongo.connect(url)
    .then((db) => {
      console.log('Connection open');
      const testCollection = db.collection(options.collectionName);
      return testCollection.createIndexes(indexes)
        .then(options.stubData ? stubData(testCollection) : Promise.resolve)
        .then(() => Promise.map(queries, queryCollection(testCollection)))
        .then(() => {
          return db.close();
        });
    })
    .catch(console.error);
};
