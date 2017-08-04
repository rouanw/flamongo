const mongo = require('mongodb').MongoClient;
const _ = require('lodash');
const Promise = require('bluebird');
const indexMixer = require('index-mixer');
const columnify = require('columnify');
const chalk = require('chalk');
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
    bestIndex: false,
    maxBestIndexResults: 10,
  }, overrides);

  const url = `${options.url}/${options.databaseName}`;

  const indexes = indexKeys.map((key) => ({ key }));

  const queryCollection = (collection) => (query, metadata) =>
      (options.warmQuery ? collection.find(query).hasNext() : Promise.resolve())
      .then(() => collection.find(query).explain(options.explainMode))
      .then(parseResult)
      .then(({ result, parsedResult }) => {
        const output = print(query, parsedResult);
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
        console.log(`Inserting ${options.numberOfRecords} random documents`);
        return collection.insertMany(documents);
      });
  };

  const printQueryResults = (results) => {
    results.forEach((queryResult) => {
      console.log(queryResult.output);

      if (options.verbose) {
        console.log('Full explain result:');
        console.log(JSON.stringify(queryResult.result, null, 2));
      }
    });

    return results;
  };

  const printIndexResults = (results) => {
    const data = results.map(({ time, docsExamined, keysExamined, metadata }, i) => (
      { 'Rank': chalk.yellow(i + 1), 'Index': metadata.name, 'Time (ms)' : time, 'Documents examined': docsExamined, 'Keys examined': keysExamined }
    ));
    const bestIndex = results[0];
    console.log();
    console.log(`The best index based on your input appears to be ${chalk.green(bestIndex.metadata.name)}, which took ${chalk.green(bestIndex.time)} milliseconds. (${results[0].numberOfResults} documents were returned.)`);
    console.log(`You can create the index using this key: ${JSON.stringify(bestIndex.metadata.indexKey)}`);
    console.log();
    console.log(columnify(data, {
      columnSplitter: '  |  ',
      headingTransform: (h) => chalk.blue(h),
    }));
    console.log();
    return results;
  };

  const tryProvidedIndexes = (collection) => {
    const createIndexes = indexes.length ? collection.createIndexes(indexes) : Promise.resolve({ numIndexesAfter: 0, numIndexesBefore: 0 })
    return createIndexes
      .then(({ numIndexesAfter, numIndexesBefore }) => console.log(`Created ${numIndexesAfter - numIndexesBefore} indexes`))
      .then(() => Promise.mapSeries(queries, queryCollection(collection)))
      .then(printQueryResults);
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
      console.log('---------------------------------------------------------------------------------------------');
      console.log(`Running the following query against ${possibleIndexes.length} indexes to find the best index:`);
      console.log(`${JSON.stringify(query)}`);
      return Promise.mapSeries(possibleIndexes, indexPerformance(collection, query))
        .then((results) => {
          return _(results)
            .filter()
            .take(options.maxBestIndexResults)
            .map((result) => Object.assign({}, result, {
              time: result.parsedResult.executionStats.executionTimeMillis,
              docsExamined: result.parsedResult.executionStats.totalDocsExamined,
              keysExamined: result.parsedResult.executionStats.totalKeysExamined,
              numberOfResults: result.parsedResult.executionStats.nReturned,
            }))
            .orderBy(['time', 'docsExamined', 'keysExamined'])
            .value();
        })
        .then(printIndexResults);
    });
  };

  return mongo.connect(url)
    .then((db) => {
      console.log('Connection open');
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
          console.error(error);
          return db.close();
        });
    })
    .catch(console.error);
};
