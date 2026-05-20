import dayjs from 'dayjs';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ArchiveIcon from '@mui/icons-material/Archive';
import SaveIcon from '@mui/icons-material/Save';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useEffect, useMemo, useState } from 'react';

const defaultTask = {
  title: '',
  description: '',
  dueDate: null,
  priority: 'medium',
  tags: '',
  listName: 'General',
};

function formatDateLabel(isoDate) {
  if (!isoDate) {
    return 'No due date';
  }

  return dayjs(isoDate).format('MMM D, YYYY');
}

function parseTagString(tagsText) {
  return tagsText
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [taskForm, setTaskForm] = useState(defaultTask);
  const [filters, setFilters] = useState({
    q: '',
    status: 'all',
    dueFilter: 'all',
    sortBy: 'createdAt',
    order: 'desc',
  });
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [editingTask, setEditingTask] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, severity: 'success', message: '' });
  const [recentlyDeletedTask, setRecentlyDeletedTask] = useState(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const buildQueryString = () => {
    const searchParams = new URLSearchParams();

    if (filters.q) {
      searchParams.set('q', filters.q);
    }

    if (filters.status !== 'all') {
      searchParams.set('status', filters.status);
    }

    if (filters.dueFilter !== 'all') {
      searchParams.set('dueFilter', filters.dueFilter);
    }

    searchParams.set('sortBy', filters.sortBy);
    searchParams.set('order', filters.order);

    return searchParams.toString();
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const query = buildQueryString();
      const response = await fetch(`/api/tasks${query ? `?${query}` : ''}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const result = await response.json();
      setTasks(result);
      setError('');
    } catch (err) {
      setError(`Unable to load tasks: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const selectedCount = selectedTaskIds.length;

  const completedCount = useMemo(() => {
    return tasks.filter(task => task.status === 'completed').length;
  }, [tasks]);

  const openToast = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCreateTask = async event => {
    event.preventDefault();

    try {
      const payload = {
        title: taskForm.title,
        description: taskForm.description,
        dueDate: taskForm.dueDate ? dayjs(taskForm.dueDate).toISOString() : null,
        priority: taskForm.priority,
        tags: parseTagString(taskForm.tags),
        listName: taskForm.listName,
      };

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const responseBody = await response.json();
        throw new Error(responseBody.error || 'Failed to create task');
      }

      setTaskForm(defaultTask);
      await fetchTasks();
      openToast('Task added');
    } catch (err) {
      openToast(err.message, 'error');
    }
  };

  const handleToggleTask = async task => {
    try {
      const response = await fetch(`/api/tasks/${task.id}/toggle`, { method: 'PATCH' });
      if (!response.ok) {
        throw new Error('Unable to update task status');
      }

      await fetchTasks();
    } catch (err) {
      openToast(err.message, 'error');
    }
  };

  const handleDeleteTask = async task => {
    try {
      const response = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Unable to delete task');
      }

      setSelectedTaskIds(previous => previous.filter(id => id !== task.id));
      setRecentlyDeletedTask(task);
      await fetchTasks();
      openToast('Task deleted');
    } catch (err) {
      openToast(err.message, 'error');
    }
  };

  const handleArchiveTask = async taskId => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/archive`, { method: 'POST' });
      if (!response.ok) {
        throw new Error('Unable to archive task');
      }

      setSelectedTaskIds(previous => previous.filter(id => id !== taskId));
      await fetchTasks();
      openToast('Task archived');
    } catch (err) {
      openToast(err.message, 'error');
    }
  };

  const undoDelete = async () => {
    if (!recentlyDeletedTask) {
      return;
    }

    try {
      const payload = {
        title: recentlyDeletedTask.title,
        description: recentlyDeletedTask.description,
        dueDate: recentlyDeletedTask.dueDate,
        priority: recentlyDeletedTask.priority,
        tags: recentlyDeletedTask.tags,
        listName: recentlyDeletedTask.listName,
        status: recentlyDeletedTask.status,
      };

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Unable to restore task');
      }

      setRecentlyDeletedTask(null);
      await fetchTasks();
      openToast('Task restored');
    } catch (err) {
      openToast(err.message, 'error');
    }
  };

  const startEditTask = task => {
    setEditingTask({
      ...task,
      dueDate: task.dueDate ? dayjs(task.dueDate) : null,
      tags: task.tags.join(', '),
    });
  };

  const saveEditTask = async () => {
    try {
      const payload = {
        title: editingTask.title,
        description: editingTask.description,
        dueDate: editingTask.dueDate ? dayjs(editingTask.dueDate).toISOString() : null,
        priority: editingTask.priority,
        tags: parseTagString(editingTask.tags),
        listName: editingTask.listName,
      };

      const response = await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const responseBody = await response.json();
        throw new Error(responseBody.error || 'Unable to update task');
      }

      setEditingTask(null);
      await fetchTasks();
      openToast('Task updated');
    } catch (err) {
      openToast(err.message, 'error');
    }
  };

  const toggleSelection = taskId => {
    setSelectedTaskIds(previous => {
      if (previous.includes(taskId)) {
        return previous.filter(id => id !== taskId);
      }

      return [...previous, taskId];
    });
  };

  const markSelectedCompleted = async () => {
    try {
      const response = await fetch('/api/tasks/batch/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedTaskIds }),
      });

      if (!response.ok) {
        throw new Error('Unable to complete selected tasks');
      }

      setSelectedTaskIds([]);
      await fetchTasks();
      openToast('Selected tasks marked complete');
    } catch (err) {
      openToast(err.message, 'error');
    }
  };

  const deleteSelected = async () => {
    try {
      const response = await fetch('/api/tasks/batch/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedTaskIds }),
      });

      if (!response.ok) {
        throw new Error('Unable to delete selected tasks');
      }

      setSelectedTaskIds([]);
      await fetchTasks();
      openToast('Selected tasks deleted');
    } catch (err) {
      openToast(err.message, 'error');
    }
  };

  const clearCompleted = async () => {
    try {
      const response = await fetch('/api/tasks/completed', { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Unable to clear completed tasks');
      }

      await fetchTasks();
      setConfirmClearOpen(false);
      openToast('Completed tasks cleared');
    } catch (err) {
      openToast(err.message, 'error');
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            Focus List
          </Typography>
          <Chip
            color="secondary"
            label={`${tasks.filter(task => task.status === 'active').length} active`}
          />
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Card component="section" aria-label="Add task section">
            <CardContent>
              <Typography variant="h5" sx={{ mb: 2 }}>
                Add Task
              </Typography>

              <Box component="form" onSubmit={handleCreateTask}>
                <Stack spacing={2}>
                  <TextField
                    required
                    label="Task title"
                    value={taskForm.title}
                    onChange={event => setTaskForm({ ...taskForm, title: event.target.value })}
                    placeholder="Plan sprint retrospective"
                  />
                  <TextField
                    label="Description"
                    value={taskForm.description}
                    onChange={event => setTaskForm({ ...taskForm, description: event.target.value })}
                    multiline
                    minRows={2}
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <DatePicker
                      label="Due date"
                      value={taskForm.dueDate}
                      onChange={value => setTaskForm({ ...taskForm, dueDate: value })}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                    <FormControl fullWidth>
                      <InputLabel id="priority-select-label">Priority</InputLabel>
                      <Select
                        labelId="priority-select-label"
                        value={taskForm.priority}
                        label="Priority"
                        onChange={event => setTaskForm({ ...taskForm, priority: event.target.value })}
                      >
                        <MenuItem value="low">Low</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="high">High</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Tags"
                      value={taskForm.tags}
                      onChange={event => setTaskForm({ ...taskForm, tags: event.target.value })}
                      helperText="Separate tags with commas"
                      fullWidth
                    />
                    <TextField
                      label="List"
                      value={taskForm.listName}
                      onChange={event => setTaskForm({ ...taskForm, listName: event.target.value })}
                      fullWidth
                    />
                  </Stack>

                  <Button type="submit" variant="contained" size="large">
                    Add task
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          <Card component="section" aria-label="Task filters">
            <CardContent>
              <Typography variant="h5" sx={{ mb: 2 }}>
                Search and Filter
              </Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label="Search"
                  value={filters.q}
                  onChange={event => setFilters({ ...filters, q: event.target.value })}
                  fullWidth
                />
                <FormControl sx={{ minWidth: 140 }}>
                  <InputLabel id="status-filter-label">Status</InputLabel>
                  <Select
                    labelId="status-filter-label"
                    value={filters.status}
                    label="Status"
                    onChange={event => setFilters({ ...filters, status: event.target.value })}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="archived">Archived</MenuItem>
                  </Select>
                </FormControl>
                <FormControl sx={{ minWidth: 140 }}>
                  <InputLabel id="due-filter-label">Due</InputLabel>
                  <Select
                    labelId="due-filter-label"
                    value={filters.dueFilter}
                    label="Due"
                    onChange={event => setFilters({ ...filters, dueFilter: event.target.value })}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="today">Today</MenuItem>
                    <MenuItem value="week">This Week</MenuItem>
                    <MenuItem value="overdue">Overdue</MenuItem>
                  </Select>
                </FormControl>
                <FormControl sx={{ minWidth: 140 }}>
                  <InputLabel id="sort-label">Sort</InputLabel>
                  <Select
                    labelId="sort-label"
                    value={filters.sortBy}
                    label="Sort"
                    onChange={event => setFilters({ ...filters, sortBy: event.target.value })}
                  >
                    <MenuItem value="createdAt">Created</MenuItem>
                    <MenuItem value="dueDate">Due date</MenuItem>
                    <MenuItem value="priority">Priority</MenuItem>
                    <MenuItem value="title">Title</MenuItem>
                  </Select>
                </FormControl>
                <FormControl sx={{ minWidth: 120 }}>
                  <InputLabel id="order-label">Order</InputLabel>
                  <Select
                    labelId="order-label"
                    value={filters.order}
                    label="Order"
                    onChange={event => setFilters({ ...filters, order: event.target.value })}
                  >
                    <MenuItem value="desc">Desc</MenuItem>
                    <MenuItem value="asc">Asc</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </CardContent>
          </Card>

          <Card component="section" aria-label="Task list">
            <CardContent>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <Typography variant="h5">Tasks</Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    disabled={selectedCount === 0}
                    onClick={markSelectedCompleted}
                  >
                    Complete selected
                  </Button>
                  <Button
                    variant="text"
                    color="error"
                    disabled={selectedCount === 0}
                    onClick={deleteSelected}
                  >
                    Delete selected
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    disabled={completedCount === 0}
                    onClick={() => setConfirmClearOpen(true)}
                  >
                    Clear completed
                  </Button>
                </Stack>
              </Stack>

              {loading && <LinearProgress aria-label="Loading tasks" />}
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {!loading && tasks.length === 0 && (
                <Typography color="text.secondary">No tasks found. Add your first task.</Typography>
              )}

              <Stack spacing={1.5}>
                {tasks.map(task => (
                  <Card key={task.id} variant="outlined">
                    <CardContent>
                      <Stack direction="row" spacing={1} alignItems="flex-start">
                        <Checkbox
                          inputProps={{ 'aria-label': `Select task ${task.title}` }}
                          checked={selectedTaskIds.includes(task.id)}
                          onChange={() => toggleSelection(task.id)}
                        />

                        <Box sx={{ flex: 1 }}>
                          <Stack
                            direction={{ xs: 'column', md: 'row' }}
                            justifyContent="space-between"
                            spacing={1}
                          >
                            <Box>
                              <Typography
                                variant="h6"
                                sx={{
                                  textDecoration:
                                    task.status === 'completed' ? 'line-through' : 'none',
                                }}
                              >
                                {task.title}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {task.description || 'No description'}
                              </Typography>
                            </Box>

                            <Stack direction="row" spacing={1}>
                              <Chip
                                label={task.priority}
                                color={
                                  task.priority === 'high'
                                    ? 'error'
                                    : task.priority === 'medium'
                                      ? 'warning'
                                      : 'success'
                                }
                                size="small"
                              />
                              <Chip
                                label={task.status}
                                color={task.status === 'completed' ? 'success' : 'default'}
                                size="small"
                              />
                              {task.isOverdue && <Chip color="error" label="Overdue" size="small" />}
                            </Stack>
                          </Stack>

                          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 1 }}>
                            <Chip label={`Due: ${formatDateLabel(task.dueDate)}`} size="small" variant="outlined" />
                            <Chip label={`List: ${task.listName}`} size="small" variant="outlined" />
                            {task.tags.map(tag => (
                              <Chip key={`${task.id}-${tag}`} label={tag} size="small" variant="outlined" />
                            ))}
                          </Stack>
                        </Box>

                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Toggle complete">
                            <Checkbox
                              inputProps={{ 'aria-label': `Toggle completion for ${task.title}` }}
                              checked={task.status === 'completed'}
                              onChange={() => handleToggleTask(task)}
                            />
                          </Tooltip>
                          <Tooltip title="Edit task">
                            <IconButton
                              aria-label={`Edit ${task.title}`}
                              color="primary"
                              onClick={() => startEditTask(task)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Archive task">
                            <IconButton
                              aria-label={`Delete ${task.title}`}
                              color="error"
                              onClick={() => handleArchiveTask(task.id)}
                            >
                              <ArchiveIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete task">
                            <IconButton
                              aria-label={`Delete ${task.title}`}
                              color="error"
                              onClick={() => handleDeleteTask(task)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>

      <Dialog open={Boolean(editingTask)} onClose={() => setEditingTask(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit task</DialogTitle>
        {editingTask && (
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                required
                label="Task title"
                value={editingTask.title}
                onChange={event => setEditingTask({ ...editingTask, title: event.target.value })}
              />
              <TextField
                label="Description"
                value={editingTask.description}
                onChange={event => setEditingTask({ ...editingTask, description: event.target.value })}
                multiline
                minRows={2}
              />
              <DatePicker
                label="Due date"
                value={editingTask.dueDate}
                onChange={value => setEditingTask({ ...editingTask, dueDate: value })}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <FormControl fullWidth>
                <InputLabel id="edit-priority-label">Priority</InputLabel>
                <Select
                  labelId="edit-priority-label"
                  value={editingTask.priority}
                  label="Priority"
                  onChange={event => setEditingTask({ ...editingTask, priority: event.target.value })}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Tags"
                value={editingTask.tags}
                onChange={event => setEditingTask({ ...editingTask, tags: event.target.value })}
                helperText="Separate tags with commas"
              />
              <TextField
                label="List"
                value={editingTask.listName}
                onChange={event => setEditingTask({ ...editingTask, listName: event.target.value })}
              />
            </Stack>
          </DialogContent>
        )}
        <DialogActions>
          <Button variant="text" onClick={() => setEditingTask(null)}>
            Cancel
          </Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={saveEditTask}>
            Save changes
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmClearOpen} onClose={() => setConfirmClearOpen(false)}>
        <DialogTitle>Clear completed tasks?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setConfirmClearOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={clearCompleted}>
            Clear
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={() => {
          setSnackbar(previous => ({ ...previous, open: false }));
          setRecentlyDeletedTask(null);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => {
            setSnackbar(previous => ({ ...previous, open: false }));
            setRecentlyDeletedTask(null);
          }}
          severity={snackbar.severity}
          variant="filled"
          action={
            recentlyDeletedTask && snackbar.severity === 'success' ? (
              <Button color="inherit" size="small" onClick={undoDelete}>
                Undo
              </Button>
            ) : null
          }
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </LocalizationProvider>
  );
}

export default App;