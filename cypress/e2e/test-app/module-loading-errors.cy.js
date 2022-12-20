describe('Module error loading handling', () => {
  it('should show cunk loading error message', () => {
    cy.visit('http://localhost:8123');

    // intercept webpack chunk and return 500 response
    cy.intercept('GET', '/src_modules_preLoad_tsx.js', {
      statusCode: 500,
    });

    cy.on('uncaught:exception', () => {
      // exceptions are expected during this test
      // returning false here prevents Cypress from failing the test
      return false;
    });

    const button = cy.get('#render-preload-module');
    button.click();

    cy.get('p.foo').contains('Loading chunk src_modules_preLoad_tsx failed.').should('exist'); // or p.foo ? .foo > p
  });

  it('should try self healing and render on second try', () => {
    let c = 0;
    cy.visit('http://localhost:8123');

    // intercept webpack chunk and return 500 response
    cy.intercept('GET', '/src_modules_preLoad_tsx.js', (res) => {
      c += 1;
      if (c === 1) {
        // make sure the 500 request was sent
        expect(c).equal(1);
        return res.reply({
          statusCode: 500,
        });
      }

      res.continue();
    }).as('chunk');

    cy.on('uncaught:exception', () => {
      // exceptions are expected during this test
      // returning false here prevents Cypress from failing the test
      return false;
    });

    const button = cy.get('#render-preload-module');
    button.click();

    cy.wait('@chunk');

    cy.get('h2#preload-heading').contains('This module is supposed to be pre-loaded').should('exist');
  });

  it('should handle runtime module error', () => {
    cy.visit('http://localhost:8123/runtime-error');

    // the react app is still active
    cy.get('h2').contains('Runtime error route').should('exist');
    // error component is rendered
    cy.get('p').contains('Synthetic error message').should('exist');
  });
});
