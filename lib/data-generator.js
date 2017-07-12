const _ = require('lodash');
const chance = new require('chance')();

const recordOfSpecialType = (fieldName, schema) => {
  if (schema._exists && !chance.bool({ likelihood: schema._exists }) ) {
    return {};
  }
  if (schema._type === 'enum') {
    return { [fieldName]: chance.pickone(schema.options) };
  }
  if (chance[schema._type] && schema.args) {
    return { [fieldName]: chance[schema._type](schema.args) };
  }
  throw new Error(`Unsupported special type: ${schema._type}`);
};

const exampleRecord = (fieldSchema) => _.reduce(fieldSchema, (record, type, fieldName) => {
  if (Array.isArray(type)) {
    return Object.assign({}, record, { [fieldName]: [].concat(type.map(exampleRecord)) });
  }
  if (typeof type === 'object' && type !== null) {
    return (type._type)
      ? Object.assign({}, record, recordOfSpecialType(fieldName, type))
      : Object.assign({}, record, { [fieldName]: exampleRecord(type) });
  }
  if (chance[type]) {
    return Object.assign({}, record, { [fieldName]: chance[type]() });
  }
  console.log(`No Chance.js generator found for field ${fieldName} of type ${type}. Using string instead`);
  return Object.assign({}, record, { [fieldName]: chance.string() });
}, {});

module.exports = (fieldSchema) => Object.assign(exampleRecord(fieldSchema), { _flamongoStubData: true });
