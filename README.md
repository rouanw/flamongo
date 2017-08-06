# Flamongo

> A tool that helps you find the most efficient indexes for your MongoDB collections

<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Creative-Tail-Animal-flamingo.svg/128px-Creative-Tail-Animal-flamingo.svg.png"/>

[![Build Status](https://travis-ci.org/rouanw/flamongo.svg?branch=master)](https://travis-ci.org/rouanw/flamongo)
[![GitHub license](https://img.shields.io/github/license/rouanw/flamongo.svg)](https://github.com/rouanw/flamongo/blob/master/LICENSE)
[![npm version](https://badge.fury.io/js/flamongo.svg)](https://badge.fury.io/js/flamongo)

## What does Flamongo do?

If you want to figure out how to make your MongoDB queries more performant by finding the best indexes, you've come to the right place.

`flamongo best-index` finds the best MongoDB index for each of your queries.

`flamongo explain` provides you with helpful, human-readable stats on how a your MongoDB indexes perform for your queries.

- Flamongo will pump a test collection full of stub data
- Depending on the command you're running, flamongo will either create the indexes you've specified or create every possible index in turn
- Run your queries against the test collection
- Print out useful information and statistics, which will help you decide which indexes are best for your needs

## Install

```sh
$ npm install flamongo
```

## API

### `best-index`

Find the fastest index based on your queries and data.

```
$ flamongo best-index input.json
```

Where `input.json` looks something like:

```json
{
  "queries": [
    { "name.first": "Richard", "vegan": true },
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

Example output:

```sh
Connection open
---------------------------------------------------------------------------------------------
Running the following query against 4 indexes to find the best index:
{"name.first":"Richard","vegan":true}

The best index based on your input appears to be vegan_1_name.first_1, which took 0 milliseconds. (102 documents were returned.)
You can create the index using this key: {"vegan":1,"name.first":1}

Rank  |  Index                 |  Time (ms)  |  Documents examined  |  Keys examined
1     |  vegan_1_name.first_1  |  0          |  102                 |  102
2     |  name.first_1_vegan_1  |  1          |  102                 |  102
3     |  name.first_1          |  1          |  182                 |  182
4     |  vegan_1               |  53         |  45141               |  45141

---------------------------------------------------------------------------------------------
Running the following query against 15 indexes to find the best index:
{"name.first":"John","vegan":false,"name.last":{"$nin":["Smith"]}}

The best index based on your input appears to be vegan_1_name.first_1, which took 1 milliseconds. (86 documents were returned.)
You can create the index using this key: {"vegan":1,"name.first":1}

Rank  |  Index                             |  Time (ms)  |  Documents examined  |  Keys examined
1     |  vegan_1_name.first_1              |  1          |  86                  |  86
2     |  name.first_1_vegan_1_name.last_1  |  1          |  86                  |  87
3     |  name.first_1                      |  1          |  161                 |  161
4     |  name.first_1_name.last_1          |  1          |  161                 |  162
5     |  name.last_1_name.first_1          |  9          |  161                 |  1160
6     |  name.first_1_vegan_1              |  11         |  86                  |  86
7     |  vegan_1                           |  52         |  44859               |  44859
8     |  vegan_1_name.last_1               |  91         |  44761               |  44763
9     |  name.last_1_vegan_1               |  94         |  44761               |  45261
10    |  name.last_1                       |  164        |  89811               |  89812
```

#### Alias

`flamongo best`

#### Programmatic API

```js
const flamongo = require('flamongo');
flamongo.bestIndex(input, options, /* optional logging function */)
  .then((results) => { /* use results */ });
```

### `explain`

Explain how your queries perform against the provided indexes.

```
$ flamongo explain input.json
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

Example output:

```sh
Connection open
Inserting 90000 random documents
Created 3 indexes

Results for query:
{"name.first":"Richard"}

The query took 1 milliseconds to run and returned 167 documents.
167 keys and 167 documents were examined.

Stages:

2. Retrieve documents (FETCH):
Took around 10  milliseconds and returned 167 documents
Examined 167 documents

1. Scan index keys (IXSCAN):
Took around 10  milliseconds and returned 167 documents
Examined 167 keys on index name.first_1_vegan_1 in a forward direction


Results for query:
{"name.first":"John","vegan":false,"name.last":{"$nin":["Smith"]}}

The query took 2 milliseconds to run and returned 83 documents.
83 keys and 83 documents were examined.

Stages:

2. Retrieve documents (FETCH):
Took around 0  milliseconds and returned 83 documents
Examined 83 documents, using filter {"$not":{"name.last":{"$in":["Smith"]}}}

1. Scan index keys (IXSCAN):
Took around 0  milliseconds and returned 83 documents
Examined 83 keys on index name.first_1_vegan_1 in a forward direction
```

#### Programmatic API

```js
const flamongo = require('flamongo');
flamongo.explain(input, options, /* optional logging function */)
  .then((results) => { /* use results */ });
```

## Input format

- `queries`: An array of queries to run against your Mongo collection. Flamongo will output stats for each one in turn.
- `schema`: A schema that Flamongo will use to fill a test collection with data. The type descriptions map to [Chance.js](http://chancejs.com/) generators. Optional if the `preserveData` option is specified (see below).
- `indexKeys`: An array of indexes to create. Only used for `flamongo explain`.

If you need to do something more complex, you can also specify a plain `.js` file that exports (i.e. `module.exports =`) a similar object.

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
`preserveData` | When `true`, Flamongo will not insert or remove data | `false`
`preserveIndexes` | When `true`, Flamongo will not create or drop indexes. Note that this option will __not__ be honoured by `flamongo best-index`, which will always drop and create indexes. | `false`
`numberOfRecords` | Number of stub records to insert, using the specified `schema` | `90000`
`verbose` | Print out the full output of MongoDB's [explain results](https://docs.mongodb.com/manual/reference/explain-results/) | `false`

## Further reading

Reading the Mongo Docs on [Index Strategies](https://docs.mongodb.com/manual/applications/indexes/) will help you understand what factors influence how performant an index is. Some queries will actually be faster without any indexes!

---

Logo: By Creative Tail [<a href="http://creativecommons.org/licenses/by/4.0">CC BY 4.0</a>], <a href="https://commons.wikimedia.org/wiki/File%3ACreative-Tail-Animal-flamingo.svg">via Wikimedia Commons</a>
