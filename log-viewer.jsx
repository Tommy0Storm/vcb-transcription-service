import React, { useState, useEffect } from 'react';
import { getUserAuditLogs, getCurrentUser } from './supabase-client.js';
import { downloadLogsJSON, downloadLogsCSV, downloadLogsTXT } from './log-downloader.js';

export default function LogViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const data = await getUserAuditLogs(user.id, 1000);
      setLogs(data || []);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    !filter || log.event_type.toLowerCase().includes(filter.toLowerCase()) ||
    log.event_data?.action?.toLowerCase().includes(filter.toLowerCase())
  );

  const handleDownload = async (format) => {
    try {
      if (format === 'json') await downloadLogsJSON();
      else if (format === 'csv') await downloadLogsCSV();
      else if (format === 'txt') await downloadLogsTXT();
    } catch (error) {
      alert('Download failed: ' + error.message);
    }
  };

  if (loading) return <div style={styles.loading}>Loading logs...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Activity Logs</h2>
        <div style={styles.actions}>
          <input
            type="text"
            placeholder="Filter logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={styles.input}
          />
          <button onClick={() => handleDownload('json')} style={styles.btn}>JSON</button>
          <button onClick={() => handleDownload('csv')} style={styles.btn}>CSV</button>
          <button onClick={() => handleDownload('txt')} style={styles.btn}>TXT</button>
        </div>
      </div>

      <div style={styles.logList}>
        {filteredLogs.length === 0 ? (
          <p style={styles.empty}>No logs found</p>
        ) : (
          filteredLogs.map(log => (
            <div key={log.id} style={styles.logItem}>
              <div style={styles.logHeader}>
                <span style={styles.eventType}>{log.event_type}</span>
                <span style={styles.timestamp}>{new Date(log.created_at).toLocaleString()}</span>
              </div>
              <div style={styles.logBody}>
                <strong>{log.event_data?.action}</strong>
                {log.event_data?.ip_address && (
                  <span style={styles.detail}> • IP: {log.event_data.ip_address}</span>
                )}
                {log.event_data?.file_name && (
                  <span style={styles.detail}> • File: {log.event_data.file_name}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '20px', maxWidth: '1000px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  actions: { display: 'flex', gap: '10px' },
  input: { padding: '8px', border: '1px solid #ddd', borderRadius: '4px', width: '200px' },
  btn: { padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  logList: { border: '1px solid #ddd', borderRadius: '8px', padding: '15px', maxHeight: '600px', overflowY: 'auto' },
  logItem: { padding: '12px', border: '1px solid #eee', borderRadius: '4px', marginBottom: '10px', background: '#f8f9fa' },
  logHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  eventType: { fontWeight: 'bold', color: '#007bff' },
  timestamp: { color: '#6c757d', fontSize: '14px' },
  logBody: { fontSize: '14px' },
  detail: { color: '#6c757d', fontSize: '13px' },
  empty: { textAlign: 'center', color: '#999', padding: '40px' },
  loading: { textAlign: 'center', padding: '40px', fontSize: '18px' }
};
