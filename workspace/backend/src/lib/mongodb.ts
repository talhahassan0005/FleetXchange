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
      this.client = new MongoClient('mongodb://localhost:27017');
      await this.client.connect();
      this.db = this.client.db('fleetxchange');
      console.log('✅ MongoDB connected successfully');
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
      console.log('✅ MongoDB disconnected');
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
