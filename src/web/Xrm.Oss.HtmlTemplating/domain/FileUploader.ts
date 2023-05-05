import * as WebApiClient from "xrm-webapi-client";
import { FunctionContext, ImageUploadSettings } from "../components/App";


// https://learn.microsoft.com/en-us/power-apps/developer/data-platform/file-column-data?tabs=webapi#upload-files
export const registerFileUploader = ({uploadEntity, uploadEntityFileNameField, uploadEntityBodyField, parentLookupName}: ImageUploadSettings, { editorRef, getFormContext, webApiClient }: FunctionContext) => {
    editorRef.registerCallback('image', async function (file, done) {
        var img = file.attachments[0];

        var fileRequest: WebApiClient.CreateParameters = {
            entityName: uploadEntity,
            entity: { }
        };

        const formContext = getFormContext();

        if (uploadEntityFileNameField) {
            (fileRequest as any).entity[uploadEntityFileNameField] = img.name;
        }

        if (parentLookupName) {
            if (formContext?.entity && formContext?.entityId) {
                (fileRequest as any).entity[`${parentLookupName}@odata.bind`] = `${webApiClient.GetSetName(formContext.entity)}(${formContext.entityId})`;
            }
            else {
                (window as any).Xrm.Navigation.openAlertDialog("Your record is not yet created. Please save to be able to upload images");
                throw new Error("Image upload not possible, record has to be saved first");
            }
        }

        try {
            const response = await webApiClient.Create(fileRequest);
            const fileId = response.substr(response.length - 37, 36);
        
            done({ progress: 50 });

            var headers = [
                { key: "x-ms-file-name", value: img.name },
                { key: "Content-Type", value: "application/octet-stream" }
            ];

            var url = (webApiClient as any).GetApiUrl({ apiVersion: "9.2" }) + `${webApiClient.GetSetName(uploadEntity)}(${fileId})/${uploadEntityBodyField}`;

            await webApiClient.SendRequest("PATCH", url, img, { headers: headers, apiVersion: "9.2" });
            done({ progress: 100, url: `${url}/$value` });
        }
        catch (error) {
            console.log(error);
            throw error;
        }
    });
};