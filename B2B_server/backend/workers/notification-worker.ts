#!/usr/bin/env node
/**
 * Notification Worker Entry Point
 * Standalone process that consumes notification jobs from BullMQ queue
 * Run this file independently: node workers/notification-worker.ts
 */

import { NotificationWorker } from '../src/services/NotificationWorker';
import { database } from '../src/config/database';

let worker: NotificationWorker | null = null;

/**
 * Initialize and start the notification worker
 */
async function startWorker() {
  try {
    // Connect to database
    await database.connect();

    // Initialize worker
    worker = new NotificationWorker();

    // Keep process running
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    console.error('Failed to start worker:', error);
    process.exit(1);
  }
}

/**
 * Gracefully shutdown worker
 * Ensures current jobs complete before closing connections
 */
async function gracefulShutdown() {
  
  try {
    if (worker) {
      await worker.close();
    }

    await database.disconnect();

    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Start the worker
startWorker();

