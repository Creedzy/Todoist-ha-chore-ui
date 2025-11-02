// addon-todoist-chore-board/web-ui/src/components/Rewards.jsx
import React from 'react';

const Rewards = ({ stars }) => {
  return (
    <div className="rewards mb-4">
      <h3 className="text-lg font-semibold text-gray-700">Stars: <span className="text-blue-600">{stars}</span></h3>
    </div>
  );
};

export default Rewards;
