describe('nested react routing', () => {
  it('should directly jump to nested route from scaffolding', () => {
    cy.visit('http://localhost:8123/nested-routing');

    cy.contains('App three nested link from scaffolding').click();
    cy.get('h2').contains('App three nested route').should('exist');
  });

  it('should directly acess nested route from URL', () => {
    cy.visit('http://localhost:8123/nested-routing/app-three/nested');

    cy.get('h2').contains('App three nested route').should('exist');
  });

  it('should change scalplet location from scaffoling with shared router history', () => {
    cy.visit('http://localhost:8123/nested-routing/app-three');

    cy.contains('App three nested link from scaffolding').click();
    cy.get('h2').contains('App three nested route').should('exist');
  });

  it('should change scalplet location from scaffoling with separate router histories', () => {
    cy.visit('http://localhost:8123/nested-routing/app-four');

    cy.contains('App four nested link from scaffolding').click();
    cy.get('h2').contains('App four nested route').should('exist');
  });

  it('should navigate to a different scalplet nested route', () => {
    cy.visit('http://localhost:8123/nested-routing/app-four');

    cy.contains('App three nested link from scaffolding').click();
    cy.get('h2').contains('App three nested route').should('exist');
  });
});
