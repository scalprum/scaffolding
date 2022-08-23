describe('React routing', () => {
  it('should inject appOne script', () => {
    cy.visit('http://localhost:8123');

    cy.get('h2').contains('Module one remote component').should('exist');
  });
});
