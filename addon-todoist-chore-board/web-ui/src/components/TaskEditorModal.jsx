// addon-todoist-chore-board/web-ui/src/components/TaskEditorModal.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Modal from './Modal';
import { callService } from '../hass';
import {
  TODOIST_DEFAULT_DUE_LANG,
  TODOIST_DUE_LANG_CODES,
  TODOIST_PRIORITY_OPTIONS,
} from '../constants';
import EmojiPicker from 'emoji-picker-react';

const FALLBACK_PRIORITY = Number(TODOIST_PRIORITY_OPTIONS[0]?.value ?? 1);

const DEFAULT_EDITOR_SETTINGS = {
  emojiEnabled: true,
  emojiLibrary: 'emoji-picker-react',
};

const defaultState = {
  summary: '',
  description: '',
  dueDate: '',
  dueTime: '',
  dueString: '',
  dueLang: TODOIST_DEFAULT_DUE_LANG,
  priority: String(FALLBACK_PRIORITY),
  profileId: '',
  itemType: 'chore',
};

function extractInitialFormState(mode, context, profiles) {
  if (mode !== 'edit' || !context?.task || !context?.sensor) {
    const initialProfileId = profiles?.[0]?.entityId ?? '';
    return { ...defaultState, profileId: initialProfileId };
  }

  const { task, sensor } = context;
  let dueDate = '';
  let dueTime = '';
  if (task.due?.datetime) {
    const parsed = new Date(task.due.datetime);
    if (!Number.isNaN(parsed.getTime())) {
      dueDate = parsed.toISOString().slice(0, 10);
      dueTime = parsed.toISOString().slice(11, 16);
    }
  } else if (task.due?.date) {
    dueDate = task.due.date;
  }

  const rawTask = task.raw ?? {};
  const rawLabels = Array.isArray(rawTask.labels) ? rawTask.labels : [];
  const profile = profiles?.find(profileItem => profileItem.entityId === sensor.entityId) ?? null;
  const labelLookup = profile?.labelLookup || {};
  const resolvedLabels = rawLabels
    .map(label => labelLookup?.[String(label)] || labelLookup?.[label] || label)
    .filter(Boolean)
    .map(label => String(label));
  const routineLabelMatch = [...resolvedLabels, ...rawLabels]
    .map(label => String(label).toLowerCase())
    .some(label => label === 'routine');

  return {
    summary: task.title || '',
    description: rawTask.description ?? task.description ?? '',
    dueDate,
    dueTime,
    dueString: rawTask.due?.string || '',
    dueLang: rawTask.due?.lang || TODOIST_DEFAULT_DUE_LANG,
    priority: rawTask.priority ? String(rawTask.priority) : String(FALLBACK_PRIORITY),
    profileId: sensor.entityId,
    itemType: routineLabelMatch ? 'routine' : 'chore',
  };
}

function buildDuePayload({ dueDate, dueTime, dueString, dueLang }, { allowClear = false } = {}) {
  const trimmedDueString = dueString?.trim();
  if (trimmedDueString) {
    const payload = { due_string: trimmedDueString };
    if (dueLang) {
      payload.due_lang = dueLang;
    }
    return payload;
  }

  const payload = {};
  if (dueDate && dueTime) {
    const isoCandidate = new Date(`${dueDate}T${dueTime}:00`);
    if (!Number.isNaN(isoCandidate.getTime())) {
      payload.due_datetime = isoCandidate.toISOString();
    }
  } else if (dueDate) {
    payload.due_string = dueDate;
  }

  if ((payload.due_datetime || payload.due_date || payload.due_string) && dueLang) {
    payload.due_lang = dueLang;
  }

  if (!payload.due_datetime && !payload.due_date && allowClear) {
    payload.due_string = 'no date';
  }

  return payload;
}

