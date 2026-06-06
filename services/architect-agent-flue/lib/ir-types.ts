export interface DrakonNode {
  type: 'branch' | 'action' | 'question' | 'end';
  content?: string;
  branchId?: string | number;
  one?: string;  // next node id
  two?: string;  // else branch (for question nodes)
}

export interface DrakonDiagram {
  name: string;
  params: string;
  items: Record<string, DrakonNode>;
  _valid?: boolean;
  _errors?: string[];
  _warnings?: string[];
  _refine_error?: string;
}

export interface AnalyzeResponse {
  filename: string;
  diagrams: DrakonDiagram[];
  count: number;
}
