// addon-todoist-chore-board/web-ui/src/components/AddTaskForm.jsx
import React, { useState } from 'react';
import { callService } from '../hass';

const AddTaskForm = ({ entityId }) => {
  const [task, setTask] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!task) return;

    try {
      await callService('todo', 'add_item', {
        entity_id: entityId,
        item: task,
      });
      setTask('');
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
      <input
        type="text"
        value={task}
        onChange={(e) => setTask(e.target.value)}
        placeholder="Add a new task"
        className="flex-grow p-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
      />
      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add</button>
    </form>
  );
};

export default AddTaskForm;
