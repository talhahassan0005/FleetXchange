const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Direct MongoDB connection for auth
let mongoClient: any = null;

async function getMongoClient() {
  if (!mongoClient) {
    mongoClient = new MongoClient('mongodb://localhost:27017');
    await mongoClient.connect();
  }
  return mongoClient;
}

async function findUserByEmail(email: string) {
  const client = await getMongoClient();
  const db = client.db('fleetxchange');
  const usersCollection = db.collection('User');
  return await usersCollection.findOne({ email });
}

async function createUser(userData: any) {
  const client = await getMongoClient();
  const db = client.db('fleetxchange');
  const usersCollection = db.collection('User');
  return await usersCollection.insertOne(userData);
}

module.exports = {
  findUserByEmail,
  createUser
};
