import type { AbilityEntry } from "@/lib/types";

export default function AbilityList({ title, entries }: { title?: string; entries: AbilityEntry[] }) {
  return (
    <div className="my-2 flex flex-col gap-3">
      {title && <div className="font-semibold">{title}</div>}
      {entries.map((entry, i) => (
        <div key={i}>
          <div className="mb-1 flex items-center gap-2 font-semibold">
            {entry.iconUrl && <img src={entry.iconUrl} alt="" className="h-8 w-8 rounded object-contain" />}
            <span>{entry.name}</span>
          </div>
          {entry.description && <p className="mb-2 whitespace-pre-wrap">{entry.description}</p>}
          {entry.stats.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Stat</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {entry.stats.map((stat, j) => (
                  <tr key={j}>
                    <td>{stat.label}</td>
                    <td>{stat.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}
