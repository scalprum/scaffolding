import React, { useState, useMemo } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  ButtonGroup,
  Paper,
} from '@mui/material';
import { Delete as DeleteIcon, Check as CheckIcon, Undo as UndoIcon } from '@mui/icons-material';
import { useRemoteHook } from '@scalprum/react-core';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

interface UseSharedStoreResult {
  // State getters
  todos: TodoItem[];
  filter: 'all' | 'active' | 'completed';
  filteredTodos: TodoItem[];
  activeCount: number;
  completedCount: number;
  lastUpdate: number;

  // Actions
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  setFilter: (filter: 'all' | 'active' | 'completed') => void;
  clearCompleted: () => void;

  // Meta
  instanceId: string;
}

// Reusable components to eliminate duplication while preserving test selectors

interface InstanceInfoProps {
  instanceId: string;
  lastUpdate: number;
}

const InstanceInfo: React.FC<InstanceInfoProps> = ({ instanceId, lastUpdate }) => {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <Paper variant="outlined" sx={{ p: 1, mb: 2, bgcolor: 'grey.50' }}>
      <Typography variant="caption" data-testid={`${instanceId}-instance-info`}>
        Instance: {instanceId}
      </Typography>
      <br />
      <Typography variant="caption" data-testid={`${instanceId}-last-update`}>
        Last Update: {formatTime(lastUpdate)}
      </Typography>
    </Paper>
  );
};

interface TodoInputProps {
  instanceId: string;
  newTodoText: string;
  setNewTodoText: (text: string) => void;
  onAddTodo: () => void;
}

