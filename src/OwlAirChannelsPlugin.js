import { getRuntimeUrl, FlexPlugin } from "flex-plugin";
import React from "react";

import CallButton from "./Dialpad/CallButton";
import Conference from "./Dialpad/Conference";
import DialerButton from "./Dialpad/DialerButton";
import Dialpad from "./Dialpad/Dialpad";

import dialpadReducer from "./Dialpad/reducers/DialpadReducer.js";
import registerCustomActions from "./Dialpad/CustomActions";

import * as callback from "./Callback";

import OutboundSmsButton from "./Sms/OutboundSmsButton";
import OutboundSmsView from "./Sms/OutboundSmsView";

import SendSmsModal from "./Sms/SendSmsModal";
import { SendSmsButton } from "./Sms/SendSmsButton";
import { TaskHelper } from "@twilio/flex-ui";

const PLUGIN_NAME = "OwlAirChannelsPlugin";

export default class OwlAirChannelsPlugin extends FlexPlugin {
  constructor() {
    super(PLUGIN_NAME);
  }

  init(flex, manager) {
    ////// COMMON //////
    // NOTE: change the below to the location where functions are hosted e.g.
    //   getRuntimeUrl().replace(/^https?:\/\//, "") + "/api";
    //   manager.serviceConfiguration.runtime_domain;
    const runtime_domain = "plugin-owlair-channels.twlo-se-au.now.sh";

    // get the JWE for authenticating the worker in our Function
    const jweToken = manager.store.getState().flex.session.ssoTokenPayload.token;

    ////// SMS //////
    // adds the sms view
    flex.ViewCollection.Content.add(
      <flex.View name="sms" key="outbound-sms-view-parent">
        <OutboundSmsView key="outbound-sms-view" jweToken={jweToken} />
      </flex.View>
    );

    flex.RootContainer.Content.add(
      <SendSmsModal key="SendSmsModal" url={runtime_domain} jweToken={jweToken} />,
      {
        sortOrder: 1
      }
    );

    flex.TaskCanvasHeader.Content.add(<SendSmsButton key="send-sms" />, {
      sortOrder: 1,
      if: props => !flex.TaskHelper.isChatBasedTask(props.task)
    });

    // flex.TaskListButtons.Content.add(<SendSmsButton key="send-sms" />, {
    //   if: props => !flex.TaskHelper.isChatBasedTask(props.task)
    // });

    ////////////

    ////// DIALPAD //////
    //adds the dial button to the navbar
    flex.SideNav.Content.add(<DialerButton key="sidebardialerbutton" />);

    //auto-accepts tasks
    manager.workerClient.on("reservationCreated", reservation => {
      if (reservation.task.attributes.autoAnswer === "true") {
        flex.Actions.invokeAction("AcceptTask", { sid: reservation.sid });
        //select the task
        flex.Actions.invokeAction("SelectTask", { sid: reservation.sid });
      }
    });

    //Place Task into wrapUp on remote party disconnect
    manager.voiceClient.on("disconnect", function(connection) {
      manager.workerClient.reservations.forEach(reservation => {
        if (
          reservation.task.attributes.worker_call_sid === connection.parameters.CallSid &&
          reservation.task.taskChannelUniqueName === "custom1" &&
          reservation.task.attributes.direction === "outbound"
        ) {
          reservation.task.wrapUp();
        }
      });
    });

    //adds the dialer view
    flex.ViewCollection.Content.add(
      <flex.View name="dialer" key="dialpad1">
        <Dialpad
          key="dialpad2"
          insightsClient={manager.insightsClient}
          runtimeDomain={runtime_domain}
          jweToken={jweToken}
          mode="dialPad"
        />
      </flex.View>
    );
    flex.CallCanvas.Content.add(
      <Conference
        key="conference"
        insightsClient={manager.insightsClient}
        runtimeDomain={runtime_domain}
        jweToken={jweToken}
      />,
      { sortOrder: 0, if: props => TaskHelper.isCallTask(props.task) }
    );

    //adds the dial button to SMS
    flex.TaskCanvasHeader.Content.add(
      <CallButton key="callbutton" runtimeDomain={runtime_domain} jweToken={jweToken} />,
      { sortOrder: 1 }
    );

    //create custom task TaskChannel
    const outboundVoiceChannel = flex.DefaultTaskChannels.createCallTaskChannel(
      "custom1",
      task => task.taskChannelUniqueName === "custom1"
    );
    flex.TaskChannels.register(outboundVoiceChannel);

    registerCustomActions(runtime_domain, jweToken);

    //Add custom redux store
    manager.store.addReducer("dialpad", dialpadReducer);

    ////// CALLBACK //////
    //create custom task TaskChannel

    const callbackChannel = flex.DefaultTaskChannels.createCallTaskChannel(
      "Callback",
      task => task.attributes.endpoint === "callback" || task.attributes.callbackTask !== undefined
    );

    callbackChannel.colors = {
      main: callback.getColor
    };

    callbackChannel.icons = {
      list: callback.getIcon,
      active: callback.getActiveIcon,
      main: callback.getMainIcon
    };

    flex.TaskChannels.register(callbackChannel);
  }
}
