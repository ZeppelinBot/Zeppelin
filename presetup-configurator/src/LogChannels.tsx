import React, { SetStateAction, useState } from "react";
import "./LogChannels.css";

const LOG_TYPES = {
  "MEMBER_WARN": "Member warned",
  "MEMBER_MUTE": "Member muted",
  "MEMBER_UNMUTE": "Member unmuted",
  "MEMBER_MUTE_EXPIRED": "Mute expired",
  "MEMBER_KICK": "Member kicked",
  "MEMBER_BAN": "Member banned",
  "MEMBER_UNBAN": "Member unbanned",
  "MEMBER_FORCEBAN": "Member forcebanned",
  "MEMBER_SOFTBAN": "Member softbanned",
  "MEMBER_JOIN": "Member joined",
  "MEMBER_LEAVE": "Member left",
  "MEMBER_ROLE_ADD": "Member, role added",
  "MEMBER_ROLE_REMOVE": "Member, role removed",
  "MEMBER_NICK_CHANGE": "Member nickname changed",
  "MEMBER_USERNAME_CHANGE": "Member username changed",
  "MEMBER_RESTORE": "Member roles restored",
  "CHANNEL_CREATE": "Channel created",
  "CHANNEL_DELETE": "Channel deleted",
  "CHANNEL_UPDATE": "Channel updated",
  "THREAD_CREATE": "Thread created",
  "THREAD_DELETE": "Thread deleted",
  "THREAD_UPDATE": "Thread updated",
  "ROLE_CREATE": "Role created",
  "ROLE_DELETE": "Role deleted",
  "ROLE_UPDATE": "Role updated",
  "MESSAGE_EDIT": "Message edited",
  "MESSAGE_DELETE": "Message deleted",
  "MESSAGE_DELETE_BULK": "Messages deleted in bulk",
  "MESSAGE_DELETE_BARE": "Message deleted (bare)",
  "VOICE_CHANNEL_JOIN": "Voice channel join",
  "VOICE_CHANNEL_LEAVE": "Voice channel leave",
  "VOICE_CHANNEL_MOVE": "Voice channel move",
  "STAGE_INSTANCE_CREATE": "Stage created",
  "STAGE_INSTANCE_DELETE": "Stage deleted",
  "STAGE_INSTANCE_UPDATE": "Stage updated",
  "COMMAND": "Command used",
  "MESSAGE_SPAM_DETECTED": "Message spam detected",
  "CENSOR": "Message censored",
  "CLEAN": "Messages cleaned",
  "CASE_CREATE": "Case created",
  "MASSBAN": "Massbanned",
  "MASSMUTE": "Massmuted",
  "MEMBER_TIMED_MUTE": "Member temporarily muted",
  "MEMBER_TIMED_UNMUTE": "Member, scheduled unmute",
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
  "MEMBER_NOTE": "Member noted",
  "CASE_DELETE": "Case deleted",
  "DM_FAILED": "Failed to DM member",
};

const sortedLogTypes = Object.fromEntries(
  Object.entries(LOG_TYPES)
    .sort((a, b) => {
      if (a[1].toLowerCase() > b[1].toLowerCase()) return 1;
      if (a[1].toLowerCase() < b[1].toLowerCase()) return -1;
      if (a[0].toLowerCase() > b[0].toLowerCase()) return 1;
      if (a[0].toLowerCase() < b[0].toLowerCase()) return -1;
      return 0;
    })
) as typeof LOG_TYPES;

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
  function addLogChannel(props: Partial<LogChannel> = {}) {
    setLogChannels(_logChannels => {
      return [..._logChannels, {
        id: "",
        includeExclude: "include",
        logTypes: new Set(),
        ...props,
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

  function addReverseLogChannel() {
    const includedLogTypesInOtherLogChannels = new Set(logChannels.map(l => Array.from(l.logTypes)).flat());
    addLogChannel({
      includeExclude: "exclude",
      logTypes: includedLogTypesInOtherLogChannels,
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
            <select value={logChannel.includeExclude} onChange={e => setIncludeExclude(index, e.target.value as LogChannel["includeExclude"])}>
              <option value={"include"}>Include</option>
              <option value={"exclude"}>Exclude</option>
            </select>
          </label>
          <div className="log-types">
            {Object.entries(sortedLogTypes).map(([logType, description]) => (
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
          <button onClick={() => deleteLogChannel(index)}>Delete</button>
        </div>
      ))}
      <button onClick={() => addLogChannel()}>Add</button>
      <button onClick={() => addReverseLogChannel()}>Add "everything else"</button>
    </div>
  );
}
