import { Plus } from 'lucide-react';

export default function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="rr-faq">
      {items.map((item) => (
        <details key={item.q}>
          <summary>
            {item.q}
            <Plus size={18} />
          </summary>
          <p>{item.a}</p>
        </details>
      ))}
    </div>
  );
}
