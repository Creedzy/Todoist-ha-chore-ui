// addon-todoist-chore-board/web-ui/src/components/AddTaskForm.jsx
import React, { useState } from 'react';
import { callService } from '../hass';

const AddTaskForm = ({ entityId, accentColor }) => {
  const [task, setTask] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!task.trim()) {
      return;
    }

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

  const buttonStyle = {
    backgroundColor: accentColor,
  };

  return (
    <form className="add-task" onSubmit={handleSubmit}>
      <input
        type="text"
        value={task}
        onChange={(e) => setTask(e.target.value)}
        placeholder="Add a new chore"
        className="add-task__input"
      />
      <button type="submit" className="add-task__button" style={buttonStyle} aria-label="Add chore">
        <span aria-hidden="true">+</span>
      </button>
    </form>
  );
};

export default AddTaskForm;
