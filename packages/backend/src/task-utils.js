const VALID_STATUS = new Set(['active', 'completed', 'archived']);
const VALID_PRIORITY = new Set(['low', 'medium', 'high']);

function parseIsoDateOrNull(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new TypeError('dueDate must be a valid date');
  }

  return parsed.toISOString();
}

function parseTags(tags) {
  if (tags === undefined || tags === null) {
    return [];
  }

  if (!Array.isArray(tags)) {
    throw new TypeError('tags must be an array');
  }

  return tags
    .map(tag => String(tag).trim())
    .filter(Boolean)
    .slice(0, 10);
}

function assertTitle(title) {
  if (!title || typeof title !== 'string' || title.trim() === '') {
    throw new TypeError('Task title is required');
  }

  return title.trim();
}

function parseStatus(status, fallback = 'active') {
  const resolved = status ?? fallback;

  if (!VALID_STATUS.has(resolved)) {
    throw new TypeError('status must be one of active, completed, archived');
  }

  return resolved;
}

function parsePriority(priority, fallback = 'medium') {
  const resolved = priority ?? fallback;
  if (!VALID_PRIORITY.has(resolved)) {
    throw new TypeError('priority must be one of low, medium, high');
  }

  return resolved;
}

function parseListName(listName, fallback = 'General') {
  if (listName === undefined || listName === null || String(listName).trim() === '') {
    return fallback;
  }

  return String(listName).trim();
}

function parseTaskInput(input) {
  return {
    title: assertTitle(input.title),
    description: input.description ? String(input.description).trim() : '',
    status: parseStatus(input.status, 'active'),
    dueDate: parseIsoDateOrNull(input.dueDate),
    priority: parsePriority(input.priority, 'medium'),
    tags: JSON.stringify(parseTags(input.tags)),
    listName: parseListName(input.listName, 'General'),
  };
}

function parseUpdateInput(input, existingTask) {
  return {
    title: input.title !== undefined ? assertTitle(input.title) : existingTask.title,
    description:
      input.description !== undefined ? String(input.description).trim() : existingTask.description,
    status: parseStatus(input.status, existingTask.status),
    dueDate: parseIsoDateOrNull(input.dueDate !== undefined ? input.dueDate : existingTask.dueDate),
    priority: parsePriority(input.priority, existingTask.priority),
    tags: JSON.stringify(parseTags(input.tags !== undefined ? input.tags : existingTask.tags)),
    listName: parseListName(input.listName, existingTask.listName),
  };
}

function normalizeSort(sortBy, order) {
  const map = {
    dueDate: 'dueDate',
    priority: 'priority',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    title: 'title',
  };

  const field = map[sortBy] || 'createdAt';
  const normalizedOrder = order === 'asc' ? 'asc' : 'desc';

  return { field, order: normalizedOrder };
}

function formatTask(row) {
  let tags = [];
  try {
    tags = JSON.parse(row.tags || '[]');
  } catch (err) {
    tags = [];
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    dueDate: row.due_date,
    priority: row.priority,
    tags,
    listName: row.list_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isOverdue: !!row.due_date && new Date(row.due_date) < new Date() && row.status !== 'completed',
  };
}

module.exports = {
  formatTask,
  normalizeSort,
  parseTaskInput,
  parseUpdateInput,
};
