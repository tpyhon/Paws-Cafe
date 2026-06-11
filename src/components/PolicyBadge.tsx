'use client';

import { DogPolicyType, POLICY_EMOJI, POLICY_LABELS } from '@/lib/types';

interface Props {
  policy: DogPolicyType;
  size?: 'sm' | 'md';
}

const colorMap: Record<DogPolicyType, string> = {
  inside_ok: 'bg-emerald-500',
  terrace_only: 'bg-amber-500',
  some_seats_ok: 'bg-blue-500',
};

export function PolicyBadge({ policy, size = 'md' }: Props) {
  const cls = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full text-white font-semibold ${colorMap[policy]} ${cls}`}>
      {POLICY_EMOJI[policy]} {POLICY_LABELS[policy]}
    </span>
  );
}