const TodoInput: React.FC<TodoInputProps> = ({ instanceId, newTodoText, setNewTodoText, onAddTodo }) => {
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      onAddTodo();
    }
  };

  return (
    <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
      <TextField
        size="small"
        fullWidth
        value={newTodoText}
        onChange={(e) => setNewTodoText(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Add a new todo..."
        data-testid={`${instanceId}-add-input`}
      />
      <Button variant="contained" onClick={onAddTodo} disabled={!newTodoText.trim()} data-testid={`${instanceId}-add-button`}>
        Add
      </Button>
    </Box>
  );
};

interface FilterButtonsProps {
  instanceId: string;
  filter: 'all' | 'active' | 'completed';
  totalCount: number;
  activeCount: number;
  completedCount: number;
  onSetFilter: (filter: 'all' | 'active' | 'completed') => void;
}

const FilterButtons: React.FC<FilterButtonsProps> = ({ instanceId, filter, totalCount, activeCount, completedCount, onSetFilter }) => {
  return (
    <Box sx={{ mb: 2 }}>
      <ButtonGroup size="small" data-testid={`${instanceId}-filter-group`}>
        <Button variant={filter === 'all' ? 'contained' : 'outlined'} onClick={() => onSetFilter('all')} data-testid={`${instanceId}-filter-all`}>
          All ({totalCount})
        </Button>
        <Button
          variant={filter === 'active' ? 'contained' : 'outlined'}
          onClick={() => onSetFilter('active')}
          data-testid={`${instanceId}-filter-active`}
        >
          Active ({activeCount})
        </Button>
        <Button
          variant={filter === 'completed' ? 'contained' : 'outlined'}
          onClick={() => onSetFilter('completed')}
          data-testid={`${instanceId}-filter-completed`}
        >
          Completed ({completedCount})
        </Button>
      </ButtonGroup>
    </Box>
  );
};

interface TodoListProps {
  instanceId: string;
  todos: TodoItem[];
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
}

const TodoList: React.FC<TodoListProps> = ({ instanceId, todos, onToggleTodo, onDeleteTodo }) => {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <Box sx={{ mb: 2 }}>
      {todos.length === 0 ? (
        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }} data-testid={`${instanceId}-empty-message`}>
          No todos to show
        </Typography>
      ) : (
        <List dense data-testid={`${instanceId}-todo-list`}>
          {todos.map((todo) => (
            <ListItem key={todo.id} data-testid={`${instanceId}-todo-${todo.id}`}>
              <ListItemText
                primary={
                  <Typography
                    sx={{
                      textDecoration: todo.completed ? 'line-through' : 'none',
                      color: todo.completed ? 'text.secondary' : 'text.primary',
                    }}
                  >
                    {todo.text}
                  </Typography>
                }
                secondary={`Added: ${formatTime(todo.createdAt)}`}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  onClick={() => onToggleTodo(todo.id)}
                  data-testid={`${instanceId}-toggle-${todo.id}`}
                  color={todo.completed ? 'default' : 'primary'}
                >
                  {todo.completed ? <UndoIcon /> : <CheckIcon />}
                </IconButton>
                <IconButton edge="end" onClick={() => onDeleteTodo(todo.id)} data-testid={`${instanceId}-delete-${todo.id}`} color="error">
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

interface ClearCompletedButtonProps {
  instanceId: string;
  completedCount: number;
  onClearCompleted: () => void;
}

const ClearCompletedButton: React.FC<ClearCompletedButtonProps> = ({ instanceId, completedCount, onClearCompleted }) => {
  if (completedCount === 0) return null;

  return (
    <Button variant="outlined" color="error" onClick={onClearCompleted} data-testid={`${instanceId}-clear-completed`}>
      Clear Completed ({completedCount})
    </Button>
  );
};

// Shared component that uses all the reusable pieces
interface SharedTodoManagerProps {
  instanceId: string;
  title: string;
  enableLogging?: boolean;
  variant?: 'card' | 'box';
}

const SharedTodoManager: React.FC<SharedTodoManagerProps> = ({ instanceId, title, enableLogging = false, variant = 'card' }) => {
  const [newTodoText, setNewTodoText] = useState('');

  // Each component makes its own independent call to useRemoteHook
  const sharedStoreArgs = useMemo(() => [{ instanceId, enableLogging }], [instanceId, enableLogging]);

  const sharedStore = useRemoteHook<UseSharedStoreResult>({
    scope: 'sdk-plugin',
    module: './useSharedStoreHook',
    args: sharedStoreArgs,
  });

  const handleAddTodo = () => {
    if (newTodoText.trim() && sharedStore.hookResult) {
      sharedStore.hookResult.addTodo(newTodoText.trim());
      setNewTodoText('');
    }
  };

  const content = (
    <>
      <Typography variant="h6" gutterBottom data-testid={`${instanceId}-title`}>
        {title}
      </Typography>

      {sharedStore.loading && <Typography data-testid={`${instanceId}-loading`}>Loading shared store...</Typography>}

      {sharedStore.error && (
        <Alert severity="error" data-testid={`${instanceId}-error`}>
          Error: {sharedStore.error.message}
        </Alert>
      )}

      {sharedStore.hookResult && (
        <Box>
          <InstanceInfo instanceId={instanceId} lastUpdate={sharedStore.hookResult.lastUpdate} />

          <TodoInput instanceId={instanceId} newTodoText={newTodoText} setNewTodoText={setNewTodoText} onAddTodo={handleAddTodo} />

          <FilterButtons
            instanceId={instanceId}
            filter={sharedStore.hookResult.filter}
            totalCount={sharedStore.hookResult.todos.length}
            activeCount={sharedStore.hookResult.activeCount}
            completedCount={sharedStore.hookResult.completedCount}
            onSetFilter={(filter) => sharedStore.hookResult?.setFilter(filter)}
          />

          <TodoList
            instanceId={instanceId}
            todos={sharedStore.hookResult.filteredTodos}
            onToggleTodo={(id) => sharedStore.hookResult?.toggleTodo(id)}
            onDeleteTodo={(id) => sharedStore.hookResult?.deleteTodo(id)}
          />

          <ClearCompletedButton
            instanceId={instanceId}
            completedCount={sharedStore.hookResult.completedCount}
            onClearCompleted={() => sharedStore.hookResult?.clearCompleted()}
          />
        </Box>
      )}
    </>
  );

  return variant === 'card' ? (
    <Card>
      <CardContent>{content}</CardContent>
    </Card>
  ) : (
    <Box>{content}</Box>
  );
};

// Independent component instances using the shared component
const TodoManagerInstanceOne: React.FC = () => {
  return <SharedTodoManager instanceId="instance-1" title="Todo Manager - Instance 1" enableLogging={true} variant="card" />;
};

const TodoManagerInstanceTwo: React.FC = () => {
  return <SharedTodoManager instanceId="instance-2" title="Todo Manager - Instance 2" enableLogging={false} variant="card" />;
};

// Independent component - Summary view
const TodoManagerSummary: React.FC = () => {
  return <SharedTodoManager instanceId="summary-instance" title="Summary View (Read-Only Style)" enableLogging={false} variant="box" />;
};

const SharedStore = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom data-testid="shared-store-title">
        Shared Store Remote Hooks Testing
      </Typography>

      <Typography variant="body1" gutterBottom sx={{ mb: 4 }} data-testid="shared-store-description">
        This page demonstrates shared store functionality using remote hooks. Multiple instances of the same hook share the same state, allowing for
        synchronized state management across different components and even different micro-frontends.
      </Typography>

      <Alert severity="info" sx={{ mb: 4 }} data-testid="shared-store-info">
        <Typography variant="body2">
          <strong>How it works:</strong> Each component below independently calls useRemoteHook to load the same shared store hook. Despite being
          completely separate components, they all share the same underlying singleton state, showcasing true state synchronization.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        {/* Instance 1 - Independent component with its own useRemoteHook call */}
        <Grid item xs={12} md={6}>
          <TodoManagerInstanceOne />
        </Grid>

        {/* Instance 2 - Independent component with its own useRemoteHook call */}
        <Grid item xs={12} md={6}>
          <TodoManagerInstanceTwo />
        </Grid>

        {/* Instance 3 - Independent component with its own useRemoteHook call */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom data-testid="summary-title">
                Shared State Summary
              </Typography>

              <TodoManagerSummary />
            </CardContent>
          </Card>
        </Grid>

        {/* Debug Information */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Debug Information
              </Typography>
              <Typography variant="body2" component="div" data-testid="shared-store-debug">
                All three components above are completely independent - each makes its own useRemoteHook call to load the shared store functionality.
                Yet they all share the same state through Scalprum's singleton shared store pattern. Check the browser console to see state changes
                being logged from Instance 1.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SharedStore;
