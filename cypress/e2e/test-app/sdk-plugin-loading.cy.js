describe('SDK module loading', () => {
  it('should show data from prefetch', () => {
    cy.visit('http://localhost:8123/sdk');

    cy.get('div#sdk-module-item').contains('SDK Inbox').should('exist');
  });
});
