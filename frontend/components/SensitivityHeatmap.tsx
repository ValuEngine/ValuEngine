"use client";

interface Props {
  data: { index: string[]; columns: string[]; values: number[][] };
  currentPrice: number;
}

export function SensitivityHeatmap({ data, currentPrice }: Props) {
  const allValues = data.values.flat();
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);

  function cellColor(value: number): string {
    const ratio = (value - currentPrice) / currentPrice; // positive = undervalued
    if (ratio > 0.3)  return "rgba(0,212,170,0.45)";
    if (ratio > 0.15) return "rgba(0,212,170,0.25)";
    if (ratio > 0)    return "rgba(0,212,170,0.12)";
    if (ratio > -0.15) return "rgba(255,77,109,0.12)";
    if (ratio > -0.3)  return "rgba(255,77,109,0.25)";
    return "rgba(255,77,109,0.45)";
  }

  function textColor(value: number): string {
    return (value - currentPrice) / currentPrice > 0 ? "#00d4aa" : "#ff4d6d";
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-left text-[#4a6070] font-semibold">FCF \ WACC</th>
            {data.columns.map((col) => (
              <th key={col} className="p-2 text-center text-[#C9A84C] font-bold">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.values.map((row, ri) => (
            <tr key={ri}>
              <td className="p-2 text-[#C9A84C] font-bold">{data.index[ri]}</td>
              {row.map((val, ci) => (
                <td key={ci}
                  className="p-2 text-center font-bold rounded-lg"
                  style={{ background: cellColor(val), color: textColor(val) }}
                >
                  ${val.toFixed(0)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
