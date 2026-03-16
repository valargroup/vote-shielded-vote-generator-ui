import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, Copy } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import type { Proposal, ProposalType } from "../types";

const VOTE_OPTION_COLORS = [
  "#22c55e", // green
  "#ef4444", // red
  "#3b82f6", // blue
  "#a855f7", // purple
  "#f97316", // orange
  "#14b8a6", // teal
  "#ec4899", // pink
  "#6366f1", // indigo
];

function optionColor(index: number, total: number): string {
  if (total === 2) return index === 0 ? VOTE_OPTION_COLORS[0] : VOTE_OPTION_COLORS[1];
  return VOTE_OPTION_COLORS[index % VOTE_OPTION_COLORS.length];
}

interface ProposalEditorProps {
  proposal: Proposal;
  onUpdate: (patch: Partial<Proposal>) => void;
  readonly?: boolean;
}

export function ProposalEditor({ proposal, onUpdate, readonly = false }: ProposalEditorProps) {
  const [descTab, setDescTab] = useState<"write" | "preview">("write");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const groups = proposal.optionGroups ?? [];
  const groupedIds = new Set(groups.flatMap((g) => g.optionIds));
  const groupByFirstOption = new Map(groups.map((g) => [g.optionIds[0], g]));

  const handleTypeChange = (type: ProposalType) => {
    const options =
      type === "binary"
        ? [
            { id: uuidv4(), label: "Support" },
            { id: uuidv4(), label: "Oppose" },
          ]
        : [
            { id: uuidv4(), label: "Option A" },
            { id: uuidv4(), label: "Option B" },
          ];
    onUpdate({ type, options, optionGroups: [] });
  };

  const handleOptionChange = (optionId: string, label: string) => {
    onUpdate({
      options: proposal.options.map((o) =>
        o.id === optionId ? { ...o, label } : o
      ),
    });
  };

  const handleGroupLabelChange = (groupId: string, label: string) => {
    onUpdate({
      optionGroups: groups.map((g) => g.id === groupId ? { ...g, label } : g),
    });
  };

  const handleAddOption = () => {
    onUpdate({
      options: [...proposal.options, { id: uuidv4(), label: "" }],
    });
  };

  const handleRemoveStandaloneOption = (optionId: string) => {
    if (proposal.options.length <= 2) return;
    onUpdate({ options: proposal.options.filter((o) => o.id !== optionId) });
  };

  const handleConvertToGroup = (optionId: string) => {
    const opt = proposal.options.find((o) => o.id === optionId);
    if (!opt) return;
    const sub1 = { id: uuidv4(), label: "" };
    const sub2 = { id: uuidv4(), label: "" };
    const idx = proposal.options.findIndex((o) => o.id === optionId);
    const newOptions = [...proposal.options];
    newOptions.splice(idx, 1, sub1, sub2);
    const newGroup = { id: uuidv4(), label: opt.label, optionIds: [sub1.id, sub2.id] };
    onUpdate({ options: newOptions, optionGroups: [...groups, newGroup] });
  };

  const handleAddSubChoice = (groupId: string) => {
    const grp = groups.find((g) => g.id === groupId);
    if (!grp) return;
    const lastMemberId = grp.optionIds[grp.optionIds.length - 1];
    const lastIdx = proposal.options.findIndex((o) => o.id === lastMemberId);
    const newSub = { id: uuidv4(), label: "" };
    const newOptions = [...proposal.options];
    newOptions.splice(lastIdx + 1, 0, newSub);
    onUpdate({
      options: newOptions,
      optionGroups: groups.map((g) =>
        g.id === groupId ? { ...g, optionIds: [...g.optionIds, newSub.id] } : g
      ),
    });
  };

  const handleRemoveSubChoice = (groupId: string, optionId: string) => {
    const grp = groups.find((g) => g.id === groupId);
    if (!grp) return;
    const remaining = grp.optionIds.filter((id) => id !== optionId);
    if (remaining.length < 2) {
      const firstSub = proposal.options.find((o) => o.id === remaining[0]);
      const standaloneLabel = grp.label || firstSub?.label || "";
      const standaloneOpt = { id: uuidv4(), label: standaloneLabel };
      const firstMemberIdx = proposal.options.findIndex((o) => grp.optionIds.includes(o.id));
      const newOptions = proposal.options.filter((o) => !grp.optionIds.includes(o.id));
      newOptions.splice(Math.min(firstMemberIdx, newOptions.length), 0, standaloneOpt);
      onUpdate({
        options: newOptions,
        optionGroups: groups.filter((g) => g.id !== groupId),
      });
    } else {
      onUpdate({
        options: proposal.options.filter((o) => o.id !== optionId),
        optionGroups: groups.map((g) =>
          g.id === groupId ? { ...g, optionIds: remaining } : g
        ),
      });
    }
  };

  const handleRemoveGroup = (groupId: string) => {
    const grp = groups.find((g) => g.id === groupId);
    if (!grp) return;
    const firstMemberIdx = proposal.options.findIndex((o) => grp.optionIds.includes(o.id));
    const standaloneOpt = { id: uuidv4(), label: grp.label };
    const newOptions = proposal.options.filter((o) => !grp.optionIds.includes(o.id));
    newOptions.splice(Math.min(firstMemberIdx, newOptions.length), 0, standaloneOpt);
    onUpdate({
      options: newOptions,
      optionGroups: groups.filter((g) => g.id !== groupId),
    });
  };

  return (
    <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-[11px] text-text-secondary mb-1">
            Title
          </label>
          <input
            type="text"
            value={proposal.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Proposal title"
            readOnly={readonly}
            className={`w-full px-3 py-2 bg-surface-2 border border-border-subtle rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 ${readonly ? "opacity-60 cursor-default" : ""}`}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-[11px] text-text-secondary mb-1">
            Description
          </label>
          <div className="flex gap-1 mb-1">
            <button
              onClick={() => setDescTab("write")}
              className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${
                descTab === "write"
                  ? "bg-surface-3 text-text-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              Write
            </button>
            <button
              onClick={() => setDescTab("preview")}
              className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${
                descTab === "preview"
                  ? "bg-surface-3 text-text-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              Preview
            </button>
          </div>
          {descTab === "write" ? (
            <textarea
              value={proposal.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Describe this proposal..."
              rows={4}
              readOnly={readonly}
              className={`w-full px-3 py-2 bg-surface-2 border border-border-subtle rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 resize-none ${readonly ? "opacity-60 cursor-default" : ""}`}
            />
          ) : (
            <div className="w-full px-3 py-2 bg-surface-2 border border-border-subtle rounded-lg text-xs text-text-primary min-h-[80px]">
              {proposal.description || (
                <span className="text-text-muted italic">Nothing to preview</span>
              )}
            </div>
          )}
          <p className="text-[10px] text-text-muted mt-1">
            Markdown supported. Links, lists, headings.
          </p>
        </div>

        {/* Supported options preview */}
        <div>
          <label className="block text-[11px] text-text-secondary mb-1">
            Supported options
          </label>
          <div className="space-y-1.5">
            {(() => {
              const rendered = new Set<string>();
              return proposal.options.map((option, i) => {
                if (rendered.has(option.id)) return null;
                const grp = groupByFirstOption.get(option.id);
                if (grp) {
                  grp.optionIds.forEach((id) => rendered.add(id));
                  const subs = grp.optionIds
                    .map((id) => proposal.options.find((o) => o.id === id))
                    .filter(Boolean);
                  return (
                    <div key={grp.id}>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: optionColor(i, proposal.options.length) }} />
                        <span className="text-xs text-text-primary font-medium">{grp.label || "Unnamed group"}</span>
                      </div>
                      {subs.map((sub) => (
                        <div key={sub!.id} className="flex items-center gap-2 ml-5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-text-muted" />
                          <span className="text-[11px] text-text-secondary">{sub!.label || "Unnamed"}</span>
                        </div>
                      ))}
                    </div>
                  );
                }
                if (groupedIds.has(option.id)) return null;
                rendered.add(option.id);
                return (
                  <div key={option.id} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: optionColor(i, proposal.options.length) }} />
                    <span className="text-xs text-text-primary">{option.label || "Unnamed"}</span>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Proposal Type */}
        <div>
          <label className="block text-[11px] text-text-secondary mb-1.5">
            Proposal Type
          </label>
          <div className="flex rounded-lg overflow-hidden border border-border-subtle">
            <button
              onClick={() => !readonly && handleTypeChange("binary")}
              disabled={readonly}
              className={`flex-1 py-1.5 text-[11px] text-center transition-colors border-r border-border-subtle ${
                readonly
                  ? "cursor-default opacity-60"
                  : "cursor-pointer"
              } ${
                proposal.type === "binary"
                  ? "bg-accent/20 text-accent-glow"
                  : "bg-surface-2 text-text-muted hover:bg-surface-3"
              }`}
            >
              Binary
            </button>
            <button
              onClick={() => !readonly && handleTypeChange("multi-choice")}
              disabled={readonly}
              className={`flex-1 py-1.5 text-[11px] text-center transition-colors ${
                readonly
                  ? "cursor-default opacity-60"
                  : "cursor-pointer"
              } ${
                proposal.type === "multi-choice"
                  ? "bg-accent/20 text-accent-glow"
                  : "bg-surface-2 text-text-muted hover:bg-surface-3"
              }`}
            >
              Multi-Choice
            </button>
          </div>
        </div>

        {/* Options Editor (inline groups) */}
        <div>
          <div className="space-y-1.5">
            {(() => {
              const rendered = new Set<string>();
              const isMulti = proposal.type === "multi-choice";
              const totalTopLevel = proposal.options.filter((o) => !groupedIds.has(o.id)).length + groups.length;

              return proposal.options.map((option, i) => {
                if (rendered.has(option.id)) return null;
                const grp = groupByFirstOption.get(option.id);

                if (grp) {
                  grp.optionIds.forEach((id) => rendered.add(id));
                  const subs = grp.optionIds
                    .map((id) => proposal.options.find((o) => o.id === id))
                    .filter(Boolean) as typeof proposal.options;

                  return (
                    <div key={grp.id} className="rounded-lg border border-border-subtle bg-surface-2/50 p-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: optionColor(i, proposal.options.length) }} />
                        <input
                          type="text"
                          value={grp.label}
                          onChange={(e) => handleGroupLabelChange(grp.id, e.target.value)}
                          readOnly={readonly}
                          className={`flex-1 px-2.5 py-1.5 bg-surface-1 border border-border-subtle rounded-md text-xs text-text-primary font-medium focus:outline-none focus:border-accent/50 ${readonly ? "opacity-60 cursor-default" : ""}`}
                          placeholder="Group label"
                        />
                        {!readonly && totalTopLevel > 2 && (
                          <button onClick={() => handleRemoveGroup(grp.id)}
                            className="p-1 text-text-muted hover:text-danger rounded cursor-pointer"
                            title="Remove group (keep as single option)">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      <div className="ml-5 mt-1.5 space-y-1">
                        {subs.map((sub) => (
                          <div key={sub.id} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-text-muted" />
                            <input
                              type="text"
                              value={sub.label}
                              onChange={(e) => handleOptionChange(sub.id, e.target.value)}
                              readOnly={readonly}
                              className={`flex-1 px-2 py-1 bg-surface-1 border border-border-subtle rounded text-[11px] text-text-primary focus:outline-none focus:border-accent/50 ${readonly ? "opacity-60 cursor-default" : ""}`}
                              placeholder="Sub-choice label"
                            />
                            {!readonly && (
                              <button onClick={() => handleRemoveSubChoice(grp.id, sub.id)}
                                className="p-1 text-text-muted hover:text-danger rounded cursor-pointer">
                                <Trash2 size={10} />
                              </button>
                            )}
                          </div>
                        ))}
                        {!readonly && (
                          <button onClick={() => handleAddSubChoice(grp.id)}
                            className="flex items-center gap-1 text-[10px] text-text-muted hover:text-accent-glow transition-colors cursor-pointer mt-0.5">
                            <Plus size={10} /> Add sub-choice
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                if (groupedIds.has(option.id)) return null;
                rendered.add(option.id);

                return (
                  <div key={option.id}>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: optionColor(i, proposal.options.length) }} />
                      <input
                        type="text"
                        value={option.label}
                        onChange={(e) => handleOptionChange(option.id, e.target.value)}
                        readOnly={readonly}
                        className={`flex-1 px-2.5 py-1.5 bg-surface-2 border border-border-subtle rounded-md text-xs text-text-primary focus:outline-none focus:border-accent/50 ${readonly ? "opacity-60 cursor-default" : ""}`}
                        placeholder="Option label"
                      />
                      {!readonly && isMulti && totalTopLevel > 2 && (
                        <button onClick={() => handleRemoveStandaloneOption(option.id)}
                          className="p-1 text-text-muted hover:text-danger rounded cursor-pointer">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    {!readonly && isMulti && (
                      <button onClick={() => handleConvertToGroup(option.id)}
                        className="flex items-center gap-1 ml-5 mt-0.5 text-[10px] text-text-muted hover:text-accent-glow transition-colors cursor-pointer">
                        <Plus size={10} /> sub-option
                      </button>
                    )}
                  </div>
                );
              });
            })()}
          </div>
          {!readonly && proposal.type === "multi-choice" && (
            <button
              onClick={handleAddOption}
              className="flex items-center gap-1 mt-2 text-[11px] text-text-muted hover:text-accent-glow transition-colors cursor-pointer"
            >
              <Plus size={12} /> Add choice
            </button>
          )}
        </div>

        {/* Advanced */}
        <div className="border-t border-border-subtle pt-3">
          <button
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="flex items-center gap-1.5 text-[11px] text-text-secondary hover:text-text-primary cursor-pointer"
          >
            {advancedOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Advanced
          </button>
          {advancedOpen && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-[10px] text-text-muted mb-1">
                  Proposal ID
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-2 py-1 bg-surface-2 rounded text-[10px] text-text-muted truncate">
                    {proposal.id}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(proposal.id)}
                    className="p-1 text-text-muted hover:text-text-secondary cursor-pointer"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={proposal.allowAbstain}
                  onChange={(e) => onUpdate({ allowAbstain: e.target.checked })}
                  disabled={readonly}
                  className={`accent-accent ${readonly ? "opacity-60 cursor-default" : ""}`}
                />
                <label className="text-[11px] text-text-secondary">
                  Allow abstain
                </label>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
