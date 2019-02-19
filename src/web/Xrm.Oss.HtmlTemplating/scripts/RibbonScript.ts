(function(OSS?: any) {
    OSS.HtmlTemplateRibbon = {
        saveAs: function () {
            const name = "Copy of " + Xrm.Page.getAttribute("oss_name").getValue();
            const subject = Xrm.Page.getAttribute("oss_subject").getValue();
            const json = Xrm.Page.getAttribute("oss_json").getValue();
            const html = Xrm.Page.getAttribute("oss_html").getValue();

            (window as any).WebApiClient.Create({
                entityName: "oss_htmltemplate",
                entity: {
                    oss_name: name,
                    oss_subject: subject,
                    oss_json: json,
                    oss_html: html
                }
            })
            .then((response: string) => {
                const id = response.substr(response.indexOf("(") + 1, 36);

                Xrm.Utility.openEntityForm("oss_htmltemplate", id);
            });
        }
    };
})((window as any)["OSS"] = (window as any)["OSS"] || {});