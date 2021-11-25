import * as React from 'react';

import TodoInput from './TodoInput';
import TodoPublicListSubscription from './TodoPublicList';

const TodoPublicWrapper = () => {
  return (
    <div className="todoWrapper">
      <div className="sectionHeader">Public feed (realtime)</div>
      <TodoInput isPublic={true} />
      <TodoPublicListSubscription />
    </div>
  );
};

export default TodoPublicWrapper;
