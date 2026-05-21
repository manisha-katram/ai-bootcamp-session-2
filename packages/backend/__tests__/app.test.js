const request = require('supertest');
const { app, db, resetDatabase } = require('../src/app');

beforeEach(() => {
  resetDatabase();
});

afterAll(() => {
  if (db && db.open) {
    db.close();
  }
});

// Helper: create a task and assert 201
const createTask = async (overrides = {}) => {
  const response = await request(app)
    .post('/api/tasks')
    .send({ title: 'Test task', priority: 'medium', ...overrides })
    .set('Accept', 'application/json');
  expect(response.status).toBe(201);
  return response.body;
};

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
describe('GET /', () => {
  it('returns 200 with status ok', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});

// ---------------------------------------------------------------------------
// GET /api/tasks
// ---------------------------------------------------------------------------
describe('GET /api/tasks', () => {
  it('returns an empty array when no tasks exist', async () => {
    const response = await request(app).get('/api/tasks');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('returns all tasks', async () => {
    await createTask({ title: 'Task A' });
    await createTask({ title: 'Task B' });

    const response = await request(app).get('/api/tasks');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  it('filters by status=active', async () => {
    const task = await createTask({ title: 'Active one' });
    await createTask({ title: 'Another' });
    await request(app).patch(`/api/tasks/${task.id}/toggle`); // → completed

    const response = await request(app).get('/api/tasks?status=active');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].title).toBe('Another');
  });

  it('filters by status=completed', async () => {
    const task = await createTask({ title: 'Finish me' });
    await createTask({ title: 'Stay active' });
    await request(app).patch(`/api/tasks/${task.id}/toggle`);

    const response = await request(app).get('/api/tasks?status=completed');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].status).toBe('completed');
  });

  it('filters by status=archived', async () => {
    const task = await createTask({ title: 'Archive me' });
    await createTask({ title: 'Keep active' });
    await request(app).post(`/api/tasks/${task.id}/archive`);

    const response = await request(app).get('/api/tasks?status=archived');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].status).toBe('archived');
  });

  it('filters by priority', async () => {
    await createTask({ title: 'High task', priority: 'high' });
    await createTask({ title: 'Low task', priority: 'low' });

    const response = await request(app).get('/api/tasks?priority=high');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].title).toBe('High task');
  });

  it('filters by list name', async () => {
    await createTask({ title: 'Work task', listName: 'Work' });
    await createTask({ title: 'Personal task', listName: 'Personal' });

    const response = await request(app).get('/api/tasks?list=work');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].listName).toBe('Work');
  });

  it('filters by search query in title', async () => {
    await createTask({ title: 'Buy groceries' });
    await createTask({ title: 'Send report' });

    const response = await request(app).get('/api/tasks?q=groceries');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].title).toBe('Buy groceries');
  });

  it('filters by search query in description', async () => {
    await createTask({ title: 'Task A', description: 'includes keywords here' });
    await createTask({ title: 'Task B', description: 'nothing special' });

    const response = await request(app).get('/api/tasks?q=keywords');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].title).toBe('Task A');
  });

  it('filters by tag', async () => {
    await createTask({ title: 'Tagged', tags: ['urgent', 'work'] });
    await createTask({ title: 'Untagged', tags: [] });

    const response = await request(app).get('/api/tasks?tag=urgent');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].title).toBe('Tagged');
  });

  it('filters by dueFilter=overdue', async () => {
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await createTask({ title: 'Overdue task', dueDate: pastDate });
    await createTask({ title: 'Future task', dueDate: futureDate });
    await createTask({ title: 'No due date task' });

    const response = await request(app).get('/api/tasks?dueFilter=overdue');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].title).toBe('Overdue task');
  });

  it('does not include completed tasks in dueFilter=overdue', async () => {
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const task = await createTask({ title: 'Done overdue', dueDate: pastDate });
    await request(app).patch(`/api/tasks/${task.id}/toggle`); // → completed

    const response = await request(app).get('/api/tasks?dueFilter=overdue');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(0);
  });

  it('filters by dueFilter=today', async () => {
    const inOneHour = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const inTenDays = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

    await createTask({ title: 'Due today', dueDate: inOneHour });
    await createTask({ title: 'Due later', dueDate: inTenDays });
    await createTask({ title: 'No due date' });

    const response = await request(app).get('/api/tasks?dueFilter=today');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].title).toBe('Due today');
  });

  it('filters by dueFilter=week', async () => {
    const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const inTenDays = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

    await createTask({ title: 'Due this week', dueDate: inThreeDays });
    await createTask({ title: 'Due later', dueDate: inTenDays });

    const response = await request(app).get('/api/tasks?dueFilter=week');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].title).toBe('Due this week');
  });

  it('sorts by title ascending', async () => {
    await createTask({ title: 'Zebra' });
    await createTask({ title: 'Apple' });
    await createTask({ title: 'Mango' });

    const response = await request(app).get('/api/tasks?sortBy=title&order=asc');
    expect(response.status).toBe(200);
    expect(response.body.map(t => t.title)).toEqual(['Apple', 'Mango', 'Zebra']);
  });

  it('sorts by title descending', async () => {
    await createTask({ title: 'Zebra' });
    await createTask({ title: 'Apple' });

    const response = await request(app).get('/api/tasks?sortBy=title&order=desc');
    expect(response.status).toBe(200);
    expect(response.body[0].title).toBe('Zebra');
    expect(response.body[1].title).toBe('Apple');
  });

  it('sorts by priority descending (high > medium > low)', async () => {
    await createTask({ title: 'Low', priority: 'low' });
    await createTask({ title: 'High', priority: 'high' });
    await createTask({ title: 'Medium', priority: 'medium' });

    const response = await request(app).get('/api/tasks?sortBy=priority&order=desc');
    expect(response.status).toBe(200);
    const priorities = response.body.map(t => t.priority);
    expect(priorities[0]).toBe('high');
    expect(priorities[priorities.length - 1]).toBe('low');
  });

  it('sorts by dueDate ascending (null dates sort last)', async () => {
    const date1 = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
    const date2 = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

    await createTask({ title: 'Later', dueDate: date2 });
    await createTask({ title: 'No date' });
    await createTask({ title: 'Sooner', dueDate: date1 });

    const response = await request(app).get('/api/tasks?sortBy=dueDate&order=asc');
    expect(response.status).toBe(200);
    expect(response.body[0].title).toBe('Sooner');
    expect(response.body[1].title).toBe('Later');
    expect(response.body[2].title).toBe('No date');
  });
});

