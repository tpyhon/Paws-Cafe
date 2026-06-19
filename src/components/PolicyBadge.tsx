'use client';

import { DogPolicyType, POLICY_EMOJI, POLICY_LABELS, SMOKING_POLICY_EMOJI, SMOKING_POLICY_LABELS } from '@/lib/types';

interface Props {
  policy: DogPolicyType;
  size?: 'sm' | 'md';
  isSmoking?: boolean;
}

const dogColorMap: Record<DogPolicyType, string> = {
  inside_ok: 'bg-emerald-500',
  terrace_only: 'bg-amber-500',
  some_seats_ok: 'bg-blue-500',
};

const smokingColorMap: Record<DogPolicyType, string> = {
  inside_ok: 'bg-zinc-800 text-zinc-100 border border-zinc-700',
  terrace_only: 'bg-stone-700 text-stone-100 border border-stone-600',
  some_seats_ok: 'bg-neutral-700 text-neutral-100 border border-neutral-600',
};

export function PolicyBadge({ policy, size = 'md', isSmoking = false }: Props) {
  const cls = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';
  const colorClass = isSmoking ? smokingColorMap[policy] : dogColorMap[policy];
  const emoji = isSmoking ? SMOKING_POLICY_EMOJI[policy] : POLICY_EMOJI[policy];
  const label = isSmoking ? SMOKING_POLICY_LABELS[policy] : POLICY_LABELS[policy];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${colorClass} ${cls}`}>
      <span>{emoji}</span>
      <span>{label}</span>
    </span>
  );
}
