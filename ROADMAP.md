# Scalprum roadmap to v1.0.0

The following items are planned to be added to the Scalprum project. There is no "date" for any of them, but they are sorted by their priority. By the end of the list, the priorities are a bit fuzzy.

## Move the [@openshift/dynamic-plugin-sdk](https://github.com/openshift/dynamic-plugin-sdk) to the Scalprum project

The `@openshift/dynamic-plugin-sdk` and the `@openshift/dynamic-plugin-sdk-webpack` are tightly coupled together.

The `@openshift/*` packages provide low API to access the module federation features. Currently, Scalprum is more concerned with the developer facing API.

Historically, Scalprum had its own module federation API, but because of the similarities with the SDK packages, and to save some time, it was decided to combine these two into a single project.

Now that all projects have been migrated or are in the process of migration to the latest version of the `@openshift/dynamic-plugin-sdk` and no more breaking changes are planned, we can kick off the movement of the packages under a single umbrella.

This move is purely formal. No changes to the current behavior are planned in this goal.

## Adopting [@module-federation/*](https://github.com/module-federation/universe/tree/main) packages

When Scalprum and the plugin SDK were created, the `@module-federation` packages did not exist. Now that the module federation concept has existed for some time and it matured, we can now look to other open-source packages to take over the low-level module federation APIs and focus on additional features, rather than maintaining the module federation APIs.

The `@module-federation/*` packages have been out for some time and are in a good state for us to "give up" some of the code.

An additional benefit of this move is compatibility with the rest of the community rather than carving our path. Creating "module federation" framework is not the long-term goal of this project. The project is focused purely on enabling micro frontends for React applications. And maybe one day even a framework. Not the build tooling that enables it.

## Enabling SSR support

Currently, Scalprum is not compatible with SSR. We have already made a working POC and we know it works well.

## Looking beyond webpack

As of now, Scalprum works only with webpack. We know that other build tools support these features. Namely `Vite` and more recently `Rspack`.

Both of the above-mentioned options will be at minimum explored and tested. Both of the projects claim compatibility with webpack. That should make the migration easy and even potentially allow the mixing of the tooling in a single project.

## Building proper documentation site

Right now, the documentation is lacking. We realize that. As of recently, Scalprum has been used mostly in internal projects. That is starting to change and it means we have to provide better documentation for everybody.

We see the above-mentioned items of this roadmap to be necessary for a proper v1 release. Once we are happy with the state of the other items on the roadmap, we will combine the currently very spread resources to create proper documentation.


## V1 Release
