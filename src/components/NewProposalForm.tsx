'use client';

import { useActionState } from 'react';
import { createProposal, type CreateProposalState } from '@/app/proposals/actions';

type Jurisdiction = {
  id: string;
  name: string;
  country_code: string;
  level: string;
};

const initial: CreateProposalState = { ok: false };

export default function NewProposalForm({ jurisdictions }: { jurisdictions: Jurisdiction[] }) {
  const [state, formAction, isPending] = useActionState(createProposal, initial);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Title</span>
        <input
          name="title"
          required
          maxLength={200}
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
          placeholder="A short, plain-language headline"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Jurisdiction</span>
        <select
          name="jurisdiction_id"
          required
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
        >
          <option value="">Pick a level of government...</option>
          {jurisdictions.map((j) => (
            <option key={j.id} value={j.id}>
              {j.country_code} · {j.level} · {j.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">One-sentence plain-language summary</span>
        <input
          name="summary"
          maxLength={400}
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
          placeholder="Optional but recommended"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Problem statement</span>
        <textarea
          name="problem"
          rows={3}
          maxLength={2000}
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
          placeholder="What problem does this solve?"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Proposal text</span>
        <textarea
          name="proposal_text"
          required
          rows={10}
          maxLength={10000}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
          placeholder="The actual proposal"
        />
      </label>

      {state.error ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {state.error}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {isPending ? 'Publishing...' : 'Publish for review'}
        </button>
      </div>
    </form>
  );
}
