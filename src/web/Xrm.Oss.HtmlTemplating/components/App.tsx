import * as React from "react";
import * as WebApiClient from "xrm-webapi-client";
import EmailEditor, { EmailEditorProps, MergeTag } from "react-email-editor";
import { TemplateManager } from "./TemplateManager";
import { HtmlTemplate } from "../domain/HtmlTemplate";
import UserInputModal from "./UserInputModal";
import { XtlSnippet } from "../domain/XtlSnippet";
import { IInputs } from "../HTMLWYSIWYGEDITOR/generated/ManifestTypes";
import { CommandBar, DefaultButton, FontWeights, getTheme, ICommandBarItemProps, mergeStyleSets, Modal, PrimaryButton, Dialog, DialogFooter, DialogType } from "@fluentui/react";
import { loadWebResource } from "../domain/WebResourceLoader";
import { getExternalScript } from "../domain/ScriptCaller";

export interface AppProps {
  pcfContext: ComponentFramework.Context<IInputs>;
  updateOutputs: (jsonInput: string, htmlOutput: string) => void;
}

interface AppState {
  requestPending?: boolean;
  loadingTemplate: boolean;
  template?: HtmlTemplate;
  templates?: Array<HtmlTemplate>;
  confirmDeletion?: boolean;
  allowSave?: boolean;
  askForSaveAsName?: boolean;
  editorProps?: EmailEditorProps;
}

const asciiArmorRegex = /xtl_ascii_armor__(.*)?(?=__xtl_ascii_armor)__xtl_ascii_armor/gm;
const defaultDesign: any = { "counters": { "u_column": 1, "u_row": 1 }, "body": { "rows": [{ "cells": [1], "columns": [{ "contents": [], "values": { "_meta": { "htmlID": "u_column_1", "htmlClassNames": "u_column" } } }], "values": { "backgroundColor": "", "backgroundImage": { "url": "", "fullWidth": true, "repeat": false, "center": true, "cover": false }, "padding": "10px", "columnsBackgroundColor": "", "_meta": { "htmlID": "u_row_1", "htmlClassNames": "u_row" }, "selectable": true, "draggable": true, "deletable": true } }], "values": { "backgroundColor": "#e7e7e7", "backgroundImage": { "url": "", "fullWidth": true, "repeat": false, "center": true, "cover": false }, "contentWidth": "800px", "fontFamily": { "label": "Arial", "value": "arial,helvetica,sans-serif" }, "_meta": { "htmlID": "u_body", "htmlClassNames": "u_body" } } } };

export class App extends React.PureComponent<AppProps, AppState> {
  private Editor: typeof EmailEditor;

  constructor(props: any) {
    super(props);

    this.state = {
      loadingTemplate: false
    };
  }

  retrieveMergeTags = (): Promise<Array<MergeTag>> => {
    return WebApiClient.Retrieve({ entityName: "oss_xtlsnippet", queryParams: "?$select=oss_name,oss_uniquename,oss_xtlsnippetid,oss_xtlexpression,_oss_parentsnippet_value&$orderby=oss_name", returnAllPages: true })
      .then(({ value: snippets }: { value: Array<XtlSnippet> }) => {
        const resolveTags = (children?: Array<XtlSnippet>): MergeTag[] => {
          return (children ?? []).reduce((all, cur) => {
            const currentChildren: Array<XtlSnippet> = snippets.filter(s => s._oss_parentsnippet_value === cur.oss_xtlsnippetid);
            const snippetValue: string = cur.oss_uniquename ? `\${{Snippet("${cur.oss_uniquename}")}}` : `\${{${cur.oss_xtlexpression}}}`;
            const asciiArmor = `xtl_ascii_armor__${btoa(snippetValue)}__xtl_ascii_armor`;

            return [
              ...all,
              {
                name: cur.oss_name,
                mergeTags: currentChildren.length ? resolveTags(currentChildren) : undefined,
                value: currentChildren.length ? undefined : asciiArmor,
                sample: cur.oss_name
              } as MergeTag
            ];
          }, [] as MergeTag[]);
        };

        const rootElements = snippets.filter(s => !s._oss_parentsnippet_value);
        const tags = resolveTags(rootElements);

        return tags;
      })
      .catch((e: any) => {
        alert("Seems your user is missing read privileges to the oss_xtlsnippet entity. Please ask your system administrator for security permissions");
        return [];
      });
  }

