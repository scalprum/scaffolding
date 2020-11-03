describe('React routing', () => {
  it('should inject appOne script', () => {
    cy.visit('http://localhost:8123/basic-routing');

    cy.contains('app-one').click();
    cy.get('h1').contains('This is application one').should('exist');

    /**
     * Select nested scalplet route
     */
    cy.contains('App one nested route').click();
    /**
     * Check nested route content
     */
    cy.get('h2').contains('App one nested route').should('exist');

    /**
     * Should load lazy loaded route
     */
    cy.contains('App one nested lazy route').click();
    cy.get('h2').contains('Lazy loaded route').should('exist');
    /**
     * Select root scalplet route
     */
    cy.contains('App one top').click();
    cy.get('h2').should('not.exist');
  });
});
