exports.handler = function(context, event, callback) {
  let twiml = new Twilio.twiml.VoiceResponse();

  const client = context.getTwilioClient();
  const taskrouterService = client.taskrouter.v1.workspaces(context.TWILIO_WORKSPACE_SID);

  let wfSID = context.CB_WORKFLOW_SID;

  const queuePosition = event.QueuePosition;
  const queueSid = event.QueueSid;

  const callSid = event.CallSid;
  const waitTime = event.AvgQueueTime;
  const from = event.From;
  const baseUrl = "https://" + context.DOMAIN_NAME + "/api";

  const params = "&AvgQueueTime=" + waitTime;
  const state = event.state;

  const holdMusicUrl = context.CB_HOLD_MUSIC_URL;
  const autoDial = context.CB_DIALPAD_AUTODIAL;
  const outboundNumber = context.CB_PHONE_NUMBER;
  const callbackName = context.CB_TASK_NAME;

  // stage 0: initial announcement, pause to check for immediate reservation
  if (!state) {
    twiml.say({}, "Please wait while we connect you to an agent");
    twiml.redirect({}, "/ivr_callback?state=offer");
    callback(null, twiml);
  }

  // stage 1: play inqueue announcement requesting callback
  // stage 2: customer enters digit to activate callback routine
  //   <?xml version="1.0" encoding="UTF-8"?>
  // <Response>
  //   <Gather timeout="5" numDigits="1" action="https://your-runtime-domain.twil.io/ivr_callback?state=redirect&amp;QueueSid={{QueueSid}}&amp;AvgQueueTime={{AvgQueueTime}}">
  //     {{#QueuePosition}}
  //     <Say>You are currently number {{QueuePosition}} in the queue</Say>
  //     {{/QueuePosition}}
  //     {{#AvgQueueTime}}
  //     <Say>The current wait time is {{AvgQueueTime}} seconds</Say>
  //     {{/AvgQueueTime}}
  //     <Say>Please press any key now if you would like us to call you back</Say>
  //   </Gather>
  //   <Play>http://com.twilio.music.classical.s3.amazonaws.com/ith_chopin-15-2.mp3</Play>
  // </Response>
  else if (state === "offer") {
    let offer_callback = false;
    taskrouterService.tasks.each({
      evaluateTaskAttributes: `call_sid == '${callSid}'`,
      callback: task => {
        if (task.assignmentStatus !== "reserved" && task.assignmentStatus !== "pending") {
          offer_callback = true;
        }
        console.log("task is currently: ", task.assignmentStatus);
      },
      done: error => {
        if (offer_callback) {
          const initial_gather = twiml.gather({
            timeout: 5,
            action:
              baseUrl +
              "/ivr_callback?state=redirect" +
              params +
              "&QueueSid=" +
              encodeURIComponent(queueSid),
            numDigits: 1
          });
          if (queuePosition) {
            initial_gather.say("You are currently number " + queuePosition + " in the queue");
          }
          if (waitTime) {
            initial_gather.say("The current wait time is " + waitTime + " seconds");
          }
          initial_gather.say("Please press any key now if you would like us to call you back");
        }
        twiml.play(holdMusicUrl);
        callback(null, twiml);
      }
    });
  }

  // stage 3: gather action => (here) /ivr_callback?QueueSid=&CallSid=
  // 	client.queues(queueSid)
  //       .members(callSid)
  //       .update({url: '/ivr_callback?state=confirm', method: 'GET'})
  //       .then(member => console.log(member.callSid))
  //       .done();
  else if (state === "redirect") {
    // TODO should this be task redirect API instead ?
    console.log(callSid);
    client
      .queues(queueSid)
      .members(callSid)
      .update({ url: baseUrl + "/ivr_callback?state=confirm" + params, method: "GET" })
      .then(member => {
        console.log(member.callSid);
        twiml.leave();
        callback(null, twiml);
      })
      .done();
  }

  // stage 4: /ivr_callback?state=confirm
  //   gather action="/ivr_callback?state=create"
  //     say (we have your phone number as 'XXXXXX', if this is correct press 1 )
  //   gather action="/ivr_callback?state=confirm?Digits=XXXXXX"
  //     say please enter the number you would like to be callback back on, including the area code then press hash
  else if (state === "confirm") {
    let identity = event.Digits || from;
    client.lookups
      .phoneNumbers(identity)
      .fetch({ countryCode: event.CallerCountry })
      .then(resp => {
        console.log(resp.phoneNumber);
        const readout_number = resp.phoneNumber.split("").join(" ");
        const create_gather = twiml.gather({
          action:
            baseUrl +
            "/ivr_callback?state=create" +
            params +
            "&callback=" +
            encodeURIComponent(identity),
          numDigits: 1
        });
        create_gather.say(
          "we have your phone number as " + readout_number + ". If this is correct, please press 1"
        );
        const change_gather = twiml.gather({
          action: baseUrl + "/ivr_callback?state=confirm" + params,
          finishOnKey: "#"
        });
        change_gather.say(
          "Please enter the phone number you would like us to call you back on. Including the area code and then press hash"
        );
        callback(null, twiml);
      })
      .catch(err => {
        console.log(err);
        const change_gather = twiml.gather({
          action: baseUrl + "/ivr_callback?state=confirm" + params,
          finishOnKey: "#"
        });
        change_gather.say(
          "We were not able to validate that phone number. Please enter the phone number you would like us to call you back on. Including the area code and then press hash"
        );
        callback(null, twiml);
      })
      .done();
  }

  // stage 5: /ivr_callback?state=create
  //   data.attributes.disposition = "callback_requested"
  //   taskrouterService.tasks.create(data)
  //    .then =>
  //   say "thanks, we'll call you back in X minutes"
  //   hangup
  //
  else if (state === "create") {
    let identity = event.callback || from;
    const readout_number = identity.split("").join(" ");
    taskrouterService.tasks.each({
      evaluateTaskAttributes: `call_sid == '${callSid}'`,
      callback: tasks => {
        console.log(tasks);
        console.log(tasks.workflowSid);
        wfSID = tasks.workflowSid;
        taskrouterService.tasks(tasks.sid).update({
          assignmentStatus: "canceled",
          reason: "callback"
        });
      },
      done: error => {
        console.log(error);
        let attrs = {
          name: `${callbackName}: ${identity}`,
          identity: outboundNumber,
          from: outboundNumber,
          to: identity,
          direction: "outbound",
          title: `${callbackName}: ${identity}`,
          callbackTime: waitTime,
          callbackTask: callSid,
          endpoint: "callback"
        };

        // Dialpad plugin integration
        if (autoDial) {
          attrs = {
            ...attrs,
            autoAnswer: "true"
          };
        }

        console.log(attrs);
        const data = {
          workflowSid: wfSID,
          taskChannel: "custom1",
          timeout: 3600,
          attributes: JSON.stringify(attrs)
        };

        taskrouterService.tasks
          .create(data)
          .then(task => {
            console.log(`${task.sid} created: ${JSON.stringify(data.attributes)}`);
            twiml.say(
              "Thanks we will call you back in " + waitTime + " seconds on " + readout_number
            );
            twiml.pause();
            callback(null, twiml);
          })
          .catch(err => {
            console.error(`Task creation failed ${err}`);
            callback(err);
          });
      }
    });
  }
};
