const parse = require('./parser');
const print = require('./printer');

module.exports = (collection, options) => (query, metadata) =>
  (options.warmQuery ? collection.find(query).hasNext() : Promise.resolve())
    .then(() => collection.find(query).explain(options.explainMode))
    .then(parse.queryResult)
    .then(({ result, parsedResult }) => {
      const output = print.queryExecutionOutput(query, parsedResult);
      return { result, parsedResult, output, metadata };
    });
