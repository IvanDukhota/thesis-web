import { useState, useEffect } from "react";
import { RiCloseLine } from "react-icons/ri";
import { createApplication } from "../../../../api/marketplace";
import { getAccessToken } from "../../../../shared/lib/token";
import type { OrderDetail } from "../../../../api/marketplace";
import "./apply-modal.css";

type ApplyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  order: OrderDetail;
  onApplied: () => void;
};

type TeamInfo = { id: string; name: string } | null;

export default function ApplyModal({ isOpen, onClose, order, onApplied }: ApplyModalProps) {
  const [message, setMessage] = useState("");
  const [proposedPrice, setProposedPrice] = useState("");
  const [proposedDays, setProposedDays] = useState("");
  const [applicationType, setApplicationType] = useState<"solo" | "team">("solo");
  const [team, setTeam] = useState<TeamInfo>(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setMessage("");
    setProposedPrice(order.price);
    setProposedDays(String(order.estimated_days));
    setApplicationType("solo");

    setTeamLoading(true);
    const token = getAccessToken();
    fetch("/api/teams/my/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setTeam({ id: data.id, name: data.name });
        } else {
          setTeam(null);
        }
      })
      .catch(() => setTeam(null))
      .finally(() => setTeamLoading(false));
  }, [isOpen, order]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(proposedPrice);
    const days = parseInt(proposedDays, 10);
    if (isNaN(price) || price <= 0) { alert("Enter a valid price"); return; }
    if (isNaN(days) || days <= 0) { alert("Enter a valid number of days"); return; }

    setIsSubmitting(true);
    try {
      await createApplication({
        order: order.id,
        message: message.trim() || undefined,
        proposed_price: price,
        proposed_days: days,
        team: applicationType === "team" && team ? team.id : undefined,
      });
      onApplied();
      onClose();
    } catch {
      alert("Failed to submit application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="apm-overlay" onClick={onClose}>
      <div className="apm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="apm-header">
          <span className="apm-title">Apply for Job</span>
          <button className="apm-close" onClick={onClose} disabled={isSubmitting}>
            <RiCloseLine size={18} />
          </button>
        </div>

        <form className="apm-body" onSubmit={handleSubmit}>
          <div className="apm-order-name">{order.title}</div>

          <div className="apm-type-row">
            <button
              type="button"
              className={`apm-type-btn ${applicationType === "solo" ? "apm-type-btn--active" : ""}`}
              onClick={() => setApplicationType("solo")}
              disabled={isSubmitting}
            >
              Solo
            </button>
            <button
              type="button"
              className={`apm-type-btn ${applicationType === "team" ? "apm-type-btn--active" : ""}`}
              onClick={() => !teamLoading && team && setApplicationType("team")}
              disabled={isSubmitting || teamLoading || !team}
              title={!team && !teamLoading ? "You are not in a team" : undefined}
            >
              Team
              {teamLoading && <span className="apm-type-loading" />}
            </button>
          </div>

          {applicationType === "team" && team && (
            <div className="apm-team-label">
              Applying as team: <strong>{team.name}</strong>
            </div>
          )}

          <div className="apm-row">
            <div className="apm-field">
              <label className="apm-label" htmlFor="apm-price">
                Your Price (USD) <span className="apm-required">*</span>
              </label>
              <input
                id="apm-price"
                type="number"
                className="apm-input"
                value={proposedPrice}
                onChange={(e) => setProposedPrice(e.target.value)}
                disabled={isSubmitting}
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="apm-field">
              <label className="apm-label" htmlFor="apm-days">
                Delivery Days <span className="apm-required">*</span>
              </label>
              <input
                id="apm-days"
                type="number"
                className="apm-input"
                value={proposedDays}
                onChange={(e) => setProposedDays(e.target.value)}
                disabled={isSubmitting}
                min="1"
                step="1"
                required
              />
            </div>
          </div>

          <div className="apm-field">
            <label className="apm-label" htmlFor="apm-message">
              Cover Letter
            </label>
            <textarea
              id="apm-message"
              className="apm-textarea"
              placeholder="Describe your experience and why you're a good fit…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSubmitting}
              rows={4}
            />
          </div>
        </form>

        <div className="apm-footer">
          <button
            type="button"
            className="apm-btn apm-btn--cancel"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="apm-btn apm-btn--apply"
            disabled={isSubmitting || !proposedPrice || !proposedDays}
            onClick={handleSubmit}
          >
            {isSubmitting ? "Submitting…" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
