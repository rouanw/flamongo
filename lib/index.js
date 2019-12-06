const MongoClient = require('mongodb').MongoClient;
const _ = require('lodash');
const Promise = require('bluebird');
const exampleRecord = require('./data-generator');
const tryProvidedIndexes = require('./try-provided-indexes');
const tryAllPossibleIndexes = require('./try-all-possible-indexes');

const noop = () => {};
const NS_NOT_FOUND = 26;

const main = command => (input, overrides, log = noop) => {
  const options = Object.assign({
    url: 'mongodb://localhost:27017',
    databaseName: 'test_indexes_db',
    collectionName: 'test_indexes_collection',
    explainMode: 'executionStats',
    numberOfRecords: 90000,
    verbose: false,
    preserveData: false,
    preserveIndexes: false,
    warmQuery: false,
    maxBestIndexResults: 10,
  }, overrides);


  const continueIfDbDoesntExist = (err) => {
    if (err.code !== NS_NOT_FOUND) {
      throw err;
    }
  };

  const stubData = collection =>
    collection.deleteMany({})
      .then(() => {
        const documents = _.times(options.numberOfRecords, () => exampleRecord(input.schema));
        log(`Inserting ${options.numberOfRecords} random documents`);
        return collection.insertMany(documents);
      });
  const client = new MongoClient(options.url);
  return client.connect()
    .then(() => {
      log('Connection open');
      const db = client.db(options.databaseName);
      const testCollection = db.collection(options.collectionName);
      const createStubData = options.preserveData ? Promise.resolve() : stubData(testCollection);

      return createStubData
        .then(() => (options.preserveIndexes ? Promise.resolve : testCollection.dropIndexes()))
        .catch(continueIfDbDoesntExist)
        .then(() => command(testCollection, input, options, log))
        .then(results => client.close().then(() => results))
        .catch(error => client.close().then(() => { throw error; }));
    });
};

module.exports = {
  explain(input, overrides, log) {
    return main(tryProvidedIndexes)(input, overrides, log);
  },
  bestIndex(input, overrides, log) {
    return main(tryAllPossibleIndexes)(input, overrides, log);
  },
};
