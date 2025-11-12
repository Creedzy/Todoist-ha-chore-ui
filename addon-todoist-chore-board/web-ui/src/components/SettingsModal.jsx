// addon-todoist-chore-board/web-ui/src/components/SettingsModal.jsx
import React, { useMemo } from 'react';
import Modal from './Modal';

const EMOJI_LIBRARY_SUGGESTIONS = [
  {
    id: 'emoji-picker-react',
    label: 'emoji-picker-react',
    url: 'https://github.com/ealush/emoji-picker-react',
    description:
      'MIT-licensed React component with lazy-loading support and accessible keyboard navigation. Widely adopted in the React ecosystem.',
  },
  {
    id: 'emoji-mart',
    label: 'emoji-mart',
    url: 'https://github.com/missive/emoji-mart',
    description:
      'Battle-tested picker originally built by the Missive team. Ships with shortcodes, recent emoji memory, and compact bundles.',
  },
];

const DEFAULT_SETTINGS = {
  showStars: true,
  confettiEnabled: true,
  emojiEnabled: true,
  emojiLibrary: 'emoji-picker-react',
};

const SettingsModal = ({ isOpen, onClose, settings = null, onSettingsChange }) => {
  const mergedSettings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...(settings || {}) }), [settings]);
  const { showStars, confettiEnabled, emojiEnabled, emojiLibrary } = mergedSettings;

  const emitChange = partial => {
    onSettingsChange?.({ ...mergedSettings, ...partial });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="board-settings-title">
      <div className="settings-modal">
        <header className="settings-modal__header">
          <h2 id="board-settings-title" className="settings-modal__title">
            Board Settings
          </h2>
          <p className="settings-modal__subtitle">
            Tune how the chore board behaves for everyone using this display.
          </p>
        </header>

        <div className="settings-modal__body">
          <section className="settings-modal__section">
            <h3 className="settings-modal__section-title">Visual Tweaks</h3>
            <label className="settings-modal__toggle">
              <input
                type="checkbox"
                checked={showStars}
                onChange={event => emitChange({ showStars: event.target.checked })}
              />
              <div>
                <span className="settings-modal__toggle-label">Show stars</span>
                <p className="settings-modal__toggle-description">
                  Include the ⭐ chip on each profile column so everyone can see the current star balance.
                </p>
              </div>
            </label>

            <label className="settings-modal__toggle">
              <input
                type="checkbox"
                checked={confettiEnabled}
                onChange={event => emitChange({ confettiEnabled: event.target.checked })}
              />
              <div>
                <span className="settings-modal__toggle-label">Confetti when completing a task</span>
                <p className="settings-modal__toggle-description">
                  Celebrate completed chores with a quick confetti burst. Disable if you prefer a calmer board.
                </p>
              </div>
            </label>
          </section>

          <section className="settings-modal__section">
            <h3 className="settings-modal__section-title">Emoji Workflow</h3>
            <label className="settings-modal__toggle">
              <input
                type="checkbox"
                checked={emojiEnabled}
                onChange={event => emitChange({ emojiEnabled: event.target.checked })}
              />
              <div>
                <span className="settings-modal__toggle-label">Enable emojis</span>
                <p className="settings-modal__toggle-description">
                  When enabled, chore cards show leading emojis and the add/edit modal includes the quick emoji picker. Disable to keep cards text-only.
                </p>
              </div>
            </label>

            <div className="settings-modal__card">
              <p className="settings-modal__card-title">Current picker</p>
              <p className="settings-modal__card-body">
                Using <strong>{emojiLibrary}</strong> for emoji selection. Looking for alternatives? These well-known, MIT-licensed libraries work great too:
              </p>
              <ul className="settings-modal__list">
                {EMOJI_LIBRARY_SUGGESTIONS.map(option => (
                  <li key={option.id} className="settings-modal__list-item">
                    <span className="settings-modal__list-name">{option.label}</span>
                    <span className="settings-modal__list-description">{option.description}</span>
                  </li>
                ))}
              </ul>
              <p className="settings-modal__card-footer">
                Let me know if you prefer switching libraries—we can swap in another picker without touching your existing chores.
              </p>
            </div>
          </section>
        </div>

        <footer className="settings-modal__footer">
          <button type="button" className="settings-modal__close" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </Modal>
  );
};

export default SettingsModal;
