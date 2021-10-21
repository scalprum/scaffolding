import * as React from 'react';
import * as ReactDOM from 'react-dom';

const App = () => {
  return <div>There will be tests</div>;
};

const Wrapper = () => <App />;

ReactDOM.render(<Wrapper />, document.getElementById('root'));
