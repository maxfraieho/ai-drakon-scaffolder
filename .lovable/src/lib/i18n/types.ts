export interface Translations {
  drakon: {
    copy: string;
    cut: string;
    paste: string;
    delete: string;
    editContent: string;
    swapYesNo: string;
    addParameters: string;
    insertBranchWithEnd: string;
    insertBranch: string;
    insertBranchLeft: string;
    insertBranchRight: string;
    insertCase: string;
    insertCaseLeft: string;
    insertCaseRight: string;
    addPath: string;
    addPathLeft: string;
    addPathRight: string;
    addVertex: string;
    addRemoveVertex: string;
    sendToBack: string;
    bringToFront: string;
    deletePath: string;
    editUpperText: string;
    editLink: string;
    goToBranch: string;
    increaseMargin: string;
    resetMargin: string;
    flip: string;
    format: string;
    diagramFormat: string;
    changeImage: string;
    yes: string;
    no: string;
    end: string;
    exit: string;
    branch: string;
    editSecondaryText: string;
  };
  drakonEditor: Record<string, string>;
  editor?: {
    save?: string;
    cancel?: string;
  };
}
