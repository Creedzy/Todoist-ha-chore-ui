// addon-todoist-chore-board/web-ui/src/components/TaskCard.jsx
import React from 'react';
import { callService } from '../hass';

const TaskCard = ({ task, entityId }) => {
  const handleComplete = async () => {
    try {
      await callService('todo', 'update_item', {
        entity_id: entityId,
        item: task.summary,
        status: 'completed',
      });
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  return (
    <div className="bg-gray-50 rounded-2xl p-3 flex justify-between items-center border border-gray-200">
      <p className="text-gray-800">{task.summary}</p>
      <input
        type="checkbox"
        onChange={handleComplete}
        checked={task.status === 'completed'}
        className="form-checkbox h-5 w-5 text-blue-600 rounded"
      />
    </div>
  );
};

export default TaskCard;
