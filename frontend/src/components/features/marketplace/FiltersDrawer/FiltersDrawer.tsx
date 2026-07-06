import { useEffect, useState } from "react";
import type { OrderFilters } from "../../../../api/marketplace";
import "./filters-drawer.css";

type FiltersDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  filters: OrderFilters;
  onFiltersChange: (filters: Partial<OrderFilters>) => void;
};

const SORT_OPTIONS = [
  { value: "-created_at", label: "Newest First" },
  { value: "created_at",  label: "Oldest First" },
  { value: "price",       label: "Price: Low to High" },
  { value: "-price",      label: "Price: High to Low" },
  { value: "recommendations", label: "Recommendations" },
];

const CATEGORIES = [
  { value: "software-development", label: "Software Development" },
  { value: "design", label: "Design" },
  { value: "marketing", label: "Marketing" },
  { value: "ml-ai", label: "ML/AI" },
  { value: "devops", label: "DevOps" },
  { value: "translation", label: "Translation" },
];

export default function FiltersDrawer({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
}: FiltersDrawerProps) {
  const [localFilters, setLocalFilters] = useState<OrderFilters>(filters);

  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters);
    }
  }, [isOpen, filters]);

  const handleApply = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: OrderFilters = {
      search: filters.search,
      category: "",
      tags: filters.tags,
      min_price: undefined,
      max_price: undefined,
      sort: "-created_at",
    };
    setLocalFilters(resetFilters);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="filters-drawer-overlay" onClick={onClose}></div>
      <div className="filters-drawer">
        <div className="filters-drawer__header">
          <h2 className="filters-drawer__title">Filters</h2>
          <button className="filters-drawer__close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="filters-drawer__content">
          <div className="filters-drawer__section">
            <div className="filters-drawer__section-title">Sort By</div>
            <div className="filters-drawer__options">
              {SORT_OPTIONS.map((option) => (
                <label key={option.value} className="filters-drawer__checkbox">
                  <input
                    type="radio"
                    name="sort"
                    checked={localFilters.sort === option.value}
                    onChange={() =>
                      setLocalFilters((prev) => ({ ...prev, sort: option.value }))
                    }
                  />
                  <span className="filters-drawer__checkbox-label">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="filters-drawer__section">
            <div className="filters-drawer__section-title">Category</div>
            <div className="filters-drawer__options">
              {CATEGORIES.map((category) => (
                <label key={category.value} className="filters-drawer__checkbox">
                  <input
                    type="radio"
                    name="category"
                    checked={localFilters.category === category.value}
                    onChange={() =>
                      setLocalFilters((prev) => ({ ...prev, category: category.value }))
                    }
                  />
                  <span className="filters-drawer__checkbox-label">{category.label}</span>
                </label>
              ))}
              <label className="filters-drawer__checkbox">
                <input
                  type="radio"
                  name="category"
                  checked={localFilters.category === ""}
                  onChange={() => setLocalFilters((prev) => ({ ...prev, category: "" }))}
                />
                <span className="filters-drawer__checkbox-label">All Categories</span>
              </label>
            </div>
          </div>

          <div className="filters-drawer__section">
            <div className="filters-drawer__section-title">Budget</div>
            <div className="filters-drawer__range">
              <input
                type="number"
                className="filters-drawer__input"
                placeholder="Min Budget"
                value={localFilters.min_price || ""}
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    min_price: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
              <span className="filters-drawer__range-separator">—</span>
              <input
                type="number"
                className="filters-drawer__input"
                placeholder="Max Budget"
                value={localFilters.max_price || ""}
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    max_price: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
            </div>
          </div>

        </div>

        <div className="filters-drawer__footer">
          <button className="filters-drawer__button filters-drawer__button--reset" onClick={handleReset}>
            Reset
          </button>
          <button className="filters-drawer__button filters-drawer__button--apply" onClick={handleApply}>
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
}
