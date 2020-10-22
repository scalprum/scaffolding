import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { initializeApp } from '@scalprum/core';

const AppTwo = () => <h1>This is application two</h1>;

initializeApp({
  id: 'app-two',
  name: 'appTwo',
  unmount: () => {
    console.log('unmounting app two');
    unmountComponentAtNode(document.getElementById('app-two-root')!);
  },
  update: console.log,
  mount: () => render(<AppTwo />, document.getElementById('app-two-root')),
});
