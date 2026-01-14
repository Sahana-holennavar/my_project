import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';

class App {
  private app: Application;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Trust proxy for proper IP address extraction
    this.app.set('trust proxy', true);
    console.log('Trust proxy configured');

    // Single middleware configuration
    const middlewareConfig = [
      { middleware: helmet(), name: 'helmet' },
      { middleware: cors({ 
          origin: config.ALLOWED_ORIGINS || ['http://localhost:4000', 'http://localhost:4567'],
          credentials: true,
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
          allowedHeaders: ['Content-Type', 'Authorization'],
          exposedHeaders: ['Content-Disposition']
        }), name: 'cors' },
      { middleware: express.json({ limit: '10mb' }), name: 'json' },
      { middleware: express.urlencoded({ extended: true, limit: '10mb' }), name: 'urlencoded' },
      { middleware: morgan('combined'), name: 'morgan' }
    ];

    // Single loop to setup all middleware
    middlewareConfig.forEach(({ middleware, name }) => {
      this.app.use(middleware);
      console.log(`Middleware ${name} configured`);
    });
  }

  private setupRoutes(): void {
    // Health check route
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.NODE_ENV,
        version: config.API_VERSION
      });
    });

    // Single route setup
    this.app.use('/api', routes);
    console.log('Routes configured');
  }

  private setupErrorHandling(): void {
    // Single error handling setup
    this.app.use(errorHandler);
    console.log('Error handling configured');
  }

  getApp(): Application {
    return this.app;
  }
}

export default App;
