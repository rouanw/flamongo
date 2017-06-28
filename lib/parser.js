const _ = require('lodash');

const parseStage = (plan) => {
  const stageParsers = {
    FETCH: ({ filter }) => ({ filter, humanName: 'Retrieve documents' }),
    IXSCAN: ({ indexName, direction }) => ({ indexName, direction, humanName: 'Scan index keys' }),
    COLLSCAN: () => ({ humanName: 'Scan collection' }),
    SHARD_MERGE: () => ({ humanName: 'Merge results from shards' }),
  };

  return Object.assign({}, stageParsers[plan.stage](plan), { stage: plan.stage });
};

module.exports = (result) => {
  const stages = [].concat(
    parseStage(result.queryPlanner.winningPlan),
    result.queryPlanner.winningPlan.inputStage
      ? parseStage(result.queryPlanner.winningPlan.inputStage)
      : result.queryPlanner.winningPlan.inputStages.map(parseStage)
  );

  const parsedResult = {
    executionStats: _.pick(result.executionStats, ['executionTimeMillis', 'totalKeysExamined', 'totalDocsExamined']),
    stages,
  };
  return { result, parsedResult};
};
