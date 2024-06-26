describe('Module error loading handling', () => {
  it('should show chunk loading error message', () => {
    cy.visit('http://localhost:4200/legacy');

    // intercept webpack chunk and return 500 response
    cy.intercept('GET', 'http://127.0.0.1:8001/exposed-./PreLoadedModule.js', {
      statusCode: 500,
    });

    cy.on('uncaught:exception', () => {
      // exceptions are expected during this test
      // returning false here prevents Cypress from failing the test
      return false;
    });

    cy.get('#render-preload-module').click();
    cy.wait(1000);

    cy.contains(`Loading chunk exposed-./PreLoadedModule failed.`).should('exist');
  });

  it('should handle runtime module error', () => {
    cy.on('uncaught:exception', () => {
      // exceptions are expected during this test
      // returning false here prevents Cypress from failing the test
      return false;
    });
    cy.visit('http://localhost:4200/runtime-error');

    // the react app is still active
    cy.get('h2').contains('Runtime error route').should('exist');
    // error component is rendered
    cy.get('p').contains('Synthetic error message').should('exist');
  });

  it('should render an error with a message is manifest fetch returned 404', () => {
    cy.visit('http://localhost:4200/not-found-error');
    cy.on('uncaught:exception', () => {
      // exceptions are expected during this test
      // returning false here prevents Cypress from failing the test
      return false;
    });

    cy.get('h2').contains('Error loading component').should('exist');
    cy.get('p').contains('Unable to load manifest files at /assets/testPath/foo/bar/nonsense.json! 404: Not Found').should('exist');
  });
});
