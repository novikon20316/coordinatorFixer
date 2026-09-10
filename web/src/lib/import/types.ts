/** One proposed create/update, shown as a checkable row in ImportReviewModal
 *  before anything is saved - see components/ImportReviewModal.tsx. */
export interface ProposedChange {
  key: string;
  label: string;
  /** "new" or a human label of what's being updated, e.g. an existing name. */
  actionLabel: string;
  apply: () => Promise<void>;
}
