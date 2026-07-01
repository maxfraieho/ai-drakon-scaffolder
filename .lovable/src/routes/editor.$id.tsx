import { createFileRoute } from "@tanstack/react-router";

import { EditorPage } from "@/pages/EditorPage";

export const Route = createFileRoute("/editor/$id")({
component: EditorRoute,
});

function EditorRoute() {
const { id } = Route.useParams();
return <EditorPage diagramId={id} />;
}

