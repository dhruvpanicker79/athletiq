// Zero-install fallback database: a small MongoDB wire-protocol server written in plain JavaScript.
// Mongoose connects to it exactly like a real MongoDB, so no application code changes.
// Data is persisted to server/.data/athletiq.json. Use a real MongoDB (local or Atlas) in production.
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import 'mingo/init/system'; // register all query/aggregation operators ($group, $sum, ...)
import { Query, Aggregator } from 'mingo';

// Same BSON instance as the MongoDB driver, so ObjectIds compare correctly
const { serialize, deserialize, EJSON, Long, ObjectId } = mongoose.mongo.BSON;
// Serverless hosts (Vercel) only allow writing to /tmp
const FILE = process.env.VERCEL ? '/tmp/athletiq.json' : path.join(path.dirname(fileURLToPath(import.meta.url)), '../.data/athletiq.json');

let db = {}; // collection name -> array of documents
const uniques = {}; // collection -> [[keys...]]
try { db = EJSON.parse(fs.readFileSync(FILE, 'utf8'), { relaxed: false }); } catch { db = {}; }

let saveTimer;
const persist = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, EJSON.stringify(db, { relaxed: false }));
  }, 300);
};

/* ---------- helpers ---------- */
const coll = (n) => (db[n] ||= []);
const clone = (d) => deserialize(serialize(d));
const isOid = (v) => v && v._bsontype === 'ObjectId';
function same(a, b) {
  if (isOid(a) || isOid(b)) return isOid(a) && isOid(b) && a.equals(b);
  if (a instanceof Date || b instanceof Date) return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => same(x, b[i]));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => same(a[k], b[k]));
  }
  return a === b;
}
const getPath = (o, p) => p.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);
function setPath(o, p, v) {
  const ks = p.split('.'); const last = ks.pop();
  const t = ks.reduce((x, k) => (x[k] ??= {}), o);
  if (v === undefined) delete t[last]; else t[last] = v;
}
const matcher = (filter) => { const q = new Query(filter || {}); return (d) => q.test(d); };

function applyUpdate(doc, u, inserting) {
  if (Array.isArray(u)) throw Object.assign(new Error('Pipeline updates are not supported'), { code: 2 });
  if (!Object.keys(u).some((k) => k.startsWith('$'))) { // replacement
    const id = doc._id; for (const k of Object.keys(doc)) delete doc[k];
    Object.assign(doc, clone(u), { _id: id }); return;
  }
  for (const [op, fields] of Object.entries(u)) {
    for (const [p, v] of Object.entries(fields)) {
      const cur = getPath(doc, p);
      switch (op) {
        case '$set': setPath(doc, p, v); break;
        case '$setOnInsert': if (inserting) setPath(doc, p, v); break;
        case '$unset': setPath(doc, p, undefined); break;
        case '$inc': setPath(doc, p, (cur || 0) + v); break;
        case '$min': if (cur === undefined || v < cur) setPath(doc, p, v); break;
        case '$max': if (cur === undefined || v > cur) setPath(doc, p, v); break;
        case '$push': {
          const arr = Array.isArray(cur) ? cur : [];
          const each = v && typeof v === 'object' && '$each' in v ? v.$each : [v];
          const pos = v?.$position ?? arr.length;
          arr.splice(pos, 0, ...each);
          if (v?.$slice !== undefined) arr.splice(v.$slice >= 0 ? v.$slice : 0, v.$slice >= 0 ? arr.length : arr.length + v.$slice);
          setPath(doc, p, arr); break;
        }
        case '$addToSet': {
          const arr = Array.isArray(cur) ? cur : [];
          for (const x of v && typeof v === 'object' && '$each' in v ? v.$each : [v]) if (!arr.some((y) => same(x, y))) arr.push(x);
          setPath(doc, p, arr); break;
        }
        case '$pull': {
          if (!Array.isArray(cur)) break;
          const cond = v && typeof v === 'object' && !isOid(v) && !(v instanceof Date);
          const test = cond ? (Object.keys(v).some((k) => k.startsWith('$')) ? (x) => new Query({ v }).test({ v: x }) : matcher(v)) : (x) => same(x, v);
          setPath(doc, p, cur.filter((x) => !test(x))); break;
        }
        case '$pullAll': if (Array.isArray(cur)) setPath(doc, p, cur.filter((x) => !v.some((y) => same(x, y)))); break;
        default: throw Object.assign(new Error(`Unsupported update operator ${op}`), { code: 2 });
      }
    }
  }
}

function checkUnique(name, doc) {
  for (const keys of uniques[name] || []) {
    const clash = coll(name).find((d) => d !== doc && keys.every((k) => same(getPath(d, k), getPath(doc, k))));
    if (clash) {
      const keyValue = Object.fromEntries(keys.map((k) => [k, getPath(doc, k)]));
      throw Object.assign(new Error(`E11000 duplicate key error collection: ${name} dup key: ${JSON.stringify(keyValue)}`), { code: 11000, keyValue, keyPattern: Object.fromEntries(keys.map((k) => [k, 1])) });
    }
  }
}

