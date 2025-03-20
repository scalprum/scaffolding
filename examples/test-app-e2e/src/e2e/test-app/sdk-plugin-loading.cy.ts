describe('SDK module loading', () => {
  beforeEach(() => {
    cy.handleMetaError();
  });
  it('should show data from prefetch', () => {
    cy.visit('http://localhost:4200/sdk');
    cy.get('div#sdk-module-item').contains('SDK Inbox').should('exist');
  });

  it('should render a slider from the pluginManifest', () => {
    cy.intercept('GET', '/full-manifest.js?cacheBuster=*').as('manifestRequest');
    cy.visit('http://localhost:4200/sdk');

    cy.wait('@manifestRequest').then((interception) => {
      expect(interception.response.statusCode).to.eq(200);
      expect(interception.response.headers['content-type']).to.include('application/javascript');
    });
    cy.get(`[aria-label="Checked"]`).should('exist');
    cy.get('#plugin-manifest').should('exist');
  });

  it('should render delayed module without processing entire manifest', () => {
    cy.visit('http://localhost:4200/sdk');
    // Delayed module is fetched after 5 seconds
    cy.wait(5001);
    cy.get('#delayed-module').should('exist');
  });
});
