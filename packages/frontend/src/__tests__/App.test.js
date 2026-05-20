import { act, render, screen, waitFor } from '@testing-library/react';
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
  rest.post('/api/tasks', async (req, res, ctx) => {
    const body = await req.json();

    if (!body.title || !String(body.title).trim()) {
      return res(ctx.status(400), ctx.json({ error: 'Task title is required' }));
    }

    const newTask = {
      id: idCounter++,
      title: body.title,
      description: body.description || '',
      status: 'active',
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
    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText('Focus List')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Seed task')).toBeInTheDocument();
    });
  });

  test('creates a new task', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    const titleField = await screen.findByLabelText('Task title');
    await user.type(titleField, 'New UI Task');

    await user.click(screen.getByRole('button', { name: 'Add task' }));

    await waitFor(() => {
      expect(screen.getByText('New UI Task')).toBeInTheDocument();
    });
  });

  test('toggles task completion', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

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

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('No tasks found. Add your first task.')).toBeInTheDocument();
    });
  });
});
