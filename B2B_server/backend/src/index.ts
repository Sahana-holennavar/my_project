import dotenv from "dotenv";
dotenv.config();

import { Server } from 'http';
import App from './app';
import { config } from './config/env';
import { database } from './config/database';
import { socketService } from './services/SocketService';
import { cronService } from './services/CronService';

class ServerBootstrap {
  private app: App;
  private server: Server | null = null;

  constructor() {
    this.app = new App();
  }

  public async start(): Promise<void> {
    try {
      // Initialize database connection
      await this.connectToDatabase();

      // Start HTTP server
      await this.startHttpServer();

      // Initialize Socket.IO
      this.initializeSocketIO();

      // Start cron job for sending reminders
      this.startCronService();

      // Setup graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      console.error('Server startup failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      process.exit(1);
    }
  }

  private async connectToDatabase(): Promise<void> {
    try {
      await database.connect();
      console.log('Database connection established');
    } catch (error) {
      console.warn('Database connection failed, continuing without database:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw error in development, just continue without database
      if (config.NODE_ENV === 'production') {
        throw error;
      }
    }
  }

  private async startHttpServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.getApp().listen(config.PORT, () => {
          console.log('Server started successfully:', {
            port: config.PORT,
            environment: config.NODE_ENV,
            apiVersion: config.API_VERSION,
            timestamp: new Date().toISOString(),
          });
          resolve();
        });

        this.server.on('error', (error: Error) => {
          console.error('Server error:', {
            error: error.message,
            stack: error.stack,
          });
          reject(error);
        });

        // Handle server timeout
        this.server.timeout = 30000; // 30 seconds
        this.server.keepAliveTimeout = 65000; // 65 seconds
        this.server.headersTimeout = 66000; // 66 seconds

      } catch (error) {
        reject(error);
      }
    });
  }

  private initializeSocketIO(): void {
    if (!this.server) {
      throw new Error('HTTP server must be started before initializing Socket.IO');
    }

    socketService.initialize(this.server);
    console.log('Socket.IO initialized successfully');
  }

  private startCronService(): void {
    try {
      cronService.start();
      const status = cronService.getStatus();
      console.log('Cron Service initialized:', status.message);
    } catch (error) {
      console.error('Failed to start cron service:', error);
      throw error;
    }
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string): Promise<void> => {
      console.log(`Received ${signal}. Starting graceful shutdown...`);

      try {
        // Stop cron service first
        cronService.stop();
        console.log('Cron service stopped');

        // Single shutdown logic block
        const shutdownActions = [
          {
            condition: this.server,
            action: async () => {
              // Shutdown Socket.IO first
              await socketService.shutdown();
              console.log('Socket.IO shut down');
              
              this.server!.close(async () => {
                console.log('HTTP server closed');
                await database.disconnect();
                console.log('Database disconnected');
                process.exit(0);
              });
            }
          },
          {
            condition: true, // default case
            action: () => process.exit(0)
          }
        ];

        // Execute first matching shutdown action
        shutdownActions.find(action => action.condition)?.action();

        // Force exit after timeout
        setTimeout(() => {
          console.log('Forced shutdown after timeout');
          process.exit(1);
        }, 10000); // 10 seconds timeout

      } catch (error) {
        console.error('Error during graceful shutdown:', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        process.exit(1);
      }
    };

    // Single signal handler setup
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    signals.forEach(signal => {
      process.on(signal, () => gracefulShutdown(signal));
    });

    // Single error handler setup
    const errorHandlers = [
      {
        event: 'uncaughtException',
        handler: (error: Error) => {
          console.error('Uncaught Exception:', {
            error: error.message,
            stack: error.stack,
          });
          gracefulShutdown('UNCAUGHT_EXCEPTION');
        }
      },
      {
        event: 'unhandledRejection',
        handler: (reason: unknown) => {
          console.error('Unhandled Rejection:', {
            reason: reason instanceof Error ? reason.message : String(reason),
          });
          gracefulShutdown('UNHANDLED_REJECTION');
        }
      }
    ];

    errorHandlers.forEach(({ event, handler }) => {
      process.on(event, handler);
    });
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  const server = new ServerBootstrap();
  server.start().catch((error) => {
    console.error('Failed to start server:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  });
}

export default ServerBootstrap;
