import React, { useState } from 'react';
import reportPreview from '../assets/report-preview.svg';

type DownloadState = 'idle' | 'loading' | 'success' | 'error';

export default function Reports() {
  const [status, setStatus] = useState<DownloadState>('idle');
  const [message, setMessage] = useState('');
  const reportMeta = [
    { label: 'Monthly Summary', size: '1.8 MB', updated: 'Today' },
    { label: 'Yearly Trends', size: '4.2 MB', updated: '2 days ago' },
    { label: 'All-time History', size: '6.5 MB', updated: 'This week' },
  ];

  const downloadReport = async (period: 'monthly' | 'yearly' | 'historical') => {
    setStatus('loading');
    setMessage('');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/reports/sample?period=${period}`);
      if (!response.ok) {
        throw new Error('Unable to download report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reprummble-${period}-report.csv`;
      link.click();
      window.URL.revokeObjectURL(url);

      setStatus('success');
      setMessage('Report downloaded successfully.');
    } catch (error: unknown) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Download failed.');
    }
  };

  return (
    <section className="section page-section" data-reveal>
      <div className="section-head">
        <h2>Reports for doctors and coaches</h2>
        <p>
          Download monthly, yearly, or historical reports with meals, workouts,
          health notes, and trends.
        </p>
      </div>

      <div className="report-highlights" data-stagger>
        <div className="report-highlight">
          <h4>Clinical-ready summaries</h4>
          <p>Clean charts, trend callouts, and adherence scoring.</p>
        </div>
        <div className="report-highlight">
          <h4>Multi-format exports</h4>
          <p>PDF for printouts, CSV for deeper analysis.</p>
        </div>
        <div className="report-highlight">
          <h4>Share in minutes</h4>
          <p>Generate a report link or download instantly.</p>
        </div>
      </div>

      <div className="tabs" data-reveal>
        <input type="radio" id="tab-monthly" name="report-tabs" defaultChecked />
        <input type="radio" id="tab-yearly" name="report-tabs" />
        <input type="radio" id="tab-historical" name="report-tabs" />
        <div className="tab-labels">
          <label htmlFor="tab-monthly">Monthly</label>
          <label htmlFor="tab-yearly">Yearly</label>
          <label htmlFor="tab-historical">Historical</label>
        </div>
        <div className="tab-panels">
          <div className="tab-panel panel-monthly">
          <h4>Monthly insight</h4>
          <p>See nutrition and training trends for the last 30 days.</p>
        </div>
        <div className="tab-panel panel-yearly">
          <h4>Yearly insight</h4>
          <p>Track long-term changes in weight, activity, and wellness.</p>
        </div>
        <div className="tab-panel panel-historical">
          <h4>Historical insight</h4>
          <p>All-time data for deep medical or coaching review.</p>
        </div>
      </div>
    </div>

    <div className="report-grid" data-stagger>
      <div className="report-card" data-reveal>
        <div className="report-header">
          <h4>Report Center</h4>
          <span className="pill">Ready</span>
        </div>
        <div className="report-list" data-stagger>
          {reportMeta.map((item) => (
            <div className="report-row" key={item.label}>
              <div className="report-row-meta">
                <span>{item.label}</span>
                <small>
                  {item.size} · Updated {item.updated}
                </small>
              </div>
              <button
                className="ghost-btn"
                onClick={() =>
                  downloadReport(
                    item.label.toLowerCase().includes('monthly')
                      ? 'monthly'
                      : item.label.toLowerCase().includes('yearly')
                        ? 'yearly'
                        : 'historical'
                  )
                }
              >
                Download
              </button>
            </div>
          ))}
        </div>
        <div className="report-meta">
          <span>Meal adherence</span>
          <span>Workout volume</span>
          <span>Recovery signals</span>
            <span>Health notes</span>
          </div>
          <div className="report-footer">
            PDF and CSV exports, ready for clinical review.
          </div>
          {message && (
            <div className={status === 'error' ? 'form-error' : 'form-success'}>
              {message}
            </div>
          )}
        </div>
        <div className="report-preview">
          <img src={reportPreview} alt="Report preview" />
        </div>
      </div>
    </section>
  );
}

