import { ScalprumComponent } from '@scalprum/react-core';
import React from 'react';
import LoadingComponent from '../components/LoadingComponent';

const RuntimeErrorRoute = () => {
  return (
    <div>
      <h2>Runtime error route</h2>
      <ScalprumComponent LoadingComponent={LoadingComponent} scope="sdk-plugin" module="./ErrorModule" />
    </div>
  );
};

export default RuntimeErrorRoute;
