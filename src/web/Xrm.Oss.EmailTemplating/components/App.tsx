import * as React from "react";
import WebApiClient from "xrm-webapi-client";
import { Well, ButtonToolbar, ButtonGroup, Button, DropdownButton, MenuItem, Panel, InputGroup, Modal, FormGroup, ControlLabel, FormControl, ListGroup, ListGroupItem, Checkbox } from "react-bootstrap";
import EmailEditor from "react-email-editor";
import { TemplateManager } from "./TemplateManager";
import { EmailTemplate } from "../domain/EmailTemplate";

interface State {
    requestPending?: boolean;
    loadingTemplate?: boolean;
    template?: EmailTemplate;
}

export default class EmailTemplating extends React.PureComponent<any, State> {
    private WebApiClient: typeof WebApiClient;
    private Editor: EmailEditor;

    constructor(props: any) {
        super(props);

        this.state = {
        };

        // Webpack should import WebApiClient from global itself, but somehow it doesn't
        this.WebApiClient = (window as any).WebApiClient;
    }

    templateCallBack = (template: EmailTemplate) => {
      this.setState({
        template: template,
        loadingTemplate: false
      });

      if (!template || !template.oss_json) {
       return;
      }

      this.Editor.loadDesign(JSON.parse(template.oss_json));
    }

    delete = () => {
      (this.WebApiClient.Delete({ entityName: "oss_emailtemplate", entityId: this.state.template.oss_emailtemplateid}) as Promise<string>)
      .then((response: any) => {
        console.dir(response);
      });
    }

    save = () => {
        this.Editor.exportHtml(data => {
            this.WebApiClient.Update({entityName: "oss_emailtemplate", entityId: this.state.template.oss_emailtemplateid, entity: {
              oss_json: JSON.stringify(data.design),
              oss_html: data.html
            }})
            .then((response: any) => {
              console.dir(response);
            });
        });
    }

    loadTemplate = () => {
      this.setState({
        loadingTemplate: true
      });
    }

    render() {
        return (
        <div>
          <TemplateManager errorCallBack={undefined} templateCallBack={this.templateCallBack} isVisible={this.state.loadingTemplate} />
          {this.state.requestPending &&
            <Modal.Dialog>
            <Modal.Header>
              <Modal.Title>Processing Request</Modal.Title>
            </Modal.Header>

            <Modal.Body>Please Wait...</Modal.Body>
          </Modal.Dialog>}
          <ButtonToolbar style={{"padding-bottom": "10px"}}>
              <ButtonGroup>
                <Button bsStyle="default" onClick={this.loadTemplate}>Load Template</Button>
                <Button bsStyle="default" onClick={this.save}>Save Template</Button>
                <Button bsStyle="error" onClick={this.delete}>Delete Template</Button>
              </ButtonGroup>
            </ButtonToolbar>
          <EmailEditor
            ref={(editor: EmailEditor) => this.Editor = editor}
          />
        </div>
        );
    }
}
