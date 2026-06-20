import { useState } from "react";
import { RiArrowDownSLine, RiArrowUpSLine, RiCheckLine, RiFolderLine, RiGroupLine, RiTaskLine } from "react-icons/ri";
import { acceptApplication, rejectApplication, getApplicantStats, getPublicTeamStats, type OrderApplication, type ApplicantStats, type PublicTeamStats } from "../../../../api/marketplace";
import "./application-card.css";

type Props = {
  app: OrderApplication;
  variant: "received" | "sent";
  onApprove?: (id: string) => void;
  onDiscard?: (id: string) => void;
};

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`appc-status appc-status--${status}`}>{status}</span>;
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="appc-stat-box">
      <span className="appc-stat-box-value">{value}</span>
      <span className="appc-stat-box-label">{label}</span>
    </div>
  );
}

function ProjectList({ projects, type }: { projects: { id: string; name: string; type?: string }[]; type: "user" | "team" }) {
  if (projects.length === 0) return <span className="appc-empty-note">No projects yet</span>;
  return (
    <div className="appc-project-list">
      {projects.map((p) => (
        <div key={p.id} className="appc-project-item">
          <RiFolderLine size={12} />
          <span>{p.name}</span>
          {type === "user" && p.type && (
            <span className="appc-project-type">{p.type}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ApplicationCard({ app, variant, onApprove, onDiscard }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [soloStats, setSoloStats] = useState<ApplicantStats | null>(null);
  const [teamStats, setTeamStats] = useState<PublicTeamStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<"approve" | "discard" | null>(null);

  const toggle = async () => {
    if (!expanded && variant === "received" && soloStats === null && teamStats === null) {
      setStatsLoading(true);
      try {
        if (app.team) {
          const ts = await getPublicTeamStats(app.team);
          setTeamStats(ts);
        } else {
          const us = await getApplicantStats(app.applicant.id);
          setSoloStats(us);
        }
      } catch {
        // silently ignore
      } finally {
        setStatsLoading(false);
      }
    }
    setExpanded((v) => !v);
  };

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading("approve");
    try {
      await acceptApplication(app.id);
      onApprove?.(app.id);
    } catch {
      // silently ignore
    } finally {
      setActionLoading(null);
    }
  };

  const handleDiscard = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading("discard");
    try {
      await rejectApplication(app.id);
      onDiscard?.(app.id);
    } catch {
      // silently ignore
    } finally {
      setActionLoading(null);
    }
  };

  const isTeam = !!app.team;
  const avatarLetter = isTeam ? "T" : (app.applicant.full_name?.charAt(0) || app.applicant.nickname?.charAt(0) || "?").toUpperCase();
  const showActions = variant === "received" && app.status === "pending";

  return (
    <div className={`appc-card ${expanded ? "appc-card--expanded" : ""}`}>
      <div className="appc-header" onClick={toggle}>
        <div className="appc-left">
          <div className={`appc-avatar ${isTeam ? "appc-avatar--team" : ""}`}>
            {avatarLetter}
          </div>
          <div className="appc-info">
            <div className="appc-name">
              {isTeam ? (
                <>
                  <span className="appc-team-badge">Team</span>
                  <span>{app.applicant.full_name || app.applicant.nickname}</span>
                </>
              ) : (
                <span>{app.applicant.full_name || app.applicant.nickname}</span>
              )}
            </div>
            {app.order_title && (
              <span className="appc-order-ref">{app.order_title}</span>
            )}
            <div className="appc-meta">
              {app.proposed_price && <span>${app.proposed_price}</span>}
              {app.proposed_price && app.proposed_days && <span className="appc-dot">·</span>}
              {app.proposed_days && <span>{app.proposed_days}d</span>}
              <span className="appc-dot">·</span>
              <span>{timeAgo(app.created_at)}</span>
            </div>
          </div>
        </div>
        <div className="appc-right">
          <StatusBadge status={app.status} />
          {showActions && (
            <div className="appc-actions-row" onClick={(e) => e.stopPropagation()}>
              <button
                className="appc-btn appc-btn--approve"
                disabled={!!actionLoading}
                onClick={handleApprove}
              >
                {actionLoading === "approve" ? "…" : "Approve"}
              </button>
              <button
                className="appc-btn appc-btn--discard"
                disabled={!!actionLoading}
                onClick={handleDiscard}
              >
                {actionLoading === "discard" ? "…" : "Discard"}
              </button>
            </div>
          )}
          <span className="appc-chevron">
            {expanded ? <RiArrowUpSLine size={18} /> : <RiArrowDownSLine size={18} />}
          </span>
        </div>
      </div>

      <div className={`appc-detail ${expanded ? "appc-detail--open" : ""}`}>
        <div className="appc-detail-inner">
          <div className="appc-detail-content">
            {statsLoading && (
              <div className="appc-loading">Loading…</div>
            )}

            {variant === "received" && !statsLoading && soloStats && (
              <div className="appc-stats-section">
                <div className="appc-section-title">
                  <RiTaskLine size={13} /> Applicant Stats
                </div>
                <div className="appc-stat-row">
                  <StatBox label="Projects" value={soloStats.projects_count} />
                  <StatBox label="Tasks" value={soloStats.tasks.total} />
                  <StatBox label="Done" value={soloStats.tasks.finished} />
                  <StatBox label="Active" value={soloStats.tasks.in_progress} />
                </div>
                <div className="appc-section-title" style={{ marginTop: 14 }}>
                  <RiFolderLine size={13} /> Recent Projects
                </div>
                <ProjectList projects={soloStats.recent_projects} type="user" />
              </div>
            )}

            {variant === "received" && !statsLoading && teamStats && (
              <div className="appc-stats-section">
                <div className="appc-team-header-row">
                  <span className="appc-team-name">{teamStats.team_name}</span>
                  {teamStats.team_description && (
                    <span className="appc-team-desc">{teamStats.team_description}</span>
                  )}
                </div>
                <div className="appc-stat-row">
                  <StatBox label="Projects" value={teamStats.projects_count} />
                  <StatBox label="Members" value={teamStats.members_count} />
                  <StatBox label="Tasks" value={teamStats.tasks.total} />
                  <StatBox label="Done" value={teamStats.tasks.finished} />
                </div>

                {teamStats.members.length > 0 && (
                  <>
                    <div className="appc-section-title" style={{ marginTop: 14 }}>
                      <RiGroupLine size={13} /> Members
                    </div>
                    <div className="appc-members-list">
                      {teamStats.members.map((m) => (
                        <div key={m.username} className="appc-member-row">
                          <div className="appc-member-avatar">{m.username[0].toUpperCase()}</div>
                          <span className="appc-member-name">{m.username}</span>
                          <span className="appc-member-done">
                            <RiCheckLine size={10} /> {m.tasks_completed}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {teamStats.recent_projects.length > 0 && (
                  <>
                    <div className="appc-section-title" style={{ marginTop: 14 }}>
                      <RiFolderLine size={13} /> Recent Projects
                    </div>
                    <ProjectList projects={teamStats.recent_projects} type="team" />
                  </>
                )}
              </div>
            )}

            {app.message && (
              <div className="appc-message-section">
                <div className="appc-section-title">Cover Letter</div>
                <p className="appc-message-text">{app.message}</p>
              </div>
            )}

            {variant === "sent" && !app.message && (
              <div className="appc-message-section">
                <span className="appc-empty-note">No cover letter provided</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
