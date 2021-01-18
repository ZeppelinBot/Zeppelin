import React, { SetStateAction, useState } from "react";
import "./LogChannels.css";

const LOG_TYPES = {
  "MEMBER_WARN": "Warned",
  "MEMBER_MUTE": "Muted",
  "MEMBER_UNMUTE": "Unmuted",
  "MEMBER_MUTE_EXPIRED": "Mute expired",
  "MEMBER_KICK": "Kicked",
  "MEMBER_BAN": "Banned",
  "MEMBER_UNBAN": "Unbanned",
  "MEMBER_FORCEBAN": "Forcebanned",
  "MEMBER_SOFTBAN": "Softbanned",
  "MEMBER_JOIN": "Member joined",
  "MEMBER_LEAVE": "Member left",
  "MEMBER_ROLE_ADD": "Role added to member",
  "MEMBER_ROLE_REMOVE": "Role removed from member",
  "MEMBER_NICK_CHANGE": "Nickname changed",
  "MEMBER_USERNAME_CHANGE": "Username changed",
  "MEMBER_RESTORE": "Member roles restored",
  "CHANNEL_CREATE": "Channel created",
  "CHANNEL_DELETE": "Channel deleted",
  "ROLE_CREATE": "Role created",
  "ROLE_DELETE": "Role deleted",
  "MESSAGE_EDIT": "Message edited",
  "MESSAGE_DELETE": "Message deleted",
  "MESSAGE_DELETE_BULK": "Messages deleted in bulk",
  "MESSAGE_DELETE_BARE": "Message deleted (bare)",
  "VOICE_CHANNEL_JOIN": "Voice channel join",
  "VOICE_CHANNEL_LEAVE": "Voice channel leave",
  "VOICE_CHANNEL_MOVE": "Voice channel move",
  "COMMAND": "Command used",
  "MESSAGE_SPAM_DETECTED": "Message spam detected",
  "CENSOR": "Message censored",
  "CLEAN": "Messages cleaned",
  "CASE_CREATE": "Case created",
  "MASSBAN": "Massbanned",
  "MASSMUTE": "Massmuted",
  "MEMBER_TIMED_MUTE": "Temporarily muted",
  "MEMBER_TIMED_UNMUTE": "Scheduled unmute",
  "MEMBER_JOIN_WITH_PRIOR_RECORDS": "Member joined with prior records",
  "OTHER_SPAM_DETECTED": "Non-message spam detected",
  "MEMBER_ROLE_CHANGES": "Member roles changed",
  "VOICE_CHANNEL_FORCE_MOVE": "Force-moved to a voice channel",
  "CASE_UPDATE": "Case updated",
  "MEMBER_MUTE_REJOIN": "Muted member rejoined",
  "SCHEDULED_MESSAGE": "Scheduled message to be posted",
  "POSTED_SCHEDULED_MESSAGE": "Posted scheduled message",
  "BOT_ALERT": "Bot alert",
  "AUTOMOD_ACTION": "Automod action",
  "SCHEDULED_REPEATED_MESSAGE": "Scheduled message to be posted repeatedly",
  "REPEATED_MESSAGE": "Set a message to be posted repeatedly",
  "MESSAGE_DELETE_AUTO": "Message deleted (auto)",
  "SET_ANTIRAID_USER": "Set antiraid (user)",
  "SET_ANTIRAID_AUTO": "Set antiraid (auto)",
  "MASS_ASSIGN_ROLES": "Mass-assigned roles",
  "MASS_UNASSIGN_ROLES": "Mass-unassigned roles",
  "MEMBER_NOTE": "Added note on member",
  "CASE_DELETE": "Case deleted",
  "DM_FAILED": "Failed to DM member",
};

type LOG_TYPE = keyof typeof LOG_TYPES;

export interface LogChannel {
  id: string;
  includeExclude: "include" | "exclude";
  logTypes: Set<LOG_TYPE>;
}

interface Props {
  logChannels: LogChannel[];
  setLogChannels: React.Dispatch<SetStateAction<LogChannel[]>>;
}

export function LogChannels({ logChannels, setLogChannels }: Props) {
  function addLogChannel() {
    setLogChannels(_logChannels => {
      return [..._logChannels, {
        id: "",
        includeExclude: "include",
        logTypes: new Set(),
      }];
    });
  }

  function deleteLogChannel(index) {
    setLogChannels(_logChannels => {
      const newArr = [..._logChannels];
      newArr.splice(index, 1);
      return newArr;
    });
  }

  function setId(index: number, id: string) {
    setLogChannels(_logChannels => {
      _logChannels[index].id = id;
      return [..._logChannels];
    });
  }

  function setIncludeExclude(index: number, includeExclude: LogChannel["includeExclude"]) {
    setLogChannels(_logChannels => {
      _logChannels[index].includeExclude = includeExclude;
      return [..._logChannels];
    });
  }

  function toggleLogType(index: number, logType: LOG_TYPE, enabled: boolean) {
    setLogChannels(_logChannels => {
      if (enabled) {
        _logChannels[index].logTypes.add(logType);
      } else {
        _logChannels[index].logTypes.delete(logType);
      }

      return [..._logChannels];
    });
  }

  return (
    <div className="LogChannels">
      {logChannels.map((logChannel, index) => (
        <div className="log-channel">
          <label>
            ID: <input value={logChannel.id} onChange={e => setId(index, e.target.value)} />
          </label>
          <label>
            Mode:
            <select value={logChannel.includeExclude}>
              <option value={"include"}>Include</option>
              <option value={"exclude"}>Exclude</option>
            </select>
          </label>
          <div className="log-types">
            {Object.entries(LOG_TYPES).map(([logType, description]) => (
              <label>
                <input
                  type="checkbox"
                  checked={logChannel.logTypes.has(logType as LOG_TYPE)}
                  onChange={e => toggleLogType(index, logType as LOG_TYPE, e.target.checked)}
                />
                {description}
              </label>
            ))}
          </div>
        </div>
      ))}
      <button onClick={addLogChannel}>Add</button>
    </div>
  );
}
