import { expect } from 'chai';
import QueueMonitor from '../src/services/QueueMonitor';
import notificationQueue from '../src/services/NotificationQueue';

describe('QueueMonitor', () => {
  const monitor = new QueueMonitor(notificationQueue);
  it('should return queue stats', async () => {
    const stats = await monitor.getQueueStats();
    expect(stats).to.have.property('waiting');
    expect(stats).to.have.property('active');
    expect(stats).to.have.property('completed');
    expect(stats).to.have.property('failed');
    expect(stats).to.have.property('delayed');
  });
});
