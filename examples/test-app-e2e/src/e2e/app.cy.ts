describe('shell-e2e', () => {
  beforeEach(() => cy.visit('/'));

  it('should display welcome message', () => {
    cy.contains(/Scalprum testing page/).should('exist');
  });
});
