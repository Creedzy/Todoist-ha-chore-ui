// addon-todoist-chore-board/web-ui/src/components/ProfileColumn.jsx
import React, { useEffect, useMemo } from 'react';
import TaskCard from './TaskCard';

const SECTION_META = {
  chores: { label: 'Chores', icon: '🧺' },
  morning: { label: 'Morning', icon: '🌅' },
  afternoon: { label: 'Afternoon', icon: '🌞' },
  evening: { label: 'Evening', icon: '🌙' },
};

const ROUTINE_META = { label: 'Daily Routine', icon: '🪥' };
const ROUTINE_SEGMENTS = ['morning', 'afternoon', 'evening'];

function toDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function deriveDateKeyFromValue(value) {
  if (!value) {
    return null;
  }
  const parsed = value instanceof Date ? value : new Date(value);
  return toDateKey(parsed);
}

function doesTaskMatchBoardDate(task, boardDateKey, todayKey) {
  if (!boardDateKey) {
    return true;
  }

  if (task?.dueDateKey === boardDateKey) {
    return true;
  }

  const rawDue = task?.raw?.due;
  if (rawDue?.date && rawDue.date === boardDateKey) {
    return true;
  }

  if (rawDue?.date && typeof rawDue.date === 'string' && rawDue.date.includes('T')) {
    const derived = deriveDateKeyFromValue(rawDue.date);
    if (derived === boardDateKey) {
      return true;
    }
  }

  if (rawDue?.datetime) {
    const derived = deriveDateKeyFromValue(rawDue.datetime);
    if (derived === boardDateKey) {
      return true;
    }
  }

  const isRecurring = Boolean(
    task?.isRecurring || rawDue?.is_recurring || rawDue?.isRecurring
  );
  if (isRecurring && todayKey && boardDateKey === todayKey) {
    return true;
  }

  return false;
}

