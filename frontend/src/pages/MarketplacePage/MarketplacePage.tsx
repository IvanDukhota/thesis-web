import { useEffect, useState } from "react";
import { getOrders, getTags, type OrderListItem, type Tag, type OrderFilters } from "../../api/marketplace";
import Header from "../../components/layout/Header/Header";
import TagSelectionModal from "./TagSelectionModal";
import FiltersDrawer from "./FiltersDrawer";
import CreateProjectModal from "./CreateProjectModal";
import "./marketplace.css";

const PAGE_SIZE = 20;

export default function MarketplacePage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [filters, setFilters] = useState<OrderFilters>({
    search: "",
    category: "",
    tags: [],
    min_price: undefined,
    max_price: undefined,
    sort: "-created_at",
  });

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [ordersData, tagsData] = await Promise.all([
          getOrders(),
          getTags(100),
        ]);
        setOrders(ordersData);
        setTags(tagsData);
      } finally {
        setLoading(false);
      }
    };
    void loadInitialData();
  }, []);

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      try {
        const ordersData = await getOrders({
          ...filters,
          search: searchQuery,
          tags: selectedTags.map((tag) => tag.slug),
        });
        setOrders(ordersData);
      } finally {
        setLoading(false);
      }
    };
    void loadOrders();
  }, [filters, searchQuery, selectedTags]);

  const handleRemoveTag = (tagToRemove: Tag) => {
    setSelectedTags((prev) => prev.filter((tag) => tag.id !== tagToRemove.id));
  };

  const handleFiltersChange = (newFilters: Partial<OrderFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const totalPages = Math.ceil(orders.length / PAGE_SIZE);
  const paginatedOrders = orders.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="marketplace-pagination">
        <button
          className="marketplace-pagination__button"
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
        >
          ‹
        </button>

        {startPage > 1 && (
          <>
            <button
              className="marketplace-pagination__button"
              onClick={() => setCurrentPage(1)}
            >
              1
            </button>
            {startPage > 2 && <span className="marketplace-pagination__ellipsis">…</span>}
          </>
        )}

        {pages.map((page) => (
          <button
            key={page}
            className={
              currentPage === page
                ? "marketplace-pagination__button marketplace-pagination__button--active"
                : "marketplace-pagination__button"
            }
            onClick={() => setCurrentPage(page)}
          >
            {page}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="marketplace-pagination__ellipsis">…</span>}
            <button
              className="marketplace-pagination__button"
              onClick={() => setCurrentPage(totalPages)}
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          className="marketplace-pagination__button"
          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
        >
          ›
        </button>
      </div>
    );
  };

  return (
    <div className="marketplace-page">
      <Header />

      <TagSelectionModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        allTags={tags}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
      />

      <FiltersDrawer
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(newOrder) => {
          const listItem: OrderListItem = {
            id: newOrder.id,
            slug: newOrder.slug,
            title: newOrder.title,
            price: newOrder.price,
            estimated_days: newOrder.estimated_days,
            status: newOrder.status,
            applications_count: newOrder.applications_count,
            views_count: newOrder.views_count,
            buyer: newOrder.buyer,
            category_name: newOrder.category.name,
            tags: newOrder.tags,
            created_at: newOrder.created_at,
          };
          setOrders((prev) => [listItem, ...prev]);
          setIsCreateModalOpen(false);
        }}
      />

      <div className="marketplace-container">
        <div className="marketplace-header">
          <div className="marketplace-search-row">
            <input
              type="text"
              className="marketplace-search"
              placeholder="Search jobs, technologies, skills…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              className="marketplace-create-button"
              onClick={() => setIsCreateModalOpen(true)}
            >
              + Post Job
            </button>
          </div>

          <div className="marketplace-tags-panel">
            {selectedTags.map((tag) => (
              <div key={tag.id} className="marketplace-tag">
                {tag.name}
                <button
                  className="marketplace-tag__remove"
                  onClick={() => handleRemoveTag(tag)}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              className="marketplace-tag marketplace-tag--add"
              onClick={() => setIsTagModalOpen(true)}
              title="Add skill filter"
            >
              +
            </button>
          </div>

          <div className="marketplace-filters-row">
            <button
              className="marketplace-filters-button"
              onClick={() => setIsFiltersOpen(true)}
            >
              Filters
            </button>
          </div>
        </div>

        <div className="marketplace-content">
          {loading ? (
            <div className="marketplace-loading">Loading…</div>
          ) : (
            <>
              {paginatedOrders.length === 0 ? (
                <div className="marketplace-empty">
                  No jobs found. Try adjusting your filters or post a new job.
                </div>
              ) : (
                <>
                  <div className="marketplace-orders">
                    {paginatedOrders.map((order) => (
                      <div key={order.id} className="mp-card">
                        <div className="mp-card__head">
                          <h3 className="mp-card__title">{order.title}</h3>
                          <span className="mp-card__date">
                            {formatDate(order.created_at)}
                          </span>
                        </div>

                        {order.tags.length > 0 && (
                          <div className="mp-card__tags">
                            {order.tags.slice(0, 5).map((tag) => (
                              <span key={tag.id} className="mp-card__tag">
                                {tag.name}
                              </span>
                            ))}
                            {order.tags.length > 5 && (
                              <span className="mp-card__tag mp-card__tag--more">
                                +{order.tags.length - 5}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="mp-card__stats">
                          <div className="mp-card__stat">
                            <span className="mp-card__stat-label">Budget</span>
                            <span className="mp-card__stat-value">${order.price}</span>
                          </div>
                          <div className="mp-card__stat">
                            <span className="mp-card__stat-label">Delivery</span>
                            <span className="mp-card__stat-value">{order.estimated_days}d</span>
                          </div>
                          <div className="mp-card__stat">
                            <span className="mp-card__stat-label">Applied</span>
                            <span className="mp-card__stat-value">{order.applications_count}</span>
                          </div>
                        </div>

                        <div className="mp-card__buyer">
                          <div className="mp-card__buyer-avatar">
                            {order.buyer.full_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="mp-card__buyer-name">{order.buyer.full_name}</span>
                          <span className="mp-card__buyer-label">Client</span>
                        </div>

                        <div className="mp-card__actions">
                          <button className="mp-card__btn mp-card__btn--primary">
                            Apply Now
                          </button>
                          <button className="mp-card__btn mp-card__btn--secondary">
                            Contact
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {renderPagination()}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
