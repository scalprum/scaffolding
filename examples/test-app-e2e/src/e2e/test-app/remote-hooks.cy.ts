describe('useRemoteHook functionality', () => {
  beforeEach(() => {
    cy.handleMetaError();
  });

  it('should load and display remote hooks page', () => {
    cy.visit('http://localhost:4200/remote-hooks');
    cy.contains('Remote Hooks Testing').should('exist');
    cy.contains('Testing useRemoteHook functionality with various hook types').should('exist');
  });

  it('should load counter hook and allow interactions', () => {
    cy.visit('http://localhost:4200/remote-hooks');

    // Wait for counter hook to load
    cy.get('[data-testid="counter-loading"]').should('exist');
    cy.get('[data-testid="counter-value"]', { timeout: 10000 }).should('exist');

    // Check initial value (should be 5 based on our config)
    cy.get('[data-testid="counter-value"]').should('contain', '5');

    // Test increment (step is 2)
    cy.get('[data-testid="counter-increment"]').click();
    cy.get('[data-testid="counter-value"]').should('contain', '7');

    // Test decrement
    cy.get('[data-testid="counter-decrement"]').click();
    cy.get('[data-testid="counter-value"]').should('contain', '5');

    // Test set to 100
    cy.get('[data-testid="counter-set-100"]').click();
    cy.get('[data-testid="counter-value"]').should('contain', '100');

    // Test reset
    cy.get('[data-testid="counter-reset"]').click();
    cy.get('[data-testid="counter-value"]').should('contain', '5');
  });

  it('should load API hook and handle data fetching', () => {
    cy.visit('http://localhost:4200/remote-hooks');

    // Wait for API hook to load
    cy.get('[data-testid="api-loading"]').should('exist');
    cy.get('[data-testid="api-data"]', { timeout: 10000 }).should('exist');

    // Check that data is displayed
    cy.get('[data-testid="api-data"]').should('contain', 'Hello from remote API!');

    // Test refetch functionality
    cy.get('[data-testid="api-refetch"]').click();
    cy.get('[data-testid="api-data-loading"]').should('exist');
    cy.get('[data-testid="api-data"]', { timeout: 5000 }).should('exist');
  });

  it('should handle API hook error states', () => {
    cy.visit('http://localhost:4200/remote-hooks');

    // Wait for initial load
    cy.get('[data-testid="api-data"]', { timeout: 10000 }).should('exist');

    // Toggle to fail mode
    cy.get('[data-testid="api-toggle-fail"]').click();
    cy.get('[data-testid="api-toggle-fail"]').should('contain', 'Make Succeed');

    // Refetch to trigger error
    cy.get('[data-testid="api-refetch"]').click();
    cy.get('[data-testid="api-data-error"]', { timeout: 5000 }).should('exist');
    cy.get('[data-testid="api-data-error"]').should('contain', 'Failed to fetch data');

    // Toggle back to success
    cy.get('[data-testid="api-toggle-fail"]').click();
    cy.get('[data-testid="api-toggle-fail"]').should('contain', 'Make Fail');

    // Refetch to get success
    cy.get('[data-testid="api-refetch"]').click();
    cy.get('[data-testid="api-data"]', { timeout: 5000 }).should('exist');
  });

  it('should load timer hook and control timer', () => {
    cy.visit('http://localhost:4200/remote-hooks');

    // Wait for timer hook to load
    cy.get('[data-testid="timer-loading"]').should('exist');
    cy.get('[data-testid="timer-value"]', { timeout: 10000 }).should('exist');

    // Check initial state (5 seconds, stopped)
    cy.get('[data-testid="timer-value"]').should('contain', '5s');
    cy.get('[data-testid="timer-status"]').should('contain', 'Stopped');

    // Start timer
    cy.get('[data-testid="timer-start"]').click();
    cy.get('[data-testid="timer-status"]').should('contain', 'Running');

    // Wait a bit and check that time decreased
    cy.wait(1500);
    cy.get('[data-testid="timer-value"]').should('not.contain', '5s');

    // Pause timer
    cy.get('[data-testid="timer-pause"]').click();
    cy.get('[data-testid="timer-status"]').should('contain', 'Stopped');

    // Reset timer
    cy.get('[data-testid="timer-reset"]').click();
    cy.get('[data-testid="timer-value"]').should('contain', '5s');
    cy.get('[data-testid="timer-status"]').should('contain', 'Stopped');

    // Test restart
    cy.get('[data-testid="timer-restart"]').click();
    cy.get('[data-testid="timer-status"]').should('contain', 'Running');
  });

  it('should display debug information', () => {
    cy.visit('http://localhost:4200/remote-hooks');

    // Wait for hooks to load
    cy.get('[data-testid="counter-value"]', { timeout: 10000 }).should('exist');
    cy.get('[data-testid="api-data"]', { timeout: 10000 }).should('exist');
    cy.get('[data-testid="timer-value"]', { timeout: 10000 }).should('exist');

    // Check debug info
    cy.get('[data-testid="debug-info"]').should('exist');
    cy.get('[data-testid="debug-info"]').should('contain', '"loading": false');
    cy.get('[data-testid="debug-info"]').should('contain', '"hasResult": true');
  });

  it('should handle hook loading errors gracefully', () => {
    cy.visit('http://localhost:4200/remote-hooks');

    // All hooks should eventually load successfully
    cy.get('[data-testid="counter-value"]', { timeout: 10000 }).should('exist');
    cy.get('[data-testid="api-data"]', { timeout: 10000 }).should('exist');
    cy.get('[data-testid="timer-value"]', { timeout: 10000 }).should('exist');

    // No error states should be visible initially
    cy.get('[data-testid="counter-error"]').should('not.exist');
    cy.get('[data-testid="timer-error"]').should('not.exist');
    cy.get('[data-testid="api-error"]').should('not.exist');
  });
});