const ProfileColumn = ({
  sensor,
  showChores,
  routineSegments,
  boardDate,
  onTaskSelect,
  onTaskStatusChange,
  showStars = true,
  showEmojis = true,
}) => {
  const { name, initials, palette, tasks, stars, entityId, progress } = sensor;
  const boardDateKey = useMemo(() => toDateKey(boardDate), [boardDate]);
  const todayKey = toDateKey(new Date());
  const routineSegmentsSet = routineSegments?.size ? routineSegments : null;

  const { routineTasks, routineDebug } = useMemo(() => {
    const debugRows = [];
    const filtered = tasks.filter(task => {
      const row = {
        id: task.id,
        title: task.title,
        segment: task.segment,
        isRoutine: task.isRoutine,
        dueDateKey: task.dueDateKey,
        rawDue: task.raw?.due,
        included: true,
        reason: 'included',
      };
      if (!task.isRoutine) {
        row.included = false;
        row.reason = 'not-marked-routine';
        debugRows.push(row);
        return false;
      }
      if (routineSegmentsSet && routineSegmentsSet.size > 0) {
        const segmentId = task.segment;
        if (ROUTINE_SEGMENTS.includes(segmentId)) {
          if (!routineSegmentsSet.has(segmentId)) {
            row.included = false;
            row.reason = 'segment-filtered';
            debugRows.push(row);
            return false;
          }
        } else if (segmentId && segmentId !== 'chores') {
          row.included = false;
          row.reason = 'segment-unknown';
          debugRows.push(row);
          return false;
        }
      }

  const matchesBoard = doesTaskMatchBoardDate(task, boardDateKey, todayKey);
      if (!matchesBoard) {
        row.included = false;
        row.reason = 'date-mismatch';
        debugRows.push(row);
        return false;
      }

      debugRows.push(row);
      return true;
    });
    return { routineTasks: filtered, routineDebug: debugRows };
  }, [tasks, routineSegmentsSet, boardDateKey, todayKey]);

  useEffect(() => {
    const segmentList = routineSegmentsSet ? Array.from(routineSegmentsSet.values()) : [];
    console.log('[ProfileColumn] Routine filter input', {
      sensorId: sensor.id,
      taskCount: tasks.length,
      routineSegments: segmentList,
      showChores,
      boardDateKey,
    });
    console.log('[ProfileColumn] Routine results', {
      sensorId: sensor.id,
      boardDateKey,
      routineTasks: routineTasks.map(task => ({
        id: task.id,
        title: task.title,
        segment: task.segment,
        dueDateKey: task.dueDateKey,
        rawDue: task.raw?.due,
        labels: task.labels,
      })),
      routineDebug,
    });
    if (routineDebug.length > 0) {
      console.table(routineDebug);
    }
  }, [sensor.id, tasks, routineSegmentsSet, showChores, boardDateKey, routineTasks, routineDebug]);

  const choreCandidates = useMemo(
    () => (showChores ? tasks.filter(task => !task.isRoutine) : []),
    [tasks, showChores]
  );

  const visibleSections = useMemo(() => {
    const groups = { chores: [], morning: [], afternoon: [], evening: [] };
    choreCandidates.forEach(task => {
      const key = groups[task.segment] ? task.segment : 'chores';
      groups[key].push(task);
    });

    return Object.entries(groups)
      .filter(([segment, segmentTasks]) => {
        if (segmentTasks.length === 0) {
          return false;
        }
        if (segment === 'chores') {
          return showChores;
        }
        if (!routineSegmentsSet || routineSegmentsSet.size === 0) {
          return true;
        }
        return routineSegmentsSet.has(segment);
      })
      .map(([segment, segmentTasks]) => ({
        id: segment,
        tasks: segmentTasks,
        meta: SECTION_META[segment] || SECTION_META.chores,
      }));
  }, [choreCandidates, routineSegmentsSet, showChores]);

  useEffect(() => {
    console.log('[ProfileColumn] Visible sections', {
      sensorId: sensor.id,
      sections: visibleSections.map(section => ({
        id: section.id,
        count: section.tasks.length,
        taskIds: section.tasks.map(task => task.id),
      })),
    });
  }, [sensor.id, visibleSections]);

  const showCelebration = progress.total > 0 && progress.completed === progress.total;

  const columnStyle = {
    background: palette.gradient,
    boxShadow: `0 22px 44px -28px ${palette.shadow}`,
    borderColor: 'rgba(255, 255, 255, 0.65)',
  };

  const avatarStyle = {
    backgroundColor: palette.accent,
    color: '#ffffff',
  };

  const progressChipStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    color: palette.textPrimary,
  };

  const starChipStyle = {
    backgroundColor: 'rgba(252, 211, 77, 0.4)',
    color: '#b45309',
  };

  const shouldShowStarChip = showStars && stars != null;
  const starDisplayValue = typeof stars === 'number' ? stars : Number(stars ?? 0) || 0;

  const sectionLabelStyle = {
    color: palette.section,
  };

  const dividerStyle = {
    backgroundColor: palette.section,
  };

  const emptyStateStyle = {
    color: palette.emptyText,
    borderColor: `${palette.emptyText}30`,
  };

  return (
    <article className="profile-column" style={columnStyle}>
      <header className="profile-column__header">
        <div className="profile-column__identity">
          <div className="profile-column__avatar" style={avatarStyle}>
            {initials}
          </div>
          <div>
            <h2 className="profile-column__name" style={{ color: palette.textPrimary }}>
              {name}
            </h2>
            <div className="profile-column__chip-row">
              <span className="profile-column__chip" style={progressChipStyle}>
                ✓ {progress.completed}/{progress.total || 0}
              </span>
              {shouldShowStarChip ? (
                <span className="profile-column__chip" style={starChipStyle}>
                  ⭐ {starDisplayValue}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        {showCelebration ? (
          <span className="profile-column__celebration" aria-label="All chores complete">
            🎉
          </span>
        ) : null}
      </header>

      <div className="profile-column__sections">
        {routineTasks.length > 0 ? (
          <section className="profile-section profile-section--routine">
            <div className="profile-section__heading">
              <span className="profile-section__icon" aria-hidden="true">
                {ROUTINE_META.icon}
              </span>
              <span className="profile-section__label" style={sectionLabelStyle}>
                {ROUTINE_META.label}
              </span>
              <span className="profile-section__divider" style={dividerStyle} />
            </div>
            <div className="profile-section__tasks">
              {routineTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  entityId={entityId}
                  palette={palette}
                  onSelect={() => onTaskSelect?.(task)}
                  onStatusChange={nextCompleted =>
                    onTaskStatusChange?.(
                      sensor.id,
                      String(task.id ?? task.uid ?? ''),
                      nextCompleted
                    )
                  }
                  showEmoji={showEmojis}
                />
              ))}
            </div>
          </section>
        ) : null}
        {visibleSections.length > 0 ? (
          visibleSections.map(section => (
            <section key={section.id} className="profile-section">
              <div className="profile-section__heading">
                <span className="profile-section__icon" aria-hidden="true">
                  {section.meta.icon}
                </span>
                <span className="profile-section__label" style={sectionLabelStyle}>
                  {section.meta.label}
                </span>
                <span className="profile-section__divider" style={dividerStyle} />
              </div>
              <div className="profile-section__tasks">
                {section.tasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    entityId={entityId}
                    palette={palette}
                    onSelect={() => onTaskSelect?.(task)}
                    onStatusChange={nextCompleted =>
                      onTaskStatusChange?.(
                        sensor.id,
                        String(task.id ?? task.uid ?? ''),
                        nextCompleted
                      )
                    }
                    showEmoji={showEmojis}
                  />
                ))}
              </div>
            </section>
          ))
        ) : null}
        {routineTasks.length === 0 && visibleSections.length === 0 ? (
          <p className="profile-column__empty" style={emptyStateStyle}>
            All done! Tap the plus to add a new chore when you're ready.
          </p>
        ) : null}
      </div>
    </article>
  );
};

export default ProfileColumn;
