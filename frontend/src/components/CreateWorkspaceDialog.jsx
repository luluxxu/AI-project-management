import { useState } from "react";
import { PlusIcon, XIcon, GlobeIcon, LockIcon } from "lucide-react";

export default function CreateWorkspaceDialog({ isOpen, onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim(), isPublic });
    setName("");
    setDescription("");
    setIsPublic(false);
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setIsPublic(false);
    onClose();
  };

  const inputClass = "w-full rounded-xl border border-[#ddd5be] bg-white px-3.5 py-2.5 text-[0.9rem] text-[#1B0C0C] placeholder:text-[#b5a882] outline-none transition focus:border-[#4C5C2D] focus:ring-2 focus:ring-[#4C5C2D]/15";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="m-0 text-lg font-bold text-slate-900">Create Workspace</h2>
          <button onClick={handleClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <XIcon className="size-5" />
          </button>
        </div>

        <div className="grid gap-4">
          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium text-[#6c6346]">Workspace name</label>
            <input
              className={inputClass}
              placeholder="e.g. Marketing Team, CS5500 Project"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium text-[#6c6346]">Description (optional)</label>
            <input
              className={inputClass}
              placeholder="What is this workspace for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[0.8rem] font-medium text-[#6c6346]">Visibility</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`flex items-center gap-2 rounded-xl border p-3 text-left transition ${!isPublic ? "border-[#4C5C2D] bg-[#4C5C2D]/5 ring-1 ring-[#4C5C2D]/20" : "border-[#ddd5be] hover:bg-[#faf5e4]"}`}
              >
                <LockIcon className={`size-4 shrink-0 ${!isPublic ? "text-[#4C5C2D]" : "text-[#8a7d5e]"}`} />
                <div>
                  <div className={`text-[0.85rem] font-medium ${!isPublic ? "text-[#4C5C2D]" : "text-[#1B0C0C]"}`}>Private</div>
                  <div className="text-[0.75rem] text-[#8a7d5e]">Only invited members</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`flex items-center gap-2 rounded-xl border p-3 text-left transition ${isPublic ? "border-[#4C5C2D] bg-[#4C5C2D]/5 ring-1 ring-[#4C5C2D]/20" : "border-[#ddd5be] hover:bg-[#faf5e4]"}`}
              >
                <GlobeIcon className={`size-4 shrink-0 ${isPublic ? "text-[#4C5C2D]" : "text-[#8a7d5e]"}`} />
                <div>
                  <div className={`text-[0.85rem] font-medium ${isPublic ? "text-[#4C5C2D]" : "text-[#1B0C0C]"}`}>Public</div>
                  <div className="text-[0.75rem] text-[#8a7d5e]">Visible in Discover</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={handleClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[0.85rem] text-slate-700 transition hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#4C5C2D] px-4 py-2 text-[0.85rem] font-medium text-[#fff8dd] transition hover:bg-[#3a4822] disabled:opacity-50"
          >
            <PlusIcon className="size-4" />
            Create Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
