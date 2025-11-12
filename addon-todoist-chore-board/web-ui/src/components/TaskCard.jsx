// addon-todoist-chore-board/web-ui/src/components/TaskCard.jsx
import React, { useMemo, useState } from 'react';
import { callService } from '../hass';

const PRIORITY_LABELS = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Urgent',
};

const clampPriority = value => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  if (numeric <= 0) {
    return 0;
  }
  if (numeric >= 4) {
    return 4;
  }
  return Math.round(numeric);
};

const TaskCard = ({ task, entityId, palette, onSelect, onStatusChange, showEmoji = true }) => {
  const [isCompleting, setIsCompleting] = useState(false);

  const handleComplete = async event => {
    event.stopPropagation();
    if (isCompleting || task.isCompleted) {
      return;
    }

    const rawUid = task.uid ?? task.id ?? null;
    if (!rawUid) {
      console.error('Task is missing a uid; cannot complete item', task);
      return;
    }

    const uid = String(rawUid);
    const resolvedEntityId = entityId ? String(entityId) : '';
    if (!resolvedEntityId) {
      console.error('Task is missing a resolved entity id; cannot complete item', {
        task,
        entityId,
      });
      return;
    }

    const payload = {
      entity_id: resolvedEntityId,
      item: uid,
      status: 'completed',
    };
    setIsCompleting(true);
    try {
      await callService('todo', 'update_item', payload);
      onStatusChange?.(true);
    } catch (error) {
      console.error('Failed to complete task:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const isCompleted = Boolean(task.isCompleted);
  let completionLabel = null;
  if (isCompleted) {
    const completedValue = task.completedAt;
    if (completedValue) {
      const parsed = new Date(completedValue);
      if (!Number.isNaN(parsed.getTime())) {
        const now = new Date();
        const sameDay = parsed.toDateString() === now.toDateString();
        const timeFormatter = new Intl.DateTimeFormat(undefined, {
          hour: 'numeric',
          minute: '2-digit',
        });
        const dateFormatter = new Intl.DateTimeFormat(undefined, {
          month: 'short',
          day: 'numeric',
        });
        const timeValue = timeFormatter.format(parsed);
        completionLabel = sameDay
          ? `Completed • ${timeValue}`
          : `Completed • ${dateFormatter.format(parsed)} ${timeValue}`;
      } else {
        completionLabel = 'Completed';
      }
    } else {
      completionLabel = 'Completed';
    }
  }

  const cardStyle = {
    background: isCompleted ? 'rgba(248, 250, 252, 0.7)' : 'rgba(255, 255, 255, 0.82)',
    borderColor: isCompleted ? palette.accent : palette.accentLight,
    boxShadow: `0 24px 38px -30px ${palette.shadow}`,
    opacity: isCompleted ? 0.7 : 1,
  };

  const buttonStyle = {
    borderColor: palette.accent,
    color: isCompleted ? '#ffffff' : palette.accent,
    backgroundColor: isCompleted ? palette.accent : 'rgba(255, 255, 255, 0.85)',
    opacity: isCompleting ? 0.6 : 1,
  };
  const priorityValue = useMemo(() => clampPriority(task.priority), [task.priority]);
  const priorityLabel = priorityValue ? PRIORITY_LABELS[priorityValue] ?? `Priority ${priorityValue}` : null;
  const cardClassName = `task-card${
    isCompleted ? ' task-card--completed' : ''
  }${priorityValue ? ` task-card--priority-${priorityValue}` : ''}${priorityValue ? ' task-card--has-priority' : ''}`;
  const buttonClassName = [
    'task-card__complete',
    isCompleting ? 'task-card__complete--busy' : '',
    isCompleted ? 'task-card__complete--completed' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const readableTitle = (task.displayTitle || task.title || 'this task').trim() || 'this task';
  const completeButtonLabel = isCompleted
    ? `${readableTitle} has already been completed`
    : `Mark ${readableTitle} complete`;
  const leadingEmoji = task.emoji;
  const shouldShowEmoji = Boolean(showEmoji && leadingEmoji);
  const displayTitle = task.displayTitle || task.title;

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(task);
    }
  };

  const handleCardKeyDown = event => {
    if (!onSelect) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(task);
    }
  };

  return (
    <article
      className={cardClassName}
      style={cardStyle}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
    >
      {priorityValue ? (
        <span
          className="task-card__priority-flag"
          aria-label={priorityLabel ? `Priority: ${priorityLabel}` : `Priority level ${priorityValue}`}
        >
          <span className="task-card__priority-flag-text">P{priorityValue}</span>
        </span>
      ) : null}
      <button
        type="button"
        onClick={handleComplete}
        disabled={isCompleting || isCompleted}
        className={buttonClassName}
        style={buttonStyle}
        aria-label={completeButtonLabel}
        aria-pressed={isCompleted}
        aria-disabled={isCompleting || isCompleted}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12l4 4 10-10" />
        </svg>
      </button>

      <div className="task-card__content">
        {shouldShowEmoji ? (
          <span className="task-card__emoji" aria-hidden="true">
            {leadingEmoji}
          </span>
        ) : null}
        <div className="task-card__main">
          <div className="task-card__title-row">
            <h3 className="task-card__title">{displayTitle}</h3>
            {task.isRecurring ? <span className="task-card__repeats">Repeats</span> : null}
          </div>
          {task.dueLabel ? <p className="task-card__due">{task.dueLabel}</p> : null}
          {task.overdueLabel ? <p className="task-card__overdue">{task.overdueLabel}</p> : null}
          {completionLabel ? <p className="task-card__completed">{completionLabel}</p> : null}
          {task.description ? <p className="task-card__description">{task.description}</p> : null}
        </div>
      </div>
    </article>
  );
};

export default TaskCard;
