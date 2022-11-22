import * as React from "react";
import * as WebApiClient from "xrm-webapi-client";
import { ButtonToolbar, ButtonGroup, Button, InputGroup, Modal, FormControl, Navbar } from "react-bootstrap";
import EmailEditor, { MergeTag } from "react-email-editor";
import { TemplateManager } from "./TemplateManager";
import { HtmlTemplate } from "../domain/HtmlTemplate";
import UserInputModal from "./UserInputModal";
import { XtlSnippet } from "../domain/XtlSnippet";

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
    mergeTags?: MergeTag[];
}

const asciiArmorRegex = /xtl_ascii_armor__(.*)?(?=__xtl_ascii_armor)__xtl_ascii_armor/gm;
const defaultDesign: any = {"counters": {"u_column": 1, "u_row": 1}, "body": {"rows": [{"cells": [1], "columns": [{"contents": [], "values": {"_meta": {"htmlID": "u_column_1", "htmlClassNames": "u_column"}}}], "values": {"backgroundColor": "", "backgroundImage": {"url": "", "fullWidth": true, "repeat": false, "center": true, "cover": false}, "padding": "10px", "columnsBackgroundColor": "", "_meta": {"htmlID": "u_row_1", "htmlClassNames": "u_row"}, "selectable": true, "draggable": true, "deletable": true}}], "values": {"backgroundColor": "#e7e7e7", "backgroundImage": {"url": "", "fullWidth": true, "repeat": false, "center": true, "cover": false}, "contentWidth": "800px", "fontFamily": {"label": "Arial", "value": "arial,helvetica,sans-serif"}, "_meta": {"htmlID": "u_body", "htmlClassNames": "u_body"}}}};

export default class EmailTemplating extends React.PureComponent<EditorProps, EditorState> {
    private Editor: EmailEditor;

    constructor(props: any) {
        super(props);

        this.state = {
        };
    }

    retrieveMergeTags = () => {
      WebApiClient.Retrieve({ entityName: "oss_xtlsnippet", queryParams: "?$select=oss_name,oss_uniquename,oss_xtlsnippetid,oss_xtlexpression,_oss_parentsnippet_value&$orderby=oss_name", returnAllPages: true})
      .then(({ value: snippets}: {value: Array<XtlSnippet>}) => {
          const resolveTags = (children?: Array<XtlSnippet>): MergeTag[] => {
            return (children).reduce((all, cur) => {
                const currentChildren = snippets.filter(s => s._oss_parentsnippet_value === cur.oss_xtlsnippetid);
                const snippetValue: string = cur.oss_uniquename ? `\${{Snippet("${cur.oss_uniquename}")}}` : `\${{${cur.oss_xtlexpression}}}`;
                const asciiArmor = `xtl_ascii_armor__${btoa(snippetValue)}__xtl_ascii_armor`;

                return [
                  ...all,
                  {
                    name: cur.oss_name,
                    mergeTags: currentChildren.length ? resolveTags(currentChildren) : undefined,
                    value: currentChildren.length ? undefined : asciiArmor,
                    sample: cur.oss_name
                  }
                ];
            }, [] as MergeTag[]);
        };

        const rootElements = snippets.filter(s => !s._oss_parentsnippet_value);
        const tags = resolveTags(rootElements);

        this.setState({ mergeTags: tags });
      })
      .catch((e: any) => {
        alert("Seems your user is missing read privileges to the oss_xtlsnippet entity. Please ask your system administrator for security permissions");
      });
    }

    componentDidMount() {
      this.retrieveMergeTags();
    }

    reviveXtlExpressions = (expression: any) => {
      if (!expression || typeof(expression) !== "string") {
        return expression;
      }

      return expression.replace(asciiArmorRegex, (m, g) => {
        return atob(g);
      });
    };

    reviveXtlExpressionJson = (object: {[key: string]: any}) => {
      if (!object) {
        return object;
      }

      const keys = Object.keys(object);

      return keys.reduce((all, cur) => {
        if (Array.isArray(object[cur])) {
          all[cur] = (object[cur] as Array<any>).map(e => this.reviveXtlExpressionJson(e));
        }
        else if (typeof(object[cur]) === "object") {
          all[cur] = this.reviveXtlExpressionJson(object[cur]);
        }
        else {
          all[cur] = this.reviveXtlExpressions(object[cur]);
        }

        return all;
      }, {} as {[key: string]: any});
    };

    registerForm = () => {
      if (this.isEntityForm()) {
        const design = window.parent.Xrm.Page.getAttribute(this.props.jsonField).getValue();

        this.Editor.loadDesign((design && JSON.parse(design)) || defaultDesign);
      }
    }

    onUpdate = () => {
      if (this.isEntityForm()) {
        this.Editor.exportHtml(data => {
            window.parent.Xrm.Page.getAttribute(this.props.htmlField).setValue(this.reviveXtlExpressions(data.html));
            window.parent.Xrm.Page.getAttribute(this.props.jsonField).setValue(JSON.stringify(this.reviveXtlExpressionJson(data.design)));
        });
      }
    }

    initEditor = () => {
      this.registerForm();
      this.Editor.addEventListener("design:updated", this.onUpdate);
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

      (WebApiClient.Delete({ entityName: "oss_htmltemplate", entityId: this.state.template.oss_htmltemplateid}) as Promise<string>)
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

    saveSolution = () => {
      this.setState({requestPending: true});

      this.Editor.exportHtml(data => {
        const jsonData = JSON.stringify(this.reviveXtlExpressionJson(data.design));
        const htmlData = this.reviveXtlExpressions(data.html);

        if (this.state.template.oss_htmltemplateid) {
          WebApiClient.Update({entityName: "oss_htmltemplate", entityId: this.state.template.oss_htmltemplateid, entity: {
            oss_json: jsonData,
            oss_html: htmlData,
            oss_name: this.state.template.oss_name
          }})
          .then(() => {
            this.setState({requestPending: false});
          });
        }
        else {
          WebApiClient.Create({entityName: "oss_htmltemplate", entity: {
            oss_json: jsonData,
            oss_html: htmlData,
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
          const jsonData = JSON.stringify(this.reviveXtlExpressionJson(data.design));
          const htmlData = this.reviveXtlExpressions(data.html);

          WebApiClient.Create({entityName: "oss_htmltemplate", entity: {
            oss_json: jsonData,
            oss_html: htmlData,
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
      return WebApiClient.Retrieve({entityName: "oss_htmltemplate", queryParams: "?$select=oss_json,oss_html,oss_name"});
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
              <ButtonToolbar style={{"paddingBottom": "10px"}}>
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
          { this.state.mergeTags &&
            <EmailEditor
              projectId={1071}
              options={{
                mergeTags: this.state.mergeTags
              }}
              ref={(editor: EmailEditor) => this.Editor = editor}
              onReady={this.initEditor}
            />
            }
        </div>
        );
    }
}
