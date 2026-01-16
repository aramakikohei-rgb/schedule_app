import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { CreateEventPage } from './components/CreateEventPage';
import { EventPage } from './components/EventPage';
import { ResponsePage } from './components/ResponsePage';
import { useApp } from './context/AppContext';

function AppContent() {
  const { currentView } = useApp();

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return <HomePage />;
      case 'create':
        return <CreateEventPage />;
      case 'event':
        return <EventPage />;
      case 'respond':
        return <ResponsePage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main>{renderContent()}</main>
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
