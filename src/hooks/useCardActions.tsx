import { useState } from "react";
import { trpc } from "@/providers/trpc";
import type { Job } from "@contracts/types";
import { ApplyModal, InvestModal, MessageModal, QuickHireModal, Toast } from "@/components/modals";

type Target = { type: "startup" | "freelancer"; id: number; name: string } | null;

/** Shared card-action wiring: like/save, apply, invest, message, hire, toast */
export function useCardActions() {
  const utils = trpc.useUtils();
  const reactions = trpc.catalog.myReactions.useQuery();
  const myApps = trpc.actions.myApplications.useQuery();
  const [toast, setToast] = useState<string | null>(null);
  const [applyJob, setApplyJob] = useState<{ job: Job; startupName: string } | null>(null);
  const [investTarget, setInvestTarget] = useState<{ id: number; name: string } | null>(null);
  const [msgTarget, setMsgTarget] = useState<Target>(null);
  const [hireTarget, setHireTarget] = useState<{ id: number; name: string; hourlyRate: number } | null>(null);

  const react = trpc.actions.react.useMutation({
    onSuccess: () => utils.catalog.myReactions.invalidate(),
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const isReacted = (targetType: "job" | "startup" | "freelancer" | "product", targetId: number, kind: "like" | "save") =>
    !!reactions.data?.some((r) => r.targetType === targetType && r.targetId === targetId && r.kind === kind);

  const hasApplied = (jobId: number) => !!myApps.data?.some((a) => a.application.jobId === jobId);

  const toggle = (targetType: "job" | "startup" | "freelancer" | "product", targetId: number, kind: "like" | "save") =>
    react.mutate({ targetType, targetId, kind });

  const modals = (
    <>
      <ApplyModal job={applyJob?.job ?? null} startupName={applyJob?.startupName ?? ""} open={!!applyJob} onClose={() => setApplyJob(null)} onDone={showToast} />
      <InvestModal startupId={investTarget?.id ?? null} startupName={investTarget?.name ?? ""} open={!!investTarget} onClose={() => setInvestTarget(null)} onDone={showToast} />
      <MessageModal target={msgTarget} open={!!msgTarget} onClose={() => setMsgTarget(null)} onDone={showToast} />
      <QuickHireModal freelancer={hireTarget} open={!!hireTarget} onClose={() => setHireTarget(null)} onDone={showToast} />
      <Toast message={toast} />
    </>
  );

  return { isReacted, hasApplied, toggle, setApplyJob, setInvestTarget, setMsgTarget, setHireTarget, showToast, modals };
}