  init = async () => {
    const customScriptPath = this.props.pcfContext.parameters.customScriptPath.raw;

    if (customScriptPath) {
      try {
        await loadWebResource(customScriptPath);
      }
      catch (e: any) {
        this.props.pcfContext.navigation.openErrorDialog({ message: `An error occured: ${e?.message ?? e}`});
      }
    }

    const tags = await this.retrieveMergeTags();
    const properties = {
      projectId: this.props.pcfContext.parameters.projectId.raw ?? undefined,
      displayMode: this.props.pcfContext.parameters.displayMode.raw ?? undefined,
      options: {
        mergeTags: tags
      }
    } as EmailEditorProps;

    let propertiesToSet = properties;

    if (this.props.pcfContext.parameters.customScriptPath.raw && this.props.pcfContext.parameters.customScriptInitFunc.raw) {
      const funcRef = getExternalScript(this.props.pcfContext.parameters.customScriptInitFunc.raw);
      const funcResult = await funcRef({ editorProps: properties, webApiClient: WebApiClient });

      if (funcResult && funcResult.editorProps) {
        propertiesToSet = funcResult.editorProps;
      }
    }

    propertiesToSet.onReady = this.initEditor;

    this.setState({ editorProps: propertiesToSet });
  }

  componentDidMount() {
    this.init();
  }

  reviveXtlExpressions = (expression: any) => {
    if (!expression || typeof (expression) !== "string") {
      return expression;
    }

    return expression.replace(asciiArmorRegex, (m, g) => {
      return atob(g);
    });
  };

  reviveXtlExpressionJson = (object: { [key: string]: any }) => {
    if (!object) {
      return object;
    }

    const keys = Object.keys(object);

    return keys.reduce((all, cur) => {
      if (Array.isArray(object[cur])) {
        all[cur] = (object[cur] as Array<any>).map(e => this.reviveXtlExpressionJson(e));
      }
      else if (typeof (object[cur]) === "object") {
        all[cur] = this.reviveXtlExpressionJson(object[cur]);
      }
      else {
        all[cur] = this.reviveXtlExpressions(object[cur]);
      }

      return all;
    }, {} as { [key: string]: any });
  };

  registerForm = () => {
    debugger;
    if (this.isEntityForm()) {
      const design = this.props.pcfContext.parameters.jsonInputField.raw;

      this.Editor.loadDesign((design && JSON.parse(design)) || defaultDesign);
    }
  }

  onUpdate = () => {
    debugger;
    if (this.isEntityForm()) {
      this.Editor.exportHtml(({ design, html }: { design: { [key: string]: any }, html: string }) => {
        this.props.updateOutputs(JSON.stringify(this.reviveXtlExpressionJson(design)), this.reviveXtlExpressions(html));
      });
    }
  }

  initEditor = () => {
    this.registerForm();
    this.Editor.addEventListener("design:updated", this.onUpdate);
  }

  templateCallBack = (template?: HtmlTemplate) => {
    if (!template) {
      return this.setState({ loadingTemplate: false });
    }

    this.setState({
      template: template,
      loadingTemplate: false
    });

    this.Editor.loadDesign((template && template.oss_json && JSON.parse(template.oss_json)) || defaultDesign);
  }

  delete = () => {
    this.setState({ requestPending: true, confirmDeletion: false });

    (WebApiClient.Delete({ entityName: "oss_htmltemplate", entityId: this.state.template?.oss_htmltemplateid }) as Promise<string>)
      .then(_ => {
        this.setState({ requestPending: false, template: undefined });
        this.Editor.loadDesign(defaultDesign);
      });
  }

  showDeletionConfirmation = () => {
    this.setState({ confirmDeletion: true });
  }

  hideDeletionConfirmation = () => {
    this.setState({ confirmDeletion: false });
  }

  saveSolution = () => {
    this.setState({ requestPending: true });

    this.Editor.exportHtml(({ design, html }: { design: { [key: string]: any }, html: string }) => {
      const jsonData = JSON.stringify(this.reviveXtlExpressionJson(design));
      const htmlData = this.reviveXtlExpressions(html);

      if (this.state.template?.oss_htmltemplateid) {
        WebApiClient.Update({
          entityName: "oss_htmltemplate", entityId: this.state.template.oss_htmltemplateid, entity: {
            oss_json: jsonData,
            oss_html: htmlData,
            oss_name: this.state.template.oss_name
          }
        })
          .then(() => {
            this.setState({ requestPending: false });
          });
      }
      else {
        WebApiClient.Create({
          entityName: "oss_htmltemplate", entity: {
            oss_json: jsonData,
            oss_html: htmlData,
            oss_name: this.state.template?.oss_name
          }
        })
          .then((response: string) => {
            const id = response.substr(response.indexOf("(") + 1, 36);

            this.setState({ template: { ...this.state.template, oss_htmltemplateid: id }, requestPending: false });
          });
      }
    });
  }

