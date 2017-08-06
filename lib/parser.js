const _ = require('lodash');

const parseStage = (plan, stats) => {
  const stageParsers = {
    FETCH: ({ filter }, { docsExamined }) => ({ filter, docsExamined, description: 'Retrieve documents' }),
    IXSCAN: ({ indexName, direction }, { keysExamined }) => ({ indexName, direction, keysExamined, description: 'Scan index keys' }),
    COLLSCAN: ({ direction, filter }, { docsExamined }) => ({ direction, filter, docsExamined, description: 'Scan collection' }),
    SHARD_MERGE: () => ({ description: 'Merge results from shards' }),
    OR: () => ({ description: 'Or', inputStages: plan.inputStages.reduce((acc, stage, index) => [].concat(acc, parseStage(stage, stats.inputStages[index])), []) }),
  };

  return Object.assign({},
    stageParsers[plan.stage](plan, stats),
    {
      stage: plan.stage,
      executionTimeMillisEstimate: stats.executionTimeMillisEstimate,
      nReturned: stats.nReturned,
    }
  );
};

const queryResult = (result) => {
  const lastStage = parseStage(result.queryPlanner.winningPlan, result.executionStats.executionStages);
  const inputStages = result.queryPlanner.winningPlan.inputStage
    ? parseStage(result.queryPlanner.winningPlan.inputStage, result.executionStats.executionStages.inputStage)
    : result.queryPlanner.winningPlan.inputStages && result.queryPlanner.winningPlan.inputStages.map((stage, index) => parseStage(stage, result.executionStats.executionStages.inputStages[index]));

  const stages = [].concat(lastStage, inputStages || []);

  const parsedResult = {
    executionStats: _.pick(result.executionStats, ['executionTimeMillis', 'totalKeysExamined', 'totalDocsExamined', 'nReturned']),
    stages,
    numberOfRejectedPlans: result.queryPlanner.rejectedPlans.length,
  };
  return { result, parsedResult };
};

const indexResults = (results, maxBestIndexResults) =>
  _(results)
    .filter()
    .take(maxBestIndexResults)
    .map(result => Object.assign({}, result, {
      time: result.parsedResult.executionStats.executionTimeMillis,
      docsExamined: result.parsedResult.executionStats.totalDocsExamined,
      keysExamined: result.parsedResult.executionStats.totalKeysExamined,
      numberOfResults: result.parsedResult.executionStats.nReturned,
    }))
    .orderBy(['time', 'docsExamined', 'keysExamined'])
    .value();

module.exports = {
  queryResult,
  indexResults,
};
