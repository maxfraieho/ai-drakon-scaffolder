export interface DrakonItem {
  type:
    | "header"
    | "action"
    | "question"
    | "end"
    | "insertion"
    | "address"
    | "case"
    | "for-begin"
    | "for-end";
  content: string;
  one?: string;
  two?: string;
  branchId?: string;
}

export interface DrakonDiagram {
  name: string;
  items: Record<string, DrakonItem>;
}

export interface Diagram {
  id: string;
  name: string;
  folderId: string;
  createdAt: string;
  updatedAt: string;
  diagram: DrakonDiagram;
}

export interface GenerateResult {
  success: boolean;
  diagram: DrakonDiagram;
  fixes: string[];
  metrics: {
    sis: string;
    sis_ok: boolean;
    rdc: number;
    rdc_ok: boolean;
    total_nodes: number;
  };
}

export interface EditDelta {
  type: "update" | "insert" | "delete";
  itemId: string;
  data?: Partial<DrakonItem>;
}
