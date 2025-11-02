// addon-todoist-chore-board/web-ui/src/components/ProfileColumn.jsx
import React from 'react';
import TaskCard from './TaskCard';
import AddTaskForm from './AddTaskForm';
import Rewards from './Rewards';

const ProfileColumn = ({ name, tasks, entityId, stars }) => {
  return (
    <div className="bg-white rounded-3xl p-4 shadow-sm">
      <h2 className="text-xl font-bold mb-4">{name}</h2>
      <Rewards stars={stars} />
      <AddTaskForm entityId={entityId} />
      <div className="mt-4 space-y-3">
        {tasks.map(task => (
          <TaskCard key={task.uid} task={task} entityId={entityId} />
        ))}
      </div>
    </div>
  );
};

export default ProfileColumn;
