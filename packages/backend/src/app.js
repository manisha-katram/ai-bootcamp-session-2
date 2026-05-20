const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const Database = require('better-sqlite3');
const {
  formatTask,
  normalizeSort,
  parseTaskInput,
  parseUpdateInput,
} = require('./task-utils');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const DB_PATH = process.env.NODE_ENV === 'test' ? ':memory:' : process.env.DB_PATH || 'todo.db';
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    due_date TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    tags TEXT NOT NULL DEFAULT '[]',
    list_name TEXT NOT NULL DEFAULT 'General',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TRIGGER IF NOT EXISTS tasks_updated_at
  AFTER UPDATE ON tasks
  FOR EACH ROW
  BEGIN
    UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
  END;
`);

const selectTaskByIdStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
const selectAllTasksStmt = db.prepare('SELECT * FROM tasks');
const insertTaskStmt = db.prepare(`
  INSERT INTO tasks (title, description, status, due_date, priority, tags, list_name)
  VALUES (@title, @description, @status, @dueDate, @priority, @tags, @listName)
`);
const deleteTaskStmt = db.prepare('DELETE FROM tasks WHERE id = ?');
const clearCompletedStmt = db.prepare("DELETE FROM tasks WHERE status = 'completed'");

function resetDatabase() {
  db.exec('DELETE FROM tasks');
}

function getTaskOr404(taskId, res) {
  const existing = selectTaskByIdStmt.get(taskId);
  if (!existing) {
    res.status(404).json({ error: 'Task not found' });
    return null;
  }
  return existing;
}

function applyInMemoryFilters(tasks, query) {
  let result = [...tasks];

  if (query.status && query.status !== 'all') {
    result = result.filter(task => task.status === query.status);
  }

  if (query.priority) {
    result = result.filter(task => task.priority === query.priority);
  }

  if (query.list) {
    result = result.filter(task => task.listName.toLowerCase() === query.list.toLowerCase());
  }

  if (query.q) {
    const searchTerm = query.q.toLowerCase();
    result = result.filter(task => {
      return (
        task.title.toLowerCase().includes(searchTerm) ||
        task.description.toLowerCase().includes(searchTerm)
      );
    });
  }

  if (query.tag) {
    const targetTag = query.tag.toLowerCase();
    result = result.filter(task => task.tags.some(tag => tag.toLowerCase() === targetTag));
  }

  if (query.dueFilter) {
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + 7);

    result = result.filter(task => {
      if (!task.dueDate) {
        return false;
      }

      const dueDate = new Date(task.dueDate);
      if (query.dueFilter === 'today') {
        return dueDate <= endOfToday && dueDate >= now;
      }

      if (query.dueFilter === 'week') {
        return dueDate <= endOfWeek && dueDate >= now;
      }

      if (query.dueFilter === 'overdue') {
        return dueDate < now && task.status !== 'completed';
      }

      return true;
    });
  }

  return result;
}

function sortTasks(tasks, query) {
  const { field, order } = normalizeSort(query.sortBy, query.order);
  const direction = order === 'asc' ? 1 : -1;
  const priorityWeight = { low: 1, medium: 2, high: 3 };

  return [...tasks].sort((a, b) => {
    let left = a[field];
    let right = b[field];

    if (field === 'priority') {
      left = priorityWeight[left] || 0;
      right = priorityWeight[right] || 0;
    }

    if (field === 'dueDate') {
      left = left ? new Date(left).getTime() : Number.MAX_SAFE_INTEGER;
      right = right ? new Date(right).getTime() : Number.MAX_SAFE_INTEGER;
    }

    if (typeof left === 'string') {
      left = left.toLowerCase();
      right = right.toLowerCase();
    }

    if (left < right) {
      return -1 * direction;
    }

    if (left > right) {
      return 1 * direction;
    }

    return 0;
  });
}

app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'TODO backend server is running' });
});

app.get('/api/tasks', (req, res) => {
  try {
    const rows = selectAllTasksStmt.all();
    const tasks = rows.map(formatTask);
    const filteredTasks = applyInMemoryFilters(tasks, req.query);
    const sortedTasks = sortTasks(filteredTasks, req.query);
    res.json(sortedTasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.get('/api/tasks/:id', (req, res) => {
  try {
    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId)) {
      return res.status(400).json({ error: 'Valid task ID is required' });
    }

    const task = getTaskOr404(taskId, res);
    if (!task) {
      return;
    }

    return res.json(formatTask(task));
  } catch (error) {
    console.error('Error fetching task:', error);
    return res.status(500).json({ error: 'Failed to fetch task' });
  }
});

app.post('/api/tasks', (req, res) => {
  try {
    const taskInput = parseTaskInput(req.body);
    const result = insertTaskStmt.run(taskInput);
    const newTask = selectTaskByIdStmt.get(result.lastInsertRowid);
    return res.status(201).json(formatTask(newTask));
  } catch (error) {
    if (error.name === 'TypeError') {
      return res.status(400).json({ error: error.message });
    }

    console.error('Error creating task:', error);
    return res.status(500).json({ error: 'Failed to create task' });
  }
});

app.patch('/api/tasks/:id', (req, res) => {
  try {
    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId)) {
      return res.status(400).json({ error: 'Valid task ID is required' });
    }

    const existingTask = getTaskOr404(taskId, res);
    if (!existingTask) {
      return;
    }

    const updates = parseUpdateInput(req.body, formatTask(existingTask));
    const updateStmt = db.prepare(`
      UPDATE tasks
      SET title = @title,
          description = @description,
          status = @status,
          due_date = @dueDate,
          priority = @priority,
          tags = @tags,
          list_name = @listName
      WHERE id = @id
    `);

    updateStmt.run({ id: taskId, ...updates });
    const updated = selectTaskByIdStmt.get(taskId);
    return res.json(formatTask(updated));
  } catch (error) {
    if (error.name === 'TypeError') {
      return res.status(400).json({ error: error.message });
    }

    console.error('Error updating task:', error);
    return res.status(500).json({ error: 'Failed to update task' });
  }
});

app.patch('/api/tasks/:id/toggle', (req, res) => {
  try {
    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId)) {
      return res.status(400).json({ error: 'Valid task ID is required' });
    }

    const existingTask = getTaskOr404(taskId, res);
    if (!existingTask) {
      return;
    }

    const nextStatus = existingTask.status === 'completed' ? 'active' : 'completed';
    db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(nextStatus, taskId);
    const updated = selectTaskByIdStmt.get(taskId);
    return res.json(formatTask(updated));
  } catch (error) {
    console.error('Error toggling task:', error);
    return res.status(500).json({ error: 'Failed to toggle task' });
  }
});

app.post('/api/tasks/:id/archive', (req, res) => {
  try {
    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId)) {
      return res.status(400).json({ error: 'Valid task ID is required' });
    }

    const existingTask = getTaskOr404(taskId, res);
    if (!existingTask) {
      return;
    }

    db.prepare("UPDATE tasks SET status = 'archived' WHERE id = ?").run(taskId);
    const archived = selectTaskByIdStmt.get(taskId);
    return res.json(formatTask(archived));
  } catch (error) {
    console.error('Error archiving task:', error);
    return res.status(500).json({ error: 'Failed to archive task' });
  }
});

app.post('/api/tasks/batch/complete', (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' });
    }

    const validIds = ids.map(Number).filter(Number.isInteger);
    if (validIds.length !== ids.length) {
      return res.status(400).json({ error: 'ids must contain valid task IDs' });
    }

    const placeholders = validIds.map(() => '?').join(', ');
    db.prepare(`UPDATE tasks SET status = 'completed' WHERE id IN (${placeholders})`).run(...validIds);
    const updated = db.prepare(`SELECT * FROM tasks WHERE id IN (${placeholders})`).all(...validIds);
    return res.json(updated.map(formatTask));
  } catch (error) {
    console.error('Error completing tasks:', error);
    return res.status(500).json({ error: 'Failed to complete tasks' });
  }
});

app.post('/api/tasks/batch/delete', (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' });
    }

    const validIds = ids.map(Number).filter(Number.isInteger);
    if (validIds.length !== ids.length) {
      return res.status(400).json({ error: 'ids must contain valid task IDs' });
    }

    const placeholders = validIds.map(() => '?').join(', ');
    const result = db.prepare(`DELETE FROM tasks WHERE id IN (${placeholders})`).run(...validIds);
    return res.json({ deletedCount: result.changes });
  } catch (error) {
    console.error('Error deleting tasks:', error);
    return res.status(500).json({ error: 'Failed to delete tasks' });
  }
});

app.delete('/api/tasks/completed', (req, res) => {
  try {
    const result = clearCompletedStmt.run();
    return res.json({ deletedCount: result.changes });
  } catch (error) {
    console.error('Error clearing completed tasks:', error);
    return res.status(500).json({ error: 'Failed to clear completed tasks' });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  try {
    const taskId = Number(req.params.id);

    if (!Number.isInteger(taskId)) {
      return res.status(400).json({ error: 'Valid task ID is required' });
    }

    const task = getTaskOr404(taskId, res);
    if (!task) {
      return;
    }

    deleteTaskStmt.run(taskId);
    return res.json({ message: 'Task deleted successfully', id: taskId });
  } catch (error) {
    console.error('Error deleting task:', error);
    return res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Legacy compatibility routes for original app tests.
app.get('/api/items', (req, res) => {
  try {
    const tasks = sortTasks(selectAllTasksStmt.all().map(formatTask), {
      sortBy: 'createdAt',
      order: 'desc',
    });
    const items = tasks.map(task => ({
      id: task.id,
      name: task.title,
      created_at: task.createdAt,
    }));

    return res.json(items);
  } catch (error) {
    console.error('Error fetching legacy items:', error);
    return res.status(500).json({ error: 'Failed to fetch items' });
  }
});

app.post('/api/items', (req, res) => {
  try {
    const taskInput = parseTaskInput({ title: req.body.name });
    const result = insertTaskStmt.run(taskInput);
    const created = selectTaskByIdStmt.get(result.lastInsertRowid);
    return res.status(201).json({
      id: created.id,
      name: created.title,
      created_at: created.created_at,
    });
  } catch (error) {
    if (error.name === 'TypeError') {
      return res.status(400).json({ error: 'Item name is required' });
    }

    return res.status(500).json({ error: 'Failed to create item' });
  }
});

app.delete('/api/items/:id', (req, res) => {
  try {
    const taskId = Number(req.params.id);

    if (!Number.isInteger(taskId)) {
      return res.status(400).json({ error: 'Valid item ID is required' });
    }

    const existing = selectTaskByIdStmt.get(taskId);
    if (!existing) {
      return res.status(404).json({ error: 'Item not found' });
    }

    deleteTaskStmt.run(taskId);
    return res.json({ message: 'Item deleted successfully', id: taskId });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = { app, db, resetDatabase };