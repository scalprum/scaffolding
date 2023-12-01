import { ScalprumComponent } from '@scalprum/react-core';
import React from 'react';

const NotFoundError = () => {
  return (
    <div>
      <ScalprumComponent scope="notFound" module="bar" />
    </div>
  );
};

export default NotFoundError;
