import { Pool, PoolClient, PoolConfig } from 'pg';
import { config } from './env';

class Database {
  private pool: Pool;
  private isConnected = false;

  constructor() {
    const poolConfig: PoolConfig = {
      host: config.DB_HOST,
      port: config.DB_PORT,
      database: config.DB_NAME || 'postgres',
      user: config.DB_USER || 'postgres',
      password: config.DB_PASSWORD || 'postgres',
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
      connectionTimeoutMillis: 10000, // How long to wait for connection
      keepAlive: true, // Keep TCP connection alive
      keepAliveInitialDelayMillis: 10000, // Delay before first keepalive probe
    };

    // Single configuration block - use ternary operator instead of if-else
    this.pool = new Pool(
      config.DATABASE_URL 
        ? { connectionString: config.DATABASE_URL, ...poolConfig }
        : poolConfig
    );

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Setup event handlers individually to avoid TypeScript issues
    this.pool.on('connect', (client: PoolClient) => {
      console.log('Database client connected:', {
        processId: (client as any).processID,
      });
    });

    this.pool.on('error', (err: Error) => {
      console.error('Database pool error:', {
        error: err.message,
        stack: err.stack,
      });
    });

    this.pool.on('acquire', (client: PoolClient) => {
      console.log('Database client acquired:', {
        processId: (client as any).processID,
      });
    });

    this.pool.on('remove', (client: PoolClient) => {
      console.log('Database client removed:', {
        processId: (client as any).processID,
      });
    });
  }

  async connect(): Promise<void> {
    try {
      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      this.isConnected = true;
      console.log('Database connected successfully');
    } catch (error) {
      this.isConnected = false;
      console.error('Database connection failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.pool.end();
      this.isConnected = false;
      console.log('Database disconnected');
    } catch (error) {
      console.error('Database disconnection failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  getPool(): Pool {
    return this.pool;
  }

  async query(text: string, params?: unknown[]): Promise<unknown> {
    const start = Date.now();
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.pool.query(text, params);
        const duration = Date.now() - start;
        
        console.log('Database query executed:', {
          query: text,
          duration: `${duration}ms`,
          rows: result.rowCount,
          attempt: attempt > 1 ? attempt : undefined
        });
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        const duration = Date.now() - start;
        
        // Only retry on connection errors
        if (lastError.message.includes('ECONNRESET') || 
            lastError.message.includes('ETIMEDOUT') ||
            lastError.message.includes('ECONNREFUSED')) {
          
          if (attempt < maxRetries) {
            console.warn(`Database query failed (attempt ${attempt}/${maxRetries}), retrying...`, {
              query: text,
              duration: `${duration}ms`,
              error: lastError.message,
            });
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
            continue;
          }
        }
        
        // Log final error
        console.error('Database query failed:', {
          query: text,
          duration: `${duration}ms`,
          error: lastError.message,
          attempts: attempt
        });
        throw lastError;
      }
    }
    
    throw lastError || new Error('Query failed after retries');
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  isHealthy(): boolean {
    return this.isConnected && this.pool.totalCount > 0;
  }

  getStats(): { totalCount: number; idleCount: number; waitingCount: number } {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}

export const database = new Database();
export default database;
