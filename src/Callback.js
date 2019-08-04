import React from "react";

import { TaskChannelHelper, TaskHelper } from "@twilio/flex-ui";
import CallbackIcon from "@material-ui/icons/PhoneCallbackOutlined";
import CallbackBoldIcon from "@material-ui/icons/PhoneCallback";

import {
  CallCanvas,
  IncomingTaskCanvas,
  TaskCard,
  TaskOverviewCanvas,
  TaskListBaseItem
} from "@twilio/flex-ui";

const callbackColor = "#F22F46";

const CallIconByState = new Set([
  CallCanvas,
  IncomingTaskCanvas,
  TaskCard,
  TaskOverviewCanvas,
  TaskListBaseItem
]);

function getMainIcon() {
  return <CallbackIcon />;
}

function getIcon(task, componentType, isBold = false) {
  let icon = "Call";

  const byState = CallIconByState.has(componentType);
  if (byState) {
    icon = "IncomingCall";
    if (!!task.incomingTransferObject && task.status === "pending") {
      icon = "IncomingTransfer";
    } else if (
      TaskHelper.isRegularConferenceCall(task) &&
      TaskHelper.isGroupCall(task) &&
      !(TaskHelper.isInWrapupMode(task) || TaskHelper.isCompleted(task))
    ) {
      icon = "GroupCall";
    } else if (TaskHelper.isCallOnHold(task)) {
      icon = "Hold";
    } else if (TaskHelper.isLiveCall(task)) {
      icon = "Call";
    } else if (TaskHelper.isInWrapupMode(task) || TaskHelper.isCompleted(task)) {
      icon = "Hangup";
    }
  }

  if (isBold) {
    icon += "Bold";
  }

  if (icon === "IncomingCall") {
    icon = <CallbackIcon />;
  } else if (icon === "IncomingCallBold") {
    icon = <CallbackBoldIcon />;
  }
  return icon;
}

function getActiveIcon(task, componentType, byState) {
  return getIcon(task, componentType, true);
}

function getColor(task, componentType) {
  if (TaskHelper.isCallOnHold(task) && !TaskHelper.isGroupCall(task)) {
    return "#ea6c00";
  }

  if (TaskHelper.isLiveCall(task) || TaskHelper.isIncomingCall(task)) {
    return callbackColor;
  }
  
  return "#a0a8bd";
}

export { getColor, getActiveIcon, getIcon, getMainIcon };
