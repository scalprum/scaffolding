import { nxE2EPreset } from '@nx/cypress/plugins/cypress-preset';
import { defineConfig } from 'cypress';

const nxe2eConfig = nxE2EPreset(__filename, { cypressDir: 'src' });

// Adds logging to terminal for debugging
// https://docs.cypress.io/api/commands/task#Usage
// Usage: `cy.task('log', 'my message');
export default defineConfig({
  e2e: {
    ...nxe2eConfig,
    setupNodeEvents(on) {
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
      });
    },
  },
});
