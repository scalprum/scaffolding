describe('SDK module loading', () => {
  it('should show data from prefetch', () => {
    cy.visit('http://localhost:8123/sdk');

    // check if the component using named export is rendered
    cy.get('#named-component').should('exist');
  });
});
