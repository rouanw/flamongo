const mongo = require('mongodb').MongoClient;
const _ = require('lodash');
const Promise = require('bluebird');
const exampleRecord = require('./data-generator');
const tryProvidedIndexes = require('./try-provided-indexes');
const tryAllPossibleIndexes = require('./try-all-possible-indexes');

const noop = () => {};
const NS_NOT_FOUND = 26;

const main = (command) => (input, overrides, log = noop) => {
  const { indexKeys, queries, schema } = input;

  const options = Object.assign({
    url: 'mongodb://localhost:27017',
    databaseName: 'test_indexes_db',
    collectionName: 'test_indexes_collection',
    explainMode: 'executionStats',
    numberOfRecords: 90000,
    verbose: false,
    preserveData: false,
    warmQuery: false,
    maxBestIndexResults: 10,
  }, overrides);

  const url = `${options.url}/${options.databaseName}`;

  const continueIfDbDoesntExist = (err) => {
    if (err.code !== NS_NOT_FOUND) {
      throw err;
    }
  };

  const stubData = (collection) => {
    return collection.remove({})
      .then(() => {
        const documents = _.times(options.numberOfRecords, () => exampleRecord(schema));
        log(`Inserting ${options.numberOfRecords} random documents`);
        return collection.insertMany(documents);
      });
  };

  return mongo.connect(url)
    .then((db) => {
      log('Connection open');
      const testCollection = db.collection(options.collectionName);
      const createStubData = options.preserveData ? Promise.resolve() : stubData(testCollection);

      return createStubData
        .then(() => testCollection.dropIndexes())
        .catch(continueIfDbDoesntExist)
        .then(() => command(testCollection, input, options, log))
        .then((results) => {
          return db.close().then(() => results);
        })
        .catch((error) => {
          return db.close().then(() => { throw error });
        });
    });
};

module.exports = {
  explain(input, overrides, log) {
    return main(tryProvidedIndexes)(input, overrides, log);
  },
  best(input, overrides, log) {
    return main(tryAllPossibleIndexes)(input, overrides, log);
  },
};
