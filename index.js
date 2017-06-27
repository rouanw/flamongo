const tester = require('./lib/tester');

const indexKeys = [{ name: 1 }];
const queries = [{ name: /^Jo/ }];
tester(indexKeys, queries);
