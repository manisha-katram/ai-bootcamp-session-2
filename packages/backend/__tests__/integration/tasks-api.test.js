const request = require('supertest');
const { app, db, resetDatabase } = require('../../src/app');

describe('tasks api integration', () => {
  beforeEach(() => {
    resetDatabase();
  });

  afterAll(() => {
    if (db && db.open) {
      db.close();
    }
  });

  const createTask = async (overrides = {}) => {
    const response = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Default task',
        description: 'default',
        priority: 'medium',
        ...overrides,
      })
      .set('Accept', 'application/json');

    expect(response.status).toBe(201);
    return response.body;
  };

  it('creates and fetches tasks', async () => {
    await createTask({ title: 'Task A' });

    const response = await request(app).get('/api/tasks');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].title).toBe('Task A');
  });

  it('updates an existing task', async () => {
    const task = await createTask({ title: 'Edit me' });

    const response = await request(app).patch(`/api/tasks/${task.id}`).send({
      title: 'Edited',
      priority: 'high',
      tags: ['urgent'],
    });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe('Edited');
    expect(response.body.priority).toBe('high');
    expect(response.body.tags).toEqual(['urgent']);
  });

  it('toggles task completion', async () => {
    const task = await createTask({ title: 'Toggle me' });

    const complete = await request(app).patch(`/api/tasks/${task.id}/toggle`);
    expect(complete.status).toBe(200);
    expect(complete.body.status).toBe('completed');

    const active = await request(app).patch(`/api/tasks/${task.id}/toggle`);
    expect(active.status).toBe(200);
    expect(active.body.status).toBe('active');
  });

  it('archives a task', async () => {
    const task = await createTask({ title: 'Archive me' });

    const response = await request(app).post(`/api/tasks/${task.id}/archive`);
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('archived');
  });

  it('filters tasks by status', async () => {
    const first = await createTask({ title: 'Done me' });
    await createTask({ title: 'Keep active' });
    await request(app).patch(`/api/tasks/${first.id}/toggle`);

    const response = await request(app).get('/api/tasks?status=completed');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].status).toBe('completed');
  });

  it('supports batch complete and delete', async () => {
    const one = await createTask({ title: 'One' });
    const two = await createTask({ title: 'Two' });

    const complete = await request(app).post('/api/tasks/batch/complete').send({ ids: [one.id, two.id] });
    expect(complete.status).toBe(200);
    expect(complete.body).toHaveLength(2);

    const remove = await request(app).post('/api/tasks/batch/delete').send({ ids: [one.id, two.id] });
    expect(remove.status).toBe(200);
    expect(remove.body.deletedCount).toBe(2);
  });

  it('clears completed tasks', async () => {
    const done = await createTask({ title: 'Done' });
    await createTask({ title: 'Active' });
    await request(app).patch(`/api/tasks/${done.id}/toggle`);

    const response = await request(app).delete('/api/tasks/completed');
    expect(response.status).toBe(200);
    expect(response.body.deletedCount).toBe(1);

    const all = await request(app).get('/api/tasks');
    expect(all.body).toHaveLength(1);
    expect(all.body[0].title).toBe('Active');
  });
});
