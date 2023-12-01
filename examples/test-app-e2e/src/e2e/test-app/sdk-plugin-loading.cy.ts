describe('SDK module loading', () => {
  beforeEach(() => {
    cy.handleMetaError();
  });
  it('should show data from prefetch', () => {
    cy.visit('http://localhost:4200/sdk');

    cy.get('div#sdk-module-item').contains('SDK Inbox').should('exist');
  });
});
