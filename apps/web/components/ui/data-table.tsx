export type DataColumn<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

export function DataTable<T>({
  rows,
  columns,
  getRowKey,
}: {
  rows: T[];
  columns: Array<DataColumn<T>>;
  getRowKey: (row: T) => string;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-md border border-slate-200">
      <div className="min-w-0 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column.header} scope="col" className="whitespace-nowrap px-4 py-3">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {rows.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((column) => (
                  <td key={column.header} className={column.className ?? "whitespace-nowrap px-4 py-3"}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
