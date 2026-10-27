import type { ReactNode } from 'react';
import { EMPTY } from '@/lib/format';

export function ToolSection({
  id,
  index,
  title,
  summary,
  children,
}: {
  id: string;
  index: string;
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
        <p className="font-mono text-xs tracking-[0.18em] text-gold">{index}</p>
        <h2 id={`${id}-title`} className="mt-2 text-2xl font-medium tracking-tight sm:text-3xl">
          {title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted sm:text-base">{summary}</p>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

export function ToolGrid({ form, result }: { form: ReactNode; result: ReactNode }) {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <div className="rounded-2xl border border-line bg-panel p-5 sm:p-6">{form}</div>
      <div className="rounded-2xl border border-line bg-inset p-5 sm:p-6">{result}</div>
    </div>
  );
}

export function SampleButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm text-gold-soft underline-offset-4 hover:underline"
    >
      套用範例
    </button>
  );
}

export function Field({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm text-muted">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded-lg border border-line bg-inset px-3 py-2.5 font-mono text-base text-ink tabular-nums outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
      />
      {hint ? <p className="mt-1.5 text-xs leading-5 text-faint">{hint}</p> : null}
    </div>
  );
}

export function Segmented<T extends string>({
  name,
  label,
  value,
  options,
  onChange,
}: {
  name: string;
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm text-muted">{label}</legend>
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-inset p-1">
        {options.map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input
              className="peer sr-only"
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span className="block rounded-md px-3 py-2 text-center text-sm text-muted peer-checked:bg-chip peer-checked:text-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Stat({
  label,
  value,
  testId,
  emphasis = false,
}: {
  label: string;
  value: string;
  testId?: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd
        data-testid={testId}
        className={
          emphasis
            ? 'mt-1 font-mono text-3xl tracking-tight text-gold-soft tabular-nums sm:text-4xl'
            : 'mt-1 font-mono text-lg text-ink tabular-nums'
        }
      >
        {value || EMPTY}
      </dd>
    </div>
  );
}

export function PanelNote({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'warn' }) {
  return (
    <p
      className={
        tone === 'warn'
          ? 'border-l-2 border-rose/70 pl-3 text-sm leading-6 text-rose'
          : 'text-sm leading-6 text-muted'
      }
    >
      {children}
    </p>
  );
}
