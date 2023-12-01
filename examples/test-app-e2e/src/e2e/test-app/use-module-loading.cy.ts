describe('UseModule loading callback', () => {
  beforeEach(() => {
    cy.handleMetaError();
  });
  it('should display SDK inbox text', () => {
    cy.visit('http://localhost:4200/use-module');
    cy.contains('SDK Inbox').should('exist');
  });
});
