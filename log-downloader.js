// Log File Downloader from Supabase
import { getUserAuditLogs, getCurrentUser } from './supabase-client.js';

// Download audit logs as JSON
export async function downloadLogsJSON() {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const logs = await getUserAuditLogs(user.id, 1000);
  
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vcb-logs-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Download audit logs as CSV
export async function downloadLogsCSV() {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const logs = await getUserAuditLogs(user.id, 1000);
  
  const csv = [
    'Timestamp,Event Type,Action,Details',
    ...logs.map(log => {
      const timestamp = new Date(log.created_at).toLocaleString();
      const eventType = log.event_type;
      const action = log.event_data?.action || '';
      const details = JSON.stringify(log.event_data).replace(/"/g, '""');
      return `"${timestamp}","${eventType}","${action}","${details}"`;
    })
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vcb-logs-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Download audit logs as TXT
export async function downloadLogsTXT() {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  const logs = await getUserAuditLogs(user.id, 1000);
  
  const txt = logs.map(log => {
    const timestamp = new Date(log.created_at).toLocaleString();
    const eventType = log.event_type;
    const action = log.event_data?.action || '';
    return `[${timestamp}] ${eventType}: ${action}`;
  }).join('\n');

  const blob = new Blob([txt], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vcb-logs-${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
