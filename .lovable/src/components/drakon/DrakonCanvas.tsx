export const DrakonCanvas = ({ diagramId }: { diagramId: string }) => {
return (
<div className="flex h-full w-full items-center justify-center rounded-lg border-2 border-dashed
border-muted-foreground/20 bg-muted/20">
<div className="text-center text-muted-foreground">
<p className="text-lg font-medium">DRAKON Canvas</p>
<p className="text-sm">drakonwidget.js буде підключено окремо</p>
<p className="mt-1 text-xs">ID: {diagramId}</p>
</div>
</div>
);
};

