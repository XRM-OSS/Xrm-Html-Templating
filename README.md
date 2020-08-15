# Xrm Html Templating
Welcome, this is a project for allowing to create and edit HTML templates in Dynamics 365 CE / CRM in a user friendly manner.
These templates can be used for creating emails, creating knowledgearticles, or any other entity that has HTML based content.

# Supported Versions
All CRM versions >= 8.0 (2016)

# Requirements
You need to have XTL installed before installing this solution, as it is used for providing placeholders inside your emails and for copying the template HTML to your emails on creation.
You can get XTL for free [here](https://github.com/DigitalFlow/Xrm-Templating-Language).

# Installation
Install the managed solution from the [releases page](https://github.com/DigitalFlow/Xrm-Html-Templating/releases) of this repository and open it for creating and edition your templates.

# Embedding
Per default you can use the editor in the solution configuration page and on the form of the HTML Template entity.
For adding it to other forms, configure the data parameter for the webresource to pass a json which states the name of the html field and of the json field of your entity (both required) as follows:
`{ "jsonField": "Enter_FieldName", "htmlField": "Enter_FieldName" }`

# Usage
The solution contains two default fields on the email entity, which allow to define a HTML Template that should be applied to your email.
You can either select the template that you want to apply by using the oss_htmltemplate lookup, or you can enter the unique name of the template which you want to use inside the oss_htmltemplateuniquename field.

On creation of your mail, or on update of any of those two fields, the selected template will be applied and the placeholders will be processed.
You can use any XTL expression inside the templates using the usual ${{...}} syntax.
More details on this can be found in the [XTL ReadMe](https://github.com/DigitalFlow/Xrm-Templating-Language/blob/master/README.md)

A good advice is to build snippets using the MergeTag feature. You can create hierarchical predefined expressions using the XTL Snippet entity.
Inside the HTML editor, all XTL Snippets that you defined are shown and can be inserted in your template.
That way you can write XTL expressions just once and use them everywhere. A nice bonus is that you can update these XTL snippets and all templates will just use the new values on the next execution.

# Impressions
![image](https://user-images.githubusercontent.com/4287938/47609785-d969fa80-da45-11e8-8ad5-50f99440c069.png)

## License
Licensed using the MIT license, enjoy!
