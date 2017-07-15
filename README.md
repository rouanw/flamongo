# Flamongo

> A tool that helps you find the most efficient indexes for your MongoDB collections

<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Creative-Tail-Animal-flamingo.svg/128px-Creative-Tail-Animal-flamingo.svg.png"/>

[![Build Status](https://travis-ci.org/rouanw/flamongo.svg?branch=master)](https://travis-ci.org/rouanw/flamongo)
[![GitHub license](https://img.shields.io/github/license/rouanw/flamongo.svg)](https://github.com/rouanw/flamongo/blob/master/LICENSE)
[![npm version](https://badge.fury.io/js/flamongo.svg)](https://badge.fury.io/js/flamongo)

## What does Flamongo do?

- Flamongo will pump a test collection full of stub data
- Create the indexes you specify
- Run your queries against the test collection
- Print out useful information and statistics, which will help you decide which indexes are best for your needs

## Getting started

```sh
$ npm install -g flamongo
$ flamongo input.json
```

Where `input.json` looks something like:

```json
{
  "indexKeys": [
    { "name.first": 1 },
    { "birthday": 1 }
  ],
  "queries": [
    { "name.first": "Richard" },
    { "name.first": "John", "vegan": false, "name.last": { "$nin": ["Smith"] } }
  ],
  "schema": {
    "name": {
      "first": "first",
      "last": "last"
    },
    "vegan": "bool",
    "birthday": "date",
    "friends": [{
      "name": {
        "first": "first",
        "last": "last"
      }
    }]
  }
}
```

If you need to do something more complex, you can also specify a plain `.js` file that exports (i.e. `module.exports =`) a similar object.

## Input format

- `indexKeys`: An array of indexes to create
- `queries`: An array of queries to run against your Mongo collection. Flamongo will output stats for each one in turn.
- `schema`: A schema that Flamongo will use to fill a test collection with data. The type descriptions map to [Chance.js](http://chancejs.com/) generators.

`indexKeys` and `schema` are optional if the `preserveData` option is specified (see below).

### Schema

The schema __flamongo__ uses loosely maps to functions offered by [Chance.js](http://chancejs.com/), with a few additional options. Here's an example schema that showcases some of the available functionality

```js
schema: {
  widget: {
    name: 'string',
    storeId: {
      _type: 'enum',
      options: [543, 999, 1232, 110],
    },
    deleted: {
      _type: 'bool',
      args: {
        likelihood: 5,
      },
    },
    startDate: 'date',
    outOfStock: {
      _type: 'bool',
      args: {
        likelihood: 10,
      },
    },
    discountable: {
      _type: 'bool',
      args: {
        likelihood: 90,
      },
    },
  },
  status: {
    _type: 'enum',
    options: ['new', 'active', 'cancelled', ''],
  },
},
```

## Options

Option|Description|Default
---|---|---
`url`|URL of Mongo server. Note that Flamongo is meant for testing. See the Mongo [Connection String](https://docs.mongodb.com/manual/reference/connection-string/) docs for the URL format. By default, Flamongo is destructive. Use `preserveData` and be careful if you're planning to point it at your production server.|`mongodb://localhost:27017`
`databaseName` | Name of database to use | `test_indexes_db`
`collectionName` | Name of collection to use | `test_indexes_collection`
`preserveData` | When `true`, Flamongo will not create or drop indexes, or remove or insert data | `false`
`numberOfRecords` | Number of stub records to insert, using the specified `schema` | `90000`
`verbose` | Print out the full output of MongoDB's [explain results](https://docs.mongodb.com/manual/reference/explain-results/) | `false`

## Example output

```
Connection open
Created 2 indexes
Inserting 90000 random documents

  Results for query:
  {"name.first":"John","vegan":false,"name.last":{"$nin":["Smith"]}}

  The query took 0 milliseconds to run and returned 76 documents.
  168 keys and 168 documents were examined.

  Stages:

  2. Retrieve documents (FETCH):
  Took around 0  milliseconds and returned 76 documents
  Examined 168 documents, using filter {"$and":[{"vegan":{"$eq":false}},{"$not":{"name.last":{"$in":["Smith"]}}}]}


  1. Scan index keys (IXSCAN):
  Took around 0  milliseconds and returned 168 documents
  Examined 168 keys on index name.first_1 in a forward direction


  Results for query:
  {"name.first":"Richard"}

  The query took 0 milliseconds to run and returned 180 documents.
  180 keys and 180 documents were examined.

  Stages:

  2. Retrieve documents (FETCH):
  Took around 0  milliseconds and returned 180 documents
  Examined 180 documents


  1. Scan index keys (IXSCAN):
  Took around 0  milliseconds and returned 180 documents
  Examined 180 keys on index name.first_1 in a forward direction

```
---

Logo: By Creative Tail [<a href="http://creativecommons.org/licenses/by/4.0">CC BY 4.0</a>], <a href="https://commons.wikimedia.org/wiki/File%3ACreative-Tail-Animal-flamingo.svg">via Wikimedia Commons</a>
