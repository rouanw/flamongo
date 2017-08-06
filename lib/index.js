const mongo = require('mongodb').MongoClient;
const _ = require('lodash');
const Promise = require('bluebird');
const indexMixer = require('index-mixer');
const parse = require('./parser');
const print = require('./printer');
const exampleRecord = require('./data-generator');

const noop = () => {};
const NS_NOT_FOUND = 26;

module.exports = ({ indexKeys, queries, schema }, overrides, log = noop) => {
  const options = Object.assign({
    url: 'mongodb://localhost:27017',
    databaseName: 'test_indexes_db',
    collectionName: 'test_indexes_collection',
    explainMode: 'executionStats',
    numberOfRecords: 90000,
    verbose: false,
    preserveData: false,
    warmQuery: false,
    bestIndex: false,
    maxBestIndexResults: 10,
  }, overrides);

  const url = `${options.url}/${options.databaseName}`;

  const queryCollection = (collection) => (query, metadata) =>
      (options.warmQuery ? collection.find(query).hasNext() : Promise.resolve())
      .then(() => collection.find(query).explain(options.explainMode))
      .then(parse.queryResult)
      .then(({ result, parsedResult }) => {
        const output = print.queryExecutionOutput(query, parsedResult);
        return { result, parsedResult, output, metadata };
      });

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

  const tryProvidedIndexes = (collection) => {
    const indexes = indexKeys.map((key) => ({ key }));
    const createIndexes = indexes.length ? collection.createIndexes(indexes) : Promise.resolve({ numIndexesAfter: 0, numIndexesBefore: 0 })
    return createIndexes
      .then(({ numIndexesAfter, numIndexesBefore }) => log(`Created ${numIndexesAfter - numIndexesBefore} indexes`))
      .then(() => Promise.mapSeries(queries, queryCollection(collection)))
      .then((results, verbose) => {
        results.forEach((queryResult) => {
          log(queryResult.output);

          if (verbose) {
            log('Full explain result:');
            log(JSON.stringify(queryResult.result, null, 2));
          }
        });

        return results;
      });
  };

  const indexPerformance = (collection, query) => (indexKey) => {
    const name = Object.keys(indexKey).reduce((stringRep, key, index, arr) => `${stringRep}${key}_1${index < arr.length - 1 ? '_' : '' }`, '');
    return collection.dropIndexes()
      .then(() => collection.createIndex([indexKey]))
      .catch((error) => {
        return { error: true };
      })
      .then((createIndexResult) =>
        createIndexResult.error
          ? Promise.resolve()
          : queryCollection(collection)(query, { name, indexKey })
      );
  };

  const tryAllPossibleIndexes = (collection) => {
    return Promise.mapSeries(queries, (query) => {
      const possibleIndexes = indexMixer(query);
      log('---------------------------------------------------------------------------------------------');
      log(`Running the following query against ${possibleIndexes.length} indexes to find the best index:`);
      log(`${JSON.stringify(query)}`);
      return Promise.mapSeries(possibleIndexes, indexPerformance(collection, query))
        .then((results) => parse.indexResults(results, options.maxBestIndexResults))
        .then((results) => {
          log(print.indexOutput(results));
          return results;
        });
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
        .then(() => options.bestIndex ? tryAllPossibleIndexes(testCollection) : tryProvidedIndexes(testCollection))
        .then((results) => {
          return db.close().then(() => results);
        })
        .catch((error) => {
          return db.close().then(() => { throw error });
        });
    });
};
