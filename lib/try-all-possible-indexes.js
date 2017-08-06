const Promise = require('bluebird');
const indexMixer = require('index-mixer');
const queryCollection = require('./query');
const parse = require('./parser');
const print = require('./printer');

const indexPerformance = (collection, query, options) => (indexKey) => {
  if (options.preserveIndexes) {
    throw new Error('Flamongo cannot find the best index while preserving indexes.');
  }
  const name = Object.keys(indexKey).reduce((stringRep, key, index, arr) => `${stringRep}${key}_1${index < arr.length - 1 ? '_' : ''}`, '');
  return collection.dropIndexes()
    .then(() => collection.createIndex([indexKey]))
    .catch(() => ({ error: true }))
    .then(createIndexResult =>
      (createIndexResult.error
        ? Promise.resolve()
        : queryCollection(collection, options)(query, { name, indexKey }))
    );
};

const tryAllPossibleIndexes = (collection, { queries }, options, log) =>
  Promise.mapSeries(queries, (query) => {
    const possibleIndexes = indexMixer(query);
    log('---------------------------------------------------------------------------------------------');
    log(`Running the following query against ${possibleIndexes.length} indexes to find the best index:`);
    log(`${JSON.stringify(query)}`);
    return Promise.mapSeries(possibleIndexes, indexPerformance(collection, query, options))
      .then(results => parse.indexResults(results, options.maxBestIndexResults))
      .then((results) => {
        log(print.indexOutput(results));
        return results;
      });
  });

module.exports = tryAllPossibleIndexes;
