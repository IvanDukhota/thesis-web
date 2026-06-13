import { RiBarChartBoxLine } from 'react-icons/ri';
import './TeamStats.css';

export function TeamStats() {
    return (
        <div className="ts-root">
            <div className="ts-header">
                <span className="ts-title">Statistics</span>
            </div>
            <div className="ts-body">
                <div className="ts-empty">
                    <RiBarChartBoxLine size={28} className="ts-empty-icon" />
                    <p className="ts-empty-text">No data yet</p>
                    <p className="ts-empty-sub">Statistics will appear once the team starts working on projects</p>
                </div>
            </div>
        </div>
    );
}
