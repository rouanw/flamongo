const chalk = require('chalk');
const columnify = require('columnify');

const printFilter = (filter) => filter ? `, using filter ${JSON.stringify(filter)}` : '';

const printStageDetail = (stage, label) => {
  const stagePrinters = {
    FETCH: ({ filter, docsExamined }) => `Examined ${docsExamined} documents${printFilter(filter)}`,
    IXSCAN: ({ indexName, direction, keysExamined }) => `Examined ${keysExamined} keys on index ${chalk.green(indexName)} in a ${direction} direction`,
    COLLSCAN: ({ direction, filter, docsExamined }) => `Examined ${docsExamined} documents in a ${direction} direction${printFilter(filter)}`,
    OR: ({ inputStages }) => inputStages.reduce((acc, s, index, arr) => `${acc}
    ${printStageDetail(s, `${label}.${arr.length - index}`)}`, ''),
  };

  return `${chalk.blue(`${label}. ${stage.description} (${stage.stage}):`)}
  Took around ${chalk.green(`${stage.executionTimeMillisEstimate}  milliseconds`)} and returned ${chalk.green(`${stage.nReturned} documents`)}
  ${stagePrinters[stage.stage] ? stagePrinters[stage.stage](stage) : ''}
  `;
}

const printStage = (result, stage, index, arr) => `${result}
  ${printStageDetail(stage, arr.length - index)}
  `;

const queryExecutionOutput = (query, { executionStats, stages }) => `
  ${chalk.blue('Results for query:')}
  ${JSON.stringify(query)}

  The query took ${chalk.green(`${executionStats.executionTimeMillis} milliseconds`)} to run and returned ${chalk.green(`${executionStats.nReturned} documents`)}.
  ${executionStats.totalKeysExamined} keys and ${executionStats.totalDocsExamined} documents were examined.

  ${stages.reduce(printStage, chalk.blue('Stages:\n'))}
`;

const indexOutput = (results) => {
  const data = results.map(({ time, docsExamined, keysExamined, metadata }, i) => (
    { 'Rank': chalk.yellow(i + 1), 'Index': metadata.name, 'Time (ms)' : time, 'Documents examined': docsExamined, 'Keys examined': keysExamined }
  ));
  const bestIndex = results[0];
  const table = columnify(data, {
    columnSplitter: '  |  ',
    headingTransform: (h) => chalk.blue(h),
  });
  return `
The best index based on your input appears to be ${chalk.green(bestIndex.metadata.name)}, which took ${chalk.green(bestIndex.time)} milliseconds. (${results[0].numberOfResults} documents were returned.)
You can create the index using this key: ${JSON.stringify(bestIndex.metadata.indexKey)}

${table}
`;
}

module.exports = {
  queryExecutionOutput,
  indexOutput,
};
