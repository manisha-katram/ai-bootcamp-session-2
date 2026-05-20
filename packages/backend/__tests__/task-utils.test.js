const { parseTaskInput, parseUpdateInput } = require('../src/task-utils');

describe('task-utils', () => {
  it('parses valid create payload', () => {
    const result = parseTaskInput({
      title: 'Write docs',
      description: 'Finalize release notes',
      priority: 'high',
      tags: ['docs', 'release'],
      listName: 'Work',
    });

    expect(result.title).toBe('Write docs');
    expect(result.description).toBe('Finalize release notes');
    expect(result.priority).toBe('high');
    expect(result.listName).toBe('Work');
    expect(result.status).toBe('active');
  });

  it('throws when title is missing', () => {
    expect(() => parseTaskInput({ title: '  ' })).toThrow('Task title is required');
  });

  it('throws when tags is not an array', () => {
    expect(() => parseTaskInput({ title: 'Task', tags: 'oops' })).toThrow('tags must be an array');
  });

  it('merges updates against existing task', () => {
    const existing = {
      title: 'Original',
      description: 'Body',
      status: 'active',
      dueDate: null,
      priority: 'medium',
      tags: ['one'],
      listName: 'General',
    };

    const updated = parseUpdateInput({ priority: 'low', tags: ['two'] }, existing);

    expect(updated.title).toBe('Original');
    expect(updated.priority).toBe('low');
    expect(updated.tags).toBe(JSON.stringify(['two']));
  });
});
