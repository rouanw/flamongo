const _ = require('lodash');

const parseStage = (plan, stats) => {
  const stageParsers = {
    FETCH: ({ filter, nReturned, docsExamined,  }) => ({ filter, description: 'Retrieve documents' }),
    IXSCAN: ({ indexName, direction, keysExamined }) => ({ indexName, direction, description: 'Scan index keys' }),
    COLLSCAN: () => ({ description: 'Scan collection' }),
    SHARD_MERGE: () => ({ description: 'Merge results from shards' }),
  };

  return Object.assign({},
    stageParsers[plan.stage](plan),
    {
      stage: plan.stage,
      executionTimeMillisEstimate: stats.executionTimeMillisEstimate,
      nReturned: stats.nReturned,
    }
  );
};

module.exports = (result) => {
  const stages = [].concat(
    parseStage(result.queryPlanner.winningPlan, result.executionStats.executionStages),
    result.queryPlanner.winningPlan.inputStage
      ? parseStage(result.queryPlanner.winningPlan.inputStage, result.executionStats.executionStages.inputStage)
      : result.queryPlanner.winningPlan.inputStages.map((stage, index) => parseStage(stage, result.executionStats.executionStages.inputStages[index]))
  );

  const parsedResult = {
    executionStats: _.pick(result.executionStats, ['executionTimeMillis', 'totalKeysExamined', 'totalDocsExamined']),
    stages,
  };
  return { result, parsedResult};
};