  saveAs = (name?: string) => {
    this.setState({ requestPending: true });

    this.Editor.exportHtml(({ design, html }: { design: { [key: string]: any }, html: string }) => {
      const jsonData = JSON.stringify(this.reviveXtlExpressionJson(design));
      const htmlData = this.reviveXtlExpressions(html);

      WebApiClient.Create({
        entityName: "oss_htmltemplate", entity: {
          oss_json: jsonData,
          oss_html: htmlData,
          oss_name: name
        }
      })
        .then((response: string) => {
          const id = response.substr(response.indexOf("(") + 1, 36);

          this.setState({
            template: { ...this.state.template, oss_htmltemplateid: id, oss_name: name },
            requestPending: false,
            askForSaveAsName: false
          });
        });
    });
  }

  retrieveTemplates = () => {
    return WebApiClient.Retrieve({ entityName: "oss_htmltemplate", queryParams: "?$select=oss_json,oss_html,oss_name" });
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
    return true;
  }

  askForSaveAsName = () => {
    this.setState({ askForSaveAsName: true });
  }

  closeAskForSaveAsName = () => {
    this.setState({ askForSaveAsName: false });
  }

  setName = (e: any) => {
    const name = e.target.value;

    this.setState((state) => ({
      template: { ...state.template, oss_name: name }
    }));
  }

  contentStyles = mergeStyleSets({
    container: {
      display: 'flex',
      flexFlow: 'column nowrap',
      alignItems: 'stretch',
    },
    header: [
      // eslint-disable-next-line deprecation/deprecation
      getTheme().fonts.xLargePlus,
      {
        flex: '1 1 auto',
        borderTop: `4px solid ${getTheme().palette.themePrimary}`,
        color: getTheme().palette.neutralPrimary,
        display: 'flex',
        alignItems: 'center',
        fontWeight: FontWeights.semibold,
        padding: '12px 12px 14px 24px',
      },
    ],
    heading: {
      color: getTheme().palette.neutralPrimary,
      fontWeight: FontWeights.semibold,
      fontSize: 'inherit',
      margin: '0',
    },
    body: {
      flex: '4 4 auto',
      padding: '0 24px 24px 24px',
      overflowY: 'hidden',
      selectors: {
        p: { margin: '14px 0' },
        'p:first-child': { marginTop: 0 },
        'p:last-child': { marginBottom: 0 },
      },
    },
  });

  render() {
    const items: ICommandBarItemProps[] = [
      {
        key: 'loadTemplate',
        text: 'Load',
        iconProps: { iconName: 'Add' },
        onClick: this.loadTemplate
      },
      {
        key: 'save',
        text: 'Save',
        iconProps: { iconName: 'Add' },
        onClick: this.saveSolution
      },
      {
        key: 'saveAs',
        text: 'Save As',
        iconProps: { iconName: 'Add' },
        onClick: this.askForSaveAsName
      },
      {
        key: 'delete',
        text: 'Delete',
        iconProps: { iconName: 'Add' },
        onClick: this.showDeletionConfirmation
      }
    ];

    return (
      <div style={{ display: "flex", flexDirection: "column", position: "relative", height: "100%", width: "100%" }}>
        { this.state.askForSaveAsName &&
          <UserInputModal title="Save As" text="Enter the name of the copied template" yesCallBack={this.saveAs} noCallBack={this.closeAskForSaveAsName} />
        }
        { this.state.requestPending &&
          <Modal
            titleAriaId='oss_HTML_Editor_RequestPending'
            isOpen={true}
            isBlocking={true}
            containerClassName={this.contentStyles.container}
          >
            <div className={this.contentStyles.header}>
              <h2 className={this.contentStyles.heading}>
                Processing Request
              </h2>
            </div>
            <div className={this.contentStyles.body}>
              <p>Please Wait...</p>
            </div>
          </Modal>
        }
        { this.state.confirmDeletion &&
          <Dialog
            hidden={false}
            onDismiss={this.hideDeletionConfirmation}
            dialogContentProps={{
              type: DialogType.largeHeader,
              title: "Delete this record?",
              subText: "Are you sure you want to delete this template?"
            }}
            modalProps={{
              isBlocking: false,
              styles: { main: { maxWidth: 450 } },
            }}
          >
            <DialogFooter>
              <PrimaryButton onClick={this.delete} text="Delete" />
              <DefaultButton onClick={this.hideDeletionConfirmation} text="Cancel" />
            </DialogFooter>
          </Dialog>}
        <TemplateManager errorCallBack={undefined} templates={this.state.templates} templateCallBack={this.templateCallBack} isVisible={this.state.loadingTemplate} />
        { !this.isEntityForm() &&
          <CommandBar
            items={items}
            ariaLabel="HTML Template Actions"
            primaryGroupAriaLabel="Primary HTML Template actions"
            farItemsGroupAriaLabel="More actions"
          />
        }
        { this.state.editorProps &&
          <EmailEditor
            {... this.state.editorProps}
            ref={(editor: (typeof EmailEditor)) => {this.Editor = editor; }}
          />
        }
      </div>
    );
  }
}
