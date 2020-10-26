describe('React script injection', () => {
  it('should inject appOne script', () => {
    cy.visit('http://localhost:8123');

    /**
     * App one should load
     */
    cy.contains('app-one').click();
    cy.get('div#app-one-root').should('exist');
    cy.get('script#appOne').should('exist');

    /**
     * App two should load
     */
    cy.contains('app-two').click();
    cy.get('div#app-one-root').should('not.exist');
    cy.get('div#app-two-root').should('exist');
    cy.get('script#appTwo').should('exist');
  });
});
