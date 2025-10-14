import { MongoClient, Db, Collection } from 'mongodb';

class MongoDBConnection {
  private static instance: MongoDBConnection;
  private client: MongoClient | null = null;
  private db: Db | null = null;

  private constructor() {}

  public static getInstance(): MongoDBConnection {
    if (!MongoDBConnection.instance) {
      MongoDBConnection.instance = new MongoDBConnection();
    }
    return MongoDBConnection.instance;
  }

  public async connect(): Promise<void> {
    if (!this.client) {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
      
      // Optimized connection options for Atlas
      this.client = new MongoClient(mongoUri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
      });
      
      await this.client.connect();
      this.db = this.client.db('fleetxchange');
      
      // Create indexes for better performance
      await this.createIndexes();
      
      console.log('MongoDB connected successfully to:', mongoUri.includes('mongodb.net') ? 'MongoDB Atlas' : 'Local MongoDB');
    }
  }

  private async createIndexes(): Promise<void> {
    try {
      const db = this.getDb();
      
      // Users collection indexes
      await db.collection('User').createIndex({ email: 1 }, { unique: true });
      await db.collection('User').createIndex({ role: 1 });
      await db.collection('User').createIndex({ isVerified: 1 });
      await db.collection('User').createIndex({ createdAt: -1 });
      
      // Loads collection indexes
      await db.collection('Load').createIndex({ clientId: 1 });
      await db.collection('Load').createIndex({ status: 1 });
      await db.collection('Load').createIndex({ createdAt: -1 });
      await db.collection('Load').createIndex({ transporterId: 1 });
      await db.collection('Load').createIndex({ status: 1, createdAt: -1 });
      
      // Bids collection indexes
      await db.collection('Bid').createIndex({ loadId: 1 });
      await db.collection('Bid').createIndex({ transporterId: 1 });
      await db.collection('Bid').createIndex({ status: 1 });
      await db.collection('Bid').createIndex({ loadId: 1, transporterId: 1 });
      
      // Messages collection indexes
      await db.collection('Message').createIndex({ senderId: 1 });
      await db.collection('Message').createIndex({ receiverId: 1 });
      await db.collection('Message').createIndex({ loadId: 1 });
      await db.collection('Message').createIndex({ createdAt: -1 });
      
      // Documents collection indexes
      await db.collection('Document').createIndex({ userId: 1 });
      await db.collection('Document').createIndex({ status: 1 });
      await db.collection('Document').createIndex({ type: 1 });
      
      // POD collection indexes
      await db.collection('POD').createIndex({ loadId: 1 });
      await db.collection('POD').createIndex({ uploadedBy: 1 });
      await db.collection('POD').createIndex({ status: 1 });
      
      // Invoices collection indexes
      await db.collection('Invoice').createIndex({ loadId: 1 });
      await db.collection('Invoice').createIndex({ clientId: 1 });
      await db.collection('Invoice').createIndex({ status: 1 });
      await db.collection('Invoice').createIndex({ createdAt: -1 });
      
      console.log('Database indexes created successfully');
    } catch (error) {
      console.error('Error creating indexes:', error);
      // Don't throw - indexes might already exist
    }
  }

  public getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  public getCollection(name: string): Collection {
    return this.getDb().collection(name);
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log('MongoDB disconnected');
    }
  }
}

// Export singleton instance
export const mongoDB = MongoDBConnection.getInstance();

// Helper functions for common operations
export const getUsersCollection = () => mongoDB.getCollection('User');
export const getLoadsCollection = () => mongoDB.getCollection('Load');
export const getBidsCollection = () => mongoDB.getCollection('Bid');
export const getMessagesCollection = () => mongoDB.getCollection('Message');
export const getDocumentsCollection = () => mongoDB.getCollection('Document');
export const getSystemLogsCollection = () => mongoDB.getCollection('SystemLog');
export const getPODCollection = () => mongoDB.getCollection('POD');
export const getInvoicesCollection = () => mongoDB.getCollection('Invoice');
export const getPaymentsCollection = () => mongoDB.getCollection('Payment');

// Initialize connection
mongoDB.connect().catch(console.error);
