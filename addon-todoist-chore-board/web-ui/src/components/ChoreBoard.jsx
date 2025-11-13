// addon-todoist-chore-board/web-ui/src/components/ChoreBoard.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ProfileColumn from './ProfileColumn';
import TaskEditorModal from './TaskEditorModal';
import TaskDetailModal from './TaskDetailModal';
import SettingsModal from './SettingsModal';
import { getStates, subscribeToEntities, startTiming, emitLog as logClientMessage } from '../hass';

const SEGMENTS = [
  { id: 'chores', label: 'Chores', icon: '🧹' },
  { id: 'morning', label: 'Morning', icon: '🌅' },
  { id: 'afternoon', label: 'Afternoon', icon: '🌞' },
  { id: 'evening', label: 'Evening', icon: '🌙' },
];

const ROUTINE_SEGMENTS = ['morning', 'afternoon', 'evening'];
const ROUTINE_SEGMENT_LIST = SEGMENTS.filter(segment => ROUTINE_SEGMENTS.includes(segment.id));
const CHORES_SEGMENT = SEGMENTS.find(segment => segment.id === 'chores');

const ROUTINE_SEGMENT_METADATA = {
  morning: {
    id: 'morning',
    label: 'Morning',
    icon: '🌅',
    startHour: 0,
    endHour: 12,
  },
  afternoon: {
    id: 'afternoon',
    label: 'Afternoon',
    icon: '🌞',
    startHour: 12,
    endHour: 18,
  },
  evening: {
    id: 'evening',
    label: 'Evening',
    icon: '🌙',
    startHour: 18,
    endHour: 24,
  },
};

const EMOJI_SEQUENCE_REGEX =
  /(\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D(?:\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?))*)/u;

function extractEmojiMetadata(text) {
  if (typeof text !== 'string') {
    return { emoji: null, displayTitle: '', rawTitle: text };
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return { emoji: null, displayTitle: '', rawTitle: text };
  }

  const match = trimmed.match(EMOJI_SEQUENCE_REGEX);
  if (!match) {
    return { emoji: null, displayTitle: trimmed, rawTitle: text };
  }

  const emoji = match[0];
  const prefix = trimmed.slice(0, match.index).trim();
  const suffix = trimmed.slice(match.index + emoji.length).trim();

  const pieces = [];
  if (prefix) {
    pieces.push(prefix);
  }
  if (suffix) {
    pieces.push(suffix);
  }

  const displayTitle = pieces.join(pieces.length === 2 ? ' ' : '') || trimmed.replace(match[0], '').trim() || trimmed;

  return {
    emoji,
    displayTitle,
    rawTitle: text,
  };
}

function determineRoutineSegmentForHour(hour) {
  if (hour < 12) {
    return 'morning';
  }
  if (hour < 18) {
    return 'afternoon';
  }
  return 'evening';
}

function formatDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createDefaultRoutineSegmentSet(referenceDate) {
  const now = referenceDate ? new Date(referenceDate) : new Date();
  const segment = determineRoutineSegmentForHour(now.getHours());
  return new Set([segment]);
}

function deriveDueDateKey(rawTask) {
  if (!rawTask?.due) {
    return null;
  }
  const { due } = rawTask;
  if (due.date) {
    if (typeof due.date === 'string' && due.date.includes('T')) {
      const parsed = new Date(due.date);
      const formatted = formatDateKey(parsed);
      if (formatted) {
        return formatted;
      }
      return due.date.split('T')[0];
    }
    return due.date;
  }
  if (due.datetime) {
    const parsed = new Date(due.datetime);
    return formatDateKey(parsed);
  }
  return null;
}

function setsAreEqual(setA, setB) {
  if (!(setA instanceof Set) || !(setB instanceof Set)) {
    return false;
  }
  if (setA.size !== setB.size) {
    return false;
  }
  for (const value of setA) {
    if (!setB.has(value)) {
      return false;
    }
  }
  return true;
}

