import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { RiImageLine, RiVideoLine, RiFileLine, RiArrowRightSLine, RiBriefcase2Line, RiAppsLine, RiFileList3Line, RiSendPlaneLine, RiTranslate2 } from "react-icons/ri";
import { getOrders, getMyOrders, getReceivedApplications, getSentApplications, getTags, aiSearch, requestOrderTranslations, type OrderListItem, type Tag, type OrderFilters, type OrderApplication } from "../../api/marketplace";
import { appWebSocketClient, type AppSocketEvent } from "../../shared/realtime/ws-client";
import { useRealtime } from "../../providers/RealtimeProvider";
import Header from "../../components/layout/Header/Header";
import TagSelectionModal from "../../components/features/marketplace/TagSelectionModal/TagSelectionModal";
import FiltersDrawer from "../../components/features/marketplace/FiltersDrawer/FiltersDrawer";
import CreateProjectModal from "../../components/features/marketplace/CreateJobModal/CreateJobModal";
import ApplicationCard from "../../components/features/marketplace/ApplicationCard/ApplicationCard";
import "./marketplace.css";

type TabType = "all" | "my-orders" | "applications";

export default function MarketplacePage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Restore state from location or sessionStorage
  const getInitialState = () => {
    const locationState = location.state as any;
    if (locationState?.fromOrderDetail) {
      return {
        tab: locationState.tab ?? "all",
        searchQuery: locationState.searchQuery ?? "",
        filters: locationState.filters ?? {
          search: "",
          category: "",
          tags: [],
          min_price: undefined,
          max_price: undefined,
          sort: "-created_at",
        },
        selectedTags: locationState.selectedTags ?? [],
        autoTranslateEnabled: locationState.autoTranslateEnabled ?? false,
        currentPage: locationState.currentPage ?? 1,
      };
    }

    // Try sessionStorage as fallback
    try {
      const saved = sessionStorage.getItem('marketplaceState');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          tab: parsed.tab ?? "all",
          searchQuery: parsed.searchQuery ?? "",
          filters: parsed.filters ?? {
            search: "",
            category: "",
            tags: [],
            min_price: undefined,
            max_price: undefined,
            sort: "-created_at",
          },
          selectedTags: parsed.selectedTags ?? [],
          autoTranslateEnabled: parsed.autoTranslateEnabled ?? false,
          currentPage: parsed.currentPage ?? 1,
        };
      }
    } catch (e) {
      console.error('Failed to parse saved state:', e);
    }

    return {
      tab: "all" as TabType,
      searchQuery: "",
      filters: {
        search: "",
        category: "",
        tags: [],
        min_price: undefined,
        max_price: undefined,
        sort: "-created_at",
      },
      selectedTags: [],
      autoTranslateEnabled: false,
      currentPage: 1,
    };
  };

  const initialState = getInitialState();
  const initializedRef = useRef(false);

  const [activeTab, setActiveTab] = useState<TabType>(initialState.tab);
  const [searchQuery, setSearchQuery] = useState(initialState.searchQuery);
  const [filters, setFilters] = useState<OrderFilters>(initialState.filters);
  const [selectedTags, setSelectedTags] = useState<Tag[]>(initialState.selectedTags);
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(initialState.autoTranslateEnabled);
  const [currentPage, setCurrentPage] = useState(initialState.currentPage);

  // Mark that initial state has been set
  useEffect(() => {
    initializedRef.current = true;
  }, []);

  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [receivedApplications, setReceivedApplications] = useState<OrderApplication[]>([]);
  const [sentApplications, setSentApplications] = useState<OrderApplication[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isAiSearch, setIsAiSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const [recoError, setRecoError] = useState<'NO_USER_HISTORY' | 'NO_RECOMMENDATIONS_MATCH' | null>(null);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [tabIndicator, setTabIndicator] = useState<{ left: number; width: number } | null>(null);

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      tab: activeTab,
      searchQuery,
      filters,
      selectedTags,
      autoTranslateEnabled,
      currentPage,
    };
    sessionStorage.setItem('marketplaceState', JSON.stringify(stateToSave));
  }, [activeTab, searchQuery, filters, selectedTags, autoTranslateEnabled, currentPage]);

  useEffect(() => {
    if (!tabsRef.current) return;
    const activeBtn = tabsRef.current.querySelector<HTMLElement>('.marketplace-tab--active');
    if (activeBtn) setTabIndicator({ left: activeBtn.offsetLeft, width: activeBtn.offsetWidth });
  }, [activeTab]);

  useEffect(() => {
    document.documentElement.style.overflowY = isFiltersOpen ? 'hidden' : '';
    return () => { document.documentElement.style.overflowY = ''; };
  }, [isFiltersOpen]);

  // Track which orders have already been requested for translation
  const requestedTranslationsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const tagsData = await getTags(100);
        setTags(tagsData);
      } finally {
        setLoading(false);
      }
    };
    void loadInitialData();
  }, []);

  // Subscribe to WebSocket events for order translations
  useEffect(() => {
    const unsubscribe = appWebSocketClient.onEvent((event: AppSocketEvent) => {
      if (event.type === "translation.order_ready") {
        const { order_id, translated_title, translated_description } = event;

        console.log('Translation ready for order:', order_id, translated_title);

        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.id === order_id
              ? {
                  ...order,
                  translated_title: translated_title as string,
                  translated_description: translated_description as string,
                  translation_status: 'ready' as const,
                }
              : order
          )
        );
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setRecoError(null);

      // Clear requested translations when changing pages
      requestedTranslationsRef.current.clear();

      try {
        if (activeTab === "all") {
          if (debouncedQuery) {
            const response = await aiSearch(debouncedQuery, {
              category: filters.category,
              tags: selectedTags.map((tag) => tag.slug),
              min_price: filters.min_price,
              max_price: filters.max_price,
              sort: filters.sort,
            });
            setOrders(response.results);
            setTotalCount(response.count);
            setIsAiSearch(true);
          } else {
            const response = await getOrders({
              ...filters,
              tags: selectedTags.map((tag) => tag.slug),
              page: currentPage,
            });
            setOrders(response.results);
            setTotalCount(response.count);
            setIsAiSearch(false);
          }
        } else if (activeTab === "my-orders") {
          const response = await getMyOrders();
          setOrders(response.results);
          setTotalCount(response.count);
        } else if (activeTab === "applications") {
          const [received, sent] = await Promise.all([
            getReceivedApplications(),
            getSentApplications(),
          ]);
          setReceivedApplications(received);
          setSentApplications(sent);
        }
      } catch (e) {
        if (e instanceof Error) {
          try {
            const parsed = JSON.parse(e.message);
            if (parsed.error === 'NO_USER_HISTORY' || parsed.error === 'NO_RECOMMENDATIONS_MATCH') {
              setRecoError(parsed.error);
              setOrders([]);
              setTotalCount(0);
            }
          } catch {
            // non-reco error, ignore
          }
        }
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, [activeTab, filters, debouncedQuery, selectedTags, currentPage]);

  const handleRemoveTag = (tagToRemove: Tag) => {
    setSelectedTags((prev) => prev.filter((tag) => tag.id !== tagToRemove.id));
  };

  const handleFiltersChange = (newFilters: Partial<OrderFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  const handleAutoTranslateToggle = async (enabled: boolean) => {
    setAutoTranslateEnabled(enabled);

    if (enabled && orders.length > 0) {
      // Request translations for currently visible orders on this page
      const orderIdsToTranslate = orders
        .filter(order => !order.translation_status || order.translation_status !== 'ready')
        .map(order => order.id);

      if (orderIdsToTranslate.length > 0) {
        // Mark as requested
        orderIdsToTranslate.forEach(id => requestedTranslationsRef.current.add(id));

        // Mark as pending
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            orderIdsToTranslate.includes(order.id)
              ? { ...order, translation_status: 'pending' as const }
              : order
          )
        );

        try {
          await requestOrderTranslations(orderIdsToTranslate);
        } catch (error) {
          console.error('Failed to request translations:', error);
        }
      }
    }
  };

  // Request translations when page changes and auto-translate is enabled
  useEffect(() => {
    if (autoTranslateEnabled && orders.length > 0) {
      const orderIdsToTranslate = orders
        .filter(order => {
          // Skip if already requested or already ready
          if (requestedTranslationsRef.current.has(order.id)) return false;
          if (order.translation_status === 'ready') return false;
          return true;
        })
        .map(order => order.id);

      if (orderIdsToTranslate.length > 0) {
        console.log('Requesting translations for:', orderIdsToTranslate);

        // Mark as requested
        orderIdsToTranslate.forEach(id => requestedTranslationsRef.current.add(id));

        // Mark as pending immediately (optimistic)
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            orderIdsToTranslate.includes(order.id)
              ? { ...order, translation_status: 'pending' as const }
              : order
          )
        );

        // Fire-and-forget: don't wait for response
        requestOrderTranslations(orderIdsToTranslate).catch((error) => {
          console.error('Failed to request translations:', error);
        });
      }
    }
  }, [orders, autoTranslateEnabled]);

  const getOrderTitle = (order: OrderListItem): string => {
    if (autoTranslateEnabled && order.translation_status === 'ready' && order.translated_title) {
      return order.translated_title;
    }
    return order.title;
  };

  const isTranslationPending = (order: OrderListItem): boolean => {
    return autoTranslateEnabled && order.translation_status === 'pending';
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

  const totalPages = Math.ceil(totalCount / 10); // PAGE_SIZE from backend

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    cardsRef.current.forEach((card, idx) => {
      if (!card) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            card.style.transitionDelay = `${(idx % 3) * 65}ms`;
            card.classList.add('mp-card--visible');
            observer.unobserve(card);
          }
        },
        { threshold: 0.06 }
      );
      observer.observe(card);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [orders]);

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
            applications_count: newOrder.applications_count || 0,
            views_count: newOrder.views_count || 0,
            buyer: newOrder.buyer,
            category_name: newOrder.category?.name || '',
            tags: newOrder.tags || [],
            images_count: 0,
            videos_count: 0,
            files_count: 0,
            created_at: newOrder.created_at,
            similarity_percentage: null,
          };
          setOrders((prev) => [listItem, ...prev]);
          setIsCreateModalOpen(false);
        }}
      />

      <div className="marketplace-container">
        <div className="marketplace-tabs" ref={tabsRef}>
          <button
            className={activeTab === "all" ? "marketplace-tab marketplace-tab--active" : "marketplace-tab"}
            onClick={() => setActiveTab("all")}
          >
            <RiAppsLine size={15} /> All Orders
          </button>
          <button
            className={activeTab === "my-orders" ? "marketplace-tab marketplace-tab--active" : "marketplace-tab"}
            onClick={() => setActiveTab("my-orders")}
          >
            <RiFileList3Line size={15} /> My Orders
          </button>
          <button
            className={activeTab === "applications" ? "marketplace-tab marketplace-tab--active" : "marketplace-tab"}
            onClick={() => setActiveTab("applications")}
          >
            <RiSendPlaneLine size={15} /> Applications
          </button>
          {tabIndicator && (
            <div className="marketplace-tab-indicator" style={{ left: tabIndicator.left, width: tabIndicator.width }} />
          )}
        </div>
        <div className="marketplace-header">
          <div className="marketplace-search-row">
            <div className="marketplace-search-wrap">
              <input
                type="text"
                className="marketplace-search"
                placeholder="Search jobs, technologies, skills…"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
              {isAiSearch && <span className="marketplace-ai-badge">AI</span>}
            </div>
            <label className={`auto-translate-toggle${autoTranslateEnabled ? " auto-translate-toggle--active" : ""}`}>
              <input
                type="checkbox"
                checked={autoTranslateEnabled}
                onChange={(e) => handleAutoTranslateToggle(e.target.checked)}
              />
              <RiTranslate2 size={14} className="auto-translate-toggle__icon" />
              <span className="auto-translate-toggle__label">Auto-translate</span>
              <span className="auto-translate-toggle__dot" />
            </label>
            <button
              className="marketplace-create-button"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <RiBriefcase2Line size={15} /> Post Job
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
              title="Filter by skill"
            >
              + Skills
            </button>
            <button
              className="marketplace-filters-button"
              onClick={() => setIsFiltersOpen(true)}
            >
              Filters <RiArrowRightSLine size={14} />
            </button>
          </div>
        </div>

        <div className="marketplace-content">
          {loading ? (
            <div className="marketplace-loading">Loading…</div>
          ) : (
            <>
              {activeTab === "applications" ? (
                <div className="marketplace-applications">
                  <div className="marketplace-applications-section">
                    <h2 className="marketplace-applications-title">Applications</h2>
                    {receivedApplications.length === 0 ? (
                      <div className="marketplace-empty">No applications received yet.</div>
                    ) : (
                      <>
                        {(["pending", "accepted", "withdrawn", "rejected"] as const).map((status) => {
                          const group = receivedApplications.filter((a) => a.status === status);
                          if (group.length === 0) return null;
                          return (
                            <div key={status} className="marketplace-status-group">
                              <div className={`marketplace-status-group__label marketplace-status-group__label--${status}`}>
                                <span className="marketplace-status-group__dot" />
                                {status === "rejected" ? "Declined" : status.charAt(0).toUpperCase() + status.slice(1)}
                                <span className="marketplace-status-group__count">{group.length}</span>
                              </div>
                              <div className="marketplace-applications-list">
                                {group.map((app) => (
                                  <ApplicationCard
                                    key={app.id}
                                    app={app}
                                    variant="received"
                                    onApprove={() => setReceivedApplications((prev) =>
                                      prev.map((a) => a.id === app.id ? { ...a, status: "accepted" } : a)
                                    )}
                                    onDiscard={() => setReceivedApplications((prev) =>
                                      prev.map((a) => a.id === app.id ? { ...a, status: "rejected" } : a)
                                    )}
                                    onDelete={(id) => setReceivedApplications((prev) =>
                                      prev.filter((a) => a.id !== id)
                                    )}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>

                  <div className="marketplace-applications-section">
                    <h2 className="marketplace-applications-title">Sent Applications</h2>
                    {sentApplications.length === 0 ? (
                      <div className="marketplace-empty">No applications sent yet.</div>
                    ) : (
                      <>
                        {(["accepted", "pending", "withdrawn", "rejected"] as const).map((status) => {
                          const group = sentApplications.filter((a) => a.status === status);
                          if (group.length === 0) return null;
                          return (
                            <div key={status} className="marketplace-status-group">
                              <div className={`marketplace-status-group__label marketplace-status-group__label--${status}`}>
                                <span className="marketplace-status-group__dot" />
                                {status === "rejected" ? "Declined" : status.charAt(0).toUpperCase() + status.slice(1)}
                                <span className="marketplace-status-group__count">{group.length}</span>
                              </div>
                              <div className="marketplace-applications-list">
                                {group.map((app) => (
                                  <ApplicationCard
                                    key={app.id}
                                    app={app}
                                    variant="sent"
                                    onDelete={(id) => setSentApplications((prev) =>
                                      prev.filter((a) => a.id !== id)
                                    )}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
              ) : recoError === 'NO_USER_HISTORY' ? (
                <div className="marketplace-reco-notice">
                  <div className="marketplace-reco-notice__icon">&#9733;</div>
                  <div className="marketplace-reco-notice__title">No recommendation history</div>
                  <div className="marketplace-reco-notice__text">
                    Apply to orders and get them accepted to unlock personalized recommendations.
                  </div>
                </div>
              ) : recoError === 'NO_RECOMMENDATIONS_MATCH' ? (
                <div className="marketplace-reco-notice">
                  <div className="marketplace-reco-notice__icon">&#9733;</div>
                  <div className="marketplace-reco-notice__title">No matches found</div>
                  <div className="marketplace-reco-notice__text">
                    No open orders match your profile closely enough. Check back later or explore all orders.
                  </div>
                </div>
              ) : orders.length === 0 ? (
                <div className="marketplace-empty">
                  No jobs found. Try adjusting your filters or post a new job.
                </div>
              ) : (
                <>
                  <div className="marketplace-orders">
                    {orders.map((order, idx) => (
                      <div
                        key={order.id}
                        className="mp-card"
                        ref={(el) => { cardsRef.current[idx] = el; }}
                        onClick={() => navigate(`/marketplace/${order.slug}`, {
                          state: {
                            fromMarketplace: true,
                            marketplaceState: {
                              tab: activeTab,
                              searchQuery,
                              filters,
                              selectedTags,
                              autoTranslateEnabled,
                              currentPage,
                            }
                          }
                        })}
                      >
                        <div className="mp-card__head">
                          <h3 className="mp-card__title">
                            {getOrderTitle(order)}
                            {isTranslationPending(order) && (
                              <span className="mp-card__translation-pending" title="Translation in progress...">⏳</span>
                            )}
                          </h3>
                          <div className="mp-card__head-right">
                            {filters.sort === 'recommendations' && order.similarity_percentage != null && (
                              <span className="mp-card__match-badge">
                                {order.similarity_percentage}% match
                              </span>
                            )}
                            <span className="mp-card__date">
                              {formatDate(order.created_at)}
                            </span>
                          </div>
                        </div>

                        {order.tags && order.tags.length > 0 && (
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
                          {activeTab === "my-orders" ? (
                            <div className="mp-card__stat">
                              <span className="mp-card__stat-label">Applied</span>
                              <span className="mp-card__stat-value">{order.applications_count}</span>
                            </div>
                          ) : (
                            <div className="mp-card__stat mp-card__stat--attachments">
                              {(order.images_count || 0) > 0 && (
                                <span className="mp-card__attach-item">
                                  <RiImageLine size={12} />
                                  <span>{order.images_count}</span>
                                </span>
                              )}
                              {(order.videos_count || 0) > 0 && (
                                <span className="mp-card__attach-item">
                                  <RiVideoLine size={12} />
                                  <span>{order.videos_count}</span>
                                </span>
                              )}
                              {(order.files_count || 0) > 0 && (
                                <span className="mp-card__attach-item">
                                  <RiFileLine size={12} />
                                  <span>{order.files_count}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="mp-card__buyer">
                          <div className="mp-card__buyer-avatar">
                            {order.buyer?.full_name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <span className="mp-card__buyer-name">{order.buyer?.full_name || 'Unknown'}</span>
                          <span className="mp-card__buyer-label">Client</span>
                        </div>

                        <div className="mp-card__actions">
                          <button className="mp-card__btn mp-card__btn--primary">
                            View Details
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
