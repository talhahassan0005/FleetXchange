#!/usr/bin/env node
/*
 Safe Atlas -> Local DB copy using Node.js (non-destructive)
 Usage:
  - Set env vars: ATLAS_URI, SOURCE_DB (optional TARGET_DB, LOCAL_URI)
  - Or run and you'll be prompted for missing values.

 This script creates a new local database (default: <source>_atlas_copy_<timestamp>) and copies collections, documents, and indexes.
 It will NOT drop or overwrite existing local databases. If the target DB exists, a numeric suffix will be added.

 NOTE: For large databases prefer using mongodump/mongorestore. This script is convenient for moderate-sized DBs and for selective runs.
*/

const { MongoClient } = require('mongodb');
const readline = require('readline');

function question(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(prompt, (ans) => { rl.close(); resolve(ans); }));
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2,'0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function ensureUniqueDbName(localClient, candidate) {
  const admin = localClient.db().admin();
  const { databases } = await admin.listDatabases();
  const names = databases.map(d => d.name);
  const lowerToOriginal = new Map(names.map(n => [n.toLowerCase(), n]));
  const candLower = candidate.toLowerCase();
  // If a DB exists with same name case-insensitively, reuse that existing DB name
  if (lowerToOriginal.has(candLower)) {
    return lowerToOriginal.get(candLower);
  }
  // Otherwise ensure uniqueness by appending numeric suffixes
  const nameSet = new Set(names);
  if (!nameSet.has(candidate)) return candidate;
  let i = 1;
  while (nameSet.has(`${candidate}_${i}`)) i++;
  return `${candidate}_${i}`;
}

async function copyCollection(sourceDb, targetDb, collName) {
  const srcColl = sourceDb.collection(collName);
  const tgtColl = targetDb.collection(collName);

  // Copy indexes (except default _id_ if present)
  try {
    const indexes = await srcColl.indexes();
    for (const idx of indexes) {
      if (idx.name === '_id_') continue;
      const key = idx.key;
      const opts = { ...idx };
      delete opts.key; delete opts.ns; delete opts.v; delete opts.name;
      try { await tgtColl.createIndex(key, opts); } catch (e) { console.warn(`Warning: createIndex failed for ${collName}: ${e.message}`); }
    }
  } catch (e) {
    console.warn(`Warning: could not list/create indexes for ${collName}: ${e.message}`);
  }

  // Copy documents in batches
  const cursor = srcColl.find({});
  let batch = [];
  const BATCH_SIZE = 1000;
  let total = 0;
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    batch.push(doc);
    if (batch.length >= BATCH_SIZE) {
      try { await tgtColl.insertMany(batch, { ordered: false }); } catch (e) { console.warn(`Warning: insertMany partial failure: ${e.message}`); }
      total += batch.length;
      batch = [];
    }
  }
  if (batch.length > 0) {
    try { await tgtColl.insertMany(batch, { ordered: false }); } catch (e) { console.warn(`Warning: insertMany partial failure: ${e.message}`); }
    total += batch.length;
  }
  return total;
}

async function main() {
  let atlasUri = process.env.ATLAS_URI || '';
  let sourceDbName = process.env.SOURCE_DB || '';
  let localUri = process.env.LOCAL_URI || 'mongodb://localhost:27017';
  let targetDbName = process.env.TARGET_DB || '';

  if (!atlasUri) atlasUri = (await question('Atlas connection string (mongodb+srv://... or mongodb://...): ')).trim();
  else atlasUri = atlasUri.trim();

  // Accept pasted values like: DATABASE_URL="mongodb+srv://..." and strip surrounding quotes
  function sanitizeUri(u) {
    if (!u) return u;
    // extract from first occurrence of mongodb or mongodb+srv
    const m = u.match(/(mongodb(?:\+srv)?:\/\/.*)/i);
    if (m) u = m[1];
    // remove surrounding quotes
    u = u.replace(/^\s*["']?/, '').replace(/["']?\s*$/, '');
    return u;
  }
  atlasUri = sanitizeUri(atlasUri);
  if (!atlasUri) { console.error('Atlas URI is required. Exiting.'); process.exit(1); }

  if (!sourceDbName) sourceDbName = (await question('Source DB name on Atlas: ')).trim();
  if (!sourceDbName) { console.error('Source DB name required. Exiting.'); process.exit(1); }

  if (!targetDbName) {
    const def = `${sourceDbName}_atlas_copy_${timestamp()}`;
    const ans = (await question(`Target local DB name (leave empty for default: ${def}): `)).trim();
    targetDbName = ans || def;
  }

  console.log('\nConnecting to Atlas...');
  const atlasClient = new MongoClient(atlasUri);
  console.log('Connecting to local MongoDB...');
  const localClient = new MongoClient(localUri);
  try {
    await atlasClient.connect();
  } catch (e) {
    console.error('Failed to connect to Atlas:', e.message);
    process.exit(1);
  }
  try {
    await localClient.connect();
  } catch (e) {
    console.error('Failed to connect to local MongoDB:', e.message);
    await atlasClient.close();
    process.exit(1);
  }

  try {
    // Ensure target DB name unique
    targetDbName = await ensureUniqueDbName(localClient, targetDbName);
    console.log(`Using local target DB: ${targetDbName}`);

    const sourceDb = atlasClient.db(sourceDbName);
    const targetDb = localClient.db(targetDbName);

    const collections = await sourceDb.listCollections().toArray();
    if (!collections.length) {
      console.log('No collections found in source DB. Nothing to do.');
    }

    const summary = [];
    for (const coll of collections) {
      const name = coll.name;
      console.log(`Copying collection: ${name}`);
      // Create collection on target (no options)
      try { await targetDb.createCollection(name); } catch (e) { /* ignore if exists */ }
      const count = await copyCollection(sourceDb, targetDb, name);
      console.log(`  -> copied ${count} documents`);
      summary.push({ collection: name, docs: count });
    }

    console.log('\nCopy complete. Summary:');
    for (const s of summary) console.log(`  ${s.collection}: ${s.docs} documents`);
    console.log(`\nTarget DB name: ${targetDbName}`);
    console.log("To run the backend temporarily with this local DB (PowerShell):");
    console.log(`  $env:DATABASE_URL = 'mongodb://localhost:27017/${targetDbName}'; npm run dev`);

  } catch (e) {
    console.error('Error during copy:', e.message);
  } finally {
    await atlasClient.close();
    await localClient.close();
  }
}

main().catch(err => { console.error('Fatal error:', err); process.exit(1); });
