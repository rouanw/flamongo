const mongo = require('mongodb').MongoClient;
const chance = new require('chance')();
const _ = require('lodash');
const Promise = require('bluebird');
const parseResult = require('./parser');

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

  const exampleRecord = () => _.reduce(schema, (record, type, fieldName) => {
    if (chance[type]) {
      return Object.assign({}, record, { [fieldName]: chance[type]() });
    }
    console.log(`No Chance.js generator found for field ${fieldName} of type ${type}. Using string instead`);
    return Object.assign({}, record, { [fieldName]: chance.string() });
  }, {});

  const indexes = indexKeys.map((key) => ({ key }));

  const queryCollection = (collection) => (query) =>
    collection.find(query).explain({ verbose: options.explainMode })
      .then(parseResult)
      .then(({ result, parsedResult }) => {
        console.log(`Results for query: ${JSON.stringify(query)}`);
        console.log(JSON.stringify(parsedResult, null, 2));

        if (options.verbose) {
          console.log('Full explain result:');
          console.log(JSON.stringify(result, null, 2));
        }
      });

  mongo.connect(url)
    .then((db) => {
      console.log('Connection open');
      const testCollection = db.collection(options.collectionName);
      testCollection.remove({});
      const documents = _.times(options.numberOfRecords, exampleRecord);
      return testCollection.createIndexes(indexes)
        .then(() => testCollection.insertMany(documents))
        .then(() => Promise.map(queries, queryCollection(testCollection)))
        .then(() => {
          return db.close();
        });
    })
    .catch(console.error);
};
