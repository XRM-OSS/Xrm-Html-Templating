import * as React from "react";
import WebApiClient from "xrm-webapi-client";
import { Well, ButtonToolbar, ButtonGroup, Button, DropdownButton, MenuItem, Modal, FormGroup, ControlLabel, FormControl } from "react-bootstrap";
import { HtmlTemplate } from "../domain/HtmlTemplate";

export interface TemplateManagerProps {
    templateCallBack: (template: HtmlTemplate) => void;
    errorCallBack: (e: any) => void;
    isVisible: boolean;
    templates: Array<HtmlTemplate>;
}

interface TemplateManagerState {
    selectedTemplate?: HtmlTemplate;
}

export class TemplateManager extends React.PureComponent<TemplateManagerProps, TemplateManagerState> {
    constructor(props: TemplateManagerProps) {
        super(props);

        this.state = {
        };
    }

    cancel = () => {
        this.props.templateCallBack(undefined);
    }

    setSelectedTemplate = (eventKey: any) => {
        if (!eventKey) {
            return this.setState({
                selectedTemplate: {
                    oss_name: "Create New"
                }
            });
        }

        const template = this.props.templates.find((template) => template.oss_htmltemplateid === eventKey);

        this.setState({
            selectedTemplate: template
        });
    }

    fireCallBack = () => {
        this.props.templateCallBack(this.state.selectedTemplate);
    }

    onNameChange = (e: any) => {
        this.setState({ selectedTemplate: {...this.state.selectedTemplate, oss_name: e.target.value} });
    }

    render() {
        return <div>
            {this.props.isVisible &&
              <Modal.Dialog>
              <Modal.Header>
                <Modal.Title>Manage SDK Steps</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                  <ButtonToolbar style={{"padding-bottom": "10px"}}>
                    <ButtonGroup>
                        <DropdownButton
                            bsStyle="default"
                            title={this.state.selectedTemplate ? this.state.selectedTemplate.oss_name : "Select SDK Step" }
                            id="templateSelect"
                        >
                              { [{oss_emailtemplateid: undefined, oss_name: "Create New"} as HtmlTemplate].concat(this.props.templates || []).map( (value) => <MenuItem onSelect={this.setSelectedTemplate} eventKey={value.oss_htmltemplateid}>{value.oss_name}</MenuItem> ) }
                        </DropdownButton>
                    </ButtonGroup>
                </ButtonToolbar>
                {this.state.selectedTemplate && !this.state.selectedTemplate.oss_htmltemplateid &&
                    <FormControl
                    type="text"
                    value={this.state.selectedTemplate && this.state.selectedTemplate.oss_name}
                    placeholder="Enter text"
                    onChange={this.onNameChange}
                  />
                }
              </Modal.Body>
              <Modal.Footer>
                  <Button bsStyle="default" disabled={!this.state.selectedTemplate} onClick={this.fireCallBack}>Ok</Button>
                  <Button bsStyle="default" onClick={ this.cancel }>Cancel</Button>
              </Modal.Footer>
            </Modal.Dialog>}
        </div>;
    }
}