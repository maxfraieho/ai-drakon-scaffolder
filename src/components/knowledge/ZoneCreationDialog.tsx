import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { api, type CreateKnowledgeZoneRequest } from "@/lib/api";

interface ZoneCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ZoneCreationDialog({
  isOpen,
  onClose,
}: ZoneCreationDialogProps) {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ttl, setTtl] = useState<CreateKnowledgeZoneRequest["ttl"]>("24h");
  const [accessType, setAccessType] = useState<
    CreateKnowledgeZoneRequest["accessType"]
  >("web");
  const [createNotebookLm, setCreateNotebookLm] = useState(false);
  const [notebookLmTitle, setNotebookLmTitle] = useState("");
  const [shareEmails, setShareEmails] = useState("");

  const createZoneMutation = useMutation({
    mutationFn: (data: CreateKnowledgeZoneRequest) => api.createKnowledgeZone(data),
    onSuccess: (response) => {
      if (response.success) {
        toast.success("Knowledge zone created successfully.");
        queryClient.invalidateQueries({ queryKey: ["knowledgeZones"] });
        handleClose();
      } else {
        toast.error(response.message || "Failed to create knowledge zone.");
      }
    },
    onError: (err) => {
      toast.error(`Error creating knowledge zone: ${err.message}`);
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Zone name is required.");
      return;
    }

    const data: CreateKnowledgeZoneRequest = {
      name,
      description: description.trim() || undefined,
      ttl,
      accessType,
      createNotebookLm,
    };

    if (createNotebookLm) {
      data.notebookLmTitle = notebookLmTitle.trim() || undefined;
      data.shareEmails = shareEmails.split(",").map((s) => s.trim()).filter(Boolean);
    }

    createZoneMutation.mutate(data);
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setTtl("24h");
    setAccessType("web");
    setCreateNotebookLm(false);
    setNotebookLmTitle("");
    setShareEmails("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Knowledge Zone</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="ttl" className="text-right">
              TTL
            </Label>
            <Select value={ttl} onValueChange={(value) => setTtl(value as any)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select TTL" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 Hour</SelectItem>
                <SelectItem value="24h">24 Hours</SelectItem>
                <SelectItem value="7d">7 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="accessType" className="text-right">
              Access Type
            </Label>
            <Select
              value={accessType}
              onValueChange={(value) => setAccessType(value as any)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select access type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="web">Web</SelectItem>
                <SelectItem value="mcp">MCP</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="createNotebookLm" className="text-right">
              Create NotebookLM
            </Label>
            <Checkbox
              id="createNotebookLm"
              checked={createNotebookLm}
              onCheckedChange={(checked) => setCreateNotebookLm(!!checked)}
              className="col-span-3"
            />
          </div>
          {createNotebookLm && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notebookLmTitle" className="text-right">
                  NotebookLM Title
                </Label>
                <Input
                  id="notebookLmTitle"
                  value={notebookLmTitle}
                  onChange={(e) => setNotebookLmTitle(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="shareEmails" className="text-right">
                  Share Emails (comma-separated)
                </Label>
                <Input
                  id="shareEmails"
                  value={shareEmails}
                  onChange={(e) => setShareEmails(e.target.value)}
                  className="col-span-3"
                  placeholder="email1@example.com, email2@example.com"
                />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={createZoneMutation.isPending}
          >
            {createZoneMutation.isPending ? "Creating..." : "Create Zone"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
