import { useEffect, useState } from 'react';
import { api } from '../api';
import Icon from '../components/Icon';
import { Toast } from '../components/ui';

export default function Settings() {
  const [name, setName] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => { api('/api/home').then((h) => setName(h.profile.name || '')).catch(() => {}); }, []);
  return (
    <div style={{ maxWidth: 720 }}>
      <div className="page-head"><div><h1>Settings</h1><p>Your progress is stored only on this computer, in the app's data folder.</p></div></div>
      <div className="card">
        <h3>Your name</h3>
        <div className="row"><input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ maxWidth: 280 }} /><button className="btn primary" onClick={async () => { await api('/api/profile', { name }); setToast('Saved'); }}>Save</button></div>
      </div>
      <div className="card">
        <h3>Back up your progress</h3>
        <p className="muted small">Downloads one small file with all your answers, scores and mistakes. Keep it somewhere safe (e.g. OneDrive).</p>
        <a className="btn" href="/api/backup"><Icon name="download" size={15} />Download backup</a>
      </div>
      <div className="card">
        <h3>How your progress is measured</h3>
        <ul className="small muted" style={{ paddingLeft: 18 }}>
          <li><b>Mastery stage</b> (Introduced → Learning → Practicing → Competent → Independent → Strong) says what you can actually do. It comes from the kinds of work you have shown, and it is the only word the app uses for how good you are at something.</li>
          <li><b>Curriculum</b> (Beginner, Intermediate, Advanced) is where you are on the learning path, not how good you are.</li>
          <li><b>Covered (%)</b> is how much of a topic your recent graded work covers. Practice tasks and challenges count more than quiz questions; quiz answers alone can't take a topic past 60%, and it can't pass 85% without a solved challenge, project step or exam.</li>
          <li>Hints reduce the credit a little; showing the full answer means that attempt doesn't count.</li>
          <li>Topics you've learned come back after 1, 3, 7, 14 and 30 days. A wrong review sends them back to the start.</li>
        </ul>
      </div>
      <div className="card" style={{ borderColor: '#f5c2c2' }}>
        <h3>Start over</h3>
        <p className="muted small">Deletes all your progress, mistakes and scores (the lessons and data stay). Type RESET to confirm.</p>
        <div className="row"><input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="RESET" style={{ maxWidth: 160 }} />
          <button className="btn danger" disabled={confirmText !== 'RESET'} onClick={async () => { await api('/api/reset', { confirm: 'RESET' }); window.location.hash = '#/'; window.location.reload(); }}>Reset my progress</button></div>
      </div>
      {toast && <Toast text={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
