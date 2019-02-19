import * as React from "react";
import WebApiClient from "xrm-webapi-client";
import { ButtonToolbar, ButtonGroup, Button, InputGroup, Modal, FormControl, Navbar } from "react-bootstrap";
import EmailEditor from "react-email-editor";
import { TemplateManager } from "./TemplateManager";
import { HtmlTemplate } from "../domain/HtmlTemplate";
import UserInputModal from "./UserInputModal";

interface EditorProps {
  htmlField: string;
  jsonField: string;
}

interface EditorState {
    requestPending?: boolean;
    loadingTemplate?: boolean;
    template?: HtmlTemplate;
    templates?: Array<HtmlTemplate>;
    confirmDeletion?: boolean;
    allowSave?: boolean;
    askForSaveAsName?: boolean;
}

const defaultDesign: any = {"counters": {"u_column": 1, "u_row": 1}, "body": {"rows": [{"cells": [1], "columns": [{"contents": [], "values": {"_meta": {"htmlID": "u_column_1", "htmlClassNames": "u_column"}}}], "values": {"backgroundColor": "", "backgroundImage": {"url": "", "fullWidth": true, "repeat": false, "center": true, "cover": false}, "padding": "10px", "columnsBackgroundColor": "", "_meta": {"htmlID": "u_row_1", "htmlClassNames": "u_row"}, "selectable": true, "draggable": true, "deletable": true}}], "values": {"backgroundColor": "#e7e7e7", "backgroundImage": {"url": "", "fullWidth": true, "repeat": false, "center": true, "cover": false}, "contentWidth": "500px", "fontFamily": {"label": "Arial", "value": "arial,helvetica,sans-serif"}, "_meta": {"htmlID": "u_body", "htmlClassNames": "u_body"}}}};

export default class EmailTemplating extends React.PureComponent<EditorProps, EditorState> {
    private WebApiClient: typeof WebApiClient;
    private Editor: EmailEditor;

    constructor(props: any) {
        super(props);

        this.state = {
        };

        // Webpack should import WebApiClient from global itself, but somehow it doesn't
        this.WebApiClient = (window as any).WebApiClient;
    }

    registerForm = () => {
      if (this.isEntityForm()) {
        window.parent.Xrm.Page.data.entity.addOnSave(this.saveForm);
        const design = window.parent.Xrm.Page.getAttribute(this.props.jsonField).getValue();

        this.Editor.loadDesign((design && JSON.parse(design)) || defaultDesign);
      }
    }

    templateCallBack = (template: HtmlTemplate) => {
      if (!template) {
        return this.setState({loadingTemplate: false});
      }

      this.setState({
        template: template,
        loadingTemplate: false
      });

      this.Editor.loadDesign((template && template.oss_json && JSON.parse(template.oss_json)) || defaultDesign);
    }

    delete = () => {
      this.setState({requestPending: true, confirmDeletion: false});

      (this.WebApiClient.Delete({ entityName: "oss_htmltemplate", entityId: this.state.template.oss_htmltemplateid}) as Promise<string>)
      .then(_ => {
        this.setState({requestPending: false, template: undefined});
        this.Editor.loadDesign(defaultDesign);
      });
    }

    showDeletionConfirmation = () => {
      this.setState({confirmDeletion: true});
    }

    hideDeletionConfirmation = () => {
      this.setState({ confirmDeletion: false });
    }

    triggerSave = () => {
      window.parent.Xrm.Page.data.entity.save();
    }

    saveForm = (saveEvent?: Xrm.Events.SaveEventContext) => {
      if (this.state.allowSave) {
        this.setState({ allowSave: false });
        return;
      }

      saveEvent.getEventArgs().preventDefault();

      this.Editor.exportHtml(data => {
        window.parent.Xrm.Page.getAttribute(this.props.htmlField).setValue(data.html);
        window.parent.Xrm.Page.getAttribute(this.props.jsonField).setValue(JSON.stringify(data.design));

        this.setState({ allowSave: true }, this.triggerSave);
      });
    }

    saveSolution = () => {
      this.setState({requestPending: true});

      this.Editor.exportHtml(data => {
        if (this.state.template.oss_htmltemplateid) {
          this.WebApiClient.Update({entityName: "oss_htmltemplate", entityId: this.state.template.oss_htmltemplateid, entity: {
            oss_json: JSON.stringify(data.design),
            oss_html: data.html,
            oss_name: this.state.template.oss_name
          }})
          .then(() => {
            this.setState({requestPending: false});
          });
        }
        else {
          this.WebApiClient.Create({entityName: "oss_htmltemplate", entity: {
            oss_json: JSON.stringify(data.design),
            oss_html: data.html,
            oss_name: this.state.template.oss_name
          }})
          .then((response: string) => {
            const id = response.substr(response.indexOf("(") + 1, 36);

            this.setState({template: {...this.state.template, oss_htmltemplateid: id}, requestPending: false});
          });
        }
      });
    }

