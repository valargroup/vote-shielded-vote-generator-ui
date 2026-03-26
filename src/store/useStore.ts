import { useState, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import type { VotingRound, Proposal, ProposalType, RoundStatus } from "../types";

const STORAGE_KEY = "shielded-vote-rounds";
const SEEDED_KEY = "shielded-vote-seeded";

function makeBinaryProposal(title: string, description: string): Proposal {
  return {
    id: uuidv4(),
    title,
    description,
    type: "binary",
    options: [
      { id: uuidv4(), label: "Support" },
      { id: uuidv4(), label: "Oppose" },
    ],
    optionGroups: [],
    allowAbstain: false,
    metadata: [],
  };
}

function makeMultiChoiceProposal(title: string, description: string, labels: string[]): Proposal {
  return {
    id: uuidv4(),
    title,
    description,
    type: "multi-choice",
    options: labels.map((label) => ({ id: uuidv4(), label })),
    optionGroups: [],
    allowAbstain: false,
    metadata: [],
  };
}

function makeGroupedProposal(
  title: string,
  description: string,
  options: string[],
  groups: { label: string; memberIndices: number[] }[],
): Proposal {
  const opts = options.map((label) => ({ id: uuidv4(), label }));
  return {
    id: uuidv4(),
    title,
    description,
    type: "multi-choice",
    options: opts,
    optionGroups: groups.map((g) => ({
      id: uuidv4(),
      label: g.label,
      optionIds: g.memberIndices.map((i) => opts[i].id),
    })),
    allowAbstain: false,
    metadata: [],
  };
}

function createGroupedSampleProposals(): Proposal[] {
  return [
    makeGroupedProposal(
      "Sprout Pool Sunset",
      "When should the protocol disable v4 transactions (and therefore make Sprout funds inaccessible)?",
      [
        "Immediately upon NU7 activation date",
        "One year following poll conclusion date",
        "Two years following poll conclusion date",
        "When quantum threat is imminent, and the Orchard pool transitions to recovery only",
      ],
      [{ label: "At a fixed date following poll conclusion", memberIndices: [1, 2] }]
    ),
  ];
}

function createGroupedSeedRound(): VotingRound {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    name: "(SAMPLE) Grouped Voting — Sprout Sunset",
    status: "draft",
    proposals: createGroupedSampleProposals(),
    settings: {
      description:
        "Demonstrates grouped option voting: sub-options under 'Fixed date' are tallied together before comparing against other camps.",
      snapshotHeight: "",
      endTime: "",
      openUntilClosed: true,
      defaultProposalType: "multi-choice",
      defaultLabels: ["Option A", "Option B"],
    },
    createdAt: now,
    updatedAt: now,
  };
}

function createSampleProposals(): Proposal[] {
  return [
    makeBinaryProposal(
      "Network Sustainability Mechanism (NSM)",
      "What is your general sentiment toward adding protocol support for the Network Sustainability Mechanism (NSM), including smoothing the issuance curve, which allows ZEC to be removed from circulation and later reissued as future block rewards to help sustain network security while preserving the 21 million ZEC supply cap?"
    ),
    makeBinaryProposal(
      "Fee Burning via NSM",
      "What is your general sentiment toward burning 60% of transaction fees via the Network Sustainability Mechanism (NSM)? The goals are to demonstrate Zcash's commitment to long-term sustainability, to burn ZEC so that it can be re-issued in the future without exceeding the 21M supply cap, and in the context of dynamic fees, to prevent miners from manipulating fees.\n\nReference: ZIP-235"
    ),
    makeMultiChoiceProposal(
      "Project Tachyon",
      "What is your general sentiment toward deploying a new shielded protocol or pool to address scalability challenges as part of Project Tachyon?",
      ["Hell yeah", "Yes", "No"]
    ),
  ];
}

function createSeedRound(): VotingRound {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    name: "(SAMPLE) NU7 Sentiment Polling",
    status: "draft",
    proposals: createSampleProposals(),
    settings: {
      description:
        "Sentiment polling for Zcash Network Upgrade 7 (NU7) feature candidates.",
      snapshotHeight: "",
      endTime: "",
      openUntilClosed: true,
      defaultProposalType: "binary",
      defaultLabels: ["Support", "Oppose"],
    },
    createdAt: now,
    updatedAt: now,
  };
}

