export type LlmsJsonContentType = "guide" | "api-operation";

export interface LlmsJsonSite {
  name: string;
  description?: string;
  url?: string;
}

export interface LlmsJsonApiOperation {
  specId: string;
  method: string;
  path: string;
  tags: string[];
  deprecated: boolean;
  beta: boolean;
  auth: string[];
}

export interface LlmsJsonApiParameter {
  name: string;
  location: string;
  required: boolean;
  schemaType?: string;
  schemaRef?: string;
}

export interface LlmsJsonApiResponse {
  status: string;
  mediaTypes: string[];
  schemaRefs: string[];
}

export interface AgentChunkApiOperation extends LlmsJsonApiOperation {
  parameters: LlmsJsonApiParameter[];
  responses: LlmsJsonApiResponse[];
}

export interface AgentChunk {
  route: string;
  headingPath: string[];
  source?: string;
  text: string;
  links: string[];
  api?: AgentChunkApiOperation;
}

export interface AgentChunkIndex {
  chunks: AgentChunk[];
}

export interface LlmsJsonRoute {
  route: string;
  title: string;
  description: string;
  contentType: LlmsJsonContentType;
  source?: string;
  api?: LlmsJsonApiOperation;
  chunks: AgentChunk[];
}

export interface LlmsJsonDocument {
  site: LlmsJsonSite;
  routes: LlmsJsonRoute[];
}
