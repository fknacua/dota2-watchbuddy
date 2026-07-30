import type { StatRow } from "@/lib/types";

export default function StatsTable({
  title,
  iconUrl,
  description,
  rows,
}: {
  title?: string;
  iconUrl?: string;
  description?: string;
  rows: StatRow[];
}) {
  return (
    <div className="my-2">
      {title && (
        <div className="mb-1 flex items-center gap-2 font-semibold">
          {iconUrl && <img src={iconUrl} alt="" className="h-8 w-8 rounded object-contain" />}
          <span>{title}</span>
        </div>
      )}
      {description && <p className="mb-2 whitespace-pre-wrap">{description}</p>}
      {rows.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Stat</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td>{row.label}</td>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
