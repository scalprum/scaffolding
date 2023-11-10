describe('UseModule loading callback', () => {
  it('should display SDK inbox text', () => {
    cy.visit('http://localhost:8123/use-module');
    cy.contains('SDK Inbox').should('exist');
  });
});
