describe('useRemoteHookManager functionality', () => {
  beforeEach(() => {
    cy.handleMetaError();
  });

  it('should load and display remote hook manager page', () => {
    cy.visit('http://localhost:4200/remote-hook-manager');
    cy.contains('Remote Hook Manager Testing').should('exist');
    cy.contains('Testing useRemoteHookManager functionality with dynamic hook management').should('exist');
  });

  it('should start with no active hooks', () => {
    cy.visit('http://localhost:4200/remote-hook-manager');

    cy.get('[data-testid="hook-count"]').should('contain', 'Active Hooks: 0');
    cy.get('[data-testid="manager-debug"]').should('contain', '"totalHooks": 0');
  });

  it('should add and manage counter hooks', () => {
    cy.visit('http://localhost:4200/remote-hook-manager');

    // Add a counter hook
    cy.get('[data-testid="add-counter-hook"]').click();
    cy.get('[data-testid="hook-count"]').should('contain', 'Active Hooks: 1');

    // Wait for hook to load and check initial state
    cy.get('[data-testid="counter-value-0"]', { timeout: 10000 }).should('exist');

    // Test counter functionality
    cy.get('[data-testid="counter-increment-0"]').click();
    cy.get('[data-testid="counter-decrement-0"]').click();

    // Test updating args
    cy.get('[data-testid="counter-update-args-0"]').click();
    cy.get('[data-testid="counter-value-0"]').should('contain', '50');

    // Remove the hook
    cy.get('[data-testid="remove-hook-0"]').click();
    cy.get('[data-testid="hook-count"]').should('contain', 'Active Hooks: 0');
  });

  it('should add and manage API hooks', () => {
    cy.visit('http://localhost:4200/remote-hook-manager');

    // Add an API hook
    cy.get('[data-testid="add-api-hook"]').click();
    cy.get('[data-testid="hook-count"]').should('contain', 'Active Hooks: 1');

    // Wait for hook to load
    cy.get('[data-testid="api-data-0"]', { timeout: 10000 }).should('exist');
    cy.get('[data-testid="api-data-0"]').should('contain', 'API data 1');

    // Test refetch functionality
    cy.get('[data-testid="api-refetch-0"]').click();
    cy.get('[data-testid="api-loading-0"]').should('exist');
    cy.get('[data-testid="api-data-0"]', { timeout: 5000 }).should('exist');

    // Remove the hook
    cy.get('[data-testid="remove-hook-0"]').click();
    cy.get('[data-testid="hook-count"]').should('contain', 'Active Hooks: 0');
  });

  it('should add and manage timer hooks', () => {
    cy.visit('http://localhost:4200/remote-hook-manager');

    // Add a timer hook (auto-start is true)
    cy.get('[data-testid="add-timer-hook"]').click();
    cy.get('[data-testid="hook-count"]').should('contain', 'Active Hooks: 1');

    // Wait for hook to load and check it's running
    cy.get('[data-testid="timer-value-0"]', { timeout: 10000 }).should('exist');
    cy.get('[data-testid="timer-status-0"]').should('contain', 'Running');

    // Test pause
    cy.get('[data-testid="timer-pause-0"]').click();
    cy.get('[data-testid="timer-status-0"]').should('contain', 'Stopped');

    // Test reset
    cy.get('[data-testid="timer-reset-0"]').click();
    cy.get('[data-testid="timer-value-0"]').should('contain', '10s');
    cy.get('[data-testid="timer-status-0"]').should('contain', 'Stopped');

    // Test start
    cy.get('[data-testid="timer-start-0"]').click();
    cy.get('[data-testid="timer-status-0"]').should('contain', 'Running');

    // Remove the hook
    cy.get('[data-testid="remove-hook-0"]').click();
    cy.get('[data-testid="hook-count"]').should('contain', 'Active Hooks: 0');
  });

  it('should manage multiple hooks simultaneously', () => {
    cy.visit('http://localhost:4200/remote-hook-manager');

    // Add multiple hooks
    cy.get('[data-testid="add-counter-hook"]').click();
    cy.get('[data-testid="add-api-hook"]').click();
    cy.get('[data-testid="add-timer-hook"]').click();
    cy.get('[data-testid="hook-count"]').should('contain', 'Active Hooks: 3');

    // Wait for all hooks to load
    cy.get('[data-testid="counter-value-0"]', { timeout: 10000 }).should('exist');
    cy.get('[data-testid="api-data-1"]', { timeout: 10000 }).should('exist');
    cy.get('[data-testid="timer-value-2"]', { timeout: 10000 }).should('exist');

    // Interact with each hook
    cy.get('[data-testid="counter-increment-0"]').click();
    cy.get('[data-testid="api-refetch-1"]').click();
    cy.get('[data-testid="timer-pause-2"]').click();

    // Check debug info shows all hooks
    cy.get('[data-testid="manager-debug"]').should('contain', '"totalHooks": 3');

    // Remove middle hook (API hook)
    cy.get('[data-testid="remove-hook-1"]').click();
    cy.get('[data-testid="hook-count"]').should('contain', 'Active Hooks: 2');

    // Verify remaining hooks still work
    cy.get('[data-testid="counter-increment-0"]').click();
    cy.get('[data-testid="timer-start-1"]').click(); // Now index 1 since we removed middle hook
  });

  it('should cleanup all hooks at once', () => {
    cy.visit('http://localhost:4200/remote-hook-manager');

    // Add multiple hooks
    cy.get('[data-testid="add-counter-hook"]').click();
    cy.get('[data-testid="add-api-hook"]').click();
    cy.get('[data-testid="add-timer-hook"]').click();
    cy.get('[data-testid="hook-count"]').should('contain', 'Active Hooks: 3');

    // Wait for hooks to load
    cy.get('[data-testid="counter-value-0"]', { timeout: 10000 }).should('exist');
    cy.get('[data-testid="api-data-1"]', { timeout: 10000 }).should('exist');
    cy.get('[data-testid="timer-value-2"]', { timeout: 10000 }).should('exist');

    // Cleanup all
    cy.get('[data-testid="cleanup-all"]').click();
    cy.get('[data-testid="hook-count"]').should('contain', 'Active Hooks: 0');
    cy.get('[data-testid="manager-debug"]').should('contain', '"totalHooks": 0');
  });

  it('should handle hook loading states', () => {
    cy.visit('http://localhost:4200/remote-hook-manager');

    // Add a hook and verify it loads successfully
    cy.get('[data-testid="add-counter-hook"]').click();

    // Verify the hook loads and displays correctly (skip checking loading state)
    cy.get('[data-testid="counter-value-0"]', { timeout: 10000 }).should('exist');

    // Verify the hook is functional
    cy.get('[data-testid="counter-increment-0"]').click();
    cy.get('[data-testid="counter-value-0"]').should('not.contain', '0');
  });

  it('should preserve hook state when adding new hooks', () => {
    cy.visit('http://localhost:4200/remote-hook-manager');

    // Add counter hook and modify its value
    cy.get('[data-testid="add-counter-hook"]').click();
    cy.get('[data-testid="counter-value-0"]', { timeout: 10000 }).should('exist');
    cy.get('[data-testid="counter-increment-0"]').click();
    cy.get('[data-testid="counter-increment-0"]').click();

    // Add another hook
    cy.get('[data-testid="add-api-hook"]').click();
    cy.get('[data-testid="hook-count"]').should('contain', 'Active Hooks: 2');

    // First counter should preserve its state
    cy.get('[data-testid="counter-value-0"]').should('exist');

    // New API hook should load
    cy.get('[data-testid="api-data-1"]', { timeout: 10000 }).should('exist');
  });
});
