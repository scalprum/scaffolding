describe('Scalprum API', () => {
  beforeEach(() => {
    cy.handleMetaError();
  });

  it('should display values from scalprum API', () => {
    cy.visit('http://localhost:4200/api');
    cy.contains('API consumer isBeta: false').should('exist');
  });

  it('should update isBeta value', () => {
    cy.visit('http://localhost:4200/api');
    cy.contains('API consumer isBeta: false').should('exist');
    cy.contains('Toggle isBeta').click();
    cy.contains('API consumer isBeta: true').should('exist');
  });
});