const TaskEditorModal = ({
  mode = 'add',
  isOpen,
  onClose,
  profiles = [],
  context = null,
  settings = null,
}) => {
  const mergedSettings = useMemo(
    () => ({ ...DEFAULT_EDITOR_SETTINGS, ...(settings || {}) }),
    [settings]
  );
  const { emojiEnabled, emojiLibrary } = mergedSettings;
  const [formState, setFormState] = useState(() => extractInitialFormState(mode, context, profiles));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const summaryInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setFormState(extractInitialFormState(mode, context, profiles));
      setError('');
    }
  }, [isOpen, mode, context, profiles]);

  useEffect(() => {
    if (!emojiEnabled) {
      setIsEmojiPickerOpen(false);
    }
  }, [emojiEnabled]);

  useEffect(() => {
    if (!isOpen) {
      setIsEmojiPickerOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isEmojiPickerOpen) {
      return undefined;
    }

    const handleClickOutside = event => {
      if (
        emojiPickerRef.current?.contains(event.target) ||
        emojiButtonRef.current?.contains(event.target)
      ) {
        return;
      }
      setIsEmojiPickerOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEmojiPickerOpen]);

  const isEdit = mode === 'edit';
  const title = isEdit ? 'Edit Chore' : 'New Chore';
  const descriptionHint = isEdit
    ? 'Update the details below and save to sync with Todoist.'
    : 'Fill in the chore details and assign it to a profile.';

  const selectedProfile = useMemo(
    () => profiles.find(profile => profile.entityId === formState.profileId) || null,
    [profiles, formState.profileId]
  );

  const dueStringHint = 'Use Todoist quick-add syntax (e.g. "Tomorrow 7pm").';

  const isValid = formState.summary.trim().length > 0 && formState.profileId;

  const handleChange = event => {
    const { name, value } = event.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileSelect = profileId => {
    if (isEdit) {
      return;
    }
    setFormState(prev => ({ ...prev, profileId }));
  };

  const handleItemTypeChange = value => {
    setFormState(prev => ({ ...prev, itemType: value }));
  };

  const toggleEmojiPicker = () => {
    if (!emojiEnabled) {
      return;
    }
    setIsEmojiPickerOpen(prev => !prev);
  };

  const handleEmojiSelect = emojiData => {
    const emojiChar = emojiData?.emoji || emojiData?.native;
    if (!emojiChar) {
      return;
    }
    setFormState(prev => ({ ...prev, summary: `${prev.summary}${emojiChar}` }));
    setIsEmojiPickerOpen(false);
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        summaryInputRef.current?.focus();
      });
    }
  };

  const handleClearDue = () => {
    setFormState(prev => ({ ...prev, dueDate: '', dueTime: '', dueString: '' }));
  };

  const handleSubmit = async event => {
    event.preventDefault();
    if (!isValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const priorityCandidate = Number(formState.priority);
      const priorityValue = Number.isFinite(priorityCandidate) && priorityCandidate >= 1 && priorityCandidate <= 4
        ? Math.trunc(priorityCandidate)
        : FALLBACK_PRIORITY;
      const duePayload = buildDuePayload(formState, { allowClear: isEdit });
      const labelToApply = formState.itemType === 'routine' ? 'routine' : 'chore';

      const logContext = {
        mode,
        selectedProfile,
        sensorContext: context?.sensor,
      };
      const resolvedProjectId =
        selectedProfile?.projectId ??
        selectedProfile?.project?.id ??
        selectedProfile?.project?.project_id ??
        context?.sensor?.projectId ??
        context?.sensor?.project?.id ??
        context?.sensor?.project?.project_id ??
        selectedProfile?.tasks?.[0]?.projectId ??
        context?.sensor?.tasks?.[0]?.projectId ??
        '';
      const projectId = resolvedProjectId ? String(resolvedProjectId) : '';
      if (!projectId) {
        console.warn('TaskEditorModal: missing project metadata', logContext);
      }

      if (isEdit && context?.task) {
        const payload = {
          task_id: context.task.uid,
          content: formState.summary.trim(),
          description: formState.description?.trim() ?? '',
          priority: priorityValue,
        };

        Object.assign(payload, duePayload);

        payload.labels = [labelToApply];

        await callService('todoist', 'update_task', payload);
      } else {
        const payload = {
          content: formState.summary.trim(),
          project_id: projectId,
          priority: priorityValue,
        };

        if (!projectId) {
          console.error('TaskEditorModal: aborting add due to missing project metadata', logContext);
          throw new Error('Missing Todoist project metadata for the selected column');
        }

        if (formState.description?.trim()) {
          payload.description = formState.description.trim();
        }

        Object.assign(payload, duePayload);
        payload.labels = [labelToApply];

        await callService('todoist', 'new_task', payload);
      }

      onClose?.();
    } catch (err) {
      console.error('Failed to persist chore:', err);
      const message = err instanceof Error && err.message
        ? err.message
        : 'Unable to save chore. Check the browser console for details.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="task-editor-title">
      <form className="task-editor" onSubmit={handleSubmit}>
        <header className="task-editor__header">
          <h2 id="task-editor-title" className="task-editor__title">
            {title}
          </h2>
          <p className="task-editor__subtitle">{descriptionHint}</p>
        </header>

        <div className="task-editor__body">
          <div className="task-editor__field task-editor__field--stack">
            <span>Assign to</span>
            <div className="task-editor__profiles">
              {profiles.map(profile => {
                const isActive = profile.entityId === formState.profileId;
                const palette = profile.palette || {};
                const accent = palette.accent || '#2563eb';
                const accentLight = palette.accentLight || 'rgba(59, 130, 246, 0.12)';
                return (
                  <button
                    key={profile.entityId}
                    type="button"
                    className={`task-editor__profile-pill${isActive ? ' task-editor__profile-pill--active' : ''}`}
                    onClick={() => handleProfileSelect(profile.entityId)}
                    disabled={isEdit}
                    aria-pressed={isActive}
                    style={{
                      borderColor: isActive ? accent : 'transparent',
                      background: isActive ? accentLight : 'rgba(248, 250, 252, 0.7)',
                    }}
                  >
                    <span
                      className="task-editor__profile-avatar"
                      style={{ backgroundColor: accent }}
                    >
                      {profile.initials || profile.name?.slice(0, 2) || '?'}
                    </span>
                    <span className="task-editor__profile-name">{profile.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="task-editor__field task-editor__field--stack">
            <span>Type</span>
            <div className="task-editor__type-toggle">
              <button
                type="button"
                className={`task-editor__type-button${formState.itemType === 'chore' ? ' task-editor__type-button--active' : ''}`}
                onClick={() => handleItemTypeChange('chore')}
              >
                Chore
              </button>
              <button
                type="button"
                className={`task-editor__type-button${formState.itemType === 'routine' ? ' task-editor__type-button--active' : ''}`}
                onClick={() => handleItemTypeChange('routine')}
              >
                Routine
              </button>
            </div>
          </div>

          <label className="task-editor__field task-editor__field--title">
            <span>Title</span>
            <div className="task-editor__input-wrapper">
              <input
                type="text"
                name="summary"
                value={formState.summary}
                onChange={handleChange}
                placeholder="e.g. Feed the dog"
                required
                maxLength={120}
                ref={summaryInputRef}
              />
              {emojiEnabled ? (
                <button
                  type="button"
                  className={`task-editor__emoji-button${isEmojiPickerOpen ? ' task-editor__emoji-button--active' : ''}`}
                  onClick={toggleEmojiPicker}
                  aria-haspopup="dialog"
                  aria-expanded={isEmojiPickerOpen}
                  aria-label="Insert emoji"
                  ref={emojiButtonRef}
                >
                  🙂
                </button>
              ) : null}
            </div>
            {emojiEnabled ? (
              <p className="task-editor__hint task-editor__hint--inline">
                Emoji picker provided by {emojiLibrary}. Disable it from the board settings if you prefer plain text titles.
              </p>
            ) : null}
            {emojiEnabled && isEmojiPickerOpen ? (
              <div
                className="task-editor__emoji-popover"
                ref={emojiPickerRef}
                role="dialog"
                aria-label="Emoji picker"
              >
                <EmojiPicker
                  onEmojiClick={handleEmojiSelect}
                  lazyLoadEmojis
                  previewConfig={{ showPreview: false }}
                  searchDisabled={false}
                />
              </div>
            ) : null}
          </label>

          <label className="task-editor__field">
            <span>Description</span>
            <textarea
              name="description"
              value={formState.description}
              onChange={handleChange}
              placeholder="Add optional notes or emoji context"
              rows={3}
            />
          </label>

          <div className="task-editor__row">
            <label className="task-editor__field">
              <span>Due date</span>
              <input
                type="date"
                name="dueDate"
                value={formState.dueDate}
                onChange={handleChange}
              />
            </label>
            <label className="task-editor__field">
              <span>Time</span>
              <input
                type="time"
                name="dueTime"
                value={formState.dueTime}
                onChange={handleChange}
                disabled={!formState.dueDate}
              />
            </label>
            <button type="button" className="task-editor__clear" onClick={handleClearDue}>
              Clear
            </button>
          </div>

          <div className="task-editor__row task-editor__row--wrap">
            <label className="task-editor__field">
              <span>Natural language due</span>
              <input
                type="text"
                name="dueString"
                value={formState.dueString}
                onChange={handleChange}
                placeholder="Tomorrow 7pm"
              />
              <p className="task-editor__hint">{dueStringHint}</p>
            </label>
            <label className="task-editor__field task-editor__field--compact">
              <span>Language</span>
              <select name="dueLang" value={formState.dueLang} onChange={handleChange}>
                {TODOIST_DUE_LANG_CODES.map(code => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="task-editor__field task-editor__field--compact">
            <span>Priority</span>
            <select name="priority" value={formState.priority} onChange={handleChange}>
              {TODOIST_PRIORITY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? <p className="task-editor__error">{error}</p> : null}

        <footer className="task-editor__footer">
          <button type="button" className="task-editor__secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="task-editor__primary" disabled={!isValid || isSubmitting}>
            {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create chore'}
          </button>
        </footer>
      </form>
    </Modal>
  );
};

export default TaskEditorModal;
