describe('SDK module loading', () => {
  beforeEach(() => {
    cy.handleMetaError();
  });
  it('should show data from prefetch', () => {
    cy.visit('http://localhost:4200/sdk');

    // check if the component using named export is rendered
    cy.get('#named-component').should('exist');
  });
});
