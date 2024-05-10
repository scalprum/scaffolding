import { ScalprumComponent } from '@scalprum/react-core';

const ModuleThree = () => {
  return (
    <div>
      <h2>Module three remote component</h2>
      <ScalprumComponent scope="preLoad" module="./NestedModule" />
    </div>
  );
};

export default ModuleThree;
