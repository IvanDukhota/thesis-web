import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getOrder, deleteOrder, type OrderDetail } from "../../api/marketplace";
import { apiAddContact } from "../../api/contactsApi";
import Header from "../../components/layout/Header/Header";
import ImageModal from "../../components/features/chat/ImageModal/ImageModal";
import EditOrderModal from "../../components/features/marketplace/EditOrderModal/EditOrderModal";
import ApplyModal from "../../components/features/marketplace/ApplyModal/ApplyModal";
import ConfirmModal from "../../components/shared/ui/ConfirmModal/ConfirmModal";
import "./order-detail.css";

export default function OrderDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImageId, setLightboxImageId] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [isContacting, setIsContacting] = useState(false);

  useEffect(() => {
    const loadOrder = async () => {
      if (!slug) return;
      try {
        const data = await getOrder(slug);
        setOrder(data);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        setLoadError(msg);
        console.error("Failed to load order:", error);
      } finally {
        setLoading(false);
      }
    };
    void loadOrder();
  }, [slug]);

  if (loading) {
    return (
      <div className="order-detail-page">
        <Header />
        <div className="order-detail-loading">Loading...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-detail-page">
        <Header />
        <div className="order-detail-error">
          {loadError ? `Error: ${loadError}` : "Order not found"}
        </div>
      </div>
    );
  }

  const attachments = order.attachments ?? [];
  const images = attachments.filter((att) => att.file_type === "image");
  const videos = attachments.filter((att) => att.file_type === "video");
  const files = attachments.filter((att) => att.file_type === "file");

  const lightboxImages = images.map((img) => ({
    url: img.url || "",
    name: img.filename || "",
    id: img.id,
  }));

  const handleOpenLightbox = (id: string) => {
    setLightboxImageId(id);
    setLightboxOpen(true);
  };

  const handleLightboxNavigate = (direction: "prev" | "next") => {
    const idx = lightboxImages.findIndex((img) => img.id === lightboxImageId);
    if (direction === "prev" && idx > 0) setLightboxImageId(lightboxImages[idx - 1].id);
    if (direction === "next" && idx < lightboxImages.length - 1) setLightboxImageId(lightboxImages[idx + 1].id);
  };

  const lightboxCurrent = lightboxImages.find((img) => img.id === lightboxImageId);

  const handleContactClient = async () => {
    if (!order?.buyer) return;
    setIsContacting(true);
    await apiAddContact(order.buyer.id);
    navigate('/chat');
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await deleteOrder(order.slug);
      navigate("/marketplace");
    } catch {
      alert("Failed to delete order. Please try again.");
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="order-detail-page">
      <Header />

      <EditOrderModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        order={order}
        onSaved={(updated) => { setOrder(updated); setIsEditOpen(false); }}
      />

      <ApplyModal
        isOpen={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
        order={order}
        onApplied={() => setOrder({ ...order, has_applied: true })}
      />

      <ConfirmModal
        isOpen={isDeleteOpen}
        title="Delete Order"
        message="Are you sure you want to delete this order? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteOpen(false)}
      />

      <ImageModal
        isOpen={lightboxOpen}
        imageUrl={lightboxCurrent?.url || ""}
        imageName={lightboxCurrent?.name || ""}
        allImages={lightboxImages}
        currentImageId={lightboxImageId}
        onClose={() => setLightboxOpen(false)}
        onNavigate={handleLightboxNavigate}
      />

      <div className="order-detail-container">
        <button className="order-detail-back" onClick={() => navigate("/marketplace")}>
          ← Back to Marketplace
        </button>

        <div className="order-detail-content">

          {/* ── Main ── */}
          <div className="order-detail-main">
            <div className="order-detail-main-body">
              <h1 className="order-detail-title">{order.title}</h1>

              <div className="order-detail-meta">
                <div className="order-detail-buyer">
                  <div className="order-detail-buyer-avatar">
                    {order.buyer?.full_name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="order-detail-buyer-info">
                    <span className="order-detail-buyer-name">
                      {order.buyer?.full_name || "Unknown"}
                    </span>
                    <span className="order-detail-buyer-label">Client</span>
                  </div>
                </div>
                <div className="order-detail-date">
                  Posted on {formatDate(order.created_at)}
                </div>
              </div>

              {order.tags && order.tags.length > 0 && (
                <div className="order-detail-tags">
                  {order.tags.map((tag) => (
                    <span key={tag.id} className="order-detail-tag">
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="order-detail-description">
                <div className="order-detail-section-label">Description</div>
                <p>{order.description}</p>
              </div>
            </div>

            {images.length > 0 && (
              <div className="order-detail-images">
                <div className="order-detail-section-label">
                  Images ({images.length})
                </div>
                <div className="order-detail-gallery">
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className="order-detail-gallery-item"
                      onClick={() => handleOpenLightbox(img.id)}
                    >
                      <img src={img.url} alt={img.filename} />
                      <div className="order-detail-gallery-expand">⤢</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {videos.length > 0 && (
              <div className="order-detail-videos">
                <div className="order-detail-section-label">
                  Videos ({videos.length})
                </div>
                {videos.map((video) => (
                  <div key={video.id} className="order-detail-video">
                    <video controls>
                      <source src={video.url} />
                      Your browser does not support the video tag.
                    </video>
                    <a
                      href={video.url}
                      download={video.filename}
                      className="order-detail-download-btn"
                    >
                      ↓ {video.filename}
                    </a>
                  </div>
                ))}
              </div>
            )}

            {files.length > 0 && (
              <div className="order-detail-files">
                <div className="order-detail-section-label">
                  Files ({files.length})
                </div>
                <div className="order-detail-files-list">
                  {files.map((file) => (
                    <div key={file.id} className="order-detail-file-item">
                      <span className="order-detail-file-name">{file.filename}</span>
                      <a
                        href={file.url}
                        download={file.filename}
                        className="order-detail-file-download"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="order-detail-sidebar">
            <div className="order-detail-card">
              <div className="order-detail-stat">
                <span className="order-detail-stat-label">Budget</span>
                <span className="order-detail-stat-value">${order.price}</span>
              </div>
              <div className="order-detail-stat">
                <span className="order-detail-stat-label">Delivery</span>
                <span className="order-detail-stat-value">{order.estimated_days} days</span>
              </div>
              <div className="order-detail-stat">
                <span className="order-detail-stat-label">Applications</span>
                <span className="order-detail-stat-value">{order.applications_count}</span>
              </div>
              <div className="order-detail-stat">
                <span className="order-detail-stat-label">Views</span>
                <span className="order-detail-stat-value">{order.views_count}</span>
              </div>
              <div className="order-detail-stat">
                <span className="order-detail-stat-label">Status</span>
                <span className="order-detail-stat-value order-detail-stat-value--status">
                  {order.status}
                </span>
              </div>
            </div>

            {order.category && (
              <div className="order-detail-category">
                <h3>Category</h3>
                <p>{order.category.name}</p>
              </div>
            )}

            {order.is_owner ? (
              <div className="order-detail-actions">
                <button
                  className="order-detail-btn order-detail-btn--primary"
                  onClick={() => setIsEditOpen(true)}
                >
                  Edit
                </button>
                <button
                  className="order-detail-btn order-detail-btn--danger"
                  onClick={() => setIsDeleteOpen(true)}
                >
                  Delete
                </button>
              </div>
            ) : (
              <div className="order-detail-actions">
                <button
                  className="order-detail-btn order-detail-btn--primary"
                  onClick={() => !order.has_applied && setIsApplyOpen(true)}
                  disabled={order.has_applied || order.status !== "open"}
                  style={order.has_applied ? { opacity: 0.6, cursor: "default" } : undefined}
                >
                  {order.has_applied ? "Applied" : "Apply Now"}
                </button>
                <button
                  className="order-detail-btn order-detail-btn--secondary"
                  onClick={handleContactClient}
                  disabled={isContacting}
                >
                  {isContacting ? "Opening…" : "Contact Client"}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