function find(name, filter, { sort, skip, limit, projection } = {}) {
  let cursor = new Query(filter || {}).find(coll(name), projection && Object.keys(projection).length ? projection : undefined);
  if (sort && Object.keys(sort).length) cursor = cursor.sort(sort);
  if (skip) cursor = cursor.skip(skip);
  if (limit) cursor = cursor.limit(Math.abs(limit));
  return cursor.all().map(clone);
}
const cursorReply = (ns, docs) => ({ cursor: { firstBatch: docs, id: Long.fromNumber(0), ns }, ok: 1 });

/* ---------- command handlers ---------- */
let connId = 0;
const HELLO = () => ({
  helloOk: true, ismaster: true, isWritablePrimary: true, maxBsonObjectSize: 16777216, maxMessageSizeBytes: 48000000,
  maxWriteBatchSize: 100000, localTime: new Date(), logicalSessionTimeoutMinutes: 30, connectionId: ++connId,
  minWireVersion: 0, maxWireVersion: 17, readOnly: false, ok: 1,
});

function run(cmd, dbName) {
  const name = Object.keys(cmd)[0];
  const c = cmd[name];
  const ns = `${dbName}.${c}`;
  switch (name.toLowerCase()) {
    case 'hello': case 'ismaster': return HELLO();
    case 'ping': case 'endsessions': case 'killcursors': case 'abortTransaction': return { ok: 1 };
    case 'buildinfo': return { version: '7.0.0-athletiq-local', versionArray: [7, 0, 0, 0], ok: 1 };
    case 'getparameter': return { featureCompatibilityVersion: { version: '7.0' }, ok: 1 };
    case 'listcollections': return cursorReply(`${dbName}.$cmd.listCollections`, Object.keys(db).map((n) => ({ name: n, type: 'collection', options: {}, info: { readOnly: false } })));
    case 'listindexes': return cursorReply(ns, [{ v: 2, key: { _id: 1 }, name: '_id_' }]);
    case 'createindexes':
      for (const ix of cmd.indexes || []) if (ix.unique) {
        const keys = Object.keys(ix.key);
        if (!(uniques[c] ||= []).some((k) => same(k, keys))) uniques[c].push(keys);
      }
      coll(c); return { createdCollectionAutomatically: false, numIndexesBefore: 1, numIndexesAfter: 1, ok: 1 };
    case 'create': coll(c); persist(); return { ok: 1 };
    case 'drop': delete db[c]; persist(); return { ok: 1 };
    case 'dropdatabase': db = {}; persist(); return { ok: 1 };
    case 'find': return cursorReply(ns, find(c, cmd.filter, cmd));
    case 'getmore': return { cursor: { nextBatch: [], id: Long.fromNumber(0), ns }, ok: 1 };
    case 'count': return { n: find(c, cmd.query, cmd).length, ok: 1 };
    case 'distinct': {
      const vals = [];
      for (const d of find(c, cmd.query)) for (const v of [].concat(getPath(d, cmd.key) ?? [])) if (!vals.some((x) => same(x, v))) vals.push(v);
      return { values: vals, ok: 1 };
    }
    case 'aggregate': return cursorReply(ns, new Aggregator(cmd.pipeline || []).run(coll(c)).map(clone));
    case 'insert': {
      const docs = cmd.documents || [];
      for (const d of docs) { if (!d._id) d._id = new ObjectId(); checkUnique(c, d); coll(c).push(d); }
      persist(); return { n: docs.length, ok: 1 };
    }
    case 'update': {
      let n = 0, nModified = 0; const upserted = [];
      for (const [i, { q, u, multi, upsert }] of (cmd.updates || []).entries()) {
        const hits = coll(c).filter(matcher(q));
        for (const d of multi ? hits : hits.slice(0, 1)) {
          const before = serialize(d); const backup = clone(d);
          applyUpdate(d, u, false);
          try { checkUnique(c, d); } catch (e) { Object.assign(d, backup); throw e; }
          n++; if (!Buffer.from(before).equals(Buffer.from(serialize(d)))) nModified++;
        }
        if (!hits.length && upsert) {
          const d = {}; for (const [k, v] of Object.entries(q || {})) if (!k.startsWith('$') && (typeof v !== 'object' || isOid(v) || v instanceof Date)) setPath(d, k, v);
          applyUpdate(d, u, true); d._id ||= new ObjectId(); checkUnique(c, d); coll(c).push(d); n++; upserted.push({ index: i, _id: d._id });
        }
      }
      persist(); return { n, nModified, ...(upserted.length && { upserted }), ok: 1 };
    }
    case 'delete': {
      let n = 0;
      for (const { q, limit } of cmd.deletes || []) {
        const test = matcher(q); const list = coll(c);
        for (let i = 0; i < list.length;) {
          if (test(list[i])) { list.splice(i, 1); n++; if (limit === 1) break; } else i++;
        }
      }
      persist(); return { n, ok: 1 };
    }
    case 'findandmodify': {
      const [target] = find(c, cmd.query, { sort: cmd.sort, limit: 1 });
      const doc = target && coll(c).find((d) => same(d._id, target._id));
      if (cmd.remove) {
        if (doc) coll(c).splice(coll(c).indexOf(doc), 1);
        persist(); return { value: doc ? clone(doc) : null, lastErrorObject: { n: doc ? 1 : 0 }, ok: 1 };
      }
      if (!doc && !cmd.upsert) return { value: null, lastErrorObject: { n: 0, updatedExisting: false }, ok: 1 };
      let d = doc; const before = doc && clone(doc);
      if (!d) { d = {}; applyUpdate(d, cmd.update, true); d._id ||= new ObjectId(); checkUnique(c, d); coll(c).push(d); }
      else { applyUpdate(d, cmd.update, false); try { checkUnique(c, d); } catch (e) { Object.assign(d, before); throw e; } }
      persist();
      const out = cmd.new ? clone(d) : before;
      return { value: out && cmd.fields ? new Query({}).find([out], cmd.fields).all()[0] : out, lastErrorObject: { n: 1, updatedExisting: !!doc }, ok: 1 };
    }
    default: return { ok: 0, errmsg: `Command ${name} not supported by local DB`, code: 59, codeName: 'CommandNotFound' };
  }
}

