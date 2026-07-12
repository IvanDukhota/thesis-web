import ChatsPage from './ChatsPage';
import Header from '../../components/layout/Header/Header';

export default function ChatPage() {
    return (
        <>
            <Header />
            <div style={{ height: '100vh', padding: '116px 32px 16px', boxSizing: 'border-box', position: 'relative', zIndex: 1 }}>
                <ChatsPage />
            </div>
        </>
    );
}
