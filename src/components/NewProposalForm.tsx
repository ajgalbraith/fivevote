'use client';

import { useActionState } from 'react';
import { Send } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="jurisdiction_id" id="jurisdiction_id_hidden" />

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          maxLength={200}
          placeholder="A short, plain-language headline"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="jurisdiction-select">Jurisdiction</Label>
        <Select
          name="jurisdiction_id"
          required
        >
          <SelectTrigger id="jurisdiction-select" className="w-full">
            <SelectValue placeholder="Pick a level of government..." />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {jurisdictions.map((j) => (
                <SelectItem key={j.id} value={j.id}>
                  {j.country_code} · {j.level} · {j.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="summary">Plain-language summary</Label>
        <Input
          id="summary"
          name="summary"
          maxLength={400}
          placeholder="One sentence. Optional but recommended."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="problem">Problem statement</Label>
        <Textarea
          id="problem"
          name="problem"
          rows={3}
          maxLength={2000}
          placeholder="What problem does this solve?"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="proposal_text">Proposal text</Label>
        <Textarea
          id="proposal_text"
          name="proposal_text"
          required
          rows={10}
          maxLength={10000}
          placeholder="The actual proposal"
          className="font-mono text-sm"
        />
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t publish</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" disabled={isPending}>
          <Send />
          {isPending ? 'Publishing…' : 'Publish for review'}
        </Button>
      </div>
    </form>
  );
}
