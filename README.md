# Xrm Html Templating
Welcome, this is a project for allowing to create and edit HTML templates in Dynamics 365 CE / CRM in a user friendly manner.

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

# Impressions
![image](https://user-images.githubusercontent.com/4287938/47609785-d969fa80-da45-11e8-8ad5-50f99440c069.png)

## License
Licensed using the MIT license, enjoy!
