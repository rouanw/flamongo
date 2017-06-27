const tester = require('./lib/tester');

const indexKeys = [{ name: 1 }];
const query = { name: /^Jo/ };
tester(indexKeys, query);
