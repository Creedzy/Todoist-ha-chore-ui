// addon-todoist-chore-board/web-ui/src/components/TaskDetailModal.jsx
import React, { useMemo, useState } from 'react';
import Modal from './Modal';
import { callService } from '../hass';
import { TODOIST_PRIORITY_LABELS } from '../constants';

function buildDueDisplay(task) {
  if (!task?.dueLabel && !task?.due) {
    return 'Anytime';
  }
  if (task.dueLabel) {
    return task.dueLabel;
  }
  if (task.due?.datetime) {
    const parsed = new Date(task.due.datetime);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString();
    }
  }
  if (task.due?.date) {
    return task.due.date;
  }
  return 'Anytime';
}

const TaskDetailModal = ({ isOpen, onClose, onEdit, context, onStatusChange }) => {
  const [isMutating, setIsMutating] = useState(false);
  const task = context?.task ?? null;
  const sensor = context?.sensor ?? null;

  const detail = useMemo(() => {
    if (!task) {
      return null;
    }
    const priority = Number(task.priority) || 0;
    const priorityLabel = priority
      ? TODOIST_PRIORITY_LABELS[priority] || `Priority ${priority}`
      : '';
    const rawLabels = Array.isArray(task.labels) ? task.labels : [];
    const labels = Array.from(new Set(rawLabels.map(label => String(label))));
    return {
      title: task.displayTitle || task.title || 'Untitled chore',
      emoji: task.emoji || null,
      profile: sensor?.name ?? 'Unknown',
      dueDisplay: buildDueDisplay(task),
      overdueLabel: task.overdueLabel ?? '',
      description: task.description ?? '',
      isCompleted: Boolean(task.isCompleted),
      labels,
      priority,
      priorityLabel,
    };
  }, [sensor, task]);

  if (!isOpen || !task || !sensor) {
    return null;
  }

  const handleToggleComplete = async () => {
    if (isMutating) {
      return;
    }

    const rawUid = task.uid ?? task.id ?? null;
    if (!rawUid) {
      console.error('Task is missing a uid; cannot toggle completion', task);
      return;
    }

    const uid = String(rawUid);
    const resolvedEntityId = sensor.entityId ? String(sensor.entityId) : '';
    if (!resolvedEntityId) {
      console.error('Task is missing a resolved entity id; cannot toggle completion', {
        task,
        sensor,
      });
      return;
    }

    const payload = {
      entity_id: resolvedEntityId,
      item: uid,
      status: task.isCompleted ? 'needs_action' : 'completed',
    };
    setIsMutating(true);
    try {
      await callService('todo', 'update_item', payload);
      onStatusChange?.(sensor.id, uid, payload.status === 'completed');
      onClose?.();
    } catch (err) {
      console.error('Failed to update task status:', err);
      setIsMutating(false);
    }
  };

  const handleDelete = async () => {
    if (isMutating) {
      return;
    }

    const rawUid = task.uid ?? task.id ?? null;
    if (!rawUid) {
      console.error('Task is missing a uid; cannot delete', task);
      return;
    }

    const uid = String(rawUid);
    const resolvedEntityId = sensor.entityId ? String(sensor.entityId) : '';
    if (!resolvedEntityId) {
      console.error('Task is missing a resolved entity id; cannot delete', {
        task,
        sensor,
      });
      return;
    }
    setIsMutating(true);
    try {
      await callService('todo', 'remove_item', {
        entity_id: resolvedEntityId,
        item: uid,
      });
      onStatusChange?.(sensor.id, uid, false);
      onClose?.();
    } catch (err) {
      console.error('Failed to delete task:', err);
      setIsMutating(false);
    }
  };

  const handleEdit = () => {
    if (isMutating) {
      return;
    }
    onEdit?.();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="task-detail-title">
      <div className="task-detail">
        <header className="task-detail__header">
          <div className="task-detail__title-row">
            {detail?.emoji ? (
              <span className="task-detail__emoji" aria-hidden="true">
                {detail.emoji}
              </span>
            ) : null}
            <h2 id="task-detail-title" className="task-detail__title">
              {detail?.title}
            </h2>
          </div>
          <p className="task-detail__profile">Assigned to {detail?.profile}</p>
        </header>

        <div className="task-detail__body">
          <div className="task-detail__row">
            <span className="task-detail__label">Due</span>
            <span className="task-detail__value">{detail?.dueDisplay}</span>
          </div>
          {detail?.overdueLabel ? (
            <div className="task-detail__row">
              <span className="task-detail__label">Status</span>
              <span className="task-detail__value task-detail__value--alert">{detail.overdueLabel}</span>
            </div>
          ) : null}
          {detail?.priority ? (
            <div className="task-detail__row">
              <span className="task-detail__label">Priority</span>
              <span className="task-detail__value">{detail.priorityLabel}</span>
            </div>
          ) : null}
          {detail?.labels?.length ? (
            <div className="task-detail__labels">
              <span className="task-detail__label">Labels</span>
              <div className="task-detail__label-list">
                {detail.labels.map(label => (
                  <span key={label} className="task-detail__chip">{label}</span>
                ))}
              </div>
            </div>
          ) : null}
          <div className="task-detail__notes">
            <span className="task-detail__label">Notes</span>
            <p className="task-detail__description">
              {detail?.description ? detail.description : 'No additional notes provided.'}
            </p>
          </div>
        </div>

        <footer className="task-detail__footer">
          <button
            type="button"
            className="task-detail__secondary"
            onClick={handleDelete}
            disabled={isMutating}
          >
            Delete
          </button>
          <div className="task-detail__actions">
            <button
              type="button"
              className="task-detail__secondary"
              onClick={handleEdit}
              disabled={isMutating}
            >
              Edit
            </button>
            <button
              type="button"
              className="task-detail__primary"
              onClick={handleToggleComplete}
              disabled={isMutating}
            >
              {task.isCompleted ? 'Mark as active' : 'Mark complete'}
            </button>
          </div>
        </footer>
      </div>
    </Modal>
  );
};

export default TaskDetailModal;
