const { randomDocument } = require('randoc');

module.exports = (fieldSchema) => Object.assign(randomDocument(fieldSchema), { _flamongoStubData: true });
