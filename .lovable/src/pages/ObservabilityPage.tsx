import React, { useState, useEffect, useRef } from 'react';
import { Activity, Terminal, Shield, RefreshCw, AlertCircle, Info, Zap, Settings, Search, X } from 'lucide-react';

export const ObservabilityPage = () => {
  const [metrics, setMetrics] = useState({ activeAgents: 0, pipelineRuns: 0, errors24h: 0, avgLatency: 0 });
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [logs, setLogs] = useState<{id: number; level: string; message: string; timestamp: string}[]>();
  const [autoScroll, setAutoScroll] = useState(true);
  const [logFilter, setLogFilter] = useState('ALL');
  const [agents, setAgents] = useState<{id: number; name: string; status: string; lastPing: string; requests: number}[]>();
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Mock Data Fetching
    const fetchData = async () => {
      setLoadingMetrics(true);
      setTimeout(() => {
        setMetrics({ activeAgents: 12, pipelineRuns: 432, errors24h: 3, avgLatency: 142 });
        setLoadingMetrics(false);
        setAgents([
          { id: 1, name: 'Search-Agent-01', status: 'online', lastPing: '2s ago', requests: 1204 },
          { id: 2, name: 'Query-Parser-v4', status: 'warning', lastPing: '45s ago', requests: 843 },
          { id: 3, name: 'Analytics-Worker', status: 'online', lastPing: '5s ago', requests: 5672 },
        ]);
      }, 800);
    };

    fetchData();

    // SSE Simulation
    const interval = setInterval(() => {
      const levels = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
      const newLog = { 
        id: Date.now(), 
        level: levels[Math.floor(Math.random() * levels.length)], 
        message: `Agent node processing request at ${new Date().toLocaleTimeString()}`,
        timestamp: new Date().toLocaleTimeString() 
      };
      setLogs(prev => [...prev.slice(-99), newLog]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const filteredLogs = logFilter === 'ALL' ? logs : logs.filter((l) => l.level === logFilter);

  const getLogColor = (level: string) => ({
    ERROR: 'text-red-400',
    WARN: 'text-yellow-400',
    INFO: 'text-green-400',
    DEBUG: 'text-zinc-500'
  }[level] || 'text-zinc-300');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-indigo-500" />
          <h1 className="text-2xl font-bold tracking-tight">Observability</h1>
        </div>
      </header>

      {/* Metrics Row */}
      <section className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Agents', val: metrics.activeAgents },
          { label: 'Pipeline Runs (24h)', val: metrics.pipelineRuns },
          { label: 'Errors (24h)', val: metrics.errors24h, color: 'text-red-400' },
          { label: 'Avg Latency', val: `${metrics.avgLatency}ms` }
        ].map((m, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
            <p className="text-zinc-500 text-sm mb-1">{m.label}</p>
            {loadingMetrics ? <div className="h-8 w-16 bg-zinc-800 animate-pulse rounded" /> : 
            <p className={`text-3xl font-mono font-semibold ${m.color || ''}`}>{m.val}</p>}
          </div>
        ))}
      </section>

      <div className="grid grid-cols-3 gap-8">
        {/* Logs Viewer */}
        <div className="col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-zinc-400" />
              <span className="font-medium text-sm">System Logs</span>
            </div>
            <div className="flex gap-2">
              <select onChange={(e) => setLogFilter(e.target.value)} className="bg-zinc-800 text-xs px-2 py-1 rounded border border-zinc-700">
                <option value="ALL">All Levels</option>
                <option value="INFO">Info</option>
                <option value="WARN">Warn</option>
                <option value="ERROR">Error</option>
              </select>
              <button onClick={() => setAutoScroll(!autoScroll)} className={`text-xs px-2 py-1 rounded ${autoScroll ? 'bg-indigo-600' : 'bg-zinc-800'}`}>Auto-scroll</button>
              <button onClick={() => setLogs([])} className="text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded">Clear</button>
            </div>
          </div>
          <div ref={logContainerRef} className="p-4 font-mono text-xs overflow-y-auto flex-1 space-y-1">
            {filteredLogs.map(log => (
              <div key={log.id} className="flex gap-3 border-b border-zinc-900/50 pb-1">
                <span className="text-zinc-600">{log.timestamp}</span>
                <span className={`w-12 font-bold ${getLogColor(log.level)}`}>{log.level}</span>
                <span className="text-zinc-300">{log.message}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Health Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 font-medium text-sm">Agent Health</div>
          <table className="w-full text-sm">
            <thead className="text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="text-left p-3">Agent</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Requests</th>
              </tr>
            </thead>
            <tbody>
              {agents.map(a => (
                <tr key={a.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="p-3 font-medium">{a.name}</td>
                  <td className="p-3 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${a.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    {a.status}
                  </td>
                  <td className="p-3 text-right font-mono">{a.requests.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};