import Link from 'next/link';

export function LotTag({ id, code, kind, className = '' }: { id?: string; code: string; kind: string; className?: string }) {
  const tag = (
    <span className={`lot-tag text-sm ${className}`} data-stage={kind}>
      {code}
    </span>
  );
  return id ? (
    <Link href={`/lots/${id}`} className="transition-transform hover:-translate-y-px">
      {tag}
    </Link>
  ) : (
    tag
  );
}
