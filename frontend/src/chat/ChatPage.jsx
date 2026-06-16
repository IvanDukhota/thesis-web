import ChatsPage from './pages/ChatsPage/ChatsPage';
import Header from '../components/layout/Header/Header';

export default function ChatPage() {
    return (
        <>
            <Header />
            <div style={{ height: '100vh', padding: '100px 32px 24px', boxSizing: 'border-box', position: 'relative', zIndex: 1 }}>
                <ChatsPage />
            </div>
        </>
    );
}