function isSameDay(dateA, dateB) {
  if (!(dateA instanceof Date) || Number.isNaN(dateA.getTime())) {
    return false;
  }
  if (!(dateB instanceof Date) || Number.isNaN(dateB.getTime())) {
    return false;
  }
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function formatBoardDate(date) {
  const formatter = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return formatter.format(date);
}

const SETTINGS_STORAGE_KEY = 'todoist_chore_board_settings_v1';

const DEFAULT_SETTINGS = {
  showStars: true,
  confettiEnabled: true,
  emojiEnabled: true,
  emojiLibrary: 'emoji-picker-react',
};

let confettiModulePromise = null;

function launchConfettiBurst() {
  if (typeof window === 'undefined') {
    return;
  }
  if (!confettiModulePromise) {
    confettiModulePromise = import('canvas-confetti');
  }
  confettiModulePromise
    .then(module => {
      const fireConfetti = module?.default || module;
      if (typeof fireConfetti === 'function') {
        fireConfetti({
          particleCount: 120,
          spread: 72,
          ticks: 200,
          origin: { y: 0.65 },
        });
      }
    })
    .catch(error => {
      console.warn('[ChoreBoard] Confetti failed to launch', error);
    });
}

const PROFILE_PALETTES = {
  nas: {
    gradient: 'linear-gradient(180deg, #ffedd5 0%, #fed7aa 52%, #fff7ed 100%)',
    accent: '#f97316',
    accentLight: 'rgba(249, 115, 22, 0.14)',
    textPrimary: '#c2410c',
    section: '#f97316',
    emptyText: '#d97706',
    shadow: 'rgba(249, 115, 22, 0.32)',
  },
  simona: {
    gradient: 'linear-gradient(180deg, #ede9fe 0%, #d6bcfa 55%, #faf5ff 100%)',
    accent: '#8b5cf6',
    accentLight: 'rgba(139, 92, 246, 0.12)',
    textPrimary: '#5b21b6',
    section: '#a855f7',
    emptyText: '#6d28d9',
    shadow: 'rgba(139, 92, 246, 0.3)',
  },
  hari: {
    gradient: 'linear-gradient(180deg, #e0f2fe 0%, #bae6fd 48%, #f0f9ff 100%)',
    accent: '#0ea5e9',
    accentLight: 'rgba(14, 165, 233, 0.12)',
    textPrimary: '#0369a1',
    section: '#0ea5e9',
    emptyText: '#0284c7',
    shadow: 'rgba(14, 165, 233, 0.28)',
  },
  anyone: {
    gradient: 'linear-gradient(180deg, #d1fae5 0%, #bbf7d0 55%, #ecfdf5 100%)',
    accent: '#10b981',
    accentLight: 'rgba(16, 185, 129, 0.12)',
    textPrimary: '#047857',
    section: '#34d399',
    emptyText: '#047857',
    shadow: 'rgba(16, 185, 129, 0.26)',
  },
  default: {
    gradient: 'linear-gradient(180deg, #e2e8f0 0%, #f1f5f9 55%, #ffffff 100%)',
    accent: '#475569',
    accentLight: 'rgba(71, 85, 105, 0.12)',
    textPrimary: '#1f2937',
    section: '#475569',
    emptyText: '#475569',
    shadow: 'rgba(71, 85, 105, 0.25)',
  },
};

function deriveInitials(name) {
  if (!name) {
    return '?';
  }
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) {
    return name.slice(0, 1).toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function derivePalette(name) {
  if (!name) {
    return PROFILE_PALETTES.default;
  }
  const key = name.split(' ')[0]?.toLowerCase();
  return PROFILE_PALETTES[key] || PROFILE_PALETTES.default;
}

function deriveProfileSortRank(sensor) {
  const name = (sensor?.name ?? '').toLowerCase();
  if (name.includes('nas')) {
    return 0;
  }
  if (name.includes('simona')) {
    return 1;
  }
  if (name.includes('hari')) {
    return 3;
  }
  return 2;
}

function extractDueDateTime(task) {
  const due = task?.due;
  if (!due) {
    return null;
  }
  if (due.datetime) {
    const parsed = new Date(due.datetime);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (due.date) {
    if (typeof due.date === 'string' && due.date.includes('T')) {
      const parsed = new Date(due.date);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  }
  return null;
}

function deriveSegment(task) {
  const dueDateTime = extractDueDateTime(task);
  if (!dueDateTime) {
    return 'chores';
  }
  const hour = dueDateTime.getHours();
  if (hour < 12) {
    return 'morning';
  }
  if (hour < 18) {
    return 'afternoon';
  }
  return 'evening';
}

function formatDueLabel(task, now) {
  const due = task?.due;
  if (!due) {
    return 'Anytime';
  }

  const hasDateTime = Boolean(due.datetime);
  const parsed = hasDateTime
    ? new Date(due.datetime)
    : due.date
    ? new Date(`${due.date}T00:00:00`)
    : null;

  if (!parsed || Number.isNaN(parsed.getTime())) {
    return due.string || 'Anytime';
  }

  const sameDay = parsed.toDateString() === now.toDateString();
  const optionsDate = { weekday: 'short', month: 'short', day: 'numeric' };
  if (hasDateTime) {
    const timeFormatter = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
    const time = timeFormatter.format(parsed);
    if (sameDay) {
      return `Today • ${time}`;
    }
    return `${new Intl.DateTimeFormat(undefined, optionsDate).format(parsed)} • ${time}`;
  }

  if (sameDay) {
    return 'Due Today';
  }
  return `Due ${new Intl.DateTimeFormat(undefined, optionsDate).format(parsed)}`;
}

function formatOverdue(task, now) {
  const due = task?.due;
  if (!due) {
    return null;
  }
  const parsed = due.datetime
    ? new Date(due.datetime)
    : due.date
    ? new Date(`${due.date}T23:59:59`)
    : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return null;
  }
  if (parsed.getTime() >= now.getTime()) {
    return null;
  }
  const diffMs = now.getTime() - parsed.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} late`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} late`;
  }
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} late`;
}

function normaliseTask(rawTask, now, labelLookup) {
  if (!rawTask) {
    return null;
  }
  const id = rawTask.id || rawTask.uid || rawTask.task_id || rawTask.content;
  const title = rawTask.content || rawTask.summary || 'Untitled chore';
  const { emoji, displayTitle } = extractEmojiMetadata(title);
  const completedAtRaw = rawTask.completed_at || rawTask.completedAt || null;
  let completedAt = completedAtRaw;
  const status = typeof rawTask.status === 'string' ? rawTask.status.toLowerCase() : null;
  const checkedValue =
    typeof rawTask.checked === 'number'
      ? rawTask.checked === 1
      : typeof rawTask.checked === 'string'
      ? rawTask.checked === '1' || rawTask.checked.toLowerCase() === 'true'
      : null;
  const explicitCompleted =
    typeof rawTask.is_completed === 'boolean'
      ? rawTask.is_completed
      : typeof rawTask.completed === 'boolean'
      ? rawTask.completed
      : checkedValue;

  let isCompleted = explicitCompleted;
  if (status === 'completed') {
    isCompleted = true;
  } else if (status === 'needs_action' || status === 'active') {
    isCompleted = false;
  }

  if (isCompleted == null) {
    isCompleted = Boolean(completedAtRaw);
  }

  if (!isCompleted) {
    completedAt = null;
  }
  const segment = deriveSegment(rawTask);
  const lookup = labelLookup || {};
  const rawLabels = Array.isArray(rawTask.labels) ? rawTask.labels : [];
  const labels = rawLabels
    .map(labelId => lookup?.[String(labelId)] || lookup?.[labelId] || labelId)
    .filter(Boolean)
    .map(label => String(label));
  const isRoutine = labels.some(label => label.toLowerCase() === 'routine');
  const dueDateKey = deriveDueDateKey(rawTask);
  const isRecurring = Boolean(
    rawTask.is_recurring || rawTask.due?.is_recurring || rawTask.due?.isRecurring
  );
  return {
    id,
    uid: id,
    title,
    displayTitle: displayTitle || title,
    emoji: emoji || null,
    description: rawTask.description || '',
    due: rawTask.due || null,
    segment,
    dueLabel: formatDueLabel(rawTask, now),
    overdueLabel: isCompleted ? null : formatOverdue(rawTask, now),
    isCompleted,
  isRecurring,
    completedAt,
    labels,
    labelIds: rawLabels,
    isRoutine,
    priority: rawTask.priority || 0,
    projectId: rawTask.project_id || null,
    sectionId: rawTask.section_id || null,
    assigneeId: rawTask.assignee_id || null,
    dueString: rawTask.due?.string || '',
    dueLang: rawTask.due?.lang || '',
    dueDateKey,
    raw: rawTask,
  };
}

function compareTasks(a, b) {
  if (!a || !b) {
    return 0;
  }

  if (a.isCompleted !== b.isCompleted) {
    return a.isCompleted ? 1 : -1;
  }

  const aDue = a.due?.datetime || a.due?.date || null;
  const bDue = b.due?.datetime || b.due?.date || null;

  if (aDue && bDue) {
    const aDate = new Date(aDue);
    const bDate = new Date(bDue);
  if (!Number.isNaN(aDate.getTime()) && !Number.isNaN(bDate.getTime())) {
      if (aDate.getTime() !== bDate.getTime()) {
        return aDate.getTime() - bDate.getTime();
      }
    }
  } else if (aDue && !bDue) {
    return -1;
  } else if (!aDue && bDue) {
    return 1;
  }

  const titleA = (a.displayTitle || a.title || '').trim();
  const titleB = (b.displayTitle || b.title || '').trim();
  return titleA.localeCompare(titleB || '', undefined, { sensitivity: 'base' });
}

const ChoreBoard = () => {
  const [sensors, setSensors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTaskContext, setSelectedTaskContext] = useState(null);
  const [statusOverrides, setStatusOverrides] = useState({});
  const [boardDate, setBoardDate] = useState(() => new Date());
  const [showChores, setShowChores] = useState(true);
  const [activeRoutineSegments, setActiveRoutineSegments] = useState(() =>
    createDefaultRoutineSegmentSet(new Date())
  );
  const [routineAutoMode, setRoutineAutoMode] = useState(true);
  const [settings, setSettings] = useState(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_SETTINGS;
    }
    try {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) {
        return DEFAULT_SETTINGS;
      }
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...(parsed || {}) };
    } catch (error) {
      console.warn('[ChoreBoard] Failed to restore settings from storage', error);
      return DEFAULT_SETTINGS;
    }
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const configuredSensors = useMemo(() => window.ADDON_CONFIG?.sensors || [], []);
  const hasSimonaProfile = useMemo(
    () =>
      sensors.some(sensor =>
        typeof sensor?.name === 'string' && sensor.name.toLowerCase().includes('simona')
      ),
    [sensors]
  );

  const orderedSensors = useMemo(() => {
    if (!Array.isArray(sensors) || sensors.length === 0) {
      return sensors;
    }
    return sensors
      .map((sensor, index) => ({ sensor, index }))
      .sort((a, b) => {
        const rankA = deriveProfileSortRank(a.sensor);
        const rankB = deriveProfileSortRank(b.sensor);
        if (rankA !== rankB) {
          return rankA - rankB;
        }
        return a.index - b.index;
      })
      .map(entry => entry.sensor);
  }, [sensors]);

  useEffect(() => {
    const segmentList = Array.from(activeRoutineSegments.values());
    console.log('[ChoreBoard] State update', {
      boardDate: boardDate?.toISOString?.() ?? boardDate,
      showChores,
      routineAutoMode,
      activeRoutineSegments: segmentList,
    });
  }, [boardDate, showChores, routineAutoMode, activeRoutineSegments]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn('[ChoreBoard] Failed to persist settings', error);
    }
  }, [settings]);

  const boardDateLabel = useMemo(() => {
    if (!(boardDate instanceof Date) || Number.isNaN(boardDate.getTime())) {
      return 'Select a day';
    }
    return formatBoardDate(boardDate);
  }, [boardDate]);

  const isViewingToday = useMemo(() => isSameDay(boardDate, new Date()), [boardDate]);

  useEffect(() => {
    if (!routineAutoMode) {
      return;
    }
    const now = new Date();
    if (!isSameDay(boardDate, now)) {
      setRoutineAutoMode(false);
      setActiveRoutineSegments(prev => {
        const fullSet = new Set(ROUTINE_SEGMENTS);
        return setsAreEqual(prev, fullSet) ? prev : fullSet;
      });
      return;
    }
    const desired = createDefaultRoutineSegmentSet(now);
    setActiveRoutineSegments(prev => (setsAreEqual(prev, desired) ? prev : desired));
  }, [boardDate, routineAutoMode]);

  const toggleChores = useCallback(() => {
    setShowChores(prev => !prev);
  }, []);

  const toggleRoutineSegment = useCallback(segmentId => {
    setRoutineAutoMode(false);
    setActiveRoutineSegments(prev => {
      const next = new Set(prev);
      if (next.has(segmentId)) {
        if (next.size === 1) {
          return next;
        }
        next.delete(segmentId);
      } else {
        next.add(segmentId);
      }
      return next;
    });
  }, []);

  const handleToggleAutoMode = useCallback(() => {
    setRoutineAutoMode(prev => {
      const next = !prev;
      if (next) {
        const today = new Date();
        setBoardDate(today);
        const desired = createDefaultRoutineSegmentSet(today);
        setActiveRoutineSegments(current => (setsAreEqual(current, desired) ? current : desired));
      }
      return next;
    });
  }, []);

  const openSettingsModal = useCallback(() => {
    setIsSettingsModalOpen(true);
  }, []);

  const closeSettingsModal = useCallback(() => {
    setIsSettingsModalOpen(false);
  }, []);

  const handleSettingsChange = useCallback(
    nextSettings => {
      if (!nextSettings || typeof nextSettings !== 'object') {
        return;
      }
      setSettings(prev => ({ ...prev, ...nextSettings }));
    },
    []
  );

  const goToPreviousDay = useCallback(() => {
    setRoutineAutoMode(false);
    setBoardDate(prev => {
      const base = prev instanceof Date && !Number.isNaN(prev.getTime()) ? prev : new Date();
      const next = new Date(base);
      next.setDate(next.getDate() - 1);
      return next;
    });
  }, []);

  const goToNextDay = useCallback(() => {
    setRoutineAutoMode(false);
    setBoardDate(prev => {
      const base = prev instanceof Date && !Number.isNaN(prev.getTime()) ? prev : new Date();
      const next = new Date(base);
      next.setDate(next.getDate() + 1);
      return next;
    });
  }, []);

  const goToToday = useCallback(() => {
    const today = new Date();
    setBoardDate(today);
    setRoutineAutoMode(true);
    const desired = createDefaultRoutineSegmentSet(today);
    setActiveRoutineSegments(prev => (setsAreEqual(prev, desired) ? prev : desired));
  }, []);

  const buildSensorModel = useCallback(
    (sensorId, state) => {
      const endTiming = startTiming('ChoreBoard.buildSensorModel', {
        sensorId,
      });
  let tasksCount = 0;
  let completedCountValue = 0;
      try {
        const now = new Date();
        const name = state?.attributes?.friendly_name || sensorId;
        const palette = { ...derivePalette(name) };
        const allTasks = Array.isArray(state?.attributes?.tasks)
          ? state.attributes.tasks
          : [];
        const projectAttr = state?.attributes?.project || null;
        const projectIdAttr = state?.attributes?.project_id;
        const projectId =
          projectIdAttr != null
            ? projectIdAttr
            : projectAttr && typeof projectAttr === 'object'
            ? projectAttr.id ?? null
            : null;
        const resolvedProjectId =
          projectId != null && projectId !== '' ? String(projectId) : null;
        const project = projectAttr;
        const labelOptionsRaw = Array.isArray(state?.attributes?.label_options)
          ? state.attributes.label_options
          : [];
        const labelsByIdAttr = state?.attributes?.labels_by_id;
        const labelLookup = labelOptionsRaw.reduce((acc, option) => {
          if (!option) {
            return acc;
          }
          const optionId = option.id ?? option.label ?? option.value;
          const optionName = option.name ?? option.title ?? option.label ?? optionId;
          if (optionId != null) {
            acc[String(optionId)] = String(optionName);
          }
          if (optionName != null) {
            acc[String(optionName)] = String(optionName);
          }
          return acc;
        }, {});
        if (labelsByIdAttr && typeof labelsByIdAttr === 'object') {
          Object.entries(labelsByIdAttr).forEach(([key, value]) => {
            if (typeof value === 'string') {
              labelLookup[String(key)] = value;
            }
          });
        }
        const taskLookup = new Map();
        allTasks.forEach(task => {
          const rawId = task?.id || task?.uid;
          if (rawId) {
            taskLookup.set(rawId, task);
          }
        });
        const normalised = allTasks
          .map(task => normaliseTask(task, now, labelLookup))
          .filter(Boolean);
      console.log('[ChoreBoard] Normalised tasks', {
        sensorId,
        total: normalised.length,
        routine: normalised.filter(task => task.isRoutine).length,
        sample: normalised.slice(0, 5).map(task => ({
          id: task.id,
          title: task.title,
          isRoutine: task.isRoutine,
          segment: task.segment,
          dueDateKey: task.dueDateKey,
          dueRaw: task.raw?.due,
        })),
      });
      console.table(
        normalised.slice(0, 5).map(task => ({
          id: task.id,
          title: task.title,
          isRoutine: task.isRoutine,
          segment: task.segment,
          dueDateKey: task.dueDateKey,
          dueDate: task.raw?.due?.date,
          dueDatetime: task.raw?.due?.datetime,
        }))
      );
        const rootTasks = normalised.filter(task => {
          const raw = task?.uid ? taskLookup.get(task.uid) : null;
          return raw ? raw.parent_id == null : true;
        });
        const overriddenTasks = rootTasks.map(task => {
          const overrideKey = `${sensorId}:${task.id ?? task.uid ?? ''}`;
          const override = statusOverrides[overrideKey];
          if (!override) {
            return task;
          }
          if (override.isCompleted === task.isCompleted) {
            return task;
          }
          return {
            ...task,
            isCompleted: override.isCompleted,
            completedAt: override.isCompleted ? override.completedAt : null,
            overdueLabel: override.isCompleted ? null : task.overdueLabel,
          };
        });
        const sortedTasks = overriddenTasks.slice().sort(compareTasks);
        const completedCount = overriddenTasks.filter(task => task.isCompleted).length;
      console.log('[ChoreBoard] Final sensor model', {
        sensorId,
        total: sortedTasks.length,
        completed: completedCount,
        sample: sortedTasks.slice(0, 5).map(task => ({
          id: task.id,
          title: task.title,
          isRoutine: task.isRoutine,
          segment: task.segment,
          dueDateKey: task.dueDateKey,
          completedAt: task.completedAt,
        })),
      });
      console.table(
        sortedTasks.slice(0, 5).map(task => ({
          id: task.id,
          title: task.title,
          isRoutine: task.isRoutine,
          segment: task.segment,
          dueDateKey: task.dueDateKey,
          completedAt: task.completedAt,
        }))
      );
        const todoEntityId = sensorId.startsWith('sensor.')
          ? sensorId.replace('sensor.', 'todo.')
          : sensorId;
        tasksCount = sortedTasks.length;
        completedCountValue = completedCount;
        const model = {
          id: sensorId,
          name,
          palette,
          initials: deriveInitials(name),
          tasks: sortedTasks,
          stars: state?.attributes?.stars || 0,
          entityId: todoEntityId,
          progress: {
            completed: completedCount,
            total: overriddenTasks.length,
          },
          projectId: resolvedProjectId,
          project,
          labelOptions: labelOptionsRaw.map(option => ({
            id: option?.id ?? option?.label ?? option?.name ?? option,
            name: option?.name ?? option?.label ?? option?.title ?? option?.id ?? option,
          })),
          labelLookup,
        };
        endTiming({ taskCount: tasksCount, completed: completedCountValue });
        return model;
      } catch (error) {
        endTiming({ status: 'error', error: error?.message ?? String(error) });
        throw error;
      }
    },
    [statusOverrides]
  );

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = null;

    async function fetchInitialState() {
      try {
        setIsLoading(true);
        setLoadError(null);
        const allStates = await getStates();
        const relevantSensors = configuredSensors.map(sensorId =>
          buildSensorModel(sensorId, allStates[sensorId])
        );
        if (!cancelled) {
          setSensors(relevantSensors);
        }
      } catch (error) {
        console.error('Failed to fetch initial states:', error);
        if (!cancelled) {
          setLoadError('Unable to load chore data from Home Assistant. Check the browser console for details.');
        }
      }
      if (!cancelled) {
        setIsLoading(false);
      }
    }

    fetchInitialState();

    async function startSubscription() {
      try {
        const stop = await subscribeToEntities(entities => {
          setSensors(current =>
            configuredSensors.map(sensorId => {
              const state = entities[sensorId];
              const existing = current.find(sensor => sensor.id === sensorId);
              if (!state) {
                return existing || buildSensorModel(sensorId, null);
              }
              return buildSensorModel(sensorId, state);
            })
          );
        });

        if (cancelled) {
          stop();
          return;
        }

        unsubscribe = stop;
      } catch (error) {
        console.error('Failed to subscribe to entity updates:', error);
      }
    }

    startSubscription();

    return () => {
      cancelled = true;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [buildSensorModel, configuredSensors]);

  const handleTaskStatusChange = useCallback(
    (sensorId, rawTaskId, nextCompleted) => {
      const targetId = String(rawTaskId);
      const now = new Date();
      let nextContext = null;
      let completionToggled = false;

      setStatusOverrides(prev => {
        const next = { ...prev };
        const key = `${sensorId}:${targetId}`;
        next[key] = {
          isCompleted: nextCompleted,
          completedAt: nextCompleted ? now.toISOString() : null,
          updatedAt: now.getTime(),
        };
        return next;
      });

      setSensors(prevSensors =>
        prevSensors.map(sensor => {
          if (sensor.id !== sensorId) {
            return sensor;
          }

          let taskWasUpdated = false;
          const updatedTasks = sensor.tasks.map(task => {
            const currentId = String(task.id ?? task.uid ?? '');
            if (currentId !== targetId) {
              return task;
            }
            taskWasUpdated = true;
            if (task.isCompleted !== nextCompleted) {
              completionToggled = true;
            }
            const updatedTask = {
              ...task,
              isCompleted: nextCompleted,
              completedAt: nextCompleted ? now.toISOString() : null,
              overdueLabel: nextCompleted
                ? null
                : formatOverdue({ ...task, isCompleted: nextCompleted }, now),
            };
            return updatedTask;
          });

          if (!taskWasUpdated) {
            return sensor;
          }

          const sortedTasks = updatedTasks.slice().sort(compareTasks);
          const completedCount = sortedTasks.filter(task => task.isCompleted).length;
          const updatedSensor = {
            ...sensor,
            tasks: sortedTasks,
            progress: {
              ...sensor.progress,
              completed: completedCount,
            },
          };

          const replacementTask =
            sortedTasks.find(task => String(task.id ?? task.uid ?? '') === targetId) || null;
          nextContext = { sensor: updatedSensor, task: replacementTask };
          return updatedSensor;
        })
      );

      if (nextContext) {
        setSelectedTaskContext(current => {
          if (!current) {
            return current;
          }
          if (current.sensor.id !== sensorId) {
            return current;
          }
          if (!nextContext.task) {
            return { sensor: nextContext.sensor, task: current.task };
          }
          const currentTaskId = String(current.task?.id ?? current.task?.uid ?? '');
          if (currentTaskId !== targetId) {
            return { sensor: nextContext.sensor, task: current.task };
          }
          return nextContext;
        });
      }

      if (completionToggled && settings.confettiEnabled && nextCompleted) {
        launchConfettiBurst();
      }
    },
    [settings.confettiEnabled]
  );

  useEffect(() => {
    if (!sensors.length) {
      return;
    }
    setStatusOverrides(prev => {
      const next = { ...prev };
      let changed = false;
      sensors.forEach(sensor => {
        sensor.tasks.forEach(task => {
          const key = `${sensor.id}:${task.id ?? task.uid ?? ''}`;
          const override = next[key];
          if (!override) {
            return;
          }
          if (override.isCompleted === task.isCompleted) {
            delete next[key];
            changed = true;
          }
        });
      });
      return changed ? next : prev;
    });
  }, [sensors]);

  const openAddModal = useCallback(() => {
    setIsAddModalOpen(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setIsAddModalOpen(false);
  }, []);

  const openTaskDetail = useCallback((sensor, task) => {
    setSelectedTaskContext({ sensor, task });
    setIsDetailModalOpen(true);
  }, []);

  const closeTaskDetail = useCallback(() => {
    setIsDetailModalOpen(false);
    setSelectedTaskContext(null);
  }, []);

  const openEditModal = useCallback(() => {
    setIsDetailModalOpen(false);
    setIsEditModalOpen(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setSelectedTaskContext(null);
  }, []);

  if (isLoading) {
    return (
      <div className="chore-board__state">
        <p>Loading Todoist chores…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="chore-board__state chore-board__state--error">
        <p>{loadError}</p>
      </div>
    );
  }

  if (!configuredSensors.length) {
    return (
      <div className="chore-board__state">
        <p>No sensors configured yet. Update the add-on options to list your chore sensors.</p>
      </div>
    );
  }

  return (
    <div className="chore-board">
      <div className="chore-board__inner">
        <div className="chore-board__filters">
          <button type="button" className="chore-board__chip" onClick={goToPreviousDay}>
            <span className="chore-board__chip-label">Prev</span>
          </button>
          <button type="button" className="chore-board__chip" disabled>
            <span className="chore-board__chip-label">{boardDateLabel}</span>
          </button>
          <button type="button" className="chore-board__chip" onClick={goToNextDay}>
            <span className="chore-board__chip-label">Next</span>
          </button>
          <button
            type="button"
            className="chore-board__chip"
            onClick={goToToday}
            disabled={isViewingToday}
          >
            <span className="chore-board__chip-label">Today</span>
          </button>
        </div>

        <div className="chore-board__filters">
          <button
            type="button"
            className={showChores ? 'chore-board__chip chore-board__chip--active' : 'chore-board__chip'}
            onClick={toggleChores}
          >
            <span className="chore-board__chip-icon" aria-hidden="true">
              {CHORES_SEGMENT?.icon}
            </span>
            <span className="chore-board__chip-label">{CHORES_SEGMENT?.label || 'Chores'}</span>
          </button>
          <button
            type="button"
            className={
              routineAutoMode ? 'chore-board__chip chore-board__chip--active' : 'chore-board__chip'
            }
            onClick={handleToggleAutoMode}
          >
            <span className="chore-board__chip-label">
              {routineAutoMode ? 'Auto (On)' : 'Auto (Off)'}
            </span>
          </button>
          {ROUTINE_SEGMENT_LIST.map(segment => {
            const isActive = activeRoutineSegments.has(segment.id);
            const chipClass = isActive
              ? 'chore-board__chip chore-board__chip--active'
              : 'chore-board__chip';
            return (
              <button
                key={segment.id}
                type="button"
                onClick={() => toggleRoutineSegment(segment.id)}
                className={chipClass}
              >
                <span className="chore-board__chip-icon" aria-hidden="true">
                  {segment.icon}
                </span>
                <span className="chore-board__chip-label">{segment.label}</span>
              </button>
            );
          })}
          {hasSimonaProfile ? (
            <button
              type="button"
              className="chore-board__settings-button"
              onClick={openSettingsModal}
              aria-label="Open board settings"
            >
              ⚙️
            </button>
          ) : null}
        </div>

        <div className="chore-board__columns">
          {orderedSensors.map(sensor => (
            <ProfileColumn
              key={sensor.id}
              sensor={sensor}
              showChores={showChores}
              routineSegments={activeRoutineSegments}
              boardDate={boardDate}
              onTaskSelect={task => openTaskDetail(sensor, task)}
              onTaskStatusChange={handleTaskStatusChange}
              showStars={settings.showStars}
              showEmojis={settings.emojiEnabled}
            />
          ))}
        </div>
      </div>

      <button type="button" className="chore-board__fab" onClick={openAddModal} aria-label="Add chore">
        <span aria-hidden="true">+</span>
      </button>

      <TaskEditorModal
        mode="add"
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        profiles={orderedSensors}
        settings={settings}
      />

      <TaskDetailModal
        isOpen={isDetailModalOpen}
        onClose={closeTaskDetail}
        onEdit={openEditModal}
        context={selectedTaskContext}
        onStatusChange={handleTaskStatusChange}
      />

      <TaskEditorModal
        mode="edit"
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        profiles={orderedSensors}
        context={selectedTaskContext}
        settings={settings}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={closeSettingsModal}
        settings={settings}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  );
};

export default ChoreBoard;
