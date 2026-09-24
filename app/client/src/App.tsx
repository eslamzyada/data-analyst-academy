import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { api } from './api';
import Icon from './components/Icon';
import { Loading } from './components/ui';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Learn, { SkillPath } from './pages/Learn';
import Topic from './pages/Topic';
import Practice, { TaskPage, DatasetPage } from './pages/Practice';
import SqlLab from './pages/SqlLab';
import Projects, { ProjectPage } from './pages/Projects';
import Quizzes, { TopicQuiz, ReviewQuiz, QuizSessionPage, Flashcards, ExamPage } from './pages/Quizzes';
import Progress from './pages/Progress';
import Today from './pages/Today';
import Quick from './pages/Quick';
import Settings from './pages/Settings';
import Analyst, { AnalystTask } from './pages/Analyst';
import { SaveProvider, SaveIndicator } from './saved';

const NAV = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/learn', label: 'Learn', icon: 'learn' },
  { to: '/practice', label: 'Practice', icon: 'practice' },
  { to: '/sql', label: 'SQL Lab', icon: 'sql' },
  { to: '/projects', label: 'Projects', icon: 'projects' },
  { to: '/analyst', label: 'Real Analyst', icon: 'briefcase' },
  { to: '/quizzes', label: 'Quizzes', icon: 'quiz' },
  { to: '/progress', label: 'Progress', icon: 'progress' },
];

export default function App() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const loc = useLocation();
  useEffect(() => { api('/api/home').then((h) => setOnboarded(h.profile.onboarded)).catch(() => setOnboarded(true)); }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);

  if (onboarded === null) return <div className="main"><Loading /></div>;
  if (!onboarded) return <SaveProvider><Onboarding onDone={() => setOnboarded(true)} /></SaveProvider>;

  return (
    <SaveProvider>
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><Icon name="progress" size={17} stroke={2.4} /></span>
          <span>Data Analyst Academy<small>Your personal training</small></span>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon name={n.icon} size={18} />{n.label}
            </NavLink>
          ))}
        </nav>
        <div className="spacer" />
        <nav className="nav"><NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}><Icon name="settings" size={18} />Settings</NavLink></nav>
        <div className="mini">Works offline · progress saved on this computer</div>
      </aside>
      <main className="main">
        <div className="savebar"><SaveIndicator /></div>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/today" element={<Today />} />
          <Route path="/quick" element={<Quick />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/learn/:skill" element={<SkillPath />} />
          <Route path="/topic/:id" element={<Topic />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/task/:id" element={<TaskPage />} />
          <Route path="/data/:id" element={<DatasetPage />} />
          <Route path="/sql" element={<SqlLab />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectPage />} />
          <Route path="/analyst" element={<Analyst />} />
          <Route path="/analyst/:id" element={<AnalystTask />} />
          <Route path="/quizzes" element={<Quizzes />} />
          <Route path="/quiz/topic/:id" element={<TopicQuiz />} />
          <Route path="/quiz/review" element={<ReviewQuiz />} />
          <Route path="/quiz/session/:id" element={<QuizSessionPage />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/exam/:id" element={<ExamPage />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
    </div>
    </SaveProvider>
  );
}
