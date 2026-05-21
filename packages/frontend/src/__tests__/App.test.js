import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import App from '../App';

let mockTasks = [];
let idCounter = 1;

const server = setupServer(
  rest.get('/api/tasks', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(mockTasks));
  }),
  // Specific POST routes before parameterized ones
  rest.post('/api/tasks/batch/complete', async (req, res, ctx) => {
    const { ids } = await req.json();
    mockTasks = mockTasks.map(task =>
      ids.includes(task.id) ? { ...task, status: 'completed' } : task
    );
    return res(ctx.status(200), ctx.json({ updated: ids.length }));
  }),
  rest.post('/api/tasks/batch/delete', async (req, res, ctx) => {
    const { ids } = await req.json();
    mockTasks = mockTasks.filter(task => !ids.includes(task.id));
    return res(ctx.status(200), ctx.json({ deleted: ids.length }));
  }),
  rest.post('/api/tasks/:id/archive', (req, res, ctx) => {
    const id = Number(req.params.id);
    mockTasks = mockTasks.filter(task => task.id !== id);
    return res(ctx.status(200), ctx.json({ message: 'Task archived', id }));
  }),
  rest.post('/api/tasks', async (req, res, ctx) => {
    const body = await req.json();

    if (!body.title || !String(body.title).trim()) {
      return res(ctx.status(400), ctx.json({ error: 'Task title is required' }));
    }

    const newTask = {
      id: idCounter++,
      title: body.title,
      description: body.description || '',
      status: body.status || 'active',
      dueDate: body.dueDate || null,
      priority: body.priority || 'medium',
      tags: body.tags || [],
      listName: body.listName || 'General',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isOverdue: false,
    };

    mockTasks = [newTask, ...mockTasks];
    return res(ctx.status(201), ctx.json(newTask));
  }),
  // Specific PATCH route before parameterized one
  rest.patch('/api/tasks/:id/toggle', (req, res, ctx) => {
    const id = Number(req.params.id);
    mockTasks = mockTasks.map(task => {
      if (task.id !== id) {
        return task;
      }

      return {
        ...task,
        status: task.status === 'completed' ? 'active' : 'completed',
      };
    });

    const updatedTask = mockTasks.find(task => task.id === id);
    return res(ctx.status(200), ctx.json(updatedTask));
  }),
  rest.patch('/api/tasks/:id', async (req, res, ctx) => {
    const id = Number(req.params.id);
    const body = await req.json();

    if (!body.title || !String(body.title).trim()) {
      return res(ctx.status(400), ctx.json({ error: 'Task title is required' }));
    }

    mockTasks = mockTasks.map(task =>
      task.id === id ? { ...task, ...body, id, updatedAt: new Date().toISOString() } : task
    );

    return res(ctx.status(200), ctx.json(mockTasks.find(task => task.id === id)));
  }),
  // Specific DELETE route before parameterized one
  rest.delete('/api/tasks/completed', (req, res, ctx) => {
    mockTasks = mockTasks.filter(task => task.status !== 'completed');
    return res(ctx.status(200), ctx.json({ message: 'Completed tasks cleared' }));
  }),
  rest.delete('/api/tasks/:id', (req, res, ctx) => {
    const id = Number(req.params.id);
    mockTasks = mockTasks.filter(task => task.id !== id);
    return res(ctx.status(200), ctx.json({ message: 'Task deleted successfully', id }));
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  mockTasks = [
    {
      id: 1,
      title: 'Seed task',
      description: 'Task from server',
      status: 'active',
      dueDate: null,
      priority: 'medium',
      tags: ['seed'],
      listName: 'General',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isOverdue: false,
    },
  ];
  idCounter = 2;
});
afterAll(() => server.close());