function loadRounds(): VotingRound[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    // First-time user: seed with sample round
    if (!localStorage.getItem(SEEDED_KEY)) {
      const seed = [createSeedRound()];
      localStorage.setItem(SEEDED_KEY, "true");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return [];
  } catch {
    return [];
  }
}

function saveRounds(rounds: VotingRound[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rounds));
}

function createDefaultProposal(): Proposal {
  return {
    id: uuidv4(),
    title: "",
    description: "",
    type: "binary",
    options: [
      { id: uuidv4(), label: "Support" },
      { id: uuidv4(), label: "Oppose" },
    ],
    optionGroups: [],
    allowAbstain: false,
    metadata: [],
  };
}

function defaultEndTime(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 10, 0, 0);
  return d.toISOString();
}

function createDefaultRound(name: string): VotingRound {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    name,
    status: "draft",
    proposals: [createDefaultProposal()],
    settings: {
      description: "",
      snapshotHeight: "",
      endTime: defaultEndTime(),
      openUntilClosed: true,
      defaultProposalType: "binary",
      defaultLabels: ["Support", "Oppose"],
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function useStore() {
  const [rounds, setRounds] = useState<VotingRound[]>(loadRounds);
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const [activeProposalId, setActiveProposalId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");

  useEffect(() => {
    setSaveState("saving");
    const t = setTimeout(() => {
      saveRounds(rounds);
      setSaveState("saved");
    }, 300);
    return () => clearTimeout(t);
  }, [rounds]);

  const activeRound = rounds.find((r) => r.id === activeRoundId) ?? null;
  const activeProposal =
    activeRound?.proposals.find((p) => p.id === activeProposalId) ?? null;

  const updateRound = useCallback(
    (id: string, patch: Partial<VotingRound>) => {
      setRounds((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r
        )
      );
    },
    []
  );

  const createRound = useCallback((name?: string) => {
    const round = createDefaultRound(name ?? "Untitled Round");
    setRounds((prev) => [round, ...prev]);
    setActiveRoundId(round.id);
    setActiveProposalId(round.proposals[0]?.id ?? null);
    return round;
  }, []);

  const createSampleRound = useCallback(() => {
    const round = createSeedRound();
    setRounds((prev) => [round, ...prev]);
    setActiveRoundId(round.id);
    setActiveProposalId(round.proposals[0]?.id ?? null);
    return round;
  }, []);

  const createGroupedSampleRound = useCallback(() => {
    const round = createGroupedSeedRound();
    setRounds((prev) => [round, ...prev]);
    setActiveRoundId(round.id);
    setActiveProposalId(round.proposals[0]?.id ?? null);
    return round;
  }, []);

  const deleteRound = useCallback(
    (id: string) => {
      setRounds((prev) => prev.filter((r) => r.id !== id));
      if (activeRoundId === id) {
        setActiveRoundId(null);
        setActiveProposalId(null);
      }
    },
    [activeRoundId]
  );

  const duplicateRound = useCallback(
    (id: string) => {
      const source = rounds.find((r) => r.id === id);
      if (!source) return;
      const now = new Date().toISOString();
      const newRound: VotingRound = {
        ...structuredClone(source),
        id: uuidv4(),
        name: `${source.name} (copy)`,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      };
      newRound.proposals = newRound.proposals.map((p) => {
        const oldToNew = new Map<string, string>();
        const newOptions = p.options.map((o) => {
          const newId = uuidv4();
          oldToNew.set(o.id, newId);
          return { ...o, id: newId };
        });
        return {
          ...p,
          id: uuidv4(),
          options: newOptions,
          optionGroups: (p.optionGroups ?? []).map((g) => ({
            ...g,
            id: uuidv4(),
            optionIds: g.optionIds.map((oid) => oldToNew.get(oid) ?? oid),
          })),
        };
      });
      setRounds((prev) => [newRound, ...prev]);
      setActiveRoundId(newRound.id);
    },
    [rounds]
  );

  const setRoundStatus = useCallback(
    (id: string, status: RoundStatus) => {
      updateRound(id, { status });
    },
    [updateRound]
  );

  const addProposal = useCallback(
    (roundId: string) => {
      const proposal = createDefaultProposal();
      setRounds((prev) =>
        prev.map((r) =>
          r.id === roundId
            ? { ...r, proposals: [...r.proposals, proposal], updatedAt: new Date().toISOString() }
            : r
        )
      );
      setActiveProposalId(proposal.id);
      return proposal;
    },
    []
  );

  const updateProposal = useCallback(
    (roundId: string, proposalId: string, patch: Partial<Proposal>) => {
      setRounds((prev) =>
        prev.map((r) =>
          r.id === roundId
            ? {
                ...r,
                proposals: r.proposals.map((p) =>
                  p.id === proposalId ? { ...p, ...patch } : p
                ),
                updatedAt: new Date().toISOString(),
              }
            : r
        )
      );
    },
    []
  );

  const deleteProposal = useCallback(
    (roundId: string, proposalId: string) => {
      setRounds((prev) =>
        prev.map((r) =>
          r.id === roundId
            ? {
                ...r,
                proposals: r.proposals.filter((p) => p.id !== proposalId),
                updatedAt: new Date().toISOString(),
              }
            : r
        )
      );
      if (activeProposalId === proposalId) {
        setActiveProposalId(null);
      }
    },
    [activeProposalId]
  );

  const duplicateProposal = useCallback(
    (roundId: string, proposalId: string) => {
      const round = rounds.find((r) => r.id === roundId);
      const source = round?.proposals.find((p) => p.id === proposalId);
      if (!source) return;
      const oldToNew = new Map<string, string>();
      const newOptions = source.options.map((o) => {
        const newId = uuidv4();
        oldToNew.set(o.id, newId);
        return { ...o, id: newId };
      });
      const newProposal: Proposal = {
        ...structuredClone(source),
        id: uuidv4(),
        title: `${source.title} (copy)`,
        options: newOptions,
        optionGroups: source.optionGroups.map((g) => ({
          ...g,
          id: uuidv4(),
          optionIds: g.optionIds.map((oid) => oldToNew.get(oid) ?? oid),
        })),
      };
      setRounds((prev) =>
        prev.map((r) =>
          r.id === roundId
            ? { ...r, proposals: [...r.proposals, newProposal], updatedAt: new Date().toISOString() }
            : r
        )
      );
      setActiveProposalId(newProposal.id);
    },
    [rounds]
  );

  const reorderProposals = useCallback(
    (roundId: string, fromIndex: number, toIndex: number) => {
      setRounds((prev) =>
        prev.map((r) => {
          if (r.id !== roundId) return r;
          const proposals = [...r.proposals];
          const [moved] = proposals.splice(fromIndex, 1);
          proposals.splice(toIndex, 0, moved);
          return { ...r, proposals, updatedAt: new Date().toISOString() };
        })
      );
    },
    []
  );

  const setProposalType = useCallback(
    (roundId: string, proposalId: string, type: ProposalType) => {
      const defaultOptions =
        type === "binary"
          ? [
              { id: uuidv4(), label: "Support" },
              { id: uuidv4(), label: "Oppose" },
            ]
          : [
              { id: uuidv4(), label: "Option A" },
              { id: uuidv4(), label: "Option B" },
            ];
      updateProposal(roundId, proposalId, { type, options: defaultOptions, optionGroups: [] });
    },
    [updateProposal]
  );

  return {
    rounds,
    activeRound,
    activeRoundId,
    activeProposal,
    activeProposalId,
    saveState,
    setActiveRoundId,
    setActiveProposalId,
    createRound,
    createSampleRound,
    createGroupedSampleRound,
    updateRound,
    deleteRound,
    duplicateRound,
    setRoundStatus,
    addProposal,
    updateProposal,
    deleteProposal,
    duplicateProposal,
    reorderProposals,
    setProposalType,
  };
}
