import React from 'react';
import { initializeApp } from '@scalprum/core';

const AppTwo = () => <h1>This is application two</h1>;

initializeApp({
  id: 'app-two',
  name: 'appTwo',
  unmount: () => {
    console.log('unmounting app two');
  },
  update: console.log,
  mount: () => <AppTwo />,
});
