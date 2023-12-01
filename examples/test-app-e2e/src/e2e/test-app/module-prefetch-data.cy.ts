/* eslint-disable @typescript-eslint/ban-ts-comment */
describe('Data prefetch', () => {
  it('should show data from prefetch', () => {
    cy.visit('http://localhost:4200/legacy');

    cy.get('h2').contains('Module one remote component').should('exist');
    cy.get('p#success').contains('Hello').should('exist');
  });
  it('should show error message on prefetch failure', () => {
    cy.visit('http://localhost:4200/legacy');
    cy.window().then((win) => {
      // @ts-ignore
      win.prefetchError = true;
    });

    cy.on('uncaught:exception', () => {
      // exceptions are expected during this test
      // returning false here prevents Cypress from failing the test
      return false;
    });

    cy.get('h2').contains('Module one remote component').should('exist');
    cy.get('p#error').contains('Expected error').should('exist');
  });
  it('should render component when module does not have prefetch', () => {
    cy.visit('http://localhost:4200/legacy');

    cy.get('#render-preload-module').click();
    cy.get('h2#preload-heading').contains('This module is supposed to be pre-loaded').should('exist');
  });
  it('should call prefetch only once', () => {
    cy.visit('http://localhost:4200/legacy');

    cy.get('#render-prefetch-module').click();
    cy.wait(1000);
    cy.window().its('prefetchCounter').should('equal', 1);
  });
});
