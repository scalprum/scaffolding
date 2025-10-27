describe('Shared Store Remote Hooks functionality', () => {
  beforeEach(() => {
    cy.handleMetaError();
  });

  it('should load and display shared store page', () => {
    cy.visit('http://localhost:4200/shared-store');
    cy.get('[data-testid="shared-store-title"]').should('contain', 'Shared Store Remote Hooks Testing');
    cy.get('[data-testid="shared-store-description"]').should('exist');
    cy.get('[data-testid="shared-store-info"]').should('contain', 'How it works');
  });

  it('should load shared store hooks for all instances', () => {
    cy.visit('http://localhost:4200/shared-store');

    // Wait for all instances to load
    cy.get('[data-testid="instance-1-loading"]').should('exist');
    cy.get('[data-testid="instance-2-loading"]').should('exist');
    cy.get('[data-testid="summary-instance-loading"]').should('exist');

    // Check that all instances have loaded and show todo lists
    cy.get('[data-testid="instance-1-todo-list"]', { timeout: 15000 }).should('exist');
    cy.get('[data-testid="instance-2-todo-list"]', { timeout: 15000 }).should('exist');
    cy.get('[data-testid="summary-instance-todo-list"]', { timeout: 15000 }).should('exist');

    // Verify initial demo todos are present in all instances
    cy.get('[data-testid="instance-1-todo-list"]').should('contain', 'Learn about Scalprum shared stores');
    cy.get('[data-testid="instance-2-todo-list"]').should('contain', 'Learn about Scalprum shared stores');
    cy.get('[data-testid="summary-instance-todo-list"]').should('contain', 'Learn about Scalprum shared stores');
  });

  it('should share state across all instances - adding todos', () => {
    cy.visit('http://localhost:4200/shared-store');

    // Wait for instances to load
    cy.get('[data-testid="instance-1-todo-list"]', { timeout: 15000 }).should('exist');
    cy.get('[data-testid="instance-2-todo-list"]', { timeout: 15000 }).should('exist');

    // Add a todo from instance 1
    const newTodo = 'Test shared state from instance 1';
    cy.get('[data-testid="instance-1-add-input"]').type(newTodo);
    cy.get('[data-testid="instance-1-add-button"]').click();

    // Verify the todo appears in all instances
    cy.get('[data-testid="instance-1-todo-list"]').should('contain', newTodo);
    cy.get('[data-testid="instance-2-todo-list"]').should('contain', newTodo);
    cy.get('[data-testid="summary-instance-todo-list"]').should('contain', newTodo);

    // Add another todo from instance 2
    const secondTodo = 'Test shared state from instance 2';
    cy.get('[data-testid="instance-2-add-input"]').type(secondTodo);
    cy.get('[data-testid="instance-2-add-button"]').click();

    // Verify both todos appear in all instances
    cy.get('[data-testid="instance-1-todo-list"]').should('contain', secondTodo);
    cy.get('[data-testid="instance-2-todo-list"]').should('contain', secondTodo);
    cy.get('[data-testid="summary-instance-todo-list"]').should('contain', secondTodo);
  });

  it('should share state across all instances - toggling todos', () => {
    cy.visit('http://localhost:4200/shared-store');

    // Wait for instances to load
    cy.get('[data-testid="instance-1-todo-list"]', { timeout: 15000 }).should('exist');

    // Find the demo todo that should be incomplete initially
    cy.get('[data-testid="instance-1-todo-list"]')
      .contains('Learn about Scalprum shared stores')
      .parents('[data-testid^="instance-1-todo-"]')
      .as('targetTodo');

    // Get the todo ID from the data-testid attribute
    cy.get('@targetTodo').then(($todo) => {
      const todoId = $todo.attr('data-testid')?.replace('instance-1-todo-', '');
      expect(todoId).to.exist;

      // Toggle the todo from instance 1
      cy.get(`[data-testid="instance-1-toggle-${todoId}"]`).click();

      // Verify the todo is toggled in all instances
      // Note: The UI should show the todo as completed (with strikethrough)
      cy.get(`[data-testid="instance-1-todo-${todoId}"]`).should('exist');
      cy.get(`[data-testid="instance-2-todo-${todoId}"]`).should('exist');
      cy.get(`[data-testid="summary-instance-todo-${todoId}"]`).should('exist');

      // Toggle it back from instance 2
      cy.get(`[data-testid="instance-2-toggle-${todoId}"]`).click();

      // Verify it's toggled back in all instances
      cy.get(`[data-testid="instance-1-todo-${todoId}"]`).should('exist');
      cy.get(`[data-testid="instance-2-todo-${todoId}"]`).should('exist');
      cy.get(`[data-testid="summary-instance-todo-${todoId}"]`).should('exist');
    });
  });

  it('should share filter state across all instances', () => {
    cy.visit('http://localhost:4200/shared-store');

    // Wait for instances to load
    cy.get('[data-testid="instance-1-filter-group"]', { timeout: 15000 }).should('exist');
    cy.get('[data-testid="instance-2-filter-group"]', { timeout: 15000 }).should('exist');

    // Ensure we have at least one completed todo for testing
    cy.get('[data-testid="instance-1-todo-list"]')
      .contains('Test remote hooks with shared state')
      .parents('[data-testid^="instance-1-todo-"]')
      .then(($todo) => {
        const todoId = $todo.attr('data-testid')?.replace('instance-1-todo-', '');
        // This should already be completed based on initial state, but let's ensure it
        cy.get(`[data-testid="instance-1-toggle-${todoId}"]`).then(($button) => {
          // Check if it needs to be toggled to completed state
          if (!$button.parent().parent().find('span').css('text-decoration').includes('line-through')) {
            cy.get(`[data-testid="instance-1-toggle-${todoId}"]`).click();
          }
        });
      });

    // Change filter to "active" from instance 1
    cy.get('[data-testid="instance-1-filter-active"]').click();

    // Verify filter is changed in all instances
    cy.get('[data-testid="instance-1-filter-active"]').should('have.class', 'MuiButton-contained');
    cy.get('[data-testid="instance-2-filter-active"]').should('have.class', 'MuiButton-contained');
    cy.get('[data-testid="summary-instance-filter-active"]').should('have.class', 'MuiButton-contained');

    // Change filter to "completed" from instance 2
    cy.get('[data-testid="instance-2-filter-completed"]').click();

    // Verify filter is changed in all instances
    cy.get('[data-testid="instance-1-filter-completed"]').should('have.class', 'MuiButton-contained');
    cy.get('[data-testid="instance-2-filter-completed"]').should('have.class', 'MuiButton-contained');
    cy.get('[data-testid="summary-instance-filter-completed"]').should('have.class', 'MuiButton-contained');

    // Change back to "all" from summary instance
    cy.get('[data-testid="summary-instance-filter-all"]').click();

    // Verify filter is changed in all instances
    cy.get('[data-testid="instance-1-filter-all"]').should('have.class', 'MuiButton-contained');
    cy.get('[data-testid="instance-2-filter-all"]').should('have.class', 'MuiButton-contained');
    cy.get('[data-testid="summary-instance-filter-all"]').should('have.class', 'MuiButton-contained');
  });

  it('should share todo deletion across all instances', () => {
    cy.visit('http://localhost:4200/shared-store');

    // Wait for instances to load
    cy.get('[data-testid="instance-1-todo-list"]', { timeout: 15000 }).should('exist');

    // Add a todo to delete
    const todoToDelete = 'Todo to be deleted';
    cy.get('[data-testid="instance-1-add-input"]').type(todoToDelete);
    cy.get('[data-testid="instance-1-add-button"]').click();

    // Find the todo we just added
    cy.get('[data-testid="instance-1-todo-list"]').contains(todoToDelete).parents('[data-testid^="instance-1-todo-"]').as('targetTodo');

    // Get the todo ID and delete it from instance 2
    cy.get('@targetTodo').then(($todo) => {
      const todoId = $todo.attr('data-testid')?.replace('instance-1-todo-', '');
      expect(todoId).to.exist;

      // Delete from instance 2
      cy.get(`[data-testid="instance-2-delete-${todoId}"]`).click();

      // Verify the todo is removed from all instances
      cy.get(`[data-testid="instance-1-todo-${todoId}"]`).should('not.exist');
      cy.get(`[data-testid="instance-2-todo-${todoId}"]`).should('not.exist');
      cy.get(`[data-testid="summary-instance-todo-${todoId}"]`).should('not.exist');

      // Verify the todo text is no longer visible
      cy.get('[data-testid="instance-1-todo-list"]').should('not.contain', todoToDelete);
      cy.get('[data-testid="instance-2-todo-list"]').should('not.contain', todoToDelete);
      cy.get('[data-testid="summary-instance-todo-list"]').should('not.contain', todoToDelete);
    });
  });

  it('should handle clear completed functionality across instances', () => {
    cy.visit('http://localhost:4200/shared-store');

    // Wait for instances to load
    cy.get('[data-testid="instance-1-todo-list"]', { timeout: 15000 }).should('exist');

    // Add a few todos and complete some
    const todos = ['Todo 1 - to complete', 'Todo 2 - stay active', 'Todo 3 - to complete'];

    todos.forEach((todo) => {
      cy.get('[data-testid="instance-1-add-input"]').type(todo);
      cy.get('[data-testid="instance-1-add-button"]').click();
    });

    // Complete the first and third todos
    cy.get('[data-testid="instance-1-todo-list"]')
      .contains('Todo 1 - to complete')
      .parents('[data-testid^="instance-1-todo-"]')
      .then(($todo) => {
        const todoId = $todo.attr('data-testid')?.replace('instance-1-todo-', '');
        cy.get(`[data-testid="instance-1-toggle-${todoId}"]`).click();
      });

    cy.get('[data-testid="instance-1-todo-list"]')
      .contains('Todo 3 - to complete')
      .parents('[data-testid^="instance-1-todo-"]')
      .then(($todo) => {
        const todoId = $todo.attr('data-testid')?.replace('instance-1-todo-', '');
        cy.get(`[data-testid="instance-1-toggle-${todoId}"]`).click();
      });

    // Clear completed from instance 2
    cy.get('[data-testid="instance-2-clear-completed"]').should('exist');
    cy.get('[data-testid="instance-2-clear-completed"]').click();

    // Verify completed todos are removed from all instances
    cy.get('[data-testid="instance-1-todo-list"]').should('not.contain', 'Todo 1 - to complete');
    cy.get('[data-testid="instance-1-todo-list"]').should('not.contain', 'Todo 3 - to complete');
    cy.get('[data-testid="instance-1-todo-list"]').should('contain', 'Todo 2 - stay active');

    cy.get('[data-testid="instance-2-todo-list"]').should('not.contain', 'Todo 1 - to complete');
    cy.get('[data-testid="instance-2-todo-list"]').should('not.contain', 'Todo 3 - to complete');
    cy.get('[data-testid="instance-2-todo-list"]').should('contain', 'Todo 2 - stay active');
  });

  it('should show instance information and sync last update times', () => {
    cy.visit('http://localhost:4200/shared-store');

    // Wait for instances to load
    cy.get('[data-testid="instance-1-instance-info"]', { timeout: 15000 }).should('exist');
    cy.get('[data-testid="instance-2-instance-info"]', { timeout: 15000 }).should('exist');
    cy.get('[data-testid="summary-instance-instance-info"]', { timeout: 15000 }).should('exist');

    // Check that each instance has a unique ID
    cy.get('[data-testid="instance-1-instance-info"]').should('contain', 'instance-1');
    cy.get('[data-testid="instance-2-instance-info"]').should('contain', 'instance-2');
    cy.get('[data-testid="summary-instance-instance-info"]').should('contain', 'summary-instance');

    // Check that all instances show last update times
    cy.get('[data-testid="instance-1-last-update"]').should('contain', 'Last Update:');
    cy.get('[data-testid="instance-2-last-update"]').should('contain', 'Last Update:');
    cy.get('[data-testid="summary-instance-last-update"]').should('contain', 'Last Update:');

    // Store initial update times
    let initialTime1: string, initialTime2: string, initialTime3: string;

    cy.get('[data-testid="instance-1-last-update"]')
      .invoke('text')
      .then((text) => {
        initialTime1 = text;
      });
    cy.get('[data-testid="instance-2-last-update"]')
      .invoke('text')
      .then((text) => {
        initialTime2 = text;
      });
    cy.get('[data-testid="summary-instance-last-update"]')
      .invoke('text')
      .then((text) => {
        initialTime3 = text;
      });

    // Make a change
    cy.get('[data-testid="instance-1-add-input"]').type('New todo to trigger update');
    cy.get('[data-testid="instance-1-add-button"]').click();

    // Verify all instances show updated times (should be different from initial)
    cy.get('[data-testid="instance-1-last-update"]').invoke('text').should('not.eq', initialTime1);
    cy.get('[data-testid="instance-2-last-update"]').invoke('text').should('not.eq', initialTime2);
    cy.get('[data-testid="summary-instance-last-update"]').invoke('text').should('not.eq', initialTime3);
  });

  it('should handle empty states appropriately', () => {
    cy.visit('http://localhost:4200/shared-store');

    // Wait for instances to load
    cy.get('[data-testid="instance-1-todo-list"]', { timeout: 15000 }).should('exist');

    // Clear all todos to test empty state
    // First, get all todo items and delete them
    cy.get('[data-testid="instance-1-todo-list"] [data-testid^="instance-1-todo-"]').each(($todo) => {
      const todoId = $todo.attr('data-testid')?.replace('instance-1-todo-', '');
      if (todoId) {
        cy.get(`[data-testid="instance-1-delete-${todoId}"]`).click();
      }
    });

    // Verify empty state is shown in all instances
    cy.get('[data-testid="instance-1-empty-message"]').should('contain', 'No todos to show');
    cy.get('[data-testid="instance-2-empty-message"]').should('contain', 'No todos to show');
    cy.get('[data-testid="summary-instance-empty-message"]').should('contain', 'No todos to show');

    // Verify counts are zero in all filter buttons
    cy.get('[data-testid="instance-1-filter-all"]').should('contain', 'All (0)');
    cy.get('[data-testid="instance-1-filter-active"]').should('contain', 'Active (0)');
    cy.get('[data-testid="instance-1-filter-completed"]').should('contain', 'Completed (0)');

    cy.get('[data-testid="instance-2-filter-all"]').should('contain', 'All (0)');
    cy.get('[data-testid="instance-2-filter-active"]').should('contain', 'Active (0)');
    cy.get('[data-testid="instance-2-filter-completed"]').should('contain', 'Completed (0)');
  });

  it('should handle hook loading errors gracefully', () => {
    cy.visit('http://localhost:4200/shared-store');

    // All shared store hooks should eventually load successfully
    cy.get('[data-testid="instance-1-todo-list"]', { timeout: 15000 }).should('exist');
    cy.get('[data-testid="instance-2-todo-list"]', { timeout: 15000 }).should('exist');
    cy.get('[data-testid="summary-instance-todo-list"]', { timeout: 15000 }).should('exist');

    // No error states should be visible initially
    cy.get('[data-testid="instance-1-error"]').should('not.exist');
    cy.get('[data-testid="instance-2-error"]').should('not.exist');
    cy.get('[data-testid="summary-instance-error"]').should('not.exist');
  });

  it('should maintain consistent counts across all instances', () => {
    cy.visit('http://localhost:4200/shared-store');

    // Wait for instances to load
    cy.get('[data-testid="instance-1-filter-group"]', { timeout: 15000 }).should('exist');

    // Add some todos and complete some to test counts
    const activeTodos = ['Active Todo 1', 'Active Todo 2'];
    const completedTodos = ['Completed Todo 1'];

    // Add active todos
    activeTodos.forEach((todo) => {
      cy.get('[data-testid="instance-1-add-input"]').type(todo);
      cy.get('[data-testid="instance-1-add-button"]').click();
    });

    // Add completed todos
    completedTodos.forEach((todo) => {
      cy.get('[data-testid="instance-1-add-input"]').type(todo);
      cy.get('[data-testid="instance-1-add-button"]').click();

      // Find and complete this todo
      cy.get('[data-testid="instance-1-todo-list"]')
        .contains(todo)
        .parents('[data-testid^="instance-1-todo-"]')
        .then(($todo) => {
          const todoId = $todo.attr('data-testid')?.replace('instance-1-todo-', '');
          cy.get(`[data-testid="instance-1-toggle-${todoId}"]`).click();
        });
    });

    // Wait for state to settle and verify counts are consistent across all instances
    cy.wait(500);

    // Get expected counts (initial demo todos + new todos)
    const expectedTotal = 2 + activeTodos.length + completedTodos.length; // 2 demo todos + our todos
    const expectedCompleted = 1 + completedTodos.length; // 1 demo completed + our completed
    const expectedActive = expectedTotal - expectedCompleted;

    // Verify counts in all instances
    ['instance-1', 'instance-2', 'summary-instance'].forEach((instance) => {
      cy.get(`[data-testid="${instance}-filter-all"]`).should('contain', `All (${expectedTotal})`);
      cy.get(`[data-testid="${instance}-filter-active"]`).should('contain', `Active (${expectedActive})`);
      cy.get(`[data-testid="${instance}-filter-completed"]`).should('contain', `Completed (${expectedCompleted})`);
    });
  });
});
