import { DefaultButton, Dialog, DialogFooter, DialogType, PrimaryButton } from "@fluentui/react";
import * as React from "react";

interface UserInputModalProps {
  title: string;
  text: string;
  yesCallBack?: (value?: string) => void;
  noCallBack?: () => void;
  finally?: () => void;
}

export interface UserInputState {
  value: string;
}

export default class UserInputModal extends React.PureComponent<UserInputModalProps, UserInputState> {
  constructor(props: UserInputModalProps) {
    super(props);

    this.state = {
      value: ""
    };

    this.triggerCallback = this.triggerCallback.bind(this);
    this.callIfDefined = this.callIfDefined.bind(this);
    this.setValue = this.setValue.bind(this);
  }

  callIfDefined(callBack?: (value?: string) => void, value?: string) {
    if (callBack) {
      callBack(value);
    }
  }

  setValue(e: any) {
    const text = e.target.value;

    this.setState({
      value: text
    });
  }

  triggerCallback(choice: boolean) {
    if (choice) {
      this.callIfDefined(this.props.yesCallBack, this.state.value);
    }
    else {
      this.callIfDefined(this.props.noCallBack);
    }

    this.callIfDefined(this.props.finally);
  }

  render() {
    return (
      <Dialog
        hidden={false}
        onDismiss={() => this.triggerCallback(false)}
        dialogContentProps={{
          type: DialogType.largeHeader,
          title: this.props.title,
          subText: this.props.text
        }}
        modalProps={{
          isBlocking: false,
          styles: { main: { maxWidth: 450 } },
        }}
      >
        <DialogFooter>
          <input type="text" value={this.state.value} onChange={this.setValue} />
          <PrimaryButton onClick={() => this.triggerCallback(true)} text="Ok" />
          <DefaultButton onClick={() => this.triggerCallback(false)} text="Cancel" />
        </DialogFooter>
      </Dialog>);
  }
}