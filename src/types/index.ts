export type ProposalType = "binary" | "multi-choice";

export type RoundStatus = "draft" | "published" | "archived";

export interface ProposalOption {
  id: string;
  label: string;
}

export interface ProposalMetadata {
  key: string;
  value: string;
}

export interface OptionGroup {
  id: string;
  label: string;
  optionIds: string[];
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  type: ProposalType;
  options: ProposalOption[];
  optionGroups: OptionGroup[];
  allowAbstain: boolean;
  metadata: ProposalMetadata[];
}

export interface RoundSettings {
  description: string;
  snapshotHeight: string;
  endTime: string;
  openUntilClosed: boolean;
  defaultProposalType: ProposalType;
  defaultLabels: [string, string];
}

export interface VotingRound {
  id: string;
  name: string;
  status: RoundStatus;
  proposals: Proposal[];
  settings: RoundSettings;
  createdAt: string;
  updatedAt: string;
  chainTxHash?: string;
}
