import * as React from "react";
import WebApiClient from "xrm-webapi-client";
import { Well, ButtonToolbar, ButtonGroup, Button, DropdownButton, MenuItem, Modal, FormGroup, ControlLabel, FormControl } from "react-bootstrap";
import { EmailTemplate } from "../domain/EmailTemplate";

export interface TemplateManagerProps {
    templateCallBack: (template: EmailTemplate) => void;
    errorCallBack: (e: any) => void;
    isVisible: boolean;
}

interface TemplateManagerState {
    selectedTemplate?: EmailTemplate;
    templates?: Array<EmailTemplate>;
}

export class TemplateManager extends React.PureComponent<TemplateManagerProps, TemplateManagerState> {
    private WebApiClient: typeof WebApiClient;

    constructor(props: TemplateManagerProps) {
        super(props);

        this.state = {
        };

        // Webpack should import WebApiClient from global itself, but somehow it doesn't
        this.WebApiClient = (window as any).WebApiClient;
    }

    componentDidMount() {
        this.retrieveTemplates()
        .then((result: any) => {
            this.setState({ templates: result.value });
        });
    }

    retrieveTemplates = () => {
        return this.WebApiClient.Retrieve({entityName: "oss_emailtemplate", queryParams: "?$select=oss_json,oss_html,oss_name"});
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

        const template = this.state.templates.find((template: any) => template.oss_emailtemplateid === eventKey);

        this.setState({
            selectedTemplate: template
        });
    }

    fireCallBack = () => {
        this.props.templateCallBack(this.state.selectedTemplate);
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
                              { [{oss_emailtemplateid: undefined, oss_name: "Create New"} as EmailTemplate].concat(this.state.templates || []).map( (value) => <MenuItem onSelect={this.setSelectedTemplate} eventKey={value.oss_emailtemplateid}>{value.oss_name}</MenuItem> ) }
                        </DropdownButton>
                    </ButtonGroup>
                </ButtonToolbar>
              </Modal.Body>
              <Modal.Footer>
                  <Button bsStyle="default" disabled={!this.state.selectedTemplate} onClick={this.fireCallBack}>Ok</Button>
                  <Button bsStyle="default" onClick={ this.cancel }>Cancel</Button>
              </Modal.Footer>
            </Modal.Dialog>}
        </div>;
    }
}