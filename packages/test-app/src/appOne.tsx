import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { initializeApp } from '@scalprum/core';

const AppOne = () => <h1>This is application one</h1>;

initializeApp({
  id: 'app-one',
  name: 'appOne',
  unmount: () => {
    console.log('unmounting app one');
    unmountComponentAtNode(document.getElementById('app-one-root')!);
  },
  update: console.log,
  mount: () => render(<AppOne />, document.getElementById('app-one-root')),
});
