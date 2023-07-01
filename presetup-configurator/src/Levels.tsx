import React from "react";

const LEVEL_ADMIN = 100;
const LEVEL_MODERATOR = 50;

export type LevelEntry = [string, number]; // id, level

export function Levels({ levels, setLevels }) {
  function addLevel() {
    setLevels((arr) => [...arr, ["", LEVEL_MODERATOR]]);
  }

  function removeLevel(index) {
    setLevels((arr) => [...arr].splice(index, 1));
  }

  function updateLevelId(index, id) {
    const validId = id.replace(/[^0-9]/g, "");
    setLevels((arr) => {
      arr[index][0] = validId;
      return [...arr];
    });
  }

  function updateLevelLevel(index, level) {
    setLevels((arr) => {
      arr[index][1] = parseInt(level, 10);
      return [...arr];
    });
  }

  return (
    <div>
      {levels.map(([id, level], index) => (
        <div key={index}>
          <input value={id} onChange={(e) => updateLevelId(index, e.target.value)} />
          <select value={level} onChange={(e) => updateLevelLevel(index, e.target.value)}>
            <option value={LEVEL_ADMIN}>Admin</option>
            <option value={LEVEL_MODERATOR}>Moderator</option>
          </select>
        </div>
      ))}
      <button onClick={addLevel}>Add</button>
    </div>
  );
}
