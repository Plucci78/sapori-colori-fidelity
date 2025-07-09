import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import EmailView from './components/Email/EmailView';
import Notification from './components/shared/Notification';
import LoadingSpinner from './components/shared/LoadingSpinner';

const App = () => {
  return (
    <Router>
      <div className="app-container">
        <Notification />
        <LoadingSpinner />
        <Switch>
          <Route path="/" exact component={EmailView} />
          {/* Additional routes can be added here */}
        </Switch>
      </div>
    </Router>
  );
};

export default App;