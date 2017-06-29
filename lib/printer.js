const chalk = require('chalk');

const stagePrinters = {
  FETCH: ({ filter, docsExamined }) => `Examined ${docsExamined} documents, using filter ${JSON.stringify(filter)}`,
  IXSCAN: ({ indexName, direction, keysExamined }) => `Examined ${keysExamined} keys on index ${chalk.green(indexName)} in a ${direction} direction`,
  COLLSCAN: ({ direction, filter, docsExamined }) => `Examined ${docsExamined} documents in a ${direction} direction, using filter ${JSON.stringify(filter)}`,
};

const printStage = (result, stage, index, arr) => {
  return `${result}
  ${chalk.blue(`${arr.length - index}. ${stage.description} (${stage.stage}):`)}
  Took around ${chalk.green(`${stage.executionTimeMillisEstimate}  milliseconds`)} and returned ${chalk.green(`${stage.nReturned} documents`)}
  ${stagePrinters[stage.stage] ? stagePrinters[stage.stage](stage) : ''}
  `;
};

module.exports = (query, { executionStats, stages }) => `
  ${chalk.blue('Results for query:')}
  ${JSON.stringify(query)}

  The query took ${chalk.green(`${executionStats.executionTimeMillis} milliseconds`)} to run and returned ${chalk.green(`${executionStats.nReturned} documents`)}.
  ${executionStats.totalKeysExamined} keys and ${executionStats.totalDocsExamined} documents were examined.

  ${stages.reduce(printStage, chalk.blue('Stages:\n'))}
`;
