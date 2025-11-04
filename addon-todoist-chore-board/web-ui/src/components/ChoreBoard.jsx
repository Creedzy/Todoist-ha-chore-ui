// addon-todoist-chore-board/web-ui/src/components/ChoreBoard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import ProfileColumn from './ProfileColumn';
import { getStates, subscribeToEntities } from '../hass';

const ChoreBoard = () => {
  const [sensors, setSensors] = useState([]);
  const configuredSensors = useMemo(() => window.ADDON_CONFIG?.sensors || [], []);

  useEffect(() => {
    async function fetchInitialState() {
      try {
        const allStates = await getStates();
        const relevantSensors = configuredSensors.map(sensorId => {
          const state = allStates[sensorId];
          const todoEntityId = sensorId.replace('sensor.', 'todo.');
          return {
            id: sensorId,
            name: state?.attributes?.friendly_name || sensorId,
            tasks: state?.attributes?.tasks || [],
            stars: state?.attributes?.stars || 0,
            todoEntityId: todoEntityId
          };
        });
        setSensors(relevantSensors);
      } catch (error) {
        console.error("Failed to fetch initial states:", error);
      }
    }

    fetchInitialState();

    let unsubscribe = null;
    let cancelled = false;

    async function startSubscription() {
      try {
        const stop = await subscribeToEntities(entities => {
          setSensors(prevSensors =>
            prevSensors.map(sensor => {
              const newState = entities[sensor.id];
              if (newState) {
                return {
                  ...sensor,
                  tasks: newState.attributes.tasks || [],
                  stars: newState.attributes.stars || 0,
                };
              }
              return sensor;
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
  }, [configuredSensors]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-100 min-h-screen">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {sensors.map(sensor => (
          <ProfileColumn
            key={sensor.id}
            name={sensor.name}
            tasks={sensor.tasks}
            entityId={sensor.todoEntityId}
            stars={sensor.stars}
          />
        ))}
      </div>
    </div>
  );
};

export default ChoreBoard;
