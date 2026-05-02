const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.dbPath = path.join(app.getPath('userData'), 'constructpro.db');
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.createTables()
            .then(() => this.seedInitialData())
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  }

  async createTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS industries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact_info TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        industry_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (industry_id) REFERENCES industries (id)
      )`,
      `CREATE TABLE IF NOT EXISTS materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        unit_cost REAL NOT NULL,
        unit_type TEXT NOT NULL,
        category TEXT,
        industry_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (industry_id) REFERENCES industries (id)
      )`,
      `CREATE TABLE IF NOT EXISTS labor (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_name TEXT NOT NULL,
        description TEXT,
        hourly_rate REAL NOT NULL,
        category TEXT,
        industry_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (industry_id) REFERENCES industries (id)
      )`,
      `CREATE TABLE IF NOT EXISTS estimates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER,
        project_name TEXT NOT NULL,
        date_created DATETIME DEFAULT CURRENT_TIMESTAMP,
        subtotal REAL NOT NULL,
        markup_percentage REAL DEFAULT 0,
        total_amount REAL NOT NULL,
        status TEXT DEFAULT 'draft',
        notes TEXT,
        FOREIGN KEY (client_id) REFERENCES clients (id)
      )`,
      `CREATE TABLE IF NOT EXISTS estimate_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        estimate_id INTEGER,
        item_type TEXT NOT NULL,
        item_id INTEGER,
        item_name TEXT NOT NULL,
        description TEXT,
        quantity REAL NOT NULL,
        unit_cost REAL NOT NULL,
        total_cost REAL NOT NULL,
        FOREIGN KEY (estimate_id) REFERENCES estimates (id)
      )`,
      `CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        estimate_id INTEGER,
        client_id INTEGER,
        name TEXT NOT NULL,
        description TEXT,
        start_date DATE,
        end_date DATE,
        status TEXT DEFAULT 'planning',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (estimate_id) REFERENCES estimates (id),
        FOREIGN KEY (client_id) REFERENCES clients (id)
      )`,
      `CREATE TABLE IF NOT EXISTS project_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        name TEXT NOT NULL,
        description TEXT,
        due_date DATE,
        status TEXT DEFAULT 'not_started',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id)
      )`
    ];

    for (const tableSQL of tables) {
      await this.runQuery(tableSQL);
    }
  }

  async seedInitialData() {
    // Check if industries exist
    const industriesCount = await this.getQuery('SELECT COUNT(*) as count FROM industries');
    
    if (industriesCount.count === 0) {
      const industries = [
        { name: 'General Contractor', description: 'General construction contracting' },
        { name: 'Heavy Equipment', description: 'Heavy equipment operation and rental' },
        { name: 'Concrete Construction', description: 'Concrete and masonry work' },
        { name: 'Demolition', description: 'Demolition and site preparation' },
        { name: 'Restoration', description: 'Building restoration and repair' }
      ];

      for (const industry of industries) {
        await this.runQuery(
          'INSERT INTO industries (name, description) VALUES (?, ?)',
          [industry.name, industry.description]
        );
      }

      // Seed sample materials for each industry
      await this.seedMaterials();
      await this.seedLabor();
    }
  }

  async seedMaterials() {
    const materials = [
      // General Contractor (industry_id: 1)
      { name: '2x4 Lumber', description: '8ft Douglas Fir', unit_cost: 8.50, unit_type: 'each', category: 'Lumber', industry_id: 1 },
      { name: 'Plywood 3/4"', description: '4x8 CDX Plywood', unit_cost: 45.00, unit_type: 'sheet', category: 'Lumber', industry_id: 1 },
      { name: 'Drywall 1/2"', description: '4x8 Gypsum Board', unit_cost: 15.00, unit_type: 'sheet', category: 'Drywall', industry_id: 1 },
      
      // Heavy Equipment (industry_id: 2)
      { name: 'Excavator Rental', description: '320 Cat Excavator', unit_cost: 400.00, unit_type: 'day', category: 'Equipment', industry_id: 2 },
      { name: 'Bulldozer Rental', description: 'D6 Bulldozer', unit_cost: 600.00, unit_type: 'day', category: 'Equipment', industry_id: 2 },
      { name: 'Fuel - Diesel', description: 'Off-road diesel', unit_cost: 3.50, unit_type: 'gallon', category: 'Fuel', industry_id: 2 },
      
      // Concrete Construction (industry_id: 3)
      { name: 'Concrete 3000psi', description: 'Ready mix concrete', unit_cost: 120.00, unit_type: 'cubic yard', category: 'Concrete', industry_id: 3 },
      { name: 'Rebar #4', description: '20ft Grade 60 rebar', unit_cost: 12.00, unit_type: 'each', category: 'Reinforcement', industry_id: 3 },
      { name: 'Wire Mesh 6x6', description: 'Welded wire fabric', unit_cost: 2.50, unit_type: 'sq ft', category: 'Reinforcement', industry_id: 3 },
      { name: 'Form Boards', description: '2x12 Form lumber', unit_cost: 25.00, unit_type: 'each', category: 'Forms', industry_id: 3 },
      
      // Demolition (industry_id: 4)
      { name: '30yd Dumpster', description: 'Roll-off container', unit_cost: 450.00, unit_type: 'each', category: 'Disposal', industry_id: 4 },
      { name: 'Jackhammer Rental', description: 'Electric breaker', unit_cost: 75.00, unit_type: 'day', category: 'Tools', industry_id: 4 },
      
      // Restoration (industry_id: 5)
      { name: 'Water Damage Repair', description: 'Per sq ft affected', unit_cost: 8.00, unit_type: 'sq ft', category: 'Restoration', industry_id: 5 },
      { name: 'Mold Remediation', description: 'Per sq ft treatment', unit_cost: 15.00, unit_type: 'sq ft', category: 'Remediation', industry_id: 5 }
    ];

    for (const material of materials) {
      await this.runQuery(
        'INSERT INTO materials (name, description, unit_cost, unit_type, category, industry_id) VALUES (?, ?, ?, ?, ?, ?)',
        [material.name, material.description, material.unit_cost, material.unit_type, material.category, material.industry_id]
      );
    }
  }

  async seedLabor() {
    const laborItems = [
      // General Contractor
      { task_name: 'General Laborer', description: 'Basic construction work', hourly_rate: 25.00, category: 'Labor', industry_id: 1 },
      { task_name: 'Carpenter', description: 'Framing and finish work', hourly_rate: 35.00, category: 'Skilled Labor', industry_id: 1 },
      { task_name: 'Electrician', description: 'Electrical installation', hourly_rate: 45.00, category: 'Trades', industry_id: 1 },
      
      // Heavy Equipment
      { task_name: 'Equipment Operator', description: 'Heavy machinery operation', hourly_rate: 40.00, category: 'Operator', industry_id: 2 },
      { task_name: 'Truck Driver', description: 'Material transport', hourly_rate: 30.00, category: 'Transport', industry_id: 2 },
      
      // Concrete Construction
      { task_name: 'Concrete Finisher', description: 'Concrete finishing work', hourly_rate: 38.00, category: 'Skilled Labor', industry_id: 3 },
      { task_name: 'Rebar Worker', description: 'Reinforcement installation', hourly_rate: 32.00, category: 'Labor', industry_id: 3 },
      
      // Demolition
      { task_name: 'Demolition Worker', description: 'Structure demolition', hourly_rate: 28.00, category: 'Labor', industry_id: 4 },
      
      // Restoration
      { task_name: 'Restoration Specialist', description: 'Damage assessment and repair', hourly_rate: 42.00, category: 'Specialist', industry_id: 5 }
    ];

    for (const labor of laborItems) {
      await this.runQuery(
        'INSERT INTO labor (task_name, description, hourly_rate, category, industry_id) VALUES (?, ?, ?, ?, ?)',
        [labor.task_name, labor.description, labor.hourly_rate, labor.category, labor.industry_id]
      );
    }
  }

  // Helper methods for database operations
  runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('Database error:', err);
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  allQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Business logic methods
  async getIndustries() {
    return await this.allQuery('SELECT * FROM industries ORDER BY name');
  }

  async getClients() {
    return await this.allQuery(`
      SELECT c.*, i.name as industry_name 
      FROM clients c 
      LEFT JOIN industries i ON c.industry_id = i.id 
      ORDER BY c.name
    `);
  }

  async addClient(clientData) {
    const result = await this.runQuery(
      'INSERT INTO clients (name, contact_info, phone, email, address, industry_id) VALUES (?, ?, ?, ?, ?, ?)',
      [clientData.name, clientData.contact_info, clientData.phone, clientData.email, clientData.address, clientData.industry_id]
    );
    return result.lastID;
  }

  async getMaterials(industryId = null) {
    let sql = 'SELECT * FROM materials';
    let params = [];
    
    if (industryId) {
      sql += ' WHERE industry_id = ?';
      params.push(industryId);
    }
    
    sql += ' ORDER BY category, name';
    return await this.allQuery(sql, params);
  }

  async getLabor(industryId = null) {
    let sql = 'SELECT * FROM labor';
    let params = [];
    
    if (industryId) {
      sql += ' WHERE industry_id = ?';
      params.push(industryId);
    }
    
    sql += ' ORDER BY category, task_name';
    return await this.allQuery(sql, params);
  }

  async addMaterial(materialData) {
    const result = await this.runQuery(
      'INSERT INTO materials (name, description, unit_cost, unit_type, category, industry_id) VALUES (?, ?, ?, ?, ?, ?)',
      [materialData.name, materialData.description, materialData.unit_cost, materialData.unit_type, materialData.category, materialData.industry_id]
    );
    return result.lastID;
  }

  async saveEstimate(estimateData) {
    try {
      // Start transaction
      await this.runQuery('BEGIN TRANSACTION');
      
      // Insert estimate
      const estimateResult = await this.runQuery(
        'INSERT INTO estimates (client_id, project_name, subtotal, markup_percentage, total_amount, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [estimateData.client_id, estimateData.project_name, estimateData.subtotal, estimateData.markup_percentage, estimateData.total_amount, estimateData.status || 'draft', estimateData.notes]
      );
      
      const estimateId = estimateResult.lastID;
      
      // Insert estimate items
      for (const item of estimateData.items) {
        await this.runQuery(
          'INSERT INTO estimate_items (estimate_id, item_type, item_id, item_name, description, quantity, unit_cost, total_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [estimateId, item.item_type, item.item_id, item.item_name, item.description, item.quantity, item.unit_cost, item.total_cost]
        );
      }
      
      // Commit transaction
      await this.runQuery('COMMIT');
      
      return estimateId;
    } catch (error) {
      // Rollback on error
      await this.runQuery('ROLLBACK');
      throw error;
    }
  }

  async getEstimates() {
    return await this.allQuery(`
      SELECT e.*, c.name as client_name 
      FROM estimates e 
      LEFT JOIN clients c ON e.client_id = c.id 
      ORDER BY e.date_created DESC
    `);
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = DatabaseManager;