function safeRun(cmd, dbName) {
  try { return run(cmd, dbName); }
  catch (e) {
    if (e.code === 11000) return { n: 0, writeErrors: [{ index: 0, code: 11000, errmsg: e.message, keyPattern: e.keyPattern, keyValue: e.keyValue }], ok: 1 };
    return { ok: 0, errmsg: e.message, code: e.code || 1 };
  }
}

/* ---------- wire protocol (OP_MSG 2013, legacy OP_QUERY 2004) ---------- */
function reply(sock, requestId, opCode, body) {
  let payload;
  if (opCode === 2013) {
    const doc = serialize(body);
    payload = Buffer.concat([Buffer.from([0, 0, 0, 0]), Buffer.from([0]), doc]);
  } else {
    const doc = serialize(body); const h = Buffer.alloc(20);
    h.writeInt32LE(0, 0); h.writeBigInt64LE(0n, 4); h.writeInt32LE(0, 12); h.writeInt32LE(1, 16);
    payload = Buffer.concat([h, doc]);
  }
  const header = Buffer.alloc(16);
  header.writeInt32LE(16 + payload.length, 0); header.writeInt32LE(Math.floor(Math.random() * 1e9), 4);
  header.writeInt32LE(requestId, 8); header.writeInt32LE(opCode === 2013 ? 2013 : 1, 12);
  sock.write(Buffer.concat([header, payload]));
}

function handle(sock, msg) {
  const requestId = msg.readInt32LE(4), opCode = msg.readInt32LE(12);
  if (opCode === 2013) {
    const flags = msg.readUInt32LE(16);
    const end = msg.length - (flags & 1 ? 4 : 0);
    let pos = 20, cmd;
    while (pos < end) {
      const kind = msg[pos++];
      if (kind === 0) { const len = msg.readInt32LE(pos); cmd = deserialize(msg.subarray(pos, pos + len), { promoteValues: true }); pos += len; }
      else {
        const size = msg.readInt32LE(pos); const stop = pos + size; pos += 4;
        const z = msg.indexOf(0, pos); const id = msg.toString('utf8', pos, z); pos = z + 1;
        const docs = [];
        while (pos < stop) { const len = msg.readInt32LE(pos); docs.push(deserialize(msg.subarray(pos, pos + len))); pos += len; }
        (cmd ||= {})[id] = docs;
      }
    }
    if (flags & 2) return; // moreToCome: no reply expected
    reply(sock, requestId, 2013, safeRun(cmd, cmd.$db || 'test'));
  } else if (opCode === 2004) {
    let pos = 20; const z = msg.indexOf(0, pos); const full = msg.toString('utf8', pos, z); pos = z + 9;
    const len = msg.readInt32LE(pos);
    const cmd = deserialize(msg.subarray(pos, pos + len));
    reply(sock, requestId, 2004, safeRun(cmd.$query || cmd, full.split('.')[0]));
  }
}

export function startLocalDb(port = 27027) {
  return new Promise((resolve, reject) => {
    const server = net.createServer((sock) => {
      let buf = Buffer.alloc(0);
      sock.on('data', (chunk) => {
        buf = Buffer.concat([buf, chunk]);
        while (buf.length >= 4 && buf.length >= buf.readInt32LE(0)) {
          const len = buf.readInt32LE(0);
          handle(sock, buf.subarray(0, len));
          buf = buf.subarray(len);
        }
      });
      sock.on('error', () => {});
    });
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(`mongodb://127.0.0.1:${port}/athletiq`));
  });
}
