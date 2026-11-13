import type { SqlSnippetGroup } from './snippets';

// MongoDB shell statements; replace `collection` and the field names before running.
export const MONGO_SNIPPETS: SqlSnippetGroup[] = [
  {
    group: 'Find',
    items: [
      { title: 'Find all', sql: 'db.collection.find({}).limit(100)' },
      { title: 'Find with filter', sql: 'db.collection.find({ field: "value" })' },
      { title: 'Find with projection', sql: 'db.collection.find({}, { field: 1 })' },
      { title: 'Sort and limit', sql: 'db.collection.find({}).sort({ field: -1 }).limit(10)' },
      { title: 'Find one', sql: 'db.collection.findOne({ field: "value" })' },
      { title: 'Range query', sql: 'db.collection.find({ field: { $gte: 10, $lt: 100 } })' },
      { title: 'In a list', sql: 'db.collection.find({ field: { $in: ["a", "b"] } })' },
      { title: 'Regex match', sql: 'db.collection.find({ field: { $regex: "^abc", $options: "i" } })' },
      { title: 'Field exists', sql: 'db.collection.find({ field: { $exists: true } })' },
      { title: 'Distinct values', sql: 'db.collection.distinct("field")' },
      { title: 'Count documents', sql: 'db.collection.countDocuments({})' }
    ]
  },
  {
    group: 'Aggregate',
    items: [
      {
        title: 'Group and count',
        sql: 'db.collection.aggregate([\n  { $group: { _id: "$field", count: { $sum: 1 } } },\n  { $sort: { count: -1 } }\n])'
      },
      {
        title: 'Match then group',
        sql: 'db.collection.aggregate([\n  { $match: { status: "active" } },\n  { $group: { _id: "$field", total: { $sum: "$amount" } } }\n])'
      },
      {
        title: 'Lookup (join)',
        sql: 'db.collection.aggregate([\n  { $lookup: { from: "other", localField: "otherId", foreignField: "_id", as: "other" } },\n  { $unwind: "$other" }\n])'
      },
      {
        title: 'Project fields',
        sql: 'db.collection.aggregate([\n  { $project: { field: 1, renamed: "$other" } }\n])'
      },
      { title: 'Top N', sql: 'db.collection.aggregate([\n  { $sort: { field: -1 } },\n  { $limit: 5 }\n])' }
    ]
  },
  {
    group: 'Insert',
    items: [
      { title: 'Insert one', sql: 'db.collection.insertOne({ field: "value" })' },
      { title: 'Insert many', sql: 'db.collection.insertMany([\n  { field: "a" },\n  { field: "b" }\n])' }
    ]
  },
  {
    group: 'Update',
    items: [
      { title: 'Update one', sql: 'db.collection.updateOne({ _id: 1 }, { $set: { field: "value" } })' },
      { title: 'Update many', sql: 'db.collection.updateMany({ field: "old" }, { $set: { field: "new" } })' },
      { title: 'Increment', sql: 'db.collection.updateOne({ _id: 1 }, { $inc: { counter: 1 } })' },
      { title: 'Push to array', sql: 'db.collection.updateOne({ _id: 1 }, { $push: { tags: "new" } })' },
      { title: 'Remove a field', sql: 'db.collection.updateMany({}, { $unset: { field: "" } })' },
      { title: 'Upsert', sql: 'db.collection.updateOne({ key: "k" }, { $set: { field: "v" } }, { upsert: true })' }
    ]
  },
  {
    group: 'Delete',
    items: [
      { title: 'Delete one', sql: 'db.collection.deleteOne({ _id: 1 })' },
      { title: 'Delete many', sql: 'db.collection.deleteMany({ field: "value" })' }
    ]
  },
  {
    group: 'Index',
    items: [
      { title: 'List indexes', sql: 'db.collection.getIndexes()' },
      { title: 'Create index', sql: 'db.collection.createIndex({ field: 1 }, { name: "field_1" })' },
      { title: 'Unique index', sql: 'db.collection.createIndex({ email: 1 }, { unique: true })' },
      { title: 'TTL index', sql: 'db.collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 })' },
      { title: 'Drop index', sql: 'db.collection.dropIndex("field_1")' }
    ]
  }
];

// Redis commands; replace key, field and member names before running.
export const REDIS_SNIPPETS: SqlSnippetGroup[] = [
  {
    group: 'Keys',
    items: [
      { title: 'Count keys', sql: 'DBSIZE' },
      { title: 'Scan by pattern', sql: 'SCAN 0 MATCH user:* COUNT 100' },
      { title: 'Key type', sql: 'TYPE key' },
      { title: 'Key exists', sql: 'EXISTS key' },
      { title: 'Delete key', sql: 'DEL key' },
      { title: 'Rename key', sql: 'RENAME key newkey' }
    ]
  },
  {
    group: 'Expiry',
    items: [
      { title: 'Time to live', sql: 'TTL key' },
      { title: 'Expire in seconds', sql: 'EXPIRE key 3600' },
      { title: 'Remove expiry', sql: 'PERSIST key' }
    ]
  },
  {
    group: 'String',
    items: [
      { title: 'Get', sql: 'GET key' },
      { title: 'Set', sql: 'SET key value' },
      { title: 'Set with expiry', sql: 'SET key value EX 3600' },
      { title: 'Set if absent', sql: 'SET key value NX' },
      { title: 'Increment', sql: 'INCR counter' }
    ]
  },
  {
    group: 'Hash',
    items: [
      { title: 'Get all fields', sql: 'HGETALL key' },
      { title: 'Get a field', sql: 'HGET key field' },
      { title: 'Set fields', sql: 'HSET key field value' },
      { title: 'Delete a field', sql: 'HDEL key field' }
    ]
  },
  {
    group: 'List',
    items: [
      { title: 'Read a range', sql: 'LRANGE key 0 -1' },
      { title: 'Push to the end', sql: 'RPUSH key value' },
      { title: 'Pop from the start', sql: 'LPOP key' },
      { title: 'Length', sql: 'LLEN key' }
    ]
  },
  {
    group: 'Set',
    items: [
      { title: 'All members', sql: 'SMEMBERS key' },
      { title: 'Add a member', sql: 'SADD key member' },
      { title: 'Is a member', sql: 'SISMEMBER key member' },
      { title: 'Remove a member', sql: 'SREM key member' }
    ]
  },
  {
    group: 'Sorted set',
    items: [
      { title: 'Top members with scores', sql: 'ZREVRANGE key 0 9 WITHSCORES' },
      { title: 'Add with score', sql: 'ZADD key 1 member' },
      { title: 'Score of a member', sql: 'ZSCORE key member' },
      { title: 'Rank of a member', sql: 'ZRANK key member' }
    ]
  },
  {
    group: 'Server',
    items: [
      { title: 'Server info', sql: 'INFO' },
      { title: 'Memory info', sql: 'INFO memory' },
      { title: 'Ping', sql: 'PING' },
      { title: 'Memory used by a key', sql: 'MEMORY USAGE key' }
    ]
  }
];