describe('App', () => {
  test('renders app title and seeded task', async () => {
    render(<App />);

    expect(screen.getByText('Focus List')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Seed task')).toBeInTheDocument();
    });
  });

  test('creates a new task', async () => {
    const user = userEvent.setup();

    render(<App />);

    const titleField = await screen.findByLabelText('Task title');
    await user.type(titleField, 'New UI Task');

    await user.click(screen.getByRole('button', { name: 'Add task' }));

    await waitFor(() => {
      expect(screen.getByText('New UI Task')).toBeInTheDocument();
    });
  });

  test('toggles task completion', async () => {
    const user = userEvent.setup();

    render(<App />);

    const toggleCheckbox = await screen.findByRole('checkbox', {
      name: 'Toggle completion for Seed task',
    });

    await user.click(toggleCheckbox);

    await waitFor(() => {
      expect(screen.getByText('completed')).toBeInTheDocument();
    });
  });

  test('shows empty state', async () => {
    mockTasks = [];

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('No tasks found. Add your first task.')).toBeInTheDocument();
    });
  });

  test('shows error toast when creating a task with a blank title', async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText('Seed task');

    const titleField = screen.getAllByLabelText('Task title')[0];
    await user.type(titleField, ' ');

    await user.click(screen.getByRole('button', { name: 'Add task' }));

    await waitFor(() => {
      expect(screen.getByText('Task title is required')).toBeInTheDocument();
    });
  });

  test('shows error message when tasks fail to load', async () => {
    server.use(
      rest.get('/api/tasks', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Internal server error' }));
      })
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Unable to load tasks/)).toBeInTheDocument();
    });
  });

  test('deletes a task', async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText('Seed task');

    // Both archive and delete buttons share the same aria-label; delete is last
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete Seed task' });
    await user.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => {
      expect(screen.queryByText('Seed task')).not.toBeInTheDocument();
    });
  });

  test('shows undo button in snackbar after deleting a task', async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText('Seed task');

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete Seed task' });
    await user.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText('Task deleted')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
  });

  test('restores a task when undo delete is clicked', async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText('Seed task');

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete Seed task' });
    await user.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Undo' }));

    await waitFor(() => {
      expect(screen.getByText('Seed task')).toBeInTheDocument();
    });
  });

  test('opens edit dialog when edit button is clicked', async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText('Seed task');

    await user.click(screen.getByRole('button', { name: 'Edit Seed task' }));

    await screen.findByRole('dialog');
    expect(screen.getByText('Edit task')).toBeInTheDocument();
  });

  test('cancels edit dialog without saving', async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText('Seed task');

    await user.click(screen.getByRole('button', { name: 'Edit Seed task' }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Seed task')).toBeInTheDocument();
  });

  test('saves edited task title', async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText('Seed task');

    await user.click(screen.getByRole('button', { name: 'Edit Seed task' }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    const dialogTitleField = within(dialog).getByLabelText('Task title');
    await user.clear(dialogTitleField);
    await user.type(dialogTitleField, 'Updated Seed Task');

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Updated Seed Task')).toBeInTheDocument();
    });
  });

  test('selects a task via checkbox', async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText('Seed task');

    const selectCheckbox = screen.getByRole('checkbox', { name: 'Select task Seed task' });
    await user.click(selectCheckbox);

    expect(selectCheckbox).toBeChecked();
  });

  test('marks selected tasks as completed', async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText('Seed task');

    await user.click(screen.getByRole('checkbox', { name: 'Select task Seed task' }));
    await user.click(screen.getByRole('button', { name: 'Complete selected' }));

    await waitFor(() => {
      expect(screen.getByText('completed')).toBeInTheDocument();
    });
  });

  test('deletes selected tasks', async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText('Seed task');

    await user.click(screen.getByRole('checkbox', { name: 'Select task Seed task' }));
    await user.click(screen.getByRole('button', { name: 'Delete selected' }));

    await waitFor(() => {
      expect(screen.queryByText('Seed task')).not.toBeInTheDocument();
    });
  });

  test('archives a task', async () => {
    const user = userEvent.setup();

    render(<App />);

    await screen.findByText('Seed task');

    // Archive button is the first of two buttons sharing the "Delete Seed task" aria-label
    const actionButtons = screen.getAllByRole('button', { name: 'Delete Seed task' });
    await user.click(actionButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Task archived')).toBeInTheDocument();
    });
  });

  test('opens confirm dialog before clearing completed tasks', async () => {
    const user = userEvent.setup();

    mockTasks = [
      {
        id: 1,
        title: 'Done task',
        description: '',
        status: 'completed',
        dueDate: null,
        priority: 'low',
        tags: [],
        listName: 'General',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isOverdue: false,
      },
    ];

    render(<App />);

    await screen.findByText('Done task');

    await user.click(screen.getByRole('button', { name: 'Clear completed' }));

    await screen.findByText('Clear completed tasks?');
  });

  test('clears completed tasks after confirmation', async () => {
    const user = userEvent.setup();

    mockTasks = [
      {
        id: 1,
        title: 'Done task',
        description: '',
        status: 'completed',
        dueDate: null,
        priority: 'low',
        tags: [],
        listName: 'General',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isOverdue: false,
      },
    ];

    render(<App />);

    await screen.findByText('Done task');

    await user.click(screen.getByRole('button', { name: 'Clear completed' }));

    await waitFor(() => {
      expect(screen.getByText('Clear completed tasks?')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Clear' }));

    await waitFor(() => {
      expect(screen.queryByText('Done task')).not.toBeInTheDocument();
    });
  });

  test('cancels clearing completed tasks', async () => {
    const user = userEvent.setup();

    mockTasks = [
      {
        id: 1,
        title: 'Done task',
        description: '',
        status: 'completed',
        dueDate: null,
        priority: 'low',
        tags: [],
        listName: 'General',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isOverdue: false,
      },
    ];

    render(<App />);

    await screen.findByText('Done task');

    await user.click(screen.getByRole('button', { name: 'Clear completed' }));

    await waitFor(() => {
      expect(screen.getByText('Clear completed tasks?')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByText('Clear completed tasks?')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Done task')).toBeInTheDocument();
  });

  test('displays task priority chip', async () => {
    mockTasks = [
      {
        id: 1,
        title: 'High priority task',
        description: '',
        status: 'active',
        dueDate: null,
        priority: 'high',
        tags: [],
        listName: 'Work',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isOverdue: false,
      },
    ];

    render(<App />);

    await screen.findByText('high');
  });

  test('displays overdue chip for overdue tasks', async () => {
    mockTasks = [
      {
        id: 1,
        title: 'Overdue task',
        description: '',
        status: 'active',
        dueDate: '2020-01-01T00:00:00.000Z',
        priority: 'medium',
        tags: [],
        listName: 'General',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isOverdue: true,
      },
    ];

    render(<App />);

    await screen.findByText('Overdue');
  });

  test('displays task tags', async () => {
    mockTasks = [
      {
        id: 1,
        title: 'Tagged task',
        description: '',
        status: 'active',
        dueDate: null,
        priority: 'medium',
        tags: ['work', 'urgent'],
        listName: 'General',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isOverdue: false,
      },
    ];

    render(<App />);

    await screen.findByText('work');
    expect(screen.getByText('urgent')).toBeInTheDocument();
  });

  test('shows task due date', async () => {
    mockTasks = [
      {
        id: 1,
        title: 'Task with due date',
        description: '',
        status: 'active',
        dueDate: '2026-12-25T00:00:00.000Z',
        priority: 'medium',
        tags: [],
        listName: 'General',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isOverdue: false,
      },
    ];

    render(<App />);

    await screen.findByText('Due: Dec 25, 2026');
  });

  test('shows "No description" for tasks without description', async () => {
    mockTasks = [
      {
        id: 1,
        title: 'No desc task',
        description: '',
        status: 'active',
        dueDate: null,
        priority: 'medium',
        tags: [],
        listName: 'General',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isOverdue: false,
      },
    ];

    render(<App />);

    await screen.findByText('No description');
  });

  test('shows active task count in header', async () => {
    mockTasks = [
      {
        id: 1,
        title: 'Active task',
        description: '',
        status: 'active',
        dueDate: null,
        priority: 'medium',
        tags: [],
        listName: 'General',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isOverdue: false,
      },
      {
        id: 2,
        title: 'Completed task',
        description: '',
        status: 'completed',
        dueDate: null,
        priority: 'low',
        tags: [],
        listName: 'General',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isOverdue: false,
      },
    ];

    render(<App />);

    await screen.findByText('1 active');
  });
});
