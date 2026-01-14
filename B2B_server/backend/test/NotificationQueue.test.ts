import { NotificationModel } from '../src/models/Notification';
import { database } from '../src/config/database';
before(async () => {
  NotificationModel.prototype.pool = database.getPool();
});
import { expect } from 'chai';
import notificationQueue from '../src/services/NotificationQueue';
import { validateNotificationJob } from '../src/utils/validators';
import { NotificationAuditModel } from '../src/models/NotificationAudit';

before(async () => {
  NotificationModel.prototype.pool = database.getPool(); // or a mock pool if you want to avoid real DB
  NotificationAuditModel.prototype.pool = database.getPool();
});

describe('NotificationQueue', () => {
  it('should enqueue a valid job and return a job ID', async () => {
    const payload = {
      userId: '161ab98e-645e-440c-8742-bbf605c91bb7',
      content: 'Test notification',
      type: 'info',
      senderId: '161ab98e-645e-440c-8742-bbf605c91bb7',
    };
    const { error } = validateNotificationJob(payload);
    expect(error).to.be.undefined;
    const jobId = await notificationQueue.enqueue(payload, 'normal', 0, false);
    expect(jobId).to.not.be.undefined;
  });
});