// ---------------------------------------------------------------------------
// GET /api/tasks/:id
// ---------------------------------------------------------------------------
describe('GET /api/tasks/:id', () => {
  it('returns the task when it exists', async () => {
    const created = await createTask({ title: 'Fetch me' });

    const response = await request(app).get(`/api/tasks/${created.id}`);
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(created.id);
    expect(response.body.title).toBe('Fetch me');
  });

  it('returns 404 for a non-existent task', async () => {
    const response = await request(app).get('/api/tasks/99999');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Task not found');
  });

  it('returns 400 for a non-integer ID', async () => {
    const response = await request(app).get('/api/tasks/abc');
    expect(response.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /api/tasks
// ---------------------------------------------------------------------------
describe('POST /api/tasks', () => {
  it('creates a task with only a title', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({ title: 'Minimal task' });

    expect(response.status).toBe(201);
    expect(response.body.title).toBe('Minimal task');
    expect(response.body.priority).toBe('medium');
    expect(response.body.status).toBe('active');
    expect(response.body.listName).toBe('General');
    expect(response.body.tags).toEqual([]);
  });

  it('creates a task with all fields', async () => {
    const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const response = await request(app).post('/api/tasks').send({
      title: 'Full task',
      description: 'A full description',
      priority: 'high',
      dueDate,
      tags: ['work', 'urgent'],
      listName: 'Sprint',
      status: 'active',
    });

    expect(response.status).toBe(201);
    expect(response.body.title).toBe('Full task');
    expect(response.body.description).toBe('A full description');
    expect(response.body.priority).toBe('high');
    expect(response.body.tags).toEqual(['work', 'urgent']);
    expect(response.body.listName).toBe('Sprint');
  });

  it('returns 400 when title is missing', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({ description: 'No title here' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/title/i);
  });

  it('returns 400 when title is blank', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({ title: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/title/i);
  });

  it('returns 400 when priority is invalid', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({ title: 'Bad priority', priority: 'critical' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/priority/i);
  });

  it('returns 400 when tags is not an array', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({ title: 'Bad tags', tags: 'urgent' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/tags/i);
  });

  it('returns 400 when dueDate is invalid', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({ title: 'Bad date', dueDate: 'not-a-date' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/dueDate/i);
  });

  it('returns 400 when status is invalid', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({ title: 'Bad status', status: 'pending' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/status/i);
  });

  it('trims whitespace from title', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({ title: '  Padded title  ' });

    expect(response.status).toBe(201);
    expect(response.body.title).toBe('Padded title');
  });

  it('includes isOverdue=false for tasks with a future due date', async () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const response = await request(app)
      .post('/api/tasks')
      .send({ title: 'Not overdue', dueDate: future });

    expect(response.status).toBe(201);
    expect(response.body.isOverdue).toBe(false);
  });

  it('includes isOverdue=true for tasks with a past due date', async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const response = await request(app)
      .post('/api/tasks')
      .send({ title: 'Overdue task', dueDate: past });

    expect(response.status).toBe(201);
    expect(response.body.isOverdue).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/tasks/:id
// ---------------------------------------------------------------------------
describe('PATCH /api/tasks/:id', () => {
  it('updates task fields', async () => {
    const task = await createTask({ title: 'Original' });

    const response = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .send({ title: 'Updated', priority: 'high', tags: ['new-tag'] });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe('Updated');
    expect(response.body.priority).toBe('high');
    expect(response.body.tags).toEqual(['new-tag']);
  });

  it('preserves existing fields when only partial update is sent', async () => {
    const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const task = await createTask({ title: 'Partial', description: 'keep me', dueDate });

    const response = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .send({ title: 'Partial updated' });

    expect(response.status).toBe(200);
    expect(response.body.description).toBe('keep me');
    expect(response.body.dueDate).toBeDefined();
  });

  it('returns 404 for a non-existent task', async () => {
    const response = await request(app)
      .patch('/api/tasks/99999')
      .send({ title: 'Ghost' });

    expect(response.status).toBe(404);
  });

  it('returns 400 when updating with a blank title', async () => {
    const task = await createTask({ title: 'Has title' });

    const response = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .send({ title: '' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/title/i);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/tasks/:id/toggle
// ---------------------------------------------------------------------------
describe('PATCH /api/tasks/:id/toggle', () => {
  it('toggles an active task to completed', async () => {
    const task = await createTask({ title: 'Toggle me' });

    const response = await request(app).patch(`/api/tasks/${task.id}/toggle`);
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('completed');
  });

  it('toggles a completed task back to active', async () => {
    const task = await createTask({ title: 'Toggle back' });
    await request(app).patch(`/api/tasks/${task.id}/toggle`); // → completed

    const response = await request(app).patch(`/api/tasks/${task.id}/toggle`);
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('active');
  });

  it('returns 404 for a non-existent task', async () => {
    const response = await request(app).patch('/api/tasks/99999/toggle');
    expect(response.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// POST /api/tasks/:id/archive
// ---------------------------------------------------------------------------
describe('POST /api/tasks/:id/archive', () => {
  it('archives a task', async () => {
    const task = await createTask({ title: 'Archive me' });

    const response = await request(app).post(`/api/tasks/${task.id}/archive`);
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('archived');
  });

  it('returns 404 for a non-existent task', async () => {
    const response = await request(app).post('/api/tasks/99999/archive');
    expect(response.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// POST /api/tasks/batch/complete
// ---------------------------------------------------------------------------
describe('POST /api/tasks/batch/complete', () => {
  it('marks multiple tasks as completed', async () => {
    const one = await createTask({ title: 'One' });
    const two = await createTask({ title: 'Two' });

    const response = await request(app)
      .post('/api/tasks/batch/complete')
      .send({ ids: [one.id, two.id] });

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body.every(t => t.status === 'completed')).toBe(true);
  });

  it('returns 400 when ids is empty', async () => {
    const response = await request(app)
      .post('/api/tasks/batch/complete')
      .send({ ids: [] });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/ids/i);
  });

  it('returns 400 when ids is not an array', async () => {
    const response = await request(app)
      .post('/api/tasks/batch/complete')
      .send({ ids: 'not-an-array' });

    expect(response.status).toBe(400);
  });

  it('returns 400 when ids contains non-integer values', async () => {
    const response = await request(app)
      .post('/api/tasks/batch/complete')
      .send({ ids: ['abc', 'def'] });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/valid task IDs/i);
  });
});

// ---------------------------------------------------------------------------
// POST /api/tasks/batch/delete
// ---------------------------------------------------------------------------
describe('POST /api/tasks/batch/delete', () => {
  it('deletes multiple tasks', async () => {
    const one = await createTask({ title: 'Delete A' });
    const two = await createTask({ title: 'Delete B' });
    await createTask({ title: 'Keep' });

    const response = await request(app)
      .post('/api/tasks/batch/delete')
      .send({ ids: [one.id, two.id] });

    expect(response.status).toBe(200);
    expect(response.body.deletedCount).toBe(2);

    const all = await request(app).get('/api/tasks');
    expect(all.body).toHaveLength(1);
    expect(all.body[0].title).toBe('Keep');
  });

  it('returns 400 when ids is empty', async () => {
    const response = await request(app)
      .post('/api/tasks/batch/delete')
      .send({ ids: [] });

    expect(response.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/tasks/completed
// ---------------------------------------------------------------------------
describe('DELETE /api/tasks/completed', () => {
  it('removes all completed tasks', async () => {
    const done1 = await createTask({ title: 'Done 1' });
    const done2 = await createTask({ title: 'Done 2' });
    await createTask({ title: 'Keep active' });

    await request(app).patch(`/api/tasks/${done1.id}/toggle`);
    await request(app).patch(`/api/tasks/${done2.id}/toggle`);

    const response = await request(app).delete('/api/tasks/completed');
    expect(response.status).toBe(200);
    expect(response.body.deletedCount).toBe(2);

    const all = await request(app).get('/api/tasks');
    expect(all.body).toHaveLength(1);
    expect(all.body[0].title).toBe('Keep active');
  });

  it('returns deletedCount 0 when no completed tasks exist', async () => {
    await createTask({ title: 'Active task' });

    const response = await request(app).delete('/api/tasks/completed');
    expect(response.status).toBe(200);
    expect(response.body.deletedCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/tasks/:id
// ---------------------------------------------------------------------------
describe('DELETE /api/tasks/:id', () => {
  it('deletes an existing task', async () => {
    const task = await createTask({ title: 'Delete me' });

    const response = await request(app).delete(`/api/tasks/${task.id}`);
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(task.id);

    const check = await request(app).get(`/api/tasks/${task.id}`);
    expect(check.status).toBe(404);
  });

  it('returns 404 for a non-existent task', async () => {
    const response = await request(app).delete('/api/tasks/99999');
    expect(response.status).toBe(404);
  });

  it('returns 400 for a non-integer ID', async () => {
    const response = await request(app).delete('/api/tasks/not-a-number');
    expect(response.status).toBe(400);
  });
});
