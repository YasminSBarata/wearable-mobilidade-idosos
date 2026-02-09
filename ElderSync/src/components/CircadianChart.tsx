import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Clock } from "lucide-react";

interface CircadianChartProps {
  data: number[];
}

export function CircadianChart({ data }: CircadianChartProps) {
  const chartData = data.map((value, index) => ({
    hour: `${index.toString().padStart(2, "0")}h`,
    activity: value,
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5" />
        Padrão Circadiano de Atividade
      </h3>
      <p className="text-sm text-gray-600 mb-2">
        Nível de atividade por hora do dia
      </p>
      <p className="text-xs text-gray-500 mb-6">
        Soma de movimento (magnitude aceleração) por janela de 1h
      </p>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="hour" tick={{ fontSize: 12 }} interval={1} />
          <YAxis
            tick={{ fontSize: 12 }}
            label={{ value: "Atividade", angle: -90, position: "insideLeft" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "8px",
            }}
          />
          <Bar dataKey="activity" fill="#29D68B" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-gray-600">Período Matutino</p>
          <p className="text-lg font-bold text-amber-600">
            {data
              .slice(6, 12)
              .reduce((a, b) => a + b, 0)
              .toFixed(0)}
          </p>
          <p className="text-xs text-gray-400">06h - 12h</p>
        </div>
        <div className="p-3 bg-[#29D68B]/10 rounded-lg border border-[#29D68B]/30">
          <p className="text-xs text-gray-600">Período Vespertino</p>
          <p className="text-lg font-bold text-[#29D68B]">
            {data
              .slice(12, 18)
              .reduce((a, b) => a + b, 0)
              .toFixed(0)}
          </p>
          <p className="text-xs text-gray-400">12h - 18h</p>
        </div>
        <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600">Período Noturno</p>
          <p className="text-lg font-bold text-gray-600">
            {data
              .slice(18, 24)
              .reduce((a, b) => a + b, 0)
              .toFixed(0)}
          </p>
          <p className="text-xs text-gray-400">18h - 24h</p>
        </div>
      </div>
    </div>
  );
}
