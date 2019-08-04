import React from "react";
import * as Flex from "@twilio/flex-ui";

import { withStyles, MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';

import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";

import TextField from "@material-ui/core/TextField";

class SendSmsModal extends React.Component {
  state = {
    open: false,
    To: "",
    From: "",
    Body: ""
  };

  componentDidMount() {
    window.addEventListener(
      "sendSmsModalOpen",
      e => {
        this.handleClickOpen(e.detail);
      },
      false
    );
  }

  handleChange = name => event => {
    this.setState({
      [name]: event.target.value
    });
  };

  handleClickOpen = fields => {
    this.setState({ open: true, ...fields });
  };

  handleClose = () => {
    this.setState({ open: false });
  };

  sendSms = () => {
    const to = encodeURIComponent(this.state.To);
    const from = encodeURIComponent(this.state.From);
    const message = encodeURIComponent(this.state.Body);
    const url = this.props.url;

    if (to.length > 0 && from.length > 0) {
      fetch(`https://${url}/create-new-sms`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        method: 'POST',
        body: `From=${from}&To=${to}&Message=${message}&Token=${this.props.jweToken}`
      })
      .then(()=>this.handleClose());
    } else {
      console.log('Invalid number entered');
    }
  };

  render() {
    const isDisabled = this.state.Body.trim().length === 0;
    const theme = this.props.theme;
    const muiTheme = createMuiTheme({
      palette: { type: theme.calculated.lightTheme ? "light" : "dark"}
    })
    return (
      <div>
        <MuiThemeProvider theme={muiTheme}>
        <Dialog
          open={this.state.open}
          onClose={this.handleClose}
          aria-labelledby="form-dialog-title"
          fullWidth
        >
          <DialogTitle id="form-dialog-title">Send SMS</DialogTitle>
          <DialogContent>
            <DialogContentText>To: {this.state.To}</DialogContentText>
            <TextField
              value={this.state.Body}
              onChange={this.handleChange("Body")}
              multiline
              autoFocus
              id="Body"
              label="Message"
              fullWidth
            />
          </DialogContent>
          <DialogActions>
            <Flex.Button onClick={this.sendSms} disabled={isDisabled}>
              Submit
            </Flex.Button>
            <Flex.Button onClick={this.handleClose}>Cancel</Flex.Button>
          </DialogActions>
        </Dialog>
      </MuiThemeProvider>
      </div>
    );
  }
}

export default Flex.withTheme(SendSmsModal);