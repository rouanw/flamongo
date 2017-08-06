const Promise = require('bluebird');
const queryCollection = require('./query');

const tryProvidedIndexes = (collection, { queries, indexKeys }, options, log) => {
  const indexes = indexKeys.map(key => ({ key }));
  const createIndexes = indexes.length && !options.preserveIndexes ? collection.createIndexes(indexes) : Promise.resolve({ numIndexesAfter: 0, numIndexesBefore: 0 });
  return createIndexes
    .then(({ numIndexesAfter, numIndexesBefore }) => log(`Created ${numIndexesAfter - numIndexesBefore} indexes`))
    .then(() => Promise.mapSeries(queries, queryCollection(collection, options)))
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

module.exports = tryProvidedIndexes;
