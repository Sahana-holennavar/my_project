import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import notificationQueue from '../services/NotificationQueue';

const serverAdapter = new ExpressAdapter();

createBullBoard({
  queues: [new BullMQAdapter(notificationQueue)],
  serverAdapter,
});

serverAdapter.setBasePath('/api/queue/admin/queues');

export function setupBullBoard(app: any) {
  app.use('/api/queue/admin/queues', serverAdapter.getRouter());
}
