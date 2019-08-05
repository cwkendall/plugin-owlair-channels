
import React from 'react';
import { IconButton } from "@twilio/flex-ui";

export const SendSmsButton = props => {
  let attrs = { To: props.task.attributes.from, From: props.task.attributes.to };
  if(props.task.attributes.endpoint === "callback"){
    attrs = { To: props.task.attributes.to, From: props.task.attributes.from }
  }
  return (
    <IconButton
      style={{display: "flex", flexDirection: "row", border: "1px white solid", borderRadius: "50%", marginRight: "6px", marginLeft: "6px"}}
      icon="Message"
      title="Send SMS"
      onClick={() => {
        var event = new CustomEvent("sendSmsModalOpen", {
          detail: attrs
        });
        window.dispatchEvent(event);
      }}
    />
  );
};