    saveAs = (name: string) => {
      this.setState({requestPending: true});

      this.Editor.exportHtml(data => {
          this.WebApiClient.Create({entityName: "oss_htmltemplate", entity: {
            oss_json: JSON.stringify(data.design),
            oss_html: data.html,
            oss_name: name
          }})
          .then((response: string) => {
            const id = response.substr(response.indexOf("(") + 1, 36);

            this.setState({
              template: {...this.state.template, oss_htmltemplateid: id, oss_name: name},
              requestPending: false,
              askForSaveAsName: false
            });
          });
      });
    }

    retrieveTemplates = () => {
      return this.WebApiClient.Retrieve({entityName: "oss_htmltemplate", queryParams: "?$select=oss_json,oss_html,oss_name"});
    }

    loadTemplate = () => {
      this.retrieveTemplates()
        .then((result: any) => {
            this.setState({
              templates: result.value,
              loadingTemplate: true
            });
        });
    }

    isEntityForm = () => {
      return window.parent && window.parent.Xrm && window.parent.Xrm.Page.data.entity.getEntityName() !== "solution";
    }

    askForSaveAsName = () => {
      this.setState({askForSaveAsName: true});
    }

    closeAskForSaveAsName = () => {
      this.setState({askForSaveAsName: false});
    }

    setName = (e: any) => {
      const name = e.target.value;

      this.setState((state) => ({
        template: {...state.template, oss_name: name}
      }));
    }

    render() {
        return (
        <div style={{display: "flex", flexDirection: "column", position: "relative", height: "100%"}}>
          {this.state.askForSaveAsName && <UserInputModal title="Save As" text="Enter the name of the copied template" yesCallBack={this.saveAs} noCallBack={this.closeAskForSaveAsName} />}
          {this.state.requestPending &&
              <Modal.Dialog>
              <Modal.Header>
                <Modal.Title>Processing Request</Modal.Title>
              </Modal.Header>

              <Modal.Body>Please Wait...</Modal.Body>
            </Modal.Dialog>}
          {this.state.confirmDeletion &&
          <Modal.Dialog>
          <Modal.Header>
            <Modal.Title>Confirm</Modal.Title>
          </Modal.Header>

          <Modal.Body>Are you sure you want to delete this template?</Modal.Body>
          <Modal.Footer>
              <Button bsStyle="default" onClick={ this.delete }>Yes</Button>
              <Button bsStyle="default" onClick={ this.hideDeletionConfirmation }>No</Button>
          </Modal.Footer>
        </Modal.Dialog>}
          <TemplateManager errorCallBack={undefined} templates={this.state.templates} templateCallBack={this.templateCallBack} isVisible={this.state.loadingTemplate} />
          {this.state.requestPending &&
            <Modal.Dialog>
            <Modal.Header>
              <Modal.Title>Processing Request</Modal.Title>
            </Modal.Header>

            <Modal.Body>Please Wait...</Modal.Body>
          </Modal.Dialog>}
          { !this.isEntityForm() &&
              <ButtonToolbar style={{"padding-bottom": "10px"}}>
                  <ButtonGroup>
                    <Button bsStyle="default" onClick={this.loadTemplate}>Load</Button>
                    <Button bsStyle="default" disabled={!this.state.template} onClick={this.saveSolution}>Save</Button>
                    <Button bsStyle="default" disabled={!this.state.template} onClick={this.askForSaveAsName}>Save As</Button>
                    <Button bsStyle="error" disabled={!this.state.template || !this.state.template.oss_htmltemplateid} onClick={this.showDeletionConfirmation}>Delete</Button>
                  </ButtonGroup>
                  <InputGroup>
                    <FormControl
                      type="text"
                      disabled={!this.state.template}
                      value={ this.state.template ? this.state.template.oss_name : "" }
                      onChange={ this.setName }
                    />
                  </InputGroup>
              </ButtonToolbar>
          }
          <EmailEditor
            onLoad={this.registerForm}
            ref={(editor: EmailEditor) => this.Editor = editor}
          />
        </div>
        );
    }
}
