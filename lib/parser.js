const _ = require('lodash');

module.exports = (result) => {
  const parsedResult = {
    winningPlan: _.pick(result.queryPlanner.winningPlan, ['stage', 'inputStage', 'inputStages']),
    executionStats: _.pick(result.executionStats, ['executionTimeMillis', 'totalKeysExamined', 'totalDocsExamined']),
  };
  return { result, parsedResult};
};
