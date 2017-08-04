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
  }, overrides);

  const url = `${options.url}/${options.databaseName}`;

  const indexes = indexKeys.map((key) => ({ key }));

  const queryCollection = (collection) => (query, id) =>
      (options.warmQuery ? collection.find(query).hasNext() : Promise.resolve())
      .then(() => collection.find(query).explain(options.explainMode))
      .then(parseResult)
      .then(({ result, parsedResult }) => {
        const output = print(query, parsedResult);
        return { result, parsedResult, output, id };
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
    const data = results.map(({ time, docsExamined, keysExamined, numberOfResults, id }) => (
      { 'Index': id, 'Time (ms)' : time, 'Documents examined': docsExamined, 'Keys examined': keysExamined, 'Number or results': numberOfResults }
    ));
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
    const id = Object.keys(indexKey).reduce((stringRep, key, index, arr) => `${stringRep}${key}_1${index < arr.length - 1 ? '_' : '' }`, '');
    return collection.dropIndexes()
      .then(() => collection.createIndex([indexKey]))
      .then(() => queryCollection(collection)(query, id));
  };

  const tryAllPossibleIndexes = (collection) => {
    const query = queries[0];
    const possibleIndexes = indexMixer(query);
    return Promise.mapSeries(possibleIndexes, indexPerformance(collection, query))
      .then((results) => {
        const orderedResults = _.orderBy(results, 'parsedResult.executionStats.executionTimeMillis');
        return orderedResults.map((result) => Object.assign({}, result, {
          time: result.parsedResult.executionStats.executionTimeMillis,
          docsExamined: result.parsedResult.executionStats.totalDocsExamined,
          keysExamined: result.parsedResult.executionStats.totalKeysExamined,
          numberOfResults: result.parsedResult.executionStats.nReturned,
        }));
      })
      .then(printIndexResults);
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
