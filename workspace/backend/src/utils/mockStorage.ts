import fs from 'fs';
import path from 'path';

interface MockData {
  loads: any[];
  bids: any[];
  messages: any[];
  users: any[];
}

class MockStorage {
  private data: MockData;
  private filePath: string;

  constructor() {
    this.filePath = path.join(__dirname, '../../mock-data.json');
    this.data = this.loadData();
  }

  private loadData(): MockData {
    try {
      if (fs.existsSync(this.filePath)) {
        const fileContent = fs.readFileSync(this.filePath, 'utf8');
        return JSON.parse(fileContent);
      }
    } catch (error) {
      console.error('Error loading mock data:', error);
    }

    // Return default data if file doesn't exist or is corrupted
    return {
      loads: [],
      bids: [],
      messages: [],
      users: [
        {
          id: 'admin-1',
          email: 'mrtiger@fleetxchange.africa',
          userType: 'ADMIN',
          status: 'ACTIVE',
          companyName: 'FleetXchange Africa',
          contactPerson: 'Mr. Tiger',
          phone: '+27-11-123-4567',
          address: 'FleetXchange HQ, Johannesburg, South Africa',
          businessRegistration: 'REG001',
          taxId: 'TAX001',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        },
        {
          id: 'client-1',
          email: 'client1@example.com',
          userType: 'CLIENT',
          status: 'ACTIVE',
          companyName: 'ABC Logistics Ltd',
          contactPerson: 'John Smith',
          phone: '+27-11-234-5678',
          address: '123 Business St, Cape Town, South Africa',
          businessRegistration: 'REG003',
          taxId: 'TAX003',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        },
        {
          id: 'transporter-1',
          email: 'transporter1@example.com',
          userType: 'TRANSPORTER',
          status: 'ACTIVE',
          companyName: 'FastMove Transport',
          contactPerson: 'Mike Wilson',
          phone: '+27-11-456-7890',
          address: '789 Transport Rd, Johannesburg, South Africa',
          businessRegistration: 'REG005',
          taxId: 'TAX005',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        }
      ]
    };
  }

  private saveData(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error saving mock data:', error);
    }
  }

  // Load operations
  getLoads(): any[] {
    return this.data.loads;
  }

  addLoad(load: any): void {
    this.data.loads.push(load);
    this.saveData();
  }

  updateLoad(id: string, updates: any): boolean {
    const index = this.data.loads.findIndex(load => load.id === id);
    if (index !== -1) {
      this.data.loads[index] = { ...this.data.loads[index], ...updates };
      this.saveData();
      return true;
    }
    return false;
  }

  getLoadById(id: string): any | null {
    return this.data.loads.find(load => load.id === id) || null;
  }

  // Bid operations
  getBids(): any[] {
    return this.data.bids;
  }

  addBid(bid: any): void {
    this.data.bids.push(bid);
    this.saveData();
  }

  updateBid(id: string, updates: any): boolean {
    const index = this.data.bids.findIndex(bid => bid.id === id);
    if (index !== -1) {
      this.data.bids[index] = { ...this.data.bids[index], ...updates };
      this.saveData();
      return true;
    }
    return false;
  }

  getBidById(id: string): any | null {
    return this.data.bids.find(bid => bid.id === id) || null;
  }

  updateManyBids(where: (bid: any) => boolean, updates: any): { count: number } {
    let count = 0;
    this.data.bids = this.data.bids.map(bid => {
      if (where(bid)) {
        count++;
        return { ...bid, ...updates, updatedAt: new Date().toISOString() };
      }
      return bid;
    });
    this.saveData();
    return { count };
  }

  // Message operations
  getMessages(): any[] {
    return this.data.messages;
  }

  addMessage(message: any): void {
    this.data.messages.push(message);
    this.saveData();
  }

  updateMessage(id: string, updates: any): boolean {
    const index = this.data.messages.findIndex(msg => msg.id === id);
    if (index !== -1) {
      this.data.messages[index] = { ...this.data.messages[index], ...updates };
      this.saveData();
      return true;
    }
    return false;
  }

  getMessageById(id: string): any | null {
    return this.data.messages.find(msg => msg.id === id) || null;
  }

  // User operations
  getUsers(): any[] {
    return this.data.users;
  }

  getUserById(id: string): any | null {
    return this.data.users.find(user => user.id === id) || null;
  }

  getUserByEmail(email: string): any | null {
    return this.data.users.find(user => user.email === email) || null;
  }

  updateUser(id: string, updates: any): boolean {
    const index = this.data.users.findIndex(user => user.id === id);
    if (index !== -1) {
      this.data.users[index] = { ...this.data.users[index], ...updates };
      this.saveData();
      return true;
    }
    return false;
  }

  // Counter operations
  getNextId(prefix: string): string {
    const counts = {
      load: this.data.loads.length,
      bid: this.data.bids.length,
      msg: this.data.messages.length
    };
    
    const count = counts[prefix as keyof typeof counts] || 0;
    return `${prefix}-${count + 1}`;
  }

  // Cleanup duplicate loads
  cleanupDuplicates(): void {
    const seen = new Set();
    this.data.loads = this.data.loads.filter(load => {
      const key = `${load.title}-${load.clientId}-${load.pickupLocation}-${load.deliveryLocation}-${load.budgetMin}-${load.budgetMax}`;
      if (seen.has(key)) {
        console.log(`🗑️ Removing duplicate load: ${load.id} (${load.title})`);
        return false;
      }
      seen.add(key);
      return true;
    });
    this.saveData();
  }
}

// Export singleton instance
export const mockStorage = new MockStorage();
