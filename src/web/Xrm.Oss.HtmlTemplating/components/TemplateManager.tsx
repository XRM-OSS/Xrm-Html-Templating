import * as React from "react";
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
    templateName?: string;
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
        const template = !this.state.selectedTemplate.oss_htmltemplateid ? {...this.state.selectedTemplate, oss_name: this.state.templateName } : this.state.selectedTemplate;

        this.props.templateCallBack(template);
    }

    onNameChange = (e: any) => {
        this.setState({ templateName: e.target.value });
    }

    render() {
        return <div>
            {this.props.isVisible &&
              <Modal.Dialog>
              <Modal.Header>
                <Modal.Title>Manage Templates</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                  <ButtonToolbar style={{"paddingBottom": "10px"}}>
                    <ButtonGroup>
                        <DropdownButton
                            bsStyle="default"
                            title={this.state.selectedTemplate ? this.state.selectedTemplate.oss_name : "Select Template" }
                            id="templateSelect"
                        >
                              { [{oss_emailtemplateid: undefined, oss_name: "Create New"} as HtmlTemplate].concat(this.props.templates || []).map( (value) => <MenuItem onSelect={this.setSelectedTemplate} eventKey={value.oss_htmltemplateid}>{value.oss_name}</MenuItem> ) }
                        </DropdownButton>
                    </ButtonGroup>
                </ButtonToolbar>
                {this.state.selectedTemplate && !this.state.selectedTemplate.oss_htmltemplateid &&
                    <FormControl
                    type="text"
                    value={this.state.templateName}
                    placeholder="Enter text"
                    onChange={this.onNameChange}
                  />
                }
              </Modal.Body>
              <Modal.Footer>
                  <Button bsStyle="default" disabled={!this.state.selectedTemplate || (!this.state.selectedTemplate.oss_htmltemplateid && !this.state.templateName )} onClick={this.fireCallBack}>Ok</Button>
                  <Button bsStyle="default" onClick={ this.cancel }>Cancel</Button>
              </Modal.Footer>
            </Modal.Dialog>}
        </div>;
    }
}