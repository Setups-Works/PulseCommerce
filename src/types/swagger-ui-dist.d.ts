/**
 * swagger-ui-dist ships no types for its ES bundle, only for the CommonJS
 * index. Declared here rather than pulled from DefinitelyTyped so the shape
 * covers exactly the options this application passes — an unrecognised option
 * is a typo Swagger UI would ignore in silence.
 */
declare module "swagger-ui-dist/swagger-ui-es-bundle.js" {
  interface SwaggerUIOptions {
    domNode: HTMLElement;
    /** URL of the OpenAPI document to render. */
    url: string;
    /** Methods "Try it out" may use. An empty array disables live requests. */
    supportedSubmitMethods?: string[];
    docExpansion?: "list" | "full" | "none";
    defaultModelsExpandDepth?: number;
    deepLinking?: boolean;
    persistAuthorization?: boolean;
  }

  export default function SwaggerUI(options: SwaggerUIOptions): unknown;
}
