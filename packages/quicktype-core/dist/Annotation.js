// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AnnotationData {
}
export class IssueAnnotationData extends AnnotationData {
    constructor(message) {
        super();
        this.message = message;
    }
}
export const anyTypeIssueAnnotation = new IssueAnnotationData("quicktype cannot infer this type because there is no data about it in the input.");
export const nullTypeIssueAnnotation = new IssueAnnotationData("The only value for this in the input is null, which means you probably need a more complete input sample.");
