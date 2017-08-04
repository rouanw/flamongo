const mongo = require('mongodb').MongoClient;
const _ = require('lodash');
const Promise = require('bluebird');
const parseResult = require('./parser');
const print = require('./printer');
const exampleRecord = require('./data-generator');

const NS_NOT_FOUND = 26;

module.exports = (indexKeys, queries, schema, overrides) => {
  const options = Object.assign({
    url: 'mongodb://localhost:27017',
    databaseName: 'test_indexes_db',
    collectionName: 'test_indexes_collection',
    explainMode: 'executionStats',
    numberOfRecords: 90000,
    verbose: false,
    preserveData: false,
    warmQuery: false,
  }, overrides);

  const url = `${options.url}/${options.databaseName}`;

  const indexes = indexKeys.map((key) => ({ key }));

  const queryCollection = (collection) => (query) =>
      (options.warmQuery ? collection.find(query).hasNext() : Promise.resolve())
      .then(() => collection.find(query).explain(options.explainMode))
      .then(parseResult)
      .then(({ result, parsedResult }) => {
        const output = print(query, parsedResult);
        console.log(output);

        if (options.verbose) {
          console.log('Full explain result:');
          console.log(JSON.stringify(result, null, 2));
        }

        return { result, parsedResult, output };
      });

  const continueIfDbDoesntExist = (err) => {
    if (err.code !== NS_NOT_FOUND) {
      throw err;
    }
  };

  const stubData = (collection) => () => {
    return collection.remove({})
      .then(() => {
        const documents = _.times(options.numberOfRecords, () => exampleRecord(schema));
        console.log(`Inserting ${options.numberOfRecords} random documents`);
        return collection.insertMany(documents);
      });
  };

  return mongo.connect(url)
    .then((db) => {
      console.log('Connection open');
      const testCollection = db.collection(options.collectionName);
      const stubPromiseChain = options.preserveData
        ? Promise.resolve()
        : testCollection.dropIndexes()
          .catch(continueIfDbDoesntExist)
          .then(() => indexes.length ? testCollection.createIndexes(indexes) : Promise.resolve({ numIndexesAfter: 0, numIndexesBefore: 0 }))
          .then(({ numIndexesAfter, numIndexesBefore }) => console.log(`Created ${numIndexesAfter - numIndexesBefore} indexes`))
          .then(stubData(testCollection));

      return stubPromiseChain
        .then(() => Promise.map(queries, queryCollection(testCollection)))
        .then((results) => {
          return db.close().then(() => results);
        })
        .catch((error) => {
          console.error(error);
          return db.close();
        });
    })
    .catch(console.error);
};
